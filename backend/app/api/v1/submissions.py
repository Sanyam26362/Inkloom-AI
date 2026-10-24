from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

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
from app.services.document_service import DocumentService
from app.services.workflow_service import WorkflowService
from app.services.gemini_service import gemini_service
from app.services.cloudinary_service import (
    CloudinaryConfigurationError,
    CloudinaryUploadError,
    cloudinary_service,
)
from app.services.rule_engine import FindingDraft

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
    event: Optional[str] = None,
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

    audit_metadata = {"campaign_event": event} if event else None
    audit_result = await AuditService.run_audit(
        session=session,
        submission=submission,
        revision=latest_rev,
        actor_id=user.user_id,
        actor_name=user.user_name,
        actor_role=user.role.value,
        additional_metadata=audit_metadata,
    )
    return audit_result


@router.post("/{submission_id}/upload-image", response_model=AuditExecutionResponse)
async def upload_image_and_audit(
    submission_id: int,
    file: UploadFile = File(...),
    event: Optional[str] = None,
    session: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    """
    Uploads an image (PNG, JPG, WEBP, max 10MB) to the configured media provider:
    - Uses Cloudinary when configured, otherwise backend/uploads for local development
    - Persists only a playable URL and safe asset metadata in PostgreSQL
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

    try:
        DocumentService.analyze_image(image_bytes)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    try:
        cloudinary_asset = await cloudinary_service.upload(
            data=image_bytes,
            filename=file.filename or "upload.png",
            mime_type=content_type,
            resource_type="image",
            submission_id=submission_id,
        )
    except CloudinaryConfigurationError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except CloudinaryUploadError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    file_ref = cloudinary_asset.get("secure_url")
    if not file_ref:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="The media provider did not return a secure media URL.")

    # Store the upload as a new revision instead of overwriting a prior text,
    # audio, or video revision. This keeps the audit trail and displayed content
    # aligned with the newly uploaded image.
    submission.content_format = "IMAGE"
    new_version = (submission.current_version or 0) + 1
    submission.current_version = new_version
    current_rev = SubmissionRevision(
        submission_id=submission.id,
        version_number=new_version,
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
        additional_metadata={"storage": cloudinary_asset, "campaign_event": event},
        campaign_event=event,
    )
    return audit_result


@router.post("/{submission_id}/upload-audio", response_model=AuditExecutionResponse)
async def upload_audio_and_audit(
    submission_id: int,
    file: UploadFile = File(...),
    event: Optional[str] = None,
    session: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    """
    Uploads an audio file (MP3, WAV, M4A, max 25MB) to the configured media provider:
    - Stores the original audio remotely when Cloudinary is configured, otherwise locally
    - Persists only its URL/metadata in PostgreSQL
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

    try:
        cloudinary_asset = await cloudinary_service.upload(
            data=audio_bytes,
            filename=file.filename or "upload.mp3",
            mime_type=content_type,
            resource_type="video",
            submission_id=submission_id,
        )
    except CloudinaryConfigurationError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except CloudinaryUploadError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    audio_url = cloudinary_asset.get("secure_url")
    if not audio_url:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="The media provider did not return a secure audio URL.")

    # Transcribe via Gemini
    try:
        transcript = await gemini_service.transcribe_audio(audio_bytes=audio_bytes, mime_type=content_type)
        transcribe_error = None
    except Exception as exc:
        transcript = None
        transcribe_error = str(exc)

    if not transcript:
        # Fail closed: Do NOT audit fake placeholder string!
        new_version = (submission.current_version or 0) + 1
        submission.current_version = new_version
        submission.content_format = "AUDIO"
        submission.status = "NEEDS_REVIEW"
        submission.compliance_score = 0.0

        ai_error_msg = f"Audio transcription failed: {transcribe_error or 'No speech detected or provider error'}"
        revision = SubmissionRevision(
            submission_id=submission.id,
            version_number=new_version,
            content_body="",
            media_urls=[audio_url],
            change_summary="Audio transcription failed",
            created_by=user.user_name,
            compliance_score=0.0,
            ai_governance_metadata={
                "storage": cloudinary_asset,
                "ai_status": "failed",
                "ai_error": ai_error_msg,
                "campaign_event": event,
            },
        )
        session.add(revision)
        await session.flush()

        warning_finding = AuditFinding(
            submission_id=submission.id,
            revision_id=revision.id,
            category="ACCESSIBILITY",
            severity="WARNING",
            detector_source="AI_TRANSCRIPTION_ENGINE",
            flagged_excerpt="Audio Transcription Incomplete",
            explanation=f"AI analysis incomplete: {ai_error_msg}",
            guideline_citation="Media Governance Pipeline",
            suggested_correction="Check audio clarity and format, and retry the upload once service is operational.",
            resolution_state="OPEN",
        )
        session.add(warning_finding)

        event_log = WorkflowEvent(
            submission_id=submission.id,
            actor_id=user.user_id,
            actor_name=user.user_name,
            actor_role=user.role.value,
            event_type="AUDIT_COMPLETED",
            from_status="AUDITING",
            to_status="NEEDS_REVIEW",
            notes=f"Audit failed closed: {ai_error_msg}",
            metadata_json={"ai_status": "failed", "ai_error": ai_error_msg},
        )
        session.add(event_log)
        await session.commit()
        await session.refresh(warning_finding)

        return {
            "submission_id": submission.id,
            "revision_id": revision.id,
            "version_number": new_version,
            "compliance_score": 0.0,
            "status": "NEEDS_REVIEW",
            "total_findings": 1,
            "findings_by_severity": {"CRITICAL": 0, "WARNING": 1, "SUGGESTION": 0},
            "findings": [warning_finding],
            "confidentiality_report": {},
            "transcript": "",
            "ai_status": "failed",
            "ai_error": ai_error_msg,
        }

    # Create new revision with transcript
    new_version = (submission.current_version or 0) + 1
    submission.current_version = new_version
    submission.content_format = "AUDIO"

    revision = SubmissionRevision(
        submission_id=submission.id,
        version_number=new_version,
        content_body=transcript,
        media_urls=[audio_url],
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
        additional_metadata={
            "storage": cloudinary_asset,
            "media_pipeline": f"{cloudinary_asset.get('provider', 'media_storage')}->transcript->text_audit",
            "campaign_event": event,
        },
    )
    audit_result["transcript"] = transcript
    return audit_result


