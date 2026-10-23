import re
from typing import List, Dict, Any, Tuple, Optional
from dataclasses import dataclass


@dataclass
class FindingDraft:
    category: str
    severity: str
    detector_source: str
    flagged_excerpt: str
    explanation: str
    guideline_citation: str
    suggested_correction: str
    cited_chunk_id: Optional[int] = None


class RuleEngine:
    """Deterministic rule engine executing in-memory brand policy checks without AI latency."""

    @staticmethod
    def parse_hex_color(hex_str: str) -> Tuple[int, int, int]:
        """Parses a hex color string (e.g. #FFFFFF or #FFF) into (R, G, B) integers (0-255)."""
        clean_hex = hex_str.strip().lstrip("#")
        if len(clean_hex) == 3:
            clean_hex = "".join([c * 2 for c in clean_hex])
        if len(clean_hex) != 6:
            raise ValueError(f"Invalid hex color format: {hex_str}")
        return int(clean_hex[0:2], 16), int(clean_hex[2:4], 16), int(clean_hex[4:6], 16)

    @classmethod
    def relative_luminance(cls, r: int, g: int, b: int) -> float:
        """Calculates standard WCAG 2.1 relative luminance."""
        def channel_lum(val: int) -> float:
            c = val / 255.0
            return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

        return (
            0.2126 * channel_lum(r)
            + 0.7152 * channel_lum(g)
            + 0.0722 * channel_lum(b)
        )

    @classmethod
    def calculate_wcag_contrast(cls, fg_hex: str, bg_hex: str) -> float:
        """
        Calculates contrast ratio between foreground and background colors according to WCAG 2.1.
        Returns ratio from 1.0 to 21.0.
        """
        r1, g1, b1 = cls.parse_hex_color(fg_hex)
        r2, g2, b2 = cls.parse_hex_color(bg_hex)
        lum1 = cls.relative_luminance(r1, g1, b1)
        lum2 = cls.relative_luminance(r2, g2, b2)
        lighter = max(lum1, lum2)
        darker = min(lum1, lum2)
        ratio = (lighter + 0.05) / (darker + 0.05)
        return round(ratio, 2)

    @classmethod
    def check_banned_terms(cls, text: str, banned_terms: List[str]) -> List[FindingDraft]:
        """Detects exact prohibited phrases or claims."""
        findings: List[FindingDraft] = []
        if not text or not banned_terms:
            return findings

        for term in banned_terms:
            term_str = term.strip()
            if not term_str:
                continue
            pattern = re.compile(rf"\b{re.escape(term_str)}\b", re.IGNORECASE)
            for match in pattern.finditer(text):
                findings.append(
                    FindingDraft(
                        category="TERMINOLOGY",
                        severity="CRITICAL",
                        detector_source="DETERMINISTIC_RULE",
                        flagged_excerpt=match.group(0),
                        explanation=f"Use of banned term '{match.group(0)}' strictly violates brand governance policy.",
                        guideline_citation="Brand Governance Prohibited Lexicon",
                        suggested_correction=f"Remove or replace '{match.group(0)}' with factual, non-absolute terminology.",
                    )
                )
        return findings

    @classmethod
    def check_preferred_terminology(
        cls, text: str, terminology_map: Dict[str, str]
    ) -> List[FindingDraft]:
        """Detects deprecated or discouraged phrases and suggests approved brand replacements."""
        findings: List[FindingDraft] = []
        if not text or not terminology_map:
            return findings

        for deprecated, approved in terminology_map.items():
            dep_str = deprecated.strip()
            if not dep_str:
                continue
            pattern = re.compile(rf"\b{re.escape(dep_str)}\b", re.IGNORECASE)
            for match in pattern.finditer(text):
                findings.append(
                    FindingDraft(
                        category="TERMINOLOGY",
                        severity="WARNING",
                        detector_source="DETERMINISTIC_RULE",
                        flagged_excerpt=match.group(0),
                        explanation=f"Phonetic/style preference: '{match.group(0)}' is deprecated in brand copy.",
                        guideline_citation="Brand Nomenclature & Preferred Terminology Guide",
                        suggested_correction=approved,
                    )
                )
        return findings

    @classmethod
    def check_palette_and_contrast(
        cls,
        colors_used: List[str],
        approved_palette: List[str],
        min_contrast: float = 4.5,
        bg_color: Optional[str] = None,
    ) -> List[FindingDraft]:
        """Checks color compliance against brand palette and calculates WCAG contrast."""
        findings: List[FindingDraft] = []
        normalized_approved = {c.strip().upper() for c in approved_palette if c.strip()}

        for color in colors_used:
            norm_color = color.strip().upper()
            if normalized_approved and norm_color not in normalized_approved:
                findings.append(
                    FindingDraft(
                        category="VISUAL",
                        severity="WARNING",
                        detector_source="DETERMINISTIC_RULE",
                        flagged_excerpt=color,
                        explanation=f"Color '{color}' is not part of the approved brand color palette.",
                        guideline_citation="Brand Visual Identity - Color Palette",
                        suggested_correction=f"Select an approved palette color from: {', '.join(sorted(normalized_approved))}",
                    )
                )

            # Check WCAG contrast if background is specified
            if bg_color:
                try:
                    ratio = cls.calculate_wcag_contrast(color, bg_color)
                    if ratio < min_contrast:
                        findings.append(
                            FindingDraft(
                                category="ACCESSIBILITY",
                                severity="CRITICAL",
                                detector_source="WCAG_MATH",
                                flagged_excerpt=f"{color} on {bg_color}",
                                explanation=f"Contrast ratio {ratio}:1 fails minimum WCAG AA threshold of {min_contrast}:1.",
                                guideline_citation="WCAG 2.1 AA Accessibility Guidelines",
                                suggested_correction=f"Adjust foreground or background color to achieve at least {min_contrast}:1 contrast.",
                            )
                        )
                except ValueError:
                    pass

        return findings

    @classmethod
    def run_all_deterministic_checks(
        cls,
        text: str,
        banned_terms: List[str],
        preferred_terminology: Dict[str, str],
        colors_used: Optional[List[str]] = None,
        approved_palette: Optional[List[str]] = None,
        min_contrast: float = 4.5,
    ) -> List[FindingDraft]:
        """Executes full suite of deterministic checks on copy and colors."""
        findings: List[FindingDraft] = []
        findings.extend(cls.check_banned_terms(text, banned_terms))
        findings.extend(cls.check_preferred_terminology(text, preferred_terminology))

        if colors_used and approved_palette:
            findings.extend(
                cls.check_palette_and_contrast(
                    colors_used=colors_used,
                    approved_palette=approved_palette,
                    min_contrast=min_contrast,
                )
            )

        return findings
