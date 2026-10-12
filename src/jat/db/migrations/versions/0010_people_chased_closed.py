"""people: when you chased them, and closing a conversation (ghosted, not interested)

Revision ID: 0010
Revises: 0009
Create Date: 2026-10-12 12:00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

import jat.db.types

revision: str = "0010"
down_revision: str | None = "0009"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("contacts", schema=None) as batch_op:
        batch_op.add_column(sa.Column("chased_on", jat.db.types.ISODate(length=10), nullable=True))
        batch_op.add_column(sa.Column("closed_as", sa.String(length=20), nullable=True))
        batch_op.add_column(sa.Column("closed_on", jat.db.types.ISODate(length=10), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("contacts", schema=None) as batch_op:
        batch_op.drop_column("closed_on")
        batch_op.drop_column("closed_as")
        batch_op.drop_column("chased_on")
