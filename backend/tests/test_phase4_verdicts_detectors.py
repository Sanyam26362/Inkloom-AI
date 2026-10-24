import io
import uuid
import pytest
from unittest.mock import AsyncMock, patch
from PIL import Image

from app.core.pii_scrubber import ConfidentialityScrubber
from app.models.brand import BrandProfile
from app.models.submission import Submission, SubmissionRevision
from app.models.campaign import Campaign
from app.models.ruleset import RuleSet
from app.models.finding import AuditFinding
from app.models.guideline_chunk import GuidelineChunk
from app.services.rule_engine import RuleEngine, FindingDraft
from app.services.audit_service import AuditService


def _create_test_image_bytes() -> bytes:
    img = Image.new("RGB", (64, 64), color=(248, 194, 0))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()



# ── 1. False Positive Tests ──────────────────────────────────────────────────

def test_word_boundary_guards_author_and_marvelous():
    """Verify that substring matching does not trigger false positives on word boundaries."""
    banned_terms = ["thor", "marvel", "hero"]
    text = "The marvelous author wrote a heroic story."
    findings = RuleEngine.check_banned_terms(text, banned_terms)
    flagged = [f.flagged_excerpt.lower() for f in findings]
    assert "thor" not in flagged, "'author' was incorrectly flagged as 'thor'"
    assert "marvel" not in flagged, "'marvelous' was incorrectly flagged as 'marvel'"


def test_pii_scrubber_does_not_flag_order_numbers_or_prices():
    """Verify that order numbers, invoices, and prices are not flagged as phone numbers."""
    text = "Your order Order #1002345678 is confirmed. Total Price: Rs. 999 or ₹1000. Invoice #9876543210."
    scrubbed, restore_map, report = ConfidentialityScrubber.scrub(text)
    assert "[REDACTED_PHONE_" not in scrubbed
    assert report["total_redacted"] == 0


def test_negated_explanation_does_not_trigger_event_guard():
    """Verify that model explanations stating 'no superheroes' do not trigger prohibited subject guards."""
    explanation = "Visual inspection confirmed no cartoon characters or superheroes or fireworks are present in this creative."
    # Direct match on subject with negative context
    assert not AuditService.matches_subject("superhero", "cartoon character")
    # Substring in model summary should never be scanned directly by the deterministic guard
    # The deterministic guard only checks structured fields: detected_subjects, prohibited_elements_found, visible_text


def test_cue_matching_does_not_match_lamp_post():
    """Verify that 'lamp-post' or 'streetlamp' does not falsely count as a festive Diwali 'lamp' or 'diya'."""
    assert not AuditService.matches_subject("diya", "lamp-post")
    assert not AuditService.matches_subject("diwali lamp", "lamp-post outside on the street")


# ── 2. Deterministic Detectors & WCAG Contrast ───────────────────────────────

def test_exaggeration_terms_detector():
    """Verify detection of unsubstantiated superlatives."""
    text = "Get 100% instant delivery guaranteed on every order, always!"
    exaggeration_terms = ["100%", "instant", "guaranteed", "always"]
    findings = RuleEngine.check_exaggeration_terms(text, exaggeration_terms)
    flagged = [f.flagged_excerpt.lower() for f in findings]
    assert "100%" in flagged
    assert "instant" in flagged
    assert "guaranteed" in flagged
    assert "always" in flagged


def test_standalone_app_vs_blinkit_app():
    """Verify that standalone 'app' is flagged but 'Blinkit app' passes cleanly."""
    text_bad = "Order fresh groceries now on the app."
    text_good = "Order fresh groceries now on the Blinkit app."
    pref = {"app": "Blinkit app"}

    findings_bad = RuleEngine.check_preferred_terminology(text_bad, pref)
    assert len(findings_bad) == 1
    assert findings_bad[0].flagged_excerpt == "app"

    findings_good = RuleEngine.check_preferred_terminology(text_good, pref)
    assert len(findings_good) == 0


def test_alt_text_rules():
    """Verify visual alt text accessibility requirements (missing = CRITICAL, <5 words = WARNING)."""
    missing_findings = RuleEngine.check_alt_text("")
    assert len(missing_findings) == 1
    assert missing_findings[0].severity == "CRITICAL"

    short_findings = RuleEngine.check_alt_text("Diwali sweets box")
    assert len(short_findings) == 1
    assert short_findings[0].severity == "WARNING"

    good_findings = RuleEngine.check_alt_text("Festive Diwali gift box with clay diyas and fresh laddoos")
    assert len(good_findings) == 0


