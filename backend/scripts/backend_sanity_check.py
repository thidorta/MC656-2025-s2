"""
backend_sanity_check.py - Comprehensive backend validation
"""
import sqlite3
import sys
from pathlib import Path

# Add backend to sys.path for imports
backend_root = Path(__file__).resolve().parent.parent
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))


def check_db_integrity():
    """Verify database schema and integrity."""
    backend_dir = Path(__file__).resolve().parent.parent
    db_path = backend_dir / "data" / "user_auth.db"
    
    if not db_path.exists():
        print("❌ user_auth.db not found")
        return False
    
    conn = sqlite3.connect(str(db_path))
    
    # Check required tables exist
    required_tables = [
        "users",
        "user_curriculum_raw",
        "user_curriculum_normalized",
        "user_curriculum_tree",
        "user_curriculum_snapshot"
    ]
    
    cur = conn.execute("SELECT name FROM sqlite_master WHERE type='table'")
    existing_tables = {row[0] for row in cur.fetchall()}
    
    missing = set(required_tables) - existing_tables
    if missing:
        print(f"❌ Missing tables: {missing}")
        conn.close()
        return False
    
    print("✅ DB integrity: all required tables exist")
    conn.close()
    return True


def check_import_health():
    """Check for import errors in main modules."""
    try:
        import main
        print("✅ main.py imports successfully")
    except Exception as e:
        print(f"❌ main.py import error: {e}")
        return False
    
    try:
        from app.services.curriculum.updater import CurriculumUpdater
        print("✅ CurriculumUpdater imports successfully")
    except Exception as e:
        print(f"❌ CurriculumUpdater import error: {e}")
        return False
    
    return True


def check_pipeline():
    """Verify pipeline can run."""
    try:
        from app.config.settings import get_settings
        settings = get_settings()
        
        if not settings.catalog_db_path.exists():
            print("❌ catalog.db not found")
            return False
        
        if not settings.user_auth_db_path.exists():
            print("❌ user_auth.db not found")
            return False
        
        print("✅ Pipeline: all DBs accessible")
        return True
    except Exception as e:
        print(f"❌ Pipeline check error: {e}")
        return False


def check_routers():
    """Verify all routers are properly configured."""
    try:
        from app.api.routes import router
        print(f"✅ Routers: main router configured with {len(router.routes)} routes")
        return True
    except Exception as e:
        print(f"❌ Router check error: {e}")
        return False


def main():
    print("="*60)
    print("Backend Sanity Check")
    print("="*60 + "\n")
    
    checks = [
        ("DB Integrity", check_db_integrity),
        ("Import Health", check_import_health),
        ("Pipeline", check_pipeline),
        ("Routers", check_routers),
    ]
    
    results = []
    for name, check_fn in checks:
        print(f"\n{name}:")
        try:
            result = check_fn()
            results.append(result)
        except Exception as e:
            print(f"❌ {name} failed with exception: {e}")
            results.append(False)
    
    print("\n" + "="*60)
    passed = sum(results)
    total = len(results)
    print(f"Results: {passed}/{total} checks passed")
    print("="*60)
    
    sys.exit(0 if all(results) else 1)


if __name__ == "__main__":
    # Change to backend directory
    backend_dir = Path(__file__).resolve().parent.parent
    import os
    os.chdir(str(backend_dir))
    
    main()
