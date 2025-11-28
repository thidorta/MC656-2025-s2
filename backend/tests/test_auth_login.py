import os
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

sample_user_db = {
    "user": {"name": "Tester", "ra": "RA"},
    "course": {"id": 1, "name": "Course"},
    "year": 2020,
    "current_period": "2025s1",
    "cp": 0.0,
    "parameters": {"catalogo": "2020", "periodo": "2025s1", "cp": "0"},
    "planejado": {},
    "integralizacao_meta": {},
    "faltantes": {},
    "curriculum": [
        {
            "disciplina_id": "mc102",
            "codigo": "MC102",
            "nome": "Algoritmos",
            "creditos": 6,
            "catalogo": 2020,
            "tipo": "OB",
            "semestre": 1,
            "cp_group": "AA",
            "tem": False,
            "pode": True,
            "prereqs": [],
            "offers": [
                {"id": 1, "turma": "A", "vagas": 50, "events": []},
                {"id": 2, "turma": "B", "vagas": 50, "events": []},
            ],
        }
    ],
    "disciplines": [],
}


def alembic_upgrade_head(tmp_db_path: Path):
    os.environ["USER_AUTH_DB_PATH"] = str(tmp_db_path)
    import subprocess, sys
    subprocess.check_call([sys.executable, "-m", "alembic", "upgrade", "head"], cwd=Path(__file__).resolve().parents[1])


@pytest.fixture(scope="function")
def client(tmp_path, monkeypatch):
    # Prepare temp DB and migrate
    db_path = tmp_path / "user_auth.db"
    alembic_upgrade_head(db_path)

    # Monkeypatch GDE fetcher to return deterministic data
    from app.services import gde_snapshot as gde_mod
    def fake_fetch(username: str, password: str):
        return ("p123", sample_user_db, {"raw": "gde"})
    monkeypatch.setattr(gde_mod, "fetch_user_db_with_credentials", fake_fetch)

    # Import app; settings pick up USER_AUTH_DB_PATH
    from importlib import import_module
    app_module = import_module("main")
    app = app_module.app
    return TestClient(app)


def test_login_contract_and_relational_persistence(client):
    # Call /auth/login
    r = client.post("/api/v1/auth/login", json={"username": "tester", "password": "secret"})
    assert r.status_code == 200
    data = r.json()
    # Assert contract keys
    assert set(["access_token", "refresh_token", "token_type", "planner_id", "user", "course", "year", "user_db"]).issubset(data.keys())
    assert data["planner_id"] == "p123"
    assert isinstance(data["user_db"], dict)

    # Use token to verify planner and user-db derived from relational state
    headers = {"Authorization": f"Bearer {data['access_token']}"}

    r = client.get("/api/v1/user-db/me", headers=headers)
    assert r.status_code == 200
    me = r.json()
    assert set(["planner_id", "user_db", "count", "last_updated"]).issubset(me.keys())

    r = client.get("/api/v1/planner/", headers=headers)
    assert r.status_code == 200
    planner = r.json()
    assert set(["planner_id", "original_payload", "modified_payload", "current_payload", "planned_courses"]).issubset(planner.keys())