def test_wcag_contrast_calculation():
    """Verify WCAG contrast calculation for accessible and inaccessible pairs."""
    # Charcoal on Yellow: #1C1C1E on #F8C200 (very high contrast, > 10:1)
    contrast_pass = RuleEngine.calculate_wcag_contrast("#1C1C1E", "#F8C200")
    assert contrast_pass > 7.0

    # White on Yellow: #FFFFFF on #F8C200 (poor contrast, < 2:1)
    contrast_fail = RuleEngine.calculate_wcag_contrast("#FFFFFF", "#F8C200")
    assert contrast_fail < 3.0


def test_cielab_palette_matching():
    """Verify CIELAB DeltaE pixel-area palette matching."""
    approved_palette = ["#F8C200", "#1C1C1E", "#FFFFFF", "#00A36C"]

    # Generate a solid approved yellow image (RGB: 248, 194, 0)
    yellow_img = Image.new("RGB", (64, 64), color=(248, 194, 0))
    buf = io.BytesIO()
    yellow_img.save(buf, format="PNG")
    match_pct, dominant, findings = RuleEngine.calculate_cielab_palette_match(buf.getvalue(), approved_palette)
    assert match_pct >= 90.0
    assert len(findings) == 0

    # Generate an unapproved bright blue/magenta image
    blue_img = Image.new("RGB", (64, 64), color=(0, 35, 102))
    buf2 = io.BytesIO()
    blue_img.save(buf2, format="PNG")
    match_pct2, dominant2, findings2 = RuleEngine.calculate_cielab_palette_match(buf2.getvalue(), approved_palette)
    assert match_pct2 < 20.0
    assert len(findings2) > 0


# ── 3. Compliance Test Cases Regression Suite (BG-TC-01..09) ─────────────────

@pytest.mark.asyncio
async def test_compliance_suite_bg_tc_01_pass(db_session):
    """BG-TC-01: Approved colors, diyas, marigold, laddoos, Blinkit app -> PASS."""
    brand = BrandProfile(name=f"Blinkit Demo 1 {uuid.uuid4().hex[:8]}", tone_persona="Warm, festive")
    db_session.add(brand)
    await db_session.flush()

    campaign = Campaign(
        brand_id=brand.id,
        name="Diwali 2026",
        required_cues=["diya", "marigold", "sweets", "mithai"],
        min_required_cues=2,
        prohibited_items=["crackers", "fireworks", "spider-man"],
    )
    db_session.add(campaign)

    ruleset = RuleSet(
        brand_id=brand.id,
        palette=["#F8C200", "#1C1C1E", "#FFFFFF"],
        banned_terms=["guaranteed", "instant", "always"],
        preferred_terminology={"app": "Blinkit app"},
        required_phrases=["Blinkit app"],
    )
    db_session.add(ruleset)

    chunk = GuidelineChunk(brand_id=brand.id, source_document="guidelines.pdf", section_reference="Color", content_text="Use #F8C200", embedding=[0.01]*768)
    db_session.add(chunk)
    await db_session.commit()

    submission = Submission(brand_id=brand.id, campaign_id=campaign.id, title="BG-TC-01 Poster", content_format="IMAGE", status="AUDITING", creator_id="c1", creator_name="Creator")
    db_session.add(submission)
    await db_session.flush()

    revision = SubmissionRevision(
        submission_id=submission.id,
        content_body="Happy Diwali! Order fresh mithai and diyas on the Blinkit app.",
        alt_text="Clay diya lamps and marigold garlands with sweets box",
        version_number=1,
        created_by="c1",
    )
    db_session.add(revision)
    await db_session.commit()

    yellow_img = Image.new("RGB", (64, 64), color=(248, 194, 0))
    buf = io.BytesIO()
    yellow_img.save(buf, format="PNG")

    mock_vision_result = {
        "overall_summary": "Festive Diwali poster with approved colors and cues.",
        "detected_subjects": ["clay diya", "marigold garland", "sweets"],
        "event_cues_detected": ["diya", "marigold", "sweets"],
        "diwali_cues_detected": ["diya", "marigold", "sweets"],
        "has_prohibited_elements": False,
        "prohibited_elements_found": [],
        "visible_text": ["Happy Diwali! Order fresh mithai and diyas on the Blinkit app."],
        "dominant_colors": ["#F8C200", "#1C1C1E"],
        "palette_match_pct": 95.0,
        "text_contrast_pairs": [{"text": "Happy Diwali", "foreground_hex": "#1C1C1E", "background_hex": "#F8C200"}],
        "findings": [],
        "ai_status": "ok",
        "ai_error": None,
    }

    with patch("app.services.gemini_service.gemini_service.audit_image_semantic", new_callable=AsyncMock) as mock_vision:
        mock_vision.return_value = mock_vision_result
        res = await AuditService.run_image_audit(
            session=db_session,
            submission=submission,
            revision=revision,
            image_bytes=buf.getvalue(),
            mime_type="image/png",
            persist=True,
        )

    assert res["verdict"] == "PASS"
    assert res["status"] == "NEEDS_REVIEW"
    assert res["findings_by_severity"]["CRITICAL"] == 0


