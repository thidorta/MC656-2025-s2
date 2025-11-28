"""
Smoke test: Create GDE snapshot from sample data and verify reconstruction.
"""
import json
from app.db.session import SessionLocal
from app.services.planner_service import save_gde_snapshot, build_user_db_from_snapshot, build_planner_response
from app.db.repositories.snapshot_repo import SnapshotRepository

# Sample minimal GDE-like payload
sample_user_db = {
    "planner_id": "test123",
    "user": {"name": "Test Student", "ra": "123456"},
    "course": {"id": 42, "name": "Ciência da Computação"},
    "year": 2018,
    "current_period": "2025s1",
    "cp": 0.5,
    "parameters": {"catalogo": "2018", "periodo": "2025s1", "cp": "0"},
    "planejado": {},
    "integralizacao_meta": {},
    "faltantes": {},
    "curriculum": [
        {
            "disciplina_id": "mc102",
            "codigo": "MC102",
            "nome": "Algoritmos e Programação de Computadores",
            "creditos": 6,
            "catalogo": 2018,
            "tipo": "OB",
            "semestre": 1,
            "cp_group": "AA",
            "tem": False,
            "pode": True,
            "obs": None,
            "color": "#blue",
            "prereqs": [],
            "offers": [
                {
                    "id": 9001,
                    "turma": "A",
                    "vagas": 50,
                    "vagas_ocupadas": 35,
                    "professor": "Prof. Ada Lovelace",
                    "observacao": "",
                    "events": [
                        {
                            "title": "MC102-A IM12",
                            "start": "2025-03-03T14:00:00Z",
                            "end": "2025-03-03T16:00:00Z",
                            "day": 0,
                            "start_hour": 14,
                            "end_hour": 16,
                        }
                    ]
                },
                {
                    "id": 9002,
                    "turma": "B",
                    "vagas": 50,
                    "vagas_ocupadas": 40,
                    "professor": "Prof. Alan Turing",
                    "observacao": "",
                    "events": []
                }
            ]
        }
    ],
    "disciplines": []
}

def main():
    session = SessionLocal()
    user_id = 999
    planner_id = "test123"

    # Save snapshot
    print("\n=== Saving GDE snapshot ===")
    save_gde_snapshot(
        session=session,
        user_id=user_id,
        planner_id=planner_id,
        gde_payload={},
        user_db=sample_user_db,
    )
    print("OK Snapshot saved")

    # Verify snapshot created
    snapshot_repo = SnapshotRepository()
    snapshot = snapshot_repo.get_latest_snapshot(session, user_id)
    print(f"OK Latest snapshot: id={snapshot.id}, planner_id={snapshot.planner_id}, fetched_at={snapshot.fetched_at}")

    # Reconstruct user_db
    print("\n=== Reconstructing user_db ===")
    rebuilt = build_user_db_from_snapshot(session, user_id)
    if rebuilt:
        print("OK user_db reconstructed")
        print(f"  user.name: {rebuilt.get('user', {}).get('name')}")
        print(f"  course.name: {rebuilt.get('course', {}).get('name')}")
        print(f"  curriculum count: {len(rebuilt.get('curriculum', []))}")
        if rebuilt.get('curriculum'):
            first = rebuilt['curriculum'][0]
            print(f"  first course: {first.get('codigo')} - {first.get('nome')}")
            print(f"  first course offers: {len(first.get('offers', []))} turmas")
    else:
        print("ERROR Failed to rebuild user_db")

    # Verify planner response includes curriculum
    print("\n=== Building planner response ===")
    planner = build_planner_response(session, user_id, planner_id)
    print(f"  original_payload empty: {not bool(planner['original_payload'])}")
    print(f"  planned_courses: {planner['planned_courses']}")
    if planner['original_payload']:
        orig_curriculum = planner['original_payload'].get('curriculum', [])
        print(f"  original_payload.curriculum count: {len(orig_curriculum)}")

    session.close()
    print("\nOK All checks passed!")

if __name__ == "__main__":
    main()
