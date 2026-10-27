import re
import logging
import asyncio
import unicodedata
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings

VALID_CATEGORIES = {
    "TONE",
    "FACTUAL_CLAIM",
    "TERMINOLOGY",
    "VISUAL",
    "ACCESSIBILITY",
    "EVENT_FIT",
    "EVENT",
    "PROHIBITED",
    "CAMPAIGN",
    "SYSTEM",
    "GENERAL",
    "PROMOTIONAL_CLAIMS",
    "VOICE_TERMINOLOGY",
}
VALID_SEVERITIES = {"CRITICAL", "WARNING", "SUGGESTION"}


def _norm_ws(text: Optional[str]) -> str:
    """Applies NFKC normalization, collapses whitespace, and lowercases."""
    if not text:
        return ""
    norm = unicodedata.normalize("NFKC", str(text))
    return " ".join(norm.split()).lower()

from app.models.brand import BrandProfile
from app.models.campaign import Campaign
from app.models.ruleset import RuleSet
from app.models.guideline_chunk import GuidelineChunk
from app.models.submission import Submission, SubmissionRevision
from app.models.finding import AuditFinding
from app.models.workflow import WorkflowEvent
from app.core.pii_scrubber import ConfidentialityScrubber
from app.services.rule_engine import RuleEngine, FindingDraft
from app.services.document_service import DocumentService
from app.services.gemini_service import gemini_service
from app.services.cloudinary_service import cloudinary_service

logger = logging.getLogger(__name__)


