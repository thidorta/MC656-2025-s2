# Database Schema - user_auth.db

This document defines the physical database schema for the relational planner system in SQLite.

**Last Updated:** November 27, 2025  
**Branch:** feature/app-run  
**Database:** `user_auth.db` (SQLite 3)

---

## Schema Validation

### Entity-to-Table Mapping

| Domain Entity | Table Name | Status |
|---------------|------------|--------|
| User | `users` | ✅ Validated |
| GdeSnapshot | `gde_snapshots` | ✅ Validated |
| CurriculumDiscipline | `curriculum_disciplines` | ✅ Validated |
| DisciplinePrerequisite | `discipline_prerequisites` | ✅ Validated |
| CourseOffer | `course_offers` | ✅ Validated |
| OfferScheduleEvent | `offer_schedule_events` | ✅ Validated |
| PlannedCourse | `planned_courses` | ✅ Validated |
| AttendanceOverride | `attendance_overrides` | ✅ Validated |

**Validation Result:** ✅ This mapping is sufficient to reconstruct all API contracts without persisting mutable JSON payloads.

### Naming Conventions
- **Pluralized table names** (users, not user) - standard SQL convention
- **Snake_case** for multi-word names (gde_snapshots, not gdeSnapshots)
- **Foreign keys** use `_id` suffix (user_id, snapshot_id)
- **Boolean columns** use verb prefixes (has_completed, can_enroll, is_biweekly)

---

## Table Definitions

### 1. users

**Purpose:** Core authentication and user identity, anchors all user-specific data.

```sql
CREATE TABLE users (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    username        TEXT NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    
    -- GDE integration fields
    planner_id      TEXT,           -- Last known GDE planner ID
    course_code     TEXT,           -- e.g., "42"
    course_name     TEXT,           -- e.g., "Engenharia de Computação"
    catalog_year    INTEGER,        -- e.g., 2024
    current_period  TEXT,           -- e.g., "2025-1"
    
    -- Timestamps
    created_at      TEXT NOT NULL,  -- ISO 8601
    updated_at      TEXT NOT NULL   -- ISO 8601
);

CREATE UNIQUE INDEX idx_users_username ON users(username);
```

**Used By:**
- `POST /auth/login`: Updates planner_id, course info
- All authenticated endpoints: Source of user_id and planner_id

**Notes:**
- `planner_id` is nullable until first successful GDE login
- Course fields are denormalized for quick access (also in gde_snapshots)

---

### 2. gde_snapshots

**Purpose:** Immutable point-in-time snapshots of GDE academic state.

```sql
CREATE TABLE gde_snapshots (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id                 INTEGER NOT NULL,
    planner_id              TEXT NOT NULL,
    
    -- Snapshot timestamp
    fetched_at              TEXT NOT NULL,      -- ISO 8601, when captured
    
    -- User academic info from GDE
    raw_user_name           TEXT,               -- Student name from GDE
    raw_ra                  TEXT,               -- Academic registration number
    raw_course_id           TEXT,               -- Course ID in GDE system
    raw_course_name         TEXT,               -- Course name
    catalog_year            INTEGER,            -- Curriculum catalog year
    current_period          TEXT,               -- Current academic period
    cp_value                REAL,               -- Completion parameter (CP)
    
    -- Display-only metadata (JSON)
    integralizacao_metadata TEXT,               -- JSON: modalidade, ingresso, limite, etc.
    planejado_metadata      TEXT,               -- JSON: período atual, datas de matrícula
    faltantes_metadata      TEXT,               -- JSON: missing required/elective courses
    
    created_at              TEXT NOT NULL,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_gde_snapshots_user_fetched ON gde_snapshots(user_id, fetched_at DESC);
CREATE INDEX idx_gde_snapshots_planner ON gde_snapshots(planner_id);
```

**Used By:**
- `POST /auth/login`: Creates new snapshot, returns in user_db
- `GET /user-db/me`: Returns latest snapshot as user_db
- `GET /planner`: Provides basis for original_payload

