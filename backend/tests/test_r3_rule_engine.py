import pytest
from app.services.rule_engine import RuleEngine, normalize_for_matching


def test_zero_width_evasion_caught():
    # Insert zero-width spaces (\u200B) inside banned term "guaranteed"
    evasion_text = "Our delivery is g\u200Bu\u200Ca\u200Dr\u2060a\uFEFFn\u00ADteed on all orders."
    assert normalize_for_matching(evasion_text) == "Our delivery is guaranteed on all orders."

    findings = RuleEngine.check_banned_terms(evasion_text, banned_terms=["guaranteed"])
    assert len(findings) == 1
    assert findings[0].flagged_excerpt == "guaranteed"


def test_preferred_terminology_app_rule_acme_and_blinkit():
    # Acme case
    acme_map = {"app": "Acme app"}
    text_acme_valid = "Download the Acme app today."
    assert len(RuleEngine.check_preferred_terminology(text_acme_valid, acme_map)) == 0

    text_acme_invalid = "Download the app today."
    findings_acme = RuleEngine.check_preferred_terminology(text_acme_invalid, acme_map)
    assert len(findings_acme) == 1
    assert findings_acme[0].suggested_correction == "Acme app"

    # Blinkit case
    blinkit_map = {"app": "Blinkit app"}
    text_blinkit_valid = "Download the Blinkit app now."
    assert len(RuleEngine.check_preferred_terminology(text_blinkit_valid, blinkit_map)) == 0

    text_blinkit_invalid = "Download our app now."
    findings_blinkit = RuleEngine.check_preferred_terminology(text_blinkit_invalid, blinkit_map)
    assert len(findings_blinkit) == 1
    assert findings_blinkit[0].suggested_correction == "Blinkit app"


def test_unreadable_image_gives_none_palette_match():
    # Invalid image bytes
    match_pct, dominant, findings = RuleEngine.calculate_cielab_palette_match(
        image_bytes=b"corrupt non-image bytes",
        approved_palette=["#F8C200", "#1C1C1E"],
    )
    assert match_pct is None
    assert dominant == []
    assert findings == []


def test_generic_alt_text_warned():
    # Placeholder
    f_placeholder = RuleEngine.check_alt_text("photo")
    assert len(f_placeholder) == 1
    assert f_placeholder[0].severity == "WARNING"
    assert "placeholder" in f_placeholder[0].explanation.lower()

    # Filename
    f_filename = RuleEngine.check_alt_text("img_1234.jpg")
    assert len(f_filename) == 1
    assert f_filename[0].severity == "WARNING"
    assert "filename" in f_filename[0].explanation.lower()

    # 5+ words but fewer than 3 distinct words
    f_repetitive = RuleEngine.check_alt_text("image image image image image")
    assert len(f_repetitive) == 1
    assert f_repetitive[0].severity == "WARNING"
    assert "insufficient descriptive variety" in f_repetitive[0].explanation.lower()

    # Valid descriptive alt text
    f_valid = RuleEngine.check_alt_text("A delivery partner delivering fresh groceries to a customer doorstep")
    assert len(f_valid) == 0

