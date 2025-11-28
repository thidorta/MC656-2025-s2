"""
Quick verification script to check if planned courses fix is working.

This script verifies:
1. Database is clean (no planned courses)
2. All snapshots have empty planejado_metadata
3. User 1000 is clean
"""

import sqlite3
import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from app.config.settings import get_settings

def verify_fix():
    """Verify that the planned courses fix is working correctly."""
    settings = get_settings()
    db_path = settings.user_auth_db_path
    
    print("=" * 60)
    print("Planned Courses Fix - Verification")
    print("=" * 60)
    print()
    
    if not db_path.exists():
        print(f"❌ Database not found: {db_path}")
        return False
    
    print(f"📊 Database: {db_path}")
    print()
    
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    
    all_good = True
    
    try:
        # 1. Check planned_courses table
        cursor.execute("SELECT COUNT(*) FROM planned_courses")
        total_planned = cursor.fetchone()[0]
        
        if total_planned == 0:
            print("✅ planned_courses table is empty")
        else:
            print(f"❌ planned_courses table has {total_planned} entries (should be 0)")
            all_good = False
        
        # 2. Check user 1000 specifically
        cursor.execute("SELECT COUNT(*) FROM planned_courses WHERE user_id = 1000")
        user_1000_planned = cursor.fetchone()[0]
        
        if user_1000_planned == 0:
            print("✅ User 1000 has 0 planned courses")
        else:
            print(f"❌ User 1000 has {user_1000_planned} planned courses (should be 0)")
            all_good = False
        
        # 3. Check planejado_metadata
        cursor.execute("""
            SELECT COUNT(*) FROM gde_snapshots 
            WHERE planejado_metadata IS NOT NULL 
            AND planejado_metadata != '{}' 
            AND planejado_metadata != ''
        """)
        snapshots_with_planned = cursor.fetchone()[0]
        
        if snapshots_with_planned == 0:
            print("✅ All snapshots have empty planejado_metadata")
        else:
            print(f"❌ {snapshots_with_planned} snapshots have non-empty planejado_metadata")
            all_good = False
        
        # 4. Check total snapshots
        cursor.execute("SELECT COUNT(*) FROM gde_snapshots")
        total_snapshots = cursor.fetchone()[0]
        print(f"📊 Total snapshots in database: {total_snapshots}")
        
        # 5. Check total users
        cursor.execute("SELECT COUNT(*) FROM users")
        total_users = cursor.fetchone()[0]
        print(f"📊 Total users in database: {total_users}")
        
        print()
        
        if all_good:
            print("✅ ALL CHECKS PASSED!")
            print()
            print("The planned courses fix is working correctly:")
            print("  - No planned courses in database")
            print("  - User 1000 is clean")
            print("  - All snapshots have empty planejado_metadata")
            print()
            print("Next steps:")
            print("  1. Start the backend: uvicorn main:app --reload")
            print("  2. Login as user 1000 (RA: 183611)")
            print("  3. Verify GET /user-db/me returns planejado: {}")
            print("  4. Verify GET /planner returns planned_courses: {}")
            return True
        else:
            print("❌ SOME CHECKS FAILED!")
            print()
            print("Run cleanup script to fix:")
            print("  python cleanup_planned_courses.py")
            return False
        
    except Exception as e:
        print(f"❌ Error during verification: {e}")
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    success = verify_fix()
    sys.exit(0 if success else 1)
