"""one reaction per user per message

Revision ID: c3e8a1f92b4d
Revises: 9b2f5d7c1a4e
Create Date: 2026-06-29 12:00:00.000000
"""

from collections.abc import Sequence

from alembic import op

revision: str = "c3e8a1f92b4d"
down_revision: str | None = "9b2f5d7c1a4e"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        DELETE FROM message_reactions AS older
        USING message_reactions AS newer
        WHERE older.message_id = newer.message_id
          AND older.user_id = newer.user_id
          AND older.created_at < newer.created_at
        """
    )
    op.drop_constraint("uq_message_reaction", "message_reactions", type_="unique")
    op.create_unique_constraint(
        "uq_message_reaction_user",
        "message_reactions",
        ["message_id", "user_id"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_message_reaction_user", "message_reactions", type_="unique")
    op.create_unique_constraint(
        "uq_message_reaction",
        "message_reactions",
        ["message_id", "user_id", "emoji"],
    )
