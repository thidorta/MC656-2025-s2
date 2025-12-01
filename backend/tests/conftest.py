import os
from pathlib import Path
import subprocess
import sys
import pytest


def alembic_upgrade_head(tmp_db_path: Path):
    """Run Alembic migrations against a temporary SQLite DB for tests."""
    os.environ["USER_AUTH_DB_PATH"] = str(tmp_db_path)
    backend_root = Path(__file__).resolve().parents[1]
    subprocess.check_call([sys.executable, "-m", "alembic", "upgrade", "head"], cwd=backend_root)


@pytest.fixture(scope="function")
def db_session(tmp_path):
    """Provide a SQLAlchemy Session bound to a temp test DB."""
    db_path = tmp_path / "user_auth.db"
    alembic_upgrade_head(db_path)

    # Import after migrations so settings pick up USER_AUTH_DB_PATH
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
    from app.db.session import SessionLocal

    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