**Invariants:**
- Immutable after creation (new login = new row)
- Latest snapshot per user determined by `MAX(fetched_at)`

---

### 3. curriculum_disciplines

**Purpose:** Courses from user's curriculum as reported by GDE snapshot.

```sql
CREATE TABLE curriculum_disciplines (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id                 INTEGER NOT NULL,
    snapshot_id             INTEGER NOT NULL,       -- Links to specific snapshot
    
    -- Course identification
    disciplina_id           TEXT,                   -- GDE internal ID (if available)
    codigo                  TEXT NOT NULL,          -- Course code: "MC102"
    nome                    TEXT NOT NULL,          -- Course name
    creditos                INTEGER NOT NULL,       -- Credit hours
    catalog_year            INTEGER,                -- Catalog year (denormalized)
    
    -- Curriculum metadata
    tipo                    TEXT NOT NULL,          -- "OB" (obrigatória), "EL" (eletiva), etc.
    semestre_sugerido       INTEGER,                -- Suggested semester: 1..10
    cp_group                TEXT,                   -- Completion group ID
    
    -- Completion status
    has_completed           INTEGER NOT NULL DEFAULT 0,  -- Boolean: 0/1
    can_enroll              INTEGER NOT NULL DEFAULT 0,  -- Boolean: 0/1
    
    -- UI hints
    obs                     TEXT,                   -- GDE observations
    color                   TEXT,                   -- UI color hint: "#FF0000"
    
    created_at              TEXT NOT NULL,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (snapshot_id) REFERENCES gde_snapshots(id) ON DELETE CASCADE
);

CREATE INDEX idx_curriculum_disciplines_user_snapshot ON curriculum_disciplines(user_id, snapshot_id);
CREATE INDEX idx_curriculum_disciplines_user_codigo ON curriculum_disciplines(user_id, codigo);
CREATE INDEX idx_curriculum_disciplines_snapshot ON curriculum_disciplines(snapshot_id);
```

**Used By:**
- `GET /user-db/me`: Builds curriculum[] array
- `GET /planner`: Static curriculum data for original_payload

**Invariants:**
- Tied to specific snapshot (curriculum changes across snapshots)
- Unique per (user_id, codigo) within same snapshot

---

### 4. discipline_prerequisites

**Purpose:** Models prerequisite relationships between curriculum courses.

```sql
CREATE TABLE discipline_prerequisites (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    curriculum_discipline_id INTEGER NOT NULL,      -- Course requiring the prereq
    
    required_codigo         TEXT NOT NULL,          -- Code of required course
    alternative_group       INTEGER NOT NULL,       -- Groups alternatives (OR logic)
    
    FOREIGN KEY (curriculum_discipline_id) 
        REFERENCES curriculum_disciplines(id) 
        ON DELETE CASCADE
);

CREATE INDEX idx_discipline_prerequisites_discipline ON discipline_prerequisites(curriculum_discipline_id);
CREATE INDEX idx_discipline_prerequisites_required ON discipline_prerequisites(required_codigo);
```

**Used By:**
- `GET /planner`: Builds prereqs arrays: `[["MA111"], ["MA141"]]`
- `GET /user-db/me`: Same prereqs structure

**Prerequisite Logic:**
- Same `alternative_group` = OR relationship (any one satisfies)
- Different `alternative_group` = AND relationship (all groups required)
- Example: Group 1: MA111, Group 2: MA141 → needs (MA111 OR MA141)

---

### 5. course_offers

**Purpose:** Available class sections (turmas) for courses with metadata.

