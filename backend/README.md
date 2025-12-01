# Backend - FastAPI Curriculum Pipeline

Clean architecture backend serving curriculum data with a multi-phase processing pipeline.

## Architecture Overview

```
app/
├── api/              # API layer (routers, endpoints, dependencies)
│   ├── deps.py       # FastAPI dependencies (auth, DB session)
│   ├── routes.py     # Main router aggregator
│   └── endpoints/    # Route handlers for each domain
├── config/           # Configuration and settings
│   └── settings.py   # App configuration (DB paths, secrets)
├── db/               # Database layer
│   ├── catalog.py    # Catalog DB connection manager
│   ├── session.py    # SQLAlchemy session factory
│   ├── user_store.py # User auth DB connection
│   └── repositories/ # Data access layer (tree, planner, snapshot)
├── models/           # Pydantic/SQLAlchemy models
│   └── course.py     # Course domain model
├── schemas/          # API request/response schemas
│   ├── curriculum.py
│   ├── planner.py
│   ├── tree.py
│   └── user.py
├── services/         # Business logic layer
│   ├── curriculum/   # Curriculum pipeline services
│   │   ├── raw_acquisition_service.py    # Phase 0.5
│   │   ├── normalization_service.py      # Phase 1
│   │   ├── tree_graph_service.py         # Phase 2
│   │   ├── snapshot_service.py           # Phase 3
│   │   └── updater.py                    # Pipeline orchestrator
│   ├── tree_service.py
│   ├── planner_service.py
│   ├── gde_snapshot.py
│   └── session_store.py
└── utils/            # Shared utilities
    ├── color_utils.py    # STATUS_COLORS mapping
    ├── errors.py         # Custom AppError exceptions
    ├── logging_setup.py  # Centralized logger
    └── security.py       # JWT, password hashing

scripts/              # Maintenance and analysis tools
├── find_unused_imports.py   # AST-based import analyzer
├── find_dead_files.py       # Import graph builder
└── backend_sanity_check.py  # Health checker (DB, imports, pipeline, routers)

tasks/                # Pipeline rebuild entrypoints
└── rebuild_all.py    # Rebuild all 4 phases for a user

tests/                # API and service tests
```

## Curriculum Pipeline (4 Phases)

The backend implements a **4-phase curriculum processing pipeline** that transforms raw catalog + GDE user data into a ready-to-render tree structure:

### Phase 0.5 - Raw Acquisition
**Service**: `RawAcquisitionService`  
**Input**: `catalog.db` + GDE `user_db` overlay  
**Output**: `user_curriculum_raw` (108 rows)  
**Logic**: Strict LEFT JOIN of catalog with GDE user data (COALESCE for overlay fields)

### Phase 1 - Normalization
**Service**: `NormalizationService`  
**Input**: `user_curriculum_raw`  
**Output**: `user_curriculum_normalized` (108 rows)  
**Logic**: Computes academic status fields
- `is_completed`: Boolean (completed in GDE or planned as "A")
- `prereq_status`: "satisfied" | "missing" | "not_applicable"
- `is_eligible`: Boolean (prereqs satisfied)
- `is_offered`: Boolean (has current semester offers)
- `final_status`: "completed" | "eligible_and_offered" | "eligible_not_offered" | "not_eligible"

### Phase 2 - Tree Graph
**Service**: `TreeGraphService`  
**Input**: `user_curriculum_normalized` + catalog prereq graph  
**Output**: `user_curriculum_tree` (108 nodes)  
**Logic**: Builds prerequisite graph structure
- Loads prereqs from `catalog.db`
- Builds children map (reverse graph)
- Computes depth levels via BFS topological sort
- Assigns order_index within each depth level

### Phase 3 - Snapshot
**Service**: `SnapshotService`  
**Input**: `user_curriculum_normalized` + `user_curriculum_tree`  
**Output**: `user_curriculum_snapshot` (108 rows, all 28 fields)  
**Logic**: Assembles final denormalized snapshot
- JOINs Phase 1 + Phase 2 data
- Computes `graph_position` as `{"x": depth*100, "y": order_index*80}`
- Converts arrays to JSON strings (prereq_list, children_list)
- Ready for `/api/v1/tree/` endpoint consumption

