"""add_users_and_tenant_isolation

Revision ID: 27e8a94b301c
Revises: 16f638f2fae9
Create Date: 2026-10-24 20:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '27e8a94b301c'
down_revision: Union[str, None] = '16f638f2fae9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Additive columns to brand_profiles
    op.add_column(
        'brand_profiles',
        sa.Column('tenant_id', sa.String(length=100), nullable=True, server_default='tenant_default')
    )
    op.create_index(op.f('ix_brand_profiles_tenant_id'), 'brand_profiles', ['tenant_id'], unique=False)

    op.add_column(
        'brand_profiles',
        sa.Column('owner_id', sa.String(length=100), nullable=True)
    )
    op.create_index(op.f('ix_brand_profiles_owner_id'), 'brand_profiles', ['owner_id'], unique=False)

    # 2. Additive user_accounts table
    op.create_table(
        'user_accounts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('full_name', sa.String(length=255), nullable=False),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('role', sa.String(length=50), server_default='CREATOR', nullable=False),
        sa.Column('tenant_id', sa.String(length=100), server_default='tenant_default', nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_user_accounts_id'), 'user_accounts', ['id'], unique=False)
    op.create_index(op.f('ix_user_accounts_email'), 'user_accounts', ['email'], unique=True)
    op.create_index(op.f('ix_user_accounts_role'), 'user_accounts', ['role'], unique=False)
    op.create_index(op.f('ix_user_accounts_tenant_id'), 'user_accounts', ['tenant_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_user_accounts_tenant_id'), table_name='user_accounts')
    op.drop_index(op.f('ix_user_accounts_role'), table_name='user_accounts')
    op.drop_index(op.f('ix_user_accounts_email'), table_name='user_accounts')
    op.drop_index(op.f('ix_user_accounts_id'), table_name='user_accounts')
    op.drop_table('user_accounts')

    op.drop_index(op.f('ix_brand_profiles_owner_id'), table_name='brand_profiles')
    op.drop_column('brand_profiles', 'owner_id')
    op.drop_index(op.f('ix_brand_profiles_tenant_id'), table_name='brand_profiles')
    op.drop_column('brand_profiles', 'tenant_id')
