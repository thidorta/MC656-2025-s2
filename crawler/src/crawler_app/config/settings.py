from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

_CRAWLER_ROOT = Path(__file__).resolve().parents[3]


def _resolve_out_dir() -> str:
    env_value = os.getenv("OUT_DIR")
    if env_value:
        path = Path(env_value)
        if not path.is_absolute():
            path = (_CRAWLER_ROOT / path).resolve()
        return str(path)
    return str(_CRAWLER_ROOT / "data" / "raw")


@dataclass(frozen=True)
class CrawlerSettings:
    base_url: str = os.getenv("GDE_BASE_URL", "https://grade.daconline.unicamp.br")
    out_dir: str = _resolve_out_dir()
    strategy: str = os.getenv("CRAWLER_STRATEGY", "auto")
    retries: int = int(os.getenv("HTTP_RETRIES", "2"))
    timeout_s: int = int(os.getenv("HTTP_TIMEOUT_S", "20"))
    cooldown_ms: int = int(os.getenv("HTTP_COOLDOWN_MS", "250"))

