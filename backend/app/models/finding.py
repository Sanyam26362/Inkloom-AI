from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, Text, Integer, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class AuditFinding(Base):
    __tablename__ = "audit_findings"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    submission_id: Mapped[int] = mapped_column(
        ForeignKey("submissions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    revision_id: Mapped[int] = mapped_column(
        ForeignKey("submission_revisions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    cited_chunk_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("guideline_chunks.id", ondelete="SET NULL"), nullable=True, index=True
    )

    category: Mapped[str] = mapped_column(
        String(50), nullable=False, index=True
    )  # TONE, TERMINOLOGY, FACTUAL_CLAIM, VISUAL, ACCESSIBILITY
    severity: Mapped[str] = mapped_column(
        String(30), default="WARNING"
    )  # CRITICAL, WARNING, SUGGESTION
    detector_source: Mapped[str] = mapped_column(
        String(50), default="RAG_LLM"
    )  # DETERMINISTIC_RULE, WCAG_MATH, RAG_LLM, VISION_LLM

    flagged_excerpt: Mapped[str] = mapped_column(Text, nullable=False)
    explanation: Mapped[str] = mapped_column(Text, nullable=False)
    guideline_citation: Mapped[str] = mapped_column(
        String(255), default="Brand Governance Policy"
    )
    suggested_correction: Mapped[str] = mapped_column(Text, nullable=False)

    # Human Control & Resolution State
    resolution_state: Mapped[str] = mapped_column(
        String(30), default="OPEN", index=True
    )  # OPEN, ACCEPTED, OVERRIDDEN
    override_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    resolved_by: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    submission: Mapped["Submission"] = relationship("Submission", back_populates="findings")
    cited_chunk: Mapped[Optional["GuidelineChunk"]] = relationship("GuidelineChunk")