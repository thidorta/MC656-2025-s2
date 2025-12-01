"""
SQLAlchemy ORM models for the relational planner system.

These models map to the tables created in migration 0004_relational_planner_schema.
They replace the previous JSON blob storage with normalized relational entities.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import Column, Integer, String, Text, Float, ForeignKey, UniqueConstraint, Table
from sqlalchemy.orm import relationship, declarative_base

# Base declarative class (shared across the app)
# If you have an existing Base, import it instead
Base = declarative_base()

# Minimal 'users' table in metadata to satisfy FK resolution during ORM flushes.
# The actual table is created by Alembic migration 0001 and managed outside ORM.
# We declare only the primary key and common columns; this avoids NoReferencedTableError.
users_table = Table(
    "users",
    Base.metadata,
    Column("id", Integer, primary_key=True),
    Column("username", String, nullable=True),
    Column("password_hash", String, nullable=True),
    Column("planner_id", String, nullable=True),
    extend_existing=True,
)


def _utcnow_iso() -> str:
    """Returns current UTC time in ISO 8601 format."""
    return datetime.now(timezone.utc).isoformat()


class GdeSnapshotModel(Base):
    """
    Immutable snapshot of GDE academic state captured during login.
    
    Each login creates a new snapshot. The latest snapshot (by fetched_at)
    represents the current GDE state for a user.
    """
    __tablename__ = "gde_snapshots"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    planner_id = Column(String, nullable=False)
    
    # Snapshot metadata
    fetched_at = Column(String, nullable=False)  # ISO 8601
    raw_user_name = Column(String, nullable=True)
    raw_ra = Column(String, nullable=True)
    raw_course_id = Column(String, nullable=True)
    raw_course_name = Column(String, nullable=True)
    catalog_year = Column(Integer, nullable=True)
    current_period = Column(String, nullable=True)
    cp_value = Column(Float, nullable=True)
    
    # Display-only metadata (JSON strings)
    integralizacao_metadata = Column(Text, nullable=True)
    planejado_metadata = Column(Text, nullable=True)  # DEPRECATED: Not used for planning logic, kept for reference only
    faltantes_metadata = Column(Text, nullable=True)
    
    created_at = Column(String, nullable=False, default=_utcnow_iso)
    
    # Relationships
    curriculum_disciplines = relationship(
        "CurriculumDisciplineModel",
        back_populates="snapshot",
        cascade="all, delete-orphan",
    )
    course_offers = relationship(
        "CourseOfferModel",
        back_populates="snapshot",
        foreign_keys="CourseOfferModel.snapshot_id",
    )
    
    def to_user_db_dict(self) -> Dict[str, Any]:
        """Convert snapshot to user_db API format (partial)."""
        import json
        return {
            "planner_id": self.planner_id,
            "user": {
                "name": self.raw_user_name,
                "ra": self.raw_ra,
            },
            "course": {
                "id": self.raw_course_id,
                "name": self.raw_course_name,
            } if self.raw_course_id else {},
            "year": self.catalog_year,
            "current_period": self.current_period,
            "cp": self.cp_value,
            "parameters": {
                "catalogo": str(self.catalog_year) if self.catalog_year else "",
                "periodo": self.current_period or "",
                "cp": "0",
            },
            "planejado": {},  # DEPRECATED: Always return empty dict. Planning comes from planned_courses table only.
            "integralizacao_meta": json.loads(self.integralizacao_metadata) if self.integralizacao_metadata else {},
            "faltantes": json.loads(self.faltantes_metadata) if self.faltantes_metadata else {},
        }


class CurriculumDisciplineModel(Base):
    """
    A discipline from the user's curriculum as reported by GDE snapshot.
    
    Tied to a specific snapshot - curriculum can change across snapshots.
    """
    __tablename__ = "curriculum_disciplines"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    snapshot_id = Column(Integer, ForeignKey("gde_snapshots.id", ondelete="CASCADE"), nullable=False)
    
    # Course identification
    disciplina_id = Column(String, nullable=True)
    codigo = Column(String, nullable=False)
    nome = Column(String, nullable=False)
    creditos = Column(Integer, nullable=False)
    catalog_year = Column(Integer, nullable=True)
    
    # Curriculum metadata
    tipo = Column(String, nullable=False)  # "OB", "EL", etc.
    semestre_sugerido = Column(Integer, nullable=True)
    cp_group = Column(String, nullable=True)
    
    # Completion status (boolean as integer: 0/1)
    has_completed = Column(Integer, nullable=False, default=0)
    can_enroll = Column(Integer, nullable=False, default=0)
    
    # UI hints
    obs = Column(String, nullable=True)
    color = Column(String, nullable=True)
    
    created_at = Column(String, nullable=False, default=_utcnow_iso)
    
    # Relationships
    snapshot = relationship("GdeSnapshotModel", back_populates="curriculum_disciplines")
    prerequisites = relationship(
        "DisciplinePrerequisiteModel",
        back_populates="discipline",
        cascade="all, delete-orphan",
    )
    offers = relationship(
        "CourseOfferModel",
        back_populates="curriculum_discipline",
        foreign_keys="CourseOfferModel.curriculum_discipline_id",
    )
    
    def to_curriculum_dict(self, prereqs: Optional[List[List[str]]] = None, offers: Optional[List[Dict]] = None) -> Dict[str, Any]:
        """Convert to API curriculum format."""
        return {
            "disciplina_id": self.disciplina_id,
            "codigo": self.codigo,
            "nome": self.nome,
            "creditos": self.creditos,
            "catalogo": self.catalog_year,
            "tipo": self.tipo,
            "semestre": self.semestre_sugerido,
            "cp_group": self.cp_group,
            "missing": not bool(self.has_completed),
            "status": "completed" if self.has_completed else "pending",
            "tem": bool(self.has_completed),
            "pode": bool(self.can_enroll),
            "obs": self.obs,
            "color": self.color,
            "metadata": {},
            "prereqs": prereqs or [],
            "offers": offers or [],
        }


class DisciplinePrerequisiteModel(Base):
    """
    Prerequisite relationship between curriculum disciplines.
    
    alternative_group enables OR logic: same group = any one satisfies.
    """
    __tablename__ = "discipline_prerequisites"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    curriculum_discipline_id = Column(Integer, ForeignKey("curriculum_disciplines.id", ondelete="CASCADE"), nullable=False)
    required_codigo = Column(String, nullable=False)
    alternative_group = Column(Integer, nullable=False)
    
    # Relationships
    discipline = relationship("CurriculumDisciplineModel", back_populates="prerequisites")


class CourseOfferModel(Base):
    """
    Available class section (turma) for a course.
    
    Can come from catalog or GDE snapshot.
    """
    __tablename__ = "course_offers"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    curriculum_discipline_id = Column(Integer, ForeignKey("curriculum_disciplines.id", ondelete="SET NULL"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    snapshot_id = Column(Integer, ForeignKey("gde_snapshots.id", ondelete="SET NULL"), nullable=True)
    
    # Offer identification
    codigo = Column(String, nullable=False)
    turma = Column(String, nullable=False)
    offer_external_id = Column(String, nullable=True)
    
    # Temporal context
    semester = Column(String, nullable=True)
    source = Column(String, nullable=False)  # "catalog" | "gde_snapshot"
    
    # Display metadata (JSON) - renamed from 'metadata' to avoid SQLAlchemy conflict
    offer_metadata = Column(Text, nullable=True)
    
    created_at = Column(String, nullable=False, default=_utcnow_iso)
    
    # Relationships
    curriculum_discipline = relationship("CurriculumDisciplineModel", back_populates="offers")
    snapshot = relationship("GdeSnapshotModel", back_populates="course_offers")
    events = relationship(
        "OfferScheduleEventModel",
        back_populates="offer",
        cascade="all, delete-orphan",
    )
    
    def to_offer_dict(self, adicionado: bool = False, events: Optional[List[Dict]] = None) -> Dict[str, Any]:
        """Convert to API offer format."""
        import json
        metadata = json.loads(self.offer_metadata) if self.offer_metadata else {}
        return {
            "id": self.offer_external_id,
            "turma": self.turma,
            "adicionado": adicionado,
            **metadata,
            "events": events or [],
        }


class OfferScheduleEventModel(Base):
    """
    Individual class meeting time/location for a course offer.
    """
    __tablename__ = "offer_schedule_events"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    offer_id = Column(Integer, ForeignKey("course_offers.id", ondelete="CASCADE"), nullable=False)
    
    # Temporal data
    start_datetime = Column(String, nullable=False)  # ISO 8601
    end_datetime = Column(String, nullable=False)
    day_of_week = Column(Integer, nullable=False)  # 0=Monday, 6=Sunday
    
    # Cached time components
    start_hour = Column(Integer, nullable=False)
    end_hour = Column(Integer, nullable=False)
    
    # Location and metadata
    location = Column(String, nullable=True)
    title = Column(String, nullable=True)
    is_biweekly = Column(Integer, nullable=False, default=0)
    
    # Relationships
    offer = relationship("CourseOfferModel", back_populates="events")
    
    def to_event_dict(self) -> Dict[str, Any]:
        """Convert to API event format."""
        return {
            "title": self.title,
            "start": self.start_datetime,
            "end": self.end_datetime,
            "day": self.day_of_week,
            "start_hour": self.start_hour,
            "end_hour": self.end_hour,
        }


class PlannedCourseModel(Base):
    """
    User's current mutable plan for which courses to take.
    
    This is the heart of the planner state - survives across snapshots.
    """
    __tablename__ = "planned_courses"
    __table_args__ = (
        UniqueConstraint("user_id", "codigo", name="uq_planned_courses_user_codigo"),
    )
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Course selection
    codigo = Column(String, nullable=False)
    turma = Column(String, nullable=True)
    
    # Metadata
    added_by_user = Column(Integer, nullable=False)  # Boolean: 1=user choice, 0=GDE default
    semester_planned = Column(String, nullable=True)
    source = Column(String, nullable=False)  # "GDE" | "USER"
    
    # Timestamps
    created_at = Column(String, nullable=False, default=_utcnow_iso)
    updated_at = Column(String, nullable=False, default=_utcnow_iso, onupdate=_utcnow_iso)
    
    def to_planned_entry(self) -> Dict[str, str]:
        """Convert to planned_courses map entry."""
        return {self.codigo: self.turma or ""}
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to full dict representation."""
        return {
            "codigo": self.codigo,
            "turma": self.turma,
            "added_by_user": bool(self.added_by_user),
            "semester_planned": self.semester_planned,
            "source": self.source,
        }


