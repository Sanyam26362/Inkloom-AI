import uuid
import pytest
from pathlib import Path
from unittest.mock import AsyncMock, patch

from app.models.brand import BrandProfile
from app.models.guideline_chunk import GuidelineChunk
from app.schemas.ruleset import RuleSetCreate, ApprovedFactSchema, RubricDimensionSchema
from app.services.document_service import DocumentService
from app.services.pack_service import PackService
from app.services.audit_service import AuditService


@pytest.fixture
def mock_embedding_and_extraction():
    dummy_ruleset = RuleSetCreate(
        brand_id=1,
        palette=["#F8C200", "#1C1C1E", "#FFFFFF", "#00A36C", "#FF6B35"],
        banned_terms=["guaranteed", "instant", "always", "100%"],
        preferred_terminology={"app": "Blinkit app"},
        approved_facts=[
            ApprovedFactSchema(claim="Blinkit delivers in 10 minutes", source="Guidelines", verified=True)
        ],
        required_phrases=["Blinkit app"],
        exaggeration_terms=["100%", "instant"],
        prohibited_visual_subjects=["crackers", "fireworks", "spider-man"],
        per_media_rules={},
        decision_rules={"pass": ["Clear festive cues"], "fail": ["Firecrackers"]},
        rubric=[
            RubricDimensionSchema(dimension="brand_colors", weight=0.25, pass_criteria="Approved colors", review_criteria="Minor mismatch", fail_criteria="Unapproved colors")
        ],
    )
    with patch("app.services.gemini_service.gemini_service.generate_embedding", new_callable=AsyncMock) as mock_emb, \
         patch("app.services.gemini_service.gemini_service.extract_rules", new_callable=AsyncMock) as mock_ext:
        mock_emb.return_value = [0.05] * 768
        mock_ext.return_value = dummy_ruleset
        yield mock_emb, mock_ext


def test_pdf_chunking_blinkit_guidelines():
    """Validates PDF chunking produces > 30 chunks, none > 250 words, no 'Page N Section', and covers all pages."""
    pdf_path = Path(__file__).resolve().parent.parent / "blinkit_guidelines.pdf"
    assert pdf_path.exists(), f"PDF not found at {pdf_path}"

    chunks = DocumentService.extract_chunks(pdf_path.read_bytes(), "blinkit_guidelines.pdf")

    assert len(chunks) > 30, f"Expected > 30 chunks, got {len(chunks)}"
    assert all(c["word_count"] <= 250 for c in chunks), "Found chunk exceeding 250 words"
    assert all("Page " not in c["section_reference"] or "Section" not in c["section_reference"] for c in chunks), "Found invalid section reference 'Page N Section'"

    # Verify all 14 pages are represented in the extracted chunks
    pages_covered = {c["page_number"] for c in chunks}
    for p in range(1, 15):
        assert p in pages_covered, f"Page {p} not covered in chunks"


def test_markdown_chunking_design_and_guidelines():
    """Validates heading-aware markdown chunker on brand guidelines and design system."""
    base_dir = Path(__file__).resolve().parent.parent
    bg_path = base_dir / "blinkit_diwali_2026_brand_guidelines.md"
    ds_path = base_dir / "blinkit_diwali_2026_design_system.md"

    bg_chunks = DocumentService.extract_chunks(bg_path.read_bytes(), bg_path.name)
    ds_chunks = DocumentService.extract_chunks(ds_path.read_bytes(), ds_path.name)

    assert len(bg_chunks) >= 20, f"Expected >= 20 brand guidelines chunks, got {len(bg_chunks)}"
    assert len(ds_chunks) >= 20, f"Expected >= 20 design system chunks, got {len(ds_chunks)}"

    assert all(c["word_count"] <= 250 for c in bg_chunks)
    assert all(c["word_count"] <= 250 for c in ds_chunks)

    # Verify hierarchical section references
    ds_sections = [c["section_reference"] for c in ds_chunks]
    assert any("Color Palette" in s for s in ds_sections)


def test_pack_service_list_packs():
    """Tests listing of available premade packs."""
    packs = PackService.list_packs()
    assert len(packs) >= 1
    blinkit_pack = next((p for p in packs if p.name == "blinkit"), None)
    assert blinkit_pack is not None
    assert blinkit_pack.client == "Blinkit"
    assert len(blinkit_pack.documents) == 3
    assert blinkit_pack.campaign_name == "Diwali 2026"