```sql
CREATE TABLE course_offers (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    curriculum_discipline_id INTEGER,               -- FK to curriculum (nullable)
    user_id                 INTEGER NOT NULL,       -- Offer context owner
    snapshot_id             INTEGER,                -- Source snapshot (if from GDE)
    
    -- Offer identification
    codigo                  TEXT NOT NULL,          -- Course code: "MC102"
    turma                   TEXT NOT NULL,          -- Section: "A", "B", "C"
    offer_external_id       TEXT,                   -- GDE offer ID
    
    -- Temporal context
    semester                TEXT,                   -- e.g., "2025-1"
    source                  TEXT NOT NULL,          -- "catalog" | "gde_snapshot"
    
    -- Display metadata (JSON)
    metadata                TEXT,                   -- JSON: professor, capacity, etc.
    
    created_at              TEXT NOT NULL,
    
    FOREIGN KEY (curriculum_discipline_id) 
        REFERENCES curriculum_disciplines(id) 
        ON DELETE SET NULL,
    FOREIGN KEY (user_id) 
        REFERENCES users(id) 
        ON DELETE CASCADE,
    FOREIGN KEY (snapshot_id) 
        REFERENCES gde_snapshots(id) 
        ON DELETE SET NULL
);

CREATE INDEX idx_course_offers_user_codigo ON course_offers(user_id, codigo);
CREATE INDEX idx_course_offers_discipline ON course_offers(curriculum_discipline_id);
CREATE INDEX idx_course_offers_snapshot ON course_offers(snapshot_id);
CREATE INDEX idx_course_offers_codigo_turma ON course_offers(codigo, turma);
```

**Used By:**
- `GET /planner`: Builds curriculum[].offers[] arrays
- `GET /user-db/me`: Includes offers in curriculum

**Source Types:**
- `"catalog"`: Standard offerings from catalog database
- `"gde_snapshot"`: User-specific offers from GDE

---

### 6. offer_schedule_events

**Purpose:** Individual class meeting times/locations for course offers.

```sql
CREATE TABLE offer_schedule_events (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    offer_id                INTEGER NOT NULL,       -- FK to course offer
    
    -- Temporal data
    start_datetime          TEXT NOT NULL,          -- ISO 8601
    end_datetime            TEXT NOT NULL,          -- ISO 8601
    day_of_week             INTEGER NOT NULL,       -- 0=Monday, 6=Sunday
    
    -- Cached time components for queries
    start_hour              INTEGER NOT NULL,       -- 0..23
    end_hour                INTEGER NOT NULL,       -- 0..23
    
    -- Location and metadata
    location                TEXT,                   -- Room/building
    title                   TEXT,                   -- e.g., "Teoria", "Laboratório"
    is_biweekly             INTEGER NOT NULL DEFAULT 0,  -- Boolean: quinzenal
    
    FOREIGN KEY (offer_id) 
        REFERENCES course_offers(id) 
        ON DELETE CASCADE
);

CREATE INDEX idx_offer_schedule_events_offer ON offer_schedule_events(offer_id);
CREATE INDEX idx_offer_schedule_events_day_hour ON offer_schedule_events(day_of_week, start_hour);
```

**Used By:**
- `GET /planner`: Builds events arrays within offers
- Conflict detection (same day/hour overlap)

**Notes:**
- `start_hour`/`end_hour` are denormalized from datetimes for efficient querying
- `day_of_week` follows ISO: 0=Monday, 6=Sunday

---

### 7. planned_courses

**Purpose:** User's current mutable plan (which courses + turmas selected).

```sql
CREATE TABLE planned_courses (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id                 INTEGER NOT NULL,
    
    -- Course selection
    codigo                  TEXT NOT NULL,          -- Course code
    turma                   TEXT,                   -- Selected section (nullable if just planned)
    
    -- Metadata
    added_by_user           INTEGER NOT NULL,       -- Boolean: 1=user choice, 0=GDE default
    semester_planned        TEXT,                   -- e.g., "2025-1" (optional)
    source                  TEXT NOT NULL,          -- "GDE" | "USER"
    
    -- Timestamps
    created_at              TEXT NOT NULL,
    updated_at              TEXT NOT NULL,
    
    FOREIGN KEY (user_id) 
        REFERENCES users(id) 
        ON DELETE CASCADE,
    
    UNIQUE(user_id, codigo)  -- One plan per course per user
);

CREATE INDEX idx_planned_courses_user ON planned_courses(user_id);
CREATE INDEX idx_planned_courses_user_codigo ON planned_courses(user_id, codigo);
```

