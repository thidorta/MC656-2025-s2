"""
Database Reset Script

Completely resets user_auth.db and runs all migrations from scratch.
"""

import sqlite3
from pathlib import Path
import subprocess
import sys

BACKEND_DIR = Path(__file__).resolve().parent
USER_AUTH_DB = BACKEND_DIR / "data" / "user_auth.db"

def main():
    # Step 1: Delete existing database
    if USER_AUTH_DB.exists():
        USER_AUTH_DB.unlink()
        print(f"✅ Deleted existing database: {USER_AUTH_DB}")
    else:
        print(f"ℹ️  No existing database found")
    
    # Step 2: Run Alembic migrations
    print(f"\n🔨 Running Alembic migrations...")
    result = subprocess.run(
        ["alembic", "upgrade", "head"],
        cwd=str(BACKEND_DIR),
        capture_output=True,
        text=True
    )
    
    if result.returncode != 0:
        print(f"❌ Alembic migration failed:")
        print(result.stderr)
        sys.exit(1)
    
    print(result.stdout)
    print(f"\n✅ Database reset complete")
    
    # Step 3: Verify tables exist
    conn = sqlite3.connect(str(USER_AUTH_DB))
    cur = conn.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    tables = [row[0] for row in cur.fetchall()]
    conn.close()
    
    print(f"\n📊 Created tables ({len(tables)}):")
    for table in tables:
        print(f"  - {table}")
    
    # Verify required tables
    required = [
        'users',
        'user_sessions',
        'discipline_prerequisites',
        'course_offers',
        'offer_schedule_events',
        'user_curriculum_raw_standardized',
        'user_curriculum_normalized',
        'user_curriculum_tree'
    ]
    
    missing = [t for t in required if t not in tables]
    if missing:
        print(f"\n⚠️  Missing required tables: {', '.join(missing)}")
    else:
        print(f"\n✅ All required tables present")

if __name__ == "__main__":
    main()
