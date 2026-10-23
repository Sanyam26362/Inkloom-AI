import base64
import logging
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import CurrentUser, get_current_user
from app.models.submission import Submission, SubmissionRevision
from app.models.finding import AuditFinding
from app.models.workflow import WorkflowEvent, ReviewComment
from app.schemas.submission import (
    SubmissionCreate,
    SubmissionResponse,
    SubmissionRevisionCreate,
    SubmissionRevisionResponse,
    AuditExecutionResponse,
)
from app.schemas.finding import (
    AuditFindingResponse,
    AuditFindingOverrideRequest,
    AuditFindingResolveRequest,
)
from app.schemas.workflow import (
    ReviewCommentCreate,
    ReviewCommentResponse,
    WorkflowEventResponse,
    StatusChangeRequest,
)
from app.services.audit_service import AuditService
from app.services.workflow_service import WorkflowService
from app.services.gemini_service import gemini_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/submissions", tags=["Content Submissions & Governance Workflow"])



@router.post("", response_model=SubmissionResponse, status_code=status.HTTP_201_CREATED)
async def create_submission(
    payload: SubmissionCreate,
    session: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> Submission:
    """Creates a new content draft submission along with its initial version 1 revision."""
    submission = Submission(
        brand_id=payload.brand_id,
        title=payload.title,
        content_format=payload.content_format,
        status="DRAFT",
        current_version=1,
        creator_id=user.user_id,
        creator_name=user.user_name,
    )
    session.add(submission)
    await session.flush()

    # Create Initial Revision
    revision = SubmissionRevision(
        submission_id=submission.id,
        version_number=1,
        content_body=payload.initial_content,
        media_urls=payload.media_urls,
        alt_text=payload.alt_text,
        change_summary="Initial copy created",
        created_by=user.user_name,
    )
    session.add(revision)

    # Initial Workflow Event
    event = WorkflowEvent(
        submission_id=submission.id,
        actor_id=user.user_id,
        actor_name=user.user_name,
        actor_role=user.role.value,
        event_type="CREATED",
        from_status=None,
        to_status="DRAFT",
        notes="Initial draft submission created.",
    )
    session.add(event)
    await session.commit()

    # Reload with relationships
    stmt = (
        select(Submission)
        .options(selectinload(Submission.revisions), selectinload(Submission.findings))
        .where(Submission.id == submission.id)
    )
    res = await session.execute(stmt)
    return res.scalar_one()


@router.get("", response_model=List[SubmissionResponse])
async def list_submissions(
    brand_id: int,
    status_filter: Optional[str] = None,
    session: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> List[Submission]:
    """Lists all submissions for a brand with optional status filtering."""
    stmt = (
        select(Submission)
        .options(selectinload(Submission.revisions), selectinload(Submission.findings))
        .where(Submission.brand_id == brand_id)
        .order_by(Submission.created_at.desc())
    )
    if status_filter:
        stmt = stmt.where(Submission.status == status_filter.upper())

    result = await session.execute(stmt)
    return list(result.scalars().all())


@router.get("/{submission_id}", response_model=SubmissionResponse)
async def get_submission(
    submission_id: int,
    session: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> Submission:
    """Retrieves full submission details including revisions and audit findings."""
    stmt = (
        select(Submission)
        .options(selectinload(Submission.revisions), selectinload(Submission.findings))
        .where(Submission.id == submission_id)
    )
    res = await session.execute(stmt)
    submission = res.scalar_one_or_none()
    if not submission:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
    return submission


@router.post("/{submission_id}/audit", response_model=AuditExecutionResponse)
async def execute_audit(
    submission_id: int,
    session: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    """
    Executes brand governance audit on current submission revision:
    Scrubs PII, runs deterministic rules, retrieves RAG guidelines via pgvector,
    calls Gemini structured analysis, computes compliance score, and logs audit events.
    """
    stmt = (
        select(Submission)
        .options(selectinload(Submission.revisions))
        .where(Submission.id == submission_id)
    )
    res = await session.execute(stmt)
    submission = res.scalar_one_or_none()
    if not submission:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")

    if not submission.revisions:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No revision found to audit")

    # Get latest revision
    latest_rev = max(submission.revisions, key=lambda r: r.version_number)

    audit_result = await AuditService.run_audit(
        session=session,
        submission=submission,
        revision=latest_rev,
        actor_id=user.user_id,
        actor_name=user.user_name,
        actor_role=user.role.value,
    )
    return audit_result


@router.post("/{submission_id}/upload-image", response_model=AuditExecutionResponse)
async def upload_image_and_audit(
    submission_id: int,
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    """
    Uploads an image (PNG, JPG, WEBP, max 10MB) for multimodal brand visual governance audit:
    - Encodes image to base64 and saves to uploads
    - Audits visual palette compliance, text contrast (WCAG AA 4.5:1), visible copy against banned terms, and factual claims
    - Persists visual audit findings and returns AuditExecutionResponse
    """
    stmt = (
        select(Submission)
        .options(selectinload(Submission.revisions))
        .where(Submission.id == submission_id)
    )
    res = await session.execute(stmt)
    submission = res.scalar_one_or_none()
    if not submission:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")

    # Validate image MIME
    content_type = file.content_type or ""
    allowed_mimes = ["image/png", "image/jpeg", "image/jpg", "image/webp"]
    if content_type.lower() not in allowed_mimes:
        ext = (file.filename or "").split(".")[-1].lower()
        if ext in ["png", "jpg", "jpeg", "webp"]:
            content_type = f"image/{'jpeg' if ext in ['jpg', 'jpeg'] else ext}"
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported image format '{content_type}'. Supported formats: PNG, JPG, WEBP.",
            )

    # Read bytes and check size (max 10MB)
    image_bytes = await file.read()
    max_size = 10 * 1024 * 1024
    if len(image_bytes) > max_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Image file exceeds maximum allowable size of 10MB (file size: {round(len(image_bytes)/(1024*1024), 2)}MB).",
        )

    # Base64 data URI
    b64_data = base64.b64encode(image_bytes).decode("utf-8")
    data_uri = f"data:{content_type};base64,{b64_data}"

    # Also persist to uploads directory
    try:
        ext = file.filename.split(".")[-1] if file.filename and "." in file.filename else "png"
        saved_filename = f"sub_{submission_id}_{uuid.uuid4().hex[:8]}.{ext}"
        save_path = settings.upload_path / saved_filename
        with open(save_path, "wb") as f_out:
            f_out.write(image_bytes)
        file_ref = data_uri
    except Exception as e:
        logger.warning(f"Could not write file to upload_path: {e}")
        file_ref = data_uri

    # Update or create revision
    submission.content_format = "IMAGE"
    if submission.revisions:
        latest_rev = max(submission.revisions, key=lambda r: r.version_number)
        latest_rev.media_urls = [file_ref]
        current_rev = latest_rev
    else:
        current_rev = SubmissionRevision(
            submission_id=submission.id,
            version_number=1,
            content_body="Visual Image Asset",
            media_urls=[file_ref],
            change_summary="Uploaded image for visual audit",
            created_by=user.user_name,
        )
        session.add(current_rev)
        await session.flush()

    audit_result = await AuditService.run_image_audit(
        session=session,
        submission=submission,
        revision=current_rev,
        image_bytes=image_bytes,
        mime_type=content_type,
        actor_id=user.user_id,
        actor_name=user.user_name,
        actor_role=user.role.value,
    )
    return audit_result


@router.post("/{submission_id}/upload-audio", response_model=AuditExecutionResponse)
async def upload_audio_and_audit(
    submission_id: int,
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    """
    Uploads an audio file (MP3, WAV, M4A, max 25MB) for transcription and brand governance audit:
    - Transcribes speech using Gemini multimodal audio model
    - Stores transcript as content_body of a new SubmissionRevision
    - Runs complete text governance audit pipeline on transcript
    - Returns AuditExecutionResponse including transcript and findings
    """
    stmt = (
        select(Submission)
        .options(selectinload(Submission.revisions))
        .where(Submission.id == submission_id)
    )
    res = await session.execute(stmt)
    submission = res.scalar_one_or_none()
    if not submission:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")

    # Validate audio MIME or extension
    content_type = file.content_type or ""
    ext = (file.filename or "").split(".")[-1].lower() if file.filename else ""
    valid_exts = ["mp3", "wav", "m4a", "ogg", "aac", "flac"]
    if not (content_type.startswith("audio/") or ext in valid_exts):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported audio format '{content_type}'. Supported formats: MP3, WAV, M4A, OGG, AAC, FLAC.",
        )

    if not content_type or content_type == "application/octet-stream":
        content_type = f"audio/{ext if ext != 'mp3' else 'mpeg'}"

    # Read audio bytes & validate size (max 25MB)
    audio_bytes = await file.read()
    max_size = 25 * 1024 * 1024
    if len(audio_bytes) > max_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Audio file exceeds maximum allowable size of 25MB (file size: {round(len(audio_bytes)/(1024*1024), 2)}MB).",
        )

    # Base64 data URI for playback
    b64_audio = base64.b64encode(audio_bytes).decode("utf-8")
    audio_data_uri = f"data:{content_type};base64,{b64_audio}"

    # Save to uploads
    try:
        saved_filename = f"audio_{submission_id}_{uuid.uuid4().hex[:8]}.{ext or 'mp3'}"
        save_path = settings.upload_path / saved_filename
        with open(save_path, "wb") as f_out:
            f_out.write(audio_bytes)
    except Exception as e:
        logger.warning(f"Could not write audio to upload_path: {e}")

    # Transcribe via Gemini
    transcript = gemini_service.transcribe_audio(audio_bytes=audio_bytes, mime_type=content_type)
    if not transcript:
        transcript = "(No speech or spoken content detected in audio recording)"

    # Create new revision with transcript
    new_version = (submission.current_version or 0) + 1
    submission.current_version = new_version
    submission.content_format = "AUDIO"

    revision = SubmissionRevision(
        submission_id=submission.id,
        version_number=new_version,
        content_body=transcript,
        media_urls=[audio_data_uri],
        change_summary="Audio transcribed and ingested for brand audit",
        created_by=user.user_name,
    )
    session.add(revision)
    await session.flush()

    # Run standard text audit on the transcript
    audit_result = await AuditService.run_audit(
        session=session,
        submission=submission,
        revision=revision,
        actor_id=user.user_id,
        actor_name=user.user_name,
        actor_role=user.role.value,
    )
    audit_result["transcript"] = transcript
    return audit_result


@router.post("/{submission_id}/upload-video", response_model=AuditExecutionResponse)
async def upload_video_and_audit(
    submission_id: int,
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    """
    Uploads a video (MP4, MOV, WEBM, M4V, max 100MB), extracts dialogue and
    meaningful on-screen text, and audits the resulting transcript as governed copy.

    Keeping the extracted transcript in a normal revision means reviewers can edit
    the copy, apply safe fixes, comment, and approve it using the existing workflow.
    The original media is retained on that same revision for playback in the UI.
    """
    stmt = (
        select(Submission)
        .options(selectinload(Submission.revisions))
        .where(Submission.id == submission_id)
    )
    res = await session.execute(stmt)
    submission = res.scalar_one_or_none()
    if not submission:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")

    content_type = file.content_type or ""
    ext = (file.filename or "").split(".")[-1].lower() if file.filename else ""
    valid_exts = ["mp4", "mov", "webm", "m4v", "mkv", "avi"]
    if not (content_type.startswith("video/") or ext in valid_exts):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported video format '{content_type}'. Supported formats: MP4, MOV, WEBM, M4V.",
        )

    if not content_type or content_type == "application/octet-stream":
        mime_by_ext = {
            "mp4": "video/mp4",
            "mov": "video/quicktime",
            "webm": "video/webm",
            "m4v": "video/x-m4v",
            "mkv": "video/x-matroska",
            "avi": "video/x-msvideo",
        }
        content_type = mime_by_ext.get(ext, "video/mp4")

    video_bytes = await file.read()
    max_size = 100 * 1024 * 1024
    if len(video_bytes) > max_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Video file exceeds maximum allowable size of 100MB "
                f"(file size: {round(len(video_bytes) / (1024 * 1024), 2)}MB)."
            ),
        )

    b64_video = base64.b64encode(video_bytes).decode("utf-8")
    video_data_uri = f"data:{content_type};base64,{b64_video}"

    try:
        saved_filename = f"video_{submission_id}_{uuid.uuid4().hex[:8]}.{ext or 'mp4'}"
        save_path = settings.upload_path / saved_filename
        with open(save_path, "wb") as f_out:
            f_out.write(video_bytes)
    except Exception as e:
        logger.warning(f"Could not write video to upload_path: {e}")

    transcript = gemini_service.transcribe_video(video_bytes=video_bytes, mime_type=content_type)
    if not transcript:
        transcript = "(No spoken dialogue or meaningful on-screen text detected in video)"

    new_version = (submission.current_version or 0) + 1
    submission.current_version = new_version
    submission.content_format = "VIDEO"

    revision = SubmissionRevision(
        submission_id=submission.id,
        version_number=new_version,
        content_body=transcript,
        media_urls=[video_data_uri],
        change_summary="Video transcript and on-screen copy ingested for brand audit",
        created_by=user.user_name,
    )
    session.add(revision)
    await session.flush()

    audit_result = await AuditService.run_audit(
        session=session,
        submission=submission,
        revision=revision,
        actor_id=user.user_id,
        actor_name=user.user_name,
        actor_role=user.role.value,
    )
    audit_result["transcript"] = transcript
    return audit_result