**Used By:**
- `GET /planner`: Provides `planned_courses` map + determines modified_payload
- `POST /planner/modified`: Updates this table based on user selections

**Source Values:**
- `"GDE"`: Inherited from GDE snapshot (original plan)
- `"USER"`: User modification after snapshot

**Invariants:**
- Unique constraint on (user_id, codigo)
- Survives across snapshots (persists user intent)

---

### 8. attendance_overrides

**Purpose:** User's manual attendance tracking per course.

```sql
CREATE TABLE attendance_overrides (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id                 INTEGER NOT NULL,
    
    -- Course identification
    codigo                  TEXT NOT NULL,          -- Course code
    
    -- Attendance metrics
    presencas               INTEGER NOT NULL DEFAULT 0,     -- Classes attended
    total_aulas             INTEGER NOT NULL DEFAULT 0,     -- Total classes
    
    -- Optional extended fields
    notas                   REAL,                   -- Grades (optional)
    faltas_justificadas     INTEGER,                -- Excused absences (optional)
    
    updated_at              TEXT NOT NULL,
    
    FOREIGN KEY (user_id) 
        REFERENCES users(id) 
        ON DELETE CASCADE,
    
    UNIQUE(user_id, codigo)  -- One override per course per user
);

CREATE INDEX idx_attendance_overrides_user ON attendance_overrides(user_id);
CREATE INDEX idx_attendance_overrides_user_codigo ON attendance_overrides(user_id, codigo);
```

**Used By:**
- `GET /attendance`: Returns overrides map
- `POST /attendance`: Upserts override records

**Schema Flexibility:**
- Additional columns can be added for user-specific tracking needs
- No FK to curriculum (users can track any course code)

---

## API Endpoint Query Patterns

### GET /user-db/me

**Query Sequence:**

```sql
-- 1. Get user
SELECT * FROM users WHERE id = ?;

-- 2. Get latest snapshot
SELECT * FROM gde_snapshots 
WHERE user_id = ? 
ORDER BY fetched_at DESC 
LIMIT 1;

-- 3. Get curriculum disciplines
SELECT * FROM curriculum_disciplines 
WHERE user_id = ? AND snapshot_id = ?;

-- 4. Get prerequisites (batch)
SELECT dp.*, cd.codigo as course_codigo
FROM discipline_prerequisites dp
JOIN curriculum_disciplines cd ON dp.curriculum_discipline_id = cd.id
WHERE cd.snapshot_id = ?
ORDER BY cd.codigo, dp.alternative_group;

-- 5. Get offers
SELECT * FROM course_offers 
WHERE snapshot_id = ? OR (user_id = ? AND source = 'catalog');

-- 6. Get events (batch)
SELECT * FROM offer_schedule_events 
WHERE offer_id IN (?, ?, ...);
```

**Response Construction:**
- Build `user_db` object from snapshot + disciplines + prereqs + offers + events
- All offers have `adicionado: false` (pristine snapshot)

---

### GET /planner

**Query Sequence:**

```sql
-- 1-6. Same as /user-db/me (get snapshot + curriculum)

-- 7. Get planned courses
SELECT codigo, turma, source, added_by_user
FROM planned_courses 
WHERE user_id = ?;
```

**Response Construction:**

1. **original_payload**: Same as user_db (all `adicionado: false`)
2. **planned_courses**: Map from planned_courses table: `{"MC102": "A"}`
3. **modified_payload**: Clone original, then:
   ```
   FOR each discipline IN curriculum:
       IF discipline.codigo IN planned_courses:
           FOR each offer IN discipline.offers:
               IF offer.turma == planned_courses[codigo].turma:
                   offer.adicionado = true
   
   IF any offer.adicionado == true:
       return modified_payload
   ELSE:
       return NULL
   ```
4. **current_payload**: `modified_payload ?? original_payload`

---

### POST /planner/modified

**Query Sequence:**

