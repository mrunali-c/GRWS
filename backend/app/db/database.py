"""Small SQLite persistence layer used by the local application."""

import json
import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Iterator

from app.core.config import get_settings


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


@contextmanager
def connect() -> Iterator[sqlite3.Connection]:
    database_path = get_settings().database_path
    os.makedirs(os.path.dirname(database_path), exist_ok=True)
    connection = sqlite3.connect(database_path, timeout=15)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def initialize_database() -> None:
    with connect() as db:
        db.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT NOT NULL UNIQUE COLLATE NOCASE,
                password_hash TEXT,
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS profiles (
                user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                gender_identity TEXT NOT NULL DEFAULT 'unspecified',
                complexion_season TEXT,
                zip_code TEXT,
                updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS wardrobe_items (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                color_hex TEXT NOT NULL,
                image_path TEXT,
                tags TEXT NOT NULL DEFAULT '[]',
                occasions TEXT NOT NULL DEFAULT '[]',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                deleted INTEGER NOT NULL DEFAULT 0
            );
            CREATE TABLE IF NOT EXISTS outfit_assignments (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                outfit_date TEXT NOT NULL,
                attire_id TEXT NOT NULL REFERENCES wardrobe_items(id),
                accessory_id TEXT REFERENCES wardrobe_items(id),
                footwear_id TEXT REFERENCES wardrobe_items(id),
                notes TEXT,
                status TEXT NOT NULL DEFAULT 'planned',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                UNIQUE(user_id, outfit_date)
            );
            """
        )
        db.execute(
            "INSERT OR IGNORE INTO users(id, username, created_at) VALUES (?, ?, ?)",
            ("local-user", "local", utc_now()),
        )
        db.execute(
            "INSERT OR IGNORE INTO profiles(user_id, updated_at) VALUES (?, ?)",
            ("local-user", utc_now()),
        )


def parse_json_list(value: str | None) -> list[str]:
    if not value:
        return []
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError:
        return []
    return parsed if isinstance(parsed, list) else []
