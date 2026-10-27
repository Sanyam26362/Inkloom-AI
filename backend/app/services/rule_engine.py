import io
import re
import math
import unicodedata
from typing import List, Dict, Any, Tuple, Optional
from dataclasses import dataclass
from PIL import Image
import numpy as np

ZERO_WIDTH_CHARS = re.compile(r"[​‌‍⁠﻿­]")


def normalize_for_matching(text: Optional[str]) -> str:
    """Applies unicodedata NFKC and strips zero-width characters for evasion-proof matching."""
    if not text:
        return ""
    norm = unicodedata.normalize("NFKC", str(text))
    return ZERO_WIDTH_CHARS.sub("", norm)


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

    @staticmethod
    def rgb_to_lab(r: int, g: int, b: int) -> Tuple[float, float, float]:
        """Converts sRGB to CIELAB (D65 illuminant, 2-degree standard observer)."""
        def to_lin(c: int) -> float:
            val = c / 255.0
            return val / 12.92 if val <= 0.04045 else ((val + 0.055) / 1.055) ** 2.4

        rl, gl, bl = to_lin(r), to_lin(g), to_lin(b)
        X = rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375
        Y = rl * 0.2126729 + gl * 0.7151522 + bl * 0.0721750
        Z = rl * 0.0193339 + gl * 0.1191920 + bl * 0.9503041

        # D65 reference white
        x, y, z = X / 0.95047, Y / 1.00000, Z / 1.08883

        def f(t: float) -> float:
            return t ** (1.0 / 3.0) if t > 0.008856 else (7.787 * t) + (16.0 / 116.0)

        fx, fy, fz = f(x), f(y), f(z)
        L = (116.0 * fy) - 16.0
        a = 500.0 * (fx - fy)
        b = 200.0 * (fy - fz)
        return L, a, b

    @classmethod
    def delta_e(cls, lab1: Tuple[float, float, float], lab2: Tuple[float, float, float]) -> float:
        """Calculates standard Euclidean CIE76 Delta E between two Lab colors."""
        return math.sqrt((lab1[0] - lab2[0]) ** 2 + (lab1[1] - lab2[1]) ** 2 + (lab1[2] - lab2[2]) ** 2)

    @classmethod
    def calculate_cielab_palette_match(
        cls,
        image_bytes: bytes,
        approved_palette: List[str],
        threshold: float = 75.0,
        tolerance_delta_e: float = 20.0,
    ) -> Tuple[Optional[float], List[str], List[FindingDraft]]:
        """
        Calculates palette match percentage by pixel-area share in CIELAB DeltaE.
        Avoids integer floor division (//16*16) bias. Vectorized with numpy.
        Returns (None, [], []) when image bytes are empty/undecodable, palette is empty,
        or no palette colour parses.
        """
        if not image_bytes or not approved_palette:
            return None, [], []

        try:
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        except Exception:
            return None, [], []

        # Resize for fast, accurate pixel-area clustering
        thumb = image.resize((64, 64))
        arr = np.array(thumb)
        pixels = arr.reshape(-1, 3).astype(np.float64)

        # Approved palette in Lab
        palette_labs: List[Tuple[float, float, float]] = []
        clean_palette: List[str] = []
        for hex_code in approved_palette:
            try:
                rgb = cls.parse_hex_color(hex_code)
                palette_labs.append(cls.rgb_to_lab(*rgb))
                clean_palette.append(hex_code.upper())
            except Exception:
                pass

        if not palette_labs:
            return None, [], []

        # Find top 5 dominant colors
        smooth_clusters = np.round(pixels / 8.0) * 8.0
        unique_colors, counts = np.unique(smooth_clusters, axis=0, return_counts=True)
        sorted_indices = np.argsort(-counts)

        dominant_hex: List[str] = []
        for idx in sorted_indices[:5]:
            r, g, b = unique_colors[idx]
            r, g, b = max(0, min(255, int(r))), max(0, min(255, int(g))), max(0, min(255, int(b)))
            dominant_hex.append(f"#{r:02X}{g:02X}{b:02X}")

        # Vectorized sRGB to CIELAB conversion for all pixels
        c = pixels / 255.0
        lin = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
        X = lin[:, 0] * 0.4124564 + lin[:, 1] * 0.3575761 + lin[:, 2] * 0.1804375
        Y = lin[:, 0] * 0.2126729 + lin[:, 1] * 0.7151522 + lin[:, 2] * 0.0721750
        Z = lin[:, 0] * 0.0193339 + lin[:, 1] * 0.1191920 + lin[:, 2] * 0.9503041

        x, y, z = X / 0.95047, Y / 1.0, Z / 1.08883
        f_x = np.where(x > 0.008856, x ** (1.0 / 3.0), (7.787 * x) + (16.0 / 116.0))
        f_y = np.where(y > 0.008856, y ** (1.0 / 3.0), (7.787 * y) + (16.0 / 116.0))
        f_z = np.where(z > 0.008856, z ** (1.0 / 3.0), (7.787 * z) + (16.0 / 116.0))

        L = (116.0 * f_y) - 16.0
        a = 500.0 * (f_x - f_y)
        b = 200.0 * (f_y - f_z)
        pixel_labs = np.column_stack([L, a, b])

        palette_labs_arr = np.array(palette_labs, dtype=np.float64)

        # Vectorized Euclidean Delta E distance
        diffs = pixel_labs[:, np.newaxis, :] - palette_labs_arr[np.newaxis, :, :]
        dists = np.sqrt(np.sum(diffs ** 2, axis=-1))
        min_dists = np.min(dists, axis=-1)

        total_pixels = len(pixels)
        matching_pixels = int(np.sum(min_dists <= tolerance_delta_e))

        match_pct = round((matching_pixels / total_pixels) * 100.0, 1)

        findings: List[FindingDraft] = []
        if match_pct < threshold:
            severity = "CRITICAL" if match_pct < (threshold - 25.0) else "WARNING"
            findings.append(
                FindingDraft(
                    category="VISUAL",
                    severity=severity,
                    detector_source="CIELAB_DELTA_E",
                    flagged_excerpt=f"Palette match: {match_pct}% (threshold: {threshold}%)",
                    explanation=f"Visual asset color distribution ({match_pct}%) falls below the approved brand palette threshold ({threshold}%). Dominant colors detected: {', '.join(dominant_hex)}.",
                    guideline_citation="Brand Visual Identity - Approved Color Palette",
                    suggested_correction=f"Align visual assets with official brand palette swatches: {', '.join(clean_palette)}.",
                )
            )

        return match_pct, dominant_hex, findings

    @staticmethod
    def build_boundary_pattern(term_str: str) -> re.Pattern:
        """
        Builds a regex pattern with intelligent word boundaries that works for both
        alphanumeric words and terms containing trailing/leading punctuation (e.g. '100%').
        """
        prefix = r"\b" if term_str[0].isalnum() or term_str[0] == "_" else r"(?<!\w)"
        suffix = r"\b" if term_str[-1].isalnum() or term_str[-1] == "_" else r"(?!\w)"
        return re.compile(rf"{prefix}{re.escape(term_str)}{suffix}", re.IGNORECASE | re.UNICODE)

    @classmethod
    def check_banned_terms(cls, text: str, banned_terms: List[str]) -> List[FindingDraft]:
        """Detects exact prohibited phrases using word boundaries and Unicode safety."""
        text = normalize_for_matching(text)
        findings: List[FindingDraft] = []
        if not text or not banned_terms:
            return findings

        for term in banned_terms:
            term_str = term.strip()
            if not term_str:
                continue
            pattern = cls.build_boundary_pattern(term_str)
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
        text = normalize_for_matching(text)
        findings: List[FindingDraft] = []
        if not text or not terminology_map:
            return findings

        for deprecated, approved in terminology_map.items():
            dep_str = deprecated.strip()
            if not dep_str:
                continue

            # Standalone "app" rule: derive brand prefix from approved replacement (e.g. "Acme app" -> "acme")
            if dep_str.lower() == "app" and "app" in approved.lower():
                brand_prefix = re.sub(r"(?i)\s*app.*", "", approved).strip()
                prefix_escaped = re.escape(brand_prefix.lower()) if brand_prefix else r"\w+"
                pattern = re.compile(rf"(?<!\b{prefix_escaped}\s)\bapp\b", re.IGNORECASE | re.UNICODE)
                for match in pattern.finditer(text):
                    findings.append(
                        FindingDraft(
                            category="TERMINOLOGY",
                            severity="WARNING",
                            detector_source="DETERMINISTIC_RULE",
                            flagged_excerpt=match.group(0),
                            explanation=f"Standalone 'app' is discouraged in brand copy. Approved nomenclature requires '{approved}'.",
                            guideline_citation="Brand Nomenclature & Preferred Terminology Guide",
                            suggested_correction=approved,
                        )
                    )
                continue

            pattern = re.compile(rf"\b{re.escape(dep_str)}\b", re.IGNORECASE | re.UNICODE)
            for match in pattern.finditer(text):
                findings.append(
                    FindingDraft(
                        category="TERMINOLOGY",
                        severity="WARNING",
                        detector_source="DETERMINISTIC_RULE",
                        flagged_excerpt=match.group(0),
                        explanation=f"Style preference: '{match.group(0)}' is deprecated in brand copy.",
                        guideline_citation="Brand Nomenclature & Preferred Terminology Guide",
                        suggested_correction=approved,
                    )
                )
        return findings

    @classmethod
    def check_exaggeration_terms(
        cls, text: str, exaggeration_terms: List[str]
    ) -> List[FindingDraft]:
        """Detects exaggerated, unsubstantiated superlative or speed claims."""
        text = normalize_for_matching(text)
        findings: List[FindingDraft] = []
        if not text or not exaggeration_terms:
            return findings

        for term in exaggeration_terms:
            term_str = term.strip()
            if not term_str:
                continue
            pattern = cls.build_boundary_pattern(term_str)
            for match in pattern.finditer(text):
                findings.append(
                    FindingDraft(
                        category="FACTUAL_CLAIM",
                        severity="CRITICAL",
                        detector_source="DETERMINISTIC_RULE",
                        flagged_excerpt=match.group(0),
                        explanation=f"Unverified or exaggerated claim '{match.group(0)}' violates brand advertising policy.",
                        guideline_citation="Brand Governance - Exaggerated & Unverified Claims Policy",
                        suggested_correction=f"Replace '{match.group(0)}' with verifiable, modest statements.",
                    )
                )
        return findings

    @classmethod
    def check_required_phrases(
        cls, text: str, required_phrases: List[str]
    ) -> List[FindingDraft]:
        """Ensures mandatory brand phrases appear in campaign content."""
        text = normalize_for_matching(text)
        findings: List[FindingDraft] = []
        if not text or not required_phrases:
            return findings

        for phrase in required_phrases:
            phrase_str = phrase.strip()
            if not phrase_str:
                continue
            pattern = cls.build_boundary_pattern(phrase_str)
            if not pattern.search(text):
                findings.append(
                    FindingDraft(
                        category="TERMINOLOGY",
                        severity="WARNING",
                        detector_source="DETERMINISTIC_RULE",
                        flagged_excerpt="Campaign Copy",
                        explanation=f"Required brand phrase '{phrase_str}' is missing from copy.",
                        guideline_citation="Campaign Messaging Mandates",
                        suggested_correction=f"Include '{phrase_str}' in headline, body, or call-to-action.",
                    )
                )
        return findings

    @classmethod
    def check_alt_text(cls, alt_text: Optional[str]) -> List[FindingDraft]:
        """Enforces accessibility requirements for visual alt text."""
        findings: List[FindingDraft] = []
        if not alt_text or not alt_text.strip():
            findings.append(
                FindingDraft(
                    category="ACCESSIBILITY",
                    severity="CRITICAL",
                    detector_source="ACCESSIBILITY_RULE",
                    flagged_excerpt="Missing Alt Text",
                    explanation="Visual asset is missing alternative text. Alt text is mandatory for screen readers and accessibility.",
                    guideline_citation="WCAG 2.1 Non-Text Content Guidelines (Guideline 1.1.1)",
                    suggested_correction="Add descriptive alt text with at least 5 words summarizing the image.",
                )
            )
            return findings

        clean_alt = alt_text.strip()
        lower_alt = clean_alt.lower()

        # Check for generic placeholders or filenames
        placeholders = {"image", "photo", "picture", "graphic", "banner", "poster", "logo", "thumbnail", "placeholder", "icon"}
        is_filename = bool(re.search(r"^(?:img|dsc|photo|pic|image)[-_0-9]*\.(?:jpg|jpeg|png|webp|gif)$", lower_alt, re.IGNORECASE)) or bool(re.search(r"^[\w\-]+\.(?:jpg|jpeg|png|webp|gif|svg)$", lower_alt, re.IGNORECASE))
        if lower_alt in placeholders or is_filename:
            findings.append(
                FindingDraft(
                    category="ACCESSIBILITY",
                    severity="WARNING",
                    detector_source="ACCESSIBILITY_RULE",
                    flagged_excerpt=clean_alt,
                    explanation=f"Alt text '{clean_alt}' is a generic placeholder or filename, failing WCAG 2.1 accessibility requirements for meaningful description.",
                    guideline_citation="WCAG 2.1 Non-Text Content Guidelines (Guideline 1.1.1)",
                    suggested_correction="Replace filename/placeholder with descriptive text summarizing visual subjects and key information.",
                )
            )
            return findings

        words = clean_alt.split()
        if len(words) < 5:
            findings.append(
                FindingDraft(
                    category="ACCESSIBILITY",
                    severity="WARNING",
                    detector_source="ACCESSIBILITY_RULE",
                    flagged_excerpt=clean_alt,
                    explanation=f"Alt text '{clean_alt}' has only {len(words)} words. Brand accessibility requires at least 5 words.",
                    guideline_citation="WCAG 2.1 Non-Text Content Guidelines (Guideline 1.1.1)",
                    suggested_correction="Expand alt text to describe visual context, subjects, and key text visibly communicating the asset.",
                )
            )
            return findings

        distinct_words = {w.lower() for w in words}
        if len(words) >= 5 and len(distinct_words) < 3:
            findings.append(
                FindingDraft(
                    category="ACCESSIBILITY",
                    severity="WARNING",
                    detector_source="ACCESSIBILITY_RULE",
                    flagged_excerpt=clean_alt,
                    explanation=f"Alt text '{clean_alt}' has insufficient descriptive variety ({len(distinct_words)} distinct words across {len(words)} words).",
                    guideline_citation="WCAG 2.1 Non-Text Content Guidelines (Guideline 1.1.1)",
                    suggested_correction="Provide meaningful, varied descriptive alt text detailing the visual elements.",
                )
            )

        return findings

    @classmethod
    def check_social_platform_specs(
        cls, caption: str, hashtags: List[str], platform: str = "instagram"
    ) -> List[FindingDraft]:
        """Validates social media platform limits (caption length, hashtag limits)."""
        findings: List[FindingDraft] = []
        if platform.lower() in ("instagram", "ig"):
            if len(caption) > 2200:
                findings.append(
                    FindingDraft(
                        category="GENERAL",
                        severity="CRITICAL",
                        detector_source="PLATFORM_SPEC",
                        flagged_excerpt=f"Caption length: {len(caption)} characters",
                        explanation="Caption exceeds Instagram limit of 2,200 characters.",
                        guideline_citation="Instagram Platform Specifications",
                        suggested_correction="Trim caption to under 2,200 characters.",
                    )
                )
            if len(hashtags) > 30:
                findings.append(
                    FindingDraft(
                        category="GENERAL",
                        severity="CRITICAL",
                        detector_source="PLATFORM_SPEC",
                        flagged_excerpt=f"Hashtags count: {len(hashtags)}",
                        explanation="Hashtags exceed Instagram maximum allowed limit of 30 hashtags.",
                        guideline_citation="Instagram Platform Specifications",
                        suggested_correction="Reduce hashtag count to between 3 and 10 relevant tags.",
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
        required_phrases: Optional[List[str]] = None,
        exaggeration_terms: Optional[List[str]] = None,
        alt_text: Optional[str] = None,
        is_visual: bool = False,
        colors_used: Optional[List[str]] = None,
        approved_palette: Optional[List[str]] = None,
        min_contrast: float = 4.5,
        caption: Optional[str] = None,
        hashtags: Optional[List[str]] = None,
        platform: Optional[str] = None,
    ) -> List[FindingDraft]:
        """Executes full suite of deterministic checks on copy, terminology, contrast, alt-text, and platform rules."""
        findings: List[FindingDraft] = []
        findings.extend(cls.check_banned_terms(text, banned_terms))
        findings.extend(cls.check_preferred_terminology(text, preferred_terminology))

        if required_phrases:
            findings.extend(cls.check_required_phrases(text, required_phrases))

        if exaggeration_terms:
            findings.extend(cls.check_exaggeration_terms(text, exaggeration_terms))

        if is_visual:
            findings.extend(cls.check_alt_text(alt_text))

        if platform and (caption or hashtags):
            findings.extend(
                cls.check_social_platform_specs(
                    caption=caption or text,
                    hashtags=hashtags or [],
                    platform=platform,
                )
            )

        if colors_used and approved_palette:
            findings.extend(
                cls.check_palette_and_contrast(
                    colors_used=colors_used,
                    approved_palette=approved_palette,
                    min_contrast=min_contrast,
                )
            )

        return findings
