# Legacy Removal Report (Phase 4)

This report maps what is fully migrated to relational-only flows and highlights remaining legacy JSON paths marked for cleanup.

## Relational-Only Endpoints
- POST `/auth/login`: Saves GDE snapshot via `planner_service.save_gde_snapshot` (relational tables).
- GET `/user-db/me`: Uses `planner_service.build_user_db_from_snapshot`.
- GET `/planner`: Uses `planner_service.build_planner_response`.
- PUT `/planner/modified`: Uses `planner_service.update_planned_courses` → `planned_courses` rows.
- GET `/attendance`: Uses `planner_service.get_attendance_overrides`.
- PUT `/attendance`: Uses `planner_service.save_attendance_overrides` → `attendance_overrides` rows.

## Remaining Legacy JSON Paths
- `backend/app/services/planner_store.py`
  - `load`: Reads `planner_original`/`planner_modified` JSON blobs. // LEGACY STILL IN USE
  - `refresh_from_user_db`: Writes planner JSON blobs. // LEGACY STILL IN USE
  - `save_modified`: Persists modified planner JSON + local events. // LEGACY STILL IN USE
  - `_fetch_one`, `_persist_events`, `_upsert`: JSON blob operations. // LEGACY STILL IN USE
- `backend/app/db/user_store.py` (deprecated)
  - `update_user_snapshot`, `get_user_snapshot`: `users.user_db_json` blob.
  - `save_attendance_overrides`, `load_attendance_overrides`: `attendance_overrides.overrides_json` blob.
  - `save_planned_courses`, `load_planned_courses`: legacy `planner_courses` table. `load_planned_courses` is referenced in `auth.py` to seed the legacy `session_store`; plan to replace with `PlannerRepository` and remove.

## Action Plan
- Replace session seeding in `auth.py` to read planned courses via `PlannerRepository.get_planned_courses_map`.
- Delete legacy functions after confirming no imports remain.
- Apply schema cleanup migration to drop `planner_courses`, `users.user_db_json`, and `attendance_overrides.overrides_json`.

## Validation
- Integration tests: `backend/tests/test_planner_flow.py`, `backend/tests/test_auth_login.py` validate contracts and relational persistence.
- Manual app checklist available under `docs/backend/APP_MANUAL_CHECKLIST.md`.
