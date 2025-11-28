"""
Alembic migration: Drop legacy planner JSON structures.

- Drops legacy table: planner_courses
- Drops legacy JSON columns: users.user_db_json, attendance_overrides.overrides_json

SQLite-safe using batch_alter_table.
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "0006_drop_legacy_json_structures"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade():
    # Drop legacy planner_courses table (if exists)
    try:
        op.drop_table("planner_courses")
    except Exception:
        # Table may already be dropped
        pass

    # Drop users.user_db_json (if exists)
    try:
        with op.batch_alter_table("users") as batch_op:
            batch_op.drop_column("user_db_json")
    except Exception:
        pass

    # Drop attendance_overrides.overrides_json (if exists)
    try:
        with op.batch_alter_table("attendance_overrides") as batch_op:
            batch_op.drop_column("overrides_json")
    except Exception:
        pass


def downgrade():
    # Recreate planner_courses table
    op.create_table(
        "planner_courses",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.Integer, nullable=False),
        sa.Column("course_code", sa.Text, nullable=False),
        sa.Column("turma", sa.Text, nullable=True),
        sa.Column("updated_at", sa.Text, nullable=True),
        sa.UniqueConstraint("user_id", "course_code"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )

    # Re-add users.user_db_json
    with op.batch_alter_table("users") as batch_op:
        batch_op.add_column(sa.Column("user_db_json", sa.Text, nullable=True))

    # Re-add attendance_overrides.overrides_json
    with op.batch_alter_table("attendance_overrides") as batch_op:
        batch_op.add_column(sa.Column("overrides_json", sa.Text, nullable=True))