```sql
-- 1. Extract codes + turmas from request payload
-- (Application logic: parse planned_codes + curriculum[].offers[].adicionado)

-- 2. Upsert planned courses
INSERT INTO planned_courses (user_id, codigo, turma, added_by_user, source, created_at, updated_at)
VALUES (?, ?, ?, 1, 'USER', ?, ?)
ON CONFLICT(user_id, codigo) DO UPDATE SET
    turma = excluded.turma,
    added_by_user = 1,
    source = 'USER',
    updated_at = excluded.updated_at;

-- 3. Delete removed courses
DELETE FROM planned_courses 
WHERE user_id = ? 
AND codigo NOT IN (?, ?, ...);

-- 4. Return GET /planner response (same queries as above)
```

---

### GET /attendance

**Query Sequence:**

```sql
-- 1. Get user
SELECT planner_id FROM users WHERE id = ?;

-- 2. Get all overrides
SELECT codigo, presencas, total_aulas, notas, faltas_justificadas
FROM attendance_overrides 
WHERE user_id = ?;
```

**Response Construction:**
```json
{
  "planner_id": "<from users>",
  "overrides": {
    "MC102": {"presencas": 10, "total_aulas": 30},
    "MA111": {"presencas": 8, "total_aulas": 30}
  }
}
```

---

### POST /attendance

**Query Sequence:**

```sql
-- For each (codigo, override_data) in request.overrides:

INSERT INTO attendance_overrides 
    (user_id, codigo, presencas, total_aulas, updated_at)
VALUES (?, ?, ?, ?, ?)
ON CONFLICT(user_id, codigo) DO UPDATE SET
    presencas = excluded.presencas,
    total_aulas = excluded.total_aulas,
    updated_at = excluded.updated_at;

-- Optional: Clean up removed overrides
DELETE FROM attendance_overrides 
WHERE user_id = ? 
AND codigo NOT IN (?, ?, ...);
```

---

## Performance Optimization

### Index Strategy

All critical indices are defined inline with table definitions above. Summary:

| Table | Index | Purpose |
|-------|-------|---------|
| users | `username` (UNIQUE) | Auth lookup |
| gde_snapshots | `(user_id, fetched_at DESC)` | Latest snapshot per user |
| curriculum_disciplines | `(user_id, snapshot_id)` | Curriculum per snapshot |
| curriculum_disciplines | `(user_id, codigo)` | Join with planned_courses |
| discipline_prerequisites | `(curriculum_discipline_id)` | Prereq lookup |
| course_offers | `(user_id, codigo)` | Offer lookup |
| course_offers | `(codigo, turma)` | Turma validation |
| offer_schedule_events | `(offer_id)` | Events per offer |
| offer_schedule_events | `(day_of_week, start_hour)` | Conflict detection |
| planned_courses | `(user_id, codigo)` (UNIQUE) | Planner state |
| attendance_overrides | `(user_id, codigo)` (UNIQUE) | Attendance lookup |

### Query Optimization Tips

1. **Batch Fetching**: Load all events for multiple offers in one query using `IN (...)`
2. **Latest Snapshot**: Index on `(user_id, fetched_at DESC)` enables fast `LIMIT 1`
3. **Join Efficiency**: `(user_id, codigo)` indices enable fast joins between curriculum and planned courses
4. **Avoid SELECT \***: Only fetch needed columns in production
5. **Transaction Batching**: Wrap multi-row inserts/updates in transactions

---

## Data Integrity Rules

### Foreign Key Cascade Behavior

| Parent → Child | On Delete |
|----------------|-----------|
| users → gde_snapshots | CASCADE (delete all snapshots) |
| users → curriculum_disciplines | CASCADE |
| users → planned_courses | CASCADE |
| users → attendance_overrides | CASCADE |
| gde_snapshots → curriculum_disciplines | CASCADE (snapshot owns curriculum) |
| curriculum_disciplines → discipline_prerequisites | CASCADE |
| curriculum_disciplines → course_offers | SET NULL (offers may outlive specific curriculum) |
| course_offers → offer_schedule_events | CASCADE |

### Constraints

1. **UNIQUE** constraints enforce business rules:
   - `users.username`: One account per username
   - `planned_courses(user_id, codigo)`: One plan per course
   - `attendance_overrides(user_id, codigo)`: One override per course

