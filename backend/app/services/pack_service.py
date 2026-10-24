import json
import logging
import asyncio
from pathlib import Path
from typing import List, Optional
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.brand import BrandProfile
from app.models.campaign import Campaign
from app.models.ruleset import RuleSet
from app.models.guideline_chunk import GuidelineChunk
from app.schemas.pack import PackSummary, PackDocumentInfo, PackLoadResponse
from app.schemas.ruleset import RuleSetCreate, RuleExtractRequest
from app.services.document_service import DocumentService
from app.services.gemini_service import gemini_service

logger = logging.getLogger(__name__)


class PackService:
    @staticmethod
    def get_packs_dir() -> Path:
        """Returns the absolute path to the backend/packs directory."""
        return Path(__file__).resolve().parent.parent.parent / "packs"

    @classmethod
    def list_packs(cls) -> List[PackSummary]:
        """Lists all available premade packs found in the packs directory."""
        packs_dir = cls.get_packs_dir()
        if not packs_dir.exists():
            return []

        packs: List[PackSummary] = []
        for p in packs_dir.iterdir():
            if p.is_dir():
                manifest_path = p / "manifest.json"
                if manifest_path.exists():
                    try:
                        data = json.loads(manifest_path.read_text(encoding="utf-8"))
                        docs = [
                            PackDocumentInfo(
                                filename=d["filename"],
                                document_type=d.get("document_type", "guidelines"),
                                title=d.get("title", d["filename"]),
                            )
                            for d in data.get("documents", [])
                        ]
                        campaign_name = None
                        camp_file = data.get("campaign_file")
                        if camp_file and (p / camp_file).exists():
                            camp_data = json.loads((p / camp_file).read_text(encoding="utf-8"))
                            campaign_name = camp_data.get("name")

                        packs.append(
                            PackSummary(
                                name=data.get("name", p.name),
                                display_name=data.get("display_name", p.name.title()),
                                description=data.get("description", ""),
                                client=data.get("client", p.name.title()),
                                documents=docs,
                                campaign_name=campaign_name,
                            )
                        )
                    except Exception as e:
                        logger.error(f"Failed to parse pack manifest at {manifest_path}: {e}")

        return packs

    @classmethod
    async def load_pack(
        cls, pack_name: str, brand_id: int, session: AsyncSession
    ) -> PackLoadResponse:
        """
        Idempotently loads all documents from a premade pack:
        1. Validates brand existence.
        2. Creates/updates Campaign from pack's campaign.json.
        3. Replaces previous premade chunks for this brand.
        4. Indexes all documents with concurrency-controlled embeddings.
        5. Extracts and confirms the RuleSet, syncing deterministic fields to BrandProfile.
        """
        brand_stmt = select(BrandProfile).where(BrandProfile.id == brand_id)
        brand_res = await session.execute(brand_stmt)
        brand = brand_res.scalar_one_or_none()
        if not brand:
            raise ValueError(f"Brand with ID {brand_id} not found.")

        pack_dir = cls.get_packs_dir() / pack_name.lower().strip()
        manifest_file = pack_dir / "manifest.json"
        if not pack_dir.exists() or not manifest_file.exists():
            raise FileNotFoundError(f"Premade pack '{pack_name}' not found at {pack_dir}.")

        manifest = json.loads(manifest_file.read_text(encoding="utf-8"))

        # 1. Load Campaign if campaign_file exists
        campaign = None
        camp_file = manifest.get("campaign_file")
        if camp_file and (pack_dir / camp_file).exists():
            camp_data = json.loads((pack_dir / camp_file).read_text(encoding="utf-8"))
            camp_stmt = select(Campaign).where(
                Campaign.brand_id == brand_id, Campaign.name == camp_data["name"]
            )
            camp_res = await session.execute(camp_stmt)
            campaign = camp_res.scalar_one_or_none()
            if not campaign:
                campaign = Campaign(
                    brand_id=brand_id,
                    name=camp_data["name"],
                    description=camp_data.get("description", ""),
                    goals=camp_data.get("goals", ""),
                    platforms=camp_data.get("platforms", []),
                    content_types=camp_data.get("content_types", []),
                    required_cues=camp_data.get("required_cues", []),
                    min_required_cues=camp_data.get("min_required_cues", 2),
                    prohibited_items=camp_data.get("prohibited_items", []),
                    extra_rules=camp_data.get("extra_rules", {}),
                    is_active=True,
                )
                session.add(campaign)
                await session.flush()
            else:
                campaign.description = camp_data.get("description", campaign.description)
                campaign.goals = camp_data.get("goals", campaign.goals)
                campaign.platforms = camp_data.get("platforms", campaign.platforms)
                campaign.content_types = camp_data.get("content_types", campaign.content_types)
                campaign.required_cues = camp_data.get("required_cues", campaign.required_cues)
                campaign.min_required_cues = camp_data.get("min_required_cues", campaign.min_required_cues)
                campaign.prohibited_items = camp_data.get("prohibited_items", campaign.prohibited_items)
                campaign.extra_rules = camp_data.get("extra_rules", campaign.extra_rules)
                campaign.is_active = True
                await session.flush()

        # 2. Idempotent: Delete previous premade chunks for this brand
        await session.execute(
            delete(GuidelineChunk).where(
                GuidelineChunk.brand_id == brand_id,
                GuidelineChunk.source_kind == "premade",
            )
        )
        await session.flush()

        # 3. Extract chunks from all documents in manifest
        all_raw_chunks = []
        for doc_info in manifest.get("documents", []):
            doc_path = pack_dir / doc_info["filename"]
            if not doc_path.exists():
                logger.warning(f"Pack document {doc_path} not found; skipping.")
                continue

            file_bytes = doc_path.read_bytes()
            raw_chunks = DocumentService.extract_chunks(
                file_bytes=file_bytes,
                filename=doc_info["filename"],
                document_type=doc_info.get("document_type", "guidelines"),
            )
            for rc in raw_chunks:
                rc["document_id"] = f"pack:{pack_name}:{doc_info['filename']}"
                all_raw_chunks.append(rc)

        # 4. Batched embeddings with concurrency limit
        sem = asyncio.Semaphore(5)

        async def embed_chunk(chunk_data: dict) -> GuidelineChunk:
            async with sem:
                emb = await gemini_service.generate_embedding(
                    chunk_data["content_text"], task_type="RETRIEVAL_DOCUMENT"
                )
                return GuidelineChunk(
                    brand_id=brand_id,
                    source_kind="premade",
                    document_id=chunk_data.get("document_id"),
                    content_hash=chunk_data.get("content_hash"),
                    document_type=chunk_data.get("document_type", "guidelines"),
                    source_document=chunk_data["source_document"],
                    page_number=chunk_data.get("page_number", 1),
                    section_reference=chunk_data.get("section_reference", "General"),
                    rule_category=chunk_data.get("rule_category", "GENERAL"),
                    content_text=chunk_data["content_text"],
                    embedding=emb,
                    embedding_status="completed" if emb else "failed",
                )

        saved_chunks = await asyncio.gather(*(embed_chunk(rc) for rc in all_raw_chunks))
        for sc in saved_chunks:
            session.add(sc)
        await session.flush()

        # 5. Extract and confirm RuleSet
        # Sample chunks covering distinct sections for rule extraction
        sample_texts = [sc.content_text for sc in saved_chunks[:40]]
        guideline_sample = "\n\n---\n\n".join(sample_texts)

        campaign_context = ""
        if campaign:
            campaign_context = f"Campaign: {campaign.name}. Prohibited: {', '.join(campaign.prohibited_items)}. Required cues: {', '.join(campaign.required_cues)}."

        ruleset_draft = await gemini_service.extract_rules(
            guidelines_text=guideline_sample,
            campaign_context=campaign_context,
        )

        # Overlay campaign extra_rules to guarantee determinism
        extra = campaign.extra_rules if campaign else {}
        palette = extra.get("palette") or ruleset_draft.palette or ["#F8C200", "#1C1C1E", "#FFFFFF", "#00A36C", "#FF6B35"]
        banned = list(dict.fromkeys((ruleset_draft.banned_terms or []) + (extra.get("banned_terms") or [])))
        preferred = {**(ruleset_draft.preferred_terminology or {}), **(extra.get("approved_terminology") or {})}
        required_phrases = list(dict.fromkeys((ruleset_draft.required_phrases or []) + (extra.get("required_phrases") or [])))
        prohibited_visuals = list(dict.fromkeys((ruleset_draft.prohibited_visual_subjects or []) + (campaign.prohibited_items if campaign else [])))

        # Deactivate old rulesets for this campaign
        if campaign:
            old_rs_stmt = select(RuleSet).where(
                RuleSet.brand_id == brand_id, RuleSet.campaign_id == campaign.id
            )
            old_rs_res = await session.execute(old_rs_stmt)
            for old_rs in old_rs_res.scalars().all():
                old_rs.is_active = False

        ruleset = RuleSet(
            brand_id=brand_id,
            campaign_id=campaign.id if campaign else None,
            version=1,
            source_documents=[d.get("filename", "") for d in manifest.get("documents", [])],
            palette=palette,
            banned_terms=banned,
            preferred_terminology=preferred,
            approved_facts=[f.model_dump() if hasattr(f, "model_dump") else f for f in ruleset_draft.approved_facts],
            required_phrases=required_phrases,
            exaggeration_terms=ruleset_draft.exaggeration_terms,
            prohibited_visual_subjects=prohibited_visuals,
            per_media_rules=ruleset_draft.per_media_rules,
            decision_rules=ruleset_draft.decision_rules,
            rubric=[r.model_dump() if hasattr(r, "model_dump") else r for r in ruleset_draft.rubric],
            is_active=True,
        )
        session.add(ruleset)

        # Sync deterministic fields to BrandProfile
        brand.approved_hex_palette = palette
        brand.banned_terms = banned
        brand.preferred_terminology = preferred
        brand.approved_facts = [f.model_dump() if hasattr(f, "model_dump") else f for f in ruleset_draft.approved_facts]

        await session.commit()
        await session.refresh(ruleset)

        return PackLoadResponse(
            pack_name=pack_name,
            brand_id=brand_id,
            campaign_id=campaign.id if campaign else None,
            ruleset_id=ruleset.id,
            indexed_chunks_count=len(saved_chunks),
            message=f"Premade pack '{pack_name}' successfully loaded with {len(saved_chunks)} chunks indexed, Campaign active, and RuleSet v{ruleset.version} confirmed.",
        )
