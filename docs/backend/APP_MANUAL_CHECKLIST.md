# Mobile App Manual Validation Checklist (Phase 4)

Validate the React Native / Expo app against the refactored backend. Contracts are fixed per `docs/backend/API_CONTRACT.md`.

## Login Flow
- Calls: `POST /api/v1/auth/login`
- UI success: navigates to home; shows user/course; tokens stored.
- Backend/DB: new row in `gde_snapshots`; curriculum, offers, events created; `users.planner_id` updated.
- Notes: No mutable JSON blobs persisted.

## View User DB
- Calls: `GET /api/v1/user-db/me`
- UI success: curriculum list and details render (names, credits, types).
- Backend: reads from relational snapshot + curriculum tables; `last_updated` matches snapshot timestamp.

## Load Planner
- Calls: `GET /api/v1/planner`
- UI success: planner tree/timeline shows offers; current selections highlighted; colors consistent.
- Backend: `original_payload` from snapshot; `modified_payload` reflects planned selections; `planned_courses` map from `planned_courses` rows.

## Modify Planner
- Calls: `PUT /api/v1/planner/modified` (body contains simple selection, e.g., MC102 → turma A)
- UI success: selected course highlights; planned counter/CP updates if applicable.
- Backend: upserts in `planned_courses`; subsequent `GET /planner` reflects selection.

## Attendance Overrides
- Calls: `PUT /api/v1/attendance` then `GET /api/v1/attendance`
- UI success: override values reflected; warnings/state updated.
- Backend: rows upserted in `attendance_overrides`; subsequent GET returns same overrides.

## Suggested Temporary Debug Logs
Add short-lived debug logs to trace relational writes during validation; remove after QA.

- `backend/app/services/planner_service.py`
  - After saving snapshot:
    - `logger.info("[planner_service] snapshot saved user=%s planner_id=%s", user_id, planner_id)`
  - After planned courses replacement:
    - `logger.info("[planner_service] planned courses replaced user=%s count=%s", user_id, len(planned_entries))`
  - After overrides upsert:
    - `logger.info("[planner_service] overrides upserted user=%s count=%s", user_id, len(overrides))`

- `backend/app/api/endpoints/attendance.py`
  - Before save:
    - `logger.info("[attendance.put] user=%s overrides=%s", uid, list(overrides.keys()))`

## Quick Smoke
Use a known user and planner_id; perform the flows in order. Verify DB rows change only in relational tables (no JSON columns).
