# src/utils/logging_helpers.py
from __future__ import annotations
import os
import re
from typing import Dict, List, Tuple, Iterable, Optional
from .io_raw import ensure_dir, save_raw, timestamped_name

def print_session_cookies(session, *, prefix: str = "Cookies na sessão"):
    print(f"{prefix}:")
    if not session.cookies:
        print("  (nenhum cookie na sessão)")
        return
    for c in session.cookies:
        val = c.value or ""
        preview = (val[:12] + "...") if len(val) > 12 else val
        print(f"  - {c.name} = {preview} (len={len(val)}) ; domain={c.domain} ; path={c.path}")

def summarize_html(html: str, *, max_chars: int = 400) -> str:
    if not html:
        return "(vazio)"
    txt = re.sub(r"\s+", " ", html)  # compacta espaços para caber mais
    return txt[:max_chars] + ("…" if len(txt) > max_chars else "")

def find_all_selects(html: str) -> List[Dict[str, object]]:
    """
    Lista todos os <select> do HTML, com seus IDs/names e as opções.
    Retorna: [{'id':..., 'name':..., 'options': [(value, label), ...]}]
    """
    selects = []
    # Captura cada <select ...>...</select>
    for m in re.finditer(r"<select\b[^>]*>[\s\S]*?</select>", html, re.IGNORECASE):
        block = m.group(0)
        # id / name
        id_m = re.search(r"id\s*=\s*['\"]([^'\"]+)['\"]", block, re.IGNORECASE)
        name_m = re.search(r"name\s*=\s*['\"]([^'\"]+)['\"]", block, re.IGNORECASE)
        sid = id_m.group(1) if id_m else None
        sname = name_m.group(1) if name_m else None
        # options
        options = []
        for o in re.finditer(r"<option\s+[^>]*value\s*=\s*['\"]([^'\"]*)['\"][^>]*>(.*?)</option>", block, re.IGNORECASE | re.DOTALL):
            val = (o.group(1) or "").strip()
            lbl = re.sub(r"<[^>]*>", "", o.group(2) or "").strip()
            options.append((val, lbl))
        selects.append({"id": sid, "name": sname, "options": options})
    return selects

def log_response_with_selects(label: str, resp, raw_dir: str, filename: Optional[str] = None):
    """
    Imprime status, URL, Content-Type, salva o HTML no raw_dir e lista todos os <select>.
    """
    print(f"\n--- [{label}] RESPOSTA ---")
    print(f"URL: {resp.url}")
    print(f"Status: {resp.status_code}")
    ctype = resp.headers.get("Content-Type", "")
    print(f"Content-Type: {ctype}")
    print(f"Tamanho (bytes): {len(resp.content) if resp.content is not None else 0}")
    print(f"Prévia do HTML: {summarize_html(resp.text, max_chars=300)}")

    # salvar raw
    ensure_dir(raw_dir)
    if filename is None:
        filename = timestamped_name(label, ext="html")
    path = save_raw(raw_dir, filename, resp.text)
    print(f"💾 RAW salvo em: {path}")

    # listar selects
    selects = find_all_selects(resp.text or "")
    if not selects:
        print("⚠️  Nenhum <select> encontrado no HTML.")
    else:
        print(f"Encontrados {len(selects)} <select> no HTML:")
        for i, s in enumerate(selects, start=1):
            sid = s["id"] or "-"
            sname = s["name"] or "-"
            print(f"  [{i}] select id='{sid}' name='{sname}' com {len(s['options'])} option(s)")
            # Mostra até 5 opções para amostra
            for j, (v, l) in enumerate(s["options"][:5], start=1):
                print(f"      - opt{j}: value='{v}' label='{l}'")
            if len(s["options"]) > 5:
                print(f"      … (+{len(s['options']) - 5} opções)")
