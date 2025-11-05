from __future__ import annotations

import logging
import random
import time
from typing import Optional

import requests

from ..config.settings import CrawlerSettings
from ..types import CurriculumParams
from ..utils.logging_helpers import log_response_with_selects

LOGGER_NAME = "arvore_http"
logger = logging.getLogger(LOGGER_NAME)


def polite_sleep(settings: CrawlerSettings) -> None:
    base_delay = max(settings.cooldown_ms / 1000.0, 0.0)
    if base_delay == 0:
        return
    jitter = min(base_delay * 0.3, 1.0)
    time.sleep(random.uniform(base_delay - jitter, base_delay + jitter))


def _url(settings: CrawlerSettings, path: str) -> str:
    base = settings.base_url.rstrip("/")
    if not path.startswith("/"):
        path = "/" + path
    return f"{base}{path}"


def _curriculum_query(params: CurriculumParams) -> dict[str, str]:
    return {
        "curso": str(params.curso_id),
        "modalidade": params.modalidade_id,
        "catalogo": str(params.catalogo_id),
        "periodo": params.periodo_id,
        "cp": params.cp,
    }


def curriculum_label(params: CurriculumParams) -> str:
    return (
        f"arvore_c{params.curso_id}_a{params.catalogo_id}_"
        f"m{params.modalidade_id}_p{params.periodo_id}"
    )


def fetch_arvore_page(
    session: requests.Session,
    settings: CrawlerSettings,
    *,
    raw_dir: str,
    label: str,
    curso_id: Optional[int] = None,
) -> str:
    params = {"curso": curso_id} if curso_id is not None else {}
    logger.info("[GET] /arvore/ params=%s", params if params else "{}")
    resp = session.get(
        _url(settings, "/arvore/"),
        params=params,
        timeout=settings.timeout_s,
    )
    resp.raise_for_status()
    log_response_with_selects(label, resp, raw_dir, filename=f"{label}.html")
    return resp.text


def fetch_modalidades_fragment(
    session: requests.Session,
    settings: CrawlerSettings,
    *,
    curso_id: int,
    catalogo_id: int,
    raw_dir: str,
    label: str,
) -> str:
    params = {"c": curso_id, "a": catalogo_id, "o": "1"}
    headers = {
        "Accept": "text/html, */*; q=0.01",
        "X-Requested-With": "XMLHttpRequest",
        "Origin": settings.base_url.rstrip("/"),
        "Referer": f"{_url(settings, '/arvore/')}?catalogo={catalogo_id}&curso={curso_id}",
    }
    csrf = session.cookies.get("csrfptoken")
    if csrf:
        headers["X-CSRFP-TOKEN"] = csrf

    logger.info("[POST] /ajax/modalidades.php params=%s (csrf=%s)", params, "set" if csrf else "missing")
    resp = session.post(
        _url(settings, "/ajax/modalidades.php"),
        params=params,
        headers=headers,
        data=b"",
        timeout=settings.timeout_s,
    )
    resp.raise_for_status()
    log_response_with_selects(label, resp, raw_dir, filename=f"{label}.html")
    return resp.text


def fetch_arvore_with_params(
    session: requests.Session,
    settings: CrawlerSettings,
    params: CurriculumParams,
    *,
    raw_dir: str,
) -> str:
    query = _curriculum_query(params)
    label = curriculum_label(params)
    logger.info("[GET] /arvore/ params=%s", query)
    resp = session.get(
        _url(settings, "/arvore/"),
        params=query,
        timeout=settings.timeout_s,
    )
    resp.raise_for_status()
    log_response_with_selects(label, resp, raw_dir, filename=f"{label}.html")
    return resp.text


def fetch_full_arvore_page(
    session: requests.Session,
    settings: CrawlerSettings,
    params: CurriculumParams,
) -> str:
    query = _curriculum_query(params)
    logger.info("[GET] /arvore/ (full page) params=%s", query)
    resp = session.get(
        _url(settings, "/arvore/"),
        params=query,
        timeout=settings.timeout_s,
    )
    resp.raise_for_status()
    return resp.text


def fetch_curriculum_ajax_response(
    session: requests.Session,
    settings: CrawlerSettings,
    params: CurriculumParams,
) -> requests.Response:
    query = _curriculum_query(params)
    logger.info("[GET] /arvore/ (ajax) params=%s", query)
    headers = {
        "Accept": "text/html, */*; q=0.01",
        "X-Requested-With": "XMLHttpRequest",
        "Referer": _url(settings, "/arvore/"),
    }
    resp = session.get(
        _url(settings, "/arvore/"),
        params=query,
        headers=headers,
        timeout=settings.timeout_s,
    )
    resp.raise_for_status()
    return resp
