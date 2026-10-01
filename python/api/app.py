"""FastAPI application factory.

Creates the SlidesForge AI service. Phase 1 wires only the health route. The
package layout under ``python/`` (intelligence, story, slides, design, quality,
documents, destinations) is where the planned stages will be implemented; those
packages exist now so the architecture is visible and imports stay stable.
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from python import __version__
from python.api.routes import health_router
from python.core.config import get_settings
from python.core.logging import configure_logging, get_logger


def create_app() -> FastAPI:
    """Build and configure the FastAPI application."""
    settings = get_settings()
    configure_logging("DEBUG" if settings.debug else "INFO")
    logger = get_logger("slidesforge.api")

    app = FastAPI(
        title=settings.app_name,
        version=__version__,
        description=(
            "SlidesForge AI service. Phase 1 exposes a health endpoint only. "
            "AI orchestration, presentation generation, quality checks, document "
            "processing and PowerPoint rendering are planned and not implemented."
        ),
        docs_url="/docs",
        redoc_url=None,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health_router)

    logger.info("SlidesForge AI service initialised (env=%s)", settings.environment)
    return app


app = create_app()
