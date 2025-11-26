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

`CATALOG_DB_PATH` should match the file produced by the crawler (defaults already point to `../crawler/data/...`). `.env` is loaded automatically via `python-dotenv`. See `docs/backend/CONFIG.md` for details.

## 3. Data requirements

The API lê o catálago gerado pelo crawler (veja `docs/crawler/IMPORTING.md`):

- Catalog DB: `../crawler/data/db/catalog.db` (gerado via `python crawler/scripts/import_catalog_db.py`)

O planner do usuário agora é capturado ao vivo durante o login; não há dependência de snapshots em disco.

## 4. Running the API (local)

```powershell
cd backend
.venv\Scripts\activate
uvicorn main:app --reload --port 8000
```

The routes are prefixed with `/api/v1` (e.g., `/api/v1/courses`).

Or via Docker (after the crawler populated the data):

```powershell
cd backend
copy env.example .env
docker compose up --build
```

The compose file mounts `../crawler/data/db/catalog.db` and `../crawler/data/user_db` read-only into the container and binds port `8000`.

## 5. Quick sanity check

```
GET /api/v1/courses        -> lists all course IDs from catalog.db
GET /api/v1/curriculum     -> lists curriculum options grouped by course
GET /api/v1/curriculum/34  -> returns curriculum detail (supports ?year=&modalidade=)
GET /api/v1/popup-message  -> connectivity check used by the mobile app
POST /api/v1/auth/login    -> login real no GDE, captura o planner e devolve token Bearer + snapshot em memória
GET /api/v1/user-db/me     -> devolve o snapshot do planner para a sessão atual (Bearer token)
GET /api/v1/planner/       -> payload original/modificado em memória para a sessão atual (Bearer token)
```

Os endpoints usam o SQLite do catálogo (somente leitura) e um cache em memória por sessão para o planner.

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

The tests skip if the catalog snapshot (`crawler/data/db/catalog.db`) is missing. The user-db test also skips automatically if the sample planner directory (`crawler/data/user_db/611894`) is missing.

Shortcut: `powershell backend/scripts/run_tests.ps1`
