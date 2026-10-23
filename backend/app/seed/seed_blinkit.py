"""
Blinkit Brand Seed — Mock guidelines for hackathon demo purposes.
Run this ONCE after the database has been initialized to replace all test brands
with a single realistic Blinkit brand profile.

Usage:
    cd backend
    .venv312/Scripts/python.exe -m app.seed.seed_blinkit
"""
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

logger = logging.getLogger("seed_blinkit")
logging.basicConfig(level=logging.INFO)


async def wipe_all_brands(session: AsyncSession) -> None:
    """Deletes ALL brands (and cascaded data) to give a clean slate."""
    all_brands = await session.execute(select(BrandProfile))
    brands = list(all_brands.scalars().all())
    for b in brands:
        await session.delete(b)
    await session.commit()
    logger.info(f"Wiped {len(brands)} brand(s) and all associated data.")


async def seed_blinkit() -> None:
    """Seeds the Blinkit brand profile with mock guidelines, submissions, and workflow data."""
    await init_db()

    async with AsyncSessionLocal() as session:
        # 1. Wipe existing brands
        await wipe_all_brands(session)

        logger.info("Creating Blinkit brand profile...")
        brand = BrandProfile(
            name="Blinkit",
            industry="Quick Commerce & Instant Grocery Delivery",
            tone_persona=(
                "Energetic, friendly, and relentlessly customer-first. "
                "Blinkit's voice is confident without being cocky, "
                "uses simple everyday language, and always focuses on speed and convenience. "
                "Never use jargon, avoid passive voice, and never make delivery promises "
                "beyond the actual SLA without explicit approval. "
                "Emojis are encouraged in social content only, not in press or formal communications."
            ),
            approved_hex_palette=[
                "#F8C200",
                "#1C1C1E",
                "#FFFFFF",
                "#00A36C",
                "#FF6B35",
            ],
            banned_terms=[
                "instant",
                "guaranteed",
                "always available",
                "never out of stock",
                "zero dark stores",
                "free forever",
                "unlimited",
                "revolutionary",
                "best-in-class",
            ],
            preferred_terminology={
                "delivery boy": "delivery partner",
                "driver": "delivery partner",
                "customer": "member",
                "store": "dark store",
                "app": "Blinkit app",
                "order tracking": "live order tracking",
                "out of stock": "currently unavailable",
                "delivery time": "estimated delivery time",
                "fast delivery": "10-minute delivery",
                "discount": "offer",
            },
            approved_facts=[
                {
                    "claim": "Delivery in approximately 10 minutes",
                    "source": "Blinkit Operations SLA Handbook 2024",
                    "verified": True,
                },
                {
                    "claim": "Available in 40+ cities across India",
                    "source": "Blinkit Expansion Press Release Q2 2024",
                    "verified": True,
                },
                {
                    "claim": "Over 20 million registered users",
                    "source": "Blinkit Annual Report 2024",
                    "verified": True,
                },
                {
                    "claim": "8,000+ SKUs available per dark store on average",
                    "source": "Blinkit Catalog Operations Report 2024",
                    "verified": True,
                },
            ],
            visual_guidelines_summary=(
                "Primary brand color is Blinkit Yellow (#F8C200). All CTAs must use yellow on dark charcoal (#1C1C1E) "
                "or dark charcoal on yellow, both of which meet WCAG AA contrast requirements. "
                "Fresh Green (#00A36C) is reserved for freshness and health product categories only. "
                "Warm Orange (#FF6B35) is for urgency and limited-time offer callouts. "
                "Never use gradients on the primary yellow. Logo must appear on white or dark charcoal only."
            ),
            min_wcag_contrast=4.5,
        )
        session.add(brand)
        await session.flush()

        logger.info("Adding Blinkit mock brand guideline chunks (with vector embeddings)...")
        mock_guidelines = [
            {
                "source_document": "Blinkit Brand Voice & Tone Guide 2024.pdf",
                "page_number": 4,
                "section_reference": "Section 1: Our Voice",
                "rule_category": "TONE",
                "content_text": (
                    "Blinkit speaks with energy and confidence. Avoid hype words like 'revolutionary', "
                    "'best-in-class', or 'guaranteed'. Always quantify claims -- say '~10-minute delivery' "
                    "not 'instant delivery'. Use active sentences. Keep it short. Make every word count."
                ),
            },
            {
                "source_document": "Blinkit Brand Voice & Tone Guide 2024.pdf",
                "page_number": 7,
                "section_reference": "Section 2: Prohibited Language",
                "rule_category": "TERMINOLOGY",
                "content_text": (
                    "Do not refer to delivery staff as 'delivery boys' or 'drivers'. "
                    "Use 'delivery partner' at all times. "
                    "Customers are referred to as 'members' in internal copy and CRM, "
                    "but 'you' or 'your' in outward-facing marketing. "
                    "Never call the app just 'app' -- always 'Blinkit app'."
                ),
            },
            {
                "source_document": "Blinkit Visual Identity Standards 2024.pdf",
                "page_number": 3,
                "section_reference": "Section 3: Color Usage & WCAG Compliance",
                "rule_category": "ACCESSIBILITY",
                "content_text": (
                    "All text on Blinkit Yellow (#F8C200) backgrounds must use Dark Charcoal (#1C1C1E) "
                    "to achieve the required WCAG 2.1 AA minimum contrast ratio of 4.5:1. "
                    "White text on yellow fails contrast requirements and is strictly prohibited. "
                    "Fresh Green (#00A36C) may only be used for category badges and freshness indicators."
                ),
            },
            {
                "source_document": "Blinkit Legal & Claims Policy 2024.pdf",
                "page_number": 2,
                "section_reference": "Section 4: Approved Claims & Delivery SLA",
                "rule_category": "FACTUAL_CLAIM",
                "content_text": (
                    "Marketing must only reference '~10-minute delivery' or 'approximately 10 minutes'. "
                    "Absolute delivery guarantees are prohibited without explicit sign-off from the Legal team. "
                    "City availability claims must reference the approved list from Expansion Press Release Q2 2024. "
                    "User count claims must cite the Annual Report and use 'over 20 million registered users'."
                ),
            },
            {
                "source_document": "Blinkit Social Media Guidelines 2024.pdf",
                "page_number": 9,
                "section_reference": "Section 5: Emoji & Social Tone",
                "rule_category": "TONE",
                "content_text": (
                    "Emojis are permitted and encouraged for social media posts (Instagram, Twitter/X, WhatsApp). "
                    "Do not use emojis in press releases, investor communications, or formal partner agreements. "
                    "Limit to 1-2 emojis per sentence in social posts. "
                    "Avoid using food emojis in contexts that could appear culturally insensitive."
                ),
            },
            {
                "source_document": "Blinkit Audio & Video Playbook 2024.pdf",
                "page_number": 5,
                "section_reference": "Section 6: Voiceover & Spoken Copy",
                "rule_category": "AUDIO_VIDEO",
                "content_text": (
                    "Voiceovers should sound warm, quick, and conversational. Say 'approximately 10 minutes' "
                    "or '~10-minute delivery'; never say 'instant' or 'guaranteed'. Refer to delivery staff as "
                    "'delivery partners'. Keep offer conditions and expiry dates audible in the final frame or CTA."
                ),
            },
            {
                "source_document": "Blinkit Accessibility Checklist 2024.pdf",
                "page_number": 2,
                "section_reference": "Section 7: Captions & Audio Description",
                "rule_category": "ACCESSIBILITY",
                "content_text": (
                    "Every video must include accurate captions for spoken dialogue and meaningful on-screen text. "
                    "Do not rely on colour alone to communicate an offer. Captions must remain readable over the "
                    "approved charcoal or white caption plate and the final frame must include a clear CTA."
                ),
            },
        ]

        for g in mock_guidelines:
            logger.info(f"  Generating embedding for: {g['section_reference']}")
            emb = gemini_service.generate_embedding(g["content_text"])
            chunk = GuidelineChunk(
                brand_id=brand.id,
                source_document=g["source_document"],
                page_number=g["page_number"],
                section_reference=g["section_reference"],
                rule_category=g["rule_category"],
                content_text=g["content_text"],
                embedding=emb,
            )
            session.add(chunk)

        await session.flush()

        # SUBMISSION 1 - Brand-Violating Marketing Copy (needs audit)
        logger.info("Creating Submission 1: Problematic Instagram caption...")
        sub1 = Submission(
            brand_id=brand.id,
            title="Summer Sale Campaign -- Instagram Caption",
            content_format="TEXT",
            status="NEEDS_REVIEW",
            current_version=1,
            compliance_score=52.0,
            creator_id="user_creator_01",
            creator_name="Priya Sharma",
        )
        session.add(sub1)
        await session.flush()

        rev1 = SubmissionRevision(
            submission_id=sub1.id,
            version_number=1,
            content_body=(
                "Revolutionary savings are here! Get INSTANT delivery guaranteed on ALL items. "
                "We NEVER go out of stock on your favourite groceries. Our delivery boys will be at your door "
                "in minutes -- download the app now and enjoy FREE delivery forever! "
                "Best-in-class experience, unmatched prices."
            ),
            compliance_score=52.0,
            change_summary="Initial Instagram caption draft for summer campaign",
            created_by="Priya Sharma",
        )
        session.add(rev1)
        await session.flush()

        findings1 = [
            AuditFinding(
                submission_id=sub1.id,
                revision_id=rev1.id,
                category="TERMINOLOGY",
                severity="CRITICAL",
                detector_source="DETERMINISTIC_RULE",
                flagged_excerpt="delivery boys",
                explanation="'delivery boys' is a prohibited term. Blinkit mandates 'delivery partner' to show respect and inclusivity.",
                guideline_citation="Blinkit Brand Voice & Tone Guide 2024.pdf, Section 2",
                suggested_correction="delivery partners",
                resolution_state="OPEN",
            ),
            AuditFinding(
                submission_id=sub1.id,
                revision_id=rev1.id,
                category="TERMINOLOGY",
                severity="CRITICAL",
                detector_source="DETERMINISTIC_RULE",
                flagged_excerpt="the app",
                explanation="Do not write 'the app' -- always refer to the product as 'the Blinkit app'.",
                guideline_citation="Blinkit Brand Voice & Tone Guide 2024.pdf, Section 2",
                suggested_correction="the Blinkit app",
                resolution_state="OPEN",
            ),
            AuditFinding(
                submission_id=sub1.id,
                revision_id=rev1.id,
                category="FACTUAL_CLAIM",
                severity="CRITICAL",
                detector_source="DETERMINISTIC_RULE",
                flagged_excerpt="guaranteed",
                explanation="Absolute delivery guarantees are prohibited without legal sign-off.",
                guideline_citation="Blinkit Legal & Claims Policy 2024.pdf, Section 4",
                suggested_correction="approximately 10-minute delivery",
                resolution_state="OPEN",
            ),
            AuditFinding(
                submission_id=sub1.id,
                revision_id=rev1.id,
                category="FACTUAL_CLAIM",
                severity="CRITICAL",
                detector_source="DETERMINISTIC_RULE",
                flagged_excerpt="NEVER go out of stock",
                explanation="'never out of stock' is a prohibited absolute claim.",
                guideline_citation="Blinkit Legal & Claims Policy 2024.pdf, Section 4",
                suggested_correction="Wide selection -- over 8,000 items available",
                resolution_state="OPEN",
            ),
            AuditFinding(
                submission_id=sub1.id,
                revision_id=rev1.id,
                category="TONE",
                severity="WARNING",
                detector_source="DETERMINISTIC_RULE",
                flagged_excerpt="revolutionary",
                explanation="'revolutionary' is a prohibited hype word per brand voice guidelines.",
                guideline_citation="Blinkit Brand Voice & Tone Guide 2024.pdf, Section 1",
                suggested_correction="exciting",
                resolution_state="OPEN",
            ),
            AuditFinding(
                submission_id=sub1.id,
                revision_id=rev1.id,
                category="TONE",
                severity="WARNING",
                detector_source="RAG_LLM",
                flagged_excerpt="FREE delivery forever",
                explanation="'free forever' is a prohibited absolute claim. Offers must be time-bound and accurate.",
                guideline_citation="Blinkit Legal & Claims Policy 2024.pdf, Section 4",
                suggested_correction="free delivery on your first order",
                resolution_state="OPEN",
            ),
            AuditFinding(
                submission_id=sub1.id,
                revision_id=rev1.id,
                category="FACTUAL_CLAIM",
                severity="SUGGESTION",
                detector_source="RAG_LLM",
                flagged_excerpt="INSTANT delivery",
                explanation="'instant' is a prohibited absolute. Use the approved '~10-minute delivery' phrasing.",
                guideline_citation="Blinkit Brand Voice & Tone Guide 2024.pdf, Section 1",
                suggested_correction="~10-minute delivery",
                resolution_state="OPEN",
            ),
        ]
        session.add_all(findings1)

        session.add(WorkflowEvent(
            submission_id=sub1.id,
            actor_id="user_creator_01",
            actor_name="Priya Sharma",
            actor_role="CREATOR",
            event_type="CREATED",
            from_status=None,
            to_status="DRAFT",
            notes="Instagram caption draft for summer campaign.",
        ))
        session.add(WorkflowEvent(
            submission_id=sub1.id,
            actor_id="user_creator_01",
            actor_name="Priya Sharma",
            actor_role="CREATOR",
            event_type="STATUS_CHANGED",
            from_status="DRAFT",
            to_status="NEEDS_REVIEW",
            notes="Submitted for brand review.",
        ))
        session.add(ReviewComment(
            submission_id=sub1.id,
            finding_id=None,
            author_id="user_reviewer_01",
            author_name="Rohan Mehta",
            author_role="REVIEWER",
            comment_text=(
                "Several critical issues found: please replace 'delivery boys' with 'delivery partners', "
                "remove all absolute guarantees ('guaranteed', 'NEVER', 'forever'), and use 'the Blinkit app'. "
                "Legal has flagged the 'free forever' claim."
            ),
        ))

        # SUBMISSION 2 - Approved, brand-compliant press release
        logger.info("Creating Submission 2: Compliant press release (APPROVED)...")
        sub2 = Submission(
            brand_id=brand.id,
            title="Blinkit Expands to 5 New Cities -- Press Release",
            content_format="TEXT",
            status="APPROVED",
            current_version=2,
            compliance_score=97.0,
            creator_id="user_creator_02",
            creator_name="Ananya Iyer",
        )
        session.add(sub2)
        await session.flush()

        rev2 = SubmissionRevision(
            submission_id=sub2.id,
            version_number=2,
            content_body=(
                "Blinkit, India's leading quick-commerce platform, today announced its expansion into "
                "five new cities -- Indore, Bhopal, Coimbatore, Visakhapatnam, and Nagpur -- bringing its "
                "approximately 10-minute delivery service to over 40 cities nationwide. "
                "With more than 20 million registered users and over 8,000 SKUs available per dark store, "
                "Blinkit continues to redefine everyday convenience for Indian households. "
                "The Blinkit app is available on iOS and Android. "
                "Delivery partners in these cities have already begun onboarding to support the launch."
            ),
            compliance_score=97.0,
            change_summary="Final approved version -- terminology and claims verified by legal",
            created_by="Ananya Iyer",
        )
        session.add(rev2)

        session.add(WorkflowEvent(
            submission_id=sub2.id,
            actor_id="user_creator_02",
            actor_name="Ananya Iyer",
            actor_role="CREATOR",
            event_type="CREATED",
            from_status=None,
            to_status="DRAFT",
            notes="Press release draft for city expansion.",
        ))
        session.add(WorkflowEvent(
            submission_id=sub2.id,
            actor_id="user_manager_01",
            actor_name="Vikram Nair",
            actor_role="MANAGER",
            event_type="STATUS_CHANGED",
            from_status="NEEDS_REVIEW",
            to_status="APPROVED",
            notes="All claims verified against Q2 2024 Expansion Press Release. Brand voice compliant. Approved.",
        ))

        # SUBMISSION 3 - Draft Diwali email (not yet audited)
        logger.info("Creating Submission 3: Diwali email campaign draft...")
        sub3 = Submission(
            brand_id=brand.id,
            title="Diwali Offers Email Campaign -- Subject & Body",
            content_format="TEXT",
            status="DRAFT",
            current_version=1,
            compliance_score=None,
            creator_id="user_creator_01",
            creator_name="Priya Sharma",
        )
        session.add(sub3)
        await session.flush()

        rev3 = SubmissionRevision(
            submission_id=sub3.id,
            version_number=1,
            content_body=(
                "Subject: Diwali ki shopping ho gayi easy!\n\n"
                "Dear member,\n\n"
                "This Diwali, let Blinkit handle your celebrations. From sweets and snacks to decorations and gifts, "
                "get everything delivered in approximately 10 minutes -- right to your doorstep. "
                "Explore our Diwali offers on the Blinkit app and save big on over 8,000 products. "
                "Shop now. Celebrate more."
            ),
            compliance_score=None,
            change_summary="Initial Diwali campaign email draft",
            created_by="Priya Sharma",
        )
        session.add(rev3)

        session.add(WorkflowEvent(
            submission_id=sub3.id,
            actor_id="user_creator_01",
            actor_name="Priya Sharma",
            actor_role="CREATOR",
            event_type="CREATED",
            from_status=None,
            to_status="DRAFT",
            notes="Diwali email campaign -- draft saved, not yet submitted for audit.",
        ))

        # SUBMISSION 4 - Mock audio/voiceover transcript with a terminology issue.
        logger.info("Creating Submission 4: Blinkit audio voiceover mock...")
        sub4 = Submission(
            brand_id=brand.id,
            title="10-Minute Delivery Voiceover -- Audio Spot",
            content_format="AUDIO",
            status="NEEDS_REVIEW",
            current_version=1,
            compliance_score=70.0,
            creator_id="user_creator_03",
            creator_name="Kabir Malhotra",
        )
        session.add(sub4)
        await session.flush()

        audio_transcript = (
            "VO: Need groceries now? The Blinkit app brings your everyday essentials to your door in "
            "approximately 10 minutes. Our delivery boys keep your order moving. Download the app and shop "
            "today. Offer valid in select service areas."
        )
        audio_revision = SubmissionRevision(
            submission_id=sub4.id,
            version_number=1,
            content_body=audio_transcript,
            media_urls=["mock://blinkit/audio/ten-minute-delivery-spot.mp3"],
            compliance_score=70.0,
            change_summary="Mock voiceover transcript for audio governance demo",
            created_by="Kabir Malhotra",
            ai_governance_metadata={"mock_asset": True, "duration_seconds": 18, "transcript_source": "synthetic"},
        )
        session.add(audio_revision)
        await session.flush()
        session.add(AuditFinding(
            submission_id=sub4.id,
            revision_id=audio_revision.id,
            category="TERMINOLOGY",
            severity="CRITICAL",
            detector_source="DETERMINISTIC_RULE",
            flagged_excerpt="delivery boys",
            explanation="Voiceover scripts must use inclusive, approved terminology for delivery staff.",
            guideline_citation="Blinkit Audio & Video Playbook 2024.pdf, Section 6",
            suggested_correction="delivery partners",
            resolution_state="OPEN",
        ))
        session.add(WorkflowEvent(
            submission_id=sub4.id,
            actor_id="user_creator_03",
            actor_name="Kabir Malhotra",
            actor_role="CREATOR",
            event_type="CREATED",
            from_status=None,
            to_status="DRAFT",
            notes="Synthetic audio asset and transcript prepared for demo.",
        ))

        # SUBMISSION 5 - Mock video transcript that is ready for approval.
        logger.info("Creating Submission 5: Blinkit video reel mock...")
        sub5 = Submission(
            brand_id=brand.id,
            title="Diwali Essentials Reel -- Video Script",
            content_format="VIDEO",
            status="APPROVED",
            current_version=1,
            compliance_score=94.0,
            creator_id="user_creator_04",
            creator_name="Meera Joshi",
        )
        session.add(sub5)
        await session.flush()

        video_transcript = (
            "[0:00] On-screen: Diwali shopping, sorted. [0:02] VO: From sweets and snacks to decorations, "
            "find festive essentials on the Blinkit app with approximately 10-minute delivery. [0:09] "
            "On-screen: Offers available in select service areas. [0:11] VO: Shop now and celebrate more."
        )
        video_revision = SubmissionRevision(
            submission_id=sub5.id,
            version_number=1,
            content_body=video_transcript,
            media_urls=["mock://blinkit/video/diwali-essentials-reel.mp4"],
            compliance_score=94.0,
            change_summary="Mock social video transcript with captions for accessibility review",
            created_by="Meera Joshi",
            ai_governance_metadata={
                "mock_asset": True,
                "duration_seconds": 14,
                "captions_present": True,
                "transcript_source": "synthetic",
            },
        )
        session.add(video_revision)
        session.add(WorkflowEvent(
            submission_id=sub5.id,
            actor_id="user_manager_01",
            actor_name="Vikram Nair",
            actor_role="MANAGER",
            event_type="STATUS_CHANGED",
            from_status="NEEDS_REVIEW",
            to_status="APPROVED",
            notes="Captions, CTA, and delivery claim checked against the Blinkit playbook.",
        ))

        await session.commit()
        logger.info("Blinkit seed completed successfully.")
        logger.info(f"  Brand ID: {brand.id}")
        logger.info("  Submissions: 5 (text, audio, and video demo coverage)")
        logger.info(f"  Guideline Chunks: {len(mock_guidelines)} (with pgvector embeddings)")


if __name__ == "__main__":
    asyncio.run(seed_blinkit())
