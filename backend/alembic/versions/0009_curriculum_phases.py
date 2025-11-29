"""Create Phase 0.5, 1, 2 curriculum tables

Revision ID: 0009_curriculum_phases
Revises: 0008_phase2_normalized_fields
Create Date: 2025-11-29

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0009_curriculum_phases'
down_revision = '0008_phase2_normalized_fields'
branch_labels = None
depends_on = None


def upgrade():
    # Phase 0.5: Raw standardized curriculum (catalog + GDE overlay)
    op.create_table(
        'user_curriculum_raw_standardized',
        sa.Column('user_id', sa.Text, nullable=False),
        sa.Column('code', sa.Text, nullable=False),
        sa.Column('name', sa.Text, nullable=False),
        sa.Column('credits', sa.Integer),
        sa.Column('course_type', sa.Text),
        sa.Column('recommended_semester', sa.Integer),
        sa.Column('cp_group', sa.Text),
        sa.Column('catalog_year', sa.Integer),
        sa.Column('modality_id', sa.Integer),
        
        sa.Column('gde_discipline_id', sa.Text),
        sa.Column('gde_has_completed', sa.Integer),
        sa.Column('gde_plan_status', sa.Integer),
        sa.Column('gde_can_enroll', sa.Integer),
        sa.Column('gde_prereqs_raw', sa.Integer),
        sa.Column('gde_offers_raw', sa.Text),
        sa.Column('gde_color_raw', sa.Text),
        sa.Column('gde_plan_status_raw', sa.Text),
        
        sa.PrimaryKeyConstraint('user_id', 'code')
    )
    
    # Phase 1: Normalized curriculum (academic state)
    op.create_table(
        'user_curriculum_normalized',
        sa.Column('user_id', sa.Text, nullable=False),
        sa.Column('code', sa.Text, nullable=False),
        sa.Column('name', sa.Text, nullable=False),
        sa.Column('credits', sa.Integer),
        sa.Column('course_type', sa.Text),
        sa.Column('recommended_semester', sa.Integer),
        sa.Column('cp_group', sa.Text),
        sa.Column('catalog_year', sa.Integer),
        sa.Column('modality_id', sa.Integer),
        
        sa.Column('gde_discipline_id', sa.Text),
        sa.Column('gde_has_completed', sa.Integer),
        sa.Column('gde_plan_status', sa.Integer),
        sa.Column('gde_can_enroll', sa.Integer),
        sa.Column('gde_prereqs_raw', sa.Integer),
        sa.Column('gde_offers_raw', sa.Text),
        sa.Column('gde_color_raw', sa.Text),
        sa.Column('gde_plan_status_raw', sa.Text),
        
        sa.Column('is_completed', sa.Integer, nullable=False),
        sa.Column('prereq_status', sa.Text, nullable=False),
        sa.Column('is_eligible', sa.Integer, nullable=False),
        sa.Column('is_offered', sa.Integer, nullable=False),
        sa.Column('final_status', sa.Text, nullable=False),
        
        sa.PrimaryKeyConstraint('user_id', 'code')
    )
    
    # Phase 2: Tree structure (graph + metadata)
    op.create_table(
        'user_curriculum_tree',
        sa.Column('user_id', sa.Text, nullable=False),
        sa.Column('code', sa.Text, nullable=False),
        sa.Column('name', sa.Text, nullable=False),
        sa.Column('credits', sa.Integer),
        sa.Column('course_type', sa.Text),
        sa.Column('recommended_semester', sa.Integer),
        sa.Column('cp_group', sa.Text),
        
        sa.Column('is_completed', sa.Integer, nullable=False),
        sa.Column('prereq_status', sa.Text, nullable=False),
        sa.Column('is_eligible', sa.Integer, nullable=False),
        sa.Column('is_offered', sa.Integer, nullable=False),
        sa.Column('final_status', sa.Text, nullable=False),
        
        sa.Column('children', sa.Text),  # JSON array of codes
        sa.Column('parents', sa.Text),   # JSON array of codes
        sa.Column('depth_level', sa.Integer, nullable=False),
        sa.Column('color_tree', sa.Text, nullable=False),
        sa.Column('is_planned', sa.Integer, nullable=False),
        
        sa.Column('gde_has_completed', sa.Integer),
        sa.Column('gde_plan_status', sa.Integer),
        sa.Column('gde_can_enroll', sa.Integer),
        sa.Column('gde_prereqs_raw', sa.Integer),
        sa.Column('gde_offers_raw', sa.Text),
        sa.Column('gde_color_raw', sa.Text),
        sa.Column('gde_plan_status_raw', sa.Text),
        
        sa.PrimaryKeyConstraint('user_id', 'code')
    )


def downgrade():
    op.drop_table('user_curriculum_tree')
    op.drop_table('user_curriculum_normalized')
    op.drop_table('user_curriculum_raw_standardized')
