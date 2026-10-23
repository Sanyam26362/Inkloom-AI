import pytest
from app.core.pii_scrubber import ConfidentialityScrubber


def test_pii_scrub_and_restore_cycle():
    original_text = (
        "Contact CEO Jordan at jordan.lee@enterprise.com or call +1-555-839-2019 "
        "regarding access key sk-abcdef1234567890 and PROJECT-SECRET-99."
    )
    scrubbed, restore_map, disclosure = ConfidentialityScrubber.scrub(original_text)

    # Verify sensitive data is removed from scrubbed text
    assert "jordan.lee@enterprise.com" not in scrubbed
    assert "+1-555-839-2019" not in scrubbed
    assert "sk-abcdef1234567890" not in scrubbed
    assert "PROJECT-SECRET-99" not in scrubbed

    # Verify placeholders are present
    assert "[REDACTED_EMAIL_" in scrubbed
    assert "[REDACTED_PHONE_" in scrubbed
    assert "[REDACTED_SECRET_KEY_" in scrubbed
    assert "[REDACTED_INTERNAL_PROJECT_" in scrubbed

    # Verify disclosure counts
    assert disclosure["total_redacted"] == 4
    assert disclosure["categories_redacted"]["EMAIL"] == 1
    assert disclosure["categories_redacted"]["PHONE"] == 1

    # Verify restore cycle
    restored = ConfidentialityScrubber.restore(scrubbed, restore_map)
    assert restored == original_text


def test_pii_empty_input():
    scrubbed, restore_map, disclosure = ConfidentialityScrubber.scrub("")
    assert scrubbed == ""
    assert restore_map == {}
    assert disclosure["total_redacted"] == 0


def test_restore_suggested_correction():
    """Verify that when LLM returns suggested rewrite with placeholder, restore() inserts the original value."""
    text = "Deploy on AWS by contacting dev@corp.com."
    scrubbed, restore_map, _ = ConfidentialityScrubber.scrub(text)
    # Simulate LLM suggestion
    llm_suggestion = "Deploy across multi-cloud by notifying [REDACTED_EMAIL_1]."
    restored_suggestion = ConfidentialityScrubber.restore(llm_suggestion, restore_map)
    assert restored_suggestion == "Deploy across multi-cloud by notifying dev@corp.com."
