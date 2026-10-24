import io
import math
import struct
import wave
import uuid
import pytest
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient, ASGITransport
from PIL import Image

from app.main import app
from app.core.database import AsyncSessionLocal
from app.models.brand import BrandProfile
from app.models.campaign import Campaign
from app.models.ruleset import RuleSet
from app.models.guideline_chunk import GuidelineChunk
from app.models.submission import Submission, SubmissionRevision
from app.core.media_validation import (
    validate_image_bytes,
    validate_audio_bytes,
    validate_video_bytes,
    MAX_IMAGE_SIZE,
    MAX_AUDIO_SIZE,
    MAX_VIDEO_SIZE,
)
from app.services.audit_job_manager import audit_job_manager
from app.services.audit_service import AuditService
from app.services.cloudinary_service import cloudinary_service
from app.core.security import get_auth_headers, UserRole

CREATOR_HEADERS = get_auth_headers(UserRole.CREATOR)

pytestmark = pytest.mark.asyncio


def _make_png_bytes(width: int = 100, height: int = 100, color=(248, 194, 0)) -> bytes:
    buf = io.BytesIO()
    img = Image.new("RGB", (width, height), color=color)
    img.save(buf, format="PNG")
    return buf.getvalue()


def _make_wav_bytes(duration_sec: float = 1.0) -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(44100)
        num_frames = int(44100 * duration_sec)
        for i in range(num_frames):
            val = int(25000.0 * math.sin(2.0 * math.pi * 440.0 * i / 44100.0))
            wav.writeframesraw(struct.pack("<h", val))
    return buf.getvalue()


def _make_mp4_bytes() -> bytes:
    ftyp = b"\x00\x00\x00\x1cftypisom\x00\x00\x02\x00isomiso2mp41"
    moov = b"\x00\x00\x00\x18moov\x00\x00\x00\x10mvhd\x00\x00\x00\x00\x00\x00\x00\x00"
    mdat = b"\x00\x00\x00\x10mdat\x00\x00\x00\x00\x00\x00\x00\x00"
    return ftyp + moov + mdat


async def _create_test_brand_and_campaign(session) -> tuple[BrandProfile, Campaign, RuleSet]:
    uid = uuid.uuid4().hex[:6]
    brand = BrandProfile(
        name=f"MediaBrand_{uid}",
        tone_persona="Warm and friendly",
        approved_hex_palette=["#F8C200", "#1C1C1E", "#FFFFFF"],
        banned_terms=["guaranteed", "instant"],
        preferred_terminology={"app": "Blinkit app"},
        approved_facts=[{"claim": "Over 10,000 products available", "source": "Catalogue", "verified": True}],
    )
    session.add(brand)
    await session.flush()

    campaign = Campaign(
        brand_id=brand.id,
        name="Diwali Festival 2026",
        description="Festive campaign",
        goals="Festive engagement",
        platforms=["instagram", "youtube"],
        content_types=["post", "video", "audio"],
        required_cues=["diya", "mithai"],
        min_required_cues=1,
        prohibited_items=["firecrackers", "sirens"],
        is_active=True,
    )
    session.add(campaign)
    await session.flush()

    ruleset = RuleSet(
        brand_id=brand.id,
        campaign_id=campaign.id,
        version=1,
        palette=["#F8C200", "#1C1C1E", "#FFFFFF"],
        banned_terms=["guaranteed", "instant"],
        preferred_terminology={"app": "Blinkit app"},
        required_phrases=["Blinkit app"],
        exaggeration_terms=["100%", "always"],
        prohibited_visual_subjects=["firecrackers", "sirens"],
        is_active=True,
    )
    session.add(ruleset)

    chunk = GuidelineChunk(
        brand_id=brand.id,
        source_document="brand_guidelines.pdf",
        section_reference="Visual Identity",
        content_text="Approved primary palette is #F8C200 yellow and #1C1C1E black. Never use fireworks.",
        embedding=[0.01] * 768,
        embedding_status="completed",
    )
    session.add(chunk)

    await session.commit()
    return brand, campaign, ruleset


# ── 1. Magic Bytes Validation Tests ──────────────────────────────────────────