2. **NOT NULL** constraints prevent incomplete data:
   - All IDs, timestamps, core fields required
   - Nullable: optional metadata, external IDs

3. **Boolean Encoding**: Use INTEGER with 0/1 (SQLite has no native boolean)

4. **Timestamp Format**: All TEXT timestamps use ISO 8601 (YYYY-MM-DDTHH:MM:SSZ)

---

## Migration Strategy

### From Old Schema to New Schema

**Old tables** (to be deprecated):
- `user_db` (JSON blobs)
- `planner_courses` (JSON)
- `planner_original` (JSON)
- `planner_modified` (JSON)
- `planner_events` (some fields preserved)

**Migration Steps:**

1. **Create new tables** alongside old ones (Alembic migration)
2. **Data migration script**:
   - Extract user data from old `user_db`
   - Create `gde_snapshots` from JSON blobs
   - Parse curriculum from JSON → `curriculum_disciplines`
   - Extract planned courses → `planned_courses`
3. **Validation**: Compare API responses old vs new
4. **Cutover**: Switch application to new schema
5. **Cleanup**: Drop old tables after successful transition

---

## Schema Evolution

### Adding New Fields

**Safe additions** (non-breaking):
- New nullable columns to existing tables
- New indices for performance
- New tables for features

**Breaking changes** (require migration):
- Changing column types
- Adding NOT NULL to existing columns
- Removing columns/tables

### Versioning

Track schema version in metadata table:

```sql
CREATE TABLE schema_metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

INSERT INTO schema_metadata (key, value) 
VALUES ('schema_version', '1.0.0');
```

---

## Appendix: Full Schema Creation Script

See `backend/alembic/versions/0004_relational_planner.py` for the complete Alembic migration that creates this schema.

For raw SQL version:

```sql
-- Enable foreign keys (SQLite requires per-connection)
PRAGMA foreign_keys = ON;

-- Create all tables in dependency order
-- (Copy CREATE TABLE statements from sections above)

-- users
-- gde_snapshots
-- curriculum_disciplines
-- discipline_prerequisites
-- course_offers
-- offer_schedule_events
-- planned_courses
-- attendance_overrides

-- Create all indices
-- (Copy CREATE INDEX statements from sections above)
```

---

## Implementation Files

### Alembic Migration
**File:** `backend/alembic/versions/0004_relational_planner_schema.py`

Creates all 7 tables with proper foreign keys, indices, and constraints.

Run migration:
```bash
cd backend
alembic upgrade head
```

### SQLAlchemy Models
**File:** `backend/app/db/models_planner.py`

ORM models for all tables:
- `GdeSnapshotModel`
- `CurriculumDisciplineModel`
- `DisciplinePrerequisiteModel`
- `CourseOfferModel`
- `OfferScheduleEventModel`
- `PlannedCourseModel`
- `AttendanceOverrideModel`

Each model includes:
- Proper relationships (one-to-many, cascades)
- Helper methods (`to_dict`, `to_user_db_dict`, etc.)
- Type hints and documentation

### Repository Layer
**Directory:** `backend/app/db/repositories/`

Four repository classes that encapsulate all database operations:

#### 1. SnapshotRepository (`snapshot_repo.py`)
```python
from app.db.repositories import SnapshotRepository

# Get latest snapshot
snapshot = SnapshotRepository.get_latest_snapshot(session, user_id)

# Create from GDE data
snapshot = SnapshotRepository.create_snapshot_from_gde(
    session, user_id, planner_id, user_db_payload
)
```

**Methods:**
- `get_latest_snapshot(session, user_id)` → GdeSnapshotModel | None
- `create_snapshot_from_gde(session, user_id, planner_id, user_db_payload)` → GdeSnapshotModel
- `get_snapshot_by_id(session, snapshot_id)` → GdeSnapshotModel | None

**Used By:** `POST /auth/login`, `GET /user-db/me`, `GET /planner`

---

