"""Current weather and forecast endpoints."""

from collections import defaultdict
from datetime import date, timedelta
from typing import Any

import httpx
from fastapi import APIRouter, HTTPException, Query

from app.core.config import get_settings

router = APIRouter(prefix="/weather", tags=["weather"])
BASE_URL = "https://api.openweathermap.org/data/2.5"


def demo_forecast() -> dict[str, Any]:
    today = date.today()
    daily = [
        {
            "date": (today + timedelta(days=offset)).isoformat(),
            "avg_temp": 22.0 + offset * 0.5,
            "min_temp": 18.0 + offset * 0.5,
            "max_temp": 26.0 + offset * 0.5,
            "condition_code": ("Clear", "Clouds", "Rain")[offset % 3],
            "precipitation_probability": (offset % 4) * 20,
        }
        for offset in range(7)
    ]
    return {
        "current": {
            "temperature": 22.0,
            "humidity": 55,
            "condition_code": "Clear",
            "uv_index": None,
            "precipitation": 0.0,
        },
        "daily": daily,
    }


async def fetch_owm(endpoint: str, zip_code: str) -> dict[str, Any]:
    key = get_settings().openweathermap_api_key
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.get(
                f"{BASE_URL}/{endpoint}",
                params={"zip": zip_code, "appid": key, "units": "metric"},
            )
            response.raise_for_status()
            return response.json()
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=502, detail="Weather provider rejected the request.") from exc
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail="Weather provider is unavailable.") from exc


@router.get("/current")
async def current_weather(zip_code: str | None = Query(default=None)) -> dict[str, Any]:
    if not get_settings().openweathermap_api_key or not zip_code:
        return demo_forecast()["current"]
    data = await fetch_owm("weather", zip_code)
    return {
        "temperature": data["main"]["temp"],
        "humidity": data["main"]["humidity"],
        "condition_code": data["weather"][0]["main"],
        "uv_index": None,
        "precipitation": data.get("rain", {}).get("1h", 0.0),
    }


@router.get("/forecast")
async def forecast(zip_code: str | None = Query(default=None)) -> dict[str, Any]:
    if not get_settings().openweathermap_api_key or not zip_code:
        return demo_forecast()
    data = await fetch_owm("forecast", zip_code)
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for entry in data.get("list", []):
        grouped[entry["dt_txt"][:10]].append(entry)
    daily = []
    for forecast_date, entries in list(grouped.items())[:7]:
        temps = [entry["main"]["temp"] for entry in entries]
        daily.append(
            {
                "date": forecast_date,
                "avg_temp": sum(temps) / len(temps),
                "min_temp": min(temps),
                "max_temp": max(temps),
                "condition_code": entries[0]["weather"][0]["main"],
                "precipitation_probability": round(
                    max(entry.get("pop", 0) for entry in entries) * 100
                ),
            }
        )
    now = data["list"][0]
    return {
        "current": {
            "temperature": now["main"]["temp"],
            "humidity": now["main"]["humidity"],
            "condition_code": now["weather"][0]["main"],
            "uv_index": None,
            "precipitation": now.get("rain", {}).get("3h", 0.0),
        },
        "daily": daily,
    }