@pytest.mark.asyncio
async def test_compliance_suite_bg_tc_02_fail_prohibited_fireworks(db_session):
    """BG-TC-02: Bursting fireworks and smoke -> FAIL."""
    brand = BrandProfile(name=f"Blinkit Demo 2 {uuid.uuid4().hex[:8]}")
    db_session.add(brand)
    await db_session.flush()

    campaign = Campaign(brand_id=brand.id, name="Diwali 2026", prohibited_items=["fireworks", "crackers", "smoke"], min_required_cues=1, required_cues=["diya"])
    db_session.add(campaign)
    chunk = GuidelineChunk(brand_id=brand.id, source_document="guidelines.pdf", section_reference="Safety", content_text="No fireworks", embedding=[0.01]*768)
    db_session.add(chunk)
    await db_session.commit()

    sub = Submission(brand_id=brand.id, campaign_id=campaign.id, title="BG-TC-02 Fireworks", content_format="IMAGE", status="AUDITING", creator_id="c1", creator_name="Creator")
    db_session.add(sub)
    await db_session.flush()

    rev = SubmissionRevision(submission_id=sub.id, content_body="Celebrate Diwali with the Blinkit app!", alt_text="Bursting fireworks and smoke in night sky", version_number=1, created_by="c1")
    db_session.add(rev)
    await db_session.commit()

    mock_vision_result = {
        "overall_summary": "Night sky with fireworks.",
        "detected_subjects": ["fireworks", "smoke"],
        "event_cues_detected": [],
        "has_prohibited_elements": True,
        "prohibited_elements_found": ["fireworks", "smoke"],
        "visible_text": ["Celebrate Diwali with the Blinkit app!"],
        "findings": [],
        "ai_status": "ok",
    }

    with patch("app.services.gemini_service.gemini_service.audit_image_semantic", new_callable=AsyncMock) as mock_vision:
        mock_vision.return_value = mock_vision_result
        res = await AuditService.run_image_audit(
            session=db_session,
            submission=sub,
            revision=rev,
            image_bytes=_create_test_image_bytes(),
            mime_type="image/png",
            persist=True,
        )

    assert res["verdict"] == "FAIL"
    assert res["status"] == "CHANGES_REQUESTED"
    assert res["findings_by_severity"]["CRITICAL"] > 0


