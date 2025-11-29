"""Add user_curriculum unified table

Revision ID: 0007_user_curriculum
Revises: 0006_attendance_overrides
Create Date: 2025-11-29

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0007_user_curriculum'
down_revision = '0006_drop_legacy_json_structures'
branch_labels = None
depends_on = None


def upgrade():
    # Create unified user_curriculum table (Phase 1: catalog + user overlay)
    op.create_table(
        'user_curriculum',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('snapshot_id', sa.Integer(), nullable=True),
        
        # Catalog source fields (always present)
        sa.Column('codigo', sa.String(), nullable=False),
        sa.Column('nome', sa.String(), nullable=False),
        sa.Column('creditos', sa.Integer(), nullable=False),
        sa.Column('tipo', sa.String(), nullable=True),
        sa.Column('semestre_sugerido', sa.Integer(), nullable=True),
        sa.Column('cp_group', sa.Integer(), nullable=True),
        sa.Column('curso_id', sa.Integer(), nullable=True),
        sa.Column('catalogo', sa.Integer(), nullable=False),
        
        # User overlay fields (from raw GDE user_db; nullable when user hasn't taken)
        sa.Column('disciplina_id', sa.String(), nullable=True),  # GDE internal ID
        sa.Column('tem', sa.Boolean(), nullable=False, server_default='0'),  # raw completion flag
        sa.Column('pode', sa.Boolean(), nullable=True),  # raw can_enroll (GDE opinion)
        sa.Column('missing', sa.Boolean(), nullable=False, server_default='1'),  # raw requirement flag
        sa.Column('raw_status', sa.String(), nullable=True),  # raw GDE status
        sa.Column('color', sa.String(), nullable=True),
        sa.Column('obs', sa.String(), nullable=True),
        
        # Preserved raw arrays (stored as JSON)
        sa.Column('pre_req_raw', sa.Text(), nullable=True),  # JSON array from GDE prereqs
        sa.Column('offers_raw', sa.Text(), nullable=True),  # JSON array from GDE offers
        
        # Metadata
        sa.Column('created_at', sa.String(), nullable=False),
        sa.Column('updated_at', sa.String(), nullable=False),
        
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['snapshot_id'], ['gde_snapshots.id'], ondelete='SET NULL'),
    )
    
    # Index for fast user+code lookups
    op.create_index('ix_user_curriculum_user_codigo', 'user_curriculum', ['user_id', 'codigo'], unique=True)


def downgrade():
    op.drop_index('ix_user_curriculum_user_codigo', table_name='user_curriculum')
    op.drop_table('user_curriculum')
