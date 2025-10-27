from __future__ import annotations
import os
from datetime import datetime


def ensure_dir(path: str) -> None:
    os.makedirs(path, exist_ok=True)


def save_raw(base_dir: str, filename: str, content: str) -> str:
    ensure_dir(base_dir)
    fullpath = os.path.join(base_dir, filename)
    with open(fullpath, "w", encoding="utf-8") as f:
        f.write(content if content is not None else "")
    return fullpath


def timestamped_name(stem: str, ext: str = "html") -> str:
    ts = datetime.now().strftime("%Y-%m-%dT%H-%M-%S")
    return f"{stem}_{ts}.{ext}"

