import hashlib
import logging
import os
import shutil
import subprocess
import tempfile
import time
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib.parse import urlencode

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class CloudinaryConfigurationError(RuntimeError):
    """Raised when a partially filled Cloudinary configuration is invalid."""


class CloudinaryUploadError(RuntimeError):
    """Raised when Cloudinary rejects or cannot complete an upload."""


class CloudinaryService:
    """Media storage adapter with Cloudinary and local-development providers.

    Cloudinary is used when all three credentials are present. When credentials
    are intentionally blank or upload fails, the adapter writes to the backend's
    local uploads directory and returns a local media URL.
    Every upload records both 'provider' and 'fallback_reason' (no silent fallbacks).
    """

    @staticmethod
    def _signature(params: Dict[str, str]) -> str:
        serialized = urlencode(sorted((key, value) for key, value in params.items()))
        return hashlib.sha1(f"{serialized}{settings.CLOUDINARY_API_SECRET}".encode("utf-8")).hexdigest()

    @classmethod
    def _require_configuration(cls) -> None:
        if not settings.cloudinary_configured:
            raise CloudinaryConfigurationError(
                "Cloudinary configuration is incomplete. Set all of "
                "CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and "
                "CLOUDINARY_API_SECRET in backend/.env, or leave all three blank "
                "to use local storage."
            )

    @classmethod
    async def upload(
        cls,
        data: bytes,
        filename: str,
        mime_type: str,
        resource_type: str,
        submission_id: int,
    ) -> Dict[str, Any]:
        """Uploads media and returns safe delivery/storage metadata with explicit provider & fallback_reason."""
        if not settings.cloudinary_configured:
            if settings.cloudinary_partially_configured:
                cls._require_configuration()
            return cls._local_upload(
                data=data,
                filename=filename,
                mime_type=mime_type,
                resource_type=resource_type,
                submission_id=submission_id,
                fallback_reason="Cloudinary credentials not configured; stored locally.",
            )

        cls._require_configuration()

        timestamp = str(int(time.time()))
        folder = f"{settings.CLOUDINARY_FOLDER}/brand-{submission_id}"
        signed_params = {"folder": folder, "timestamp": timestamp}
        endpoint = (
            f"https://api.cloudinary.com/v1_1/{settings.CLOUDINARY_CLOUD_NAME}/"
            f"{resource_type}/upload"
        )
        form_data = {
            **signed_params,
            "api_key": settings.CLOUDINARY_API_KEY,
            "signature": cls._signature(signed_params),
        }

        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    endpoint,
                    data=form_data,
                    files={"file": (Path(filename).name, data, mime_type)},
                )
            if response.is_error:
                err_text = response.text[:200]
                logger.warning(f"Cloudinary upload rejected with status {response.status_code}: {err_text}")
                return cls._local_upload(
                    data=data,
                    filename=filename,
                    mime_type=mime_type,
                    resource_type=resource_type,
                    submission_id=submission_id,
                    fallback_reason=f"Cloudinary returned HTTP {response.status_code} ({err_text}); fell back to local storage.",
                )
        except Exception as exc:
            logger.warning(f"Cloudinary upload failed with exception: {exc}")
            return cls._local_upload(
                data=data,
                filename=filename,
                mime_type=mime_type,
                resource_type=resource_type,
                submission_id=submission_id,
                fallback_reason=f"Cloudinary upload network/client failure ({exc}); fell back to local storage.",
            )

        try:
            payload = response.json()
        except (TypeError, ValueError) as exc:
            raise CloudinaryUploadError("Cloudinary returned an invalid upload response.") from exc

        return {
            "provider": "cloudinary",
            "fallback_reason": None,
            "secure_url": payload.get("secure_url"),
            "public_id": payload.get("public_id"),
            "resource_type": payload.get("resource_type", resource_type),
            "format": payload.get("format"),
            "bytes": payload.get("bytes"),
            "width": payload.get("width"),
            "height": payload.get("height"),
            "duration": payload.get("duration"),
            "asset_id": payload.get("asset_id"),
            "version": payload.get("version"),
            "original_filename": payload.get("original_filename", Path(filename).stem),
        }

    @staticmethod
    def _local_upload(
        data: bytes,
        filename: str,
        mime_type: str,
        resource_type: str,
        submission_id: int,
        fallback_reason: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Persist an upload locally and record provider and explicit fallback_reason."""
        suffix = Path(filename).suffix.lower()
        if not suffix or not suffix[1:].isalnum() or len(suffix) > 10:
            suffix = ".bin"

        stored_name = f"submission_{submission_id}_{uuid.uuid4().hex}{suffix}"
        stored_path = settings.upload_path / stored_name
        stored_path.write_bytes(data)

        base_url = settings.MEDIA_PUBLIC_BASE_URL.rstrip("/")
        return {
            "provider": "local",
            "fallback_reason": fallback_reason or "Stored in local media uploads.",
            "secure_url": f"{base_url}/uploads/{stored_name}",
            "public_id": None,
            "resource_type": resource_type,
            "format": suffix[1:],
            "bytes": len(data),
            "mime_type": mime_type,
            "width": None,
            "height": None,
            "duration": None,
            "asset_id": None,
            "version": None,
            "original_filename": Path(filename).name,
            "storage_path": str(stored_path),
        }

    @classmethod
    async def extract_video_frames(
        cls,
        video_bytes: Optional[bytes] = None,
        public_id: Optional[str] = None,
        duration_seconds: Optional[float] = None,
        max_frames: int = 8,
    ) -> List[Dict[str, Any]]:
        """
        Extracts up to max_frames (~8) representative video frames.
        Execution Order per Environment Facts:
        1. Cloudinary transformations first (if Cloudinary configured & public_id exists)
        2. Local ffmpeg if available (if shutil.which("ffmpeg") is not None)
        3. Returns empty list if neither works (caller records 'video visuals not analysed' without crashing).
        """
        duration = max(float(duration_seconds or 5.0), 1.0)

        # Compute sample offsets up to max_frames (e.g. 8)
        if duration <= 2.0:
            offsets = [0.0, round(duration * 0.5, 2), round(max(duration - 0.1, 0.0), 2)]
        elif duration <= 8.0:
            step = duration / float(max(max_frames - 1, 1))
            offsets = [round(i * step, 2) for i in range(max_frames)]
        else:
            # 8 frames: 0s, 10%, 25%, 40%, 60%, 75%, 90%, 98%
            pcts = [0.0, 0.10, 0.25, 0.40, 0.60, 0.75, 0.90, 0.98]
            offsets = [round(p * duration, 2) for p in pcts[:max_frames]]
        offsets = sorted(set(offsets))

        # 1. Try Cloudinary frames first
        if settings.cloudinary_configured and public_id:
            try:
                frames = await cls._fetch_cloudinary_frames(public_id, offsets)
                if frames:
                    logger.info(f"Extracted {len(frames)} video frames via Cloudinary transformations.")
                    return frames
            except Exception as e:
                logger.warning(f"Cloudinary video frame extraction failed: {e}")

        # 2. Try local ffmpeg if available
        ffmpeg_bin = shutil.which("ffmpeg")
        if ffmpeg_bin and video_bytes:
            try:
                frames = cls._extract_frames_with_ffmpeg(video_bytes, offsets)
                if frames:
                    logger.info(f"Extracted {len(frames)} video frames via local ffmpeg.")
                    return frames
            except Exception as e:
                logger.warning(f"Local ffmpeg video frame extraction failed: {e}")

        # 3. Neither Cloudinary nor ffmpeg succeeded; return empty list (caller fails closed gracefully)
        logger.info("Video frame extraction unavailable (Cloudinary unavailable/failed and ffmpeg not in PATH).")
        return []

    @classmethod
    async def _fetch_cloudinary_frames(
        cls, public_id: str, offsets: List[float]
    ) -> List[Dict[str, Any]]:
        frames: List[Dict[str, Any]] = []
        async with httpx.AsyncClient(timeout=60.0) as client:
            for offset in offsets:
                seconds = f"{offset:g}"
                frame_url = (
                    f"https://res.cloudinary.com/{settings.CLOUDINARY_CLOUD_NAME}/"
                    f"video/upload/so_{seconds},f_jpg/{public_id}.jpg"
                )
                try:
                    response = await client.get(frame_url)
                    if response.is_success and response.content:
                        frames.append(
                            {
                                "timestamp_seconds": offset,
                                "url": frame_url,
                                "bytes": response.content,
                            }
                        )
                except httpx.HTTPError:
                    continue
        return frames

    @classmethod
    def _extract_frames_with_ffmpeg(
        cls, video_bytes: bytes, offsets: List[float]
    ) -> List[Dict[str, Any]]:
        frames: List[Dict[str, Any]] = []
        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp_path = Path(tmp_dir)
            video_file = tmp_path / "input_video.mp4"
            video_file.write_bytes(video_bytes)

            for idx, offset in enumerate(offsets):
                out_frame = tmp_path / f"frame_{idx:03d}.jpg"
                cmd = [
                    "ffmpeg",
                    "-y",
                    "-ss",
                    str(offset),
                    "-i",
                    str(video_file),
                    "-vframes",
                    "1",
                    "-q:v",
                    "2",
                    str(out_frame),
                ]
                try:
                    subprocess.run(
                        cmd,
                        stdout=subprocess.DEVNULL,
                        stderr=subprocess.DEVNULL,
                        timeout=15,
                        check=True,
                    )
                    if out_frame.exists() and out_frame.stat().st_size > 0:
                        frames.append(
                            {
                                "timestamp_seconds": offset,
                                "url": f"frame_at_{offset}s.jpg",
                                "bytes": out_frame.read_bytes(),
                            }
                        )
                except Exception as exc:
                    logger.debug(f"ffmpeg frame extraction at {offset}s failed: {exc}")
                    continue
        return frames

    @classmethod
    async def fetch_video_frames(
        cls, public_id: str | None, duration_seconds: float | None = None
    ) -> List[Dict[str, Any]]:
        """Backward-compatible alias for fetch_video_frames."""
        return await cls.extract_video_frames(public_id=public_id, duration_seconds=duration_seconds)


cloudinary_service = CloudinaryService()
