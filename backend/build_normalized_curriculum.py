"""
Phase 2: Normalized Curriculum Builder

This script enriches user_curriculum with:
1. Authoritative prerequisites (pre_req_real)
2. Normalized offerings (offers_real)
3. Computed flags (can_enroll_final, ofertada_final)
4. Final status (status_final)

Operates on the unified user_curriculum table built in Phase 1.
"""

import json
import sqlite3
from datetime import datetime, UTC
from pathlib import Path
from typing import Any, Dict, List, Optional, Set

BACKEND_DIR = Path(__file__).resolve().parent
WORKSPACE = BACKEND_DIR.parent
DATA_DIR = BACKEND_DIR / "data"

CATALOG_DB = WORKSPACE / "crawler" / "data" / "db" / "catalog.db"
USER_AUTH_DB = DATA_DIR / "user_auth.db"


def get_authoritative_prereqs(
    user_auth_conn: sqlite3.Connection, codigo: str
) -> List[str]:
    """
    Query discipline_prerequisites for authoritative prereqs.
    Returns list of required codigos.
    """
    cur = user_auth_conn.execute(
        """
        SELECT DISTINCT required_codigo
        FROM discipline_prerequisites dp
        JOIN curriculum_disciplines cd ON dp.curriculum_discipline_id = cd.id
        WHERE cd.codigo = ?
        """,
        (codigo,),
    )
    return [row[0] for row in cur.fetchall()]


def get_catalog_prereqs(
    catalog_conn: Optional[sqlite3.Connection], codigo: str
) -> List[str]:
    """
    Fallback: query catalog DB for prereqs if authoritative DB has none.
    Returns list of required codigos from prereq_requirement.
    """
    if not catalog_conn:
        return []
    
    try:
        cur = catalog_conn.execute(
            """
            SELECT DISTINCT pr.required_code
            FROM prereq_requirement pr
            JOIN prereq_group pg ON pr.group_id = pg.group_id
            JOIN curriculum_entry ce ON pg.entry_id = ce.entry_id
            JOIN discipline d ON ce.discipline_id = d.discipline_id
            WHERE d.code = ?
            """,
            (codigo,),
        )
        return [row[0] for row in cur.fetchall()]
    except sqlite3.Error:
        return []


def get_normalized_offers(
    user_auth_conn: sqlite3.Connection, codigo: str, user_id: int
) -> List[Dict[str, Any]]:
    """
    Query course_offers + offer_schedule_events for normalized offerings.
    Returns array of offer objects with turma, professor, schedule, periodo.
    """
    # Get offers for this discipline
    user_auth_conn.row_factory = sqlite3.Row
    offers_cur = user_auth_conn.execute(
        """
        SELECT id, turma, semester, offer_metadata
        FROM course_offers
        WHERE codigo = ? AND user_id = ?
        """,
        (codigo, user_id),
    )
    
    offers = []
    for offer_row in offers_cur.fetchall():
        offer_id = offer_row["id"]
        turma = offer_row["turma"]
        periodo = offer_row["semester"]
        
        # Parse metadata for professor
        metadata = {}
        if offer_row["offer_metadata"]:
            try:
                metadata = json.loads(offer_row["offer_metadata"])
            except json.JSONDecodeError:
                pass
        
        professor = metadata.get("professor", "N/A")
        
        # Get schedule events
        events_cur = user_auth_conn.execute(
            """
            SELECT day_of_week, start_hour, end_hour, location, title
            FROM offer_schedule_events
            WHERE offer_id = ?
            ORDER BY day_of_week, start_hour
            """,
            (offer_id,),
        )
        
        schedule = []
        for event_row in events_cur.fetchall():
            schedule.append({
                "day": event_row["day_of_week"],
                "start_hour": event_row["start_hour"],
                "end_hour": event_row["end_hour"],
                "location": event_row["location"],
                "title": event_row["title"],
            })
        
        offers.append({
            "turma": turma,
            "professor": professor,
            "schedule": schedule,
            "periodo": periodo,
        })
    
    user_auth_conn.row_factory = None
    return offers


def build_user_completion_map(
    user_auth_conn: sqlite3.Connection, user_id: int
) -> Dict[str, bool]:
    """
    Build map of codigo -> tem (completion flag) for this user.
    """
    cur = user_auth_conn.execute(
        "SELECT codigo, tem FROM user_curriculum WHERE user_id = ?", (user_id,)
    )
    return {row[0]: bool(row[1]) for row in cur.fetchall()}


def compute_can_enroll(
    tem: bool, prereqs: List[str], completion_map: Dict[str, bool]
) -> bool:
    """
    Compute final can_enroll eligibility.
    
    Rules:
    - If already completed (tem=1) → false (not eligible to re-enroll)
    - If any prereq not completed → false
    - Otherwise → true
    """
    if tem:
        return False
    
    for prereq_code in prereqs:
        if not completion_map.get(prereq_code, False):
            return False
    
    return True


