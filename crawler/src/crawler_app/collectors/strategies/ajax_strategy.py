from __future__ import annotations

import logging

import requests

from ...config.settings import CrawlerSettings
from ...types import CurriculumParams
from ...utils.logging_helpers import log_response_with_selects
from ..arvore_http import curriculum_label, fetch_curriculum_ajax_response

logger = logging.getLogger(__name__)


class AjaxStrategy:
    def fetch(
        self,
        session: requests.Session,
        settings: CrawlerSettings,
        params: CurriculumParams,
        raw_dir: str,
    ) -> str:
        label = curriculum_label(params)
        logger.info("AjaxStrategy: requesting curriculum via AJAX for %s", label)
        response = fetch_curriculum_ajax_response(session, settings, params)
        path = log_response_with_selects(label, response, raw_dir, filename=f"{label}.html")
        logger.info("AjaxStrategy: RAW saved at %s", path)
        return path
