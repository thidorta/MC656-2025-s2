from __future__ import annotations

import hashlib
import os
import time
from datetime import datetime


def ensure_dir(path: str) -> None:
    os.makedirs(path, exist_ok=True)


def save_raw(html: str, raw_dir: str, name_hint: str) -> str:
    ensure_dir(raw_dir)
    key = hashlib.md5(name_hint.encode("utf-8")).hexdigest()
    filename = f"{int(time.time())}_{key}.html"
    path = os.path.join(raw_dir, filename)
    with open(path, "w", encoding="utf-8") as f:
        f.write(html if html is not None else "")
    return path


def timestamped_name(stem: str, ext: str = "html") -> str:
    ts = datetime.now().strftime("%Y-%m-%dT%H-%M-%S")
    return f"{stem}_{ts}.{ext}"

