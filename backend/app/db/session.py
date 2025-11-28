"""
Database session management for SQLAlchemy.
"""
from __future__ import annotations

from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from app.config.settings import get_settings


def get_engine():
    """Get SQLAlchemy engine for user_auth.db"""
    settings = get_settings()
    db_url = f"sqlite:///{settings.user_auth_db_path}"
    return create_engine(
        db_url,
        connect_args={"check_same_thread": False},
        echo=False,
    )


# Create session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=get_engine(),
)


def get_db() -> Generator[Session, None, None]:
    """
    Dependency to get SQLAlchemy database session.
    
    Usage:
        @router.get("/")
        def endpoint(db: Session = Depends(get_db)):
            ...
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
