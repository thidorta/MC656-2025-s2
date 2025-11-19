from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path


def _resolve_path(value: str | None, fallback: Path) -> Path:
    if value:
        return Path(value).expanduser().resolve()
    return fallback


@dataclass(frozen=True)
class Settings:
    catalog_db_path: Path
    user_db_root: Path


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    base_dir = Path(__file__).resolve().parents[2]
    default_catalog = (base_dir / "crawler" / "data" / "db" / "catalog.db").resolve()
    default_user_db = (base_dir / "crawler" / "data" / "user_db").resolve()
    return Settings(
        catalog_db_path=_resolve_path(os.getenv("CATALOG_DB_PATH"), default_catalog),
        user_db_root=_resolve_path(os.getenv("USER_DB_ROOT"), default_user_db),
    )
