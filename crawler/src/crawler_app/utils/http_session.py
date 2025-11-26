from __future__ import annotations

import re
from typing import Optional

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from ..config.settings import CrawlerSettings

DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/119.0.0.0 Safari/537.36"
    ),
    "Accept": "*/*",
    "Accept-Language": "en-US,en;q=0.9",
    "Connection": "keep-alive",
}


def build_session(settings: CrawlerSettings) -> requests.Session:
    session = requests.Session()
    session.headers.update(DEFAULT_HEADERS)

    retry = Retry(
        total=settings.retries,
        status=settings.retries,
        backoff_factor=0.2,
        status_forcelist=(500, 502, 503, 504),
        allowed_methods=frozenset({"GET", "POST"}),
        raise_on_status=False,
    )
    adapter = HTTPAdapter(max_retries=retry)
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    return session


def create_session() -> requests.Session:
    s = requests.Session()
    s.headers.update(DEFAULT_HEADERS)
    return s


def ensure_csrf_cookie(session: requests.Session, base_url: str) -> Optional[str]:
    for path in ("/arvore/", "/login/", "/"):
        try:
            r = session.get(base_url.rstrip("/") + path, timeout=20)
            r.raise_for_status()
        except Exception:
            continue
        csrf = session.cookies.get("csrfptoken")
        if csrf:
            return csrf
    return session.cookies.get("csrfptoken")


def login_via_ajax(
    session: requests.Session,
    base_url: str,
    user: str,
    password: str,
    csrf: Optional[str] = None,
):
    url = base_url.rstrip("/") + "/ajax/login.php"
    headers = {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-Requested-With": "XMLHttpRequest",
        "Origin": base_url.rstrip("/"),
        "Referer": base_url.rstrip("/") + "/login/",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
    }
    csrf_cookie = session.cookies.get("csrfptoken")
    token_to_send = csrf or csrf_cookie
    if token_to_send:
        headers["X-CSRFP-TOKEN"] = token_to_send

    data = {
        "old": "1",
        "token": "",
        "login": user,
        "senha": password,
        "lembrar": "t",
        "OK": "+",
    }

    resp = session.post(url, headers=headers, data=data, timeout=30)
    resp.raise_for_status()

    # Try to discover the planner ID so downstream calls don't rely on env vars.
    try:
        planner_resp = session.get(base_url.rstrip("/") + "/planejador/", timeout=20)
        planner_resp.raise_for_status()
        pattern = r"InicializarPlanejador\([\'\"](\d+)[\'\"]\)"
        match = re.search(pattern, planner_resp.text)
        if match:
            session.gde_planejador_id = match.group(1)
    except Exception:
        pass

    return resp

