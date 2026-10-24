"""add_guideline_chunk_hygiene_fields

Revision ID: 16f638f2fae9
Revises: 53d8aec9ad7b
Create Date: 2026-10-24 19:17:37.264573

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '16f638f2fae9'
down_revision: Union[str, None] = '53d8aec9ad7b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'guideline_chunks',
        sa.Column('source_kind', sa.String(length=50), nullable=False, server_default='custom')
    )
    op.create_index(op.f('ix_guideline_chunks_source_kind'), 'guideline_chunks', ['source_kind'], unique=False)

    op.add_column(
        'guideline_chunks',
        sa.Column('document_id', sa.String(length=100), nullable=True)
    )
    op.create_index(op.f('ix_guideline_chunks_document_id'), 'guideline_chunks', ['document_id'], unique=False)

    op.add_column(
        'guideline_chunks',
        sa.Column('content_hash', sa.String(length=64), nullable=True)
    )
    op.create_index(op.f('ix_guideline_chunks_content_hash'), 'guideline_chunks', ['content_hash'], unique=False)

    op.add_column(
        'guideline_chunks',
        sa.Column('document_type', sa.String(length=50), nullable=False, server_default='guidelines')
    )
    op.create_index(op.f('ix_guideline_chunks_document_type'), 'guideline_chunks', ['document_type'], unique=False)

    op.add_column(
        'guideline_chunks',
        sa.Column('embedding_status', sa.String(length=50), nullable=False, server_default='completed')
    )
    op.create_index(op.f('ix_guideline_chunks_embedding_status'), 'guideline_chunks', ['embedding_status'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_guideline_chunks_embedding_status'), table_name='guideline_chunks')
    op.drop_column('guideline_chunks', 'embedding_status')

    op.drop_index(op.f('ix_guideline_chunks_document_type'), table_name='guideline_chunks')
    op.drop_column('guideline_chunks', 'document_type')

    op.drop_index(op.f('ix_guideline_chunks_content_hash'), table_name='guideline_chunks')
    op.drop_column('guideline_chunks', 'content_hash')

    op.drop_index(op.f('ix_guideline_chunks_document_id'), table_name='guideline_chunks')
    op.drop_column('guideline_chunks', 'document_id')

    op.drop_index(op.f('ix_guideline_chunks_source_kind'), table_name='guideline_chunks')
    op.drop_column('guideline_chunks', 'source_kind')

