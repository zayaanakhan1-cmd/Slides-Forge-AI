"""Application configuration.

Settings are read from the environment with sensible development defaults so the
service can start without any configuration. Real secrets (provider keys, OAuth
credentials) are added to this model when the corresponding stage is built.
"""

from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration for the SlidesForge AI Python service."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Service identity.
    app_name: str = "SlidesForge AI Service"
    environment: str = "development"
    debug: bool = True
    version: str = "0.1.0"

    # Networking.
    host: str = "0.0.0.0"
    port: int = 8000

    # CORS: the Next.js frontend origins allowed to call this service.
    cors_origins: list[str] = ["http://localhost:3000"]

    # Provider credentials are intentionally absent in Phase 1. They are added
    # when the AI orchestration stage is implemented.


@lru_cache
def get_settings() -> Settings:
    """Return the process-wide settings instance."""
    return Settings()
