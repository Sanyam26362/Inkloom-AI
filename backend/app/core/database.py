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


async def init_db() -> None:
    """Ensures pgvector extension and all SQLAlchemy tables exist on startup."""
    import app.models  # noqa: F401 - ensures all models are registered on Base

    async with engine.begin() as conn:
        try:
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
        except Exception:
            pass
        await conn.run_sync(Base.metadata.create_all)