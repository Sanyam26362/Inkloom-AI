from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, Text, Integer, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from pgvector.sqlalchemy import Vector

from app.core.database import Base
from app.core.config import settings


class GuidelineChunk(Base):
    __tablename__ = "guideline_chunks"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    brand_id: Mapped[int] = mapped_column(
        ForeignKey("brand_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )

    source_document: Mapped[str] = mapped_column(String(255), nullable=False)
    page_number: Mapped[int] = mapped_column(Integer, default=1)
    section_reference: Mapped[str] = mapped_column(String(255), default="General Guidelines")
    rule_category: Mapped[str] = mapped_column(
        String(50), default="GENERAL", index=True
    )  # TONE, TERMINOLOGY, FACT, VISUAL, ACCESSIBILITY, LEGAL_CLAIM

    content_text: Mapped[str] = mapped_column(Text, nullable=False)
    embedding: Mapped[Optional[list]] = mapped_column(
        Vector(settings.EMBEDDING_DIMENSIONS), nullable=True
    )

    # Governance Insights Counters (for Unclear/Ambiguous Guideline Detection)
    times_triggered: Mapped[int] = mapped_column(Integer, default=0)
    times_overridden: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    brand: Mapped["BrandProfile"] = relationship("BrandProfile", back_populates="guideline_chunks")