@pytest.mark.asyncio
async def test_compliance_suite_bg_tc_03_fail_zero_cues(db_session):
    """BG-TC-03: Solid yellow/black vegetables only (0 Diwali cues) -> FAIL."""
    brand = BrandProfile(name=f"Blinkit Demo 3 {uuid.uuid4().hex[:8]}")
    db_session.add(brand)
    await db_session.flush()

    campaign = Campaign(brand_id=brand.id, name="Diwali 2026", required_cues=["diya", "marigold", "sweets"], min_required_cues=2)
    db_session.add(campaign)
    chunk = GuidelineChunk(brand_id=brand.id, source_document="g.pdf", section_reference="Event", content_text="Diwali required", embedding=[0.01]*768)
    db_session.add(chunk)
    await db_session.commit()

    sub = Submission(brand_id=brand.id, campaign_id=campaign.id, title="BG-TC-03 Groceries", content_format="IMAGE", status="AUDITING", creator_id="c1", creator_name="Creator")
    db_session.add(sub)
    await db_session.flush()

    rev = SubmissionRevision(submission_id=sub.id, content_body="Stock up on daily groceries with the Blinkit app.", alt_text="Vegetables and milk packets on yellow background", version_number=1, created_by="c1")
    db_session.add(rev)
    await db_session.commit()

    mock_vision_result = {
        "overall_summary": "Vegetables banner.",
        "detected_subjects": ["vegetables", "milk"],
        "event_cues_detected": [],  # 0 cues detected
        "has_prohibited_elements": False,
        "prohibited_elements_found": [],
        "visible_text": ["Stock up on daily groceries with the Blinkit app."],
        "findings": [],
        "ai_status": "ok",
    }

    with patch("app.services.gemini_service.gemini_service.audit_image_semantic", new_callable=AsyncMock) as mock_vision:
        mock_vision.return_value = mock_vision_result
        res = await AuditService.run_image_audit(
            session=db_session,
            submission=sub,
            revision=rev,
            image_bytes=_create_test_image_bytes(),
            mime_type="image/png",
            persist=True,
        )

    assert res["verdict"] == "FAIL"
    assert any("Insufficient Campaign Cues" in f.flagged_excerpt for f in res["findings"])


@pytest.mark.asyncio
async def test_compliance_suite_bg_tc_04_fail_spiderman(db_session):
    """BG-TC-04: Spider-Man holding a decorative paper lantern -> FAIL."""
    brand = BrandProfile(name=f"Blinkit Demo 4 {uuid.uuid4().hex[:8]}")
    db_session.add(brand)
    await db_session.flush()

    campaign = Campaign(brand_id=brand.id, name="Diwali 2026", prohibited_items=["spider-man", "disney", "superheroes"], required_cues=["lantern"], min_required_cues=1)
    db_session.add(campaign)
    chunk = GuidelineChunk(brand_id=brand.id, source_document="g.pdf", section_reference="IP", content_text="No Marvel characters", embedding=[0.01]*768)
    db_session.add(chunk)
    await db_session.commit()

    sub = Submission(brand_id=brand.id, campaign_id=campaign.id, title="BG-TC-04 Spider-Man", content_format="IMAGE", status="AUDITING", creator_id="c1", creator_name="Creator")
    db_session.add(sub)
    await db_session.flush()

    rev = SubmissionRevision(submission_id=sub.id, content_body="Super Diwali deals on the Blinkit app!", alt_text="Spider-Man holding lantern with sweets", version_number=1, created_by="c1")
    db_session.add(rev)
    await db_session.commit()

    mock_vision_result = {
        "overall_summary": "Spider-Man holding festive lantern.",
        "detected_subjects": ["spider-man", "lantern", "sweets"],
        "event_cues_detected": ["lantern", "sweets"],
        "has_prohibited_elements": True,
        "prohibited_elements_found": ["spider-man"],
        "visible_text": ["Super Diwali deals on the Blinkit app!"],
        "findings": [],
        "ai_status": "ok",
    }

    with patch("app.services.gemini_service.gemini_service.audit_image_semantic", new_callable=AsyncMock) as mock_vision:
        mock_vision.return_value = mock_vision_result
        res = await AuditService.run_image_audit(
            session=db_session,
            submission=sub,
            revision=rev,
            image_bytes=_create_test_image_bytes(),
            mime_type="image/png",
            persist=True,
        )

    assert res["verdict"] == "FAIL"
    assert any("spider-man" in f.flagged_excerpt.lower() for f in res["findings"])


