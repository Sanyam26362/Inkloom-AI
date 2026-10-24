import io
import pytest
from unittest.mock import AsyncMock, patch
from PIL import Image
from sqlalchemy import select
from app.models.brand import BrandProfile
from app.models.campaign import Campaign
from app.models.ruleset import RuleSet
from app.models.guideline_chunk import GuidelineChunk
from app.models.submission import Submission, SubmissionRevision
from app.services.audit_service import AuditService
from app.services.gemini_service import gemini_service
from app.services.rule_engine import RuleEngine


def make_test_png(color=(46, 125, 50)) -> bytes:
    buf = io.BytesIO()
    img = Image.new("RGB", (10, 10), color=color)
    img.save(buf, format="PNG")
    return buf.getvalue()


@pytest.mark.asyncio
async def test_acme_tea_holi_no_blinkit_or_diwali_leakage(db_session):
    """
    Asserts that auditing a second fictional client ('Acme Tea', Holi campaign)
    produces findings with ZERO mentions of 'Blinkit', 'Diwali', 'Spider-Man',
    or Blinkit hex codes (#F8C200, #1C1C1E).
    """
    import uuid
    unique_name = f"Acme Tea {uuid.uuid4().hex[:6]}"
    # 1. Create Acme Tea brand
    acme = BrandProfile(
        name=unique_name,
        industry="Beverages",
        tone_persona="Warm, aromatic, authentic, refreshing.",
        approved_hex_palette=["#2E7D32", "#81C784", "#FFFFFF", "#FF8F00"],
        banned_terms=["artificial", "synthetic", "guaranteed"],
        preferred_terminology={"chai": "hand-crafted tea"},
        approved_facts=[
            {"claim": "Acme Tea sources 100% single-estate leaves from Assam", "source": "Acme Sourcing Standards", "verified": True}
        ],
    )
    db_session.add(acme)
    await db_session.flush()

    # 2. Create Holi Campaign
    holi = Campaign(
        brand_id=acme.id,
        name="Holi Festival of Colors 2026",
        description="Celebrate the vibrant festival of Holi with fresh garden tea blends.",
        required_cues=["gulal", "colors", "festive teapot"],
        min_required_cues=2,
        prohibited_items=["coffee", "alcohol", "soda"],
    )
    db_session.add(holi)
    await db_session.flush()

    # 3. Create RuleSet
    ruleset = RuleSet(
        brand_id=acme.id,
        campaign_id=holi.id,
        version=1,
        source_documents=["Acme Tea Brand Guidelines 2026.pdf"],
        palette=["#2E7D32", "#81C784", "#FFFFFF", "#FF8F00"],
        banned_terms=["artificial", "synthetic"],
        preferred_terminology={"chai": "hand-crafted tea"},
        approved_facts=[
            {"claim": "Acme Tea sources 100% single-estate leaves from Assam", "source": "Acme Sourcing Standards", "verified": True}
        ],
        required_phrases=["Sip the tradition"],
        exaggeration_terms=["miracle"],
        prohibited_visual_subjects=["coffee mug", "alcohol bottles", "soda cans"],
        is_active=True,
    )
    db_session.add(ruleset)
    await db_session.flush()

    acme_chunk = GuidelineChunk(
        brand_id=acme.id,
        source_document="Acme Tea Brand Guidelines 2026.pdf",
        section_reference="Section 1",
        rule_category="GENERAL",
        content_text="Acme Tea brand identity and Holi guidelines.",
        embedding=[0.05] * 768,
        embedding_status="completed",
    )
    db_session.add(acme_chunk)
    await db_session.flush()

    # 4. Create Submission
    submission = Submission(
        brand_id=acme.id,
        campaign_id=holi.id,
        title="Holi Morning Chai Special",
        content_format="IMAGE",
        status="DRAFT",
        current_version=1,
    )
    db_session.add(submission)
    await db_session.flush()

    revision = SubmissionRevision(
        submission_id=submission.id,
        version_number=1,
        content_body="Enjoy our authentic chai this vibrant festival season!",
        media_urls=["https://example.com/acme_holi.png"],
        alt_text="A cup of fresh green tea surrounded by spring flowers",
        change_summary="Initial Holi creative upload",
        created_by="Acme Creator",
    )
    db_session.add(revision)
    await db_session.flush()

    # Mock Gemini vision response
    mock_vision_output = {
        "dominant_colors": ["#2E7D32", "#FF8F00", "#FFFFFF"],
        "palette_match_pct": 95.0,
        "visible_text": ["Enjoy our authentic chai this spring"],
        "detected_subjects": ["tea cup", "spring flowers", "gulal colors"],
        "prohibited_elements_found": [],
        "has_prohibited_elements": False,
        "event_cues_detected": ["gulal", "colors"],
        "overall_summary": "Clean, festive cup of tea with spring colors.",
        "findings": [
            {
                "category": "TONE",
                "severity": "SUGGESTION",
                "flagged_excerpt": "chai",
                "explanation": "Consider using approved terminology 'hand-crafted tea'.",
                "suggested_correction": "hand-crafted tea",
                "cited_guideline_id": None,
            }
        ],
        "ai_status": "ok",
    }

    dummy_png = make_test_png()

    with patch.object(gemini_service, "audit_image_semantic", new_callable=AsyncMock) as mock_gemini:
        mock_gemini.return_value = mock_vision_output

        result = await AuditService.run_image_audit(
            session=db_session,
            submission=submission,
            revision=revision,
            image_bytes=dummy_png,
            mime_type="image/png",
            campaign_id=holi.id,
            persist=True,
        )

        # Assert no client leakage
        all_text_produced = []
        for f in result.get("findings", []):
            all_text_produced.append(f.explanation)
            all_text_produced.append(f.flagged_excerpt)
            all_text_produced.append(f.guideline_citation)
            all_text_produced.append(f.suggested_correction)

        combined_findings_text = " ".join(all_text_produced).lower()

        # Strict checks: no Blinkit, Diwali, Spider-Man, or Blinkit hex codes
        banned_leakage_terms = ["blinkit", "diwali", "spider-man", "spiderman", "#f8c200", "#1c1c1e"]
        for term in banned_leakage_terms:
            assert term not in combined_findings_text, f"Found leaked term '{term}' in Acme Tea findings: {combined_findings_text}"


