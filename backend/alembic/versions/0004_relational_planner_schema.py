"""add relational planner schema

Revision ID: 0004
Revises: 0003
Create Date: 2025-11-27
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade():
    """
    Create new relational planner tables to replace JSON blob storage.
    These tables support full reconstruction of /planner, /user-db/me, and /attendance
    responses without persisting mutable JSON payloads.
    """
    
    # Drop old attendance_overrides table (from migration 0001) to replace with relational version
    op.drop_table("attendance_overrides")
    
    # 1. gde_snapshots - Immutable GDE state captures
    op.create_table(
        "gde_snapshots",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("planner_id", sa.String, nullable=False),
        
        # Snapshot metadata
        sa.Column("fetched_at", sa.String, nullable=False),  # ISO 8601
        sa.Column("raw_user_name", sa.String, nullable=True),
        sa.Column("raw_ra", sa.String, nullable=True),
        sa.Column("raw_course_id", sa.String, nullable=True),
        sa.Column("raw_course_name", sa.String, nullable=True),
        sa.Column("catalog_year", sa.Integer, nullable=True),
        sa.Column("current_period", sa.String, nullable=True),
        sa.Column("cp_value", sa.Float, nullable=True),
        
        # Display-only metadata (JSON)
        sa.Column("integralizacao_metadata", sa.Text, nullable=True),
        sa.Column("planejado_metadata", sa.Text, nullable=True),
        sa.Column("faltantes_metadata", sa.Text, nullable=True),
        
        sa.Column("created_at", sa.String, nullable=False),
    )
    
    # Index for latest snapshot queries
    op.create_index(
        "idx_gde_snapshots_user_fetched",
        "gde_snapshots",
        ["user_id", sa.text("fetched_at DESC")],
    )
    op.create_index("idx_gde_snapshots_planner", "gde_snapshots", ["planner_id"])
    
    # 2. curriculum_disciplines - Courses from user's curriculum
    op.create_table(
        "curriculum_disciplines",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("snapshot_id", sa.Integer, sa.ForeignKey("gde_snapshots.id", ondelete="CASCADE"), nullable=False),
        
        # Course identification
        sa.Column("disciplina_id", sa.String, nullable=True),
        sa.Column("codigo", sa.String, nullable=False),
        sa.Column("nome", sa.String, nullable=False),
        sa.Column("creditos", sa.Integer, nullable=False),
        sa.Column("catalog_year", sa.Integer, nullable=True),
        
        # Curriculum metadata
        sa.Column("tipo", sa.String, nullable=False),  # "OB", "EL", etc.
        sa.Column("semestre_sugerido", sa.Integer, nullable=True),
        sa.Column("cp_group", sa.String, nullable=True),
        
        # Completion status
        sa.Column("has_completed", sa.Integer, nullable=False, server_default="0"),
        sa.Column("can_enroll", sa.Integer, nullable=False, server_default="0"),
        
        # UI hints
        sa.Column("obs", sa.String, nullable=True),
        sa.Column("color", sa.String, nullable=True),
        
        sa.Column("created_at", sa.String, nullable=False),
    )
    
    op.create_index("idx_curriculum_disciplines_user_snapshot", "curriculum_disciplines", ["user_id", "snapshot_id"])
    op.create_index("idx_curriculum_disciplines_user_codigo", "curriculum_disciplines", ["user_id", "codigo"])
    op.create_index("idx_curriculum_disciplines_snapshot", "curriculum_disciplines", ["snapshot_id"])
    
    # 3. discipline_prerequisites - Prerequisite relationships
    op.create_table(
        "discipline_prerequisites",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("curriculum_discipline_id", sa.Integer, sa.ForeignKey("curriculum_disciplines.id", ondelete="CASCADE"), nullable=False),
        sa.Column("required_codigo", sa.String, nullable=False),
        sa.Column("alternative_group", sa.Integer, nullable=False),
    )
    
    op.create_index("idx_discipline_prerequisites_discipline", "discipline_prerequisites", ["curriculum_discipline_id"])
    op.create_index("idx_discipline_prerequisites_required", "discipline_prerequisites", ["required_codigo"])
    
    # 4. course_offers - Available class sections (turmas)
    op.create_table(
        "course_offers",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("curriculum_discipline_id", sa.Integer, sa.ForeignKey("curriculum_disciplines.id", ondelete="SET NULL"), nullable=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("snapshot_id", sa.Integer, sa.ForeignKey("gde_snapshots.id", ondelete="SET NULL"), nullable=True),
        
        # Offer identification
        sa.Column("codigo", sa.String, nullable=False),
        sa.Column("turma", sa.String, nullable=False),
        sa.Column("offer_external_id", sa.String, nullable=True),
        
        # Temporal context
        sa.Column("semester", sa.String, nullable=True),
        sa.Column("source", sa.String, nullable=False),  # "catalog" | "gde_snapshot"
        
        # Display metadata (JSON)
        sa.Column("metadata", sa.Text, nullable=True),
        
        sa.Column("created_at", sa.String, nullable=False),
    )
    
    op.create_index("idx_course_offers_user_codigo", "course_offers", ["user_id", "codigo"])
    op.create_index("idx_course_offers_discipline", "course_offers", ["curriculum_discipline_id"])
    op.create_index("idx_course_offers_snapshot", "course_offers", ["snapshot_id"])
    op.create_index("idx_course_offers_codigo_turma", "course_offers", ["codigo", "turma"])
    
    # 5. offer_schedule_events - Class meeting times/locations
    op.create_table(
        "offer_schedule_events",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("offer_id", sa.Integer, sa.ForeignKey("course_offers.id", ondelete="CASCADE"), nullable=False),
        
        # Temporal data
        sa.Column("start_datetime", sa.String, nullable=False),  # ISO 8601
        sa.Column("end_datetime", sa.String, nullable=False),
        sa.Column("day_of_week", sa.Integer, nullable=False),  # 0=Monday, 6=Sunday
        
        # Cached time components
        sa.Column("start_hour", sa.Integer, nullable=False),
        sa.Column("end_hour", sa.Integer, nullable=False),
        
        # Location and metadata
        sa.Column("location", sa.String, nullable=True),
        sa.Column("title", sa.String, nullable=True),
        sa.Column("is_biweekly", sa.Integer, nullable=False, server_default="0"),
    )
    
    op.create_index("idx_offer_schedule_events_offer", "offer_schedule_events", ["offer_id"])
    op.create_index("idx_offer_schedule_events_day_hour", "offer_schedule_events", ["day_of_week", "start_hour"])
    
    # 6. planned_courses - User's current mutable plan
    op.create_table(
        "planned_courses",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        
        # Course selection
        sa.Column("codigo", sa.String, nullable=False),
        sa.Column("turma", sa.String, nullable=True),
        
        # Metadata
        sa.Column("added_by_user", sa.Integer, nullable=False),  # Boolean: 1=user choice, 0=GDE default
        sa.Column("semester_planned", sa.String, nullable=True),
        sa.Column("source", sa.String, nullable=False),  # "GDE" | "USER"
        
        # Timestamps
        sa.Column("created_at", sa.String, nullable=False),
        sa.Column("updated_at", sa.String, nullable=False),
        
        sa.UniqueConstraint("user_id", "codigo", name="uq_planned_courses_user_codigo"),
    )
    
    op.create_index("idx_planned_courses_user", "planned_courses", ["user_id"])
    op.create_index("idx_planned_courses_user_codigo", "planned_courses", ["user_id", "codigo"])
    
    # 7. attendance_overrides - User's manual attendance tracking
    op.create_table(
        "attendance_overrides",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        
        # Course identification
        sa.Column("codigo", sa.String, nullable=False),
        
        # Attendance metrics
        sa.Column("presencas", sa.Integer, nullable=False, server_default="0"),
        sa.Column("total_aulas", sa.Integer, nullable=False, server_default="0"),
        
        # Optional extended fields
        sa.Column("notas", sa.Float, nullable=True),
        sa.Column("faltas_justificadas", sa.Integer, nullable=True),
        
        sa.Column("updated_at", sa.String, nullable=False),
        
        sa.UniqueConstraint("user_id", "codigo", name="uq_attendance_overrides_user_codigo"),
    )
    
    op.create_index("idx_attendance_overrides_user", "attendance_overrides", ["user_id"])
    op.create_index("idx_attendance_overrides_user_codigo", "attendance_overrides", ["user_id", "codigo"])


def downgrade():
    """
    Drop all relational planner tables in reverse dependency order.
    Then recreate the old attendance_overrides table from migration 0001.
    """
    # Drop indices first, then tables (leaf to root)
    
    # 7. attendance_overrides
    op.drop_index("idx_attendance_overrides_user_codigo")
    op.drop_index("idx_attendance_overrides_user")
    op.drop_table("attendance_overrides")
    
    # 6. planned_courses
    op.drop_index("idx_planned_courses_user_codigo")
    op.drop_index("idx_planned_courses_user")
    op.drop_table("planned_courses")
    
    # 5. offer_schedule_events
    op.drop_index("idx_offer_schedule_events_day_hour")
    op.drop_index("idx_offer_schedule_events_offer")
    op.drop_table("offer_schedule_events")
    
    # 4. course_offers
    op.drop_index("idx_course_offers_codigo_turma")
    op.drop_index("idx_course_offers_snapshot")
    op.drop_index("idx_course_offers_discipline")
    op.drop_index("idx_course_offers_user_codigo")
    op.drop_table("course_offers")
    
    # 3. discipline_prerequisites
    op.drop_index("idx_discipline_prerequisites_required")
    op.drop_index("idx_discipline_prerequisites_discipline")
    op.drop_table("discipline_prerequisites")
    
    # 2. curriculum_disciplines
    op.drop_index("idx_curriculum_disciplines_snapshot")
    op.drop_index("idx_curriculum_disciplines_user_codigo")
    op.drop_index("idx_curriculum_disciplines_user_snapshot")
    op.drop_table("curriculum_disciplines")
    
    # 1. gde_snapshots
    op.drop_index("idx_gde_snapshots_planner")
    op.drop_index("idx_gde_snapshots_user_fetched")
    op.drop_table("gde_snapshots")
    
    # Recreate old attendance_overrides table (from migration 0001)
    op.create_table(
        "attendance_overrides",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("course_code", sa.String, nullable=False),
        sa.Column("overrides_json", sa.Text, nullable=False),
        sa.Column("updated_at", sa.DateTime, server_default=sa.func.current_timestamp()),
        sa.UniqueConstraint("user_id", "course_code", name="uq_attendance_user_course"),
    )
