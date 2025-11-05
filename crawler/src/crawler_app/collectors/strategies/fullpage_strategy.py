from __future__ import annotations

import logging

import requests

from ...config.settings import CrawlerSettings
from ...types import CurriculumParams
from ...utils.io_raw import save_raw
from ..arvore_http import curriculum_label, fetch_full_arvore_page

logger = logging.getLogger(__name__)


class FullPageStrategy:
    def fetch(
        self,
        session: requests.Session,
        settings: CrawlerSettings,
        params: CurriculumParams,
        raw_dir: str,
    ) -> str:
        label = curriculum_label(params)
        logger.info("FullPageStrategy: requesting full page for %s", label)
        html = fetch_full_arvore_page(session, settings, params)
        name_hint = f"{params.curso_id}_{params.catalogo_id}_{params.modalidade_id}_{params.periodo_id}_{params.cp}"
        path = save_raw(html, raw_dir, name_hint)
        logger.info("FullPageStrategy: RAW saved at %s", path)
        return path
