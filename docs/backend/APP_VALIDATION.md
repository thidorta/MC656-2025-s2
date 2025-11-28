## Mobile App Validation Guide (Phase 4)

### Checklists

- **Login Flow:**
  - Call `POST /api/v1/auth/login` with username/password.
  - Success: App receives `{ access_token, refresh_token, planner_id, user, course, year }`.
  - Backend logs: snapshot created (`gde_snapshots` row), curriculum persisted.

- **Planner Loading:**
  - Call `GET /api/v1/planner/` with Bearer token.
  - Success: Response has `planner_id`, `original_payload`, `modified_payload`, `current_payload`, `planned_courses`.
  - Backend logs: none required; read-only from relational state.

- **Add/Remove Planned Courses:**
  - Call `PUT /api/v1/planner/modified` with payload marking selected offer (`adicionado: true`).
  - Success: Response `planned_courses` reflects selection (e.g., `{ "MC102": "A" }`).
  - Backend logs: planned course upsert executed (`planned_courses` row for user).

- **Attendance Overrides:**
  - Call `PUT /api/v1/attendance/` with `{ overrides: { MC102: { presencas, total_aulas } } }`.
  - Call `GET /api/v1/attendance/` and verify overrides reflected.
  - Backend logs: attendance upsert executed (`attendance_overrides` rows).

### HTTP Calls per Flow

- **Login:** `POST /api/v1/auth/login`
- **User DB:** `GET /api/v1/user-db/me`
- **Planner View:** `GET /api/v1/planner/`
- **Planner Modify:** `PUT /api/v1/planner/modified`
- **Attendance Read:** `GET /api/v1/attendance/`
- **Attendance Write:** `PUT /api/v1/attendance/`

### Backend Log Tips (temporary)

- In `planner_service.py`:
  - Before `update_planned_courses`: log user_id and number of planned entries extracted.
  - Before `save_attendance_overrides`: log user_id and number of overrides.
- In `auth.py` login handler:
  - After `save_gde_snapshot`: log snapshot id and discipline count persisted.

Remove these logs once validation is complete.