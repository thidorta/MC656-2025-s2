from __future__ import annotations

import json
import threading
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

from fastapi import HTTPException

from app.config.settings import get_settings, Settings


@dataclass
class CachedFile:
    mtime: float
    data: Dict[str, Any]


class UserDBCache:
    def __init__(self, root: Path) -> None:
        self.root = root
        self._file_cache: Dict[Path, CachedFile] = {}
        self._lock = threading.Lock()

    def load_planner(self, planner_id: str) -> Dict[str, Any]:
        planner_dir = self.root / planner_id
        if not planner_dir.exists():
            raise HTTPException(status_code=404, detail="Planner data not found")

        course_files = sorted(planner_dir.glob("course_*.json"))
        if not course_files:
            raise HTTPException(status_code=404, detail="Planner has no captured courses")

        snapshots: List[Dict[str, Any]] = []
        newest_mtime = 0.0
        for course_file in course_files:
            mtime = course_file.stat().st_mtime
            newest_mtime = max(newest_mtime, mtime)
            data = self._load_file(course_file)
            snapshots.append(
                {
                    "path": str(course_file.relative_to(self.root)),
                    "course_id": data.get("course", {}).get("id"),
                    "course_name": data.get("course", {}).get("name"),
                    "year": data.get("year"),
                    "data": data,
                }
            )

        return {
            "planner_id": planner_id,
            "count": len(snapshots),
            "last_updated": datetime.fromtimestamp(newest_mtime, tz=timezone.utc).isoformat(),
            "courses": snapshots,
        }

    def _load_file(self, path: Path) -> Dict[str, Any]:
        with self._lock:
            mtime = path.stat().st_mtime
            cached = self._file_cache.get(path)
            if cached and cached.mtime == mtime:
                return cached.data

            data = json.loads(path.read_text(encoding="utf-8"))
            self._file_cache[path] = CachedFile(mtime=mtime, data=data)
            return data


_cache_instance: UserDBCache | None = None
_cache_lock = threading.Lock()


def get_user_db_cache(settings: Settings | None = None) -> UserDBCache:
    global _cache_instance
    if _cache_instance is not None:
        return _cache_instance
    with _cache_lock:
        if _cache_instance is None:
            settings = settings or get_settings()
            _cache_instance = UserDBCache(settings.user_db_root)
    return _cache_instance
