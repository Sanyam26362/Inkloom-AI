import logging
from typing import List, Dict, Any, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.brand import BrandProfile
from app.models.guideline_chunk import GuidelineChunk
from app.models.submission import Submission, SubmissionRevision
from app.models.finding import AuditFinding
from app.models.workflow import WorkflowEvent
from app.core.pii_scrubber import ConfidentialityScrubber
from app.services.rule_engine import RuleEngine, FindingDraft
from app.services.document_service import DocumentService
from app.services.gemini_service import gemini_service

logger = logging.getLogger(__name__)


class AuditService:
    """Orchestrates deterministic rule execution, RAG guideline retrieval, and semantic AI auditing."""

    @classmethod
    async def retrieve_relevant_guidelines(
        cls, session: AsyncSession, brand_id: int, query_text: str, limit: int = 5
    ) -> List[GuidelineChunk]:
        """Retrieves top-k relevant guideline chunks using pgvector cosine distance."""
        embedding = await gemini_service.generate_embedding(query_text, task_type="RETRIEVAL_QUERY")
        if embedding:
            stmt = (
                select(GuidelineChunk)
                .where(GuidelineChunk.brand_id == brand_id)
                .where(GuidelineChunk.embedding.isnot(None))
                .order_by(GuidelineChunk.embedding.cosine_distance(embedding))
                .limit(limit)
            )
            result = await session.execute(stmt)
            chunks = list(result.scalars().all())
            if chunks:
                # Increment times_triggered counter for governance analytics
                for chunk in chunks:
                    chunk.times_triggered += 1
                await session.flush()
                return chunks

        # Fallback to recent guidelines if embedding is unavailable
        fallback_stmt = (
            select(GuidelineChunk)
            .where(GuidelineChunk.brand_id == brand_id)
            .limit(limit)
        )
        res = await session.execute(fallback_stmt)
        return list(res.scalars().all())

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
        actor_id: str = "system_auditor",
        actor_name: str = "Inkloom Governance Engine",
        actor_role: str = "SYSTEM",
        additional_findings: Optional[List[FindingDraft]] = None,
        additional_metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Runs complete governance audit on a submission revision:
        1. PII Scrubbing
        2. Deterministic Rule Matching (banned terms, preferred terminology)
        3. RAG Guideline Retrieval (pgvector)
        4. Semantic LLM Analysis (Gemini)
        5. Finding Deduplication and Score Calculation
        6. DB Persistence
        """
        # Fetch brand profile
        brand_stmt = select(BrandProfile).where(BrandProfile.id == submission.brand_id)
        brand_res = await session.execute(brand_stmt)
        brand = brand_res.scalar_one_or_none()
        if not brand:
            raise ValueError(f"BrandProfile with id {submission.brand_id} not found")

        content = revision.content_body or ""
        all_draft_findings: List[FindingDraft] = []

        # 1. Deterministic Rule Engine (in-memory, immediate)
        deterministic_findings = RuleEngine.run_all_deterministic_checks(
            text=content,
            banned_terms=brand.banned_terms or [],
            preferred_terminology=brand.preferred_terminology or {},
        )
        all_draft_findings.extend(deterministic_findings)

        # 2. PII / Confidentiality Scrubbing before external calls
        scrubbed_text, restore_map, pii_disclosure = ConfidentialityScrubber.scrub(content)

        # 3. Retrieve relevant guidelines via pgvector
        retrieved_chunks = await cls.retrieve_relevant_guidelines(
            session=session,
            brand_id=brand.id,
            query_text=content[:500] if content else "general guidelines",
            limit=5,
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

        if scrubbed_text.strip():
            if gemini_service.is_available:
                try:
                    ai_result = await gemini_service.audit_content_semantic(
                        scrubbed_text=scrubbed_text,
                        tone_persona=brand.tone_persona or "",
                        guidelines_context=guidelines_context,
                        approved_facts=brand.approved_facts or [],
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

                for af in ai_findings_raw:
                    flagged = af.get("flagged_excerpt", "")
                    suggestion = af.get("suggested_correction", "")
                    explanation = af.get("explanation", "")
                    category = af.get("category", "TONE").upper()
                    severity = af.get("severity", "WARNING").upper()
                    cited_id = af.get("cited_guideline_id")

                    # Restore any scrubbed tokens in suggestions
                    restored_flagged = ConfidentialityScrubber.restore(flagged, restore_map)
                    restored_suggestion = ConfidentialityScrubber.restore(suggestion, restore_map)

                    citation = "Brand Tone & Style Persona"
                    if cited_id and cited_id in retrieved_map:
                        citation = f"{retrieved_map[cited_id].source_document} ({retrieved_map[cited_id].section_reference})"

                    all_draft_findings.append(
                        FindingDraft(
                            category=category,
                            severity=severity,
                            detector_source="RAG_LLM",
                            flagged_excerpt=restored_flagged,
                            explanation=explanation,
                            guideline_citation=citation,
                            suggested_correction=restored_suggestion,
                            cited_chunk_id=cited_id if cited_id in retrieved_map else None,
                        )
                    )
            else:
                ai_status = "failed"
                ai_error = "Gemini AI service is offline or unconfigured."

        # Fail closed: when any AI step fails or is unavailable, add visible WARNING finding
        if ai_status == "failed":
            all_draft_findings.append(
                FindingDraft(
                    category="ACCESSIBILITY",
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

        # 5. Deduplicate findings (avoid duplicate reports for identical excerpt & category)
        seen_keys = set()
        deduped_findings: List[FindingDraft] = []
        for f in all_draft_findings:
            key = (f.category, f.flagged_excerpt.strip().lower())
            if key not in seen_keys:
                seen_keys.add(key)
                deduped_findings.append(f)

        # 6. Calculate score
        score = cls.calculate_compliance_score(deduped_findings)
        revision.compliance_score = score
        revision.ai_governance_metadata = {
            "pii_disclosure": pii_disclosure,
            "retrieved_guidelines_count": len(retrieved_chunks),
            "findings_count": len(deduped_findings),
            "ai_status": ai_status,
            "ai_error": ai_error,
        }
        if additional_metadata:
            revision.ai_governance_metadata.update(additional_metadata)
            if "ai_status" in additional_metadata:
                ai_status = additional_metadata["ai_status"]
            if "ai_error" in additional_metadata:
                ai_error = additional_metadata["ai_error"]
        submission.compliance_score = score

        # Update submission status - fail closed to NEEDS_REVIEW if AI step failed
        if ai_status == "failed":
            submission.status = "NEEDS_REVIEW"
        elif score == 100.0:
            submission.status = "NEEDS_REVIEW"
        else:
            submission.status = "CHANGES_REQUESTED" if any(f.severity == "CRITICAL" for f in deduped_findings) else "NEEDS_REVIEW"

        # 7. Persist AuditFinding records
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
            notes=f"Audit completed with compliance score {score}%. Generated {len(deduped_findings)} findings.",
            metadata_json={
                "revision_id": revision.id,
                "version_number": revision.version_number,
                "compliance_score": score,
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
    ) -> Dict[str, Any]:
        """
        Runs visual brand governance audit on an uploaded image revision:
        1. Brand Profile & Visual Context Fetch
        2. RAG Guideline Retrieval
        3. Multimodal Vision Analysis via Gemini
        4. Deterministic checks on any visible text
        5. Finding Deduplication and Compliance Score Calculation
        6. DB Persistence of Findings & Audit Trail Event
        """
        brand_stmt = select(BrandProfile).where(BrandProfile.id == submission.brand_id)
        brand_res = await session.execute(brand_stmt)
        brand = brand_res.scalar_one_or_none()
        if not brand:
            raise ValueError(f"BrandProfile with id {submission.brand_id} not found")

        image_metadata = DocumentService.analyze_image(image_bytes)

        # Retrieve visual and accessibility guidelines
        retrieved_chunks = await cls.retrieve_relevant_guidelines(
            session=session,
            brand_id=brand.id,
            query_text=(
                "visual brand identity colors accessibility contrast typography logo imagery "
                f"{campaign_event or ''} event fit safety"
            ),
            limit=5,
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

        # ── Pre-check: deterministic banned visual subject scan ───────────────────────
        # These keywords are always CRITICAL for brand campaigns, regardless of what the
        # vision model says. This prevents the AI from silently approving off-brand content.
        BANNED_VISUAL_SUBJECTS = [
            "spiderman", "spider-man", "spider man",
            "batman", "superman", "iron man", "ironman", "thor", "captain america",
            "hulk", "avengers", "marvel", "dc comics", "wonder woman", "aquaman",
            "wolverine", "deadpool", "black panther", "x-men", "xmen",
            "cartoon", "anime", "animated character", "fictional character",
            "movie character", "superhero", "supervillain", "comic book",
        ]

        # Also scan the submission title and any media alt-text for keyword hints
        scan_targets = [
            (revision.content_body or "").lower(),
            (revision.alt_text or "").lower(),
            (submission.title or "").lower(),
        ]
        for scan_text in scan_targets:
            for subject in BANNED_VISUAL_SUBJECTS:
                if subject in scan_text:
                    all_draft_findings.append(
                        FindingDraft(
                            category="EVENT_FIT",
                            severity="CRITICAL",
                            detector_source="DETERMINISTIC_RULE",
                            flagged_excerpt=subject,
                            explanation=(
                                f"Detected banned visual subject '{subject}' in submission metadata. "
                                "Brand campaigns must not feature superheroes, cartoon characters, or fictional characters. "
                                f"Campaign event: {campaign_event or 'General'}"
                            ),
                            guideline_citation="Brand Governance Policy - Prohibited Visual Subjects",
                            suggested_correction=(
                                "Replace with brand-appropriate visuals relevant to the campaign event. "
                                "Use authentic brand photography or approved illustration styles."
                            ),
                        )
                    )
                    break  # One finding per source is enough

        try:
            vision_result = await gemini_service.audit_image_semantic(
                image_bytes=image_bytes,
                mime_type=mime_type,
                tone_persona=brand.tone_persona or "",
                approved_hex_palette=brand.approved_hex_palette or [],
                approved_facts=brand.approved_facts or [],
                banned_terms=brand.banned_terms or [],
                guidelines_context=guidelines_context,
                campaign_event=campaign_event,
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
        if vision_ai_status == "failed":
            all_draft_findings.append(
                FindingDraft(
                    category="VISUAL",
                    severity="WARNING",
                    detector_source="AI_VISION_ENGINE",
                    flagged_excerpt="AI Visual Analysis Incomplete",
                    explanation=f"AI analysis incomplete: {vision_ai_error or 'Vision service unavailable'}",
                    guideline_citation="Brand Visual Reliability Policy",
                    suggested_correction="Ensure visual asset is accessible and retry the audit.",
                )
            )

        visible_text_list = vision_result.get("visible_text", [])
        # Prefer the local pixel analysis for colors. Model-described colors are useful
        # context, but cannot replace deterministic evidence from the uploaded file.
        local_dominant_colors = image_metadata.get("dominant_hex_colors", [])
        model_dominant_colors = vision_result.get("dominant_colors", []) or []
        dominant_colors = local_dominant_colors or model_dominant_colors

        model_palette_match: Optional[float] = None
        raw_palette_match = vision_result.get("palette_match_pct")
        if raw_palette_match is not None:
            try:
                model_palette_match = float(raw_palette_match)
            except (TypeError, ValueError):
                model_palette_match = None

        local_palette_match = cls.calculate_palette_match(
            observed_colors=local_dominant_colors or model_dominant_colors,
            approved_colors=brand.approved_hex_palette or [],
        )

        # Use the more conservative result if the model and local analysis disagree.
        # This prevents a failed/uncertain model call from producing a false 100% score.
        if local_palette_match is not None and model_palette_match is not None:
            palette_match_pct = min(local_palette_match, model_palette_match)
        elif local_palette_match is not None:
            palette_match_pct = local_palette_match
        elif model_palette_match is not None:
            palette_match_pct = model_palette_match
        else:
            palette_match_pct = 0.0

        if local_palette_match is not None and local_palette_match < 80:
            all_draft_findings.append(
                FindingDraft(
                    category="VISUAL",
                    severity="WARNING",
                    detector_source="DETERMINISTIC_RULE",
                    flagged_excerpt=", ".join(dominant_colors[:3]),
                    explanation="The extracted dominant colors are not sufficiently aligned with the approved Blinkit palette.",
                    guideline_citation="Blinkit Visual Identity Standards 2024.pdf (Section 3: Color Usage & WCAG Compliance)",
                    suggested_correction="Rework the creative around Blinkit Yellow (#F8C200), Dark Charcoal (#1C1C1E), and approved supporting colors.",
                )
            )
        raw_findings = vision_result.get("findings", [])

        # Add vision findings
        for vf in raw_findings:
            category = vf.get("category", "VISUAL").upper()
            severity = vf.get("severity", "WARNING").upper()
            flagged = vf.get("flagged_excerpt", "Visual element")
            explanation = vf.get("explanation", "")
            suggestion = vf.get("suggested_correction", "")
            cited_id = vf.get("cited_guideline_id")

            # Force CRITICAL severity if finding relates to superheroes or prohibited characters
            lower_flag = (flagged + " " + explanation).lower()
            if any(s in lower_flag for s in ["spiderman", "spider-man", "superhero", "batman", "marvel", "cartoon"]):
                category = "EVENT_FIT"
                severity = "CRITICAL"

            citation = "Brand Visual Identity Guidelines"
            if cited_id and cited_id in retrieved_map:
                citation = f"{retrieved_map[cited_id].source_document} ({retrieved_map[cited_id].section_reference})"

            all_draft_findings.append(
                FindingDraft(
                    category=category,
                    severity=severity,
                    detector_source="VISION_LLM",
                    flagged_excerpt=flagged,
                    explanation=explanation,
                    guideline_citation=citation,
                    suggested_correction=suggestion,
                    cited_chunk_id=cited_id if cited_id in retrieved_map else None,
                )
            )

        # ── Deterministic Post-Check on Vision Results ──────────────────────────────
        # Inspect overall_summary, detected_subjects, and visible text to prevent any
        # superhero or prohibited character from slipping through as compliant.
        model_summary = (vision_result.get("overall_summary") or "").lower()
        detected_subjects = [str(s).lower() for s in (vision_result.get("detected_subjects") or [])]
        prohibited_found = [str(p).lower() for p in (vision_result.get("prohibited_elements_found") or [])]
        findings_text = " ".join([
            (f.get("explanation") or "") + " " + (f.get("flagged_excerpt") or "")
            for f in raw_findings
        ]).lower()
        visible_text_str = " ".join(visible_text_list).lower()
        combined_vision_text = f"{model_summary} {' '.join(detected_subjects)} {' '.join(prohibited_found)} {findings_text} {visible_text_str}"

        has_prohibited_flag = vision_result.get("has_prohibited_elements", False)
        detected_banned = []
        for subject in BANNED_VISUAL_SUBJECTS:
            if subject in combined_vision_text:
                detected_banned.append(subject)

        if has_prohibited_flag or detected_banned:
            banned_display = ", ".join(set(detected_banned)) if detected_banned else "Spider-Man / Superhero Character"
            all_draft_findings.append(
                FindingDraft(
                    category="EVENT_FIT",
                    severity="CRITICAL",
                    detector_source="DETERMINISTIC_EVENT_GUARD",
                    flagged_excerpt=banned_display,
                    explanation=(
                        f"Detected prohibited character/visual subject '{banned_display}' in visual analysis. "
                        "Blinkit Brand Governance & Compliance Guidelines (Section 4: Prohibited Visual Elements, Rule 7) "
                        "strictly prohibit all copyrighted characters (Spider-Man, Iron Man, Mickey Mouse, etc.) and fictional superheroes. "
                        f"Campaign event: {campaign_event or 'Diwali 2026'}. This is an immediate FAIL violation."
                    ),
                    guideline_citation="Blinkit Diwali 2026 Brand Guidelines (Section 4: Prohibited Visual Elements, Rule 7)",
                    suggested_correction=(
                        "Immediately replace with brand-compliant visual featuring approved Diwali elements "
                        "(diyas, rangoli, marigold flowers, festive sweets, gift hampers) and Blinkit Yellow (#F8C200) / Charcoal (#1C1C1E)."
                    ),
                )
            )

        # Diwali Minimum Cue Threshold Check (Section 3: at least 2 Diwali cues required; 0 cues = automatic FAIL)
        event_lower = (campaign_event or "").lower()
        is_diwali = "diwali" in event_lower or "deepavali" in event_lower or not campaign_event
        if is_diwali:
            diwali_cues = vision_result.get("diwali_cues_detected") or []
            diwali_keywords = ["diya", "diyas", "lamp", "rangoli", "marigold", "toran", "festive lights", "fairy lights", "mithai", "sweets", "laddoo", "gift", "hamper", "deepavali", "diwali"]
            found_cues_in_text = [k for k in diwali_keywords if k in combined_vision_text]
            total_cues = len(diwali_cues) + len(found_cues_in_text)

            if total_cues == 0:
                all_draft_findings.append(
                    FindingDraft(
                        category="EVENT_FIT",
                        severity="CRITICAL",
                        detector_source="DETERMINISTIC_EVENT_GUARD",
                        flagged_excerpt="Zero Diwali Festive Cues",
                        explanation=(
                            "Diwali Minimum Cue Threshold Violation: Asset contains 0 approved Diwali festive cues. "
                            "Under Section 3 of Blinkit Diwali Brand Guidelines, every visual asset must include at least two (2) "
                            "clear festive cues (diyas, rangoli, marigold flowers, festive lights, lanterns, sweets, gift boxes, or festive headline). "
                            "Zero cues triggers an automatic FAIL."
                        ),
                        guideline_citation="Blinkit Diwali 2026 Brand Guidelines (Section 3: Diwali Visual Requirements)",
                        suggested_correction=(
                            "Incorporate at least two clear Diwali festive cues such as clay diyas, festive sweets (mithai), "
                            "marigold garlands, or a festive headline ('Happy Diwali') onto the Blinkit canvas."
                        ),
                    )
                )

        # Deterministic checks on visible text
        if visible_text_list:
            combined_visible_text = " ".join(visible_text_list)
            text_findings = RuleEngine.run_all_deterministic_checks(
                text=combined_visible_text,
                banned_terms=brand.banned_terms or [],
                preferred_terminology=brand.preferred_terminology or {},
            )
            all_draft_findings.extend(text_findings)

        # An event rule must never silently pass when the vision provider is
        # unavailable. A review warning is safer than presenting an unrelated
        # image as event-compliant.
        if campaign_event and not gemini_service.is_available:
            all_draft_findings.append(
                FindingDraft(
                    category="EVENT_FIT",
                    severity="WARNING",
                    detector_source="EVENT_GUARD",
                    flagged_excerpt=f"{campaign_event} visual fit could not be verified",
                    explanation=f"The {campaign_event} event rule requires visual semantic analysis, but the vision provider is unavailable.",
                    guideline_citation=f"Campaign Brief: {campaign_event}",
                    suggested_correction=f"Retry the audit with the vision service enabled and use a clearly {campaign_event}-relevant visual.",
                )
            )


        # Deduplicate
        seen_keys = set()
        deduped_findings: List[FindingDraft] = []
        for f in all_draft_findings:
            key = (f.category, f.flagged_excerpt.strip().lower())
            if key not in seen_keys:
                seen_keys.add(key)
                deduped_findings.append(f)

        # Calculate score
        score = cls.calculate_compliance_score(deduped_findings)
        revision.compliance_score = score
        revision.ai_governance_metadata = {
            "visible_text": visible_text_list,
            "dominant_colors": dominant_colors,
            "palette_match_pct": palette_match_pct,
            "image_metadata": image_metadata,
            "findings_count": len(deduped_findings),
            "campaign_event": campaign_event,
            "ai_status": vision_ai_status,
            "ai_error": vision_ai_error,
        }
        if additional_metadata:
            revision.ai_governance_metadata.update(additional_metadata)
            if "ai_status" in additional_metadata:
                vision_ai_status = additional_metadata["ai_status"]
            if "ai_error" in additional_metadata:
                vision_ai_error = additional_metadata["ai_error"]
        submission.compliance_score = score
        if persist:
            submission.content_format = "IMAGE"

        # Fail closed on AI failure
        if vision_ai_status == "failed":
            submission.status = "NEEDS_REVIEW"
        elif score == 100.0:
            submission.status = "NEEDS_REVIEW"
        else:
            submission.status = "CHANGES_REQUESTED" if any(f.severity == "CRITICAL" for f in deduped_findings) else "NEEDS_REVIEW"

        if not persist:
            return {
                "draft_findings": deduped_findings,
                "visible_text": visible_text_list,
                "dominant_colors": dominant_colors,
                "palette_match_pct": palette_match_pct,
                "image_metadata": image_metadata,
                "ai_status": vision_ai_status,
                "ai_error": vision_ai_error,
            }

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
            notes=f"Image visual audit completed with compliance score {score}%. Generated {len(deduped_findings)} findings.",
            metadata_json={
                "revision_id": revision.id,
                "version_number": revision.version_number,
                "compliance_score": score,
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