@pytest.mark.asyncio
async def test_word_boundary_no_false_positives():
    """
    Asserts that word boundary checks prevent 'author' matching 'thor',
    and 'marvelous' matching 'marvel'.
    """
    assert not AuditService.matches_subject("thor", "The author wrote an inspiring book.")
    assert AuditService.matches_subject("thor", "Thor was seen wielding his hammer.")
    assert not AuditService.matches_subject("marvel", "It was a marvelous morning for cricket.")
    assert AuditService.matches_subject("marvel", "A Marvel comic character was depicted.")


@pytest.mark.asyncio
async def test_model_negation_in_explanation_does_not_trigger_critical(db_session):
    """
    Asserts that when a model's explanation contains negated statements like
    'no cartoon characters or superheroes detected', it does NOT trigger CRITICAL.
    """
    import uuid
    brand = BrandProfile(
        name=f"Test Brand {uuid.uuid4().hex[:6]}",
        industry="Retail",
        approved_hex_palette=["#000000", "#FFFFFF"],
    )
    db_session.add(brand)
    await db_session.flush()

    ruleset = RuleSet(
        brand_id=brand.id,
        version=1,
        palette=["#000000", "#FFFFFF"],
        prohibited_visual_subjects=["superhero", "cartoon"],
        is_active=True,
    )
    db_session.add(ruleset)
    await db_session.flush()

    chunk = GuidelineChunk(
        brand_id=brand.id,
        source_document="brand_guidelines.txt",
        section_reference="Visual Standards",
        rule_category="GENERAL",
        content_text="No cartoon or superhero characters allowed.",
        embedding=[0.05] * 768,
        embedding_status="completed",
    )
    db_session.add(chunk)
    await db_session.flush()

    submission = Submission(
        brand_id=brand.id,
        title="Compliant Summer Product Shot",
        content_format="IMAGE",
        status="DRAFT",
        current_version=1,
    )
    db_session.add(submission)
    await db_session.flush()

    revision = SubmissionRevision(
        submission_id=submission.id,
        version_number=1,
        content_body="Summer product display",
        alt_text="A clean product shot of a bottle on a wooden table",
        change_summary="Upload",
        created_by="Tester",
    )
    db_session.add(revision)
    await db_session.flush()

    dummy_png = make_test_png(color=(0, 0, 0))

    mock_vision = {
        "dominant_colors": ["#000000", "#FFFFFF"],
        "palette_match_pct": 100.0,
        "visible_text": [],
        "detected_subjects": ["bottle", "wooden table"],
        "prohibited_elements_found": [],
        "has_prohibited_elements": False,
        "overall_summary": "Image is clean; no cartoon characters or superheroes were detected.",
        "findings": [
            {
                "category": "VISUAL",
                "severity": "SUGGESTION",
                "flagged_excerpt": "Visual lighting",
                "explanation": "No cartoon characters or superheroes were present, perfectly compliant.",
                "suggested_correction": "None needed",
            }
        ],
        "ai_status": "ok",
    }

    with patch.object(gemini_service, "audit_image_semantic", new_callable=AsyncMock) as mock_gemini:
        mock_gemini.return_value = mock_vision
        result = await AuditService.run_image_audit(
            session=db_session,
            submission=submission,
            revision=revision,
            image_bytes=dummy_png,
            mime_type="image/png",
            persist=True,
        )

        critical_findings = [f for f in result.get("findings", []) if f.severity == "CRITICAL"]
        assert len(critical_findings) == 0, f"Unexpected critical findings triggered by explanation: {critical_findings}"


