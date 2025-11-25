from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.config.settings import get_settings
from main import app

client = TestClient(app)


def test_get_courses_returns_items():
    response = client.get("/api/v1/courses")
    assert response.status_code == 200
    body = response.json()
    assert isinstance(body, list) and body, "courses list should not be empty"
    first = body[0]
    assert {"id", "codigo", "nome"}.issubset(first.keys())


def test_curriculum_summary_has_options():
    response = client.get("/api/v1/curriculum")
    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload, list) and payload
    sample = payload[0]
    assert {"course_id", "course_code", "course_name", "options"}.issubset(sample.keys())
    assert sample["options"], "each course must list available curriculum options"


def test_curriculum_detail_returns_structure():
    response = client.get("/api/v1/curriculum/34", params={"year": 2019})
    assert response.status_code == 200
    data = response.json()
    expected_keys = {
        "curriculum_id",
        "course",
        "year",
        "modalidade",
        "parameters",
        "disciplinas_obrigatorias",
        "disciplinas_eletivas",
        "disciplines",
    }
    assert expected_keys.issubset(data.keys())
    assert isinstance(data["disciplinas_obrigatorias"], list)
    assert isinstance(data["disciplines"], list) and data["disciplines"]


@pytest.mark.skipif(
    not (get_settings().user_db_root / "611894").exists(),
    reason="sample planner data not present",
)
def test_user_db_snapshot_available():
    response = client.get("/api/v1/user-db/611894")
    assert response.status_code == 200
    data = response.json()
    assert data.get("planner_id") == "611894"
    assert data.get("count", 0) >= 1
