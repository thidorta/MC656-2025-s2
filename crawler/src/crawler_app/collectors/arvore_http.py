from __future__ import annotations
import logging
import time
import requests
from typing import Optional

from ..utils.logging_helpers import log_response_with_selects
from .config import BASE

LOGGER_NAME = "arvore_http"
logger = logging.getLogger(LOGGER_NAME)


def polite_sleep(delay_range=(0.5, 1.2)):
    import random
    time.sleep(random.uniform(*delay_range))


def fetch_arvore_page(session: requests.Session, *, raw_dir: str, label: str, curso_id: Optional[str] = None) -> str:
    params = {"curso": curso_id} if curso_id else {}
    logger.info("[GET] /arvore/ params=%s", params if params else "{}")
    resp = session.get(f"{BASE}/arvore/", params=params, timeout=30)
    resp.raise_for_status()
    log_response_with_selects(label, resp, raw_dir, filename=f"{label}.html")
    return resp.text


def fetch_modalidades_fragment(session: requests.Session, *, curso_id: str, catalogo_id: str, raw_dir: str, label: str) -> str:
    params = {"c": curso_id, "a": catalogo_id, "o": "1"}
    headers = {
        "Accept": "text/html, */*; q=0.01",
        "X-Requested-With": "XMLHttpRequest",
        "Origin": BASE,
        "Referer": f"{BASE}/arvore/?catalogo={catalogo_id}&curso={curso_id}",
    }
    csrf = session.cookies.get("csrfptoken")
    if csrf:
        headers["X-CSRFP-TOKEN"] = csrf

    logger.info("[POST] /ajax/modalidades.php params=%s (csrf=%s)", params, "set" if csrf else "missing")
    resp = session.post(f"{BASE}/ajax/modalidades.php", params=params, headers=headers, data=b"", timeout=30)
    resp.raise_for_status()
    log_response_with_selects(label, resp, raw_dir, filename=f"{label}.html")
    return resp.text


def fetch_arvore_with_params(session: requests.Session, *, curso_id: str, catalogo_id: str, modalidade_id: str, periodo_id: str, cp: str, raw_dir: str) -> str:
    params = {
        "curso": curso_id,
        "modalidade": modalidade_id,
        "catalogo": catalogo_id,
        "periodo": periodo_id,
        "cp": cp,
    }
    label = f"arvore_c{curso_id}_a{catalogo_id}_m{modalidade_id}_p{periodo_id}"
    logger.info("[GET] /arvore/ params=%s", params)
    resp = session.get(f"{BASE}/arvore/", params=params, timeout=40)
    resp.raise_for_status()
    log_response_with_selects(label, resp, raw_dir, filename=f"{label}.html")
    return resp.text
