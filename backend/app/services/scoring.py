"""Weather service & algorithmic scoring engine for the AI Personal Stylist.

Responsibilities:
- Async OpenWeatherMap integration (current + 7-day forecast)
- Color harmony scoring via Lab/HSV color-space math
- Weather suitability scoring (thermal + material comfort)
- Style balance scoring (proportions, occasion, gender-preference alignment)
"""

from __future__ import annotations

import math
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Tuple, Optional, Literal

import httpx
from PIL import Image as PILImage
from io import BytesIO

from app.core.config import get_settings

settings = get_settings()
ComplexionSeason = Literal["winter", "spring", "summer", "autumn", "neutral-olive"]

# ---------------------------------------------------------------------------
# OpenWeatherMap async client wrapper
# ---------------------------------------------------------------------------

OPENWEATHER_BASE = "https://api.openweathermap.org/data/2.5"

# Map OpenWeather condition codes to human-readable tags
OW_CONDITION_MAP: dict[str, str] = {
    "Clear": "sunny",
    "Clouds": "cloudy",
    "Rain": "rain",
    "Drizzle": "rain",
    "Thunderstorm": "storm",
    "Snow": "snow",
    "Mist": "mist",
    "Fog": "fog",
    "Haze": "haze",
    "Smoke": "haze",
    "Dust": "haze",
    "Sand": "haze",
    "Ash": "haze",
    "Squall": "windy",
    "Tornado": "storm",
}


async def fetch_current_weather(lat: float, lon: float, api_key: str) -> dict:
    """Fetch current weather from OpenWeatherMap. Returns raw dict from OWM."""
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(
            f"{OPENWEATHER_BASE}/weather",
            params={
                "lat": lat,
                "lon": lon,
                "appid": api_key,
                "units": "metric",
            },
        )
        resp.raise_for_status()
        return resp.json()


async def fetch_7day_forecast(lat: float, lon: float, api_key: str) -> dict:
    """Fetch 7-day daily forecast from OpenWeatherMap."""
    async with httpx.AsyncClient(timeout=20.0) as client:
        resp = await client.get(
            f"{OPENWEATHER_BASE}/forecast/daily",
            params={
                "lat": lat,
                "lon": lon,
                "appid": api_key,
                "units": "metric",
                "cnt": 7,
            },
        )
        resp.raise_for_status()
        return resp.json()


# ---------------------------------------------------------------------------
# Color science helpers (Lab / HSV)
# ---------------------------------------------------------------------------

# CIE 1931 XYZ reference white (D65)
_X: float = 0.95047
_Y: float = 1.0
_Z: float = 1.08883


def _rgb_to_xyz(r: float, g: float, b: float) -> Tuple[float, float, float]:
    """Convert sRGB to CIE XYZ (D65). r,g,b in [0,1]."""
    r_lin = ((r + 0.055) / 1.055) ** 2.4 if r > 0.04045 else r / 12.92
    g_lin = ((g + 0.055) / 1.055) ** 2.4 if g > 0.04045 else g / 12.92
    b_lin = ((b + 0.055) / 1.055) ** 2.4 if b > 0.04045 else b / 12.92
    r_lin *= 100.0
    g_lin *= 100.0
    b_lin *= 100.0
    x = r_lin * 0.4124564 + g_lin * 0.3575761 + b_lin * 0.1804375
    y = r_lin * 0.2126729 + g_lin * 0.7151522 + b_lin * 0.0721750
    z = r_lin * 0.0193339 + g_lin * 0.1191920 + b_lin * 0.9503042
    return x, y, z


def _xyz_to_lab(x: float, y: float, z: float) -> Tuple[float, float, float]:
    """Convert XYZ to CIELAB. X,Y,Z normalized to reference white."""
    var_y = y / _Y
    var_x = x / _X
    var_z = z / _Z

    eps = 216 / 24389  # 6/29^3
    kl = 24389 / 27000  # kappa

    def f(t: float) -> float:
        return t ** (1 / 3) if t > eps else (kl * t + 4 / 29) / 3

    l = 116 * f(var_y) - 16
    a = 500 * (f(var_x) - f(var_y))
    b = 200 * (f(var_y) - f(var_z))
    return l, a, b


def hex_to_rgb(hex_str: str) -> Tuple[float, float, float]:
    """Convert '#RRGGBB' to normalized RGB triple (float0-1)."""
    hex_str = hex_str.lstrip("#")
    if len(hex_str) != 6:
        raise ValueError(f"Invalid HEX: {hex_str}")
    r = int(hex_str[0:2], 16) / 255.0
    g = int(hex_str[2:4], 16) / 255.0
    b = int(hex_str[4:6], 16) / 255.0
    return r, g, b


def hex_to_lab(hex_str: str) -> Tuple[float, float, float]:
    """Convert HEX color directly to CIELAB lightness/chromaticity."""
    r, g, b = hex_to_rgb(hex_str)
    x, y, z = _rgb_to_xyz(r, g, b)
    return _xyz_to_lab(x, y, z)


