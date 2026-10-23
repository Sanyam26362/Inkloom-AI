from typing import List, Dict, Any
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.submission import Submission
from app.models.finding import AuditFinding
from app.models.guideline_chunk import GuidelineChunk
from app.schemas.analytics import GovernanceAnalyticsResponse, AmbiguousGuidelineMetric
from app.core.config import settings


class AnalyticsService:
    """Computes brand governance analytics grounded in database findings and reviewer override behavior."""

    @classmethod
    async def get_brand_analytics(
        cls, session: AsyncSession, brand_id: int
    ) -> GovernanceAnalyticsResponse:
        # 1. Total submissions & Status breakdown
        sub_stmt = select(Submission).where(Submission.brand_id == brand_id)
        sub_res = await session.execute(sub_stmt)
        submissions = list(sub_res.scalars().all())
        total_subs = len(submissions)

        status_counts: Dict[str, int] = {}
        valid_scores: List[float] = []
        submission_ids = [s.id for s in submissions]

        for s in submissions:
            status_counts[s.status] = status_counts.get(s.status, 0) + 1
            if s.compliance_score is not None:
                valid_scores.append(s.compliance_score)

        avg_score = round(sum(valid_scores) / len(valid_scores), 1) if valid_scores else 100.0

        # 2. Findings analytics
        severity_counts: Dict[str, int] = {}
        category_counts: Dict[str, int] = {}
        source_counts: Dict[str, int] = {}
        resolution_counts: Dict[str, int] = {}
        total_findings = 0

        if submission_ids:
            findings_stmt = select(AuditFinding).where(AuditFinding.submission_id.in_(submission_ids))
            f_res = await session.execute(findings_stmt)
            findings = list(f_res.scalars().all())
            total_findings = len(findings)

            for f in findings:
                severity_counts[f.severity] = severity_counts.get(f.severity, 0) + 1
                category_counts[f.category] = category_counts.get(f.category, 0) + 1
                source_counts[f.detector_source] = source_counts.get(f.detector_source, 0) + 1
                resolution_counts[f.resolution_state] = resolution_counts.get(f.resolution_state, 0) + 1

        # 3. Ambiguous Guideline Detection (Overridden rules indicator)
        guidelines_stmt = (
            select(GuidelineChunk)
            .where(GuidelineChunk.brand_id == brand_id)
            .where(GuidelineChunk.times_triggered > 0)
        )
        g_res = await session.execute(guidelines_stmt)
        active_chunks = list(g_res.scalars().all())

        ambiguous_metrics: List[AmbiguousGuidelineMetric] = []
        for c in active_chunks:
            override_rate = round(c.times_overridden / max(1, c.times_triggered), 2)
            is_ambiguous = override_rate >= settings.AMBIGUITY_OVERRIDE_THRESHOLD

            ambiguous_metrics.append(
                AmbiguousGuidelineMetric(
                    chunk_id=c.id,
                    source_document=c.source_document,
                    section_reference=c.section_reference,
                    rule_category=c.rule_category,
                    content_excerpt=c.content_text[:120] + "..." if len(c.content_text) > 120 else c.content_text,
                    times_triggered=c.times_triggered,
                    times_overridden=c.times_overridden,
                    override_rate=override_rate,
                    ambiguity_flag=is_ambiguous,
                )
            )

        # Sort by override rate descending
        ambiguous_metrics.sort(key=lambda x: x.override_rate, reverse=True)

        return GovernanceAnalyticsResponse(
            total_submissions=total_subs,
            status_breakdown=status_counts,
            avg_compliance_score=avg_score,
            total_findings_generated=total_findings,
            findings_by_severity=severity_counts,
            findings_by_category=category_counts,
            findings_by_source=source_counts,
            resolution_breakdown=resolution_counts,
            ambiguous_guidelines=ambiguous_metrics,
        )
