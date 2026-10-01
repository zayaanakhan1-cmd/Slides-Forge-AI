"""Health routes.

Exposes the liveness and readiness endpoints the frontend and orchestrators use
to confirm the service is reachable. No AI or rendering work happens here.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel

from python.core.config import get_settings

router = APIRouter(tags=["health"])


class HealthResponse(BaseModel):
    """Payload returned by the health endpoint."""

    status: Literal["ok"]
    service: str
    version: str
    environment: str
    time: str


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    """Report that the service is running."""
    settings = get_settings()
    return HealthResponse(
        status="ok",
        service=settings.app_name,
        version=settings.version,
        environment=settings.environment,
        time=datetime.now(timezone.utc).isoformat(),
    )
