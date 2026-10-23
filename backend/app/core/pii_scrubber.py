import re
from typing import Dict, Tuple, Any, List


class ConfidentialityScrubber:
    """Masks sensitive PII and confidential tokens before external LLM API calls.
    Uses reverse-offset substitution to avoid offset corruption and ensure exact one-pass replacement.
    """

    PATTERNS = {
        "EMAIL": re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b"),
        "PHONE": re.compile(r"\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b"),
        "SECRET_KEY": re.compile(r"\b(?:sk-[a-zA-Z0-9]{16,}|AIza[0-9A-Za-z-_]{35})\b"),
        "INTERNAL_PROJECT": re.compile(r"\bPROJECT-[A-Z0-9_-]{3,}\b"),
    }

    @classmethod
    def scrub(cls, text: str) -> Tuple[str, Dict[str, str], Dict[str, Any]]:
        """
        Replaces sensitive entities with non-colliding tokens like [REDACTED_EMAIL_1].
        Returns (scrubbed_text, restore_map, disclosure_summary).
        Does NOT log raw sensitive strings.
        """
        if not text:
            return "", {}, {"total_redacted": 0, "categories_redacted": {}, "confidentiality_guard_active": True}

        # Gather all matches with their spans
        raw_matches: List[Tuple[int, int, str, str]] = []
        for label, pattern in cls.PATTERNS.items():
            for m in pattern.finditer(text):
                raw_matches.append((m.start(), m.end(), label, m.group(0)))

        # Sort matches descending by start index to maintain original offsets during substitution
        raw_matches.sort(key=lambda x: x[0], reverse=True)

        scrubbed = text
        restore_map: Dict[str, str] = {}
        category_counts: Dict[str, int] = {}
        counter = len(raw_matches)

        for start, end, label, original_val in raw_matches:
            placeholder = f"[REDACTED_{label}_{counter}]"
            restore_map[placeholder] = original_val
            category_counts[label] = category_counts.get(label, 0) + 1
            # Exact slice substitution
            scrubbed = scrubbed[:start] + placeholder + scrubbed[end:]
            counter -= 1

        disclosure = {
            "total_redacted": sum(category_counts.values()),
            "categories_redacted": category_counts,
            "confidentiality_guard_active": True,
        }
        return scrubbed, restore_map, disclosure

    @classmethod
    def restore(cls, text: str, restore_map: Dict[str, str]) -> str:
        """Restores original values back into LLM-suggested rewrites safely."""
        if not text or not restore_map:
            return text
        restored = text
        # Restore placeholders in descending length order to avoid prefix overlap
        for placeholder in sorted(restore_map.keys(), key=len, reverse=True):
            original_val = restore_map[placeholder]
            restored = restored.replace(placeholder, original_val)
        return restored