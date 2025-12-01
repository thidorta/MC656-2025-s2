from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

from app.config.settings import get_settings

logger = logging.getLogger(__name__)


def _timestamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S-%f")


def _sanitize_segment(value: str) -> str:
    """Keep filenames safe by removing path separators and spaces."""
    allowed = {"-", "_"}
    return "".join(ch if ch.isalnum() or ch in allowed else "-" for ch in value)


def _write_json(target_dir: Path, label: str, payload: Any, *, suffix: Optional[str] = None) -> None:
    """Internal helper that writes a JSON file to target_dir."""
    try:
        target_dir.mkdir(parents=True, exist_ok=True)
        segments = [_timestamp(), _sanitize_segment(label)]
        if suffix:
            segments.append(_sanitize_segment(suffix))
        file_path = target_dir / f"{'_'.join(segments)}.json"
        with file_path.open("w", encoding="utf-8") as handle:
            json.dump(payload, handle, indent=2)
            handle.write("\n")
    except Exception:
        logger.exception("Failed to write planner debug artifact for %s", label)


def write_debug_json(label: str, payload: Any, *, suffix: Optional[str] = None) -> None:
    """Persist planner debug payloads when enabled via settings."""
    settings = get_settings()
    if not settings.planner_debug_enabled:
        return

    target_dir: Path = settings.planner_debug_dir
    _write_json(target_dir, label, payload, suffix=suffix)


def write_attendance_debug(label: str, payload: Any, *, suffix: Optional[str] = None) -> None:
    """Persist attendance-specific debug payloads under a dedicated folder."""
    settings = get_settings()
    if not settings.planner_debug_enabled:
        return

    target_dir: Path = settings.planner_debug_dir / "attendance"
    _write_json(target_dir, label, payload, suffix=suffix)
