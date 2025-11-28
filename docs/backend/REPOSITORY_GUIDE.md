# Repository Layer - Quick Reference

This guide provides quick examples for using the repository layer.

**Date:** November 27, 2025  
**Branch:** feature/app-run

---

## Setup

```python
from sqlalchemy.orm import Session
from app.db.repositories import (
    SnapshotRepository,
    CurriculumRepository,
    PlannerRepository,
    AttendanceRepository,
)

# Assuming you have a session (e.g., from dependency injection)
session: Session = get_db_session()
user_id: int = get_current_user_id()
```

---

## Common Patterns

### 1. Create Snapshot on Login (POST /auth/login)

```python
# After validating GDE credentials and getting user_db payload
from app.db.repositories import SnapshotRepository

snapshot = SnapshotRepository.create_snapshot_from_gde(
    session=session,
    user_id=user_id,
    planner_id=planner_id,
    user_db_payload=user_db_dict,  # Complete dict from GDE
)

# This creates:
# - 1 GdeSnapshotModel row
# - N CurriculumDisciplineModel rows
# - M DisciplinePrerequisiteModel rows
# - K CourseOfferModel rows
# - J OfferScheduleEventModel rows
```

---

### 2. Build GET /user-db/me Response

```python
from app.db.repositories import SnapshotRepository, CurriculumRepository

# 1. Get latest snapshot
snapshot = SnapshotRepository.get_latest_snapshot(session, user_id)
if not snapshot:
    return {"user_db": None, "count": 0, "last_updated": None}

# 2. Get curriculum
disciplines = CurriculumRepository.list_curriculum_for_snapshot(
    session, user_id, snapshot.id
)

# 3. Get prerequisites (batch)
disc_ids = [d.id for d in disciplines]
prereqs_map = CurriculumRepository.list_prereqs_for_curriculum_ids(
    session, disc_ids
)

# 4. Get offers (batch)
offers_map = CurriculumRepository.list_offers_for_curriculum(
    session, disc_ids
)

# 5. Get events (batch)
all_offers = [offer for offers in offers_map.values() for offer in offers]
offer_ids = [o.id for o in all_offers]
events_map = CurriculumRepository.list_events_for_offers(session, offer_ids)

# 6. Build curriculum array
curriculum = []
for disc in disciplines:
    # Get prereqs for this discipline
    prereqs = prereqs_map.get(disc.id, [])
    
    # Get offers for this discipline
    offers = offers_map.get(disc.id, [])
    offers_with_events = []
    for offer in offers:
        events = events_map.get(offer.id, [])
        offers_with_events.append(
            offer.to_offer_dict(
                adicionado=False,  # Always false in user_db
                events=[e.to_event_dict() for e in events]
            )
        )
    
    curriculum.append(
        disc.to_curriculum_dict(prereqs=prereqs, offers=offers_with_events)
    )

# 7. Build final response
user_db = snapshot.to_user_db_dict()
user_db["curriculum"] = curriculum

return {
    "planner_id": snapshot.planner_id,
    "user_db": user_db,
    "count": 1,
    "last_updated": snapshot.fetched_at,
}
```

---

### 3. Build GET /planner Response

```python
from app.db.repositories import (
    SnapshotRepository,
    CurriculumRepository,
    PlannerRepository,
)

# Steps 1-6: Same as /user-db/me to build original_payload
snapshot = SnapshotRepository.get_latest_snapshot(session, user_id)
# ... build curriculum array ...
original_payload = snapshot.to_user_db_dict()
original_payload["curriculum"] = curriculum

# 7. Get planned courses
planned_courses_map = PlannerRepository.get_planned_courses_map(session, user_id)
# Returns: {"MC102": "A", "MA111": "B"}

# 8. Build modified_payload
modified_payload = None
if planned_courses_map:
    # Clone original
    import copy
    modified_payload = copy.deepcopy(original_payload)
    
    # Mark offers as adicionado where planned
    has_modifications = False
    for disc in modified_payload["curriculum"]:
        codigo = disc["codigo"]
        if codigo in planned_courses_map:
            planned_turma = planned_courses_map[codigo]
            for offer in disc["offers"]:
                if offer["turma"] == planned_turma:
                    offer["adicionado"] = True
                    has_modifications = True
    
    # If no actual modifications, set to None
    if not has_modifications:
        modified_payload = None

# 9. Current payload
current_payload = modified_payload if modified_payload else original_payload

return {
    "planner_id": snapshot.planner_id,
    "original_payload": original_payload,
    "modified_payload": modified_payload,
    "current_payload": current_payload,
    "planned_courses": planned_courses_map,
}
```

