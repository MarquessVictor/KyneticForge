"""Application settings (overridable with ``KF_*`` environment variables)."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

APP_NAME = "KyneticForge Studio"
APP_VERSION = "0.1.0"

BACKEND_DIR = Path(__file__).resolve().parents[2]
DEFAULT_DATABASE_PATH = BACKEND_DIR / "data" / "kyneticforge.db"
#: Output of `npm run build` in frontend/; served at "/" when present.
DEFAULT_FRONTEND_DIST = BACKEND_DIR.parent / "frontend" / "dist"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="KF_", env_file=".env", extra="ignore")

    database_url: str = f"sqlite:///{DEFAULT_DATABASE_PATH.as_posix()}"
    #: Only these origins may call the API from a browser (Vite dev/preview servers).
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ]
    #: Maximum accepted size of an imported project document, in bytes.
    max_import_bytes: int = 256 * 1024
    #: Built frontend to serve at "/" (single-process "app mode"). None disables it.
    frontend_dist: Path | None = DEFAULT_FRONTEND_DIST


@lru_cache
def get_settings() -> Settings:
    return Settings()