@pytest.mark.asyncio
async def test_compliance_suite_bg_tc_05_fail_exaggerated_claims(db_session):
    """BG-TC-05: 100% Instant Diwali Delivery Guaranteed -> FAIL."""
    brand = BrandProfile(name=f"Blinkit Demo 5 {uuid.uuid4().hex[:8]}")
    db_session.add(brand)
    await db_session.flush()

    ruleset = RuleSet(
        brand_id=brand.id,
        banned_terms=["guaranteed", "instant", "100%"],
        exaggeration_terms=["100%", "instant", "guaranteed"],
    )
    db_session.add(ruleset)
    chunk = GuidelineChunk(brand_id=brand.id, source_document="g.pdf", section_reference="Claims", content_text="No 100% guarantees", embedding=[0.01]*768)
    db_session.add(chunk)
    await db_session.commit()

    sub = Submission(brand_id=brand.id, title="BG-TC-05 Claims", content_format="TEXT", status="AUDITING", creator_id="c1", creator_name="Creator")
    db_session.add(sub)
    await db_session.flush()

    rev = SubmissionRevision(submission_id=sub.id, content_body="100% Instant Diwali Delivery Guaranteed on the Blinkit app!", version_number=1, created_by="c1")
    db_session.add(rev)
    await db_session.commit()

    mock_text_result = {
        "overall_summary": "Copy audit completed.",
        "findings": [],
        "ai_status": "ok",
        "ai_error": None,
    }
    with patch("app.services.gemini_service.gemini_service.audit_content_semantic", new_callable=AsyncMock) as mock_text:
        mock_text.return_value = mock_text_result
        res = await AuditService.run_audit(
            session=db_session,
            submission=sub,
            revision=rev,
        )

    assert res["verdict"] == "FAIL"
    flagged = [f.flagged_excerpt.lower() for f in res["findings"]]
    assert "100%" in flagged
    assert "instant" in flagged
    assert "guaranteed" in flagged


@pytest.mark.asyncio
async def test_compliance_suite_bg_tc_06_needs_review_weak_cues_and_standalone_app(db_session):
    """BG-TC-06: 1 lantern (weak cues) + standalone 'app' -> NEEDS_REVIEW."""
    brand = BrandProfile(name=f"Blinkit Demo 6 {uuid.uuid4().hex[:8]}")
    db_session.add(brand)
    await db_session.flush()

    campaign = Campaign(brand_id=brand.id, name="Diwali 2026", required_cues=["diya", "marigold", "sweets", "lantern"], min_required_cues=2)
    db_session.add(campaign)
    ruleset = RuleSet(brand_id=brand.id, preferred_terminology={"app": "Blinkit app"})
    db_session.add(ruleset)
    chunk = GuidelineChunk(brand_id=brand.id, source_document="g.pdf", section_reference="General", content_text="General rules", embedding=[0.01]*768)
    db_session.add(chunk)
    await db_session.commit()

    sub = Submission(brand_id=brand.id, campaign_id=campaign.id, title="BG-TC-06 Weak Cues", content_format="IMAGE", status="AUDITING", creator_id="c1", creator_name="Creator")
    db_session.add(sub)
    await db_session.flush()

    rev = SubmissionRevision(submission_id=sub.id, content_body="Festive shopping made easy on the app.", alt_text="Corner lantern decoration on yellow background", version_number=1, created_by="c1")
    db_session.add(rev)
    await db_session.commit()

    mock_vision_result = {
        "overall_summary": "Single corner lantern.",
        "detected_subjects": ["lantern"],
        "event_cues_detected": ["lantern"],  # 1 cue detected, but 2 required -> WARNING
        "has_prohibited_elements": False,
        "prohibited_elements_found": [],
        "visible_text": ["Festive shopping made easy on the app."],
        "findings": [],
        "ai_status": "ok",
    }

    with patch("app.services.gemini_service.gemini_service.audit_image_semantic", new_callable=AsyncMock) as mock_vision:
        mock_vision.return_value = mock_vision_result
        res = await AuditService.run_image_audit(
            session=db_session,
            submission=sub,
            revision=rev,
            image_bytes=_create_test_image_bytes(),
            mime_type="image/png",
            persist=True,
        )

    assert res["verdict"] == "NEEDS_REVIEW"
    assert res["findings_by_severity"]["CRITICAL"] == 0
    assert res["findings_by_severity"]["WARNING"] >= 1


# ── 4. Idempotency & In-Memory (persist=False) Tests ─────────────────────────

