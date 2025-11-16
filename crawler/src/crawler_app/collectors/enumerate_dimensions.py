from __future__ import annotations

import logging
import os
from pathlib import Path

from ..config.settings import CrawlerSettings
from ..utils.http_session import build_session, ensure_csrf_cookie, login_via_ajax
from ..utils.logging_helpers import print_session_cookies
from .enumerate_pipeline import enumerate_dimensions

LOGGER_NAME = "enumerate_dimensions_runner"
logger = logging.getLogger(LOGGER_NAME)

if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter("[%(levelname)s] %(asctime)s %(name)s: %(message)s", datefmt="%H:%M:%S")
    handler.setFormatter(formatter)
    logger.addHandler(handler)
logger.setLevel(logging.INFO)


def main():
    base_dir = Path(__file__).resolve().parents[3]
    data_dir = base_dir / "data"
    raw_dir = data_dir / "raw"
    os.makedirs(raw_dir, exist_ok=True)

    settings = CrawlerSettings()
    user = os.getenv("GDE_LOGIN")
    password = os.getenv("GDE_SENHA")
    csrf_from_env = os.getenv("GDE_CSRF", "")

    if not user or not password:
        raise SystemExit("Defina GDE_LOGIN e GDE_SENHA no .env para autenticar.")

    session = build_session(settings)
    print_session_cookies(session, prefix="Sessao recem-criada")
    ensure_csrf_cookie(session, settings.base_url)
    print_session_cookies(session, prefix="Sessao apos ensure_csrf_cookie (pre-login)")

    logger.info("[LOGIN] POST /ajax/login.php ...")
    resp_login = login_via_ajax(session, settings.base_url, user, password, csrf=csrf_from_env or None)
    logger.info("Login status: %s", getattr(resp_login, "status_code", "?"))
    logger.debug(
        "Login body (previa): %s",
        (getattr(resp_login, "text", "") or "").strip().replace("\n", " ")[:200],
    )
    print_session_cookies(session, prefix="Sessao apos login")

    enumerate_dimensions(session, settings, raw_dir.as_posix())


if __name__ == "__main__":
    main()