#### 2. CurriculumRepository (`curriculum_repo.py`)
```python
from app.db.repositories import CurriculumRepository

# Get curriculum for snapshot
disciplines = CurriculumRepository.list_curriculum_for_snapshot(
    session, user_id, snapshot_id
)

# Get prerequisites (batch)
prereqs_map = CurriculumRepository.list_prereqs_for_curriculum_ids(
    session, [disc.id for disc in disciplines]
)

# Get offers and events (batch)
offers_map = CurriculumRepository.list_offers_for_curriculum(
    session, [disc.id for disc in disciplines]
)
events_map = CurriculumRepository.list_events_for_offers(
    session, offer_ids
)
```

**Methods:**
- `list_curriculum_for_snapshot(session, user_id, snapshot_id)` → List[CurriculumDisciplineModel]
- `list_prereqs_for_curriculum_ids(session, curriculum_ids)` → Dict[int, List[List[str]]]
- `list_offers_for_curriculum(session, curriculum_ids)` → Dict[int, List[CourseOfferModel]]
- `list_events_for_offers(session, offer_ids)` → Dict[int, List[OfferScheduleEventModel]]

**Used By:** `GET /user-db/me`, `GET /planner`

---

#### 3. PlannerRepository (`planner_repo.py`)
```python
from app.db.repositories import PlannerRepository

# Get planned courses map
planned_map = PlannerRepository.get_planned_courses_map(session, user_id)
# Returns: {"MC102": "A", "MA111": "B"}

# Replace all planned courses
PlannerRepository.replace_planned_courses(
    session, user_id, [
        {"codigo": "MC102", "turma": "A", "source": "USER"},
        {"codigo": "MA111", "turma": "B", "source": "USER"},
    ]
)

# Upsert single course
PlannerRepository.upsert_planned_course(
    session, user_id, "MC102", turma="A", source="USER"
)
```

**Methods:**
- `list_planned_courses(session, user_id)` → List[PlannedCourseModel]
- `get_planned_courses_map(session, user_id)` → Dict[str, str]
- `replace_planned_courses(session, user_id, planned_entries)` → None
- `upsert_planned_course(session, user_id, codigo, **kwargs)` → PlannedCourseModel
- `delete_planned_course(session, user_id, codigo)` → bool

**Used By:** `GET /planner`, `POST /planner/modified`

---

#### 4. AttendanceRepository (`attendance_repo.py`)
```python
from app.db.repositories import AttendanceRepository

# Get overrides map
overrides = AttendanceRepository.get_overrides_map(session, user_id)
# Returns: {"MC102": {"presencas": 10, "total_aulas": 30}}

# Upsert all overrides
AttendanceRepository.upsert_overrides(
    session, user_id, {
        "MC102": {"presencas": 12, "total_aulas": 30},
        "MA111": {"presencas": 8, "total_aulas": 30},
    }
)

# Upsert single override
AttendanceRepository.upsert_override(
    session, user_id, "MC102", presencas=12, total_aulas=30
)
```

**Methods:**
- `list_overrides(session, user_id)` → List[AttendanceOverrideModel]
- `get_overrides_map(session, user_id)` → Dict[str, Dict[str, Any]]
- `upsert_overrides(session, user_id, overrides_dict)` → None
- `upsert_override(session, user_id, codigo, **kwargs)` → AttendanceOverrideModel
- `delete_override(session, user_id, codigo)` → bool

**Used By:** `GET /attendance`, `POST /attendance`

---

## Next Steps

1. **Run the migration:**
   ```bash
   cd backend
   alembic upgrade head
   ```

2. **Verify database:**
   ```bash
   sqlite3 backend/data/user_auth.db ".tables"
   # Should show all new tables
   ```

3. **Update service layer** (Phase 3):
   - Rewrite `planner_store.py` to use repositories
   - Update `auth.py` to create snapshots on login
   - Update `user_db.py` to reconstruct from snapshots
   - Update `attendance.py` to use AttendanceRepository

4. **Test API contracts:**
   - Verify all endpoints return expected JSON structure
   - No breaking changes to mobile app

---

**End of Database Schema Documentation**
