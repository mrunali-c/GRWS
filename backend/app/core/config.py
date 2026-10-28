"""Application configuration via environment-driven settings (Pydantic v2)."""
from functools import lru_cache
from typing import List
import json

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Typed application settings loaded from environment / .env file."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
        enable_decoding=False,
    )

    # Server
    app_name: str = "AI Personal Stylist API"
    app_env: str = "development"
    debug: bool = True
    api_v1_prefix: str = "/api/v1"
    cors_origins: List[str] = Field(default_factory=lambda: ["http://localhost:4200"])

    # Security
    secret_key: str = "dev-secret-change-me"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 120

    # Uploads
    max_upload_mb: int = 5
    allowed_image_types: List[str] = Field(
        default_factory=lambda: ["image/jpeg", "image/png", "image/webp"]
    )

    # External services
    openweathermap_api_key: str = ""

    # Rate limiting
    upload_rate_limit: str = "6/minute"

    # Storage
    storage_root: str = "./uploads"

    @field_validator("cors_origins", "allowed_image_types", mode="before")
    @classmethod
    def parse_string_lists(cls, value: object) -> object:
        if not isinstance(value, str):
            return value
        try:
            parsed = json.loads(value)
        except json.JSONDecodeError:
            return [entry.strip() for entry in value.split(",") if entry.strip()]
        return parsed

    @model_validator(mode="after")
    def validate_production_security(self) -> "Settings":
        if self.app_env.strip().lower() == "production":
            normalized_secret = self.secret_key.strip().lower()
            placeholder_fragments = (
                "change-me",
                "replace",
                "your-",
                "placeholder",
                "development-only",
            )
            if (
                len(self.secret_key) < 32
                or any(fragment in normalized_secret for fragment in placeholder_fragments)
            ):
                raise ValueError(
                    "SECRET_KEY must be a non-placeholder value of at least 32 characters "
                    "when APP_ENV=production."
                )
            if self.debug:
                raise ValueError("DEBUG must be false when APP_ENV=production.")
        return self

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_mb * 1024 * 1024

    @property
    def storage_path(self) -> str:
        import os

        return os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", self.storage_root))

    @property
    def database_path(self) -> str:
        import os

        return os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "..", "data", "stylist.sqlite3")
        )


@lru_cache
def get_settings() -> Settings:
    """Provide a cached, immutable settings instance (dependency injection)."""
    return Settings()