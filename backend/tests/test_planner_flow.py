import os
import sqlite3
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

app = None


def alembic_upgrade_head(tmp_db_path: Path):
    # Point settings to tmp db via env var
    os.environ["USER_AUTH_DB_PATH"] = str(tmp_db_path)
    # Run alembic upgrade programmatically
    import subprocess, sys
    subprocess.check_call([sys.executable, "-m", "alembic", "upgrade", "head"], cwd=Path(__file__).resolve().parents[1])


@pytest.fixture(scope="function")
def client(tmp_path, monkeypatch):
    # Prepare temp DB
    db_path = tmp_path / "user_auth.db"
    alembic_upgrade_head(db_path)

    # No pre-seeded user; login will create one after GDE stub

    # Import app after env and migration so settings cache picks new DB
    global app
    from importlib import import_module
    app_module = import_module("main")
    app = app_module.app
    return TestClient(app)


def test_user_db_planner_attendance_flow(client):
    # Seed snapshot directly via service
    sample_user_db = {
        "planner_id": "p123",
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
                    {
                        "id": 1,
                        "turma": "A",
                        "vagas": 50,
                        "events": [
                            {
                                "day": 0,
                                "start_hour": 8,
                                "end_hour": 10,
                                "start": "2025-08-04T08:00:00-03:00",
                                "end": "2025-08-04T10:00:00-03:00",
                                "title": "MC102 Aula CB01",
                                "location": "CB01",
                            }
                        ],
                    },
                    {"id": 2, "turma": "B", "vagas": 50, "events": []},
                ],
            }
        ],
        "disciplines": [],
    }

    # Create user and save snapshot
    import sqlite3, os
    from pathlib import Path
    tmp_db = Path(os.environ["USER_AUTH_DB_PATH"])
    conn = sqlite3.connect(tmp_db)
    conn.execute("INSERT INTO users (id, username, password_hash, planner_id) VALUES (?,?,?,?)", (2002, "tester", "hash", "p123"))
    conn.commit(); conn.close()

    from app.db.session import SessionLocal
    from app.services.planner_service import save_gde_snapshot
    sess = SessionLocal()
    save_gde_snapshot(sess, 2002, "p123", {}, sample_user_db)
    sess.close()

    # Create token
    from app.utils.security import create_access_token
    token = create_access_token({"uid": 2002, "sub": "2002", "planner_id": "p123"})
    headers = {"Authorization": f"Bearer {token}"}

    # GET /user-db/me
    r = client.get("/api/v1/user-db/me", headers=headers)
    assert r.status_code == 200
    me = r.json()
    assert set(["planner_id", "user_db", "count", "last_updated"]).issubset(me.keys())

    # GET /planner
    r = client.get("/api/v1/planner/", headers=headers)
    assert r.status_code == 200
    planner = r.json()
    assert set(["planner_id", "original_payload", "modified_payload", "current_payload", "planned_courses"]).issubset(planner.keys())

    # PUT /planner/modified
    payload_planner = {
        "payload": {
            "planned_codes": ["MC102"],
            "curriculum": [
                {"codigo": "MC102", "offers": [{"turma": "A", "adicionado": True}]}
            ],
        }
    }
    r = client.put("/api/v1/planner/modified", headers=headers, json=payload_planner)
    assert r.status_code == 200
    after = r.json()
    assert after["planned_courses"].get("MC102") == "A"

    export_payload = {"start_date": "2025-08-04", "end_date": "2025-12-15"}
    r = client.post("/api/v1/planner/export", headers=headers, json=export_payload)
    assert r.status_code == 200
    export = r.json()
    assert export["event_count"] == 1
    assert export["timezone"] == "America/Sao_Paulo"
    assert export["filename"].endswith(".ics")
    assert "BEGIN:VCALENDAR" in export["ics_content"]

    # Attendance PUT/GET
    override_payload = {
        "overrides": {
            "MC102": {
                "absencesUsed": 2,
                "requiresAttendance": True,
                "alertEnabled": False,
            }
        }
    }
    r = client.put("/api/v1/attendance/", headers=headers, json=override_payload)
    assert r.status_code == 200
    r = client.get("/api/v1/attendance/", headers=headers)
    assert r.status_code == 200
    att = r.json()
    mc102 = att["overrides"]["MC102"]
    assert mc102["absencesUsed"] == 2
    assert mc102["requiresAttendance"] is True
    assert mc102["alertEnabled"] is False