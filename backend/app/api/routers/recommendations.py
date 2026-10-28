"""Weather-aware wardrobe item recommendations."""

from datetime import date
from typing import Any

from fastapi import APIRouter, Depends, Query

from app.api.dependencies import get_current_user
from app.api.routers.weather import forecast
from app.db.database import connect, parse_json_list
from app.services.scoring import (
    harmony_score_complexion_vs_item,
    style_balance_score,
    weather_suitability_score,
)

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


@router.post("/outfit/{target_date}")
async def outfit_recommendations(
    target_date: date,
    current: str = Depends(get_current_user),
    planned_occasion: str = Query(default="casual"),
) -> dict[str, Any]:
    with connect() as db:
        profile = db.execute(
            "SELECT gender_identity, complexion_season, zip_code FROM profiles WHERE user_id = ?",
            (current,),
        ).fetchone()
        items = db.execute(
            "SELECT * FROM wardrobe_items WHERE user_id = ? AND deleted = 0",
            (current,),
        ).fetchall()
    if not items:
        return {"outfit_recommendations": [], "summary": "Add wardrobe items to get recommendations."}

    forecast_data = await forecast(profile["zip_code"] if profile else None)
    forecast_day = next(
        (day for day in forecast_data["daily"] if day["date"] == target_date.isoformat()),
        forecast_data["daily"][0],
    )
    complexion = profile["complexion_season"] if profile else None
    gender = profile["gender_identity"] if profile else "unspecified"
    scored = []
    for item in items:
        tags = parse_json_list(item["tags"])
        occasions = parse_json_list(item["occasions"])
        harmony = harmony_score_complexion_vs_item(item["color_hex"], complexion)
        weather = weather_suitability_score(
            forecast_day,
            item_material=" ".join(tags),
            item_category=item["category"],
        )
        balance = style_balance_score(
            item["category"],
            occasions,
            gender,
            planned_occasion,
        )
        scored.append(
            {
                "item_id": item["id"],
                "item_name": item["name"],
                "category": item["category"],
                "color_hex": item["color_hex"],
                "harmony": harmony,
                "weather": weather,
                "style_balance": balance,
                "composite": round(0.4 * harmony + 0.3 * weather + 0.3 * balance, 1),
                "thumbnail_url": f"/uploads/{item['image_path']}" if item["image_path"] else None,
                "date": target_date.isoformat(),
            }
        )
    scored.sort(key=lambda item: item["composite"], reverse=True)
    return {
        "outfit_recommendations": scored,
        "summary": {
            "date": target_date.isoformat(),
            "planned_occasion": planned_occasion,
            "weather": forecast_day,
        },
    }