---

### 4. Handle POST /planner/modified

```python
from app.db.repositories import PlannerRepository

# 1. Extract planned courses from request payload
def extract_planned_courses(payload: dict) -> list[dict]:
    """Extract {codigo, turma} pairs from planner payload."""
    planned = []
    
    # From planned_codes
    planned_codes = payload.get("planned_codes", [])
    for code in planned_codes:
        planned.append({
            "codigo": str(code).strip().upper(),
            "turma": "",  # Default unknown
            "source": "USER",
            "added_by_user": 1,
        })
    
    # Refine from curriculum[].offers[].adicionado
    curriculum = payload.get("curriculum", [])
    for disc in curriculum:
        codigo = str(disc.get("codigo", "")).strip().upper()
        if not codigo:
            continue
        
        offers = disc.get("offers", [])
        for offer in offers:
            if offer.get("adicionado"):
                # Find existing or create new
                existing = next((p for p in planned if p["codigo"] == codigo), None)
                if existing:
                    existing["turma"] = offer.get("turma", "")
                else:
                    planned.append({
                        "codigo": codigo,
                        "turma": offer.get("turma", ""),
                        "source": "USER",
                        "added_by_user": 1,
                    })
                break  # Only first adicionado
    
    return planned

# 2. Update database
request_payload = request_body["payload"]
planned_entries = extract_planned_courses(request_payload)

PlannerRepository.replace_planned_courses(
    session, user_id, planned_entries
)

# 3. Return updated GET /planner response
# (Same logic as above)
```

---

### 5. Handle GET /attendance

```python
from app.db.repositories import AttendanceRepository

overrides_map = AttendanceRepository.get_overrides_map(session, user_id)
# Returns: {"MC102": {"presencas": 10, "total_aulas": 30}, ...}

return {
    "planner_id": get_user_planner_id(user_id),
    "overrides": overrides_map,
}
```

---

### 6. Handle POST /attendance

```python
from app.db.repositories import AttendanceRepository

# Request: {"overrides": {"MC102": {"presencas": 12, "total_aulas": 30}}}
overrides_dict = request_body["overrides"]

AttendanceRepository.upsert_overrides(
    session, user_id, overrides_dict
)

return {
    "status": "ok",
    "planner_id": get_user_planner_id(user_id),
}
```

---

## Session Management

### Using Dependency Injection (Recommended)

```python
from fastapi import Depends
from sqlalchemy.orm import Session

def get_db() -> Session:
    """Dependency that provides a database session."""
    # Implementation depends on your setup
    from app.db.session import SessionLocal
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/planner")
async def get_planner(
    session: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    # Use repositories with session
    snapshot = SnapshotRepository.get_latest_snapshot(session, user_id)
    # ...
```

### Using Context Manager

```python
from app.db.session import SessionLocal

def some_service_function(user_id: int):
    with SessionLocal() as session:
        # Repositories automatically commit on success
        PlannerRepository.replace_planned_courses(
            session, user_id, planned_entries
        )
        # Session auto-closed on exit
```

---

## Error Handling

All repository methods assume valid input. Add validation in your service/endpoint layer:

```python
from fastapi import HTTPException

# Before calling repository
if not user_id:
    raise HTTPException(status_code=401, detail="Unauthorized")

snapshot = SnapshotRepository.get_latest_snapshot(session, user_id)
if not snapshot:
    raise HTTPException(
        status_code=404,
        detail="No snapshot found. Please login again."
    )
```

---

## Performance Tips

1. **Batch Queries**: Use `list_prereqs_for_curriculum_ids` instead of querying one-by-one
2. **Eager Loading**: Consider using `joinedload` for relationships if needed
3. **Index Usage**: All common queries are indexed (user_id, codigo, etc.)
4. **Transaction Batching**: Repositories commit after writes - batch updates when possible

---

## Migration Path

When migrating from old JSON-based storage:

```python
# Old way (deprecated)
from app.db.user_store import load_planned_courses
planned = load_planned_courses(user_id)  # Returns dict

# New way
from app.db.repositories import PlannerRepository
planned = PlannerRepository.get_planned_courses_map(session, user_id)
```

Both return the same format: `{"MC102": "A", "MA111": "B"}`

---

**End of Quick Reference**
