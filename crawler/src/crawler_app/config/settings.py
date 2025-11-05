from __future__ import annotations

import os
from pathlib import Path
from dataclasses import dataclass

try:
    # Optional dependency; the rest works without it
    from dotenv import load_dotenv  # type: ignore
except Exception:  # pragma: no cover
    load_dotenv = None


@dataclass
class Paths:
    project_root: Path
    data_dir: Path
    raw_dir: Path
    json_dir: Path
    processed_dir: Path
    db_dir: Path


@dataclass
class Settings:
    base_url: str
    paths: Paths


def load_settings() -> Settings:
    # Resolve project root = folder 'crawler'
    project_root = Path(__file__).resolve().parents[3]

    # Load .env if available
    if load_dotenv is not None:
        env_path = project_root / ".env"
        if env_path.exists():
            load_dotenv(env_path.as_posix())

    base_url = os.getenv("GDE_BASE_URL", "https://grade.daconline.unicamp.br")

    data_dir = project_root / "data"
    raw_dir = data_dir / "raw"
    json_dir = data_dir / "json"
    processed_dir = data_dir / "processed"
    db_dir = data_dir / "db"

    return Settings(
        base_url=base_url,
        paths=Paths(
            project_root=project_root,
            data_dir=data_dir,
            raw_dir=raw_dir,
            json_dir=json_dir,
            processed_dir=processed_dir,
            db_dir=db_dir,
        ),
    )