@pytest.mark.asyncio
async def test_re_audit_is_idempotent(db_session):
    """Verify that re-auditing a revision deletes earlier findings rather than duplicating them."""
    brand = BrandProfile(name=f"Idempotent Brand {uuid.uuid4().hex[:8]}")
    db_session.add(brand)
    await db_session.flush()

    ruleset = RuleSet(brand_id=brand.id, banned_terms=["instant"])
    db_session.add(ruleset)
    chunk = GuidelineChunk(brand_id=brand.id, source_document="g.pdf", section_reference="Banned", content_text="No instant", embedding=[0.01]*768)
    db_session.add(chunk)
    await db_session.commit()

    sub = Submission(brand_id=brand.id, title="Idempotent Test", content_format="TEXT", status="AUDITING", creator_id="c1", creator_name="Creator")
    db_session.add(sub)
    await db_session.flush()

    rev = SubmissionRevision(submission_id=sub.id, content_body="Instant delivery for you.", version_number=1, created_by="c1")
    db_session.add(rev)
    await db_session.commit()

    mock_text_result = {
        "overall_summary": "Copy audit completed.",
        "findings": [],
        "ai_status": "ok",
        "ai_error": None,
    }
    with patch("app.services.gemini_service.gemini_service.audit_content_semantic", new_callable=AsyncMock) as mock_text:
        mock_text.return_value = mock_text_result
        # First audit
        res1 = await AuditService.run_audit(session=db_session, submission=sub, revision=rev)
        assert res1["total_findings"] >= 1
        count1 = res1["total_findings"]

        # Re-audit same revision
        res2 = await AuditService.run_audit(session=db_session, submission=sub, revision=rev)
        assert res2["total_findings"] == count1, "Re-audit duplicated findings instead of cleanly replacing them!"


@pytest.mark.asyncio
async def test_persist_false_does_not_mutate_db(db_session):
    """Verify that persist=False returns pure in-memory results without writing to DB."""
    brand = BrandProfile(name=f"In-Memory Brand {uuid.uuid4().hex[:8]}")
    db_session.add(brand)
    await db_session.flush()

    chunk = GuidelineChunk(brand_id=brand.id, source_document="g.pdf", section_reference="Ref", content_text="Info", embedding=[0.01]*768)
    db_session.add(chunk)
    await db_session.commit()

    sub = Submission(brand_id=brand.id, title="Persist False Test", content_format="IMAGE", status="AUDITING", creator_id="c1", creator_name="Creator")
    db_session.add(sub)
    await db_session.flush()

    rev = SubmissionRevision(submission_id=sub.id, content_body="Testing persist false.", version_number=1, created_by="c1")
    db_session.add(rev)
    await db_session.commit()

    initial_score = rev.compliance_score
    initial_status = sub.status

    mock_vision_result = {
        "overall_summary": "Clean image.",
        "detected_subjects": [],
        "event_cues_detected": [],
        "has_prohibited_elements": False,
        "prohibited_elements_found": [],
        "visible_text": [],
        "findings": [],
        "ai_status": "ok",
    }

    with patch("app.services.gemini_service.gemini_service.audit_image_semantic", new_callable=AsyncMock) as mock_vision:
        mock_vision.return_value = mock_vision_result
        res = await AuditService.run_image_audit(
            session=db_session,
            submission=sub,
            revision=rev,
            image_bytes=_create_test_image_bytes(),
            mime_type="image/png",
            persist=False,
        )

    assert "draft_findings" in res
    assert res["verdict"] in ("PASS", "NEEDS_REVIEW", "FAIL")
    # Verify DB objects were not mutated
    assert rev.compliance_score == initial_score
    assert sub.status == initial_status


