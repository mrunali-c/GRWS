"""User style preferences."""

from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.api.dependencies import get_current_user
from app.db.database import connect, utc_now

router = APIRouter(prefix="/profile", tags=["profile"])


class ProfileUpdate(BaseModel):
    gender_identity: Literal["female", "male", "non_binary", "unspecified"] = "unspecified"
    complexion_season: Literal[
        "winter", "spring", "summer", "autumn", "neutral-olive"
    ] | None = None
    zip_code: str | None = Field(default=None, max_length=10)


@router.get("")
async def read_profile(current: str = Depends(get_current_user)) -> dict[str, str | None]:
    with connect() as db:
        row = db.execute(
            "SELECT gender_identity, complexion_season, zip_code, updated_at FROM profiles WHERE user_id = ?",
            (current,),
        ).fetchone()
    if row is None:
        now = utc_now()
        with connect() as db:
            db.execute(
                "INSERT INTO profiles(user_id, updated_at) VALUES (?, ?)",
                (current, now),
            )
        return {
            "gender_identity": "unspecified",
            "complexion_season": None,
            "zip_code": None,
            "updated_at": now,
        }
    return dict(row)


@router.put("")
async def update_profile(
    payload: ProfileUpdate,
    current: str = Depends(get_current_user),
) -> dict[str, str | None]:
    now = utc_now()
    with connect() as db:
        db.execute(
            """INSERT INTO profiles(user_id, gender_identity, complexion_season, zip_code, updated_at)
               VALUES (?, ?, ?, ?, ?)
               ON CONFLICT(user_id) DO UPDATE SET
                 gender_identity = excluded.gender_identity,
                 complexion_season = excluded.complexion_season,
                 zip_code = excluded.zip_code,
                 updated_at = excluded.updated_at""",
            (current, payload.gender_identity, payload.complexion_season, payload.zip_code, now),
        )
        row = db.execute(
            "SELECT gender_identity, complexion_season, zip_code, updated_at FROM profiles WHERE user_id = ?",
            (current,),
        ).fetchone()
    return dict(row)
