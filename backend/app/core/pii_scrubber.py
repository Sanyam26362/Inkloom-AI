import re
from typing import Dict, Tuple, Any, List


class ConfidentialityScrubber:
    """Masks sensitive PII and confidential tokens before external LLM API calls.
    Uses non-overlapping span filtering and reverse-offset substitution to avoid offset corruption.
    Does NOT flag order numbers, invoice numbers, currency amounts, or prices as phone numbers.
    """

    PATTERNS = {
        "EMAIL": re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b"),
        "PHONE": re.compile(
            r"(?:\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\b(?:\+91[-.\s]?)?[6-9]\d{9}\b"
        ),
        "SECRET_KEY": re.compile(r"\b(?:sk-[a-zA-Z0-9]{16,}|AIza[0-9A-Za-z-_]{35})\b"),
        "INTERNAL_PROJECT": re.compile(r"\bPROJECT-[A-Z0-9_-]{3,}\b"),
        "AADHAAR": re.compile(r"\b[2-9]\d{3}[ -]?\d{4}[ -]?\d{4}\b"),
        "PAN": re.compile(r"\b[A-Z]{5}\d{4}[A-Z]\b"),
        "CARD": re.compile(r"\b(?:\d[ -]?){13,19}\b"),
    }

    NUMERIC_LABELS = ("PHONE", "AADHAAR", "CARD")

    @staticmethod
    def _luhn_ok(value: str) -> bool:
        digits = [int(c) for c in value if c.isdigit()]
        if not 13 <= len(digits) <= 19:
            return False
        total = 0
        for i, d in enumerate(reversed(digits)):
            if i % 2 == 1:
                d *= 2
                if d > 9:
                    d -= 9
            total += d
        return total % 10 == 0

    # \b prevents suffix collisions such as "numbeRS 98765..." or "paID 98765..." suppressing redaction.
    IGNORE_PHONE_PREFIX_RE = re.compile(
        r"(?:\b(?:order|invoice|transaction|receipt|id|rs\.?|inr|price)|[₹$#])\s*#?$", re.IGNORECASE
    )

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
                start, end = m.start(), m.end()
                val = m.group(0)

                # Contextual validation for PHONE to avoid false positives on order IDs and prices
                if label == "CARD" and not cls._luhn_ok(val):
                    continue
                if label in cls.NUMERIC_LABELS:
                    prefix = text[max(0, start - 25) : start].strip()
                    if cls.IGNORE_PHONE_PREFIX_RE.search(prefix):
                        continue

                raw_matches.append((start, end, label, val))

        # Safely handle overlapping spans: sort by start ascending, then length descending
        raw_matches.sort(key=lambda x: (x[0], -(x[1] - x[0])))
        non_overlapping: List[Tuple[int, int, str, str]] = []
        last_end = -1
        for start, end, label, val in raw_matches:
            if start >= last_end:
                non_overlapping.append((start, end, label, val))
                last_end = end

        # Sort matches descending by start index to maintain original offsets during substitution
        non_overlapping.sort(key=lambda x: x[0], reverse=True)

        scrubbed = text
        restore_map: Dict[str, str] = {}
        category_counts: Dict[str, int] = {}
        counter = len(non_overlapping)

        for start, end, label, original_val in non_overlapping:
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