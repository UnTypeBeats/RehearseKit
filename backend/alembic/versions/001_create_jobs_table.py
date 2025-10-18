"""create jobs table

Revision ID: 001
Revises: 
Create Date: 2025-01-18 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'jobs',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('status', sa.Enum('PENDING', 'CONVERTING', 'ANALYZING', 'SEPARATING', 'FINALIZING', 'PACKAGING', 'COMPLETED', 'FAILED', 'CANCELLED', name='jobstatus'), nullable=False),
        sa.Column('input_type', sa.Enum('upload', 'youtube', name='inputtype'), nullable=False),
        sa.Column('input_url', sa.String(), nullable=True),
        sa.Column('project_name', sa.String(), nullable=False),
        sa.Column('quality_mode', sa.Enum('fast', 'high', name='qualitymode'), nullable=False),
        sa.Column('detected_bpm', sa.Float(), nullable=True),
        sa.Column('manual_bpm', sa.Float(), nullable=True),
        sa.Column('progress_percent', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('source_file_path', sa.String(), nullable=True),
        sa.Column('stems_folder_path', sa.String(), nullable=True),
        sa.Column('package_path', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_jobs_created_at'), 'jobs', ['created_at'], unique=False)
    op.create_index(op.f('ix_jobs_status'), 'jobs', ['status'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_jobs_status'), table_name='jobs')
    op.drop_index(op.f('ix_jobs_created_at'), table_name='jobs')
    op.drop_table('jobs')
    op.execute('DROP TYPE jobstatus')
    op.execute('DROP TYPE inputtype')
    op.execute('DROP TYPE qualitymode')