### Pipeline Orchestration

**CurriculumUpdater** (`app/services/curriculum/updater.py`):
```python
updater = CurriculumUpdater()
updater.rebuild_all_for_user("1000")
```

Executes all 4 phases sequentially with proper logging and error handling.

**Rebuild Script** (`tasks/rebuild_all.py`):
```bash
python tasks/rebuild_all.py 1000
```

## Key API Endpoints

**Authentication**:
- `POST /api/v1/auth/login` - Login to GDE, capture planner, return JWT token

**Curriculum**:
- `GET /api/v1/curriculum` - List all curriculum options
- `GET /api/v1/curriculum/{id}` - Get curriculum detail

**Tree** (Phase 3 Snapshot):
- `GET /api/v1/tree/` - Returns full curriculum tree with all 28 fields (requires auth)
  - Response: `{user_id: number, curriculum: CourseNode[]}`
  - Ordered by: depth ASC, order_index ASC, recommended_semester ASC
  - Each node has: catalog fields (9) + GDE raw (8) + normalized (5) + tree metadata (6)

**Planner**:
- `GET /api/v1/planner/` - Get current planner state
- `POST /api/v1/planner/update` - Update planner items

**User DB**:
- `GET /api/v1/user-db/me` - Get current user's GDE snapshot

## Status Color Mapping

Backend computes `color_hex` based on `final_status`:

```python
STATUS_COLORS = {
    "completed": "#55CC55",              # Green
    "eligible_and_offered": "#FFFF66",   # Yellow
    "eligible_not_offered": "#C0C0C0",   # Gray
    "not_eligible": "#FF6666"            # Red
}
```

Frontend trusts backend colors completely (no client-side computation).

## Prerequisites

- **Python 3.12** (`winget install -e --id Python.Python.3.12`)
- Visual Studio Build Tools 2022 + 'Desktop development with C++' (for pydantic-core)
- Rust toolchain (`winget install -e --id Rustlang.Rustup`)

## Setup

### 1. Virtual Environment

```powershell
cd backend
python3.12 -m venv .venv
.venv\Scripts\activate
pip install --upgrade pip
pip install -r requirements.txt
```

### 2. Environment Configuration

```powershell
copy env.example .env
```

Configure paths in `.env`:
- `CATALOG_DB_PATH` - Path to `catalog.db` from crawler
- `USER_AUTH_DB_PATH` - Path to `user_auth.db` (default: `data/user_auth.db`)

### 3. Data Requirements

- **Catalog DB**: `../crawler/data/db/catalog.db` (generated by crawler)
- **User Auth DB**: `data/user_auth.db` (created by Alembic migrations)

Run Alembic migrations to create tables:
```powershell
alembic upgrade head
```

### 4. Rebuild Pipeline

Rebuild curriculum for a user (creates all 4 phase tables):
```powershell
python tasks/rebuild_all.py 1000
```

Expected output:
```
[CurriculumUpdater] Rebuilding pipeline for user_id=1000
[RawAcquisitionService] Built user_curriculum_raw: 108 rows for user 1000
Phase 0.5 done: 108 rows in user_curriculum_raw
[NormalizationService] Normalized 108 rows
Phase 1 done: 108 rows in user_curriculum_normalized
[TreeGraphService] Built tree with 108 nodes
Phase 2 done: 108 nodes in user_curriculum_tree
[SnapshotService] Built snapshot with 108 nodes
Phase 3 done: 108 rows in user_curriculum_snapshot
```

## Running the API

### Local Development

```powershell
cd backend
.venv\Scripts\activate
uvicorn main:app --reload --port 8000
```

API available at: `http://localhost:8000`  
Interactive docs: `http://localhost:8000/docs`

### Docker

```powershell
cd backend
docker compose up --build
```

## Health Checks

### Backend Sanity Check

Validates DB integrity, imports, pipeline, and routers:
```powershell
python scripts/backend_sanity_check.py
```

