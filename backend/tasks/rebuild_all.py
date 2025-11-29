from __future__ import annotations

import sys
from pathlib import Path

# Ensure backend in path
BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from app.services.curriculum.updater import CurriculumUpdater


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Rebuild curriculum pipeline for a user")
    parser.add_argument("user_id", help="User ID to rebuild for")
    args = parser.parse_args()

    updater = CurriculumUpdater()
    updater.rebuild_all_for_user(args.user_id)


if __name__ == "__main__":
    main()
