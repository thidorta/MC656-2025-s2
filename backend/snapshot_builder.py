import json
from pathlib import Path
from typing import Any, Dict, List, Optional

# Universal snapshot builder
# - Inputs: GDE raw login JSON, catalog.db (curriculum), user_auth.db (authoritative prereqs/offers/events)
# - Output: normalized /tree snapshot with raw + normalized fields for ANY user

# Note: This script is designed to run within the backend workspace.
# It avoids tight coupling and reads from existing JSON and DBs when available.

# Minimal DB access: we will use raw SQLite queries via sqlite3 to avoid ORM dependencies.
import sqlite3

WORKSPACE = Path(__file__).resolve().parent.parent
BACKEND_DIR = WORKSPACE / "backend"
DATA_DIR = BACKEND_DIR / "data"

USER_DB_PATH = DATA_DIR / "user_auth.db"
CATALOG_DB_PATH = WORKSPACE / "crawler" / "data" / "db" / "catalog.db"
LOGIN_JSON_PATH = BACKEND_DIR / "login.json"

# Helper types
DisciplineSnapshot = Dict[str, Any]


def load_gde_login(path: Path) -> Dict[str, Any]:
    # Handle potential BOM using utf-8-sig
    with path.open("r", encoding="utf-8-sig") as f:
        return json.load(f)


def sqlite_rows(conn: sqlite3.Connection, query: str, params: tuple = ()) -> List[sqlite3.Row]:
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute(query, params)
    return cur.fetchall()


def fetch_prereqs(conn: sqlite3.Connection, codigo: str) -> List[str]:
    # discipline_prerequisites: expected columns (discipline_code, prerequisite_code)
    try:
        rows = sqlite_rows(
            conn,
            "SELECT prerequisite_code FROM discipline_prerequisites WHERE discipline_code = ?",
            (codigo,),
        )
        return [r[0] for r in rows]
    except sqlite3.Error:
        return []

def fetch_catalog_prereqs(conn: Optional[sqlite3.Connection], codigo: str) -> List[str]:
    if not conn:
        return []
    try:
        rows = sqlite_rows(
            conn,
            "SELECT prerequisite_code FROM catalog_prerequisites WHERE discipline_code = ?",
            (codigo,),
        )
        return [r[0] for r in rows]
    except sqlite3.Error:
        return []


def fetch_offers(conn: sqlite3.Connection, codigo: str) -> List[Dict[str, Any]]:
    # course_offers: offer_id, disciplina_codigo, turma, professor, vagas, fechado, link, horarios_raw, professores_json, viola_reserva
    try:
        rows = sqlite_rows(
            conn,
            "SELECT offer_id, disciplina_codigo, turma, professor, vagas, fechado, link, horarios_raw, professores_json, viola_reserva FROM course_offers WHERE disciplina_codigo = ?",
            (codigo,),
        )
        offers: List[Dict[str, Any]] = []
        for r in rows:
            offer = {
                "offer_id": r[0],
                "disciplina_codigo": r[1],
                "turma": r[2],
                "professor": r[3],
                "vagas": r[4],
                "fechado": r[5],
                "link": r[6],
                "horarios_raw": json.loads(r[7]) if r[7] else [],
                "professores_json": json.loads(r[8]) if r[8] else [],
                "viola_reserva": bool(r[9]) if r[9] is not None else False,
                "events": [],
            }
            offers.append(offer)
        return offers
    except sqlite3.Error:
        return []


def fetch_offer_events(conn: sqlite3.Connection, offer_id: str) -> List[Dict[str, Any]]:
    try:
        rows = sqlite_rows(
            conn,
            "SELECT title, start, end, day, start_hour, end_hour FROM offer_schedule_events WHERE offer_id_fk = ?",
            (offer_id,),
        )
        events: List[Dict[str, Any]] = []
        for r in rows:
            events.append(
                {
                    "title": r[0],
                    "start": r[1],
                    "end": r[2],
                    "day": r[3],
                    "start_hour": r[4],
                    "end_hour": r[5],
                }
            )
        return events
    except sqlite3.Error:
        return []


def compute_can_enroll(has_credit: bool, prereq_codes: List[str], user_completed: Dict[str, bool]) -> bool:
    if has_credit:
        return False  # already completed; enrolling again not applicable
    for pre in prereq_codes:
        if not user_completed.get(pre, False):
            return False
    return True


