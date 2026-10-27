import pytest
import uuid
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.brand import BrandProfile
from app.models.submission import Submission, SubmissionRevision
from app.models.finding import AuditFinding
from app.models.guideline_chunk import GuidelineChunk
from app.services.analytics_service import AnalyticsService


@pytest.mark.asyncio
async def test_findings_by_category_excludes_system():
    async with AsyncSessionLocal() as session:
        brand = BrandProfile(name=f"Analytics Test Brand 1 {uuid.uuid4().hex[:8]}")
        session.add(brand)
        await session.flush()

        sub = Submission(brand_id=brand.id, title="Sub 1", content_format="TEXT", creator_id="c1", compliance_score=85.0)
        session.add(sub)
        await session.flush()

        rev = SubmissionRevision(submission_id=sub.id, version_number=1, content_body="Sample", created_by="c1")
        session.add(rev)
        await session.flush()

        # Add SYSTEM finding and TONE finding
        f_system = AuditFinding(
            submission_id=sub.id,
            revision_id=rev.id,
            category="SYSTEM",
            severity="WARNING",
            flagged_excerpt="Guideline retrieval degraded",
            explanation="System reliability guardrail",
            suggested_correction="Reindex",
            detector_source="AI_GOVERNANCE_ENGINE",
            resolution_state="OPEN",
        )
        f_tone = AuditFinding(
            submission_id=sub.id,
            revision_id=rev.id,
            category="TONE",
            severity="WARNING",
            flagged_excerpt="unfriendly tone",
            explanation="Tone issue",
            suggested_correction="Be friendly",
            detector_source="RAG_LLM",
            resolution_state="OPEN",
        )
        session.add_all([f_system, f_tone])
        await session.commit()

        analytics = await AnalyticsService.get_brand_analytics(session, brand_id=brand.id)

        # SYSTEM must NOT be present in findings_by_category
        assert "SYSTEM" not in analytics.findings_by_category
        # TONE must be present with count 1
        assert analytics.findings_by_category.get("TONE") == 1
        # Total findings includes both
        assert analytics.total_findings_generated == 2


@pytest.mark.asyncio
async def test_ambiguity_requires_minimum_sample_size():
    async with AsyncSessionLocal() as session:
        brand = BrandProfile(name=f"Analytics Test Brand 2 {uuid.uuid4().hex[:8]}")
        session.add(brand)
        await session.flush()

        sub = Submission(brand_id=brand.id, title="Sub 2", content_format="TEXT", creator_id="c1", compliance_score=90.0)
        session.add(sub)
        await session.flush()

        rev = SubmissionRevision(submission_id=sub.id, version_number=1, content_body="Sample", created_by="c1")
        session.add(rev)
        await session.flush()

        # Chunk 1: Triggered 1 time, overridden 1 time (100% override rate, but < 3 samples)
        chunk1 = GuidelineChunk(
            brand_id=brand.id,
            source_document="doc1.md",
            section_reference="Sec 1",
            content_text="Single sample rule",
            rule_category="TERMINOLOGY",
        )
        # Chunk 2: Triggered 4 times, overridden 3 times (75% override rate, >= 3 samples)
        chunk2 = GuidelineChunk(
            brand_id=brand.id,
            source_document="doc2.md",
            section_reference="Sec 2",
            content_text="Multi sample ambiguous rule",
            rule_category="TONE",
        )
        session.add_all([chunk1, chunk2])
        await session.flush()

        # 1 overridden finding for chunk1
        f_c1 = AuditFinding(
            submission_id=sub.id,
            revision_id=rev.id,
            category="TERMINOLOGY",
            severity="WARNING",
            flagged_excerpt="c1 excerpt",
            explanation="c1 explanation",
            suggested_correction="fix",
            detector_source="DETERMINISTIC_RULE",
            cited_chunk_id=chunk1.id,
            resolution_state="OVERRIDDEN",
        )

        # 4 findings for chunk2 (3 OVERRIDDEN, 1 ACCEPTED)
        f_c2_1 = AuditFinding(
            submission_id=sub.id,
            revision_id=rev.id,
            category="TONE",
            severity="WARNING",
            flagged_excerpt="c2 excerpt 1",
            explanation="c2 explanation",
            suggested_correction="fix",
            detector_source="RAG_LLM",
            cited_chunk_id=chunk2.id,
            resolution_state="OVERRIDDEN",
        )
        f_c2_2 = AuditFinding(
            submission_id=sub.id,
            revision_id=rev.id,
            category="TONE",
            severity="WARNING",
            flagged_excerpt="c2 excerpt 2",
            explanation="c2 explanation",
            suggested_correction="fix",
            detector_source="RAG_LLM",
            cited_chunk_id=chunk2.id,
            resolution_state="OVERRIDDEN",
        )
        f_c2_3 = AuditFinding(
            submission_id=sub.id,
            revision_id=rev.id,
            category="TONE",
            severity="WARNING",
            flagged_excerpt="c2 excerpt 3",
            explanation="c2 explanation",
            suggested_correction="fix",
            detector_source="RAG_LLM",
            cited_chunk_id=chunk2.id,
            resolution_state="OVERRIDDEN",
        )
        f_c2_4 = AuditFinding(
            submission_id=sub.id,
            revision_id=rev.id,
            category="TONE",
            severity="WARNING",
            flagged_excerpt="c2 excerpt 4",
            explanation="c2 explanation",
            suggested_correction="fix",
            detector_source="RAG_LLM",
            cited_chunk_id=chunk2.id,
            resolution_state="ACCEPTED",
        )

        session.add_all([f_c1, f_c2_1, f_c2_2, f_c2_3, f_c2_4])
        await session.commit()

        analytics = await AnalyticsService.get_brand_analytics(session, brand_id=brand.id)

        metric_chunk1 = next((m for m in analytics.ambiguous_guidelines if m.chunk_id == chunk1.id), None)
        metric_chunk2 = next((m for m in analytics.ambiguous_guidelines if m.chunk_id == chunk2.id), None)

        assert metric_chunk1 is not None
        assert metric_chunk1.times_triggered == 1
        assert metric_chunk1.times_overridden == 1
        assert metric_chunk1.override_rate == 1.0
        # A rule triggered once and overridden once is NOT ambiguous (sample size < 3)
        assert metric_chunk1.ambiguity_flag is False

        assert metric_chunk2 is not None
        assert metric_chunk2.times_triggered == 4
        assert metric_chunk2.times_overridden == 3
        assert metric_chunk2.override_rate == 0.75
        # Triggered >= 3 and override_rate >= 0.50 (or 0.40) -> ambiguous!
        assert metric_chunk2.ambiguity_flag is True

