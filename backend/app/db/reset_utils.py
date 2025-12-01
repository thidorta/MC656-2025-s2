"""
Database reset utilities for cleaning user-specific data.

CRITICAL: This module provides functions to safely delete user data
while preserving authentication, migrations, and catalog.
"""
from __future__ import annotations

import logging
from typing import List

from sqlalchemy import text
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


# Tables to DELETE when resetting user data
USER_DATA_TABLES = [
    "user_curriculum_snapshot",      # Phase 3 output
    "user_curriculum_tree",           # Phase 2 output
    "user_curriculum_normalized",     # Phase 1 output
    "user_curriculum_raw_standardized",  # Phase 0.5 output
    "planner_courses",                # Legacy planner
    "attendance_overrides",           # User overrides
    "gde_snapshots",                  # GDE raw snapshots
    "curriculum_disciplines",         # Snapshot disciplines
    "course_offers",                  # Offer data
    "offer_schedule_events",          # Schedule events
]

# Tables to PRESERVE (never delete)
PRESERVE_TABLES = [
    "users",              # Authentication
    "user_sessions",      # Sessions
    "alembic_version",    # Migration tracking
]


def reset_user_data(db: Session, user_id: int) -> dict:
    """
    Delete all user-specific data while preserving auth and metadata.
    
    Args:
        db: SQLAlchemy session
        user_id: User ID to clean
    
    Returns:
        Dict with deletion counts per table
    
    Raises:
        Exception if deletion fails
    """
    logger.info(f"🗑️  Resetting data for user_id={user_id}")
    
    results = {}
    total_deleted = 0
    
    # Foreign keys should be ON (set in migration/connection)
    db.execute(text("PRAGMA foreign_keys = ON"))
    
    for table in USER_DATA_TABLES:
        try:
            # Check if table exists
            check_query = text(
                f"SELECT name FROM sqlite_master WHERE type='table' AND name='{table}'"
            )
            exists = db.execute(check_query).fetchone()
            
            if not exists:
                logger.debug(f"⏭️  Table {table} does not exist, skipping")
                results[table] = 0
                continue
            
            # Count rows before deletion
            count_query = text(f"SELECT COUNT(*) FROM {table} WHERE user_id = :user_id")
            count_before = db.execute(count_query, {"user_id": str(user_id)}).scalar()
            
            if count_before == 0:
                logger.debug(f"⏭️  Table {table} has no rows for user_id={user_id}")
                results[table] = 0
                continue
            
            # Delete rows
            delete_query = text(f"DELETE FROM {table} WHERE user_id = :user_id")
            db.execute(delete_query, {"user_id": str(user_id)})
            
            # Verify deletion
            count_after = db.execute(count_query, {"user_id": str(user_id)}).scalar()
            deleted = count_before - count_after
            
            logger.info(f"✅ Deleted {deleted} rows from {table}")
            results[table] = deleted
            total_deleted += deleted
            
        except Exception as e:
            logger.error(f"❌ Error deleting from {table}: {e}")
            db.rollback()
            raise
    
    # Commit all deletions
    db.commit()
    
    logger.info(f"✅ Reset complete: {total_deleted} total rows deleted")
    
    return {
        "user_id": user_id,
        "total_deleted": total_deleted,
        "tables": results,
    }


def reset_all_users_data(db: Session) -> dict:
    """
    Delete ALL user data from ALL users (dangerous!).
    
    Use with extreme caution - this clears all user curriculum data
    while preserving user accounts and authentication.
    """
    logger.warning("⚠️  Resetting ALL user data (all users)")
    
    results = {}
    total_deleted = 0
    
    db.execute(text("PRAGMA foreign_keys = ON"))
    
    for table in USER_DATA_TABLES:
        try:
            check_query = text(
                f"SELECT name FROM sqlite_master WHERE type='table' AND name='{table}'"
            )
            exists = db.execute(check_query).fetchone()
            
            if not exists:
                results[table] = 0
                continue
            
            count_query = text(f"SELECT COUNT(*) FROM {table}")
            count_before = db.execute(count_query).scalar()
            
            if count_before == 0:
                results[table] = 0
                continue
            
            delete_query = text(f"DELETE FROM {table}")
            db.execute(delete_query)
            
            count_after = db.execute(count_query).scalar()
            deleted = count_before - count_after
            
            logger.info(f"✅ Deleted {deleted} rows from {table}")
            results[table] = deleted
            total_deleted += deleted
            
        except Exception as e:
            logger.error(f"❌ Error deleting from {table}: {e}")
            db.rollback()
            raise
    
    db.commit()
    
    logger.info(f"✅ Reset complete: {total_deleted} total rows deleted")
    
    return {
        "total_deleted": total_deleted,
        "tables": results,
    }