def build_user_completed_map(curriculum_items: List[Dict[str, Any]]) -> Dict[str, bool]:
    # Map course code -> tem flag
    return {item.get("codigo"): bool(item.get("tem")) for item in curriculum_items if item.get("codigo")}


def assemble_discipline_entry(
    user_id: str,
    gde_item: Optional[Dict[str, Any]],
    catalog_item: Optional[Dict[str, Any]],
    prereq_real: List[str],
    offers_real: List[Dict[str, Any]],
) -> DisciplineSnapshot:
    # Base/keys
    codigo = (gde_item or {}).get("codigo") or (catalog_item or {}).get("codigo")
    disciplina_id = (gde_item or {}).get("disciplina_id")

    # Raw fields from GDE (preserve as-is when available)
    raw_missing = (gde_item or {}).get("missing")
    raw_tem = (gde_item or {}).get("tem")
    raw_status = (gde_item or {}).get("status")
    raw_can_enroll = (gde_item or {}).get("pode")
    raw_prereqs = (gde_item or {}).get("prereqs", [])
    raw_offers = (gde_item or {}).get("offers", [])

    nome = (gde_item or {}).get("nome") or (catalog_item or {}).get("nome")
    creditos = (gde_item or {}).get("creditos") or (catalog_item or {}).get("creditos")
    catalogo = (gde_item or {}).get("catalogo") or (catalog_item or {}).get("catalogo")
    tipo = (gde_item or {}).get("tipo") if (gde_item and gde_item.get("tipo") is not None) else (catalog_item or {}).get("tipo")
    semestre = (gde_item or {}).get("semestre") or (catalog_item or {}).get("semestre")
    cp_group = (gde_item or {}).get("cp_group") or (catalog_item or {}).get("cp_group")
    color = (gde_item or {}).get("color") or (catalog_item or {}).get("color")
    obs = (gde_item or {}).get("obs")

    # Normalized computations
    has_credit = bool(raw_tem)
    ofertada = len(offers_real) > 0
    can_enroll = compute_can_enroll(has_credit, prereq_real, user_completed_map)

    # Final status decision tree
    if has_credit:
        status = "concluida"
    else:
        if not can_enroll:
            status = "nao_elegivel"
        else:
            status = "elegivel_e_ofertada" if ofertada else "elegivel_nao_ofertada"

    return {
        "user_id": user_id,
        "disciplina_id": disciplina_id,
        "codigo": codigo,
        # Raw preserved
        "missing": raw_missing,
        "tem": raw_tem,
        "raw_status": raw_status,
        "raw_can_enroll": raw_can_enroll,
        "pre_req_raw": raw_prereqs,
        "offers_raw": raw_offers,
        # Normalized/enriched
        "pre_req_real": prereq_real,
        "offers_real": offers_real,
        "offers_real_origin": "authoritative" if offers_real else ("raw_fallback" if raw_offers else "none"),
        "concluida": has_credit,
        "can_enroll": can_enroll,
        "ofertada": ofertada,
        "status": status,
        # Context
        "nome": nome,
        "creditos": creditos,
        "catalogo": catalogo,
        "tipo": tipo,
        "semestre": semestre,
        "cp_group": cp_group,
        "color": color,
        "obs": obs,
        "metadata": {},
    }


def load_catalog_curriculum(conn: sqlite3.Connection) -> Dict[str, Dict[str, Any]]:
    # Expect a table like catalog_curriculum with columns: codigo, nome, creditos, catalogo, tipo, semestre, cp_group, color
    try:
        rows = sqlite_rows(
            conn,
            "SELECT codigo, nome, creditos, catalogo, tipo, semestre, cp_group, color FROM catalog_curriculum",
        )
        result: Dict[str, Dict[str, Any]] = {}
        for r in rows:
            result[r[0]] = {
                "codigo": r[0],
                "nome": r[1],
                "creditos": r[2],
                "catalogo": r[3],
                "tipo": r[4],
                "semestre": r[5],
                "cp_group": r[6],
                "color": r[7],
            }
        return result
    except sqlite3.Error:
        return {}


