"""FastAPI application entry point."""

from pathlib import Path
import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.api.routers import auth, calendar, profile, recommendations, wardrobe, weather
from app.core.config import get_settings
from app.db.database import initialize_database

settings = get_settings()
logger = logging.getLogger(__name__)
app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="API for wardrobe management, outfit recommendations, and planning.",
    debug=settings.debug,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "Origin"],
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled API exception for %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Internal server error."})


@app.get("/healthz", tags=["monitoring"])
async def healthz() -> dict[str, str]:
    return {"status": "ok", "environment": settings.app_env}


prefix = settings.api_v1_prefix.rstrip("/")
for router in (auth.router, profile.router, wardrobe.router, weather.router,
               recommendations.router, calendar.router):
    app.include_router(router, prefix=prefix)

Path(settings.storage_path).mkdir(parents=True, exist_ok=True)

@app.on_event("startup")
async def startup() -> None:
    Path(settings.storage_path).mkdir(parents=True, exist_ok=True)
    initialize_database()


app.mount("/uploads", StaticFiles(directory=settings.storage_path), name="uploads")
