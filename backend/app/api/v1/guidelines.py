from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import CurrentUser, get_current_user
from app.models.brand import BrandProfile
from app.models.guideline_chunk import GuidelineChunk
from app.schemas.guideline import (
    GuidelineChunkCreate,
    GuidelineChunkResponse,
    GuidelineSearchQuery,
    GuidelineSearchResult,
)
from app.services.gemini_service import gemini_service
from app.services.document_service import DocumentService

router = APIRouter(prefix="/guidelines", tags=["Guideline Ingestion & RAG"])


@router.get("", response_model=List[GuidelineChunkResponse])
async def list_guidelines(
    brand_id: int,
    session: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> List[GuidelineChunk]:
    """Lists indexed guideline chunks for a specified brand profile."""
    stmt = (
        select(GuidelineChunk)
        .where(GuidelineChunk.brand_id == brand_id)
        .order_by(GuidelineChunk.created_at.desc())
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())


@router.post("", response_model=GuidelineChunkResponse, status_code=status.HTTP_201_CREATED)
async def create_guideline_chunk(
    payload: GuidelineChunkCreate,
    session: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> GuidelineChunk:
    """Manually adds a single guideline chunk and generates its 768-dim vector embedding."""
    brand_stmt = select(BrandProfile).where(BrandProfile.id == payload.brand_id)
    brand_res = await session.execute(brand_stmt)
    if not brand_res.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Brand profile not found")

    embedding = gemini_service.generate_embedding(payload.content_text)

    chunk = GuidelineChunk(
        brand_id=payload.brand_id,
        source_document=payload.source_document,
        page_number=payload.page_number,
        section_reference=payload.section_reference,
        rule_category=payload.rule_category,
        content_text=payload.content_text,
        embedding=embedding,
    )
    session.add(chunk)
    await session.commit()
    await session.refresh(chunk)
    return chunk


@router.post("/upload-pdf", response_model=List[GuidelineChunkResponse], status_code=status.HTTP_201_CREATED)
async def upload_guideline_pdf(
    brand_id: int = Form(...),
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> List[GuidelineChunk]:
    """
    Safely extracts guidelines from an uploaded PDF document, splits into semantic chunks
    with page numbers, generates 768-dim embeddings, and indexes them in PostgreSQL pgvector.
    """
    brand_stmt = select(BrandProfile).where(BrandProfile.id == brand_id)
    brand_res = await session.execute(brand_stmt)
    if not brand_res.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Brand profile not found")

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF documents are supported for guideline ingestion.",
        )

    file_bytes = await file.read()
    try:
        raw_chunks = DocumentService.extract_chunks_from_pdf(
            pdf_bytes=file_bytes, filename=file.filename
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    saved_chunks: List[GuidelineChunk] = []
    for rc in raw_chunks:
        embedding = gemini_service.generate_embedding(rc["content_text"])
        chunk = GuidelineChunk(
            brand_id=brand_id,
            source_document=rc["source_document"],
            page_number=rc["page_number"],
            section_reference=rc["section_reference"],
            rule_category=rc["rule_category"],
            content_text=rc["content_text"],
            embedding=embedding,
        )
        session.add(chunk)
        saved_chunks.append(chunk)

    await session.commit()
    for sc in saved_chunks:
        await session.refresh(sc)

    return saved_chunks


@router.post("/search", response_model=List[GuidelineSearchResult])
async def search_guidelines(
    payload: GuidelineSearchQuery,
    session: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> List[GuidelineSearchResult]:
    """Semantic vector search over brand guidelines using pgvector cosine distance."""
    embedding = gemini_service.generate_embedding(payload.query)
    if not embedding:
        # Fallback to text match
        text_stmt = (
            select(GuidelineChunk)
            .where(GuidelineChunk.brand_id == payload.brand_id)
            .where(GuidelineChunk.content_text.ilike(f"%{payload.query}%"))
            .limit(payload.limit)
        )
        res = await session.execute(text_stmt)
        chunks = list(res.scalars().all())
        return [
            GuidelineSearchResult(
                chunk=GuidelineChunkResponse.model_validate(c),
                similarity_score=1.0,
            )
            for c in chunks
        ]

    # pgvector cosine distance: distance = 1 - cosine_similarity
    # cosine_distance ranges 0 (identical) to 2 (opposite)
    distance_expr = GuidelineChunk.embedding.cosine_distance(embedding)
    stmt = (
        select(GuidelineChunk, distance_expr.label("distance"))
        .where(GuidelineChunk.brand_id == payload.brand_id)
        .where(GuidelineChunk.embedding.isnot(None))
        .order_by(distance_expr.asc())
        .limit(payload.limit)
    )
    result = await session.execute(stmt)
    rows = result.all()

    results: List[GuidelineSearchResult] = []
    for chunk, distance in rows:
        similarity = max(0.0, min(1.0, 1.0 - (distance or 0.0)))
        results.append(
            GuidelineSearchResult(
                chunk=GuidelineChunkResponse.model_validate(chunk),
                similarity_score=round(similarity, 4),
            )
        )

    return results
