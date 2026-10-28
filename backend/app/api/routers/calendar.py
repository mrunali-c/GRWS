"""Persistent outfit planning endpoints."""

from datetime import date, timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.api.dependencies import get_current_user
from app.db.database import connect, utc_now
from app.core.security import secure_uuid

router = APIRouter(prefix="/calendar", tags=["calendar"])


class OutfitCreate(BaseModel):
    date: date
    attire_id: str
    accessory_id: str | None = None
    footwear_id: str | None = None
    notes: str | None = Field(default=None, max_length=280)


class OutfitUpdate(BaseModel):
    attire_id: str | None = None
    accessory_id: str | None = None
    footwear_id: str | None = None
    notes: str | None = Field(default=None, max_length=280)
    status: str | None = None


def assignment_response(db: Any, assignment_id: str, user_id: str) -> dict[str, Any]:
    row = db.execute(
        """SELECT a.*, attire.name AS attire_name, attire.color_hex AS attire_color_hex,
                  accessory.name AS accessory_name, footwear.name AS footwear_name
           FROM outfit_assignments a
           JOIN wardrobe_items attire ON attire.id = a.attire_id
           LEFT JOIN wardrobe_items accessory ON accessory.id = a.accessory_id
           LEFT JOIN wardrobe_items footwear ON footwear.id = a.footwear_id
           WHERE a.id = ? AND a.user_id = ?""",
        (assignment_id, user_id),
    ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Scheduled outfit not found.")
    return {
        "id": row["id"],
        "date": row["outfit_date"],
        "attire_id": row["attire_id"],
        "accessory_id": row["accessory_id"],
        "footwear_id": row["footwear_id"],
        "attire_name": row["attire_name"],
        "accessory_name": row["accessory_name"],
        "footwear_name": row["footwear_name"],
        "attire_color_hex": row["attire_color_hex"],
        "notes": row["notes"],
        "status": row["status"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def verify_items(db: Any, user_id: str, item_ids: list[str | None]) -> None:
    for item_id in item_ids:
        if item_id is None:
            continue
        row = db.execute(
            "SELECT id FROM wardrobe_items WHERE id = ? AND user_id = ? AND deleted = 0",
            (item_id, user_id),
        ).fetchone()
        if row is None:
            raise HTTPException(status_code=422, detail="Selected item is not in your wardrobe.")


@router.get("/week/{week_start}")
async def weekly_planner(
    week_start: date,
    current: str = Depends(get_current_user),
) -> dict[str, Any]:
    end = week_start + timedelta(days=7)
    with connect() as db:
        rows = db.execute(
            """SELECT id FROM outfit_assignments
               WHERE user_id = ? AND outfit_date >= ? AND outfit_date < ?
               ORDER BY outfit_date""",
            (current, week_start.isoformat(), end.isoformat()),
        ).fetchall()
        outfits = [assignment_response(db, row["id"], current) for row in rows]
    counts = {status: sum(outfit["status"] == status for outfit in outfits) for status in
              ("planned", "completed", "missed")}
    return {
        "week_start": week_start.isoformat(),
        "outfits": outfits,
        "planned_count": counts["planned"],
        "completed_count": counts["completed"],
        "missed_count": counts["missed"],
    }


@router.post("/outfit", status_code=201)
async def schedule_outfit(
    payload: OutfitCreate,
    current: str = Depends(get_current_user),
) -> dict[str, Any]:
    now = utc_now()
    with connect() as db:
        verify_items(db, current, [payload.attire_id, payload.accessory_id, payload.footwear_id])
        existing = db.execute(
            "SELECT id FROM outfit_assignments WHERE user_id = ? AND outfit_date = ?",
            (current, payload.date.isoformat()),
        ).fetchone()
        assignment_id = existing["id"] if existing else secure_uuid()
        if existing:
            db.execute(
                """UPDATE outfit_assignments SET attire_id = ?, accessory_id = ?, footwear_id = ?,
                   notes = ?, status = 'planned', updated_at = ? WHERE id = ?""",
                (
                    payload.attire_id, payload.accessory_id, payload.footwear_id,
                    payload.notes, now, assignment_id,
                ),
            )
        else:
            db.execute(
                """INSERT INTO outfit_assignments
                   (id, user_id, outfit_date, attire_id, accessory_id, footwear_id, notes, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    assignment_id, current, payload.date.isoformat(), payload.attire_id,
                    payload.accessory_id, payload.footwear_id, payload.notes, now, now,
                ),
            )
        return assignment_response(db, assignment_id, current)


@router.put("/outfit/{assignment_id}")
async def update_scheduled_outfit(
    assignment_id: str,
    payload: OutfitUpdate,
    current: str = Depends(get_current_user),
) -> dict[str, Any]:
    changes = payload.model_dump(exclude_unset=True)
    allowed_status = {"planned", "completed", "missed", "skipped"}
    if "status" in changes and changes["status"] not in allowed_status:
        raise HTTPException(status_code=422, detail="Invalid outfit status.")
    with connect() as db:
        existing = db.execute(
            "SELECT * FROM outfit_assignments WHERE id = ? AND user_id = ?",
            (assignment_id, current),
        ).fetchone()
        if existing is None:
            raise HTTPException(status_code=404, detail="Scheduled outfit not found.")
        if "attire_id" in changes and not changes["attire_id"]:
            raise HTTPException(status_code=422, detail="An outfit must include a wardrobe item.")
        verify_items(
            db,
            current,
            [
                changes.get("attire_id", existing["attire_id"]),
                changes.get("accessory_id", existing["accessory_id"]),
                changes.get("footwear_id", existing["footwear_id"]),
            ],
        )
        if changes:
            changes["updated_at"] = utc_now()
            assignments = ", ".join(f"{key} = ?" for key in changes)
            db.execute(
                f"UPDATE outfit_assignments SET {assignments} WHERE id = ? AND user_id = ?",
                (*changes.values(), assignment_id, current),
            )
        return assignment_response(db, assignment_id, current)


@router.delete("/outfit/{assignment_id}", status_code=204)
async def clear_scheduled_outfit(
    assignment_id: str,
    current: str = Depends(get_current_user),
) -> None:
    with connect() as db:
        result = db.execute(
            "DELETE FROM outfit_assignments WHERE id = ? AND user_id = ?",
            (assignment_id, current),
        )
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Scheduled outfit not found.")
