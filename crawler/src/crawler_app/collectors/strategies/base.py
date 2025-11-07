from __future__ import annotations

from typing import Protocol

import requests

from ...config.settings import CrawlerSettings
from ...types import CurriculumParams


class ICurriculumFetchStrategy(Protocol):
    def fetch(
        self,
        session: requests.Session,
        settings: CrawlerSettings,
        params: CurriculumParams,
        raw_dir: str,
    ) -> str:
        """Return path to saved RAW HTML."""
        ...