@pytest.mark.asyncio
async def test_pack_load_and_retrieval(db_session, mock_embedding_and_extraction):
    """
    Tests loading the Blinkit pack:
    - Indexes all documents without caps.
    - Creates Campaign and RuleSet.
    - Verifies AuditService retrieval includes Spider-Man, fireworks, and 'Blinkit app' rules.
    """
    brand = BrandProfile(
        name=f"Blinkit Test {uuid.uuid4().hex[:6]}",
        industry="Quick Commerce",
        tone_persona="Energetic",
        approved_hex_palette=[],
        banned_terms=[],
        preferred_terminology={},
        approved_facts=[],
    )
    db_session.add(brand)
    await db_session.commit()
    await db_session.refresh(brand)

    # 1. Load Blinkit pack
    load_res = await PackService.load_pack("blinkit", brand_id=brand.id, session=db_session)
    assert load_res.pack_name == "blinkit"
    assert load_res.indexed_chunks_count > 80, f"Expected > 80 total chunks, got {load_res.indexed_chunks_count}"
    assert load_res.campaign_id is not None
    assert load_res.ruleset_id is not None

    # Verify brand profile fields populated
    await db_session.refresh(brand)
    assert "#F8C200" in brand.approved_hex_palette
    assert "guaranteed" in brand.banned_terms

    # 2. Test AuditService retrieval: must contain Spider-Man, fireworks, and 'Blinkit app' rules
    retrieved = await AuditService.retrieve_relevant_guidelines(
        session=db_session,
        brand_id=brand.id,
        query_text="festive Diwali social media poster with mithai delivery",
        limit=8,
        media_type="image",
        campaign_name="Diwali 2026",
    )
    assert len(retrieved) > 0

    all_retrieved_text = " ".join(c.content_text.lower() for c in retrieved)
    assert any(term in all_retrieved_text for term in ["spider-man", "spiderman", "copyrighted"]), "Spider-Man / copyright rule missing from retrieved context"
    assert any(term in all_retrieved_text for term in ["firework", "cracker", "sparkler"]), "Firecracker / fireworks rule missing from retrieved context"
    assert "blinkit app" in all_retrieved_text, "'Blinkit app' terminology rule missing from retrieved context"

    # 3. Test idempotency: re-load should replace chunks cleanly without doubling
    second_load = await PackService.load_pack("blinkit", brand_id=brand.id, session=db_session)
    assert second_load.indexed_chunks_count == load_res.indexed_chunks_count


@pytest.mark.asyncio
async def test_zero_retrievable_chunks_error(db_session):
    """Verifies that an audit on a brand with 0 retrievable chunks raises a clear error."""
    empty_brand = BrandProfile(
        name=f"Empty Brand {uuid.uuid4().hex[:6]}",
        industry="Retail",
        tone_persona="Standard",
        approved_hex_palette=[],
        banned_terms=[],
        preferred_terminology={},
        approved_facts=[],
    )
    db_session.add(empty_brand)
    await db_session.commit()
    await db_session.refresh(empty_brand)

    with pytest.raises(ValueError) as excinfo:
        await AuditService.retrieve_relevant_guidelines(
            session=db_session,
            brand_id=empty_brand.id,
            query_text="audit query",
        )
    assert "No guideline chunks indexed for this brand" in str(excinfo.value)


@pytest.mark.asyncio
async def test_guidelines_and_packs_endpoints(client, db_session, mock_embedding_and_extraction):
    """Tests the /api/v1/packs and /api/v1/guidelines HTTP endpoints."""
    # Create brand
    brand = BrandProfile(
        name=f"Pack API Test {uuid.uuid4().hex[:6]}",
        industry="Retail",
        tone_persona="Upbeat",
        approved_hex_palette=[],
        banned_terms=[],
        preferred_terminology={},
        approved_facts=[],
    )
    db_session.add(brand)
    await db_session.commit()
    await db_session.refresh(brand)

    # 1. GET /api/v1/packs
    res = await client.get("/api/v1/packs")
    assert res.status_code == 200
    packs = res.json()
    assert any(p["name"] == "blinkit" for p in packs)

    # 2. POST /api/v1/packs/blinkit/load
    res = await client.post("/api/v1/packs/blinkit/load", json={"brand_id": brand.id})
    assert res.status_code == 200
    data = res.json()
    assert data["pack_name"] == "blinkit"
    assert data["indexed_chunks_count"] > 80

    # 3. POST /api/v1/guidelines/upload with markdown file
    md_content = b"# Custom Guidelines\n\n## Section 1: Typography\nUse Inter font.\n\n## Section 2: Logo\nKeep 20px padding."
    files = {"file": ("custom_guidelines.md", md_content, "text/markdown")}
    upload_res = await client.post(
        "/api/v1/guidelines/upload",
        data={"brand_id": brand.id, "document_type": "design"},
        files=files,
    )
    assert upload_res.status_code == 201
    chunks = upload_res.json()
    assert len(chunks) >= 2
    first_chunk_id = chunks[0]["id"]

    # 4. DELETE /api/v1/guidelines/{id}
    del_res = await client.delete(f"/api/v1/guidelines/{first_chunk_id}")
    assert del_res.status_code == 200
    assert del_res.json()["deleted_count"] == 1

    # 5. DELETE /api/v1/guidelines/document/{doc_id}
    doc_del_res = await client.delete(
        "/api/v1/guidelines/document/custom_guidelines.md",
        params={"brand_id": brand.id},
    )
    assert doc_del_res.status_code == 200
    assert doc_del_res.json()["deleted_count"] >= 1

    # 6. POST /api/v1/guidelines/reindex
    reindex_res = await client.post("/api/v1/guidelines/reindex", json={"brand_id": brand.id})
    assert reindex_res.status_code == 200

