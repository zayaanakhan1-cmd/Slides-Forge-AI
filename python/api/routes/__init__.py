"""Route package. New API surfaces are added here as their stage is built."""

from python.api.routes.health import router as health_router

__all__ = ["health_router"]
