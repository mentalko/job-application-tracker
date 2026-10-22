"""interviews: how often a round was rescheduled, and the time it moved from last

Backfills the count from the "… rescheduled" entries already on application timelines (their
earlier time wasn't recorded, so `rescheduled_from` starts empty).

Revision ID: 0014
Revises: 0013
Create Date: 2026-10-22 13:00:00
"""

import json
from collections import Counter
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

import jat.db.types

revision: str = "0014"
down_revision: str | None = "0013"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("interviews", schema=None) as batch_op:
        batch_op.add_column(sa.Column("rescheduled_count", sa.Integer(), server_default="0", nullable=False))
        batch_op.add_column(sa.Column("rescheduled_from", jat.db.types.UTCDateTime(length=32), nullable=True))
    conn = op.get_bind()
    counts: Counter[str] = Counter()
    rows = conn.execute(
        sa.text("SELECT summary, data FROM events WHERE kind = 'interview' AND summary LIKE '% rescheduled'")
    ).all()
    for summary, raw in rows:
        if not str(summary).endswith(" rescheduled"):
            continue
        try:
            data = json.loads(raw) if raw else {}
        except (TypeError, ValueError):
            continue
        # Only entries the app wrote for a round (they always carry its round and status), and
        # LIKE ignores case, so check the ending exactly.
        if isinstance(data, dict) and isinstance(data.get("interview_id"), str) and {"round", "status"} <= data.keys():
            counts[data["interview_id"]] += 1
    for interview_id, n in counts.items():
        conn.execute(
            sa.text("UPDATE interviews SET rescheduled_count = :n WHERE id = :id"), {"n": n, "id": interview_id}
        )


def downgrade() -> None:
    with op.batch_alter_table("interviews", schema=None) as batch_op:
        batch_op.drop_column("rescheduled_from")
        batch_op.drop_column("rescheduled_count")
