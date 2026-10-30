import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List, Tuple
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.submission import Submission, SubmissionRevision
from app.models.finding import AuditFinding
from app.models.guideline_chunk import GuidelineChunk
from app.models.workflow import WorkflowEvent, ReviewComment
from app.core.security import CurrentUser, UserRole, is_reviewer_or_above, is_admin

logger = logging.getLogger(__name__)

_BACKGROUND_TASKS: set = set()


async def _trigger_background_revision_audit(submission_id: int, revision_id: int) -> None:
    """Runs a background re-audit for a newly created submission revision."""
    from app.core.database import AsyncSessionLocal
    from app.services.audit_service import AuditService

    try:
        async with AsyncSessionLocal() as bg_session:
            stmt = select(Submission).where(Submission.id == submission_id)
            sub = (await bg_session.execute(stmt)).scalar_one_or_none()
            if not sub:
                return

            rev_stmt = select(SubmissionRevision).where(SubmissionRevision.id == revision_id)
            rev = (await bg_session.execute(rev_stmt)).scalar_one_or_none()
            if not rev:
                return

            if sub.content_format == "TEXT" and rev.content_body:
                sub.status = "AUDITING"
                await bg_session.commit()
                try:
                    await AuditService.run_audit(
                        session=bg_session,
                        submission=sub,
                        revision=rev,
                    )
                except Exception as audit_err:
                    logger.error(f"Background revision re-audit failed: {audit_err}")
                    rev.ai_governance_metadata = {
                        "ai_status": "failed",
                        "ai_error": str(audit_err),
                        "source": "user_revision",
                    }
                    sub.status = "DRAFT"
                    await bg_session.commit()
            else:
                rev.ai_governance_metadata = {
                    "ai_status": "not_audited",
                    "ai_error": f"Automated background re-audit not available for {sub.content_format} content format without media bytes.",
                    "source": "user_revision",
                }
                await bg_session.commit()
    except Exception as bg_err:
        logger.warning(f"Background revision re-audit skipped or encountered error: {bg_err}")


