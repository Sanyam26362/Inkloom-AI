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
from app.services.gemini_service import gemini_service

logger = logging.getLogger(__name__)


class AuditService:
    """Orchestrates deterministic rule execution, RAG guideline retrieval, and semantic AI auditing."""

    @classmethod
    async def retrieve_relevant_guidelines(
        cls, session: AsyncSession, brand_id: int, query_text: str, limit: int = 5
    ) -> List[GuidelineChunk]:
        """Retrieves top-k relevant guideline chunks using pgvector cosine distance."""
        embedding = gemini_service.generate_embedding(query_text)
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

    @classmethod
    async def run_audit(
        cls,
        session: AsyncSession,
        submission: Submission,
        revision: SubmissionRevision,
        actor_id: str = "system_auditor",
        actor_name: str = "Inkloom Governance Engine",
        actor_role: str = "SYSTEM",
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
        if gemini_service.is_available and scrubbed_text.strip():
            ai_findings_raw = gemini_service.audit_content_semantic(
                scrubbed_text=scrubbed_text,
                tone_persona=brand.tone_persona or "",
                guidelines_context=guidelines_context,
                approved_facts=brand.approved_facts or [],
            )

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
        }
        submission.compliance_score = score

        # Update submission status
        if score == 100.0:
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

        # Retrieve visual and accessibility guidelines
        retrieved_chunks = await cls.retrieve_relevant_guidelines(
            session=session,
            brand_id=brand.id,
            query_text="visual brand identity colors accessibility contrast typography logo imagery",
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

        # Multimodal Gemini Vision Audit
        vision_result = gemini_service.audit_image_semantic(
            image_bytes=image_bytes,
            mime_type=mime_type,
            tone_persona=brand.tone_persona or "",
            approved_hex_palette=brand.approved_hex_palette or [],
            approved_facts=brand.approved_facts or [],
            banned_terms=brand.banned_terms or [],
            guidelines_context=guidelines_context,
        )

        visible_text_list = vision_result.get("visible_text", [])
        dominant_colors = vision_result.get("dominant_colors", [])
        palette_match_pct = float(vision_result.get("palette_match_pct", 100.0))
        raw_findings = vision_result.get("findings", [])

        # Add vision findings
        for vf in raw_findings:
            category = vf.get("category", "VISUAL").upper()
            severity = vf.get("severity", "WARNING").upper()
            flagged = vf.get("flagged_excerpt", "Visual element")
            explanation = vf.get("explanation", "")
            suggestion = vf.get("suggested_correction", "")
            cited_id = vf.get("cited_guideline_id")

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

        # Deterministic checks on visible text
        if visible_text_list:
            combined_visible_text = " ".join(visible_text_list)
            text_findings = RuleEngine.run_all_deterministic_checks(
                text=combined_visible_text,
                banned_terms=brand.banned_terms or [],
                preferred_terminology=brand.preferred_terminology or {},
            )
            all_draft_findings.extend(text_findings)

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
            "findings_count": len(deduped_findings),
        }
        submission.compliance_score = score
        submission.content_format = "IMAGE"
        if score == 100.0:
            submission.status = "NEEDS_REVIEW"
        else:
            submission.status = "CHANGES_REQUESTED" if any(f.severity == "CRITICAL" for f in deduped_findings) else "NEEDS_REVIEW"

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
        }

