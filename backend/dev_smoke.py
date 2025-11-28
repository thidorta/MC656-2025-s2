import json
import sqlite3
from pathlib import Path

from fastapi.testclient import TestClient

from main import app
from app.utils.security import create_access_token
from app.config.settings import get_settings


def ensure_user(user_id: int, username: str, planner_id: str = "123"):
    settings = get_settings()
    db_path = settings.user_auth_db_path
    Path(db_path).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    try:
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        # check
        row = conn.execute("SELECT id FROM users WHERE id = ?", (user_id,)).fetchone()
        if not row:
            conn.execute(
                "INSERT INTO users (id, username, password_hash, planner_id) VALUES (?, ?, ?, ?)",
                (user_id, username, "smoke_hash", planner_id),
            )
            conn.commit()
    finally:
        conn.close()


def pretty(title: str, resp):
    print(f"\n=== {title} ===")
    print("Status:", resp.status_code)
    ctype = resp.headers.get("content-type", "")
    if "application/json" in ctype:
        try:
            print(json.dumps(resp.json(), ensure_ascii=False, indent=2))
        except Exception:
            print(resp.text)
    else:
        print(resp.text[:400])


def main():
    user_id = 999
    ensure_user(user_id, "smoketest", planner_id="123")

    token = create_access_token({"uid": user_id, "sub": str(user_id), "planner_id": "123"})
    headers = {"Authorization": f"Bearer {token}"}

    client = TestClient(app)

    # 1) GET /user-db/me (expect empty user_db initially)
    r = client.get("/api/v1/user-db/me", headers=headers)
    pretty("GET /user-db/me", r)

    # 2) GET /planner (expect empty payloads and planned_courses)
    r = client.get("/api/v1/planner/", headers=headers)
    pretty("GET /planner", r)

    # 3) PUT /attendance (save overrides)
    payload_att = {"overrides": {"MC102": {"presencas": 5, "total_aulas": 10}}}
    r = client.put("/api/v1/attendance/", headers=headers, json=payload_att)
    pretty("PUT /attendance", r)

    # 4) GET /attendance (should reflect saved overrides)
    r = client.get("/api/v1/attendance/", headers=headers)
    pretty("GET /attendance", r)

    # 5) PUT /planner/modified (set planned course selection)
    payload_planner = {
        "payload": {
            "planned_codes": ["MC102"],
            "curriculum": [
                {
                    "codigo": "MC102",
                    "offers": [
                        {"turma": "A", "adicionado": True},
                        {"turma": "B"}
                    ]
                }
            ]
        }
    }
    r = client.put("/api/v1/planner/modified", headers=headers, json=payload_planner)
    pretty("PUT /planner/modified", r)

    # 6) GET /planner again (should show planned_courses)
    r = client.get("/api/v1/planner/", headers=headers)
    pretty("GET /planner (after modified)", r)


if __name__ == "__main__":
    main()