async def test_validate_image_bytes():
    png_data = _make_png_bytes(50, 50)
    mime, w, h = validate_image_bytes(png_data, "test.png")
    assert mime == "image/png"
    assert w == 50 and h == 50

    # Corrupted / text bytes pretending to be image
    with pytest.raises(Exception) as exc:
        validate_image_bytes(b"hello text content not image", "fake.png")
    assert "Unsupported image format" in str(exc.value)

    # Oversized image
    with pytest.raises(Exception) as exc:
        validate_image_bytes(b"A" * (MAX_IMAGE_SIZE + 10), "huge.png")
    assert "exceeds maximum allowable size" in str(exc.value)


async def test_validate_audio_bytes():
    wav_data = _make_wav_bytes(0.5)
    mime = validate_audio_bytes(wav_data, "sample.wav")
    assert mime == "audio/wav"

    # Corrupted audio
    with pytest.raises(Exception) as exc:
        validate_audio_bytes(b"not an audio header at all", "fake.wav")
    assert "Unsupported audio format" in str(exc.value)

    # Oversized audio
    with pytest.raises(Exception) as exc:
        validate_audio_bytes(b"A" * (MAX_AUDIO_SIZE + 10), "huge.mp3")
    assert "exceeds maximum allowable size" in str(exc.value)


async def test_validate_video_bytes():
    mp4_data = _make_mp4_bytes()
    mime = validate_video_bytes(mp4_data, "video.mp4")
    assert mime == "video/mp4"

    # Corrupted video
    with pytest.raises(Exception) as exc:
        validate_video_bytes(b"not a video file at all", "fake.mp4")
    assert "Unsupported video format" in str(exc.value)

    # Oversized video
    with pytest.raises(Exception) as exc:
        validate_video_bytes(b"A" * (MAX_VIDEO_SIZE + 10), "huge.mp4")
    assert "exceeds maximum allowable size" in str(exc.value)


# ── 2. Storage Provider and Fallback Reason Tracking ─────────────────────────

async def test_storage_provider_tracking(monkeypatch):
    data = _make_png_bytes(40, 40)
    # Upload locally
    res = cloudinary_service._local_upload(
        data=data,
        filename="local_test.png",
        mime_type="image/png",
        resource_type="image",
        submission_id=999,
        fallback_reason="Cloudinary credentials not configured; stored locally.",
    )
    assert res["provider"] == "local"
    assert "fallback_reason" in res
    assert "Cloudinary credentials not configured" in res["fallback_reason"]
    assert res["secure_url"].startswith("http")


# ── 3. Post Upload and Platform Specifications ───────────────────────────────

async def test_upload_post_platform_aspect_ratio_and_caption_checks():
    async with AsyncSessionLocal() as session:
        brand, campaign, ruleset = await _create_test_brand_and_campaign(session)

        submission = Submission(
            brand_id=brand.id,
            campaign_id=campaign.id,
            platform="instagram",
            title="Instagram Festive Post",
            content_format="POST",
            status="DRAFT",
            creator_id="creator_1",
            creator_name="Test Creator",
        )
        session.add(submission)
        await session.commit()
        await session.refresh(submission)
        submission_id = submission.id

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Test 1: Valid 1:1 image, good caption, good alt text
        valid_png = _make_png_bytes(1080, 1080, color=(248, 194, 0))
        res = await client.post(
            f"/api/v1/submissions/{submission_id}/upload-post",
            data={
                "caption": "Order fresh festive sweets on the Blinkit app today!",
                "hashtags": "#Diwali #Celebration",
                "alt_text": "Diwali sweets box with golden festive ribbons and diya decoration",
                "platform": "instagram",
            },
            files={"file": ("post.png", valid_png, "image/png")},
            headers=CREATOR_HEADERS,
        )
        assert res.status_code == 200
        data = res.json()
        assert data["submission_id"] == submission_id
        assert data["verdict"] in ("PASS", "NEEDS_REVIEW")
        # No aspect ratio warning
        assert not any("Aspect ratio" in f["flagged_excerpt"] for f in data["findings"])
        # No alt text warning
        assert not any("Alt Text" in f["flagged_excerpt"] for f in data["findings"])

        # Test 2: Invalid aspect ratio (e.g. 16:9 banner: 1600x900) + missing alt text + long caption
        weird_png = _make_png_bytes(1600, 600)  # ~2.67:1 ratio
        long_caption = "A" * 2250  # Exceeds 2200 chars

        res_invalid = await client.post(
            f"/api/v1/submissions/{submission_id}/upload-post",
            data={
                "caption": long_caption,
                "hashtags": "#TooLong",
                "alt_text": "",  # Missing alt text -> CRITICAL
                "platform": "instagram",
            },
            files={"file": ("banner.png", weird_png, "image/png")},
            headers=CREATOR_HEADERS,
        )
        assert res_invalid.status_code == 200
        data_invalid = res_invalid.json()
        assert data_invalid["verdict"] in ("FAIL", "NEEDS_REVIEW")
        flagged = [f["flagged_excerpt"] for f in data_invalid["findings"]]
        # Must flag aspect ratio warning
        assert any("Aspect ratio" in item for item in flagged)
        # Must flag caption length critical
        assert any("Caption length" in item for item in flagged)
        # Must flag missing alt text critical
        assert any("Missing Image Alt Text" in item for item in flagged)


