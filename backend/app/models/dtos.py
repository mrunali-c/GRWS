"""Validated request and response data transfer objects."""

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field

GenderIdentity = Literal["female", "male", "non_binary", "unspecified"]
ComplexionSeason = Literal["winter", "spring", "summer", "autumn", "neutral-olive"]
OutfitStatus = Literal["planned", "completed", "missed", "skipped"]


class UserProfileCreateDTO(BaseModel):
    gender_identity: GenderIdentity = "unspecified"
    complexion_season: ComplexionSeason | None = None
    zip_code: str | None = Field(default=None, max_length=10)


class UserProfileUpdateDTO(UserProfileCreateDTO):
    pass


class WardrobeItemCreateDTO(BaseModel):
    category: str
    normalized_category: str | None = None
    name: str = Field(min_length=1, max_length=120)
    color_hex: str = Field(pattern=r"^#[0-9a-fA-F]{6}$")
    tags: list[str] = Field(default_factory=list)
    occasions: list[str] = Field(default_factory=list)


class WardrobeItemUpdateDTO(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    category: str | None = None
    color_hex: str | None = Field(default=None, pattern=r"^#[0-9a-fA-F]{6}$")
    tags: list[str] | None = None
    occasions: list[str] | None = None


class WardrobeItemReadDTO(BaseModel):
    id: str
    name: str
    category: str
    normalized_category: str
    color_hex: str
    thumbnail_url: str | None = None
    occasions: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class OutfitAssignmentCreateDTO(BaseModel):
    date: date
    attire_id: str
    accessory_id: str | None = None
    footwear_id: str | None = None
    notes: str | None = Field(default=None, max_length=280)


class OutfitAssignmentUpdateDTO(BaseModel):
    attire_id: str | None = None
    accessory_id: str | None = None
    footwear_id: str | None = None
    notes: str | None = Field(default=None, max_length=280)
    status: OutfitStatus | None = None


class OutfitAssignmentReadDTO(BaseModel):
    id: str
    date: date
    attire_id: str
    accessory_id: str | None = None
    footwear_id: str | None = None
    attire_name: str
    accessory_name: str | None = None
    footwear_name: str | None = None
    attire_color_hex: str
    notes: str | None = None
    status: OutfitStatus
    created_at: datetime
    updated_at: datetime
