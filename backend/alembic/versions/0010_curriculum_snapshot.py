"""Create Phase 3 curriculum snapshot table

Revision ID: 0010_curriculum_snapshot
Revises: 0009_curriculum_phases
Create Date: 2025-11-29

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0010_curriculum_snapshot'
down_revision = '0009_curriculum_phases'
branch_labels = None
depends_on = None


def upgrade():
    # Phase 3: Unified snapshot (catalog + GDE + normalized + tree)
    # This is the FINAL denormalized table for API consumption
    op.create_table(
        'user_curriculum_snapshot',
        # 1. Catalog fields
        sa.Column('user_id', sa.Text, nullable=False),
        sa.Column('code', sa.Text, nullable=False),
        sa.Column('name', sa.Text, nullable=False),
        sa.Column('credits', sa.Integer),
        sa.Column('course_type', sa.Text),
        sa.Column('recommended_semester', sa.Integer),
        sa.Column('cp_group', sa.Text),
        sa.Column('catalog_year', sa.Integer),
        sa.Column('modality_id', sa.Integer),
        
        # 2. GDE raw fields (EXACT NAMES - DO NOT RENAME)
        sa.Column('gde_discipline_id', sa.Text),
        sa.Column('gde_has_completed', sa.Integer),
        sa.Column('gde_plan_status', sa.Integer),
        sa.Column('gde_can_enroll', sa.Integer),
        sa.Column('gde_prereqs_raw', sa.Integer),
        sa.Column('gde_offers_raw', sa.Text),
        sa.Column('gde_color_raw', sa.Text),
        sa.Column('gde_plan_status_raw', sa.Text),
        
        # 3. Normalized fields (Phase 1 computed)
        sa.Column('is_completed', sa.Integer, nullable=False),
        sa.Column('prereq_status', sa.Text, nullable=False),
        sa.Column('is_eligible', sa.Integer, nullable=False),
        sa.Column('is_offered', sa.Integer, nullable=False),
        sa.Column('final_status', sa.Text, nullable=False),
        
        # 4. Tree metadata (Phase 2 graph)
        sa.Column('prereq_list', sa.Text),      # JSON array of prerequisite codes
        sa.Column('children_list', sa.Text),    # JSON array of child codes
        sa.Column('depth', sa.Integer, nullable=False),
        sa.Column('color_hex', sa.Text, nullable=False),
        sa.Column('graph_position', sa.Text),   # JSON object {x, y}
        sa.Column('order_index', sa.Integer),   # Topological sort index
        
        sa.PrimaryKeyConstraint('user_id', 'code')
    )


def downgrade():
    op.drop_table('user_curriculum_snapshot')
