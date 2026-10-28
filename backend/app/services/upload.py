"""Validate and persist wardrobe images."""

import io
from pathlib import Path

from fastapi import HTTPException, UploadFile, status
from PIL import Image, UnidentifiedImageError

from app.core.config import get_settings
from app.core.security import secure_uuid


async def save_uploaded_image(file: UploadFile | None) -> str | None:
    if file is None:
        return None
    settings = get_settings()
    raw = await file.read(settings.max_upload_bytes + 1)
    if not raw:
        raise HTTPException(status_code=400, detail="The uploaded image is empty.")
    if len(raw) > settings.max_upload_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"Image exceeds the {settings.max_upload_mb} MB upload limit.",
        )
    if file.content_type not in settings.allowed_image_types:
        raise HTTPException(status_code=415, detail="Upload a JPEG, PNG, or WebP image.")
    try:
        image = Image.open(io.BytesIO(raw))
        image.verify()
        image = Image.open(io.BytesIO(raw))
        image_format = image.format
        if image_format not in {"JPEG", "PNG", "WEBP"}:
            raise HTTPException(status_code=415, detail="Unsupported image format.")
        output = io.BytesIO()
        if image.mode not in {"RGB", "RGBA"}:
            image = image.convert("RGB")
        image.save(output, format=image_format, optimize=True)
    except UnidentifiedImageError as exc:
        raise HTTPException(status_code=400, detail="The uploaded file is not a valid image.") from exc
    extension = {"JPEG": ".jpg", "PNG": ".png", "WEBP": ".webp"}[image_format]
    filename = f"{secure_uuid()}{extension}"
    target = Path(settings.storage_path) / filename
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(output.getvalue())
    return filename
