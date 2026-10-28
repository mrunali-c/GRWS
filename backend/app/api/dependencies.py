"""Request dependencies for authenticated and local single-user operation."""

from fastapi import Header, HTTPException, status

from app.core.config import get_settings
from app.core.security import decode_token


def get_current_user(authorization: str | None = Header(default=None)) -> str:
    if not authorization:
        if get_settings().app_env.lower() == "development":
            return "local-user"
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication is required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    scheme, _, token = authorization.partition(" ")
    subject = decode_token(token.strip()) if scheme.lower() == "bearer" and token.strip() else None
    if subject is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return subject
