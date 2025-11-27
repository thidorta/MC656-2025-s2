"""create users and attendance_overrides tables

Revision ID: 0001
Revises:
Create Date: 2025-01-10
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "users",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("username", sa.String, nullable=False, unique=True),
        sa.Column("password_hash", sa.String, nullable=False),
        sa.Column("planner_id", sa.String, nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.current_timestamp()),
    )
    op.create_table(
        "attendance_overrides",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("course_code", sa.String, nullable=False),
        sa.Column("overrides_json", sa.Text, nullable=False),
        sa.Column("updated_at", sa.DateTime, server_default=sa.func.current_timestamp()),
        sa.UniqueConstraint("user_id", "course_code", name="uq_attendance_user_course"),
    )


def downgrade():
    op.drop_table("attendance_overrides")
    op.drop_table("users")
