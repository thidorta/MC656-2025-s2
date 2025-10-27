#!/usr/bin/env bash
# Run the crawler for ALL courses and build the DB

set -euo pipefail

# Move to project root (folder containing this file)
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

# Activate venv if present (Linux/macOS)
if [ -f .venv/bin/activate ]; then
  echo "[1/3] Activating venv (.venv)"
  # shellcheck disable=SC1091
  source .venv/bin/activate
fi

echo "Python: $(python --version 2>&1)"

echo "[2/3] Collecting data (crawler_app collect)"
python -m src.crawler_app.cli collect

echo "[3/3] Building DB (crawler_app build-db)"
python -m src.crawler_app.cli build-db

echo
echo "Done. Outputs:"
echo "  - data/json/           (JSONs per course/modalidade)"
echo "  - data/db/gde_simple.db (SQLite DB)"
echo "  - data/raw/            (raw HTML)"