def color_distance_lab(lab1: Tuple[float, float, float], lab2: Tuple[float, float, float]) -> float:
    """Delta-E-ish Euclidean distance in CIELAB space (0 = identical)."""
    return math.sqrt(
        (lab1[0] - lab2[0]) ** 2
        + (lab1[1] - lab2[1]) ** 2
        + (lab1[2] - lab2[2]) ** 2
    )


# ---------------------------------------------------------------------------
# Color harmony scoring (complexion vs. item color)
# ---------------------------------------------------------------------------

# Season-based "pivot" Lab centers (approximate average lab values per season)
# These are illustrative; a production system would use measured skin-tone datasets.
_SEASON_LAB_CENTERS: dict[ComplexionSeason, Tuple[float, float, float]] = {
    "winter": (55.0, -10.0, -5.0),   # cool, high contrast
    "spring": (65.0, 20.0, 30.0),      # warm, bright
    "summer": (58.0, -5.0, 5.0),       # soft, muted
    "autumn": (58.0, 25.0, -10.0),     # warm, deep
    "neutral-olive": (50.0, 5.0, 0.0), # balanced
}


def harmony_score_complexion_vs_item(
    item_hex: str,
    complexion_season: Optional[str],
) -> float:
    """Return a harmony score in [0, 100] for an item color vs. user complexion.

    Algorithm:
    1. If no complexion season set → default mid-range score 55.
    2. Convert item HEX → Lab.
    3. Compute Euclidean distance to the season's Lab pivot center.
    4. Map distance → score: closer = higher score.
       Empirical mapping: distance 0→100, distance ~30→40, distance >50→20.
    """
    if not complexion_season or complexion_season not in _SEASON_LAB_CENTERS:
        return 55.0

    item_lab = hex_to_lab(item_hex)
    pivot_lab = _SEASON_LAB_CENTERS[complexion_season]
    dist = color_distance_lab(item_lab, pivot_lab)

    # Exponential decay mapping: score = 100 * exp(-k * dist)
    # k ≈ 0.07 gives ~50 at dist≈10, ~20 at dist≈30, ~5 at dist≈55
    k = 0.07
    score = max(0.0, min(100.0, 100.0 * math.exp(-k * dist)))
    return round(score, 1)


# ---------------------------------------------------------------------------
# Weather suitability scoring (thermal + material comfort)
# ---------------------------------------------------------------------------

# Comfort temperature bands per season (feels-like °C)
# These are generalized; a real system would incorporate humidity, wind, activity level.
_COMFORT_BANDS: dict[str, tuple[float, float]] = {
    "winter": ( -5, 10),   # cold: coat, layers
    "spring": ( 10, 20),    # cool: light jacket
    "summer": ( 20, 30),    # warm: breathable fabrics
    "autumn": ( 10, 20),    # cool: layering
    "neutral-olive": (15, 25),
}


def weather_suitability_score(
    forecast_day: dict,
    item_material: Optional[str] = None,
    item_category: Optional[str] = None,
) -> float:
    """Return a weather-suitability score in [0, 100] for a given forecast day.

    Heuristic:
    - Extract temperature + precipitation probability from forecast day dict.
    - Determine the season band that best matches the day's avg temp.
    - Adjust for material (e.g., 'wool' scores higher in winter, 'linen' in summer).
    - Penalize rain/snow unless item is rain-resistant.
    """
    avg_temp = forecast_day.get("avg_temp") or forecast_day.get("temp", {}).get("day", 15.0)
    pop = forecast_day.get("precipitation_probability") or 0  # %

    # Determine season tag from temperature (very coarse)
    if avg_temp <= 10:
        season_tag = "winter"
    elif avg_temp <= 15:
        season_tag = "autumn"
    elif avg_temp <= 20:
        season_tag = "spring"
    elif avg_temp <= 25:
        season_tag = "summer"
    else:
        season_tag = "summer"

    lo, hi = _COMFORT_BANDS.get(season_tag, (15, 25))

    # Base score: how central is the temperature to the comfort band?
    if lo <= avg_temp <= hi:
        temp_score = 100.0
    else:
        # linear penalty outside band
        deviation = min(abs(avg_temp - lo), abs(avg_temp - hi))
        temp_score = max(0.0, 100.0 - deviation * 3.0)

    # Material adjustment
    material_adj = 0.0
    if item_material:
        mat_lower = item_material.lower()
        if season_tag == "winter" and "wool" in mat_lower:
            material_adj = 10.0
        elif season_tag == "summer" and "linen" in mat_lower:
            material_adj = 10.0
        elif season_tag == "rain" and "waterproof" in mat_lower:
            material_adj = 15.0

    # Precipitation penalty
    pop_penalty = pop * 1.5  # each % point ≈ 1.5% score deduction
    final = max(0.0, min(100.0, temp_score + material_adj - pop_penalty))
    return round(final, 1)


