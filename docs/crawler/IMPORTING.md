# Catalog Importer

After running the crawler you can normalize the JSON catalog into a SQLite database consumed by the backend (`CATALOG_DB_PATH` defaults to this file).

## Requirements

- Python 3.12 (same interpreter used by the crawler)
- `crawler/scripts/import_catalog_db.py`
- Existing JSON exports under `crawler/data/catalog_db/<year>/course_<id>/<modalidade>/data.json`

## Usage

```powershell
cd crawler
python scripts/import_catalog_db.py `
    --catalog-root data/catalog_db `
    --db-path data/db/catalog.db
```

Arguments:

| Flag | Description | Default |
|------|-------------|---------|
| `--catalog-root` | Path to the directory containing `data.json` files. | `crawler/data/catalog_db` |
| `--db-path` | SQLite file to (re)create. | `crawler/data/db/catalog.db` |

The script deletes any previous database at `--db-path`, recreates the schema from `src/crawler_app/db/catalog_schema.sql`, and inserts every modality from the JSON tree. `prereqs` are mapped to relational tables (`prereq_group`, `prereq_requirement`), allowing SQL joins inside the backend. It prints a summary such as:

```
[import] Completed: 1065 curricula, 52790 entries -> F:\...\catalog.db
```

## Pipeline

1. Run the crawler (e.g., `python -m src.crawler_app.cli collect`).
2. Ensure `crawler/data/catalog_db` contains the fresh JSONs.
3. Execute the importer (command above).
4. Confirm `CATALOG_DB_PATH` (`backend/.env`) points to the generated SQLite file.
5. Start the backend (`uvicorn main:app --reload`).

When the crawler is executed again, simply rerun the importer to keep the database in sync.
