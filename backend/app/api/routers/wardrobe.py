"""Persistent wardrobe item management."""

import json
import re
from typing import Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field

from app.api.dependencies import get_current_user
from app.db.database import connect, parse_json_list, utc_now
from app.services.upload import save_uploaded_image

router = APIRouter(prefix="/wardrobe", tags=["wardrobe"])
HEX_COLOR = re.compile(r"^#[0-9a-fA-F]{6}$")
CATEGORIES = {
    "tops", "bottoms", "dresses", "outerwear", "suits", "traditional",
    "bags", "jewelry", "belts", "hats", "watches", "scarves",
    "sneakers", "formal", "heels", "boots", "sandals",
}


class WardrobeUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    category: str | None = None
    color_hex: str | None = None
    tags: list[str] | None = None
    occasions: list[str] | None = None


def serialize_item(row: Any) -> dict[str, Any]:
    return {
        "id": row["id"],
        "name": row["name"],
        "category": row["category"],
        "normalized_category": row["category"],
        "color_hex": row["color_hex"],
        "thumbnail_url": f"/uploads/{row['image_path']}" if row["image_path"] else None,
        "occasions": parse_json_list(row["occasions"]),
        "tags": parse_json_list(row["tags"]),
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


@router.get("")
async def list_wardrobe(current: str = Depends(get_current_user)) -> list[dict[str, Any]]:
    with connect() as db:
        rows = db.execute(
            "SELECT * FROM wardrobe_items WHERE user_id = ? AND deleted = 0 ORDER BY created_at DESC",
            (current,),
        ).fetchall()
    return [serialize_item(row) for row in rows]


@router.post("", status_code=201)
async def create_wardrobe_item(
    name: str = Form(..., min_length=1, max_length=120),
    category: str = Form(...),
    color_hex: str = Form("#808080"),
    tags: str = Form(""),
    occasions: str = Form(""),
    file: UploadFile | None = File(default=None),
    current: str = Depends(get_current_user),
) -> dict[str, Any]:
    name = name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="Item name cannot be blank.")
    category = category.strip().lower()
    if category not in CATEGORIES:
        raise HTTPException(status_code=422, detail="Choose a valid wardrobe category.")
    if not HEX_COLOR.fullmatch(color_hex):
        raise HTTPException(status_code=422, detail="Color must be a six-digit HEX value.")
    image_path = await save_uploaded_image(file)
    now = utc_now()
    item_id = __import__("secrets").token_hex(16)
    tag_list = [entry.strip() for entry in tags.split(",") if entry.strip()]
    occasion_list = [entry.strip() for entry in occasions.split(",") if entry.strip()]
    with connect() as db:
        db.execute(
            """INSERT INTO wardrobe_items
               (id, user_id, name, category, color_hex, image_path, tags, occasions, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                item_id, current, name, category, color_hex.lower(), image_path,
                json.dumps(tag_list), json.dumps(occasion_list), now, now,
            ),
        )
        row = db.execute("SELECT * FROM wardrobe_items WHERE id = ?", (item_id,)).fetchone()
    return serialize_item(row)


@router.put("/{item_id}")
async def update_wardrobe_item(
    item_id: str,
    payload: WardrobeUpdate,
    current: str = Depends(get_current_user),
) -> dict[str, Any]:
    changes = payload.model_dump(exclude_unset=True)
    if not changes:
        raise HTTPException(status_code=422, detail="Provide at least one field to update.")
    if any(changes.get(key) is None for key in ("name", "category", "color_hex") if key in changes):
        raise HTTPException(status_code=422, detail="Name, category, and color cannot be null.")
    if "name" in changes:
        changes["name"] = changes["name"].strip()
        if not changes["name"]:
            raise HTTPException(status_code=422, detail="Item name cannot be blank.")
    if "category" in changes:
        changes["category"] = changes["category"].strip().lower()
        if changes["category"] not in CATEGORIES:
            raise HTTPException(status_code=422, detail="Choose a valid wardrobe category.")
    if "color_hex" in changes and not HEX_COLOR.fullmatch(changes["color_hex"]):
        raise HTTPException(status_code=422, detail="Color must be a six-digit HEX value.")
    for key in ("tags", "occasions"):
        if key in changes:
            changes[key] = json.dumps(changes[key])
    changes["updated_at"] = utc_now()
    assignments = ", ".join(f"{key} = ?" for key in changes)
    with connect() as db:
        result = db.execute(
            f"UPDATE wardrobe_items SET {assignments} WHERE id = ? AND user_id = ? AND deleted = 0",
            (*changes.values(), item_id, current),
        )
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Wardrobe item not found.")
        row = db.execute("SELECT * FROM wardrobe_items WHERE id = ?", (item_id,)).fetchone()
    return serialize_item(row)


@router.delete("/{item_id}", status_code=204)
async def delete_wardrobe_item(
    item_id: str,
    current: str = Depends(get_current_user),
) -> None:
    with connect() as db:
        result = db.execute(
            "UPDATE wardrobe_items SET deleted = 1, updated_at = ? WHERE id = ? AND user_id = ? AND deleted = 0",
            (utc_now(), item_id, current),
        )
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Wardrobe item not found.")
