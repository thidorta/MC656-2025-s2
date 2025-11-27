"""add user db snapshot columns

Revision ID: 0002
Revises: 0001
Create Date: 2025-01-10
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("user_db_json", sa.Text, nullable=True, server_default="{}"))
    op.add_column("users", sa.Column("user_db_updated_at", sa.DateTime, server_default=sa.func.current_timestamp()))


def downgrade():
    op.drop_column("users", "user_db_updated_at")
    op.drop_column("users", "user_db_json")
