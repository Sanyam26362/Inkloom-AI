from datetime import datetime, timezone
from typing import Optional, Dict, Any
from sqlalchemy import String, Text, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class WorkflowEvent(Base):
    __tablename__ = "workflow_events"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    submission_id: Mapped[int] = mapped_column(
        ForeignKey("submissions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    actor_id: Mapped[str] = mapped_column(String(100), nullable=False)
    actor_name: Mapped[str] = mapped_column(String(150), default="Alex Rivera")
    actor_role: Mapped[str] = mapped_column(String(50), nullable=False)

    event_type: Mapped[str] = mapped_column(
        String(60), nullable=False
    )  # CREATED, AUDIT_COMPLETED, FIX_ACCEPTED, FINDING_OVERRIDDEN, STATUS_CHANGED
    from_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    to_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    metadata_json: Mapped[Dict[str, Any]] = mapped_column(JSONB, default=dict)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    submission: Mapped["Submission"] = relationship("Submission", back_populates="workflow_events")


class ReviewComment(Base):
    __tablename__ = "review_comments"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    submission_id: Mapped[int] = mapped_column(
        ForeignKey("submissions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    finding_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("audit_findings.id", ondelete="SET NULL"), nullable=True
    )
    author_id: Mapped[str] = mapped_column(String(100), nullable=False)
    author_name: Mapped[str] = mapped_column(String(150), default="Jordan Lee")
    author_role: Mapped[str] = mapped_column(String(50), nullable=False)
    comment_text: Mapped[str] = mapped_column(Text, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    submission: Mapped["Submission"] = relationship("Submission", back_populates="comments")