class AuditService:
    """Orchestrates deterministic rule execution, RAG guideline retrieval, and semantic AI auditing."""

    @staticmethod
    def _norm_ws(text: Optional[str]) -> str:
        return _norm_ws(text)

    @staticmethod
    def normalize_ai_finding(
        raw: Any,
        source_text: str,
        retrieved_ids: set,
    ) -> Optional[dict]:
        """
        Coerce null/unknown category -> 'TONE' and severity -> 'WARNING' (never crash on None);
        return None for claim_status SUPPORTED or NOT_A_CLAIM;
        if excerpt is not found in source_text (using _norm_ws) downgrade to SUGGESTION and prefix explanation;
        if cited_guideline_id not in retrieved_ids, set to None and cap CRITICAL to WARNING unless claim_status == 'CONTRADICTED'.
        """
        if not raw:
            return None

        if isinstance(raw, dict):
            raw_cat = raw.get("category")
            raw_sev = raw.get("severity")
            excerpt = raw.get("flagged_excerpt", "") or ""
            explanation = raw.get("explanation", "") or ""
            correction = raw.get("suggested_correction", "") or ""
            cited_id = raw.get("cited_guideline_id")
            claim_status = raw.get("claim_status")
        else:
            raw_cat = getattr(raw, "category", None)
            raw_sev = getattr(raw, "severity", None)
            excerpt = getattr(raw, "flagged_excerpt", "") or ""
            explanation = getattr(raw, "explanation", "") or ""
            correction = getattr(raw, "suggested_correction", "") or ""
            cited_id = getattr(raw, "cited_guideline_id", None)
            claim_status = getattr(raw, "claim_status", None)

        if claim_status in ("SUPPORTED", "NOT_A_CLAIM"):
            return None

        cat_str = str(raw_cat).upper() if raw_cat else ""
        category = cat_str if cat_str in VALID_CATEGORIES else "TONE"

        sev_str = str(raw_sev).upper() if raw_sev else ""
        severity = sev_str if sev_str in VALID_SEVERITIES else "WARNING"

        norm_exc = _norm_ws(excerpt)
        norm_src = _norm_ws(source_text)

        if norm_exc and norm_exc not in norm_src:
            severity = "SUGGESTION"
            unverified_tag = "[Unverified: excerpt not found verbatim in submission]"
            if not explanation.startswith(unverified_tag):
                explanation = f"{unverified_tag} {explanation}".strip()

        if cited_id not in retrieved_ids:
            cited_id = None
            if severity == "CRITICAL" and claim_status != "CONTRADICTED":
                severity = "WARNING"

        return {
            "category": category,
            "severity": severity,
            "flagged_excerpt": excerpt,
            "explanation": explanation,
            "suggested_correction": correction,
            "cited_guideline_id": cited_id,
            "claim_status": claim_status,
        }

    @classmethod
    def dedupe_findings(cls, findings: List[FindingDraft]) -> List[FindingDraft]:
        """
        Drop exact duplicates by (category, _norm_ws(excerpt)) and drop any detector_source 'RAG_LLM'
        finding whose excerpt overlaps (substring either way) a non-LLM finding.
        """
        non_llm_excerpts = [
            _norm_ws(f.flagged_excerpt)
            for f in findings
            if f.detector_source not in ("RAG_LLM", "SEMANTIC_LLM") and _norm_ws(f.flagged_excerpt)
        ]

        seen_keys = set()
        deduped: List[FindingDraft] = []

        for f in findings:
            norm_f = _norm_ws(f.flagged_excerpt)
            if f.detector_source == "RAG_LLM" and norm_f:
                overlaps = False
                for non_llm in non_llm_excerpts:
                    if norm_f in non_llm or non_llm in norm_f:
                        overlaps = True
                        break
                if overlaps:
                    continue

            key = (f.category, norm_f)
            if key not in seen_keys:
                seen_keys.add(key)
                deduped.append(f)

        return deduped

    @classmethod
    def verify_and_filter_findings(
        cls,
        raw_findings: List[Any],
        source_text: str,
        retrieved_map: Dict[int, Any],
        brand: Optional[BrandProfile] = None,
        restore_map: Optional[Dict[str, str]] = None,
    ) -> List[FindingDraft]:
        """
        Grounding check + drop hallucinated + normalize category/severity/citation.
        """
        retrieved_ids = set(retrieved_map.keys())
        norm_source = _norm_ws(source_text)
        results: List[FindingDraft] = []

        for raw in raw_findings:
            if isinstance(raw, dict):
                excerpt = raw.get("flagged_excerpt", "") or ""
            else:
                excerpt = getattr(raw, "flagged_excerpt", "") or ""

            norm_exc = _norm_ws(excerpt)
            if not norm_exc:
                continue

            # Substring + fuzzy grounding: drop completely invented excerpts
            is_grounded = False
            if norm_exc in norm_source:
                is_grounded = True
            else:
                exc_tokens = [t for t in re.findall(r"\w+", norm_exc) if len(t) > 1]
                if exc_tokens:
                    src_tokens = set(re.findall(r"\w+", norm_source))
                    if sum(1 for t in exc_tokens if t in src_tokens) / len(exc_tokens) >= 0.5:
                        is_grounded = True

            if not is_grounded:
                continue

            normalized = cls.normalize_ai_finding(raw, source_text=source_text, retrieved_ids=retrieved_ids)
            if not normalized:
                continue

            category = normalized["category"]
            severity = normalized["severity"]
            explanation = normalized["explanation"]
            suggested_correction = normalized["suggested_correction"]
            cited_id = normalized["cited_guideline_id"]
            claim_status = normalized["claim_status"]

            if cited_id and cited_id in retrieved_map:
                chunk = retrieved_map[cited_id]
                citation = f"{chunk.source_document} ({chunk.section_reference})"
                cited_chunk_id = cited_id
            else:
                cited_chunk_id = None
                if claim_status in ("CONTRADICTED", "UNSUPPORTED"):
                    citation = "Approved Facts Register"
                else:
                    citation = "No specific guideline matched (model judgement - needs human review)"

            final_flagged = ConfidentialityScrubber.restore(normalized["flagged_excerpt"], restore_map or {})
            final_correction = ConfidentialityScrubber.restore(suggested_correction, restore_map or {})

            results.append(
                FindingDraft(
                    category=category,
                    severity=severity,
                    detector_source="RAG_LLM",
                    flagged_excerpt=final_flagged,
                    explanation=explanation,
                    guideline_citation=citation,
                    suggested_correction=final_correction,
                    cited_chunk_id=cited_chunk_id,
                )
            )

        return results

    @staticmethod
    def matches_subject(subject: str, text: str) -> bool:
        """Matches a keyword using word boundaries and case-insensitivity to avoid false positives."""
        if not subject or not text:
            return False
        pattern = rf"\b{re.escape(subject.strip())}\b"
        return bool(re.search(pattern, text, re.IGNORECASE))

    @classmethod
    async def get_active_ruleset_and_campaign(
        cls,
        session: AsyncSession,
        brand_id: int,
        campaign_id: Optional[int] = None,
        event_name: Optional[str] = None,
    ) -> Tuple[Optional[Campaign], Optional[RuleSet]]:
        """Resolves campaign and active ruleset for a brand."""
        campaign: Optional[Campaign] = None
        if campaign_id:
            c_res = await session.execute(
                select(Campaign).where(Campaign.id == campaign_id, Campaign.brand_id == brand_id)
            )
            campaign = c_res.scalar_one_or_none()
        elif event_name and event_name.strip():
            c_res = await session.execute(
                select(Campaign)
                .where(Campaign.brand_id == brand_id, Campaign.name.ilike(f"%{event_name.strip()}%"))
                .order_by(Campaign.created_at.desc())
            )
            campaign = c_res.scalar_one_or_none()

        ruleset: Optional[RuleSet] = None
        if campaign:
            rs_res = await session.execute(
                select(RuleSet)
                .where(RuleSet.brand_id == brand_id, RuleSet.campaign_id == campaign.id, RuleSet.is_active == True)
                .order_by(RuleSet.version.desc())
            )
            ruleset = rs_res.scalars().first()

        if not ruleset:
            rs_res = await session.execute(
                select(RuleSet)
                .where(RuleSet.brand_id == brand_id, RuleSet.is_active == True)
                .order_by(RuleSet.version.desc())
            )
            ruleset = rs_res.scalars().first()

        return campaign, ruleset

    @classmethod
    async def retrieve_relevant_guidelines(
        cls,
        session: AsyncSession,
        brand_id: int,
        query_text: str,
        limit: int = 8,
        media_type: str = "text",
        campaign_name: str = "",
        retrieval_meta: Optional[Dict[str, Any]] = None,
    ) -> List[GuidelineChunk]:
        """
        Retrieves relevant guidelines:
        1. Raises ValueError if brand has 0 retrievable chunks.
        2. Always includes hard-rule chunks (PROHIBITED, EVENT, DECISION).
        3. Retrieves top-k semantic matches using query = content summary + media type + campaign.
        4. Provides deterministic fallback ordering when embeddings are unavailable.
        5. Increments times_triggered once per audit for each retrieved chunk.
        """
        count_res = await session.execute(
            select(func.count(GuidelineChunk.id)).where(GuidelineChunk.brand_id == brand_id)
        )
        total_chunks = count_res.scalar() or 0
        if total_chunks == 0:
            raise ValueError("No guideline chunks indexed for this brand. Please upload brand guidelines or load a premade pack before auditing.")

        # Always include hard-rule chunks (prohibited items, campaign event rules, decision criteria)
        hard_rule_categories = ["PROHIBITED", "EVENT", "DECISION"]
        hard_stmt = (
            select(GuidelineChunk)
            .where(
                GuidelineChunk.brand_id == brand_id,
                GuidelineChunk.rule_category.in_(hard_rule_categories),
            )
            .order_by(GuidelineChunk.id.asc())
            .limit(15)
        )
        hard_res = await session.execute(hard_stmt)
        hard_chunks = list(hard_res.scalars().all())
        selected_ids = {c.id for c in hard_chunks}

        # Semantic query = content summary + media type + campaign
        full_query = f"{query_text} {media_type} {campaign_name}".strip()
        embedding = await gemini_service.generate_embedding(full_query, task_type="RETRIEVAL_QUERY")

        semantic_chunks: List[GuidelineChunk] = []
        if embedding:
            stmt = (
                select(GuidelineChunk)
                .where(GuidelineChunk.brand_id == brand_id)
                .where(GuidelineChunk.embedding.isnot(None))
            )
            if selected_ids:
                stmt = stmt.where(GuidelineChunk.id.not_in(selected_ids))
            stmt = stmt.order_by(GuidelineChunk.embedding.cosine_distance(embedding)).limit(limit)
            res = await session.execute(stmt)
            semantic_chunks = list(res.scalars().all())

        if not semantic_chunks:
            # Deterministic fallback ordering when embeddings are down or returned empty
            fallback_stmt = (
                select(GuidelineChunk)
                .where(GuidelineChunk.brand_id == brand_id)
            )
            if selected_ids:
                fallback_stmt = fallback_stmt.where(GuidelineChunk.id.not_in(selected_ids))
            fallback_stmt = fallback_stmt.order_by(GuidelineChunk.id.asc()).limit(limit)
            fallback_res = await session.execute(fallback_stmt)
            semantic_chunks = list(fallback_res.scalars().all())

        mode = "semantic" if (embedding and semantic_chunks) else "degraded"
        if retrieval_meta is not None:
            retrieval_meta["mode"] = mode

        combined_chunks = hard_chunks + semantic_chunks

        # Increment times_triggered once per audit
        seen_ids = set()
        for chunk in combined_chunks:
            if chunk.id not in seen_ids:
                chunk.times_triggered += 1
                seen_ids.add(chunk.id)
        await session.flush()

        return combined_chunks

    @classmethod
    def calculate_compliance_score(cls, findings: List[FindingDraft]) -> float:
        """
        Calculates compliance score on 0-100 scale based on severity deductions:
        - CRITICAL: -25 points
        - WARNING: -10 points
        - SUGGESTION: -3 points
        """
        score = 100.0
        for f in findings:
            if f.severity == "CRITICAL":
                score -= 25.0
            elif f.severity == "WARNING":
                score -= 10.0
            elif f.severity == "SUGGESTION":
                score -= 3.0
        return max(0.0, round(score, 1))

    @classmethod
    def evaluate_verdict_and_dimensions(
        cls,
        findings: List[FindingDraft],
        ruleset: Optional[RuleSet] = None,
        campaign: Optional[Campaign] = None,
        palette_match_pct: Optional[float] = None,
        ai_status: str = "ok",
    ) -> Tuple[str, Dict[str, Any]]:
        """
        Computes per-dimension PASS/NEEDS_REVIEW/FAIL and authoritative overall verdict:
        - FAIL if any dimension FAILs or any CRITICAL finding exists.
        - NEEDS_REVIEW if any dimension NEEDS_REVIEW, any WARNING finding exists, or ai_status != 'ok'.
        - PASS if all dimensions PASS and no CRITICAL/WARNING findings exist.
        """
        dimension_map = {
            "visual_identity": {"findings": [], "categories": ["VISUAL", "COLOR", "IMAGE"]},
            "prohibited_content": {"findings": [], "categories": ["PROHIBITED", "SAFETY"]},
            "campaign_event": {"findings": [], "categories": ["EVENT", "CAMPAIGN", "EVENT_FIT"]},
            "voice_and_terminology": {"findings": [], "categories": ["TERMINOLOGY", "TONE", "VOICE"]},
            "accessibility": {"findings": [], "categories": ["ACCESSIBILITY", "WCAG", "CONTRAST"]},
            "claims_and_facts": {"findings": [], "categories": ["FACTUAL_CLAIM", "FACT", "CLAIM"]},
            "system_integrity": {"findings": [], "categories": ["SYSTEM"]},
        }

        for f in findings:
            cat = (f.category or "").upper()
            matched = False
            for dim_name, cfg in dimension_map.items():
                if any(k in cat for k in cfg["categories"]):
                    cfg["findings"].append(f)
                    matched = True
            if not matched:
                dimension_map["voice_and_terminology"]["findings"].append(f)

        dimension_results: Dict[str, Any] = {}
        has_fail = False
        has_review = False

        for dim_name, cfg in dimension_map.items():
            dim_findings = cfg["findings"]
            crit_count = sum(1 for f in dim_findings if f.severity == "CRITICAL")
            warn_count = sum(1 for f in dim_findings if f.severity == "WARNING")
            sugg_count = sum(1 for f in dim_findings if f.severity == "SUGGESTION")

            if crit_count > 0:
                dim_status = "FAIL"
                has_fail = True
            elif warn_count > 0:
                dim_status = "NEEDS_REVIEW"
                has_review = True
            else:
                dim_status = "PASS"

            dim_score = max(0.0, 100.0 - (crit_count * 30.0 + warn_count * 15.0 + sugg_count * 5.0))
            dimension_results[dim_name] = {
                "status": dim_status,
                "score": round(dim_score, 1),
                "critical_findings": crit_count,
                "warning_findings": warn_count,
                "suggestion_findings": sugg_count,
            }

        # Overall verdict
        if has_fail or any(f.severity == "CRITICAL" for f in findings):
            verdict = "FAIL"
        elif ai_status in ("failed", "partial") or has_review or any(f.severity == "WARNING" for f in findings):
            verdict = "NEEDS_REVIEW"
        else:
            verdict = "PASS"

        return verdict, dimension_results

    @staticmethod
    def calculate_palette_match(
        observed_colors: List[str], approved_colors: List[str], tolerance: float = 72
    ) -> Optional[float]:
        """Calculate a conservative palette match from colors extracted from the image pixels.

        The local image analysis is authoritative for palette compliance. A vision model can
        describe an image, but it must not be allowed to report 100% when the actual pixels
        visibly fall outside the configured brand palette.
        """
        parsed_approved: List[tuple[int, int, int]] = []
        for color in approved_colors:
            try:
                parsed_approved.append(RuleEngine.parse_hex_color(color))
            except (TypeError, ValueError):
                continue

        parsed_observed: List[tuple[int, int, int]] = []
        for color in observed_colors:
            try:
                parsed_observed.append(RuleEngine.parse_hex_color(color))
            except (TypeError, ValueError):
                continue

        if not parsed_approved or not parsed_observed:
            return None

        def color_distance(left: tuple[int, int, int], right: tuple[int, int, int]) -> float:
            return sum((a - b) ** 2 for a, b in zip(left, right)) ** 0.5

        def saturation(color: tuple[int, int, int]) -> float:
            channels = [channel / 255 for channel in color]
            high = max(channels)
            low = min(channels)
            return 0.0 if high == 0 else (high - low) / high

        def hue_degrees(color: tuple[int, int, int]) -> float:
            red, green, blue = [channel / 255 for channel in color]
            high = max(red, green, blue)
            low = min(red, green, blue)
            if high == low:
                return 0.0
            delta = high - low
            if high == red:
                hue = ((green - blue) / delta) % 6
            elif high == green:
                hue = (blue - red) / delta + 2
            else:
                hue = (red - green) / delta + 4
            return hue * 60

        def is_palette_match(
            observed: tuple[int, int, int], approved: tuple[int, int, int]
        ) -> bool:
            if color_distance(observed, approved) > tolerance:
                return False

            observed_saturation = saturation(observed)
            approved_saturation = saturation(approved)
            neutral_threshold = 0.18

            # A saturated blue/teal image must not be classified as neutral
            # Blinkit charcoal or white merely because it is dark/light nearby.
            if (observed_saturation <= neutral_threshold) != (approved_saturation <= neutral_threshold):
                return False

            if observed_saturation > neutral_threshold and approved_saturation > neutral_threshold:
                hue_delta = abs(hue_degrees(observed) - hue_degrees(approved))
                hue_delta = min(hue_delta, 360 - hue_delta)
                if hue_delta > 35:
                    return False

            return True

        matched = sum(
            1
            for observed in parsed_observed
            if any(is_palette_match(observed, approved) for approved in parsed_approved)
        )
        return round((matched / len(parsed_observed)) * 100, 1)

    @classmethod
    async def run_audit(
        cls,
        session: AsyncSession,
        submission: Submission,
        revision: SubmissionRevision,
        campaign_id: Optional[int] = None,
        event: Optional[str] = None,
        actor_id: str = "system_auditor",
        actor_name: str = "Inkloom Governance Engine",
        actor_role: str = "SYSTEM",
        additional_findings: Optional[List[FindingDraft]] = None,
        additional_metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Runs complete governance audit on a submission revision:
        1. Campaign & RuleSet resolution
        2. PII Scrubbing
        3. Deterministic Rule Matching (banned terms, preferred terminology)
        4. RAG Guideline Retrieval (pgvector)
        5. Semantic LLM Analysis (Gemini)
        6. Finding Deduplication and Score Calculation
        7. DB Persistence
        """
        # Fetch brand profile
        brand_stmt = select(BrandProfile).where(BrandProfile.id == submission.brand_id)
        brand_res = await session.execute(brand_stmt)
        brand = brand_res.scalar_one_or_none()
        if not brand:
            raise ValueError(f"BrandProfile with id {submission.brand_id} not found")

        # Resolve Campaign and RuleSet
        effective_campaign_id = campaign_id or submission.campaign_id
        campaign_event = event or (additional_metadata.get("campaign_event") if additional_metadata else None)
        campaign, ruleset = await cls.get_active_ruleset_and_campaign(
            session=session,
            brand_id=submission.brand_id,
            campaign_id=effective_campaign_id,
            event_name=campaign_event,
        )
        if campaign and not submission.campaign_id:
            submission.campaign_id = campaign.id

        effective_banned = ruleset.banned_terms if ruleset and ruleset.banned_terms else (brand.banned_terms or [])
        effective_pref = ruleset.preferred_terminology if ruleset and ruleset.preferred_terminology else (brand.preferred_terminology or {})
        effective_facts = ruleset.approved_facts if ruleset and ruleset.approved_facts else (brand.approved_facts or [])

        content = revision.content_body or ""
        all_draft_findings: List[FindingDraft] = []

        # 1. Deterministic Rule Engine (in-memory, immediate)
        effective_req_phrases = ruleset.required_phrases if ruleset and ruleset.required_phrases else []
        effective_exagg_terms = ruleset.exaggeration_terms if ruleset and ruleset.exaggeration_terms else []

        deterministic_findings = RuleEngine.run_all_deterministic_checks(
            text=content,
            banned_terms=effective_banned,
            preferred_terminology=effective_pref,
            required_phrases=effective_req_phrases,
            exaggeration_terms=effective_exagg_terms,
            caption=content,
            platform=submission.platform,
        )
        all_draft_findings.extend(deterministic_findings)

        # 2. PII / Confidentiality Scrubbing before external calls
        scrubbed_text, restore_map, pii_disclosure = ConfidentialityScrubber.scrub(content)

        # 3. Retrieve relevant guidelines via pgvector (privacy: query built from scrubbed_text)
        retrieval_meta: Dict[str, Any] = {}
        retrieved_chunks = await cls.retrieve_relevant_guidelines(
            session=session,
            brand_id=brand.id,
            query_text=scrubbed_text[:500] if scrubbed_text else "general guidelines",
            limit=8,
            media_type="text",
            campaign_name=campaign.name if campaign else (event or ""),
            retrieval_meta=retrieval_meta,
        )
        if retrieval_meta.get("mode") == "degraded":
            all_draft_findings.append(
                FindingDraft(
                    category="SYSTEM",
                    severity="WARNING",
                    detector_source="AI_GOVERNANCE_ENGINE",
                    flagged_excerpt="Guideline retrieval degraded",
                    explanation="Semantic vector retrieval unavailable; operating in degraded deterministic guideline retrieval mode.",
                    guideline_citation="System Reliability Guardrail",
                    suggested_correction="Verify embedding service credentials or run /guidelines/reindex.",
                )
            )

        guidelines_context = [
            {
                "id": c.id,
                "source_document": c.source_document,
                "section_reference": c.section_reference,
                "content_text": c.content_text,
            }
            for c in retrieved_chunks
        ]
        retrieved_map = {c.id: c for c in retrieved_chunks}

        # 4. Semantic AI Audit via Gemini
        ai_status = "ok"
        ai_error: Optional[str] = None

        campaign_dict = {
            "id": campaign.id,
            "name": campaign.name,
            "description": campaign.description,
            "goals": campaign.goals,
            "required_cues": campaign.required_cues,
            "prohibited_items": campaign.prohibited_items,
        } if campaign else None

        ruleset_dict = {
            "version": ruleset.version,
            "banned_terms": ruleset.banned_terms,
            "preferred_terminology": ruleset.preferred_terminology,
            "approved_facts": ruleset.approved_facts,
            "required_phrases": ruleset.required_phrases,
            "exaggeration_terms": ruleset.exaggeration_terms,
        } if ruleset else None

        if scrubbed_text.strip():
            if gemini_service.is_available:
                try:
                    ai_result = await gemini_service.audit_content_semantic(
                        scrubbed_text=scrubbed_text,
                        tone_persona=brand.tone_persona or "",
                        guidelines_context=guidelines_context,
                        approved_facts=effective_facts,
                        campaign=campaign_dict,
                        ruleset=ruleset_dict,
                        campaign_event=campaign.name if campaign else campaign_event,
                        confirmed_deterministic_findings=deterministic_findings,
                    )
                except Exception as exc:
                    ai_result = {
                        "ai_status": "failed",
                        "findings": [],
                        "ai_error": str(exc),
                    }
                ai_status = ai_result.get("ai_status", "ok")
                ai_error = ai_result.get("ai_error")
                ai_findings_raw = ai_result.get("findings", [])

                verified_findings = cls.verify_and_filter_findings(
                    raw_findings=ai_findings_raw,
                    source_text=scrubbed_text,
                    retrieved_map=retrieved_map,
                    brand=brand,
                    restore_map=restore_map,
                )
                all_draft_findings.extend(verified_findings)
            else:
                ai_status = "failed"
                ai_error = "Gemini AI service is offline or unconfigured."


        # Fail closed: when any AI step fails or is unavailable, add visible WARNING finding
        if ai_status == "failed":
            all_draft_findings.append(
                FindingDraft(
                    category="SYSTEM",
                    severity="WARNING",
                    detector_source="AI_GOVERNANCE_ENGINE",
                    flagged_excerpt="AI Governance Audit Incomplete",
                    explanation=f"AI analysis incomplete: {ai_error or 'AI service unavailable'}",
                    guideline_citation="System Reliability Guardrail",
                    suggested_correction="Retry the audit once AI services are operational.",
                )
            )

        # Media audits can contribute visual findings to the same revision. They
        # are merged before deduplication so text and visual policy violations are
        # persisted together and scored once.
        if additional_findings:
            all_draft_findings.extend(additional_findings)

        # 5. Deduplicate findings
        deduped_findings = cls.dedupe_findings(all_draft_findings)

        # 6. Calculate score and authoritative verdict
        score = cls.calculate_compliance_score(deduped_findings)
        verdict, dimension_results = cls.evaluate_verdict_and_dimensions(
            findings=deduped_findings,
            ruleset=ruleset,
            campaign=campaign,
            palette_match_pct=None,
            ai_status=ai_status,
        )

        revision.compliance_score = score
        revision.ai_governance_metadata = {
            "pii_disclosure": pii_disclosure,
            "retrieved_guidelines_count": len(retrieved_chunks),
            "findings_count": len(deduped_findings),
            "ai_status": ai_status,
            "ai_error": ai_error,
            "verdict": verdict,
            "dimension_results": dimension_results,
            "retrieval_mode": retrieval_meta.get("mode", "degraded"),
            "responsible_ai": {
                "model": settings.PRIMARY_LLM_MODEL,
                "grounding_verified": (ai_status == "ok"),
                "pii_categories_redacted": list(pii_disclosure.get("categories_redacted", {}).keys()) if isinstance(pii_disclosure, dict) else [],
                "content_sent_to_external_ai": bool(scrubbed_text.strip()),
            },
        }
        if additional_metadata:
            revision.ai_governance_metadata.update(additional_metadata)
            if "ai_status" in additional_metadata:
                ai_status = additional_metadata["ai_status"]
            if "ai_error" in additional_metadata:
                ai_error = additional_metadata["ai_error"]
        submission.compliance_score = score
        submission.verdict = verdict

        # Update submission status - fail closed to NEEDS_REVIEW if AI step failed
        if ai_status == "failed":
            submission.status = "NEEDS_REVIEW"
        elif verdict == "FAIL":
            submission.status = "CHANGES_REQUESTED"
        else:
            submission.status = "NEEDS_REVIEW"

        # 7. Persist AuditFinding records (idempotent: clean up existing findings for this revision first)
        await session.execute(delete(AuditFinding).where(AuditFinding.revision_id == revision.id))

        created_finding_records: List[AuditFinding] = []
        for draft in deduped_findings:
            finding = AuditFinding(
                submission_id=submission.id,
                revision_id=revision.id,
                cited_chunk_id=draft.cited_chunk_id,
                category=draft.category,
                severity=draft.severity,
                detector_source=draft.detector_source,
                flagged_excerpt=draft.flagged_excerpt,
                explanation=draft.explanation,
                guideline_citation=draft.guideline_citation,
                suggested_correction=draft.suggested_correction,
                resolution_state="OPEN",
            )
            session.add(finding)
            created_finding_records.append(finding)

        # 8. Log WorkflowEvent
        event = WorkflowEvent(
            submission_id=submission.id,
            actor_id=actor_id,
            actor_name=actor_name,
            actor_role=actor_role,
            event_type="AUDIT_COMPLETED",
            from_status="AUDITING",
            to_status=submission.status,
            notes=f"Audit completed with verdict {verdict} and compliance score {score}%. Generated {len(deduped_findings)} findings.",
            metadata_json={
                "revision_id": revision.id,
                "version_number": revision.version_number,
                "compliance_score": score,
                "verdict": verdict,
                "total_findings": len(deduped_findings),
            },
        )
        session.add(event)
        await session.commit()

        # Refresh findings to load IDs
        for f in created_finding_records:
            await session.refresh(f)

        severity_counts = {"CRITICAL": 0, "WARNING": 0, "SUGGESTION": 0}
        for f in created_finding_records:
            if f.severity in severity_counts:
                severity_counts[f.severity] += 1

        return {
            "submission_id": submission.id,
            "revision_id": revision.id,
            "version_number": revision.version_number,
            "compliance_score": score,
            "status": submission.status,
            "verdict": verdict,
            "dimension_results": dimension_results,
            "total_findings": len(created_finding_records),
            "findings_by_severity": severity_counts,
            "findings": created_finding_records,
            "confidentiality_report": pii_disclosure,
            "ai_status": ai_status,
            "ai_error": ai_error,
        }

    @classmethod
    async def run_image_audit(
        cls,
        session: AsyncSession,
        submission: Submission,
        revision: SubmissionRevision,
        image_bytes: bytes,
        mime_type: str,
        actor_id: str = "system_auditor",
        actor_name: str = "Inkloom Governance Engine",
        actor_role: str = "SYSTEM",
        persist: bool = True,
        additional_metadata: Optional[Dict[str, Any]] = None,
        campaign_event: Optional[str] = None,
        campaign_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Runs visual brand governance audit on an uploaded image revision:
        1. Brand Profile & Dynamic Campaign / RuleSet Resolution
        2. RAG Guideline Retrieval
        3. Multimodal Vision Analysis via Gemini
        4. Deterministic checks on visible text and structured visual elements
        5. Finding Deduplication and Compliance Score Calculation
        6. DB Persistence of Findings & Audit Trail Event (when persist=True)
        """
        brand_stmt = select(BrandProfile).where(BrandProfile.id == submission.brand_id)
        brand_res = await session.execute(brand_stmt)
        brand = brand_res.scalar_one_or_none()
        if not brand:
            raise ValueError(f"BrandProfile with id {submission.brand_id} not found")

        # Resolve Campaign and RuleSet
        effective_campaign_id = campaign_id or submission.campaign_id
        campaign, ruleset = await cls.get_active_ruleset_and_campaign(
            session=session,
            brand_id=submission.brand_id,
            campaign_id=effective_campaign_id,
            event_name=campaign_event,
        )
        if campaign and not submission.campaign_id and persist:
            submission.campaign_id = campaign.id

        effective_event = campaign.name if campaign else campaign_event
        effective_palette = ruleset.palette if ruleset and ruleset.palette else (brand.approved_hex_palette or [])
        effective_banned_terms = ruleset.banned_terms if ruleset and ruleset.banned_terms else (brand.banned_terms or [])
        effective_pref_terms = ruleset.preferred_terminology if ruleset and ruleset.preferred_terminology else (brand.preferred_terminology or {})
        effective_facts = ruleset.approved_facts if ruleset and ruleset.approved_facts else (brand.approved_facts or [])

        # Prohibited visual subjects from Campaign + RuleSet
        effective_prohibited_subjects: List[str] = []
        if campaign and campaign.prohibited_items:
            effective_prohibited_subjects.extend([str(item).lower() for item in campaign.prohibited_items])
        if ruleset and ruleset.prohibited_visual_subjects:
            effective_prohibited_subjects.extend([str(item).lower() for item in ruleset.prohibited_visual_subjects])
        # Deduplicate
        effective_prohibited_subjects = list(dict.fromkeys(effective_prohibited_subjects))

        image_metadata = DocumentService.analyze_image(image_bytes)

        # Retrieve visual and accessibility guidelines
        img_retrieval_meta: Dict[str, Any] = {}
        retrieved_chunks = await cls.retrieve_relevant_guidelines(
            session=session,
            brand_id=brand.id,
            query_text=(
                "visual brand identity colors accessibility contrast typography logo imagery "
                f"{effective_event or ''} event fit safety"
            ),
            limit=8,
            media_type="image",
            campaign_name=campaign.name if campaign else (effective_event or ""),
            retrieval_meta=img_retrieval_meta,
        )
        if img_retrieval_meta.get("mode") == "degraded":
            all_draft_findings.append(
                FindingDraft(
                    category="SYSTEM",
                    severity="WARNING",
                    detector_source="AI_GOVERNANCE_ENGINE",
                    flagged_excerpt="Guideline retrieval degraded",
                    explanation="Semantic vector retrieval unavailable; operating in degraded deterministic guideline retrieval mode.",
                    guideline_citation="System Reliability Guardrail",
                    suggested_correction="Verify embedding service credentials or run /guidelines/reindex.",
                )
            )

        guidelines_context = [
            {
                "id": c.id,
                "source_document": c.source_document,
                "section_reference": c.section_reference,
                "content_text": c.content_text,
            }
            for c in retrieved_chunks
        ]
        retrieved_map = {c.id: c for c in retrieved_chunks}

        all_draft_findings: List[FindingDraft] = []

        # ── Pre-check: deterministic scan on submission text metadata ─────────────────
        scan_targets = [
            (revision.content_body or ""),
            (revision.alt_text or ""),
            (submission.title or ""),
        ]
        detected_in_metadata = set()
        for scan_text in scan_targets:
            for subject in effective_prohibited_subjects:
                if cls.matches_subject(subject, scan_text):
                    detected_in_metadata.add(subject)

        for subject in detected_in_metadata:
            all_draft_findings.append(
                FindingDraft(
                    category="EVENT_FIT",
                    severity="CRITICAL",
                    detector_source="DETERMINISTIC_RULE",
                    flagged_excerpt=subject,
                    explanation=(
                        f"Detected prohibited visual subject '{subject}' in submission metadata. "
                        f"{brand.name} brand governance policies strictly prohibit these subjects in campaign content. "
                        f"Campaign: {effective_event or 'General'}"
                    ),
                    guideline_citation=f"{brand.name} Brand Governance Policy - Prohibited Visual Subjects",
                    suggested_correction=(
                        f"Replace with brand-appropriate visuals adhering to {brand.name} guidelines "
                        + (f"and approved {campaign.name} campaign elements." if campaign else ".")
                    ),
                )
            )

        campaign_dict = {
            "id": campaign.id,
            "name": campaign.name,
            "description": campaign.description,
            "goals": campaign.goals,
            "required_cues": campaign.required_cues,
            "prohibited_items": campaign.prohibited_items,
        } if campaign else None

        ruleset_dict = {
            "version": ruleset.version,
            "banned_terms": ruleset.banned_terms,
            "preferred_terminology": ruleset.preferred_terminology,
            "approved_facts": ruleset.approved_facts,
            "required_phrases": ruleset.required_phrases,
            "exaggeration_terms": ruleset.exaggeration_terms,
            "prohibited_visual_subjects": ruleset.prohibited_visual_subjects,
        } if ruleset else None

        cielab_match_pct_pre, cielab_dominant_pre, _ = RuleEngine.calculate_cielab_palette_match(
            image_bytes=image_bytes,
            approved_palette=effective_palette,
        )

        try:
            vision_result = await gemini_service.audit_image_semantic(
                image_bytes=image_bytes,
                mime_type=mime_type,
                tone_persona=brand.tone_persona or "",
                approved_hex_palette=effective_palette,
                approved_facts=effective_facts,
                banned_terms=effective_banned_terms,
                guidelines_context=guidelines_context,
                campaign_event=effective_event,
                campaign=campaign_dict,
                ruleset=ruleset_dict,
                deterministic_telemetry={
                    "cielab_match_pct": cielab_match_pct_pre,
                    "dominant_hex_colors": cielab_dominant_pre,
                    "width": image_metadata.get("width"),
                    "height": image_metadata.get("height"),
                },
            )
        except Exception as exc:
            vision_result = {
                "ai_status": "failed",
                "findings": [],
                "ai_error": str(exc),
                "palette_match_pct": None,
            }
        vision_ai_status = vision_result.get("ai_status", "ok")
        vision_ai_error = vision_result.get("ai_error")
        if vision_ai_status != "ok":
            all_draft_findings.append(
                FindingDraft(
                    category="SYSTEM",
                    severity="WARNING",
                    detector_source="AI_VISION_ENGINE",
                    flagged_excerpt="AI Visual Analysis Incomplete",
                    explanation=f"AI visual analysis incomplete: {vision_ai_error or 'Vision service unavailable'}",
                    guideline_citation=f"{brand.name} Visual Reliability Policy",
                    suggested_correction="Ensure visual asset is accessible and retry the audit once service is operational.",
                )
            )

        visible_text_list = vision_result.get("visible_text", [])
        local_dominant_colors = image_metadata.get("dominant_hex_colors", [])
        model_dominant_colors = vision_result.get("dominant_colors", []) or []

        # ── 1. CIELAB DeltaE Palette Matching (Weighted by Pixel-Area) ───────────────
        palette_threshold = 75.0
        if ruleset and ruleset.decision_rules and "palette_threshold" in ruleset.decision_rules:
            try:
                palette_threshold = float(ruleset.decision_rules["palette_threshold"])
            except (ValueError, TypeError):
                palette_threshold = 75.0

        cielab_match_pct, cielab_dominant, cielab_palette_findings = RuleEngine.calculate_cielab_palette_match(
            image_bytes=image_bytes,
            approved_palette=effective_palette,
            threshold=palette_threshold,
        )
        if cielab_palette_findings:
            all_draft_findings.extend(cielab_palette_findings)

        palette_match_pct = cielab_match_pct if (effective_palette and cielab_match_pct is not None) else None
        if effective_palette and cielab_match_pct is None:
            all_draft_findings.append(
                FindingDraft(
                    category="SYSTEM",
                    severity="WARNING",
                    detector_source="CIELAB_DELTA_E",
                    flagged_excerpt="Palette check not performed",
                    explanation="A brand palette is configured, but pixel-area CIELAB palette matching could not be executed.",
                    guideline_citation="Brand Visual Identity - Approved Color Palette",
                    suggested_correction="Ensure visual asset has valid decodable image pixels.",
                )
            )
        dominant_colors = cielab_dominant or local_dominant_colors or model_dominant_colors

        # ── 2. WCAG Contrast Check on Extracted Contrast Pairs ────────────────────────
        contrast_pairs = vision_result.get("text_contrast_pairs") or []
        for pair in contrast_pairs:
            pair_dict = pair if isinstance(pair, dict) else pair.model_dump()
            fg = pair_dict.get("foreground_hex")
            bg = pair_dict.get("background_hex")
            text_str = pair_dict.get("text", "Text overlay")
            if fg and bg:
                try:
                    ratio = RuleEngine.calculate_wcag_contrast(fg, bg)
                    if ratio < 4.5:
                        all_draft_findings.append(
                            FindingDraft(
                                category="ACCESSIBILITY",
                                severity="CRITICAL" if ratio < 3.0 else "WARNING",
                                detector_source="WCAG_CONTRAST_CALCULATOR",
                                flagged_excerpt=f"Contrast {ratio}:1 on '{text_str}' ({fg} on {bg})",
                                explanation=f"Text contrast ratio {ratio}:1 fails WCAG 2.1 AA minimum threshold of 4.5:1.",
                                guideline_citation="WCAG 2.1 Contrast (Minimum) (Guideline 1.4.3)",
                                suggested_correction=f"Increase contrast between foreground ({fg}) and background ({bg}) to at least 4.5:1.",
                            )
                        )
                except Exception:
                    pass

        # ── 3. Visual Accessibility: Alt Text Verification ───────────────────────────
        alt_findings = RuleEngine.check_alt_text(revision.alt_text)
        all_draft_findings.extend(alt_findings)

        # ── 4. Vision LLM Findings ───────────────────────────────────────────────────
        raw_findings = vision_result.get("findings", [])
        for vf in raw_findings:
            raw_c = vf.get("category") if isinstance(vf, dict) else getattr(vf, "category", None)
            raw_s = vf.get("severity") if isinstance(vf, dict) else getattr(vf, "severity", None)
            flagged = (vf.get("flagged_excerpt") if isinstance(vf, dict) else getattr(vf, "flagged_excerpt", "")) or "Visual element"
            explanation = (vf.get("explanation") if isinstance(vf, dict) else getattr(vf, "explanation", "")) or ""
            suggestion = (vf.get("suggested_correction") if isinstance(vf, dict) else getattr(vf, "suggested_correction", "")) or ""
            cited_id = vf.get("cited_guideline_id") if isinstance(vf, dict) else getattr(vf, "cited_guideline_id", None)

            cat_str = str(raw_c).upper() if raw_c else ""
            category = cat_str if cat_str in VALID_CATEGORIES else "VISUAL"
            sev_str = str(raw_s).upper() if raw_s else ""
            severity = sev_str if sev_str in VALID_SEVERITIES else "WARNING"

            if cited_id and cited_id in retrieved_map:
                citation = f"{retrieved_map[cited_id].source_document} ({retrieved_map[cited_id].section_reference})"
                valid_cited_id = cited_id
            else:
                valid_cited_id = None
                citation = "No specific guideline matched (model judgement - needs human review)"
                if severity == "CRITICAL":
                    severity = "WARNING"

            # Force CRITICAL severity only if flagged excerpt matches prohibited visual subjects
            if any(cls.matches_subject(s, flagged) for s in effective_prohibited_subjects):
                category = "EVENT_FIT"
                severity = "CRITICAL"

            all_draft_findings.append(
                FindingDraft(
                    category=category,
                    severity=severity,
                    detector_source="VISION_LLM",
                    flagged_excerpt=flagged,
                    explanation=explanation,
                    guideline_citation=citation,
                    suggested_correction=suggestion,
                    cited_chunk_id=valid_cited_id,
                )
            )

        # ── 5. Deterministic Post-Check on Structured Vision Results ─────────────────
        # Inspect structured detected_subjects, prohibited_elements_found, and visible_text.
        # DO NOT scan model summary or explanations to prevent false positives when the model
        # states "no prohibited elements found".
        detected_subjects = [str(s) for s in (vision_result.get("detected_subjects") or [])]
        prohibited_found = [str(p) for p in (vision_result.get("prohibited_elements_found") or [])]
        has_prohibited_flag = vision_result.get("has_prohibited_elements", False)

        detected_banned = set()
        for subject in effective_prohibited_subjects:
            for p in prohibited_found:
                if cls.matches_subject(subject, p):
                    detected_banned.add(subject)
            for s in detected_subjects:
                if cls.matches_subject(subject, s):
                    detected_banned.add(subject)
            for vt in visible_text_list:
                if cls.matches_subject(subject, vt):
                    detected_banned.add(subject)

        if has_prohibited_flag or detected_banned:
            banned_display = ", ".join(sorted(detected_banned)) if detected_banned else "Prohibited Visual Subject"
            guard_citation = None
            if retrieved_chunks:
                for c in retrieved_chunks:
                    if "prohibit" in c.section_reference.lower() or "visual" in c.section_reference.lower():
                        guard_citation = f"{c.source_document} ({c.section_reference})"
                        break
            if not guard_citation:
                if ruleset and ruleset.source_documents:
                    guard_citation = f"{ruleset.source_documents[0]} (Prohibited Visual Elements)"
                else:
                    guard_citation = f"{brand.name} Brand Guidelines (Prohibited Visual Elements)"

            all_draft_findings.append(
                FindingDraft(
                    category="EVENT_FIT",
                    severity="CRITICAL",
                    detector_source="DETERMINISTIC_EVENT_GUARD",
                    flagged_excerpt=banned_display,
                    explanation=(
                        f"Detected prohibited visual subject '{banned_display}' in visual analysis. "
                        f"{brand.name} brand governance policies strictly prohibit these subjects in campaign content. "
                        + (f"Campaign: {effective_event}." if effective_event else "")
                    ),
                    guideline_citation=guard_citation,
                    suggested_correction=(
                        f"Immediately replace with brand-compliant visual adhering to {brand.name} guidelines "
                        + (f"and approved {campaign.name} campaign elements." if campaign else ".")
                    ),
                )
            )

        # ── 6. Dynamic Campaign Minimum Cue Threshold Check ──────────────────────────
        # Count only structured event_cues_detected from the model intersected with required_cues
        if vision_ai_status == 'ok' and campaign and campaign.required_cues and campaign.min_required_cues > 0:
            event_cues = vision_result.get("event_cues_detected") or vision_result.get("diwali_cues_detected") or []
            matched_cues = set()
            for req_cue in campaign.required_cues:
                for ec in event_cues:
                    if cls.matches_subject(req_cue, str(ec)):
                        matched_cues.add(req_cue)

            if len(matched_cues) < campaign.min_required_cues:
                cue_severity = "CRITICAL" if len(matched_cues) == 0 else "WARNING"
                cue_citation = None
                if retrieved_chunks:
                    for c in retrieved_chunks:
                        if "campaign" in c.source_document.lower() or "cue" in c.section_reference.lower() or "visual" in c.section_reference.lower():
                            cue_citation = f"{c.source_document} ({c.section_reference})"
                            break
                if not cue_citation:
                    cue_citation = f"{campaign.name} Campaign Brief (Visual Requirements)"

                all_draft_findings.append(
                    FindingDraft(
                        category="EVENT_FIT",
                        severity=cue_severity,
                        detector_source="DETERMINISTIC_EVENT_GUARD",
                        flagged_excerpt=f"Insufficient Campaign Cues ({len(matched_cues)} found, {campaign.min_required_cues} required)",
                        explanation=(
                            f"Campaign Minimum Cue Threshold Violation: Asset contains {len(matched_cues)} approved cues for '{campaign.name}'. "
                            f"Under {campaign.name} campaign guidelines, visual assets must include at least {campaign.min_required_cues} "
                            f"approved campaign cues ({', '.join(campaign.required_cues[:5])})."
                        ),
                        guideline_citation=cue_citation,
                        suggested_correction=(
                            f"Incorporate at least {campaign.min_required_cues} clear {campaign.name} campaign cues such as "
                            f"{', '.join(campaign.required_cues[:4])} onto the creative canvas."
                        ),
                    )
                )

        # ── 7. Deterministic Checks on Extracted Visible Text ────────────────────────
        if visible_text_list:
            combined_visible_text = " ".join(visible_text_list)
            text_findings = RuleEngine.run_all_deterministic_checks(
                text=combined_visible_text,
                banned_terms=effective_banned_terms,
                preferred_terminology=effective_pref_terms,
                required_phrases=ruleset.required_phrases if ruleset else [],
                exaggeration_terms=ruleset.exaggeration_terms if ruleset else [],
                caption=revision.content_body or "",
                platform=submission.platform,
            )
            all_draft_findings.extend(text_findings)

        if effective_event and not gemini_service.is_available:
            all_draft_findings.append(
                FindingDraft(
                    category="EVENT_FIT",
                    severity="WARNING",
                    detector_source="EVENT_GUARD",
                    flagged_excerpt=f"{effective_event} visual fit could not be verified",
                    explanation=f"The {effective_event} event rule requires visual semantic analysis, but the vision provider is unavailable.",
                    guideline_citation=f"Campaign Brief: {effective_event}",
                    suggested_correction=f"Retry the audit with the vision service enabled and use a clearly {effective_event}-relevant visual.",
                )
            )

        # ── 8. Finding Deduplication ─────────────────────────────────────────────────
        deduped_findings = cls.dedupe_findings(all_draft_findings)

        # ── 9. Calculate Compliance Score and Authoritative Verdict ──────────────────
        score = cls.calculate_compliance_score(deduped_findings)
        verdict, dimension_results = cls.evaluate_verdict_and_dimensions(
            findings=deduped_findings,
            ruleset=ruleset,
            campaign=campaign,
            palette_match_pct=palette_match_pct,
            ai_status=vision_ai_status,
        )

        # If persist=False: return pure in-memory result without mutating submission/revision
        if not persist:
            return {
                "draft_findings": deduped_findings,
                "visible_text": visible_text_list,
                "dominant_colors": dominant_colors,
                "palette_match_pct": palette_match_pct,
                "image_metadata": image_metadata,
                "ai_status": vision_ai_status,
                "ai_error": vision_ai_error,
                "compliance_score": score,
                "verdict": verdict,
                "dimension_results": dimension_results,
            }

        # Mutate revision and submission only when persist=True
        revision.compliance_score = score
        revision.ai_governance_metadata = {
            "visible_text": visible_text_list,
            "dominant_colors": dominant_colors,
            "palette_match_pct": palette_match_pct,
            "image_metadata": image_metadata,
            "findings_count": len(deduped_findings),
            "campaign_event": effective_event,
            "ai_status": vision_ai_status,
            "ai_error": vision_ai_error,
            "verdict": verdict,
            "dimension_results": dimension_results,
        }
        if additional_metadata:
            revision.ai_governance_metadata.update(additional_metadata)
            if "ai_status" in additional_metadata:
                vision_ai_status = additional_metadata["ai_status"]
            if "ai_error" in additional_metadata:
                vision_ai_error = additional_metadata["ai_error"]
        submission.compliance_score = score
        submission.verdict = verdict
        submission.content_format = "IMAGE"

        # Update status - fail closed on AI failure or CRITICAL findings
        if vision_ai_status == "failed":
            submission.status = "NEEDS_REVIEW"
        elif verdict == "FAIL":
            submission.status = "CHANGES_REQUESTED"
        else:
            submission.status = "NEEDS_REVIEW"

        # Idempotent re-audit: clean up existing findings for this revision
        await session.execute(delete(AuditFinding).where(AuditFinding.revision_id == revision.id))

        # Persist findings
        created_finding_records: List[AuditFinding] = []
        for draft in deduped_findings:
            finding = AuditFinding(
                submission_id=submission.id,
                revision_id=revision.id,
                cited_chunk_id=draft.cited_chunk_id,
                category=draft.category,
                severity=draft.severity,
                detector_source=draft.detector_source,
                flagged_excerpt=draft.flagged_excerpt,
                explanation=draft.explanation,
                guideline_citation=draft.guideline_citation,
                suggested_correction=draft.suggested_correction,
                resolution_state="OPEN",
            )
            session.add(finding)
            created_finding_records.append(finding)

        # Log WorkflowEvent
        event = WorkflowEvent(
            submission_id=submission.id,
            actor_id=actor_id,
            actor_name=actor_name,
            actor_role=actor_role,
            event_type="AUDIT_COMPLETED",
            from_status="AUDITING",
            to_status=submission.status,
            notes=f"Image visual audit completed with verdict {verdict} and compliance score {score}%. Generated {len(deduped_findings)} findings.",
            metadata_json={
                "revision_id": revision.id,
                "version_number": revision.version_number,
                "compliance_score": score,
                "verdict": verdict,
                "total_findings": len(deduped_findings),
                "palette_match_pct": palette_match_pct,
            },
        )
        session.add(event)
        await session.commit()

        for f in created_finding_records:
            await session.refresh(f)

        severity_counts = {"CRITICAL": 0, "WARNING": 0, "SUGGESTION": 0}
        for f in created_finding_records:
            if f.severity in severity_counts:
                severity_counts[f.severity] += 1

        return {
            "submission_id": submission.id,
            "revision_id": revision.id,
            "version_number": revision.version_number,
            "compliance_score": score,
            "status": submission.status,
            "verdict": verdict,
            "dimension_results": dimension_results,
            "total_findings": len(created_finding_records),
            "findings_by_severity": severity_counts,
            "findings": created_finding_records,
            "confidentiality_report": {
                "total_redacted": 0,
                "categories_redacted": {},
                "confidentiality_guard_active": False,
            },
            "visible_text": visible_text_list,
            "dominant_colors": dominant_colors,
            "palette_match_pct": palette_match_pct,
            "ai_status": vision_ai_status,
            "ai_error": vision_ai_error,
        }

    @classmethod
    async def run_post_audit(
        cls,
        session: AsyncSession,
        submission: Submission,
        revision: SubmissionRevision,
        image_bytes: bytes,
        mime_type: str,
        caption: str,
        hashtags: Optional[str] = None,
        alt_text: Optional[str] = None,
        platform: str = "instagram",
        actor_id: str = "system_auditor",
        actor_name: str = "Inkloom Governance Engine",
        actor_role: str = "SYSTEM",
        persist: bool = True,
        additional_metadata: Optional[Dict[str, Any]] = None,
        campaign_event: Optional[str] = None,
        campaign_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Audits an Instagram or social post (image + caption + hashtags + alt text) together:
        1. Enforces platform specs (aspect ratios: 1:1, 4:5, 9:16; caption max length 2200; hashtag limits).
        2. Evaluates accessibility (alt-text presence and length).
        3. Audits visual image compliance (palette, contrast, prohibited visuals, event cues).
        4. Audits text copy (banned terms, preferred terminology, required phrases, exaggeration terms, PII).
        5. Computes authoritative verdict and per-dimension scores across all dimensions.
        """
        all_draft_findings: List[FindingDraft] = []
        platform_lower = (platform or "instagram").lower()

        # 1. Platform aspect ratio check
        image_meta = DocumentService.analyze_image(image_bytes)
        w, h = image_meta["width"], image_meta["height"]
        ratio = w / float(h) if h > 0 else 1.0

        if platform_lower == "instagram":
            # Instagram standards: 1:1 (1.0), 4:5 (0.8), 9:16 (0.5625), landscape (1.91)
            valid_ratios = [1.0, 0.8, 0.5625, 1.91]
            matches_platform_ratio = any(abs(ratio - vr) <= 0.06 for vr in valid_ratios)
            if not matches_platform_ratio:
                all_draft_findings.append(
                    FindingDraft(
                        category="VISUAL",
                        severity="WARNING",
                        detector_source="PLATFORM_SPEC_VALIDATOR",
                        flagged_excerpt=f"Aspect ratio {round(ratio, 2)}:1 ({w}x{h})",
                        explanation=(
                            f"Image aspect ratio {round(ratio, 2)}:1 ({w}x{h}) does not match standard Instagram dimensions: "
                            "1:1 (Square, 1080x1080), 4:5 (Portrait, 1080x1350), or 9:16 (Story/Reel, 1080x1920)."
                        ),
                        guideline_citation="Instagram Content Specifications - Aspect Ratios",
                        suggested_correction="Crop or resize canvas to 1:1 (1080x1080) or 4:5 (1080x1350) for optimal feed display.",
                    )
                )

            # Caption length (max 2200 chars for Instagram)
            if len(caption) > 2200:
                all_draft_findings.append(
                    FindingDraft(
                        category="VOICE_TERMINOLOGY",
                        severity="CRITICAL",
                        detector_source="PLATFORM_SPEC_VALIDATOR",
                        flagged_excerpt=f"Caption length {len(caption)} characters",
                        explanation=f"Instagram enforces a strict limit of 2,200 characters per caption. Current caption has {len(caption)} characters.",
                        guideline_citation="Instagram Technical Limits - Caption Length",
                        suggested_correction="Shorten caption to under 2,200 characters (recommended: 125-150 characters for peak engagement).",
                    )
                )

            # Hashtag count (max 30 hashtags for Instagram)
            full_post_text = f"{caption} {hashtags or ''}"
            detected_tags = re.findall(r"#[A-Za-z0-9_]+", full_post_text)
            if len(detected_tags) > 30:
                all_draft_findings.append(
                    FindingDraft(
                        category="VOICE_TERMINOLOGY",
                        severity="CRITICAL",
                        detector_source="PLATFORM_SPEC_VALIDATOR",
                        flagged_excerpt=f"{len(detected_tags)} hashtags detected",
                        explanation=f"Instagram allows a maximum of 30 hashtags per post. Current post includes {len(detected_tags)} hashtags.",
                        guideline_citation="Instagram Technical Limits - Hashtags",
                        suggested_correction="Reduce hashtags to 30 or fewer (recommended: 3-5 high-relevance hashtags).",
                    )
                )

        # 2. Alt text accessibility check
        clean_alt = (alt_text or "").strip()
        if not clean_alt:
            all_draft_findings.append(
                FindingDraft(
                    category="ACCESSIBILITY",
                    severity="CRITICAL",
                    detector_source="ACCESSIBILITY_GUARD",
                    flagged_excerpt="Missing Image Alt Text",
                    explanation="Visual post is missing descriptive alt text, violating WCAG 2.1 guideline 1.1.1 (Non-text Content).",
                    guideline_citation="WCAG 2.1 Guideline 1.1.1 Non-text Content",
                    suggested_correction="Provide concise, descriptive alternative text conveying the key visual elements and messaging.",
                )
            )
        elif len(clean_alt.split()) < 5:
            all_draft_findings.append(
                FindingDraft(
                    category="ACCESSIBILITY",
                    severity="WARNING",
                    detector_source="ACCESSIBILITY_GUARD",
                    flagged_excerpt=f"Alt text: '{clean_alt}'",
                    explanation=f"Image alt text contains only {len(clean_alt.split())} words, which may be insufficient for visually impaired users.",
                    guideline_citation="WCAG 2.1 Guideline 1.1.1 Non-text Content",
                    suggested_correction="Expand alt text with descriptive details (at least 5-10 words describing key visual elements).",
                )
            )

        # 3. Visual image audit (in-memory)
        image_result = await cls.run_image_audit(
            session=session,
            submission=submission,
            revision=revision,
            image_bytes=image_bytes,
            mime_type=mime_type,
            actor_id=actor_id,
            actor_name=actor_name,
            actor_role=actor_role,
            persist=False,
            campaign_event=campaign_event,
            campaign_id=campaign_id,
        )
        all_draft_findings.extend(image_result.get("draft_findings", []))

        # 4. Copy audit on caption + hashtags
        brand_stmt = select(BrandProfile).where(BrandProfile.id == submission.brand_id)
        brand_res = await session.execute(brand_stmt)
        brand = brand_res.scalar_one_or_none()

        campaign, ruleset = await cls.get_active_ruleset_and_campaign(
            session=session,
            brand_id=submission.brand_id,
            campaign_id=campaign_id or submission.campaign_id,
            event_name=campaign_event,
        )

        banned_terms = ruleset.banned_terms if ruleset and ruleset.banned_terms else (brand.banned_terms if brand else [])
        pref_terms = ruleset.preferred_terminology if ruleset and ruleset.preferred_terminology else (brand.preferred_terminology if brand else {})
        req_phrases = ruleset.required_phrases if ruleset and ruleset.required_phrases else []
        exagg_terms = ruleset.exaggeration_terms if ruleset and ruleset.exaggeration_terms else []

        full_copy = f"{caption}\n\n{hashtags}".strip() if hashtags else caption
        copy_findings = RuleEngine.run_all_deterministic_checks(
            text=full_copy,
            banned_terms=banned_terms or [],
            preferred_terminology=pref_terms or {},
            required_phrases=req_phrases or [],
            exaggeration_terms=exagg_terms or [],
            caption=caption,
            platform=platform,
        )
        all_draft_findings.extend(copy_findings)

        # 5. Semantic text check if AI available
        ai_status = image_result.get("ai_status", "ok")
        ai_error = image_result.get("ai_error")
        if gemini_service.is_available and full_copy.strip():
            try:
                retrieved_chunks = await cls.retrieve_relevant_guidelines(
                    session=session,
                    brand_id=submission.brand_id,
                    query_text=f"{full_copy[:200]} {campaign_event or ''}",
                    limit=5,
                    media_type="text",
                    campaign_name=campaign.name if campaign else (campaign_event or ""),
                )
                guidelines_ctx = [
                    {
                        "id": c.id,
                        "source_document": c.source_document,
                        "section_reference": c.section_reference,
                        "content_text": c.content_text,
                    }
                    for c in retrieved_chunks
                ]
                semantic_res = await gemini_service.audit_content_semantic(
                    scrubbed_text=full_copy,
                    tone_persona=brand.tone_persona if brand else "Clear, authoritative, empathetic",
                    guidelines_context=guidelines_ctx,
                    approved_facts=ruleset.approved_facts if ruleset and ruleset.approved_facts else (brand.approved_facts if brand else []),
                    campaign=campaign.__dict__ if campaign else None,
                    ruleset=ruleset.__dict__ if ruleset else None,
                    campaign_event=campaign_event,
                )
                for f in semantic_res.get("findings", []):
                    all_draft_findings.append(
                        FindingDraft(
                            category=f.get("category", "TONE"),
                            severity=f.get("severity", "WARNING"),
                            detector_source="SEMANTIC_LLM",
                            flagged_excerpt=f.get("flagged_excerpt", ""),
                            explanation=f.get("explanation", ""),
                            guideline_citation="Brand Guidelines - Tone & Voice",
                            suggested_correction=f.get("suggested_correction", ""),
                        )
                    )
            except Exception as e:
                logger.warning(f"Semantic copy audit failed: {e}")
                if ai_status == "ok":
                    ai_status = "partial"
                    ai_error = f"Copy semantic analysis skipped: {e}"

        # 6. Deduplication
        deduped_findings = cls.dedupe_findings(all_draft_findings)

        # 7. Verdict and Dimension Evaluation
        score = cls.calculate_compliance_score(deduped_findings)
        verdict, dimension_results = cls.evaluate_verdict_and_dimensions(
            findings=deduped_findings,
            ruleset=ruleset,
            campaign=campaign,
            palette_match_pct=image_result.get("palette_match_pct"),
            ai_status=ai_status,
        )

        if not persist:
            return {
                "draft_findings": deduped_findings,
                "compliance_score": score,
                "verdict": verdict,
                "dimension_results": dimension_results,
                "palette_match_pct": image_result.get("palette_match_pct"),
                "ai_status": ai_status,
                "ai_error": ai_error,
            }

        # 8. Persist results
        submission.content_format = "POST"
        submission.platform = platform
        submission.compliance_score = score
        submission.verdict = verdict
        submission.status = "NEEDS_REVIEW" if (ai_status == "failed" or verdict != "FAIL") else "CHANGES_REQUESTED"

        revision.compliance_score = score
        revision.content_body = full_copy
        revision.alt_text = alt_text
        revision.ai_governance_metadata = {
            "platform": platform,
            "caption": caption,
            "hashtags": hashtags,
            "alt_text": alt_text,
            "image_metadata": image_meta,
            "palette_match_pct": image_result.get("palette_match_pct"),
            "visible_text": image_result.get("visible_text", []),
            "dominant_colors": image_result.get("dominant_colors", []),
            "ai_status": ai_status,
            "ai_error": ai_error,
            "verdict": verdict,
            "dimension_results": dimension_results,
        }
        if additional_metadata:
            revision.ai_governance_metadata.update(additional_metadata)

        await session.execute(delete(AuditFinding).where(AuditFinding.revision_id == revision.id))

        created_finding_records: List[AuditFinding] = []
        for draft in deduped_findings:
            finding = AuditFinding(
                submission_id=submission.id,
                revision_id=revision.id,
                cited_chunk_id=draft.cited_chunk_id,
                category=draft.category,
                severity=draft.severity,
                detector_source=draft.detector_source,
                flagged_excerpt=draft.flagged_excerpt,
                explanation=draft.explanation,
                guideline_citation=draft.guideline_citation,
                suggested_correction=draft.suggested_correction,
                resolution_state="OPEN",
            )
            session.add(finding)
            created_finding_records.append(finding)

        event = WorkflowEvent(
            submission_id=submission.id,
            actor_id=actor_id,
            actor_name=actor_name,
            actor_role=actor_role,
            event_type="AUDIT_COMPLETED",
            from_status="AUDITING",
            to_status=submission.status,
            notes=f"Post audit completed with verdict {verdict} and compliance score {score}%. Generated {len(deduped_findings)} findings.",
            metadata_json={
                "revision_id": revision.id,
                "version_number": revision.version_number,
                "compliance_score": score,
                "verdict": verdict,
                "platform": platform,
            },
        )
        session.add(event)
        await session.commit()

        for f in created_finding_records:
            await session.refresh(f)

        severity_counts = {"CRITICAL": 0, "WARNING": 0, "SUGGESTION": 0}
        for f in created_finding_records:
            if f.severity in severity_counts:
                severity_counts[f.severity] += 1

        return {
            "submission_id": submission.id,
            "revision_id": revision.id,
            "version_number": revision.version_number,
            "compliance_score": score,
            "status": submission.status,
            "verdict": verdict,
            "dimension_results": dimension_results,
            "total_findings": len(created_finding_records),
            "findings_by_severity": severity_counts,
            "findings": created_finding_records,
            "confidentiality_report": {},
            "visible_text": image_result.get("visible_text"),
            "dominant_colors": image_result.get("dominant_colors"),
            "palette_match_pct": image_result.get("palette_match_pct"),
            "ai_status": ai_status,
            "ai_error": ai_error,
        }

    @classmethod
    async def run_audio_audit(
        cls,
        session: AsyncSession,
        submission: Submission,
        revision: SubmissionRevision,
        audio_bytes: bytes,
        mime_type: str,
        actor_id: str = "system_auditor",
        actor_name: str = "Inkloom Governance Engine",
        actor_role: str = "SYSTEM",
        persist: bool = True,
        additional_metadata: Optional[Dict[str, Any]] = None,
        campaign_event: Optional[str] = None,
        campaign_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Natively audits audio using Gemini multimodal analysis:
        Voiceover tone, mandatory phrases, prohibited SFX, background music balance,
        and timestamped findings, plus deterministic text checks on transcript.
        """
        brand_stmt = select(BrandProfile).where(BrandProfile.id == submission.brand_id)
        brand_res = await session.execute(brand_stmt)
        brand = brand_res.scalar_one_or_none()
        brand_name = brand.name if brand else "Brand"

        campaign, ruleset = await cls.get_active_ruleset_and_campaign(
            session=session,
            brand_id=submission.brand_id,
            campaign_id=campaign_id or submission.campaign_id,
            event_name=campaign_event,
        )

        campaign_dict = {
            "name": campaign.name,
            "goals": campaign.goals,
            "prohibited_items": campaign.prohibited_items,
            "required_cues": campaign.required_cues,
        } if campaign else None

        ruleset_dict = {
            "banned_terms": ruleset.banned_terms if ruleset else [],
            "required_phrases": ruleset.required_phrases if ruleset else [],
            "exaggeration_terms": ruleset.exaggeration_terms if ruleset else [],
            "per_media_rules": ruleset.per_media_rules if ruleset else {},
        } if ruleset else None

        all_draft_findings: List[FindingDraft] = []

        # Run native audio analysis
        audio_output = await gemini_service.audit_audio(
            audio_bytes=audio_bytes,
            mime_type=mime_type,
            brand_name=brand_name,
            campaign_info=campaign_dict,
            rule_set=ruleset_dict,
        )

        ai_status = audio_output.get("ai_status", "ok")
        ai_error = audio_output.get("ai_error")
        transcript = audio_output.get("transcript", "")

        if ai_status != "ok":
            all_draft_findings.append(
                FindingDraft(
                    category="SYSTEM",
                    severity="WARNING",
                    detector_source="AI_AUDIO_ENGINE",
                    flagged_excerpt="Audio Analysis Incomplete",
                    explanation=f"AI analysis incomplete: {ai_error or 'Gemini audio service offline'}",
                    guideline_citation="Media Governance Pipeline",
                    suggested_correction="Check audio clarity and retry the upload once service is operational.",
                )
            )
        else:
            # 1. Timestamped findings from Gemini
            for f in audio_output.get("findings", []):
                t_start = f.get("timestamp_start_sec") if isinstance(f, dict) else getattr(f, "timestamp_start_sec", None)
                t_end = f.get("timestamp_end_sec") if isinstance(f, dict) else getattr(f, "timestamp_end_sec", None)
                time_str = f"[{t_start:.1f}s - {t_end:.1f}s] " if (t_start is not None and t_end is not None) else ""
                
                raw_c = (f.get("category") if isinstance(f, dict) else getattr(f, "category", None)) or ""
                raw_cat = str(raw_c).upper()
                if raw_cat in ("AUDIO_SFX", "CAMPAIGN_FIT"):
                    audio_cat = "EVENT_FIT"
                elif raw_cat in VALID_CATEGORIES:
                    audio_cat = raw_cat
                else:
                    audio_cat = "TONE"

                raw_s = (f.get("severity") if isinstance(f, dict) else getattr(f, "severity", None)) or ""
                raw_sev = str(raw_s).upper()
                audio_sev = raw_sev if raw_sev in VALID_SEVERITIES else "WARNING"

                f_exc = (f.get("flagged_excerpt") if isinstance(f, dict) else getattr(f, "flagged_excerpt", "")) or ""
                f_exp = (f.get("explanation") if isinstance(f, dict) else getattr(f, "explanation", "")) or ""
                f_sug = (f.get("suggested_correction") if isinstance(f, dict) else getattr(f, "suggested_correction", "")) or ""

                all_draft_findings.append(
                    FindingDraft(
                        category=audio_cat,
                        severity=audio_sev,
                        detector_source="NATIVE_AUDIO_GEMINI",
                        flagged_excerpt=f"{time_str}{f_exc}",
                        explanation=f_exp,
                        guideline_citation=f"{brand_name} Brand Audio Guidelines",
                        suggested_correction=f_sug,
                    )
                )

            # 2. Check prohibited sound effects
            for sfx in audio_output.get("prohibited_sfx_found", []):
                all_draft_findings.append(
                    FindingDraft(
                        category="EVENT_FIT",
                        severity="CRITICAL",
                        detector_source="NATIVE_AUDIO_SFX_DETECTOR",
                        flagged_excerpt=f"Prohibited SFX: {sfx}",
                        explanation=f"Detected prohibited audio sound effect '{sfx}'. Policy strictly prohibits loud explosions, fireworks, sirens, or disruptive SFX.",
                        guideline_citation=f"{brand_name} Brand Governance Policy - Audio Standards",
                        suggested_correction="Remove or replace prohibited sound effects with approved background ambience.",
                    )
                )

            # 3. Check mandatory brand phrases missing
            for phrase in audio_output.get("required_phrases_missing", []):
                all_draft_findings.append(
                    FindingDraft(
                        category="VOICE_TERMINOLOGY",
                        severity="CRITICAL",
                        detector_source="NATIVE_AUDIO_PHRASE_DETECTOR",
                        flagged_excerpt=f"Missing required phrase: '{phrase}'",
                        explanation=f"Voiceover failed to include mandatory brand phrase '{phrase}' required by brand guidelines.",
                        guideline_citation=f"{brand_name} Brand Guidelines - Mandatory Copy",
                        suggested_correction=f"Include '{phrase}' clearly in the voiceover dialogue.",
                    )
                )

            # 4. Check voiceover tone
            if audio_output.get("voiceover_tone_acceptable") is False:
                all_draft_findings.append(
                    FindingDraft(
                        category="TONE",
                        severity="WARNING",
                        detector_source="NATIVE_AUDIO_TONE_DETECTOR",
                        flagged_excerpt=f"Voiceover Tone: {audio_output.get('voiceover_tone', 'Disallowed')}",
                        explanation=f"Voiceover delivery does not align with brand voice personality: {audio_output.get('voiceover_tone')}.",
                        guideline_citation=f"{brand_name} Brand Guidelines - Tone of Voice",
                        suggested_correction="Re-record voiceover using a warm, engaging, and friendly delivery pace.",
                    )
                )

            # 5. Deterministic text checks on transcript
            if transcript.strip():
                text_findings = RuleEngine.run_all_deterministic_checks(
                    text=transcript,
                    banned_terms=ruleset.banned_terms if ruleset and ruleset.banned_terms else (brand.banned_terms if brand else []),
                    preferred_terminology=ruleset.preferred_terminology if ruleset and ruleset.preferred_terminology else (brand.preferred_terminology if brand else {}),
                    required_phrases=ruleset.required_phrases if ruleset else [],
                    exaggeration_terms=ruleset.exaggeration_terms if ruleset else [],
                )
                all_draft_findings.extend(text_findings)

        # Deduplication
        deduped_findings = cls.dedupe_findings(all_draft_findings)

        score = cls.calculate_compliance_score(deduped_findings)
        verdict, dimension_results = cls.evaluate_verdict_and_dimensions(
            findings=deduped_findings,
            ruleset=ruleset,
            campaign=campaign,
            palette_match_pct=None,
            ai_status=ai_status,
        )

        if not persist:
            return {
                "draft_findings": deduped_findings,
                "transcript": transcript,
                "compliance_score": score,
                "verdict": verdict,
                "dimension_results": dimension_results,
                "ai_status": ai_status,
                "ai_error": ai_error,
            }

        submission.content_format = "AUDIO"
        submission.compliance_score = score
        submission.verdict = verdict
        submission.status = "NEEDS_REVIEW" if (ai_status == "failed" or verdict != "FAIL") else "CHANGES_REQUESTED"

        revision.compliance_score = score
        revision.content_body = transcript
        revision.ai_governance_metadata = {
            "transcript": transcript,
            "voiceover_tone": audio_output.get("voiceover_tone"),
            "detected_sound_effects": audio_output.get("detected_sound_effects", []),
            "background_music_assessment": audio_output.get("background_music_assessment"),
            "ai_status": ai_status,
            "ai_error": ai_error,
            "verdict": verdict,
            "dimension_results": dimension_results,
        }
        if additional_metadata:
            revision.ai_governance_metadata.update(additional_metadata)

        await session.execute(delete(AuditFinding).where(AuditFinding.revision_id == revision.id))

        created_finding_records: List[AuditFinding] = []
        for draft in deduped_findings:
            finding = AuditFinding(
                submission_id=submission.id,
                revision_id=revision.id,
                cited_chunk_id=draft.cited_chunk_id,
                category=draft.category,
                severity=draft.severity,
                detector_source=draft.detector_source,
                flagged_excerpt=draft.flagged_excerpt,
                explanation=draft.explanation,
                guideline_citation=draft.guideline_citation,
                suggested_correction=draft.suggested_correction,
                resolution_state="OPEN",
            )
            session.add(finding)
            created_finding_records.append(finding)

        event = WorkflowEvent(
            submission_id=submission.id,
            actor_id=actor_id,
            actor_name=actor_name,
            actor_role=actor_role,
            event_type="AUDIT_COMPLETED",
            from_status="AUDITING",
            to_status=submission.status,
            notes=f"Native audio audit completed with verdict {verdict} and compliance score {score}%. Generated {len(deduped_findings)} findings.",
            metadata_json={
                "revision_id": revision.id,
                "version_number": revision.version_number,
                "compliance_score": score,
                "verdict": verdict,
            },
        )
        session.add(event)
        await session.commit()

        for f in created_finding_records:
            await session.refresh(f)

        severity_counts = {"CRITICAL": 0, "WARNING": 0, "SUGGESTION": 0}
        for f in created_finding_records:
            if f.severity in severity_counts:
                severity_counts[f.severity] += 1

        return {
            "submission_id": submission.id,
            "revision_id": revision.id,
            "version_number": revision.version_number,
            "compliance_score": score,
            "status": submission.status,
            "verdict": verdict,
            "dimension_results": dimension_results,
            "total_findings": len(created_finding_records),
            "findings_by_severity": severity_counts,
            "findings": created_finding_records,
            "confidentiality_report": {},
            "transcript": transcript,
            "ai_status": ai_status,
            "ai_error": ai_error,
        }

    @classmethod
    async def run_video_audit(
        cls,
        session: AsyncSession,
        submission: Submission,
        revision: SubmissionRevision,
        video_bytes: bytes,
        mime_type: str,
        public_id: Optional[str] = None,
        duration_seconds: Optional[float] = None,
        actor_id: str = "system_auditor",
        actor_name: str = "Inkloom Governance Engine",
        actor_role: str = "SYSTEM",
        persist: bool = True,
        additional_metadata: Optional[Dict[str, Any]] = None,
        campaign_event: Optional[str] = None,
        campaign_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Audits video media pipeline:
        1. Frame extraction per order in VERIFIED ENVIRONMENT FACTS:
           Cloudinary frames first -> local ffmpeg if available -> empty list.
           Never crashes if ffmpeg is missing.
        2. Parallel audit of up to 8 extracted frames with concurrency limit (asyncio.Semaphore(4)).
        3. End-card palette verification on final frame.
        4. Audio/dialogue track transcription via Gemini.
        5. Accessibility checks (burnt-in captions vs dialogue).
        6. Combines findings and computes authoritative verdict.
        """
        all_draft_findings: List[FindingDraft] = []
        ai_status = "ok"
        ai_error = None

        brand_stmt = select(BrandProfile).where(BrandProfile.id == submission.brand_id)
        brand_res = await session.execute(brand_stmt)
        brand = brand_res.scalar_one_or_none()

        campaign, ruleset = await cls.get_active_ruleset_and_campaign(
            session=session,
            brand_id=submission.brand_id,
            campaign_id=campaign_id or submission.campaign_id,
            event_name=campaign_event,
        )

        # 1. Transcribe dialogue from video
        transcript = ""
        try:
            transcript = await gemini_service.transcribe_video(video_bytes=video_bytes, mime_type=mime_type)
        except Exception as e:
            logger.warning(f"Video transcription failed: {e}")
            ai_status = "partial"
            ai_error = f"Dialogue transcription failed: {e}"

        # 2. Extract frames (Cloudinary -> ffmpeg -> empty list)
        frames = await cloudinary_service.extract_video_frames(
            video_bytes=video_bytes,
            public_id=public_id,
            duration_seconds=duration_seconds,
            max_frames=8,
        )

        frame_reports: List[Dict[str, Any]] = []
        visible_texts: List[str] = []
        dominant_colors: List[str] = []
        palette_match_scores: List[float] = []

        if not frames:
            # Environment rule: if neither Cloudinary nor ffmpeg worked, ai_status=partial with visible finding
            ai_status = "partial"
            all_draft_findings.append(
                FindingDraft(
                    category="VISUAL",
                    severity="WARNING",
                    detector_source="MEDIA_FRAME_EXTRACTION",
                    flagged_excerpt="video visuals not analysed",
                    explanation=(
                        "Video frame extraction unavailable: Cloudinary frames could not be retrieved "
                        "and local ffmpeg is not installed. Visual governance checks could not be performed."
                    ),
                    guideline_citation="Media Governance Pipeline - Video Frame Extraction",
                    suggested_correction="Configure Cloudinary credentials or install ffmpeg to enable visual frame analysis.",
                )
            )
        else:
            # Audit frames in parallel with concurrency limit 4
            sem = asyncio.Semaphore(4)
            from app.core.database import AsyncSessionLocal

            async def _audit_single_frame(f_item: Dict[str, Any]):
                async with sem:
                    async with AsyncSessionLocal() as frame_sess:
                        return await cls.run_image_audit(
                            session=frame_sess,
                            submission=submission,
                            revision=revision,
                            image_bytes=f_item["bytes"],
                            mime_type="image/jpeg",
                            actor_id=actor_id,
                            actor_name=actor_name,
                            actor_role=actor_role,
                            persist=False,
                            campaign_event=campaign_event,
                            campaign_id=campaign_id,
                        )

            tasks = [_audit_single_frame(f) for f in frames]
            frame_results = await asyncio.gather(*tasks, return_exceptions=True)

            for idx, f_item in enumerate(frames):
                res = frame_results[idx]
                if isinstance(res, Exception):
                    logger.warning(f"Frame audit failed at {f_item['timestamp_seconds']}s: {res}")
                    continue
                # Add timestamp to frame findings for clear evidence
                ts = f_item.get("timestamp_seconds", 0.0)
                for fd in res.get("draft_findings", []):
                    time_tagged_excerpt = f"[{ts:.1f}s] {fd.flagged_excerpt}"
                    all_draft_findings.append(
                        FindingDraft(
                            category=fd.category,
                            severity=fd.severity,
                            detector_source=fd.detector_source,
                            flagged_excerpt=time_tagged_excerpt,
                            explanation=f"Frame at {ts:.1f}s: {fd.explanation}",
                            guideline_citation=fd.guideline_citation,
                            suggested_correction=fd.suggested_correction,
                            cited_chunk_id=fd.cited_chunk_id,
                        )
                    )
                visible_texts.extend(res.get("visible_text", []))
                dominant_colors.extend(res.get("dominant_colors", []))
                if res.get("palette_match_pct") is not None:
                    palette_match_scores.append(float(res["palette_match_pct"]))

                frame_reports.append(
                    {
                        "timestamp_seconds": ts,
                        "url": f_item.get("url"),
                        "findings_count": len(res.get("draft_findings", [])),
                        "palette_match_pct": res.get("palette_match_pct"),
                    }
                )

            # 3. Check End-card Palette Match
            if frame_reports:
                last_frame_rep = max(frame_reports, key=lambda fr: fr["timestamp_seconds"])
                end_card_score = last_frame_rep.get("palette_match_pct")
                if end_card_score is not None and end_card_score < 70.0:
                    all_draft_findings.append(
                        FindingDraft(
                            category="VISUAL",
                            severity="WARNING",
                            detector_source="VIDEO_END_CARD_DETECTOR",
                            flagged_excerpt=f"End card at {last_frame_rep['timestamp_seconds']:.1f}s (palette match {round(end_card_score, 1)}%)",
                            explanation=(
                                f"Video end-card does not adhere to approved brand palette ({round(end_card_score, 1)}% match). "
                                "Commercials and promotional videos must end with brand-compliant identity."
                            ),
                            guideline_citation="Brand Visual Identity Standards - End Cards",
                            suggested_correction="Ensure the concluding end-card lockup features approved brand colors.",
                        )
                    )

            # 4. Check burnt-in captions
            if transcript.strip() and len(transcript.strip()) > 30 and len(visible_texts) == 0:
                all_draft_findings.append(
                    FindingDraft(
                        category="ACCESSIBILITY",
                        severity="SUGGESTION",
                        detector_source="BURNT_IN_CAPTIONS_DETECTOR",
                        flagged_excerpt="Video lacks burnt-in captions",
                        explanation="Spoken dialogue was detected in video audio, but no visible on-screen subtitles were found across frames.",
                        guideline_citation="Media Governance Pipeline - Accessibility",
                        suggested_correction="Burn in subtitles or captions for dialogue to support muted mobile feeds and hearing-impaired users.",
                    )
                )

        # 5. Deterministic checks on transcript
        if transcript.strip():
            dialogue_findings = RuleEngine.run_all_deterministic_checks(
                text=transcript,
                banned_terms=ruleset.banned_terms if ruleset and ruleset.banned_terms else (brand.banned_terms if brand else []),
                preferred_terminology=ruleset.preferred_terminology if ruleset and ruleset.preferred_terminology else (brand.preferred_terminology if brand else {}),
                required_phrases=ruleset.required_phrases if ruleset else [],
                exaggeration_terms=ruleset.exaggeration_terms if ruleset else [],
            )
            all_draft_findings.extend(dialogue_findings)

        # Deduplication
        deduped_findings = cls.dedupe_findings(all_draft_findings)

        avg_palette = (sum(palette_match_scores) / len(palette_match_scores)) if palette_match_scores else None
        score = cls.calculate_compliance_score(deduped_findings)
        verdict, dimension_results = cls.evaluate_verdict_and_dimensions(
            findings=deduped_findings,
            ruleset=ruleset,
            campaign=campaign,
            palette_match_pct=avg_palette,
            ai_status=ai_status,
        )

        if not persist:
            return {
                "draft_findings": deduped_findings,
                "transcript": transcript,
                "frames": frame_reports,
                "compliance_score": score,
                "verdict": verdict,
                "dimension_results": dimension_results,
                "palette_match_pct": avg_palette,
                "ai_status": ai_status,
                "ai_error": ai_error,
            }

        submission.content_format = "VIDEO"
        submission.compliance_score = score
        submission.verdict = verdict
        submission.status = "NEEDS_REVIEW" if (ai_status == "failed" or verdict != "FAIL") else "CHANGES_REQUESTED"

        revision.compliance_score = score
        revision.content_body = transcript
        revision.ai_governance_metadata = {
            "transcript": transcript,
            "visual_frame_count": len(frames),
            "visual_frames": frame_reports,
            "visual_visible_text": sorted(set(visible_texts)),
            "visual_dominant_colors": sorted(set(dominant_colors)),
            "palette_match_pct": avg_palette,
            "ai_status": ai_status,
            "ai_error": ai_error,
            "verdict": verdict,
            "dimension_results": dimension_results,
        }
        if additional_metadata:
            revision.ai_governance_metadata.update(additional_metadata)

        await session.execute(delete(AuditFinding).where(AuditFinding.revision_id == revision.id))

        created_finding_records: List[AuditFinding] = []
        for draft in deduped_findings:
            finding = AuditFinding(
                submission_id=submission.id,
                revision_id=revision.id,
                cited_chunk_id=draft.cited_chunk_id,
                category=draft.category,
                severity=draft.severity,
                detector_source=draft.detector_source,
                flagged_excerpt=draft.flagged_excerpt,
                explanation=draft.explanation,
                guideline_citation=draft.guideline_citation,
                suggested_correction=draft.suggested_correction,
                resolution_state="OPEN",
            )
            session.add(finding)
            created_finding_records.append(finding)

        event = WorkflowEvent(
            submission_id=submission.id,
            actor_id=actor_id,
            actor_name=actor_name,
            actor_role=actor_role,
            event_type="AUDIT_COMPLETED",
            from_status="AUDITING",
            to_status=submission.status,
            notes=f"Video multi-modal audit completed with verdict {verdict} and compliance score {score}%. Generated {len(deduped_findings)} findings.",
            metadata_json={
                "revision_id": revision.id,
                "version_number": revision.version_number,
                "compliance_score": score,
                "verdict": verdict,
                "visual_frame_count": len(frames),
            },
        )
        session.add(event)
        await session.commit()

        for f in created_finding_records:
            await session.refresh(f)

        severity_counts = {"CRITICAL": 0, "WARNING": 0, "SUGGESTION": 0}
        for f in created_finding_records:
            if f.severity in severity_counts:
                severity_counts[f.severity] += 1

        return {
            "submission_id": submission.id,
            "revision_id": revision.id,
            "version_number": revision.version_number,
            "compliance_score": score,
            "status": submission.status,
            "verdict": verdict,
            "dimension_results": dimension_results,
            "total_findings": len(created_finding_records),
            "findings_by_severity": severity_counts,
            "findings": created_finding_records,
            "confidentiality_report": {},
            "transcript": transcript,
            "visible_text": sorted(set(visible_texts)),
            "dominant_colors": sorted(set(dominant_colors)),
            "palette_match_pct": avg_palette,
            "ai_status": ai_status,
            "ai_error": ai_error,
        }