@pytest.mark.asyncio
async def test_persist_false_does_not_mutate_submission(db_session):
    """
    Asserts that running run_image_audit with persist=False returns in-memory
    audit findings without mutating the submission or revision status or compliance score.
    """
    import uuid
    brand = BrandProfile(
        name=f"Stateless Test {uuid.uuid4().hex[:6]}",
        approved_hex_palette=["#000000"],
    )
    db_session.add(brand)
    await db_session.flush()

    chunk = GuidelineChunk(
        brand_id=brand.id,
        source_document="stateless_rules.txt",
        section_reference="General",
        rule_category="GENERAL",
        content_text="Ensure visual guidelines are respected.",
        embedding=[0.05] * 768,
        embedding_status="completed",
    )
    db_session.add(chunk)
    await db_session.flush()

    sub = Submission(
        brand_id=brand.id,
        title="Preview Test",
        content_format="TEXT",
        status="DRAFT",
        current_version=1,
        compliance_score=None,
    )
    db_session.add(sub)
    await db_session.flush()

    rev = SubmissionRevision(
        submission_id=sub.id,
        version_number=1,
        content_body="Draft content",
        compliance_score=None,
        created_by="Tester",
    )
    db_session.add(rev)
    await db_session.flush()

    dummy_png = make_test_png()


    with patch.object(gemini_service, "audit_image_semantic", new_callable=AsyncMock) as mock_gemini:
        mock_gemini.return_value = {
            "dominant_colors": ["#FF0000"],
            "palette_match_pct": 20.0,
            "visible_text": [],
            "detected_subjects": [],
            "prohibited_elements_found": [],
            "findings": [],
            "ai_status": "ok",
        }
        res = await AuditService.run_image_audit(
            session=db_session,
            submission=sub,
            revision=rev,
            image_bytes=dummy_png,
            mime_type="image/png",
            persist=False,
        )

        assert "compliance_score" in res
        # Submission status and format must remain unchanged
        assert sub.status == "DRAFT"
        assert sub.content_format == "TEXT"
        assert sub.compliance_score is None
        assert rev.compliance_score is None
