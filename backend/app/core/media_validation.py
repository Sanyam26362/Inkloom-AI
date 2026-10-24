import io
from typing import Tuple
from fastapi import HTTPException, status
from PIL import Image

MAX_IMAGE_SIZE = 10 * 1024 * 1024    # 10 MB
MAX_AUDIO_SIZE = 25 * 1024 * 1024    # 25 MB
MAX_VIDEO_SIZE = 100 * 1024 * 1024   # 100 MB


def validate_image_bytes(data: bytes, filename: str = "") -> Tuple[str, int, int]:
    """
    Validates image bytes using magic byte signatures and PIL.
    Returns (mime_type, width, height).
    Raises HTTPException(400) if invalid or oversized.
    """
    if len(data) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Image file exceeds maximum allowable size of 10MB ({round(len(data)/(1024*1024), 2)}MB).",
        )
    if len(data) < 12:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File too small to be a valid image.",
        )

    mime = None
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        mime = "image/png"
    elif data.startswith(b"\xff\xd8\xff"):
        mime = "image/jpeg"
    elif data[:4] == b"RIFF" and len(data) >= 12 and data[8:12] == b"WEBP":
        mime = "image/webp"

    if not mime:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported image format. File magic bytes do not match PNG, JPEG, or WEBP.",
        )

    try:
        with Image.open(io.BytesIO(data)) as img:
            img.verify()
            width, height = img.size
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid or corrupted image content: {exc}",
        ) from exc

    return mime, width, height


def validate_audio_bytes(data: bytes, filename: str = "") -> str:
    """
    Validates audio bytes using magic byte signatures.
    Returns mime_type.
    Raises HTTPException(400) if invalid or oversized.
    """
    if len(data) > MAX_AUDIO_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Audio file exceeds maximum allowable size of 25MB ({round(len(data)/(1024*1024), 2)}MB).",
        )
    if len(data) < 12:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File too small to be a valid audio file.",
        )

    mime = None
    if data.startswith(b"ID3") or (len(data) >= 2 and data[0] == 0xFF and (data[1] & 0xE0) == 0xE0):
        mime = "audio/mpeg"
    elif data[:4] == b"RIFF" and len(data) >= 12 and data[8:12] == b"WAVE":
        mime = "audio/wav"
    elif data.startswith(b"OggS"):
        mime = "audio/ogg"
    elif data.startswith(b"fLaC"):
        mime = "audio/flac"
    elif b"ftypM4A" in data[:32] or b"ftypmp42" in data[:32]:
        mime = "audio/mp4"

    if not mime:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported audio format. File content magic bytes do not match MP3, WAV, OGG, FLAC, or M4A.",
        )

    return mime


def validate_video_bytes(data: bytes, filename: str = "") -> str:
    """
    Validates video bytes using magic byte signatures.
    Returns mime_type.
    Raises HTTPException(400) if invalid or oversized.
    """
    if len(data) > MAX_VIDEO_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Video file exceeds maximum allowable size of 100MB ({round(len(data)/(1024*1024), 2)}MB).",
        )
    if len(data) < 12:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File too small to be a valid video file.",
        )

    mime = None
    if len(data) >= 8 and data[4:8] in (b"ftyp", b"moov", b"mdat", b"wide", b"skip"):
        mime = "video/mp4"
    elif data.startswith(b"\x1a\x45\xdf\xa3"):
        mime = "video/webm"
    elif data[:4] == b"RIFF" and len(data) >= 12 and data[8:12] == b"AVI ":
        mime = "video/x-msvideo"

    if not mime:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported video format. File content magic bytes do not match MP4, MOV, WEBM, MKV, or AVI.",
        )

    return mime
