"""add trim fields to jobs

Revision ID: 002
Revises: 001
Create Date: 2025-10-21 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '002'
down_revision: Union[str, None] = '001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add trim_start and trim_end columns to jobs table
    op.add_column('jobs', sa.Column('trim_start', sa.Float(), nullable=True))
    op.add_column('jobs', sa.Column('trim_end', sa.Float(), nullable=True))


def downgrade() -> None:
    # Remove trim columns
    op.drop_column('jobs', 'trim_end')
    op.drop_column('jobs', 'trim_start')

