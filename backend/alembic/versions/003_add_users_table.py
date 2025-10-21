"""Add users table and OAuth support

Revision ID: 003
Revises: 002
Create Date: 2025-10-21

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
import uuid

# revision identifiers, used by Alembic.
revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create users table
    op.create_table(
        'users',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('email', sa.String(), nullable=True),  # Nullable for OAuth-only users initially
        sa.Column('hashed_password', sa.String(), nullable=True),  # Nullable for OAuth-only users
        sa.Column('full_name', sa.String(), nullable=True),
        sa.Column('avatar_url', sa.String(), nullable=True),
        sa.Column('is_admin', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('oauth_provider', sa.String(), nullable=True),  # 'google', 'facebook', 'email'
        sa.Column('oauth_id', sa.String(), nullable=True),  # Provider's user ID
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('last_login_at', sa.DateTime(timezone=True), nullable=True),
    )
    
    # Create unique index on email (where email is not null)
    op.create_index('ix_users_email', 'users', ['email'], unique=True, postgresql_where=sa.text('email IS NOT NULL'))
    
    # Create unique index on oauth_provider + oauth_id combination
    op.create_index(
        'ix_users_oauth_provider_id',
        'users',
        ['oauth_provider', 'oauth_id'],
        unique=True,
        postgresql_where=sa.text('oauth_provider IS NOT NULL AND oauth_id IS NOT NULL')
    )
    
    # Add user_id column to jobs table (nullable for backward compatibility)
    op.add_column('jobs', sa.Column('user_id', UUID(as_uuid=True), nullable=True))
    
    # Add foreign key constraint
    op.create_foreign_key(
        'fk_jobs_user_id',
        'jobs',
        'users',
        ['user_id'],
        ['id'],
        ondelete='SET NULL'  # If user is deleted, keep job but set user_id to NULL
    )
    
    # Create index on jobs.user_id for faster queries
    op.create_index('ix_jobs_user_id', 'jobs', ['user_id'])


def downgrade() -> None:
    # Drop foreign key and index from jobs table
    op.drop_index('ix_jobs_user_id', table_name='jobs')
    op.drop_constraint('fk_jobs_user_id', 'jobs', type_='foreignkey')
    op.drop_column('jobs', 'user_id')
    
    # Drop indexes from users table
    op.drop_index('ix_users_oauth_provider_id', table_name='users')
    op.drop_index('ix_users_email', table_name='users')
    
    # Drop users table
    op.drop_table('users')

