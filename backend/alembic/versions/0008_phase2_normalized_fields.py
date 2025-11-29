"""Add Phase 2 normalized columns to user_curriculum

Revision ID: 0008_phase2_normalized_fields
Revises: 0007_user_curriculum
Create Date: 2025-11-29

Phase 2: Add normalized academic logic fields
- pre_req_real: authoritative prerequisites (JSON)
- offers_real: normalized offerings (JSON)
- can_enroll_final: computed eligibility (boolean)
- ofertada_final: computed offering status (boolean)
- status_final: computed final status (varchar)
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0008_phase2_normalized_fields'
down_revision = '0007_user_curriculum'
branch_labels = None
depends_on = None


def upgrade():
    # Add Phase 2 normalized columns to user_curriculum
    with op.batch_alter_table('user_curriculum', schema=None) as batch_op:
        # Normalized prerequisites (JSON array of codigos)
        batch_op.add_column(sa.Column('pre_req_real', sa.Text(), nullable=True))
        
        # Normalized offerings (JSON array of offer objects)
        batch_op.add_column(sa.Column('offers_real', sa.Text(), nullable=True))
        
        # Computed flags
        batch_op.add_column(sa.Column('can_enroll_final', sa.Boolean(), nullable=False, server_default='0'))
        batch_op.add_column(sa.Column('ofertada_final', sa.Boolean(), nullable=False, server_default='0'))
        
        # Final computed status
        batch_op.add_column(sa.Column('status_final', sa.String(), nullable=True))
        
        # Optional validation notes
        batch_op.add_column(sa.Column('validation_notes', sa.Text(), nullable=True))


def downgrade():
    with op.batch_alter_table('user_curriculum', schema=None) as batch_op:
        batch_op.drop_column('validation_notes')
        batch_op.drop_column('status_final')
        batch_op.drop_column('ofertada_final')
        batch_op.drop_column('can_enroll_final')
        batch_op.drop_column('offers_real')
        batch_op.drop_column('pre_req_real')
