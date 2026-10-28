"""User registration and JWT login endpoints."""

import sqlite3

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator

from app.api.dependencies import get_current_user
from app.core.security import (
    create_access_token,
    hash_password,
    secure_uuid,
    verify_password,
)
from app.db.database import connect, utc_now

router = APIRouter(prefix="/auth", tags=["auth"])


class Credentials(BaseModel):
    username: str = Field(min_length=3, max_length=80)
    password: str = Field(min_length=8, max_length=72)

    @field_validator("password")
    @classmethod
    def password_fits_bcrypt(cls, value: str) -> str:
        if len(value.encode("utf-8")) > 72:
            raise ValueError("Password must be no more than 72 UTF-8 bytes.")
        return value


@router.post("/signup", status_code=status.HTTP_201_CREATED)
async def signup(credentials: Credentials) -> dict[str, str]:
    username = credentials.username.strip()
    if len(username) < 3:
        raise HTTPException(status_code=422, detail="Username must be at least 3 characters.")
    user_id = secure_uuid()
    now = utc_now()
    try:
        with connect() as db:
            db.execute(
                "INSERT INTO users(id, username, password_hash, created_at) VALUES (?, ?, ?, ?)",
                (user_id, username, hash_password(credentials.password), now),
            )
            db.execute(
                "INSERT INTO profiles(user_id, updated_at) VALUES (?, ?)",
                (user_id, now),
            )
    except sqlite3.IntegrityError as exc:
        raise HTTPException(status_code=409, detail="Username is already registered.") from exc
    return {
        "access_token": create_access_token(subject=user_id),
        "token_type": "bearer",
        "username": username,
    }


@router.post("/login")
async def login(credentials: Credentials) -> dict[str, str]:
    with connect() as db:
        user = db.execute(
            "SELECT id, username, password_hash FROM users WHERE username = ? COLLATE NOCASE",
            (credentials.username.strip(),),
        ).fetchone()
    if not user or not user["password_hash"] or not verify_password(
        credentials.password, user["password_hash"]
    ):
        raise HTTPException(status_code=401, detail="Incorrect username or password.")
    return {
        "access_token": create_access_token(subject=user["id"]),
        "token_type": "bearer",
        "username": user["username"],
    }


@router.get("/me")
async def me(current: str = Depends(get_current_user)) -> dict[str, str]:
    with connect() as db:
        user = db.execute("SELECT username FROM users WHERE id = ?", (current,)).fetchone()
    if user is None:
        raise HTTPException(status_code=401, detail="Account no longer exists.")
    return {"id": current, "username": user["username"]}
