from __future__ import annotations

import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class CrawlerSettings:
    base_url: str = os.getenv("GDE_BASE_URL", "https://grade.daconline.unicamp.br")
    out_dir: str = os.getenv("OUT_DIR", "crawler/data/raw")
    strategy: str = os.getenv("CRAWLER_STRATEGY", "auto")
    retries: int = int(os.getenv("HTTP_RETRIES", "2"))
    timeout_s: int = int(os.getenv("HTTP_TIMEOUT_S", "20"))
    cooldown_ms: int = int(os.getenv("HTTP_COOLDOWN_MS", "250"))

