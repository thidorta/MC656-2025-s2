"""
CLI tool to reset user data.

Usage:
    python backend/reset_user.py --user-id=183611
    python backend/reset_user.py --all  # DANGER: resets all users
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

# Add backend to path for imports
BACKEND_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BACKEND_DIR))

from app.db.session import get_engine
from app.db.reset_utils import reset_user_data, reset_all_users_data
from sqlalchemy.orm import Session


def main():
    parser = argparse.ArgumentParser(description="Reset user curriculum data")
    parser.add_argument(
        "--user-id",
        type=int,
        help="User ID to reset (e.g., 183611)",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Reset ALL users (DANGEROUS)",
    )
    
    args = parser.parse_args()
    
    if not args.user_id and not args.all:
        parser.error("Must specify --user-id or --all")
        return
    
    if args.user_id and args.all:
        parser.error("Cannot specify both --user-id and --all")
        return
    
    # Create session
    engine = get_engine()
    db = Session(bind=engine)
    
    try:
        if args.all:
            confirm = input("⚠️  Reset ALL user data? Type 'yes' to confirm: ")
            if confirm.lower() != "yes":
                print("❌ Aborted")
                return
            
            result = reset_all_users_data(db)
            print("\n✅ Reset complete:")
            print(f"   Total deleted: {result['total_deleted']} rows")
            for table, count in result['tables'].items():
                if count > 0:
                    print(f"   - {table}: {count} rows")
        
        else:
            result = reset_user_data(db, args.user_id)
            print("\n✅ Reset complete:")
            print(f"   User ID: {result['user_id']}")
            print(f"   Total deleted: {result['total_deleted']} rows")
            for table, count in result['tables'].items():
                if count > 0:
                    print(f"   - {table}: {count} rows")
    
    except Exception as e:
        print(f"\n❌ Error: {e}")
        db.rollback()
        sys.exit(1)
    
    finally:
        db.close()
        engine.dispose()
    
    print("\n✅ Database reset successful")


if __name__ == "__main__":
    main()
