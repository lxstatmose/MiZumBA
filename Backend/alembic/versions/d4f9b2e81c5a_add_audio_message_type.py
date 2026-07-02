"""add audio message type

Revision ID: d4f9b2e81c5a
Revises: c3e8a1f92b4d
Create Date: 2026-06-30 12:00:00.000000
"""

from collections.abc import Sequence

from alembic import op

revision: str = "d4f9b2e81c5a"
down_revision: str | None = "c3e8a1f92b4d"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("ALTER TYPE messagetype ADD VALUE IF NOT EXISTS 'AUDIO'")
        op.execute("ALTER TYPE messagetype ADD VALUE IF NOT EXISTS 'audio'")


def downgrade() -> None:
    # PostgreSQL does not support removing enum values safely.
    pass