@router.post("/{submission_id}/revisions", response_model=SubmissionRevisionResponse, status_code=status.HTTP_201_CREATED)
async def create_revision(
    submission_id: int,
    payload: SubmissionRevisionCreate,
    session: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> SubmissionRevision:
    """
    Creates a new revision with modified copy.
    Resets status to DRAFT to prevent silent inheritance of approvals.
    """
    return await WorkflowService.create_new_revision(
        session=session,
        submission_id=submission_id,
        content_body=payload.content_body,
        change_summary=payload.change_summary,
        media_urls=payload.media_urls,
        alt_text=payload.alt_text,
        user=user,
    )


@router.post("/{submission_id}/status", response_model=SubmissionResponse)
async def update_status(
    submission_id: int,
    payload: StatusChangeRequest,
    session: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> Submission:
    """
    Updates submission status (NEEDS_REVIEW, CHANGES_REQUESTED, APPROVED).
    Requires REVIEWER or MANAGER role for approval.
    """
    await WorkflowService.change_status(
        session=session,
        submission_id=submission_id,
        target_status=payload.target_status,
        notes=payload.notes,
        user=user,
    )

    stmt = (
        select(Submission)
        .options(selectinload(Submission.revisions), selectinload(Submission.findings))
        .where(Submission.id == submission_id)
    )
    res = await session.execute(stmt)
    return res.scalar_one()


@router.post("/{submission_id}/comments", response_model=ReviewCommentResponse, status_code=status.HTTP_201_CREATED)
async def post_comment(
    submission_id: int,
    payload: ReviewCommentCreate,
    session: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> ReviewComment:
    """Posts a human review comment attached to a submission or specific finding."""
    return await WorkflowService.add_comment(
        session=session,
        submission_id=submission_id,
        comment_text=payload.comment_text,
        finding_id=payload.finding_id,
        user=user,
    )


@router.get("/{submission_id}/comments", response_model=List[ReviewCommentResponse])
async def list_comments(
    submission_id: int,
    session: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> List[ReviewComment]:
    """Lists all review comments on a submission."""
    stmt = (
        select(ReviewComment)
        .where(ReviewComment.submission_id == submission_id)
        .order_by(ReviewComment.created_at.asc())
    )
    res = await session.execute(stmt)
    return list(res.scalars().all())


@router.get("/{submission_id}/workflow", response_model=List[WorkflowEventResponse])
async def list_workflow_history(
    submission_id: int,
    session: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> List[WorkflowEvent]:
    """Retrieves full immutable audit trail of workflow events for compliance tracking."""
    stmt = (
        select(WorkflowEvent)
        .where(WorkflowEvent.submission_id == submission_id)
        .order_by(WorkflowEvent.created_at.desc())
    )
    res = await session.execute(stmt)
    return list(res.scalars().all())


@router.post("/findings/{finding_id}/override", response_model=AuditFindingResponse)
async def override_finding(
    finding_id: int,
    payload: AuditFindingOverrideRequest,
    session: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> AuditFinding:
    """
    Allows REVIEWER or MANAGER to override an audit finding with written justification.
    Updates governance statistics for ambiguous guideline detection.
    """
    return await WorkflowService.override_finding(
        session=session,
        finding_id=finding_id,
        reason=payload.reason,
        user=user,
    )


@router.post("/findings/{finding_id}/resolve", response_model=AuditFindingResponse)
async def resolve_finding(
    finding_id: int,
    payload: AuditFindingResolveRequest,
    session: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> AuditFinding:
    """Marks a finding as accepted or resolved."""
    stmt = select(AuditFinding).where(AuditFinding.id == finding_id)
    res = await session.execute(stmt)
    finding = res.scalar_one_or_none()
    if not finding:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Finding not found")

    finding.resolution_state = payload.resolution_state
    finding.resolved_by = user.user_name
    await session.commit()
    await session.refresh(finding)
    return finding
