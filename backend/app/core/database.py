from typing import AsyncGenerator
from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase
import redis.asyncio as aioredis

from app.core.config import settings

# Async SQLAlchemy Engine
engine = create_async_engine(
    settings.async_database_url,
    echo=False,
    future=True,
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,
    pool_recycle=300,
)

# Async Session Factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)

# Redis Async Client (graceful fallback if not configured)
redis_client = None
if settings.REDIS_URL and settings.REDIS_URL.strip():
    try:
        redis_client = aioredis.from_url(
            settings.REDIS_URL.strip(),
            encoding="utf-8",
            decode_responses=True,
        )
    except Exception:
        redis_client = None


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that yields an async database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


import logging

logger = logging.getLogger("inkloom_api")


async def init_db() -> None:
    """Ensures pgvector extension, all tables, and latest column schemas exist on startup."""
    import app.models  # noqa: F401 - ensures all models are registered on Base

    async with engine.begin() as conn:
        try:
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
        except Exception as ext_err:
            logger.warning(f"pgvector extension creation skipped or already present: {ext_err}")

        await conn.run_sync(Base.metadata.create_all)

        # Schema self-healing: ensure newly added columns exist on existing production tables
        schema_patches = [
            # brand_profiles
            "ALTER TABLE brand_profiles ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(100) DEFAULT 'tenant_default';",
            "ALTER TABLE brand_profiles ADD COLUMN IF NOT EXISTS owner_id VARCHAR(100);",
            # guideline_chunks
            "ALTER TABLE guideline_chunks ADD COLUMN IF NOT EXISTS source_kind VARCHAR(50) DEFAULT 'custom';",
            "ALTER TABLE guideline_chunks ADD COLUMN IF NOT EXISTS document_id VARCHAR(100);",
            "ALTER TABLE guideline_chunks ADD COLUMN IF NOT EXISTS content_hash VARCHAR(64);",
            "ALTER TABLE guideline_chunks ADD COLUMN IF NOT EXISTS document_type VARCHAR(50) DEFAULT 'guidelines';",
            "ALTER TABLE guideline_chunks ADD COLUMN IF NOT EXISTS embedding_status VARCHAR(50) DEFAULT 'completed';",
            "ALTER TABLE guideline_chunks ADD COLUMN IF NOT EXISTS times_triggered INTEGER DEFAULT 0;",
            "ALTER TABLE guideline_chunks ADD COLUMN IF NOT EXISTS times_overridden INTEGER DEFAULT 0;",
            "ALTER TABLE guideline_chunks ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(100) DEFAULT 'tenant_default';",
            "ALTER TABLE guideline_chunks ADD COLUMN IF NOT EXISTS category VARCHAR(50);",
            "ALTER TABLE guideline_chunks ADD COLUMN IF NOT EXISTS confidence_score FLOAT DEFAULT 1.0;",
            "ALTER TABLE guideline_chunks ADD COLUMN IF NOT EXISTS source_page INTEGER;",
            # submissions
            "ALTER TABLE submissions ADD COLUMN IF NOT EXISTS campaign_id INTEGER;",
            "ALTER TABLE submissions ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(100) DEFAULT 'tenant_default';",
            "ALTER TABLE submissions ADD COLUMN IF NOT EXISTS verdict VARCHAR(50);",
            "ALTER TABLE submissions ADD COLUMN IF NOT EXISTS platform VARCHAR(50);",
            "ALTER TABLE submissions ADD COLUMN IF NOT EXISTS compliance_score FLOAT;",
            "ALTER TABLE submissions ADD COLUMN IF NOT EXISTS creator_id VARCHAR(100) DEFAULT 'user_creator_01';",
            "ALTER TABLE submissions ADD COLUMN IF NOT EXISTS creator_name VARCHAR(150) DEFAULT 'Alex Rivera';",
            # submission_revisions
            "ALTER TABLE submission_revisions ADD COLUMN IF NOT EXISTS alt_text TEXT;",
            "ALTER TABLE submission_revisions ADD COLUMN IF NOT EXISTS compliance_score FLOAT;",
            "ALTER TABLE submission_revisions ADD COLUMN IF NOT EXISTS ai_governance_metadata JSONB DEFAULT '{}'::jsonb;",
            "ALTER TABLE submission_revisions ADD COLUMN IF NOT EXISTS change_summary VARCHAR(255) DEFAULT 'Initial draft created';",
            "ALTER TABLE submission_revisions ADD COLUMN IF NOT EXISTS created_by VARCHAR(100) DEFAULT 'user_creator_01';",
            # audit_findings
            "ALTER TABLE audit_findings ADD COLUMN IF NOT EXISTS override_reason TEXT;",
            "ALTER TABLE audit_findings ADD COLUMN IF NOT EXISTS resolved_by VARCHAR(100);",
            "ALTER TABLE audit_findings ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE;",
            # workflow_events
            "ALTER TABLE workflow_events ADD COLUMN IF NOT EXISTS metadata_json JSONB DEFAULT '{}'::jsonb;",
            # user_accounts onboarding and profile fields
            "ALTER TABLE user_accounts ADD COLUMN IF NOT EXISTS onboarding_status VARCHAR(50) DEFAULT 'NOT_STARTED';",
            "ALTER TABLE user_accounts ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 1;",
            "ALTER TABLE user_accounts ADD COLUMN IF NOT EXISTS brand_id INTEGER;",
            "ALTER TABLE user_accounts ADD COLUMN IF NOT EXISTS creator_type VARCHAR(50);",
            "ALTER TABLE user_accounts ADD COLUMN IF NOT EXISTS organization_name VARCHAR(255);",
            "ALTER TABLE user_accounts ADD COLUMN IF NOT EXISTS specialization VARCHAR(100);",
            "ALTER TABLE user_accounts ADD COLUMN IF NOT EXISTS onboarding_metadata JSONB DEFAULT '{}'::jsonb;",
        ]
        for patch in schema_patches:
            try:
                await conn.execute(text(patch))
            except Exception as patch_err:
                logger.warning(f"Schema patch warning: {patch_err}")