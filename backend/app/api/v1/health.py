from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any

from app.core.database import get_db, redis_client
from app.core.config import settings
from app.services.gemini_service import gemini_service

router = APIRouter(tags=["Health & Diagnostics"])


@router.get("/health", response_model=Dict[str, Any])
async def health_check(session: AsyncSession = Depends(get_db)) -> Dict[str, Any]:
    """Comprehensive health check verifying PostgreSQL (pgvector), Redis, and Gemini AI status."""
    db_status = "error"
    pgvector_status = "error"
    try:
        res = await session.execute(text("SELECT 1;"))
        if res.scalar() == 1:
            db_status = "healthy"
        v_res = await session.execute(text("SELECT extversion FROM pg_extension WHERE extname = 'vector';"))
        version = v_res.scalar_one_or_none()
        if version:
            pgvector_status = f"pgvector v{version} active"
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    redis_status = "not configured (optional)"
    if redis_client:
        try:
            pong = await redis_client.ping()
            if pong:
                redis_status = "healthy"
        except Exception as e:
            redis_status = f"unhealthy: {str(e)}"

    ai_status = {
        "provider": "Google Gemini",
        "primary_model": settings.PRIMARY_LLM_MODEL,
        "embedding_model": settings.EMBEDDING_MODEL,
        "embedding_dimensions": settings.EMBEDDING_DIMENSIONS,
        "configured": bool(settings.GEMINI_API_KEY),
        "client_ready": gemini_service.is_available,
    }

    overall_healthy = db_status == "healthy"

    return {
        "status": "healthy" if overall_healthy else "degraded",
        "project": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT,
        "database": db_status,
        "pgvector": pgvector_status,
        "redis": redis_status,
        "ai_integration": ai_status,
    }
