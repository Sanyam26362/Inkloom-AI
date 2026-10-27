import asyncio
import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal, init_db
from app.models.brand import BrandProfile
from app.models.guideline_chunk import GuidelineChunk
from app.models.submission import Submission, SubmissionRevision
from app.models.finding import AuditFinding
from app.models.workflow import WorkflowEvent, ReviewComment
from app.services.gemini_service import gemini_service

logger = logging.getLogger("seed")


async def seed_database() -> None:
    """Seeds default brand profile, guidelines, and demonstration submissions."""
    await init_db()

    async with AsyncSessionLocal() as session:
        # Check if default brand already exists
        stmt = select(BrandProfile).where(BrandProfile.name == "ApexCloud Technologies")
        res = await session.execute(stmt)
        if res.scalar_one_or_none():
            logger.info("Seed brand 'ApexCloud Technologies' already exists. Skipping seed.")
            return

        logger.info("Creating default brand profile: ApexCloud Technologies...")
        brand = BrandProfile(
            name="ApexCloud Technologies",
            industry="Cloud Infrastructure & Enterprise Security",
            tone_persona=(
                "Clear, authoritative, empathetic, and evidence-backed. Avoids hype, superlatives, "
                "and unverified claims. Emphasizes enterprise resilience, zero-trust architecture, "
                "and customer sovereignty."
            ),
            approved_hex_palette=["#0F172A", "#2563EB", "#38BDF8", "#F8FAFC", "#10B981"],
            banned_terms=[
                "guaranteed",
                "unbreakable",
                "cheapest",
                "revolutionary",
                "best-in-class",
                "100% secure",
            ],
            preferred_terminology={
                "client-side": "on-device",
                "artificial intelligence": "AI-powered governance",
                "cheap": "cost-effective",
                "customer portal": "client management hub",
                "cloud storage": "encrypted cloud object repository",
            },
            approved_facts=[
                {"claim": "99.99% core uptime SLA", "source": "SOC2 Security & Availability Report 2026", "verified": True},
                {"claim": "Over 750 global enterprise deployments", "source": "Q3 2026 Earnings Release", "verified": True},
                {"claim": "Sub-15ms global edge latency", "source": "Network Benchmark Whitepaper 2026", "verified": True},
            ],
            visual_guidelines_summary=(
                "Use Slate Navy (#0F172A) for backgrounds or high-contrast headers. Ensure text meets "
                "WCAG AA contrast of 4.5:1. Primary brand accent is Apex Blue (#2563EB)."
            ),
            min_wcag_contrast=4.5,
        )
        session.add(brand)
        await session.flush()

        logger.info("Adding standard guideline chunks with pgvector embeddings...")
        guidelines_data = [
            {
                "source_document": "ApexCloud Brand Book 2026.pdf",
                "page_number": 3,
                "section_reference": "Section 2: Tone of Voice",
                "rule_category": "TONE",
                "content_text": (
                    "Do not use absolute superlatives such as 'guaranteed', 'unbreakable', or 'best-in-class'. "
                    "Always back resilience claims with empirical SLA metrics (e.g., '99.99% uptime SLA')."
                ),
            },
            {
                "source_document": "ApexCloud Brand Book 2026.pdf",
                "page_number": 5,
                "section_reference": "Section 3: Approved Terminology",
                "rule_category": "TERMINOLOGY",
                "content_text": (
                    "When referencing client processing, always use 'on-device' instead of 'client-side'. "
                    "Use 'cost-effective' rather than 'cheap' when describing our pricing tiers."
                ),
            },
            {
                "source_document": "ApexCloud Visual Guidelines.pdf",
                "page_number": 8,
                "section_reference": "Visual & Contrast Requirements",
                "rule_category": "ACCESSIBILITY",
                "content_text": (
                    "All body copy and interactive UI buttons must satisfy WCAG AA contrast ratio of at least 4.5:1 "
                    "against their underlying background. Primary brand accent is #2563EB."
                ),
            },
            {
                "source_document": "ApexCloud Security Whitepaper.pdf",
                "page_number": 12,
                "section_reference": "Factual Claims & Security Disclosures",
                "rule_category": "FACTUAL_CLAIM",
                "content_text": (
                    "Security marketing materials must not claim '100% secure' systems. State instead that "
                    "deployments leverage multi-layer defense in depth verified by annual SOC2 audits."
                ),
            },
        ]

        for g in guidelines_data:
            emb = await gemini_service.generate_embedding(g["content_text"], task_type="RETRIEVAL_DOCUMENT")
            chunk = GuidelineChunk(
                brand_id=brand.id,
                source_document=g["source_document"],
                page_number=g["page_number"],
                section_reference=g["section_reference"],
                rule_category=g["rule_category"],
                content_text=g["content_text"],
                embedding=emb,
                embedding_status="completed" if emb else "failed",
            )
            session.add(chunk)

        logger.info("Creating initial demonstration submission...")
        submission = Submission(
            brand_id=brand.id,
            title="Q4 Product Launch Announcement - Press Release Copy",
            content_format="TEXT",
            status="NEEDS_REVIEW",
            current_version=1,
            compliance_score=75.0,
            creator_id="user_creator_01",
            creator_name="Alex Rivera",
        )
        session.add(submission)
        await session.flush()

        revision = SubmissionRevision(
            submission_id=submission.id,
            version_number=1,
            content_body=(
                "ApexCloud is thrilled to unveil our revolutionary new database service. "
                "Our unbreakable architecture guarantees 100% uptime forever, making it the cheapest "
                "cloud storage option for modern web applications. Contact lead architect Alex at alex@apexcloud.internal "
                "for internal project access under PROJECT-APEX-SECURE."
            ),
            compliance_score=75.0,
            change_summary="Initial marketing draft",
            created_by="Alex Rivera",
        )
        session.add(revision)
        await session.flush()

        findings = [
            AuditFinding(
                submission_id=submission.id,
                revision_id=revision.id,
                category="TERMINOLOGY",
                severity="CRITICAL",
                detector_source="DETERMINISTIC_RULE",
                flagged_excerpt="unbreakable",
                explanation="Use of banned term 'unbreakable' strictly violates brand governance policy.",
                guideline_citation="Brand Governance Prohibited Lexicon",
                suggested_correction="Remove or replace 'unbreakable' with factual, non-absolute terminology.",
                resolution_state="OPEN",
            ),
            AuditFinding(
                submission_id=submission.id,
                revision_id=revision.id,
                category="TERMINOLOGY",
                severity="WARNING",
                detector_source="DETERMINISTIC_RULE",
                flagged_excerpt="cheapest",
                explanation="Use of banned term 'cheapest' violates brand governance policy.",
                guideline_citation="Brand Governance Prohibited Lexicon",
                suggested_correction="cost-effective",
                resolution_state="OPEN",
            ),
        ]
        session.add_all(findings)

        event = WorkflowEvent(
            submission_id=submission.id,
            actor_id="user_creator_01",
            actor_name="Alex Rivera",
            actor_role="CREATOR",
            event_type="CREATED",
            from_status=None,
            to_status="DRAFT",
            notes="Initial press release draft created.",
        )
        session.add(event)

        comment = ReviewComment(
            submission_id=submission.id,
            finding_id=None,
            author_id="user_reviewer_01",
            author_name="Jordan Lee",
            author_role="REVIEWER",
            comment_text="Please replace 'unbreakable' and 'cheapest' with our verified SLA metrics before we can approve.",
        )
        session.add(comment)

        await session.commit()
        logger.info("Database seeding completed successfully.")


if __name__ == "__main__":
    asyncio.run(seed_database())
