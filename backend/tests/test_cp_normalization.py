import pytest
from sqlalchemy.orm import Session

from app.db.repositories.snapshot_repo import SnapshotRepository


def test_to_user_db_dict_normalizes_cp_from_integralizacao_meta(db_session: Session):
    user_db_payload = {
        "user": {"name": "Test", "ra": "183611"},
        "course": {"id": "34", "name": "Engenharia"},
        "year": 2022,
        "current_period": "20261",
        "cp": 4.0,
        "integralizacao_meta": {
            "catalogo": "2022",
            "modalidade": "ENG",
            "ingresso": "2023-1",
            "limite_integralizacao": "2030-1",
            "semestre_atual": "2026-1",
            "cp_atual": "0,6872",
            "cpf_previsto": "0,7942",
        },
        "planejado": {},
        "faltantes": {},
        "curriculum": [],
    }

    snapshot_repo = SnapshotRepository()
    snapshot = snapshot_repo.create_snapshot_from_gde(
        session=db_session,
        user_id=1234,
        planner_id="TEST-CP",
        user_db_payload=user_db_payload,
    )

    result = snapshot.to_user_db_dict()
    assert result["cp"] == pytest.approx(0.6872)
