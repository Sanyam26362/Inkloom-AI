from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy import String, Text, Integer, Float, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Submission(Base):
    __tablename__ = "submissions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    brand_id: Mapped[int] = mapped_column(
        ForeignKey("brand_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    campaign_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("campaigns.id", ondelete="SET NULL"), nullable=True, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content_format: Mapped[str] = mapped_column(
        String(50), default="TEXT"
    )  # TEXT, MARKDOWN, HTML, IMAGE, AUDIO, VIDEO, DOCUMENT
    status: Mapped[str] = mapped_column(
        String(50), default="DRAFT", index=True
    )  # DRAFT, AUDITING, NEEDS_REVIEW, CHANGES_REQUESTED, APPROVED, REJECTED
    verdict: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True
    )  # PASS, NEEDS_REVIEW, FAIL
    platform: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True
    )  # instagram, poster, youtube, etc.

    current_version: Mapped[int] = mapped_column(Integer, default=1)
    compliance_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    creator_id: Mapped[str] = mapped_column(String(100), default="user_creator_01")
    creator_name: Mapped[str] = mapped_column(String(150), default="Alex Rivera")

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    brand: Mapped["BrandProfile"] = relationship("BrandProfile", back_populates="submissions")
    campaign: Mapped[Optional["Campaign"]] = relationship("Campaign", back_populates="submissions")
    revisions: Mapped[List["SubmissionRevision"]] = relationship(
        "SubmissionRevision",
        back_populates="submission",
        cascade="all, delete-orphan",
        order_by="SubmissionRevision.version_number.desc()",
    )
    findings: Mapped[List["AuditFinding"]] = relationship(
        "AuditFinding", back_populates="submission", cascade="all, delete-orphan"
    )
    workflow_events: Mapped[List["WorkflowEvent"]] = relationship(
        "WorkflowEvent",
        back_populates="submission",
        cascade="all, delete-orphan",
        order_by="WorkflowEvent.created_at.desc()",
    )
    comments: Mapped[List["ReviewComment"]] = relationship(
        "ReviewComment",
        back_populates="submission",
        cascade="all, delete-orphan",
        order_by="ReviewComment.created_at.asc()",
    )


class SubmissionRevision(Base):
    __tablename__ = "submission_revisions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    submission_id: Mapped[int] = mapped_column(
        ForeignKey("submissions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    content_body: Mapped[str] = mapped_column(Text, default="")
    media_urls: Mapped[List[str]] = mapped_column(JSONB, default=list)
    alt_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    compliance_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    ai_governance_metadata: Mapped[Dict[str, Any]] = mapped_column(JSONB, default=dict)
    change_summary: Mapped[str] = mapped_column(String(255), default="Initial draft created")
    created_by: Mapped[str] = mapped_column(String(100), default="user_creator_01")

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    submission: Mapped["Submission"] = relationship("Submission", back_populates="revisions")
