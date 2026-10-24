import logging
import uuid
import asyncio
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, Body
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

from app.core.database import get_db
from app.core.security import CurrentUser, get_current_user
from app.models.brand import BrandProfile
from app.models.guideline_chunk import GuidelineChunk
from app.schemas.guideline import (
    GuidelineChunkCreate,
    GuidelineChunkResponse,
    GuidelineSearchQuery,
    GuidelineSearchResult,
    GuidelineReindexResponse,
    GuidelineDeleteResponse,
)
from app.services.gemini_service import gemini_service
from app.services.document_service import DocumentService
from app.services.pack_service import PackService

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

    embedding = await gemini_service.generate_embedding(payload.content_text, task_type="RETRIEVAL_DOCUMENT")
    if not embedding:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to generate embedding for guideline chunk: {gemini_service.last_embedding_error or 'Gemini embedding service unavailable'}",
        )

    chunk = GuidelineChunk(
        brand_id=payload.brand_id,
        source_kind=payload.source_kind or "custom",
        document_id=payload.document_id,
        content_hash=payload.content_hash,
        document_type=payload.document_type or "guidelines",
        source_document=payload.source_document,
        page_number=payload.page_number,
        section_reference=payload.section_reference,
        rule_category=payload.rule_category,
        content_text=payload.content_text,
        embedding=embedding,
        embedding_status="completed",
    )
    session.add(chunk)
    await session.commit()
    await session.refresh(chunk)
    return chunk