Expected output:
```
============================================================
Backend Sanity Check
============================================================

DB Integrity:
✅ DB integrity: all required tables exist

Import Health:
✅ main.py imports successfully
✅ CurriculumUpdater imports successfully

Pipeline:
✅ Pipeline: all DBs accessible

Routers:
✅ Routers: main router configured with 20 routes

============================================================
Results: 4/4 checks passed
============================================================
```

### Code Analysis Tools

**Find Unused Imports**:
```powershell
python scripts/find_unused_imports.py app --verbose
```

**Find Dead Files** (import graph analysis):
```powershell
python scripts/find_dead_files.py app main.py --export dead_files.json
```

## Tests

Run pytest test suite:
```powershell
cd backend
.venv\Scripts\activate
python -m pytest
```

Tests cover:
- API endpoint responses
- Authentication flow
- Curriculum queries
- Tree endpoint validation
- Planner operations

## Database Schema

### Tables

**User Auth DB** (`data/user_auth.db`):
- `users` - User authentication and metadata
- `user_curriculum_raw` - Phase 0.5 output (catalog + GDE overlay)
- `user_curriculum_normalized` - Phase 1 output (academic status)
- `user_curriculum_tree` - Phase 2 output (graph structure)
- `user_curriculum_snapshot` - Phase 3 output (final API snapshot)
- `user_planned_courses` - Planner modifications
- `user_attendance` - Attendance records

**Catalog DB** (`catalog.db`):
- `Courses` - Course catalog
- `Curricula` - Curriculum definitions
- `CoursePrerequisites` - Prerequisite graph
- `CourseOffers` - Semester offerings

## Logging

Centralized logger configured in `app/utils/logging_setup.py`:

```python
from app.utils.logging_setup import logger

logger.info("Pipeline rebuild started")
logger.error("Database connection failed")
```

All service classes use this logger for consistent output format.

## Error Handling

Custom `AppError` class in `app/utils/errors.py`:

```python
from app.utils.errors import AppError

raise AppError("Invalid curriculum ID", status_code=404)
```

FastAPI exception handlers convert AppError to proper HTTP responses.

## Development Workflow

1. **Make changes** to service classes or endpoints
2. **Run sanity check**: `python scripts/backend_sanity_check.py`
3. **Rebuild pipeline**: `python tasks/rebuild_all.py 1000`
4. **Run tests**: `pytest`
5. **Check imports**: `python scripts/find_unused_imports.py app`
6. **Verify API**: Test endpoints via `/docs` or Postman

## Production Checklist

- [ ] All sanity checks pass
- [ ] Pipeline rebuild successful (108 rows in snapshot)
- [ ] All tests passing
- [ ] No unused imports
- [ ] No dead files in import graph
- [ ] Status colors correct (MC358=green, MC458=yellow, MC558=red)
- [ ] Tree endpoint returns 28 fields per node
- [ ] Authentication working with GDE credentials
- [ ] Database migrations applied
- [ ] Environment variables configured

## Troubleshooting

**"No module named 'app'"**:
- Ensure backend root is in `sys.path`
- Scripts should add: `sys.path.insert(0, str(Path(__file__).parent.parent))`

**"Database locked"**:
- Close any DB browser connections
- Check for stale connections in services
- Ensure proper connection closing in repositories

**"Phase rebuild fails"**:
- Verify catalog.db exists and has data
- Check CATALOG_DB_PATH in .env
- Run Alembic migrations: `alembic upgrade head`
- Check logs for specific phase errors

**"Wrong status colors"**:
- Verify STATUS_COLORS in `app/utils/color_utils.py`
- Rebuild snapshot: `python tasks/rebuild_all.py 1000`
- Query DB: `SELECT code, final_status, color_hex FROM user_curriculum_snapshot WHERE user_id=1000`

## Contributing

1. Follow clean architecture principles (services ← repositories ← DB)
2. Add type hints to all functions
3. Use centralized logger (no print statements)
4. Raise AppError for business logic errors
5. Write tests for new endpoints
6. Update README if architecture changes
7. Run sanity check before committing

## References

- FastAPI Docs: https://fastapi.tiangolo.com/
- SQLAlchemy: https://docs.sqlalchemy.org/
- Alembic: https://alembic.sqlalchemy.org/
- Clean Architecture: https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html
