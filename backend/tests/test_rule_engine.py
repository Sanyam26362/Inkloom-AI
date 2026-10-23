import pytest
from app.services.rule_engine import RuleEngine, FindingDraft
from app.services.audit_service import AuditService


def test_wcag_contrast_black_on_white():
    """WCAG 2.1 contrast for pure black on pure white must be exactly 21.0."""
    ratio = RuleEngine.calculate_wcag_contrast("#000000", "#FFFFFF")
    assert ratio == 21.0


def test_wcag_contrast_identical_colors():
    """Identical colors must have a contrast ratio of 1.0."""
    ratio = RuleEngine.calculate_wcag_contrast("#FFFFFF", "#FFFFFF")
    assert ratio == 1.0


def test_wcag_contrast_failing_threshold():
    """Light gray on white fails 4.5:1 AA standard."""
    ratio = RuleEngine.calculate_wcag_contrast("#999999", "#FFFFFF")
    assert ratio < 4.5


def test_wcag_invalid_hex_raises_value_error():
    with pytest.raises(ValueError):
        RuleEngine.parse_hex_color("invalid_hex")


def test_banned_terms_detection():
    text = "We built an unbreakable system with guaranteed results and cheap pricing."
    banned = ["unbreakable", "guaranteed"]
    findings = RuleEngine.check_banned_terms(text, banned)
    assert len(findings) == 2
    assert any(f.flagged_excerpt.lower() == "unbreakable" for f in findings)
    assert any(f.flagged_excerpt.lower() == "guaranteed" for f in findings)
    for f in findings:
        assert f.severity == "CRITICAL"
        assert f.detector_source == "DETERMINISTIC_RULE"


def test_preferred_terminology_detection():
    text = "All computation runs client-side to ensure cheap operations."
    terms_map = {
        "client-side": "on-device",
        "cheap": "cost-effective",
    }
    findings = RuleEngine.check_preferred_terminology(text, terms_map)
    assert len(findings) == 2
    corrections = {f.suggested_correction for f in findings}
    assert corrections == {"on-device", "cost-effective"}


def test_palette_and_contrast_check():
    palette = ["#0F172A", "#2563EB", "#FFFFFF"]
    colors_used = ["#0F172A", "#FF0000"]  # Red is unauthorized
    findings = RuleEngine.check_palette_and_contrast(
        colors_used=colors_used,
        approved_palette=palette,
        min_contrast=4.5,
        bg_color="#FFFFFF",
    )
    assert any(f.flagged_excerpt == "#FF0000" and f.category == "VISUAL" for f in findings)


def test_compliance_score_deductions():
    findings = [
        FindingDraft(
            category="TERMINOLOGY",
            severity="CRITICAL",
            detector_source="RULE",
            flagged_excerpt="a",
            explanation="b",
            guideline_citation="c",
            suggested_correction="d",
        ),
        FindingDraft(
            category="TONE",
            severity="WARNING",
            detector_source="RULE",
            flagged_excerpt="x",
            explanation="y",
            guideline_citation="z",
            suggested_correction="w",
        ),
    ]
    # 100 - 25 (CRITICAL) - 10 (WARNING) = 65.0
    score = AuditService.calculate_compliance_score(findings)
    assert score == 65.0