class AttendanceOverrideModel(Base):
    """
    User's manual attendance tracking per course.
    
    Independent of planner state - users can track any course.
    """
    __tablename__ = "attendance_overrides"
    __table_args__ = (
        UniqueConstraint("user_id", "codigo", name="uq_attendance_overrides_user_codigo"),
    )
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Course identification
    codigo = Column(String, nullable=False)
    
    # Attendance metrics
    presencas = Column(Integer, nullable=False, default=0)
    total_aulas = Column(Integer, nullable=False, default=0)
    
    # Optional extended fields
    notas = Column(Float, nullable=True)
    faltas_justificadas = Column(Integer, nullable=True)
    
    updated_at = Column(String, nullable=False, default=_utcnow_iso, onupdate=_utcnow_iso)
    
    def to_override_dict(self) -> Dict[str, Any]:
        """Convert to attendance override format."""
        result = {
            "presencas": self.presencas,
            "total_aulas": self.total_aulas,
        }
        if self.notas is not None:
            result["notas"] = self.notas
        if self.faltas_justificadas is not None:
            result["faltas_justificadas"] = self.faltas_justificadas
        return result


class UserOAuthTokenModel(Base):
    """Persisted OAuth tokens for third-party integrations (e.g., Google)."""

    __tablename__ = "user_oauth_tokens"
    __table_args__ = (
        UniqueConstraint("user_id", "provider", name="uq_user_oauth_provider"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    provider = Column(String, nullable=False, default="google")
    access_token = Column(Text, nullable=False)
    refresh_token = Column(Text, nullable=True)
    token_type = Column(String, nullable=True)
    scope = Column(Text, nullable=True)
    account_email = Column(String, nullable=True)
    expires_at = Column(String, nullable=True)
    created_at = Column(String, nullable=False, default=_utcnow_iso)
    updated_at = Column(String, nullable=False, default=_utcnow_iso, onupdate=_utcnow_iso)

    def to_status_dict(self) -> Dict[str, Any]:
        return {
            "provider": self.provider,
            "email": self.account_email,
            "scope": self.scope,
            "expires_at": self.expires_at,
        }
