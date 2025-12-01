"""
Test: Verify planned courses fix

This test verifies that:
1. New snapshots don't auto-import planned courses
2. planejado_metadata is always empty
3. Tree endpoint returns empty planning
4. Planner endpoint returns empty planning
5. Only PUT /planner can create planned courses
"""

import json
import pytest
from sqlalchemy.orm import Session

from app.db.models_planner import GdeSnapshotModel, PlannedCourseModel
from app.db.repositories.snapshot_repo import SnapshotRepository
from app.db.repositories.planner_repo import PlannerRepository
from app.services import planner_service


def test_snapshot_creation_ignores_planejado_metadata(db_session: Session):
    """Verify that creating a snapshot doesn't import planned courses from GDE."""
    
    # Mock user_db with planejado metadata (as if from GDE)
    user_db_with_planning = {
        "user": {"name": "Test User", "ra": "123456"},
        "course": {"id": "34", "name": "Test Course"},
        "year": 2022,
        "current_period": "20261",
        "cp": 4.0,
        "integralizacao_meta": {},
        "planejado": {  # This should be IGNORED
            "periodo": "20261",
            "disciplinas": ["MC102", "MA111", "MC202"],
        },
        "faltantes": {},
        "curriculum": [],
    }
    
    # Create snapshot
    snapshot_repo = SnapshotRepository()
    snapshot = snapshot_repo.create_snapshot_from_gde(
        session=db_session,
        user_id=9999,
        planner_id="TEST123",
        user_db_payload=user_db_with_planning,
    )
    
    # Verify snapshot was created
    assert snapshot is not None
    assert snapshot.user_id == 9999
    assert snapshot.planner_id == "TEST123"
    
    # Verify planejado_metadata is EMPTY (not imported from GDE)
    assert snapshot.planejado_metadata == "{}"
    
    # Verify no planned courses were created
    planned_courses = db_session.query(PlannedCourseModel).filter_by(user_id=9999).all()
    assert len(planned_courses) == 0, "No planned courses should be created from snapshot"


def test_snapshot_to_user_db_returns_empty_planejado(db_session: Session):
    """Verify that snapshot.to_user_db_dict() returns empty planejado."""
    
    user_db = {
        "user": {"name": "Test User", "ra": "123456"},
        "course": {"id": "34", "name": "Test Course"},
        "year": 2022,
        "current_period": "20261",
        "cp": 4.0,
        "integralizacao_meta": {},
        "planejado": {},  # Empty as expected
        "faltantes": {},
        "curriculum": [],
    }
    
    snapshot_repo = SnapshotRepository()
    snapshot = snapshot_repo.create_snapshot_from_gde(
        session=db_session,
        user_id=9998,
        planner_id="TEST456",
        user_db_payload=user_db,
    )
    
    # Convert back to dict
    result_dict = snapshot.to_user_db_dict()
    
    # Verify planejado is empty
    assert "planejado" in result_dict
    assert result_dict["planejado"] == {}, "planejado should always be empty dict"


def test_build_user_db_returns_empty_planejado(db_session: Session):
    """Verify that build_user_db_from_snapshot returns empty planejado."""
    
    user_db = {
        "user": {"name": "Test User", "ra": "123456"},
        "course": {"id": "34", "name": "Test Course"},
        "year": 2022,
        "current_period": "20261",
        "cp": 4.0,
        "integralizacao_meta": {},
        "planejado": {},
        "faltantes": {},
        "curriculum": [],
    }
    
    snapshot_repo = SnapshotRepository()
    snapshot_repo.create_snapshot_from_gde(
        session=db_session,
        user_id=9997,
        planner_id="TEST789",
        user_db_payload=user_db,
    )
    
    # Build user_db from snapshot
    result = planner_service.build_user_db_from_snapshot(db_session, 9997)
    
    assert result is not None
    assert "planejado" in result
    assert result["planejado"] == {}, "planejado should be empty"