def build_snapshot_for_user(user_id: str, gde_login: Dict[str, Any]) -> Dict[str, Any]:
    # Extract user_db from GDE login JSON structure
    user_db = gde_login.get("user_db") or gde_login.get("original_payload") or {}
    curriculum_items: List[Dict[str, Any]] = user_db.get("curriculum", [])

    # Map of code -> GDE item
    gde_by_code: Dict[str, Dict[str, Any]] = {item.get("codigo"): item for item in curriculum_items if item.get("codigo")}

    # Build user completed map from GDE
    global user_completed_map
    user_completed_map = build_user_completed_map(curriculum_items)

    # Open DBs
    user_conn = sqlite3.connect(str(USER_DB_PATH)) if USER_DB_PATH.exists() else None
    catalog_conn = sqlite3.connect(str(CATALOG_DB_PATH)) if CATALOG_DB_PATH.exists() else None

    # Load catalog full curriculum (include disciplines absent from GDE)
    catalog_by_code: Dict[str, Dict[str, Any]] = {}
    if catalog_conn:
        catalog_by_code = load_catalog_curriculum(catalog_conn)

    # Union of all codes from catalog and GDE
    all_codes = set(gde_by_code.keys()) | set(catalog_by_code.keys())

    snapshot_items: List[DisciplineSnapshot] = []

    for code in sorted(all_codes):
        gde_item = gde_by_code.get(code)
        catalog_item = catalog_by_code.get(code)

        # Fetch real prereqs/offers from user DB
        prereq_real: List[str] = []
        offers_real: List[Dict[str, Any]] = []
        if user_conn:
            prereq_real = fetch_prereqs(user_conn, code)
            offers_real = fetch_offers(user_conn, code)
            # attach events per offer
            for offer in offers_real:
                offer["events"] = fetch_offer_events(user_conn, str(offer["offer_id"]))

        # If authoritative prereqs missing, enrich from catalog
        if not prereq_real:
            prereq_real = fetch_catalog_prereqs(catalog_conn, code)

        # If authoritative offers missing, safely fallback to raw offers
        if not offers_real and gde_item and gde_item.get("offers"):
            # Minimal normalization of raw offers to match shape
            for ro in gde_item.get("offers"):
                offers_real.append(
                    {
                        "offer_id": ro.get("id"),
                        "disciplina_codigo": code,
                        "turma": ro.get("turma"),
                        "professor": ro.get("professor"),
                        "vagas": ro.get("vagas"),
                        "fechado": ro.get("fechado"),
                        "link": ro.get("link"),
                        "horarios_raw": ro.get("horarios", []),
                        "professores_json": ro.get("professores", []),
                        "viola_reserva": ro.get("viola_reserva", False),
                        "events": [
                            {
                                "title": e.get("title"),
                                "start": e.get("start"),
                                "end": e.get("end"),
                                "day": e.get("day"),
                                "start_hour": e.get("start_hour"),
                                "end_hour": e.get("end_hour"),
                            }
                            for e in ro.get("events", [])
                        ],
                    }
                )

        entry = assemble_discipline_entry(
            user_id=user_id,
            gde_item=gde_item,
            catalog_item=catalog_item,
            prereq_real=prereq_real,
            offers_real=offers_real,
        )
        snapshot_items.append(entry)

    # Build final snapshot structure
    final_snapshot = {
        "user_id": user_id,
        "generated_at": None,
        "items": snapshot_items,
    }

    # Add simple validation markers for RA 183611
    # Find specific codes
    def find_status(code: str) -> Optional[str]:
        for it in snapshot_items:
            if it.get("codigo") == code:
                return it.get("status")
        return None

    final_snapshot["validation"] = {
        "MC358": find_status("MC358"),
        "MC458": find_status("MC458"),
        "MC558": find_status("MC558"),
        "_notes": "offers_real_origin indicates authoritative/raw_fallback/none"
    }

    # Close connections
    if user_conn:
        user_conn.close()
    if catalog_conn:
        catalog_conn.close()

    return final_snapshot


def main() -> None:
    if not LOGIN_JSON_PATH.exists():
        print(f"Missing GDE login JSON at {LOGIN_JSON_PATH}")
        return
    gde_login = load_gde_login(LOGIN_JSON_PATH)
    # Derive user_id from payload when available
    user = gde_login.get("user") or gde_login.get("original_payload", {}).get("user") or {}
    user_id = str(user.get("ra") or user.get("id") or "unknown")

    snapshot = build_snapshot_for_user(user_id, gde_login)

    out_path = BACKEND_DIR / "snapshot_universal.json"
    with out_path.open("w", encoding="utf-8") as f:
        json.dump(snapshot, f, ensure_ascii=False, indent=2)
    print(f"Wrote {out_path}")


if __name__ == "__main__":
    main()