def compute_status_final(
    tem: bool, can_enroll: bool, ofertada: bool
) -> str:
    """
    Apply decision tree for final status.
    
    if concluida:
        status = "concluida"
    else if can_enroll == false:
        status = "nao_elegivel"
    else if ofertada == true:
        status = "elegivel_e_ofertada"
    else:
        status = "elegivel_nao_ofertada"
    """
    if tem:
        return "concluida"
    elif not can_enroll:
        return "nao_elegivel"
    elif ofertada:
        return "elegivel_e_ofertada"
    else:
        return "elegivel_nao_ofertada"


def normalize_user_curriculum(user_id: int) -> None:
    """
    Phase 2: Enrich user_curriculum with normalized logic.
    
    For each discipline in user_curriculum:
    1. Read authoritative prereqs (fallback to catalog)
    2. Read normalized offerings
    3. Compute can_enroll_final, ofertada_final
    4. Compute status_final
    5. Update row with Phase 2 fields
    """
    catalog_conn = sqlite3.connect(str(CATALOG_DB)) if CATALOG_DB.exists() else None
    user_auth_conn = sqlite3.connect(str(USER_AUTH_DB))
    
    # Build completion map for prereq evaluation
    completion_map = build_user_completion_map(user_auth_conn, user_id)
    
    # Fetch all disciplines for this user
    user_auth_conn.row_factory = sqlite3.Row
    disciplines = user_auth_conn.execute(
        "SELECT * FROM user_curriculum WHERE user_id = ? ORDER BY codigo",
        (user_id,),
    ).fetchall()
    user_auth_conn.row_factory = None
    
    print(f"Processing {len(disciplines)} disciplines for user_id={user_id}")
    
    updated = 0
    for disc in disciplines:
        codigo = disc["codigo"]
        tem = bool(disc["tem"])
        
        # Step 1: Get authoritative prereqs
        prereqs = get_authoritative_prereqs(user_auth_conn, codigo)
        
        # Fallback to catalog if empty
        if not prereqs and catalog_conn:
            prereqs = get_catalog_prereqs(catalog_conn, codigo)
        
        pre_req_real_json = json.dumps(prereqs)
        
        # Step 2: Get normalized offerings
        offers = get_normalized_offers(user_auth_conn, codigo, user_id)
        offers_real_json = json.dumps(offers)
        
        # Step 3: Compute flags
        ofertada = len(offers) > 0
        can_enroll = compute_can_enroll(tem, prereqs, completion_map)
        
        # Step 4: Compute final status
        status_final = compute_status_final(tem, can_enroll, ofertada)
        
        # Step 5: Update row
        user_auth_conn.execute(
            """
            UPDATE user_curriculum
            SET pre_req_real = ?,
                offers_real = ?,
                can_enroll_final = ?,
                ofertada_final = ?,
                status_final = ?,
                updated_at = ?
            WHERE user_id = ? AND codigo = ?
            """,
            (
                pre_req_real_json,
                offers_real_json,
                1 if can_enroll else 0,
                1 if ofertada else 0,
                status_final,
                datetime.now(UTC).isoformat(),
                user_id,
                codigo,
            ),
        )
        updated += 1
    
    user_auth_conn.commit()
    
    if catalog_conn:
        catalog_conn.close()
    user_auth_conn.close()
    
    print(f"✅ Updated {updated} disciplines with Phase 2 normalized fields")


def main() -> None:
    # For now, hardcode user_id for RA 183611
    # In production, this would be parameterized
    user_id = 1000
    
    print(f"Phase 2: Normalizing curriculum for user_id={user_id}")
    normalize_user_curriculum(user_id)
    
    # Validation: check key samples
    user_auth_conn = sqlite3.connect(str(USER_AUTH_DB))
    user_auth_conn.row_factory = sqlite3.Row
    
    print("\n=== Validation Samples ===")
    samples = ["MC358", "MC458", "MC558"]
    for code in samples:
        row = user_auth_conn.execute(
            """
            SELECT codigo, tem, can_enroll_final, ofertada_final, status_final,
                   pre_req_real, offers_real
            FROM user_curriculum
            WHERE user_id = ? AND codigo = ?
            """,
            (user_id, code),
        ).fetchone()
        
        if row:
            prereqs = json.loads(row["pre_req_real"]) if row["pre_req_real"] else []
            offers = json.loads(row["offers_real"]) if row["offers_real"] else []
            
            print(f"\n{code}:")
            print(f"  tem={row['tem']}, can_enroll={row['can_enroll_final']}, ofertada={row['ofertada_final']}")
            print(f"  status_final={row['status_final']}")
            print(f"  prereqs={prereqs}")
            print(f"  offers_count={len(offers)}")
    
    user_auth_conn.close()


if __name__ == "__main__":
    main()
