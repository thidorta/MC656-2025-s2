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


@dataclass(frozen=True)
class Settings:
    catalog_db_path: Path
    user_db_root: Path
    planner_db_path: Path


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    load_dotenv()
    project_root = Path(__file__).resolve().parents[3]
    default_catalog = (project_root / "crawler" / "data" / "db" / "catalog.db").resolve()
    default_user_db = (project_root / "crawler" / "data" / "user_db").resolve()
    default_planner_db = (project_root / "crawler" / "data" / "db" / "planner.db").resolve()
    return Settings(
        catalog_db_path=_resolve_path(os.getenv("CATALOG_DB_PATH"), default_catalog),
        user_db_root=_resolve_path(os.getenv("USER_DB_ROOT"), default_user_db),
        planner_db_path=_resolve_path(os.getenv("PLANNER_DB_PATH"), default_planner_db),
    )