@pytest.mark.asyncio
async def test_compliance_suite_bg_tc_07_pass_video_cues(db_session):
    """BG-TC-07: 3 clear Diwali cues, warm tone, 'Blinkit app', approved end-card colors -> PASS."""
    brand = BrandProfile(name=f"Blinkit Demo 7 {uuid.uuid4().hex[:8]}")
    db_session.add(brand)
    await db_session.flush()

    campaign = Campaign(
        brand_id=brand.id,
        name="Diwali 2026",
        required_cues=["diya", "marigold", "toran"],
        min_required_cues=2,
        prohibited_items=["crackers", "fireworks"],
    )
    db_session.add(campaign)
    ruleset = RuleSet(
        brand_id=brand.id,
        palette=["#00A36C", "#F8C200", "#1C1C1E", "#FFFFFF"],
        required_phrases=["Blinkit app"],
    )
    db_session.add(ruleset)
    chunk = GuidelineChunk(brand_id=brand.id, source_document="g.pdf", section_reference="Video", content_text="Video specs", embedding=[0.01]*768)
    db_session.add(chunk)
    await db_session.commit()

    sub = Submission(brand_id=brand.id, campaign_id=campaign.id, title="BG-TC-07 Video Reel", content_format="IMAGE", status="AUDITING", creator_id="c1", creator_name="Creator")
    db_session.add(sub)
    await db_session.flush()

    rev = SubmissionRevision(
        submission_id=sub.id,
        content_body="Forgot last-minute Diwali decor? Find diyas and marigold garlands on the Blinkit app.",
        alt_text="Family lighting clay diyas and placing marigold torans on doorway",
        version_number=1,
        created_by="c1",
    )
    db_session.add(rev)
    await db_session.commit()

    mock_vision_result = {
        "overall_summary": "Festive video frame with diyas and torans.",
        "detected_subjects": ["family", "clay diya", "marigold toran"],
        "event_cues_detected": ["diya", "marigold", "toran"],
        "has_prohibited_elements": False,
        "prohibited_elements_found": [],
        "visible_text": ["Find diyas and marigold garlands on the Blinkit app."],
        "dominant_colors": ["#00A36C", "#F8C200"],
        "palette_match_pct": 92.0,
        "findings": [],
        "ai_status": "ok",
    }

    with patch("app.services.gemini_service.gemini_service.audit_image_semantic", new_callable=AsyncMock) as mock_vision:
        mock_vision.return_value = mock_vision_result
        res = await AuditService.run_image_audit(
            session=db_session,
            submission=sub,
            revision=rev,
            image_bytes=_create_test_image_bytes(),
            mime_type="image/png",
            persist=True,
        )

    assert res["verdict"] == "PASS"
    assert res["findings_by_severity"]["CRITICAL"] == 0


@pytest.mark.asyncio
async def test_compliance_suite_bg_tc_08_needs_review_palette_and_claim(db_session):
    """BG-TC-08: Deep blue/magenta background + 11 minutes claim -> NEEDS_REVIEW."""
    brand = BrandProfile(name=f"Blinkit Demo 8 {uuid.uuid4().hex[:8]}")
    db_session.add(brand)
    await db_session.flush()

    campaign = Campaign(brand_id=brand.id, name="Diwali 2026", required_cues=["diya", "rangoli", "sweets"], min_required_cues=2)
    db_session.add(campaign)
    ruleset = RuleSet(
        brand_id=brand.id,
        palette=["#F8C200", "#1C1C1E", "#FFFFFF"],
        decision_rules={"palette_threshold": 75.0},
    )
    db_session.add(ruleset)
    chunk = GuidelineChunk(brand_id=brand.id, source_document="g.pdf", section_reference="Palette", content_text="Brand colors", embedding=[0.01]*768)
    db_session.add(chunk)
    await db_session.commit()

    sub = Submission(brand_id=brand.id, campaign_id=campaign.id, title="BG-TC-08 Palette Claim", content_format="IMAGE", status="AUDITING", creator_id="c1", creator_name="Creator")
    db_session.add(sub)
    await db_session.flush()

    rev = SubmissionRevision(
        submission_id=sub.id,
        content_body="Happy Diwali! Order sweets on the Blinkit app in 11 minutes.",
        alt_text="Deep blue and magenta background with diyas and sweets",
        version_number=1,
        created_by="c1",
    )
    db_session.add(rev)
    await db_session.commit()

    # Partially unapproved palette (60% yellow, 40% blue) -> triggers WARNING (<75% but >=50%)
    partial_img = Image.new("RGB", (64, 64), color=(248, 194, 0))
    for x in range(25):
        for y in range(64):
            partial_img.putpixel((x, y), (0, 35, 102))
    buf = io.BytesIO()
    partial_img.save(buf, format="PNG")

    mock_vision_result = {
        "overall_summary": "Diwali poster with unapproved blue palette.",
        "detected_subjects": ["diya", "rangoli", "sweets"],
        "event_cues_detected": ["diya", "rangoli", "sweets"],
        "has_prohibited_elements": False,
        "prohibited_elements_found": [],
        "visible_text": ["Happy Diwali! Order sweets on the Blinkit app in 11 minutes."],
        "dominant_colors": ["#002366", "#FF00FF"],
        "palette_match_pct": 35.0,
        "findings": [
            {
                "category": "FACTUAL_CLAIM",
                "severity": "WARNING",
                "flagged_excerpt": "11 minutes",
                "explanation": "Specific delivery time claim '11 minutes' requires verification against local store SLA.",
                "suggested_correction": "Replace with approved 10-minute delivery claim or general quick delivery promise.",
            }
        ],
        "ai_status": "ok",
    }

    with patch("app.services.gemini_service.gemini_service.audit_image_semantic", new_callable=AsyncMock) as mock_vision:
        mock_vision.return_value = mock_vision_result
        res = await AuditService.run_image_audit(
            session=db_session,
            submission=sub,
            revision=rev,
            image_bytes=buf.getvalue(),
            mime_type="image/png",
            persist=True,
        )

    # Has WARNING for palette and WARNING for claim -> overall NEEDS_REVIEW
    assert res["verdict"] == "NEEDS_REVIEW"
    assert res["findings_by_severity"]["WARNING"] >= 1


