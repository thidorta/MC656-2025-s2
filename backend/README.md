# Backend (FastAPI)

This API serves the data produced by the crawler. Follow these steps to run it locally.

## 1. Prerequisites

- **Python 3.12** (installed via `winget install -e --id Python.Python.3.12`)
- Visual Studio Build Tools 2022 + 'Desktop development with C++' workload (needed for packages such as `pydantic-core`)
- Rust toolchain (`winget install -e --id Rustlang.Rustup`)

## 2. Virtual environment

```powershell
cd backend
python3.12 -m venv .venv
.venv\Scripts\activate
pip install --upgrade pip
pip install -r requirements.txt
```

The repo already contains a `.venv` created with Python3.12; you can reuse it with `.venv\Scripts\activate`.

After activating the venv, copy the environment template and adjust paths if needed:

```powershell
copy env.example .env
```

`CATALOG_DB_PATH` and `USER_DB_ROOT` should match the files produced by the crawler (defaults already point to `../crawler/data/...`). See `docs/backend/CONFIG.md` for details.

## 3. Data requirements

The API now reads everything from the crawler outputs (see `docs/crawler/IMPORTING.md` for details):

- Catalog DB: `../crawler/data/db/catalog.db` (generated via `python crawler/scripts/import_catalog_db.py`)
- User snapshots: `../crawler/data/user_db/<planner_id>/course_<id>.json`

If those files are missing, run the crawler pipeline first.

## 4. Running the API

```powershell
cd backend
.venv\Scripts\activate
uvicorn main:app --reload --port 8000
```

The routes are prefixed with `/api/v1` (e.g., `/api/v1/courses`).

## 5. Quick sanity check

```
GET /api/v1/courses        -> lists all course IDs from catalog.db
GET /api/v1/curriculum     -> lists curriculum options grouped by course
GET /api/v1/curriculum/34  -> returns curriculum detail (supports ?year=&modalidade=)
GET /api/v1/user-db/611894 -> returns cached planner data if present
```

These endpoints rely on the SQLite DB (read-only) and a file-based cache for user snapshots.

## 6. Data refresh checklist

1. Run the crawler (`python -m src.crawler_app.cli collect`).
2. Build the legacy DB (`python -m src.crawler_app.cli build-db`).
3. Import the catalog to SQLite (`python scripts/import_catalog_db.py`).
4. Start the backend (`uvicorn main:app --reload`) pointing to the generated files.

Keeping these steps in order guarantees the API always reflects the latest crawler output.

## 7. Regenerating `catalog.db`

Whenever you re-run the crawler, refresh the SQLite catalog with:

```powershell
python crawler/scripts/import_catalog_db.py `
  --catalog-root crawler/data/catalog_db `
  --db-path crawler/data/db/catalog.db
```

Environment variables `CATALOG_DB_PATH` and `USER_DB_ROOT` allow overriding these locations for the backend (configure them via `.env` or export before starting `uvicorn`).

## 8. Tests

FastAPI endpoints have pytest coverage:

```powershell
cd backend
.venv\Scripts\activate
python -m pytest
```

The user-db test skips automatically if the sample planner directory (`crawler/data/user_db/611894`) is missing.

Shortcut: `powershell backend/scripts/run_tests.ps1`