@router.post("/upload", response_model=List[GuidelineChunkResponse], status_code=status.HTTP_201_CREATED)
async def upload_guideline(
    brand_id: int = Form(...),
    document_type: str = Form("guidelines"),  # guidelines | design | event | other
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> List[GuidelineChunk]:
    """
    Safely extracts chunks from an uploaded document (.pdf, .md, .txt), splits into semantic chunks
    with section headers, generates 768-dim embeddings with concurrency control,
    and indexes them idempotently in PostgreSQL pgvector.
    """
    brand_stmt = select(BrandProfile).where(BrandProfile.id == brand_id)
    brand_res = await session.execute(brand_stmt)
    if not brand_res.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Brand profile not found")

    filename = file.filename or "uploaded_guidelines"
    file_bytes = await file.read()

    try:
        raw_chunks = DocumentService.extract_chunks(
            file_bytes=file_bytes, filename=filename, document_type=document_type
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    doc_id = f"doc_{uuid.uuid4().hex[:10]}"

    # Deduplication: Remove any previous chunks from the same document name for this brand
    await session.execute(
        delete(GuidelineChunk).where(
            GuidelineChunk.brand_id == brand_id,
            GuidelineChunk.source_document == filename,
        )
    )
    await session.flush()

    sem = asyncio.Semaphore(5)

    async def embed_and_build(rc: dict) -> GuidelineChunk:
        async with sem:
            emb = await gemini_service.generate_embedding(rc["content_text"], task_type="RETRIEVAL_DOCUMENT")
            return GuidelineChunk(
                brand_id=brand_id,
                source_kind="custom",
                document_id=doc_id,
                content_hash=rc.get("content_hash"),
                document_type=document_type,
                source_document=filename,
                page_number=rc.get("page_number", 1),
                section_reference=rc.get("section_reference", "General"),
                rule_category=rc.get("rule_category", "GENERAL"),
                content_text=rc["content_text"],
                embedding=emb,
                embedding_status="completed" if emb else "failed",
            )

    saved_chunks: List[GuidelineChunk] = await asyncio.gather(*(embed_and_build(rc) for rc in raw_chunks))

    failed_count = sum(1 for sc in saved_chunks if sc.embedding_status == "failed")
    if failed_count == len(saved_chunks) and len(saved_chunks) > 0:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to generate embeddings for all {len(saved_chunks)} chunks: {gemini_service.last_embedding_error or 'Gemini embedding service unavailable'}",
        )

    for sc in saved_chunks:
        session.add(sc)

    await session.commit()
    for sc in saved_chunks:
        await session.refresh(sc)

    return saved_chunks


@router.post("/upload-pdf", response_model=List[GuidelineChunkResponse], status_code=status.HTTP_201_CREATED)
async def upload_guideline_pdf(
    brand_id: int = Form(...),
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> List[GuidelineChunk]:
    """Backward-compatible PDF upload endpoint."""
    if not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF documents are supported for guideline ingestion.",
        )
    return await upload_guideline(
        brand_id=brand_id,
        document_type="guidelines",
        file=file,
        session=session,
        user=user,
    )


@router.post("/load-premade", response_model=List[GuidelineChunkResponse], status_code=status.HTTP_201_CREATED)
async def load_premade_guidelines(
    brand_id: int = Form(...),
    session: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> List[GuidelineChunk]:
    """
    Loads premade Blinkit Diwali 2026 pack (PDF + MD specifications) via PackService.
    Indexes all documents without truncation or artificial caps.
    """
    try:
        await PackService.load_pack("blinkit", brand_id=brand_id, session=session)
    except Exception as e:
        logger.error(f"Error loading premade pack: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    # Return the newly indexed chunks
    stmt = (
        select(GuidelineChunk)
        .where(GuidelineChunk.brand_id == brand_id)
        .order_by(GuidelineChunk.id.asc())
    )
    res = await session.execute(stmt)
    return list(res.scalars().all())


@router.delete("/{chunk_id}", response_model=GuidelineDeleteResponse)
async def delete_guideline_chunk(
    chunk_id: int,
    session: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> GuidelineDeleteResponse:
    """Deletes a specific guideline chunk by its ID."""
    chunk_stmt = select(GuidelineChunk).where(GuidelineChunk.id == chunk_id)
    chunk_res = await session.execute(chunk_stmt)
    chunk = chunk_res.scalar_one_or_none()
    if not chunk:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Guideline chunk not found")

    await session.delete(chunk)
    await session.commit()
    return GuidelineDeleteResponse(deleted_count=1, message="Guideline chunk deleted successfully")


@router.delete("/document/{doc_id}", response_model=GuidelineDeleteResponse)
async def delete_guideline_document(
    doc_id: str,
    brand_id: int,
    session: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> GuidelineDeleteResponse:
    """Deletes all guideline chunks belonging to a document (by document_id or source_document name)."""
    stmt = (
        delete(GuidelineChunk)
        .where(GuidelineChunk.brand_id == brand_id)
        .where((GuidelineChunk.document_id == doc_id) | (GuidelineChunk.source_document == doc_id))
    )
    res = await session.execute(stmt)
    await session.commit()
    return GuidelineDeleteResponse(
        deleted_count=res.rowcount or 0,
        message=f"Deleted {res.rowcount or 0} chunks for document '{doc_id}'",
    )


@router.post("/reindex", response_model=GuidelineReindexResponse)
async def reindex_guidelines(
    brand_id: int = Body(..., embed=True),
    session: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> GuidelineReindexResponse:
    """
    Batched re-embedding of guideline chunks with concurrency limit.
    Re-generates vector embeddings for any chunks missing them or in failed state.
    """
    stmt = (
        select(GuidelineChunk)
        .where(GuidelineChunk.brand_id == brand_id)
        .where((GuidelineChunk.embedding.is_(None)) | (GuidelineChunk.embedding_status != "completed"))
    )
    res = await session.execute(stmt)
    chunks_to_reindex = list(res.scalars().all())

    if not chunks_to_reindex:
        return GuidelineReindexResponse(total_chunks=0, reindexed=0, failed=0)

    sem = asyncio.Semaphore(5)
    reindexed = 0
    failed = 0

    async def process_reindex(chunk: GuidelineChunk):
        nonlocal reindexed, failed
        async with sem:
            emb = await gemini_service.generate_embedding(
                chunk.content_text, task_type="RETRIEVAL_DOCUMENT"
            )
            if emb:
                chunk.embedding = emb
                chunk.embedding_status = "completed"
                reindexed += 1
            else:
                chunk.embedding_status = "failed"
                failed += 1

    await asyncio.gather(*(process_reindex(c) for c in chunks_to_reindex))
    await session.commit()

    return GuidelineReindexResponse(
        total_chunks=len(chunks_to_reindex), reindexed=reindexed, failed=failed
    )


@router.post("/search", response_model=List[GuidelineSearchResult])
async def search_guidelines(
    payload: GuidelineSearchQuery,
    session: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> List[GuidelineSearchResult]:
    """Semantic vector search over brand guidelines using pgvector cosine distance."""
    embedding = await gemini_service.generate_embedding(payload.query, task_type="RETRIEVAL_QUERY")
    if not embedding:
        # Fallback to text match
        text_stmt = (
            select(GuidelineChunk)
            .where(GuidelineChunk.brand_id == payload.brand_id)
            .where(GuidelineChunk.content_text.ilike(f"%{payload.query}%"))
            .order_by(GuidelineChunk.id.asc())
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

    # pgvector cosine distance
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