# ── 4. Background Audits & Real-Time Status Polling ──────────────────────────

async def test_background_audit_and_status_polling():
    async with AsyncSessionLocal() as session:
        brand, campaign, _ = await _create_test_brand_and_campaign(session)
        sub = Submission(
            brand_id=brand.id,
            campaign_id=campaign.id,
            platform="instagram",
            title="Async Audit Submission",
            content_format="POST",
            status="DRAFT",
            creator_id="creator_2",
            creator_name="Test Creator",
        )
        session.add(sub)
        await session.commit()
        await session.refresh(sub)
        sub_id = sub.id

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Trigger upload with background=true
        png_data = _make_png_bytes(1080, 1080)
        res = await client.post(
            f"/api/v1/submissions/{sub_id}/upload-post?background=true",
            data={
                "caption": "Enjoy fresh groceries with the Blinkit app.",
                "alt_text": "A colorful basket of fresh apples and mangoes",
                "platform": "instagram",
            },
            files={"file": ("post.png", png_data, "image/png")},
            headers=CREATOR_HEADERS,
        )
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "queued"
        assert data["progress"] is not None

        # Poll status
        status_res = await client.get(
            f"/api/v1/submissions/{sub_id}/audit-status",
            headers=CREATOR_HEADERS,
        )
        assert status_res.status_code == 200
        status_data = status_res.json()
        assert status_data["submission_id"] == sub_id
        assert status_data["status"] in ("queued", "running", "done")
        assert "progress" in status_data
        assert "current_step" in status_data


# ── 5. Native Audio Pipeline Tests ───────────────────────────────────────────

async def test_native_audio_pipeline_tone_sfx_and_phrases():
    async with AsyncSessionLocal() as session:
        brand, campaign, ruleset = await _create_test_brand_and_campaign(session)
        sub = Submission(
            brand_id=brand.id,
            campaign_id=campaign.id,
            platform="instagram",
            title="Audio Ad",
            content_format="AUDIO",
            status="DRAFT",
            creator_id="creator_3",
            creator_name="Test Creator",
        )
        session.add(sub)
        await session.commit()
        await session.refresh(sub)
        sub_id = sub.id

    wav_bytes = _make_wav_bytes(1.0)

    # Mock native Gemini audio response with prohibited SFX and missing required phrase
    mock_audio_output = {
        "transcript": "Get instant grocery delivery with guaranteed 10 minute speed.",
        "voiceover_tone": "Aggressive and rushed",
        "voiceover_tone_acceptable": False,
        "detected_sound_effects": ["firecrackers", "car horns"],
        "prohibited_sfx_found": ["firecrackers"],
        "background_music_assessment": "Overpowering music volume",
        "required_phrases_found": [],
        "required_phrases_missing": ["Blinkit app"],
        "findings": [
            {
                "category": "TONE",
                "severity": "WARNING",
                "flagged_excerpt": "Aggressive tone",
                "timestamp_start_sec": 0.2,
                "timestamp_end_sec": 0.8,
                "explanation": "Tone sounds rushed and aggressive",
                "suggested_correction": "Slow down and adopt a warm, friendly voiceover tone",
            }
        ],
        "ai_status": "ok",
        "ai_error": None,
    }

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        with patch("app.services.gemini_service.gemini_service.audit_audio", new_callable=AsyncMock) as mock_gemini:
            mock_gemini.return_value = mock_audio_output

            res = await client.post(
                f"/api/v1/submissions/{sub_id}/upload-audio",
                files={"file": ("voiceover.wav", wav_bytes, "audio/wav")},
                headers=CREATOR_HEADERS,
            )
            assert res.status_code == 200
            data = res.json()
            assert data["submission_id"] == sub_id
            assert data["verdict"] in ("FAIL", "NEEDS_REVIEW")
            assert data["transcript"] is not None

            flagged = [f["flagged_excerpt"] for f in data["findings"]]
            # Prohibited SFX must trigger
            assert any("firecrackers" in item for item in flagged)
            # Missing required phrase must trigger
            assert any("Blinkit app" in item for item in flagged)
            # Voiceover tone must trigger
            assert any("Tone" in item for item in flagged)
            # Banned terms in transcript ("guaranteed", "instant") must be detected
            assert any("guaranteed" in item.lower() for item in flagged)
            assert any("instant" in item.lower() for item in flagged)


