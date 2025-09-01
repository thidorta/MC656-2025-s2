from __future__ import annotations
import logging
import os
import shutil


from dotenv import load_dotenv

from src.utils.http_session import create_session, ensure_csrf_cookie, login_via_ajax
from src.utils.logging_helpers import print_session_cookies
from .enumerate_pipeline import enumerate_dimensions

LOGGER_NAME = "enumerate_dimensions_runner"
logger = logging.getLogger(LOGGER_NAME)

if not logger.handlers:
    _h = logging.StreamHandler()
    _fmt = logging.Formatter("[%(levelname)s] %(asctime)s %(name)s: %(message)s", datefmt="%H:%M:%S")
    _h.setFormatter(_fmt)
    logger.addHandler(_h)
logger.setLevel(logging.INFO)

from .config import BASE  # keep after logger to avoid circular issues


def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
    outputs = os.path.join(base_dir, "outputs")
    raw_dir = os.path.join(outputs, "raw")
    if os.path.exists(outputs):
        shutil.rmtree(outputs)
        logger.info(f"Pasta '{outputs}' e seu conteúdo apagados com sucesso.")
    os.makedirs(outputs, exist_ok=True)

    load_dotenv()
    user = os.getenv("GDE_LOGIN")
    password = os.getenv("GDE_SENHA")
    csrf_from_env = os.getenv("GDE_CSRF", "")  # opcional

    if not user or not password:
        raise SystemExit("Defina GDE_LOGIN e GDE_SENHA no .env para autenticar.")

    s = create_session()
    print_session_cookies(s, prefix="Sessão recém-criada")
    ensure_csrf_cookie(s, BASE)
    print_session_cookies(s, prefix="Sessão após ensure_csrf_cookie (pré-login)")

    logger.info("[LOGIN] POST /ajax/login.php …")
    resp_login = login_via_ajax(s, BASE, user, password, csrf=csrf_from_env or None)
    logger.info("Login status: %s", getattr(resp_login, "status_code", "?"))
    logger.debug("Login body (prévia): %s", (getattr(resp_login, "text", "") or "").strip().replace("\n", " ")[:200])
    print_session_cookies(s, prefix="Sessão após login")

    # Sem DB: apenas varredura + JSONs
    enumerate_dimensions(s, raw_dir)


if __name__ == "__main__":
    main()