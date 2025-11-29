"""
Phase 3 Validation Script

Validates that user_curriculum_snapshot contains correct data for:
- MC358: Completed, catalog-only, no prerequisites
- MC458: Eligible and offered, has prerequisites
- MC558: Not eligible, missing prerequisites

Raises exceptions if validation fails.
"""

from __future__ import annotations

import json
import sqlite3
import sys
from pathlib import Path
from typing import Any, Dict

BACKEND_DIR = Path(__file__).resolve().parent
USER_AUTH_DB = BACKEND_DIR / "data" / "user_auth.db"


def fetch_snapshot_row(conn: sqlite3.Connection, user_id: str, code: str) -> Dict[str, Any]:
    """Fetch a single snapshot row."""
    conn.row_factory = sqlite3.Row
    cur = conn.execute(
        """
        SELECT *
        FROM user_curriculum_snapshot
        WHERE user_id = ? AND code = ?
        """,
        (user_id, code),
    )
    row = cur.fetchone()
    
    if not row:
        raise Exception(f"❌ {code} NOT FOUND in user_curriculum_snapshot")
    
    # Convert to dict
    cols = [d[0] for d in cur.description]
    data = {cols[i]: row[i] for i in range(len(cols))}
    
    # Parse JSON fields
    for field in ['prereq_list', 'children_list', 'graph_position', 'gde_offers_raw']:
        if data.get(field):
            try:
                data[field] = json.loads(data[field])
            except:
                pass
    
    return data


def validate_mc358(row: Dict[str, Any]):
    """
    MC358 validation:
    - is_completed = 1
    - prereq_list = []
    - children_list contains MC458
    - depth = 0
    """
    print("🔍 Validating MC358...")
    
    if row['is_completed'] != 1:
        raise Exception(f"❌ MC358: is_completed should be 1, got {row['is_completed']}")
    
    prereq_list = row['prereq_list'] or []
    if prereq_list != []:
        raise Exception(f"❌ MC358: prereq_list should be [], got {prereq_list}")
    
    children_list = row['children_list'] or []
    if 'MC458' not in children_list:
        raise Exception(f"❌ MC358: children_list should contain MC458, got {children_list}")
    
    if row['depth'] != 0:
        raise Exception(f"❌ MC358: depth should be 0, got {row['depth']}")
    
    if row['final_status'] != 'completed':
        raise Exception(f"❌ MC358: final_status should be 'completed', got {row['final_status']}")
    
    print("✅ MC358 validation PASSED")


def validate_mc458(row: Dict[str, Any]):
    """
    MC458 validation:
    - prereq_list contains MC202, MC358, MS328
    - final_status = "eligible_and_offered"
    - is_offered = 1
    """
    print("🔍 Validating MC458...")
    
    prereq_list = row['prereq_list'] or []
    required_prereqs = {'MC202', 'MC358', 'MS328'}
    actual_prereqs = set(prereq_list)
    
    if not required_prereqs.issubset(actual_prereqs):
        raise Exception(
            f"❌ MC458: prereq_list should contain {required_prereqs}, got {actual_prereqs}"
        )
    
    if row['final_status'] != 'eligible_and_offered':
        raise Exception(
            f"❌ MC458: final_status should be 'eligible_and_offered', got {row['final_status']}"
        )
    
    if row['is_offered'] != 1:
        raise Exception(f"❌ MC458: is_offered should be 1, got {row['is_offered']}")
    
    if row['is_eligible'] != 1:
        raise Exception(f"❌ MC458: is_eligible should be 1, got {row['is_eligible']}")
    
    print("✅ MC458 validation PASSED")


def validate_mc558(row: Dict[str, Any]):
    """
    MC558 validation:
    - prereq_list contains MC458 and MA327
    - final_status = "not_eligible"
    - gde_prereqs_raw = 1
    - is_eligible = 0
    """
    print("🔍 Validating MC558...")
    
    prereq_list = row['prereq_list'] or []
    required_prereqs = {'MC458', 'MA327'}
    actual_prereqs = set(prereq_list)
    
    if not required_prereqs.issubset(actual_prereqs):
        raise Exception(
            f"❌ MC558: prereq_list should contain {required_prereqs}, got {actual_prereqs}"
        )
    
    if row['final_status'] != 'not_eligible':
        raise Exception(
            f"❌ MC558: final_status should be 'not_eligible', got {row['final_status']}"
        )
    
    if row['gde_prereqs_raw'] != 1:
        raise Exception(
            f"❌ MC558: gde_prereqs_raw should be 1 (missing), got {row['gde_prereqs_raw']}"
        )
    
    if row['is_eligible'] != 0:
        raise Exception(f"❌ MC558: is_eligible should be 0, got {row['is_eligible']}")
    
    if row['prereq_status'] != 'missing':
        raise Exception(
            f"❌ MC558: prereq_status should be 'missing', got {row['prereq_status']}"
        )
    
    print("✅ MC558 validation PASSED")


def main():
    if not USER_AUTH_DB.exists():
        print(f"❌ Missing user_auth.db at {USER_AUTH_DB}")
        sys.exit(1)
    
    conn = sqlite3.connect(str(USER_AUTH_DB))
    
    # Get user_id
    try:
        user_id = conn.execute(
            "SELECT DISTINCT user_id FROM user_curriculum_snapshot LIMIT 1"
        ).fetchone()[0]
    except Exception as e:
        print(f"❌ Error: {e}")
        print("   Run Phase 3 first to populate user_curriculum_snapshot")
        conn.close()
        sys.exit(1)
    
    print(f"📋 Validating Phase 3 snapshot for user_id={user_id}\n")
    
    try:
        # Validate MC358
        mc358 = fetch_snapshot_row(conn, user_id, "MC358")
        validate_mc358(mc358)
        
        # Validate MC458
        mc458 = fetch_snapshot_row(conn, user_id, "MC458")
        validate_mc458(mc458)
        
        # Validate MC558
        mc558 = fetch_snapshot_row(conn, user_id, "MC558")
        validate_mc558(mc558)
        
        print("\n" + "="*50)
        print("✅ ALL VALIDATIONS PASSED")
        print("="*50)
        
    except Exception as e:
        print(f"\n❌ VALIDATION FAILED: {e}")
        conn.close()
        sys.exit(1)
    
    finally:
        conn.close()


if __name__ == "__main__":
    main()
