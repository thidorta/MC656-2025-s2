"""drop legacy planner json tables/columns

Revision ID: 0005
Revises: 0004
Create Date: 2025-11-28
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade():
    """
    Remove legacy JSON-based persistence structures:
    - planner_courses (legacy table)
    - overrides_json/user_db_json columns if present
    """
    conn = op.get_bind()

    # Drop legacy planner_courses table if exists
    try:
        op.drop_table("planner_courses")
    except Exception:
        pass

    # Drop overrides_json column from attendance_overrides if it exists (legacy variant)
    # SQLite cannot drop conditionally; attempt and ignore if not present
    try:
        op.drop_column("attendance_overrides", "overrides_json")
    except Exception:
        pass

    # Drop user_db_json from users if present (legacy snapshot storage)
    try:
        op.drop_column("users", "user_db_json")
    except Exception:
        pass


def downgrade():
    """
    Recreate legacy structures for backward compatibility:
    - planner_courses table
    - overrides_json column on attendance_overrides
    - user_db_json column on users
    """
    # Recreate planner_courses (legacy)
    op.create_table(
        "planner_courses",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("planner_id", sa.String, nullable=True),
        sa.Column("payload_json", sa.Text, nullable=False),
        sa.Column("updated_at", sa.String, nullable=False),
    )

    # Add overrides_json back to attendance_overrides
    try:
        op.add_column("attendance_overrides", sa.Column("overrides_json", sa.Text, nullable=True))
    except Exception:
        pass

    # Add user_db_json back to users
    try:
        op.add_column("users", sa.Column("user_db_json", sa.Text, nullable=True))
    except Exception:
        pass