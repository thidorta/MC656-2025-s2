"""Add attendance override metadata columns

Revision ID: 0012_attendance_override_extended
Revises: 0011_add_user_oauth_tokens
Create Date: 2025-12-01

"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "0012_attendance_override_extended"
down_revision = "0011"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("attendance_overrides") as batch_op:
        batch_op.add_column(sa.Column("absences_used", sa.Integer(), nullable=False, server_default="0"))
        batch_op.add_column(sa.Column("requires_attendance", sa.Integer(), nullable=False, server_default="1"))
        batch_op.add_column(sa.Column("alert_enabled", sa.Integer(), nullable=False, server_default="1"))

    op.execute(
        """
        UPDATE attendance_overrides
        SET absences_used = CASE
            WHEN total_aulas IS NOT NULL AND presencas IS NOT NULL AND total_aulas >= presencas
                THEN total_aulas - presencas
            ELSE 0
        END,
            requires_attendance = 1,
            alert_enabled = 1
        """
    )

    with op.batch_alter_table("attendance_overrides") as batch_op:
        batch_op.alter_column("absences_used", server_default=None)
        batch_op.alter_column("requires_attendance", server_default=None)
        batch_op.alter_column("alert_enabled", server_default=None)


def downgrade():
    with op.batch_alter_table("attendance_overrides") as batch_op:
        batch_op.drop_column("alert_enabled")
        batch_op.drop_column("requires_attendance")
        batch_op.drop_column("absences_used")