# ---------------------------------------------------------------------------
# Style balance scoring (proportions, occasion, gender-preference alignment)
# ---------------------------------------------------------------------------

def style_balance_score(
    item_category: str,
    occasion: Optional[List[str]],
    user_gender: str,
    planned_occasion: str,
) -> float:
    """Return a style-balance score in [0, 100].

    Scoring dimensions:
    1. Occasion appropriateness (0–40 pts): does the item's occasion tag match the
       planned occasion?
    2. Gender-preference alignment (0–30 pts): does the item category align with the
       user's gender identity silhouette preferences?
    3. Proportion balance (0–30 pts): categorical heuristics (e.g., top+bottom combo).

    Returns a summed, rounded score in [0, 100].
    """
    # 1) Occasion appropriateness
    occasion_score = 0.0
    if occasion:
        if planned_occasion.lower() in [o.lower() for o in occasion]:
            occasion_score = 40.0
        elif any(kw in planned_occasion.lower() for kw in ["work", "casual", "formal", "night"]):
            # partial credit for category-level match
            occasion_score = 20.0
    # else: no occasion filter → neutral 0 contribution (max possible 60)

    # 2) Gender-preference alignment
    gender_score = 0.0
    # Map normalized categories to gender-preference weights
    # This is a simplified model; production would use learned preference vectors.
    category_weights: dict[str, dict[str, float]] = {
        "tops": {"female": 1.0, "male": 1.0, "non_binary": 1.0, "unspecified": 1.0},
        "bottoms": {"female": 1.0, "male": 1.0, "non_binary": 1.0, "unspecified": 1.0},
        "dresses": {"female": 1.0, "male": 0.0, "non_binary": 0.5, "unspecified": 1.0},
        "outerwear": {"female": 1.0, "male": 1.0, "non_binary": 1.0, "unspecified": 1.0},
        "suits": {"female": 1.0, "male": 1.0, "non_binary": 1.0, "unspecified": 1.0},
        "traditional": {"female": 1.0, "male": 1.0, "non_binary": 1.0, "unspecified": 1.0},
        "bags": {"female": 1.0, "male": 0.8, "non_binary": 1.0, "unspecified": 1.0},
        "jewelry": {"female": 1.0, "male": 0.3, "non_binary": 0.8, "unspecified": 1.0},
        "belts": {"female": 1.0, "male": 1.0, "non_binary": 1.0, "unspecified": 1.0},
        "hats": {"female": 1.0, "male": 1.0, "non_binary": 1.0, "unspecified": 1.0},
        "watches": {"female": 1.0, "male": 1.0, "non_binary": 1.0, "unspecified": 1.0},
        "scarves": {"female": 1.0, "male": 1.0, "non_binary": 1.0, "unspecified": 1.0},
        "sneakers": {"female": 1.0, "male": 1.0, "non_binary": 1.0, "unspecified": 1.0},
        "formal": {"female": 1.0, "male": 1.0, "non_binary": 1.0, "unspecified": 1.0},
        "heels": {"female": 1.0, "male": 0.0, "non_binary": 0.5, "unspecified": 1.0},
        "boots": {"female": 1.0, "male": 1.0, "non_binary": 1.0, "unspecified": 1.0},
        "sandals": {"female": 1.0, "male": 0.8, "non_binary": 1.0, "unspecified": 1.0},
    }

    w = category_weights.get(item_category.lower(), {}).get(user_gender.lower(), 0.5)
    gender_score = w * 30.0  # scale 0–30

    # 3) Proportion balance heuristic
    proportion_score = 30.0 if item_category.lower() in {"tops", "bottoms", "dresses"} else 15.0

    total = occasion_score + gender_score + proportion_score
    return round(min(100.0, total), 1)


# ---------------------------------------------------------------------------
# Scoring aggregation (composite recommendation score)
# ---------------------------------------------------------------------------

def compute_composite_score(
    item_hex: str,
    complexion_season: Optional[str],
    forecast_day: dict,
    item_category: str,
    item_material: Optional[str] = None,
    user_gender: str = "unspecified",
    planned_occasion: str = " casual",
) -> Dict[str, float | str]:
    """Aggregate the three domain scores into a composite recommendation score.

    Returns dict with per-domain scores and a final weighted total.
    """
    harmony = harmony_score_complexion_vs_item(item_hex, complexion_season)
    weather = weather_suitability_score(forecast_day, item_material, item_category)
    balance = style_balance_score(item_category, None, user_gender, planned_occasion)

    # Weighted sum: harmony 40% + weather 30% + style 30%
    composite = round(
        0.4 * harmony + 0.3 * weather + 0.3 * balance, 1
    )

    return {
        "harmony": harmony,
        "weather": weather,
        "style_balance": balance,
        "composite": composite,
        "details": {
            "item_category": item_category,
            "user_gender": user_gender,
            "planned_occasion": planned_occasion,
            "forecast_temp": forecast_day.get("avg_temp"),
            "forecast_precip_prob": forecast_day.get("precipitation_probability"),
        },
    }