"""add user oauth tokens table

Revision ID: 0011
Revises: 0010_curriculum_snapshot
Create Date: 2025-11-30
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "0011"
down_revision = "0010_curriculum_snapshot"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "user_oauth_tokens",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("provider", sa.String(length=32), nullable=False, server_default="google"),
        sa.Column("access_token", sa.Text, nullable=False),
        sa.Column("refresh_token", sa.Text, nullable=True),
        sa.Column("token_type", sa.String(length=32), nullable=True),
        sa.Column("scope", sa.Text, nullable=True),
        sa.Column("expires_at", sa.String, nullable=True),
        sa.Column("account_email", sa.String, nullable=True),
        sa.Column("created_at", sa.String, nullable=False),
        sa.Column("updated_at", sa.String, nullable=False),
        sa.UniqueConstraint("user_id", "provider", name="uq_user_oauth_provider"),
    )


def downgrade():
    op.drop_table("user_oauth_tokens")
