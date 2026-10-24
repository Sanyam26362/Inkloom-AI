import math
from typing import Optional, List, Dict
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy import select, func, desc, asc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import CurrentUser, get_current_user, require_reviewer_or_manager, require_admin
from app.models.submission import Submission, SubmissionRevision
from app.models.brand import BrandProfile
from app.models.campaign import Campaign
from app.models.finding import AuditFinding
from app.models.guideline_chunk import GuidelineChunk
from app.models.workflow import WorkflowEvent
from app.schemas.admin import (
    AdminQueueItem,
    AdminQueueResponse,
    AdminStatsResponse,
    GuidelineOverrideStat,
)

router = APIRouter(prefix="/admin", tags=["Admin & Governance Analytics"])


@router.get("/queue", response_model=AdminQueueResponse)
async def get_admin_queue(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    verdict: Optional[str] = Query(None, description="Filter by verdict: PASS, NEEDS_REVIEW, FAIL"),
    status: Optional[str] = Query(None, description="Filter by status: DRAFT, AUDITING, NEEDS_REVIEW, CHANGES_REQUESTED, APPROVED, REJECTED"),
    media_type: Optional[str] = Query(None, description="Filter by media type: TEXT, IMAGE, AUDIO, VIDEO"),
    brand_id: Optional[int] = Query(None, description="Filter by brand ID"),
    campaign_id: Optional[int] = Query(None, description="Filter by campaign ID"),
    sort_by: str = Query("created_at", regex="^(created_at|compliance_score|updated_at)$"),
    sort_order: str = Query("desc", regex="^(asc|desc)$"),
    session: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> AdminQueueResponse:
    """
    Paginated, high-performance admin governance queue.
    Lightweight projections without eager-loading heavy media blobs.
    """
    require_reviewer_or_manager(user)

    # Base query joining BrandProfile and Campaign
    query = (
        select(
            Submission.id,
            Submission.title,
            Submission.brand_id,
            BrandProfile.name.label("brand_name"),
            Submission.campaign_id,
            Campaign.name.label("campaign_name"),
            Submission.content_format,
            Submission.platform,
            Submission.status,
            Submission.verdict,
            Submission.compliance_score,
            Submission.current_version,
            Submission.creator_name,
            Submission.created_at,
            Submission.updated_at,
        )
        .join(BrandProfile, Submission.brand_id == BrandProfile.id)
        .outerjoin(Campaign, Submission.campaign_id == Campaign.id)
    )

    count_query = select(func.count(Submission.id)).join(BrandProfile, Submission.brand_id == BrandProfile.id)

    # Apply filters
    if verdict:
        query = query.where(Submission.verdict == verdict.upper())
        count_query = count_query.where(Submission.verdict == verdict.upper())

    if status:
        query = query.where(Submission.status == status.upper())
        count_query = count_query.where(Submission.status == status.upper())

    if media_type:
        query = query.where(Submission.content_format == media_type.upper())
        count_query = count_query.where(Submission.content_format == media_type.upper())

    if brand_id:
        query = query.where(Submission.brand_id == brand_id)
        count_query = count_query.where(Submission.brand_id == brand_id)

    if campaign_id:
        query = query.where(Submission.campaign_id == campaign_id)
        count_query = count_query.where(Submission.campaign_id == campaign_id)

    # Sorting
    sort_col = getattr(Submission, sort_by)
    query = query.order_by(desc(sort_col) if sort_order == "desc" else asc(sort_col))

    # Pagination
    total_res = await session.execute(count_query)
    total = total_res.scalar() or 0

    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    rows = (await session.execute(query)).all()

    # Aggregate open findings per submission
    sub_ids = [r.id for r in rows]
    critical_counts: Dict[int, int] = {}
    warning_counts: Dict[int, int] = {}

    if sub_ids:
        f_stmt = (
            select(
                AuditFinding.submission_id,
                AuditFinding.severity,
                func.count(AuditFinding.id),
            )
            .where(AuditFinding.submission_id.in_(sub_ids))
            .where(AuditFinding.resolution_state == "OPEN")
            .group_by(AuditFinding.submission_id, AuditFinding.severity)
        )
        f_rows = (await session.execute(f_stmt)).all()
        for sub_id, severity, count in f_rows:
            if severity == "CRITICAL":
                critical_counts[sub_id] = count
            elif severity == "WARNING":
                warning_counts[sub_id] = count

    items = [
        AdminQueueItem(
            id=r.id,
            title=r.title,
            brand_id=r.brand_id,
            brand_name=r.brand_name,
            campaign_id=r.campaign_id,
            campaign_name=r.campaign_name,
            content_format=r.content_format,
            platform=r.platform,
            status=r.status,
            verdict=r.verdict,
            compliance_score=r.compliance_score,
            current_version=r.current_version,
            creator_name=r.creator_name,
            created_at=r.created_at,
            updated_at=r.updated_at,
            open_critical_count=critical_counts.get(r.id, 0),
            open_warning_count=warning_counts.get(r.id, 0),
        )
        for r in rows
    ]

    total_pages = math.ceil(total / page_size) if total > 0 else 0

    return AdminQueueResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/stats", response_model=AdminStatsResponse)
async def get_admin_stats(
    session: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> AdminStatsResponse:
    """
    Returns governance intelligence statistics:
    - AI verdict vs Admin decision agreement rate
    - Guideline chunk ambiguity and override rates
    - Verdict and status distributions
    """
    require_reviewer_or_manager(user)

    # 1. Total Submissions
    total_subs = (await session.execute(select(func.count(Submission.id)))).scalar() or 0

    # 2. Verdict Distribution
    verdict_rows = (
        await session.execute(
            select(Submission.verdict, func.count(Submission.id)).group_by(Submission.verdict)
        )
    ).all()
    verdict_dist = {r[0] or "UNAUDITED": r[1] for r in verdict_rows}

    # 3. Status Distribution
    status_rows = (
        await session.execute(
            select(Submission.status, func.count(Submission.id)).group_by(Submission.status)
        )
    ).all()
    status_dist = {r[0]: r[1] for r in status_rows}

    # 4. Total Overrides
    total_overrides = (
        await session.execute(
            select(func.count(WorkflowEvent.id)).where(WorkflowEvent.event_type == "FINDING_OVERRIDDEN")
        )
    ).scalar() or 0

    # 5. AI Verdict vs Admin Decision Agreement Rate
    # Compare submissions that reached APPROVED or REJECTED status against their AI verdict
    decided_subs_stmt = (
        select(Submission.verdict, Submission.status)
        .where(Submission.status.in_(["APPROVED", "REJECTED"]))
        .where(Submission.verdict.is_not(None))
    )
    decided_rows = (await session.execute(decided_subs_stmt)).all()
    total_decisions = len(decided_rows)
    agreements = 0
    for ai_verdict, final_status in decided_rows:
        if ai_verdict == "PASS" and final_status == "APPROVED":
            agreements += 1
        elif ai_verdict == "FAIL" and final_status == "REJECTED":
            agreements += 1
        elif ai_verdict == "NEEDS_REVIEW":
            # Human review confirmed necessary -> counted as consensus
            agreements += 1

    agreement_rate = round((agreements / total_decisions) * 100.0, 1) if total_decisions > 0 else 100.0

    # 6. Override Rate by Guideline
    chunk_stmt = (
        select(
            GuidelineChunk.id,
            GuidelineChunk.section_reference,
            GuidelineChunk.rule_category,
            GuidelineChunk.times_triggered,
            GuidelineChunk.times_overridden,
        )
        .where((GuidelineChunk.times_triggered > 0) | (GuidelineChunk.times_overridden > 0))
        .order_by(desc(GuidelineChunk.times_overridden), desc(GuidelineChunk.times_triggered))
        .limit(25)
    )
    chunk_rows = (await session.execute(chunk_stmt)).all()

    guideline_stats = [
        GuidelineOverrideStat(
            guideline_id=r.id,
            section_reference=r.section_reference,
            rule_category=r.rule_category,
            times_triggered=r.times_triggered,
            times_overridden=r.times_overridden,
            override_rate=round(r.times_overridden / r.times_triggered, 3) if r.times_triggered > 0 else 0.0,
        )
        for r in chunk_rows
    ]

    return AdminStatsResponse(
        total_submissions=total_subs,
        total_reviews_completed=total_decisions,
        agreement_rate_pct=agreement_rate,
        verdict_distribution=verdict_dist,
        status_distribution=status_dist,
        total_overrides=total_overrides,
        override_rate_by_guideline=guideline_stats,
    )
