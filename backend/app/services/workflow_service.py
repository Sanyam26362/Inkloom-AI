from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.submission import Submission, SubmissionRevision
from app.models.finding import AuditFinding
from app.models.guideline_chunk import GuidelineChunk
from app.models.workflow import WorkflowEvent, ReviewComment
from app.core.security import CurrentUser, UserRole


class WorkflowService:
    """Manages brand governance lifecycle transitions, reviews, approvals, overrides, and revisions."""

    @classmethod
    async def create_new_revision(
        cls,
        session: AsyncSession,
        submission_id: int,
        content_body: str,
        user: CurrentUser,
        change_summary: str = "Applied governance corrections",
        media_urls: Optional[List[str]] = None,
        alt_text: Optional[str] = None,
    ) -> SubmissionRevision:
        """
        Creates a new version for a submission.
        Guarantees that a revision resets status to DRAFT or NEEDS_REVIEW and never inherits approval.
        """
        stmt = select(Submission).where(Submission.id == submission_id)
        res = await session.execute(stmt)
        submission = res.scalar_one_or_none()
        if not submission:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")

        # Increment version
        new_version = submission.current_version + 1
        submission.current_version = new_version
        old_status = submission.status
        submission.status = "DRAFT"  # Reset approval status
        submission.compliance_score = None  # Requires re-audit

        revision = SubmissionRevision(
            submission_id=submission.id,
            version_number=new_version,
            content_body=content_body,
            media_urls=media_urls or [],
            alt_text=alt_text,
            change_summary=change_summary,
            created_by=user.user_name,
        )
        session.add(revision)

        event = WorkflowEvent(
            submission_id=submission.id,
            actor_id=user.user_id,
            actor_name=user.user_name,
            actor_role=user.role.value,
            event_type="REVISION_CREATED",
            from_status=old_status,
            to_status="DRAFT",
            notes=f"Created version {new_version}: {change_summary}",
            metadata_json={"new_version": new_version, "change_summary": change_summary},
        )
        session.add(event)
        await session.commit()
        await session.refresh(revision)
        return revision

    @classmethod
    async def override_finding(
        cls,
        session: AsyncSession,
        finding_id: int,
        reason: str,
        user: CurrentUser,
    ) -> AuditFinding:
        """
        Allows REVIEWER or MANAGER to override a finding with a required written justification.
        Increments times_overridden on the cited guideline chunk for governance analytics.
        """
        if user.role not in (UserRole.REVIEWER, UserRole.MANAGER):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only REVIEWER or MANAGER role can override audit findings.",
            )

        stmt = select(AuditFinding).where(AuditFinding.id == finding_id)
        res = await session.execute(stmt)
        finding = res.scalar_one_or_none()
        if not finding:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Finding not found")

        finding.resolution_state = "OVERRIDDEN"
        finding.override_reason = reason
        finding.resolved_by = user.user_name
        finding.resolved_at = datetime.now(timezone.utc)

        # Increment guideline chunk override counter if cited
        if finding.cited_chunk_id:
            chunk_stmt = select(GuidelineChunk).where(GuidelineChunk.id == finding.cited_chunk_id)
            c_res = await session.execute(chunk_stmt)
            chunk = c_res.scalar_one_or_none()
            if chunk:
                chunk.times_overridden += 1

        event = WorkflowEvent(
            submission_id=finding.submission_id,
            actor_id=user.user_id,
            actor_name=user.user_name,
            actor_role=user.role.value,
            event_type="FINDING_OVERRIDDEN",
            from_status=None,
            to_status=None,
            notes=f"Finding #{finding.id} ({finding.category}) overridden: {reason}",
            metadata_json={"finding_id": finding.id, "reason": reason, "category": finding.category},
        )
        session.add(event)
        await session.commit()
        await session.refresh(finding)
        return finding

    @classmethod
    async def change_status(
        cls,
        session: AsyncSession,
        submission_id: int,
        target_status: str,
        user: CurrentUser,
        notes: Optional[str] = None,
    ) -> Submission:
        """
        Governs status transitions (NEEDS_REVIEW, CHANGES_REQUESTED, APPROVED).
        Only REVIEWER or MANAGER can APPROVE or CHANGES_REQUESTED.
        """
        valid_statuses = {"DRAFT", "NEEDS_REVIEW", "CHANGES_REQUESTED", "APPROVED"}
        if target_status not in valid_statuses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status: {target_status}. Must be one of {valid_statuses}",
            )

        if target_status in ("APPROVED", "CHANGES_REQUESTED"):
            if user.role not in (UserRole.REVIEWER, UserRole.MANAGER):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Only REVIEWER or MANAGER role can transition status to {target_status}.",
                )

        stmt = select(Submission).where(Submission.id == submission_id)
        res = await session.execute(stmt)
        submission = res.scalar_one_or_none()
        if not submission:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")

        if target_status == "APPROVED":
            if submission.compliance_score is None:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Content must be audited before it can be approved.",
                )
            if submission.compliance_score < 90:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        f"Approval requires a compliance score of at least 90. "
                        f"Current score: {submission.compliance_score}."
                    ),
                )

            latest_revision_stmt = (
                select(SubmissionRevision.id)
                .where(SubmissionRevision.submission_id == submission.id)
                .where(SubmissionRevision.version_number == submission.current_version)
            )
            latest_revision_id = (await session.execute(latest_revision_stmt)).scalar_one_or_none()
            if latest_revision_id is None:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="The current revision must be audited before it can be approved.",
                )
            open_findings_stmt = (
                select(AuditFinding.id)
                .where(AuditFinding.submission_id == submission.id)
                .where(AuditFinding.revision_id == latest_revision_id)
                .where(AuditFinding.resolution_state == "OPEN")
            )
            open_findings = list((await session.execute(open_findings_stmt)).scalars().all())
            if open_findings:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Resolve all open findings before approval. Open findings: {len(open_findings)}.",
                )

        old_status = submission.status
        submission.status = target_status

        event = WorkflowEvent(
            submission_id=submission.id,
            actor_id=user.user_id,
            actor_name=user.user_name,
            actor_role=user.role.value,
            event_type="STATUS_CHANGED",
            from_status=old_status,
            to_status=target_status,
            notes=notes or f"Status changed from {old_status} to {target_status}",
            metadata_json={"from": old_status, "to": target_status, "notes": notes},
        )
        session.add(event)
        await session.commit()
        await session.refresh(submission)
        return submission

    @classmethod
    async def add_comment(
        cls,
        session: AsyncSession,
        submission_id: int,
        comment_text: str,
        user: CurrentUser,
        finding_id: Optional[int] = None,
    ) -> ReviewComment:
        """Adds a human reviewer or creator comment to a submission or specific finding."""
        stmt = select(Submission).where(Submission.id == submission_id)
        res = await session.execute(stmt)
        submission = res.scalar_one_or_none()
        if not submission:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")

        comment = ReviewComment(
            submission_id=submission.id,
            finding_id=finding_id,
            author_id=user.user_id,
            author_name=user.user_name,
            author_role=user.role.value,
            comment_text=comment_text,
        )
        session.add(comment)

        event = WorkflowEvent(
            submission_id=submission.id,
            actor_id=user.user_id,
            actor_name=user.user_name,
            actor_role=user.role.value,
            event_type="COMMENT_ADDED",
            notes=comment_text[:200],
            metadata_json={"finding_id": finding_id},
        )
        session.add(event)
        await session.commit()
        await session.refresh(comment)
        return comment
