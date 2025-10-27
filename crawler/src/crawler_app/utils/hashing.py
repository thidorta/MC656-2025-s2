from __future__ import annotations
import hashlib


def sha256_hex(s: str | bytes) -> str:
    data = s.encode("utf-8") if isinstance(s, str) else s
    return hashlib.sha256(data).hexdigest()


def stable_id(text: str, *, prefix: str = "") -> str:
    """Deterministic short id using SHA1 (first 16 hex), compatible with previous utils."""
    if text is None:
        text = ""
    h = hashlib.sha1(text.encode("utf-8")).hexdigest()[:16]
    return f"{prefix}{h}"
