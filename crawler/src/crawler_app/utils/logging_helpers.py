from __future__ import annotations
import re
from typing import Dict, List, Optional

from .io_raw import save_raw


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
    txt = re.sub(r"\s+", " ", html)
    return txt[:max_chars] + ("…" if len(txt) > max_chars else "")


def find_all_selects(html: str) -> List[Dict[str, object]]:
    selects = []
    for m in re.finditer(r"<select\b[^>]*>[\s\S]*?</select>", html, re.IGNORECASE):
        block = m.group(0)
        id_m = re.search(r"id\s*=\s*['\"]([^'\"]+)['\"]", block, re.IGNORECASE)
        name_m = re.search(r"name\s*=\s*['\"]([^'\"]+)['\"]", block, re.IGNORECASE)
        sid = id_m.group(1) if id_m else None
        sname = name_m.group(1) if name_m else None
        options = []
        for o in re.finditer(r"<option\s+[^>]*value\s*=\s*['\"]([^'\"]*)['\"][^>]*>(.*?)</option>", block, re.IGNORECASE | re.DOTALL):
            val = (o.group(1) or "").strip()
            lbl = re.sub(r"<[^>]*>", "", o.group(2) or "").strip()
            options.append((val, lbl))
        selects.append({"id": sid, "name": sname, "options": options})
    return selects


def log_response_with_selects(label: str, resp, raw_dir: str, filename: Optional[str] = None):
    print(f"\n--- [{label}] RESPOSTA ---")
    print(f"URL: {resp.url}")
    print(f"Status: {resp.status_code}")
    ctype = resp.headers.get("Content-Type", "")
    print(f"Content-Type: {ctype}")
    print(f"Tamanho (bytes): {len(resp.content) if resp.content is not None else 0}")
    print(f"Previa do HTML: {summarize_html(resp.text, max_chars=300)}")

    hint = filename or label
    path = save_raw(resp.text or "", raw_dir, hint)
    print(f"RAW salvo em: {path}")

    selects = find_all_selects(resp.text or "")
    if not selects:
        print("(i) Nenhum <select> encontrado no HTML.")
    else:
        print(f"Encontrados {len(selects)} <select> no HTML:")
        for i, s in enumerate(selects, start=1):
            sid = s["id"] or "-"
            sname = s["name"] or "-"
            print(f"  [{i}] select id='{sid}' name='{sname}' com {len(s['options'])} option(s)")
            for j, (v, l) in enumerate(s["options"][:5], start=1):
                print(f"      - opt{j}: value='{v}' label='{l}'")
            if len(s["options"]) > 5:
                print(f"      ... (+{len(s['options']) - 5} opcoes)")

    return path

