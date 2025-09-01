# src/utils/hashing.py
from __future__ import annotations
import hashlib

def stable_id(text: str, *, prefix: str = "") -> str:
    """
    Gera um ID estável a partir de um texto (ex.: "34|2022|AA").
    - Usa SHA1 (determinístico) e retorna os primeiros 16 hex (64 bits) por padrão.
    - 'prefix' é opcional para ajudar a inspecionar a origem (ex.: 'ccm_').
    """
    if text is None:
        text = ""
    h = hashlib.sha1(text.encode("utf-8")).hexdigest()[:16]
    return f"{prefix}{h}"