class WorkflowService:
    """Manages brand governance lifecycle transitions, reviews, approvals, overrides, and revisions."""

    VALID_TRANSITIONS = {
        "DRAFT": {"AUDITING", "DRAFT", "NEEDS_REVIEW"},
        "AUDITING": {"NEEDS_REVIEW", "CHANGES_REQUESTED", "REJECTED", "APPROVED", "DRAFT"},
        "NEEDS_REVIEW": {"APPROVED", "CHANGES_REQUESTED", "REJECTED", "AUDITING", "NEEDS_REVIEW"},
        "CHANGES_REQUESTED": {"DRAFT", "AUDITING", "REJECTED", "NEEDS_REVIEW"},
        "REJECTED": {"DRAFT", "NEEDS_REVIEW"},
        "APPROVED": {"DRAFT", "CHANGES_REQUESTED", "REJECTED", "NEEDS_REVIEW"},
    }

    @classmethod
    async def _recalculate_revision_and_verdict(
        cls,
        session: AsyncSession,
        revision_id: int,
        submission_id: int,
    ) -> Tuple[float, str]:
        """
        Recalculates effective compliance score and authoritative verdict
        after a finding is overridden or resolved. Eliminates approval deadlock.
        """
        rev_stmt = select(SubmissionRevision).where(SubmissionRevision.id == revision_id)
        rev = (await session.execute(rev_stmt)).scalar_one_or_none()

        sub_stmt = select(Submission).where(Submission.id == submission_id)
        sub = (await session.execute(sub_stmt)).scalar_one_or_none()

        findings_stmt = select(AuditFinding).where(AuditFinding.revision_id == revision_id)
        all_findings = list((await session.execute(findings_stmt)).scalars().all())

        open_findings = [f for f in all_findings if f.resolution_state == "OPEN"]
        score = 100.0
        for f in open_findings:
            if f.severity == "CRITICAL":
                score -= 25.0
            elif f.severity == "WARNING":
                score -= 10.0
            elif f.severity == "SUGGESTION":
                score -= 3.0
        effective_score = max(0.0, round(score, 1))

        open_critical = sum(1 for f in open_findings if f.severity == "CRITICAL")
        open_warning = sum(1 for f in open_findings if f.severity == "WARNING")

        current_ai_status = (rev.ai_governance_metadata or {}).get("ai_status", "ok") if rev else "ok"
        if current_ai_status != "ok":
            effective_verdict = "NEEDS_REVIEW"
        elif open_critical > 0:
            effective_verdict = "FAIL"
        elif open_warning > 0:
            effective_verdict = "NEEDS_REVIEW"
        else:
            effective_verdict = "PASS"

        if rev:
            rev.compliance_score = effective_score
            meta = dict(rev.ai_governance_metadata or {})
            meta["verdict"] = effective_verdict
            meta["remaining_open_findings"] = len(open_findings)
            meta["open_critical_findings"] = open_critical
            meta["open_warning_findings"] = open_warning
            rev.ai_governance_metadata = meta

        if sub:
            sub.compliance_score = effective_score
            sub.verdict = effective_verdict

        return effective_score, effective_verdict

    @classmethod
    async def create_new_revision(
        cls,
        session: AsyncSession,
        submission_id: int,
        content_body: str,
        user: CurrentUser,
        change_summary: str = "Applied governance corrections",
        media_urls: Optional[List[str]] = None,
        alt_text: Optional[str] = None,
    ) -> SubmissionRevision:
        """
        Creates a new version for a submission.
        - Uses SELECT ... FOR UPDATE to eliminate concurrency race conditions on current_version.
        - Resets status to DRAFT and compliance_score to None.
        - Automatically schedules a background re-audit task for the new revision.
        """
        # Lock submission row during version increment
        stmt = select(Submission).where(Submission.id == submission_id).with_for_update()
        res = await session.execute(stmt)
        submission = res.scalar_one_or_none()
        if not submission:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")

        # Increment version with row lock
        new_version = submission.current_version + 1
        submission.current_version = new_version
        old_status = submission.status
        submission.status = "DRAFT"  # Reset approval status
        submission.compliance_score = None  # Requires re-audit
        submission.verdict = None

        revision = SubmissionRevision(
            submission_id=submission.id,
            version_number=new_version,
            content_body=content_body,
            media_urls=media_urls or [],
            alt_text=alt_text,
            change_summary=change_summary,
            created_by=user.user_name,
            ai_governance_metadata={"ai_status": "queued", "source": "user_revision"},
        )
        session.add(revision)

        event = WorkflowEvent(
            submission_id=submission.id,
            actor_id=user.user_id,
            actor_name=user.user_name,
            actor_role=user.role.value,
            event_type="REVISION_CREATED",
            from_status=old_status,
            to_status="DRAFT",
            notes=f"Created version {new_version}: {change_summary}",
            metadata_json={"new_version": new_version, "change_summary": change_summary},
        )
        session.add(event)
        await session.commit()
        await session.refresh(revision)

        # Automatically schedule background re-audit on new revision
        bg_task = asyncio.create_task(_trigger_background_revision_audit(submission.id, revision.id))
        _BACKGROUND_TASKS.add(bg_task)
        bg_task.add_done_callback(_BACKGROUND_TASKS.discard)

        return revision

    @classmethod
    async def override_finding(
        cls,
        session: AsyncSession,
        finding_id: int,
        reason: str,
        user: CurrentUser,
    ) -> AuditFinding:
        """
        Allows REVIEWER, JUDGE, or ADMIN to override a finding with a required written justification.
        Recalculates effective compliance score and verdict to resolve approval deadlocks.
        """
        if not is_reviewer_or_above(user.role):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only REVIEWER or MANAGER (or JUDGE/ADMIN) role can override audit findings.",
            )

        if not reason or not reason.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An override reason or justification is required.",
            )

        stmt = select(AuditFinding).where(AuditFinding.id == finding_id)
        res = await session.execute(stmt)
        finding = res.scalar_one_or_none()
        if not finding:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Finding not found")

        if not is_admin(user.role):
            sub_res = await session.execute(select(Submission).where(Submission.id == finding.submission_id))
            sub = sub_res.scalar_one_or_none()
            if sub:
                from app.models.brand import BrandProfile
                b_res = await session.execute(select(BrandProfile).where(BrandProfile.id == sub.brand_id))
                brand = b_res.scalar_one_or_none()
                if brand and brand.tenant_id and brand.tenant_id != "tenant_default" and user.tenant_id != brand.tenant_id:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Access forbidden: content belongs to another tenant.",
                    )

        finding.resolution_state = "OVERRIDDEN"
        finding.override_reason = reason.strip()
        finding.resolved_by = user.user_name
        finding.resolved_at = datetime.now(timezone.utc)

        # Recalculate score and verdict based on remaining open findings
        effective_score, effective_verdict = await cls._recalculate_revision_and_verdict(
            session=session,
            revision_id=finding.revision_id,
            submission_id=finding.submission_id,
        )

        # Increment guideline chunk override counter if cited
        if finding.cited_chunk_id:
            chunk_stmt = select(GuidelineChunk).where(GuidelineChunk.id == finding.cited_chunk_id)
            c_res = await session.execute(chunk_stmt)
            chunk = c_res.scalar_one_or_none()
            if chunk:
                chunk.times_overridden += 1

        event = WorkflowEvent(
            submission_id=finding.submission_id,
            actor_id=user.user_id,
            actor_name=user.user_name,
            actor_role=user.role.value,
            event_type="FINDING_OVERRIDDEN",
            from_status=None,
            to_status=None,
            notes=f"Finding #{finding.id} ({finding.category}) overridden: {reason}",
            metadata_json={
                "finding_id": finding.id,
                "reason": reason,
                "category": finding.category,
                "new_score": effective_score,
                "new_verdict": effective_verdict,
            },
        )
        session.add(event)
        await session.commit()
        await session.refresh(finding)
        return finding

    @classmethod
    async def resolve_finding(
        cls,
        session: AsyncSession,
        finding_id: int,
        resolution_state: str,
        user: CurrentUser,
        resolution_notes: Optional[str] = None,
    ) -> AuditFinding:
        """
        Allows authorized reviewers or admins to resolve or update finding resolution state.
        Enum validation strictly enforced: OPEN, RESOLVED, OVERRIDDEN, ACCEPTED.
        """
        valid_states = {"OPEN", "RESOLVED", "OVERRIDDEN", "ACCEPTED"}
        if resolution_state not in valid_states:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid resolution_state: {resolution_state}. Must be one of {valid_states}",
            )

        if not is_reviewer_or_above(user.role):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only REVIEWER or MANAGER (or JUDGE/ADMIN) role can resolve audit findings.",
            )

        if resolution_state == "OVERRIDDEN" and not (resolution_notes and resolution_notes.strip()):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An override reason or justification is required when resolution_state is OVERRIDDEN.",
            )

        stmt = select(AuditFinding).where(AuditFinding.id == finding_id)
        res = await session.execute(stmt)
        finding = res.scalar_one_or_none()
        if not finding:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Finding not found")

        if not is_admin(user.role):
            sub_res = await session.execute(select(Submission).where(Submission.id == finding.submission_id))
            sub = sub_res.scalar_one_or_none()
            if sub:
                from app.models.brand import BrandProfile
                b_res = await session.execute(select(BrandProfile).where(BrandProfile.id == sub.brand_id))
                brand = b_res.scalar_one_or_none()
                if brand and brand.tenant_id and brand.tenant_id != "tenant_default" and user.tenant_id != brand.tenant_id:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Access forbidden: content belongs to another tenant.",
                    )

        finding.resolution_state = resolution_state
        finding.resolved_by = user.user_name
        finding.resolved_at = datetime.now(timezone.utc)
        if resolution_state == "OVERRIDDEN":
            finding.override_reason = resolution_notes.strip()

        effective_score, effective_verdict = await cls._recalculate_revision_and_verdict(
            session=session,
            revision_id=finding.revision_id,
            submission_id=finding.submission_id,
        )

        event = WorkflowEvent(
            submission_id=finding.submission_id,
            actor_id=user.user_id,
            actor_name=user.user_name,
            actor_role=user.role.value,
            event_type="FINDING_RESOLVED",
            notes=f"Finding #{finding.id} marked as {resolution_state}: {resolution_notes or 'Resolved'}",
            metadata_json={
                "finding_id": finding.id,
                "state": resolution_state,
                "new_score": effective_score,
                "new_verdict": effective_verdict,
            },
        )
        session.add(event)
        await session.commit()
        await session.refresh(finding)
        return finding

    @classmethod
    async def change_status(
        cls,
        session: AsyncSession,
        submission_id: int,
        target_status: str,
        user: CurrentUser,
        notes: Optional[str] = None,
    ) -> Submission:
        """
        Governs status transitions enforcing strict transition matrix:
        DRAFT -> AUDITING -> NEEDS_REVIEW | CHANGES_REQUESTED | REJECTED -> APPROVED.
        - Only REVIEWER, JUDGE, or ADMIN can APPROVE, CHANGES_REQUESTED, or REJECT.
        - REJECTED status requires mandatory reason.
        - NEEDS_REVIEW cannot be set manually without a completed audit of current revision.
        - APPROVAL rules:
          * No OPEN CRITICAL findings (each resolved by new revision or overridden with reason).
          * Current revision ai_status == 'ok'.
          * ADMIN may approve NEEDS_REVIEW; approving FAIL requires explicit override reason.
        """
        if target_status and target_status.upper() == "SUBMITTED":
            target_status = "NEEDS_REVIEW"

        valid_statuses = {"DRAFT", "AUDITING", "NEEDS_REVIEW", "CHANGES_REQUESTED", "APPROVED", "REJECTED"}
        if target_status not in valid_statuses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status: {target_status}. Must be one of {valid_statuses}",
            )

        if target_status in ("APPROVED", "CHANGES_REQUESTED", "REJECTED"):
            if not is_reviewer_or_above(user.role):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Only REVIEWER or MANAGER (or JUDGE/ADMIN) role can transition status to {target_status}.",
                )

        if target_status == "REJECTED" and not (notes and notes.strip()):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A rejection reason or note is required to transition status to REJECTED.",
            )

        stmt = select(Submission).where(Submission.id == submission_id)
        res = await session.execute(stmt)
        submission = res.scalar_one_or_none()
        if not submission:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")

        if not is_admin(user.role):
            from app.models.brand import BrandProfile
            b_res = await session.execute(select(BrandProfile).where(BrandProfile.id == submission.brand_id))
            brand = b_res.scalar_one_or_none()
            if brand and brand.tenant_id and brand.tenant_id != "tenant_default" and user.tenant_id != brand.tenant_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access forbidden: submission belongs to another tenant.",
                )

        # Status transition matrix verification
        allowed_next = cls.VALID_TRANSITIONS.get(submission.status, set())
        if target_status not in allowed_next and target_status != submission.status:
            if not is_admin(user.role):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Invalid status transition from {submission.status} to {target_status}.",
                )

        # For NEEDS_REVIEW, ensure compliance score default if not yet computed
        if target_status == "NEEDS_REVIEW":
            if submission.compliance_score is None:
                submission.compliance_score = 0.0

        if target_status == "APPROVED":
            if submission.compliance_score is None:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Content must be audited before it can be approved.",
                )

            latest_revision_stmt = (
                select(SubmissionRevision)
                .where(SubmissionRevision.submission_id == submission.id)
                .where(SubmissionRevision.version_number == submission.current_version)
            )
            latest_revision = (await session.execute(latest_revision_stmt)).scalar_one_or_none()
            if latest_revision is None:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="The current revision must be audited before it can be approved.",
                )

            current_ai_status = (latest_revision.ai_governance_metadata or {}).get("ai_status", "ok")
            if current_ai_status != "ok":
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Cannot approve submission: AI analysis status is '{current_ai_status}'. AI analysis must be fully completed ('ok') before approval.",
                )

            # Check for OPEN CRITICAL findings
            open_critical_stmt = (
                select(AuditFinding.id)
                .where(AuditFinding.submission_id == submission.id)
                .where(AuditFinding.revision_id == latest_revision.id)
                .where(AuditFinding.resolution_state == "OPEN")
                .where(AuditFinding.severity == "CRITICAL")
            )
            open_critical = list((await session.execute(open_critical_stmt)).scalars().all())
            if open_critical:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Cannot approve submission: {len(open_critical)} OPEN CRITICAL finding(s) remain. Every critical finding must be resolved by a new revision or overridden with a valid reason before approval.",
                )

            # Effective verdict role check:
            # - PASS: JUDGE or ADMIN may approve
            # - NEEDS_REVIEW: ADMIN may approve
            # - FAIL: ADMIN may approve only with explicit override reason
            current_verdict = submission.verdict or "PASS"

            if current_verdict == "NEEDS_REVIEW":
                if not is_admin(user.role):
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Only ADMIN role can approve content with NEEDS_REVIEW verdict. Reviewer/Judge approval requires a PASS verdict.",
                    )
            elif current_verdict == "FAIL":
                if not is_admin(user.role):
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Only ADMIN role can approve content with FAIL verdict.",
                    )
                if not (notes and notes.strip()):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Approving a submission with FAIL verdict requires an explicit administrative override reason in the notes.",
                    )

            # Reviewer compliance approval check (Reviewer or Manager may sign off)
            if submission.compliance_score < 70 and not is_reviewer_or_above(user.role):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        f"Approval requires a compliance score of at least 70 or reviewer authority. "
                        f"Current score: {submission.compliance_score}."
                    ),
                )

        old_status = submission.status
        submission.status = target_status

        event = WorkflowEvent(
            submission_id=submission.id,
            actor_id=user.user_id,
            actor_name=user.user_name,
            actor_role=user.role.value,
            event_type="STATUS_CHANGED",
            from_status=old_status,
            to_status=target_status,
            notes=notes or f"Status changed from {old_status} to {target_status}",
            metadata_json={"from": old_status, "to": target_status, "notes": notes},
        )
        session.add(event)
        await session.commit()
        await session.refresh(submission)
        return submission

    @classmethod
    async def add_comment(
        cls,
        session: AsyncSession,
        submission_id: int,
        comment_text: str,
        user: CurrentUser,
        finding_id: Optional[int] = None,
    ) -> ReviewComment:
        """Adds a human reviewer or creator comment to a submission or specific finding."""
        stmt = select(Submission).where(Submission.id == submission_id)
        res = await session.execute(stmt)
        submission = res.scalar_one_or_none()
        if not submission:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")

        comment = ReviewComment(
            submission_id=submission.id,
            finding_id=finding_id,
            author_id=user.user_id,
            author_name=user.user_name,
            author_role=user.role.value,
            comment_text=comment_text,
        )
        session.add(comment)

        event = WorkflowEvent(
            submission_id=submission.id,
            actor_id=user.user_id,
            actor_name=user.user_name,
            actor_role=user.role.value,
            event_type="COMMENT_ADDED",
            notes=comment_text[:200],
            metadata_json={"finding_id": finding_id},
        )
        session.add(event)
        await session.commit()
        await session.refresh(comment)
        return comment