# ── 6. Video Pipeline and Frame Extraction Order Tests ───────────────────────

async def test_video_pipeline_frame_extraction_and_end_card():
    async with AsyncSessionLocal() as session:
        brand, campaign, ruleset = await _create_test_brand_and_campaign(session)
        sub = Submission(
            brand_id=brand.id,
            campaign_id=campaign.id,
            platform="youtube",
            title="Video Commercial",
            content_format="VIDEO",
            status="DRAFT",
            creator_id="creator_4",
            creator_name="Test Creator",
        )
        session.add(sub)
        await session.commit()
        await session.refresh(sub)
        sub_id = sub.id

    mp4_bytes = _make_mp4_bytes()

    # Case A: When Cloudinary and ffmpeg are both unavailable -> fail closed gracefully with partial warning
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        with patch("app.services.cloudinary_service.cloudinary_service.extract_video_frames", new_callable=AsyncMock) as mock_extract, \
             patch("app.services.gemini_service.gemini_service.transcribe_video", new_callable=AsyncMock) as mock_transcribe:
            mock_extract.return_value = []
            mock_transcribe.return_value = "Shop on the Blinkit app."

            res = await client.post(
                f"/api/v1/submissions/{sub_id}/upload-video",
                files={"file": ("spot.mp4", mp4_bytes, "video/mp4")},
                headers=CREATOR_HEADERS,
            )
            assert res.status_code == 200
            data = res.json()
            assert data["ai_status"] == "partial"
            flagged = [f["flagged_excerpt"] for f in data["findings"]]
            assert any("video visuals not analysed" in item for item in flagged)

        # Case B: When frames ARE extracted -> verifies parallel audit and end-card palette check
        frame_1 = {"timestamp_seconds": 0.0, "url": "frame0.jpg", "bytes": _make_png_bytes(color=(248, 194, 0))}
        # Final frame (end card) in off-brand color (e.g. bright blue #0000FF)
        frame_end = {"timestamp_seconds": 5.0, "url": "frame5.jpg", "bytes": _make_png_bytes(color=(0, 0, 255))}

        with patch("app.services.cloudinary_service.cloudinary_service.extract_video_frames", new_callable=AsyncMock) as mock_extract, \
             patch("app.services.gemini_service.gemini_service.transcribe_video", new_callable=AsyncMock) as mock_transcribe:
            mock_extract.return_value = [frame_1, frame_end]
            mock_transcribe.return_value = "Order fresh festive sweets on the Blinkit app."

            res_frames = await client.post(
                f"/api/v1/submissions/{sub_id}/upload-video",
                files={"file": ("spot.mp4", mp4_bytes, "video/mp4")},
                headers=CREATOR_HEADERS,
            )
            assert res_frames.status_code == 200
            data_frames = res_frames.json()
            flagged = [f["flagged_excerpt"] for f in data_frames["findings"]]
            # End card palette check should flag the off-brand final frame
            assert any("End card" in item for item in flagged)
            # Timestamps should be tagged on findings
            assert any(item.startswith("[") for item in flagged)