@router.post("/{submission_id}/upload-video", response_model=AuditExecutionResponse)
async def upload_video_and_audit(
    submission_id: int,
    file: UploadFile = File(...),
    event: Optional[str] = None,
    session: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    """
    Uploads a video (MP4, MOV, WEBM, M4V, max 100MB) to the configured media provider, extracts
    dialogue and representative visual frames, then combines text and visual audits.

    Keeping the extracted transcript in a normal revision means reviewers can edit
    the copy, apply safe fixes, comment, and approve it using the existing workflow.
    The original media is retained by the selected provider and only its URL/metadata
    is stored on that revision for playback in the UI.
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

    try:
        cloudinary_asset = await cloudinary_service.upload(
            data=video_bytes,
            filename=file.filename or "upload.mp4",
            mime_type=content_type,
            resource_type="video",
            submission_id=submission_id,
        )
    except CloudinaryConfigurationError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except CloudinaryUploadError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    video_url = cloudinary_asset.get("secure_url")
    public_id = cloudinary_asset.get("public_id")
    if not video_url:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="The media provider did not return a playable video URL.")

    try:
        transcript = await gemini_service.transcribe_video(video_bytes=video_bytes, mime_type=content_type)
        transcribe_error = None
    except Exception as exc:
        transcript = None
        transcribe_error = str(exc)

    if not transcript:
        # Fail closed: Do NOT audit fake placeholder string!
        new_version = (submission.current_version or 0) + 1
        submission.current_version = new_version
        submission.content_format = "VIDEO"
        submission.status = "NEEDS_REVIEW"
        submission.compliance_score = 0.0

        ai_error_msg = f"Video transcription failed: {transcribe_error or 'No dialogue/text detected or provider error'}"
        revision = SubmissionRevision(
            submission_id=submission.id,
            version_number=new_version,
            content_body="",
            media_urls=[video_url],
            change_summary="Video transcription failed",
            created_by=user.user_name,
            compliance_score=0.0,
            ai_governance_metadata={
                "storage": cloudinary_asset,
                "ai_status": "failed",
                "ai_error": ai_error_msg,
                "campaign_event": event,
            },
        )
        session.add(revision)
        await session.flush()

        warning_finding = AuditFinding(
            submission_id=submission.id,
            revision_id=revision.id,
            category="VISUAL",
            severity="WARNING",
            detector_source="AI_TRANSCRIPTION_ENGINE",
            flagged_excerpt="Video Transcription Incomplete",
            explanation=f"AI analysis incomplete: {ai_error_msg}",
            guideline_citation="Media Governance Pipeline",
            suggested_correction="Check video format and quality, and retry the upload once service is operational.",
            resolution_state="OPEN",
        )
        session.add(warning_finding)

        event_log = WorkflowEvent(
            submission_id=submission.id,
            actor_id=user.user_id,
            actor_name=user.user_name,
            actor_role=user.role.value,
            event_type="AUDIT_COMPLETED",
            from_status="AUDITING",
            to_status="NEEDS_REVIEW",
            notes=f"Audit failed closed: {ai_error_msg}",
            metadata_json={"ai_status": "failed", "ai_error": ai_error_msg},
        )
        session.add(event_log)
        await session.commit()
        await session.refresh(warning_finding)

        return {
            "submission_id": submission.id,
            "revision_id": revision.id,
            "version_number": new_version,
            "compliance_score": 0.0,
            "status": "NEEDS_REVIEW",
            "total_findings": 1,
            "findings_by_severity": {"CRITICAL": 0, "WARNING": 1, "SUGGESTION": 0},
            "findings": [warning_finding],
            "confidentiality_report": {},
            "transcript": "",
            "ai_status": "failed",
            "ai_error": ai_error_msg,
        }

    new_version = (submission.current_version or 0) + 1
    submission.current_version = new_version
    submission.content_format = "VIDEO"

    revision = SubmissionRevision(
        submission_id=submission.id,
        version_number=new_version,
        content_body=transcript,
        media_urls=[video_url],
        change_summary="Video transcript and on-screen copy ingested for brand audit",
        created_by=user.user_name,
    )
    session.add(revision)
    await session.flush()

    visual_findings: List[FindingDraft] = []
    frame_reports: List[dict] = []
    visible_text: List[str] = []
    dominant_colors: List[str] = []
    palette_matches: List[float] = []

    frames = await cloudinary_service.fetch_video_frames(
        public_id=public_id,
        duration_seconds=cloudinary_asset.get("duration"),
    )
    for frame in frames:
        frame_result = await AuditService.run_image_audit(
            session=session,
            submission=submission,
            revision=revision,
            image_bytes=frame["bytes"],
            mime_type="image/jpeg",
            actor_id=user.user_id,
            actor_name=user.user_name,
            actor_role=user.role.value,
            persist=False,
            campaign_event=event,
        )
        visual_findings.extend(frame_result.get("draft_findings", []))
        visible_text.extend(frame_result.get("visible_text", []))
        dominant_colors.extend(frame_result.get("dominant_colors", []))
        if frame_result.get("palette_match_pct") is not None:
            palette_matches.append(float(frame_result["palette_match_pct"]))
        frame_reports.append(
            {
                "timestamp_seconds": frame["timestamp_seconds"],
                "frame_url": frame["url"],
                "findings_count": len(frame_result.get("draft_findings", [])),
            }
        )

    if not frames:
        visual_findings.append(
            FindingDraft(
                category="VISUAL",
                severity="WARNING",
                detector_source="MEDIA_FRAME_EXTRACTION",
                flagged_excerpt="No representative video frame was audited",
                explanation="The video was uploaded, but no representative frame could be extracted for visual governance.",
                guideline_citation="Media Governance Pipeline",
                suggested_correction="Retry the upload or provide a playable video so visual policy checks can complete.",
            )
        )

    audit_result = await AuditService.run_audit(
        session=session,
        submission=submission,
        revision=revision,
        actor_id=user.user_id,
        actor_name=user.user_name,
        actor_role=user.role.value,
        additional_findings=visual_findings,
        additional_metadata={
            "storage": cloudinary_asset,
            "media_pipeline": f"{cloudinary_asset.get('provider', 'media_storage')}->transcript+frames->text_and_visual_audit",
            "visual_frame_count": len(frames),
            "visual_frames": frame_reports,
            "visual_visible_text": sorted(set(visible_text)),
            "visual_dominant_colors": sorted(set(dominant_colors)),
            "visual_palette_match_pct": min(palette_matches) if palette_matches else None,
            "campaign_event": event,
        },
    )
    submission.content_format = "VIDEO"
    await session.commit()
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
