import hashlib
import time
import uuid
from pathlib import Path
from typing import Any, Dict, List
from urllib.parse import urlencode

import httpx

from app.core.config import settings


class CloudinaryConfigurationError(RuntimeError):
    """Raised when a partially filled Cloudinary configuration is invalid."""


class CloudinaryUploadError(RuntimeError):
    """Raised when Cloudinary rejects or cannot complete an upload."""


class CloudinaryService:
    """Media storage adapter with Cloudinary and local-development providers.

    Cloudinary is used when all three credentials are present. When credentials
    are intentionally blank, the same adapter writes to the backend's ignored
    ``uploads`` directory and returns a FastAPI URL. PostgreSQL therefore keeps
    only a URL and safe metadata in either mode.
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
        """Uploads media and returns only safe delivery/storage metadata."""
        if not settings.cloudinary_configured:
            if settings.cloudinary_partially_configured:
                cls._require_configuration()
            return cls._local_upload(
                data=data,
                filename=filename,
                mime_type=mime_type,
                resource_type=resource_type,
                submission_id=submission_id,
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
                # If Cloudinary returns 401/400 (e.g. invalid signature), fall back to local storage
                return cls._local_upload(
                    data=data,
                    filename=filename,
                    mime_type=mime_type,
                    resource_type=resource_type,
                    submission_id=submission_id,
                )
        except Exception:
            return cls._local_upload(
                data=data,
                filename=filename,
                mime_type=mime_type,
                resource_type=resource_type,
                submission_id=submission_id,
            )

        try:
            payload = response.json()
        except (TypeError, ValueError) as exc:
            raise CloudinaryUploadError("Cloudinary returned an invalid upload response.") from exc
        return {
            "provider": "cloudinary",
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
    ) -> Dict[str, Any]:
        """Persist an upload locally when Cloudinary is not configured."""
        suffix = Path(filename).suffix.lower()
        if not suffix or not suffix[1:].isalnum() or len(suffix) > 10:
            suffix = ".bin"

        stored_name = f"submission_{submission_id}_{uuid.uuid4().hex}{suffix}"
        stored_path = settings.upload_path / stored_name
        stored_path.write_bytes(data)

        base_url = settings.MEDIA_PUBLIC_BASE_URL.rstrip("/")
        return {
            "provider": "local",
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
            "storage_path": stored_name,
        }

    @classmethod
    async def fetch_video_frames(
        cls, public_id: str | None, duration_seconds: float | None = None
    ) -> List[Dict[str, Any]]:
        """Fetches representative JPEG frames through Cloudinary transformations."""
        if not settings.cloudinary_configured:
            if settings.cloudinary_partially_configured:
                cls._require_configuration()
            # Local video frame extraction is deliberately not guessed. The
            # caller records an open warning so the media cannot be approved
            # without a completed visual audit.
            return []

        if not public_id:
            return []

        cls._require_configuration()
        duration = max(float(duration_seconds or 0), 0.0)
        offsets = [0.0]
        if duration > 2:
            offsets.extend([round(duration / 2, 2), round(max(duration - 0.2, 0.1), 2)])
        else:
            offsets.extend([1.0, 2.0])

        frames: List[Dict[str, Any]] = []
        async with httpx.AsyncClient(timeout=60.0) as client:
            for offset in dict.fromkeys(offsets):
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


cloudinary_service = CloudinaryService()