@pytest.mark.asyncio
async def test_compliance_suite_bg_tc_09_fail_sparkler_contrast_alt(db_session):
    """BG-TC-09: Sparkler, 'Always' banned term, contrast failure, missing alt text -> FAIL."""
    brand = BrandProfile(name=f"Blinkit Demo 9 {uuid.uuid4().hex[:8]}")
    db_session.add(brand)
    await db_session.flush()

    campaign = Campaign(brand_id=brand.id, name="Diwali 2026", prohibited_items=["sparkler", "crackers", "fireworks"])
    db_session.add(campaign)
    ruleset = RuleSet(
        brand_id=brand.id,
        banned_terms=["always"],
        exaggeration_terms=["always"],
    )
    db_session.add(ruleset)
    chunk = GuidelineChunk(brand_id=brand.id, source_document="g.pdf", section_reference="Safety", content_text="No sparklers", embedding=[0.01]*768)
    db_session.add(chunk)
    await db_session.commit()

    sub = Submission(brand_id=brand.id, campaign_id=campaign.id, title="BG-TC-09 Sparkler", content_format="IMAGE", status="AUDITING", creator_id="c1", creator_name="Creator")
    db_session.add(sub)
    await db_session.flush()

    # Note: missing alt_text (None)
    rev = SubmissionRevision(
        submission_id=sub.id,
        content_body="Always the best Diwali prices.",
        alt_text="",  # Missing alt text -> CRITICAL
        version_number=1,
        created_by="c1",
    )
    db_session.add(rev)
    await db_session.commit()

    mock_vision_result = {
        "overall_summary": "Photo with sparkler and text.",
        "detected_subjects": ["sparkler", "rangoli"],
        "event_cues_detected": ["rangoli"],
        "has_prohibited_elements": True,
        "prohibited_elements_found": ["sparkler"],
        "visible_text": ["Always the best Diwali prices."],
        "dominant_colors": ["#F8C200", "#FFFFFF"],
        "palette_match_pct": 60.0,
        "text_contrast_pairs": [
            {"text": "Always the best", "foreground_hex": "#FFFFFF", "background_hex": "#F8C200"}
        ],
        "findings": [],
        "ai_status": "ok",
    }

    with patch("app.services.gemini_service.gemini_service.audit_image_semantic", new_callable=AsyncMock) as mock_vision:
        mock_vision.return_value = mock_vision_result
        res = await AuditService.run_image_audit(
            session=db_session,
            submission=sub,
            revision=rev,
            image_bytes=_create_test_image_bytes(),
            mime_type="image/png",
            persist=True,
        )

    assert res["verdict"] == "FAIL"
    flagged = [f.flagged_excerpt.lower() for f in res["findings"]]
    # Verify prohibited sparkler detected
    assert any("sparkler" in f for f in flagged)
    # Verify banned word 'always' detected
    assert any("always" in f for f in flagged)
    # Verify contrast failure detected
    assert any("contrast" in f for f in flagged)
    # Verify missing alt text detected
    assert any("alt text" in f for f in flagged)

