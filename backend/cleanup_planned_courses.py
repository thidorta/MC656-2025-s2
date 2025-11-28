"""
Database cleanup script: Remove all auto-imported planned courses.

This script:
1. Deletes all entries from planned_courses table
2. Clears planejado_metadata from all snapshots
3. Ensures all users start with zero planned courses

Run this script once to fix existing database state.
"""

import sqlite3
import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from app.config.settings import get_settings

def cleanup_database():
    """Clean all planned courses and planejado metadata from database."""
    settings = get_settings()
    db_path = settings.user_auth_db_path
    
    print(f"🧹 Cleaning database: {db_path}")
    
    if not db_path.exists():
        print(f"❌ Database not found: {db_path}")
        return
    
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    
    try:
        # 1. Count planned courses before deletion
        cursor.execute("SELECT COUNT(*) FROM planned_courses")
        count_before = cursor.fetchone()[0]
        print(f"📊 Found {count_before} planned courses in database")
        
        # 2. Delete all planned courses
        cursor.execute("DELETE FROM planned_courses")
        deleted_count = cursor.rowcount
        print(f"🗑️  Deleted {deleted_count} planned courses")
        
        # 3. Count snapshots with planejado_metadata
        cursor.execute("""
            SELECT COUNT(*) FROM gde_snapshots 
            WHERE planejado_metadata IS NOT NULL 
            AND planejado_metadata != '{}' 
            AND planejado_metadata != ''
        """)
        snapshots_with_planned = cursor.fetchone()[0]
        print(f"📊 Found {snapshots_with_planned} snapshots with planejado_metadata")
        
        # 4. Clear planejado_metadata from all snapshots
        cursor.execute("UPDATE gde_snapshots SET planejado_metadata = '{}'")
        updated_count = cursor.rowcount
        print(f"🧼 Cleared planejado_metadata from {updated_count} snapshots")
        
        # 5. Verify cleanup for user 1000 specifically
        cursor.execute("SELECT COUNT(*) FROM planned_courses WHERE user_id = 1000")
        user_1000_planned = cursor.fetchone()[0]
        print(f"✅ User 1000 planned courses after cleanup: {user_1000_planned}")
        
        cursor.execute("""
            SELECT COUNT(*) FROM gde_snapshots 
            WHERE user_id = 1000 
            AND (planejado_metadata IS NULL OR planejado_metadata = '{}' OR planejado_metadata = '')
        """)
        user_1000_clean_snapshots = cursor.fetchone()[0]
        print(f"✅ User 1000 clean snapshots: {user_1000_clean_snapshots}")
        
        # Commit changes
        conn.commit()
        print("\n✅ Database cleanup completed successfully!")
        print("\n📋 Summary:")
        print(f"   - Deleted {deleted_count} planned courses")
        print(f"   - Cleared planejado_metadata from {updated_count} snapshots")
        print(f"   - All users now start with zero planned courses")
        
    except Exception as e:
        conn.rollback()
        print(f"\n❌ Error during cleanup: {e}")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    print("=" * 60)
    print("Database Cleanup Script")
    print("=" * 60)
    print()
    cleanup_database()
