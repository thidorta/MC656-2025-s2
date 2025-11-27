"""add planner courses table

Revision ID: 0003
Revises: 0002
Create Date: 2025-11-27
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "planner_courses",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("course_code", sa.String, nullable=False),
        sa.Column("turma", sa.String, nullable=True),
        sa.Column("updated_at", sa.DateTime, server_default=sa.func.current_timestamp()),
        sa.UniqueConstraint("user_id", "course_code", name="uq_planner_user_course"),
    )


def downgrade():
    op.drop_table("planner_courses")
