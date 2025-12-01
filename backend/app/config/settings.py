from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv

def _resolve_path(value: str | None, fallback: Path) -> Path:
    if value:
        return Path(value).expanduser().resolve()
    return fallback


def _to_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _split_env_list(value: str | None) -> tuple[str, ...]:
    if not value:
        return tuple()
    return tuple(item.strip() for item in value.split(",") if item.strip())


@dataclass(frozen=True)
class Settings:
    catalog_db_path: Path
    user_db_root: Path
    planner_db_path: Path
    user_auth_db_path: Path
    planner_debug_dir: Path
    planner_debug_enabled: bool
    frontend_base_url: str = ""
    cors_allow_origins: str = "http://localhost:19006,http://localhost:3000"
    google_client_id: str = ""
    google_client_secret: str = ""
    google_allowed_redirects: tuple[str, ...] = tuple()
    google_default_calendar_id: str | None = None


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    load_dotenv()
    project_root = Path(__file__).resolve().parents[3]
    default_catalog = (project_root / "crawler" / "data" / "db" / "catalog.db").resolve()
    default_user_db = (project_root / "crawler" / "data" / "user_db").resolve()
    default_planner_db = (project_root / "crawler" / "data" / "db" / "planner.db").resolve()
    default_user_auth = (project_root / "backend" / "data" / "user_auth.db").resolve()
    default_debug_dir = (project_root / "backend" / "debug_planner").resolve()
    return Settings(
        catalog_db_path=_resolve_path(os.getenv("CATALOG_DB_PATH"), default_catalog),
        user_db_root=_resolve_path(os.getenv("USER_DB_ROOT"), default_user_db),
        planner_db_path=_resolve_path(os.getenv("PLANNER_DB_PATH"), default_planner_db),
        user_auth_db_path=_resolve_path(os.getenv("USER_AUTH_DB_PATH"), default_user_auth),
        planner_debug_dir=_resolve_path(os.getenv("PLANNER_DEBUG_DIR"), default_debug_dir),
        planner_debug_enabled=_to_bool(os.getenv("PLANNER_DEBUG_ENABLED"), default=True),
        frontend_base_url=os.getenv("FRONTEND_BASE_URL", "").strip(),
        google_client_id=os.getenv("GOOGLE_OAUTH_CLIENT_ID", "").strip(),
        google_client_secret=os.getenv("GOOGLE_OAUTH_CLIENT_SECRET", "").strip(),
        google_allowed_redirects=_split_env_list(os.getenv("GOOGLE_OAUTH_ALLOWED_REDIRECTS")),
        google_default_calendar_id=(lambda raw: raw.strip() if raw and raw.strip() else None)(
            os.getenv("GOOGLE_CALENDAR_DEFAULT_ID")
        ),
    )