def test_build_planner_response_empty_by_default(db_session: Session):
    """Verify that build_planner_response returns empty planned_courses by default."""
    
    user_db = {
        "user": {"name": "Test User", "ra": "123456"},
        "course": {"id": "34", "name": "Test Course"},
        "year": 2022,
        "current_period": "20261",
        "cp": 4.0,
        "integralizacao_meta": {},
        "planejado": {},
        "faltantes": {},
        "curriculum": [],
    }
    
    snapshot_repo = SnapshotRepository()
    snapshot_repo.create_snapshot_from_gde(
        session=db_session,
        user_id=9996,
        planner_id="TEST999",
        user_db_payload=user_db,
    )
    
    # Build planner response
    response = planner_service.build_planner_response(
        session=db_session,
        user_id=9996,
        planner_id="TEST999",
    )
    
    # Verify planned_courses is empty
    assert "planned_courses" in response
    assert response["planned_courses"] == {}, "planned_courses should be empty by default"
    
    # Verify current_payload is original (no modifications)
    assert response["current_payload"] == response["original_payload"]


def test_only_put_planner_creates_planned_courses(db_session: Session):
    """Verify that only update_planned_courses can create planned courses."""
    
    user_db = {
        "user": {"name": "Test User", "ra": "123456"},
        "course": {"id": "34", "name": "Test Course"},
        "year": 2022,
        "current_period": "20261",
        "cp": 4.0,
        "integralizacao_meta": {},
        "planejado": {},
        "faltantes": {},
        "curriculum": [
            {
                "codigo": "MC102",
                "nome": "Algoritmos",
                "creditos": 6,
                "semestre": 1,
                "offers": [
                    {"turma": "A", "id": "123"},
                    {"turma": "B", "id": "124"},
                ],
            }
        ],
    }
    
    snapshot_repo = SnapshotRepository()
    snapshot_repo.create_snapshot_from_gde(
        session=db_session,
        user_id=9995,
        planner_id="TEST888",
        user_db_payload=user_db,
    )
    
    # Verify no planned courses exist yet
    planned_before = db_session.query(PlannedCourseModel).filter_by(user_id=9995).all()
    assert len(planned_before) == 0
    
    # Simulate PUT /planner/modified
    planned_payload = {
        "curriculum": [
            {
                "codigo": "MC102",
                "offers": [
                    {"turma": "A", "adicionado": True},  # User selected turma A
                ],
            }
        ]
    }
    
    planner_service.update_planned_courses(
        session=db_session,
        user_id=9995,
        planned_payload=planned_payload,
    )
    
    # Verify planned course was created
    planned_after = db_session.query(PlannedCourseModel).filter_by(user_id=9995).all()
    assert len(planned_after) == 1
    assert planned_after[0].codigo == "MC102"
    assert planned_after[0].turma == "A"
    assert planned_after[0].added_by_user == 1
    assert planned_after[0].source == "curriculum"


def test_planner_response_reflects_user_selections(db_session: Session):
    """Verify that planner response includes user's planned courses."""
    
    user_db = {
        "user": {"name": "Test User", "ra": "123456"},
        "course": {"id": "34", "name": "Test Course"},
        "year": 2022,
        "current_period": "20261",
        "cp": 4.0,
        "integralizacao_meta": {},
        "planejado": {},
        "faltantes": {},
        "curriculum": [
            {
                "codigo": "MC102",
                "nome": "Algoritmos",
                "creditos": 6,
                "semestre": 1,
                "offers": [{"turma": "A", "id": "123"}],
            }
        ],
    }
    
    snapshot_repo = SnapshotRepository()
    snapshot_repo.create_snapshot_from_gde(
        session=db_session,
        user_id=9994,
        planner_id="TEST777",
        user_db_payload=user_db,
    )
    
    # Add planned course via service
    planner_repo = PlannerRepository()
    planner_repo.upsert_planned_course(
        session=db_session,
        user_id=9994,
        codigo="MC102",
        turma="A",
        source="USER",
        added_by_user=True,
    )
    
    # Build planner response
    response = planner_service.build_planner_response(
        session=db_session,
        user_id=9994,
        planner_id="TEST777",
    )
    
    # Verify planned_courses includes user's selection
    assert "planned_courses" in response
    assert response["planned_courses"] == {"MC102": "A"}
    
    # Verify current_payload is modified (not original)
    assert response["current_payload"] != response["original_payload"]
    assert response["current_payload"] == response["modified_payload"]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
