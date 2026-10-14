"""replies: when people got back to you, for "usually replies within N working days"

Backfills what the application history already says: "Replied; waiting to hear back", then
"They replied; to read" or "Heard back", or a move on while you were waiting (not one you made
yourself: Withdrawn, Declined, Ghosted or Accepted, by their default ids). Each counts for the
application's recruiter, measured from the day you pressed "Replied; waiting" (or the waiting
date a move remembered) to the reply, in your local days. Malformed history is skipped.

Revision ID: 0011
Revises: 0010
Create Date: 2026-10-14 13:00:00
"""

import json
from collections.abc import Sequence
from datetime import UTC, date, datetime

import sqlalchemy as sa
from alembic import op

import jat.db.types

revision: str = "0011"
down_revision: str | None = "0010"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

YOURS = {"withdrawn", "declined", "ghosted", "accepted"}  # the default ids


def upgrade() -> None:
    op.create_table(
        "replies",
        sa.Column("contact_id", sa.String(length=36), nullable=True),
        sa.Column("application_id", sa.String(length=36), nullable=True),
        sa.Column("waited_since", jat.db.types.ISODate(length=10), nullable=False),
        sa.Column("replied_on", jat.db.types.ISODate(length=10), nullable=False),
        sa.Column("event_id", sa.String(length=36), nullable=True),
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("created_at", jat.db.types.UTCDateTime(length=32), nullable=False),
        sa.ForeignKeyConstraint(["application_id"], ["applications.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["contact_id"], ["contacts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    with op.batch_alter_table("replies", schema=None) as batch_op:
        batch_op.create_index(batch_op.f("ix_replies_application_id"), ["application_id"], unique=False)
        batch_op.create_index(batch_op.f("ix_replies_contact_id"), ["contact_id"], unique=False)
        batch_op.create_index(batch_op.f("ix_replies_event_id"), ["event_id"], unique=False)
    _backfill()


def _backfill() -> None:
    conn = op.get_bind()
    recruiter = dict(conn.execute(sa.text("SELECT id, recruiter_id FROM applications")).all())
    rows = conn.execute(
        sa.text("SELECT id, application_id, kind, to_stage, occurred_at, data FROM events ORDER BY application_id, seq")
    ).all()
    data_of = {r.id: _data(r.data) for r in rows}
    undone = {d.get("undo_of") for d in data_of.values()} - {None}
    now = datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
    replies = []
    waiting: dict[str, str] = {}  # application -> day you started waiting
    for r in rows:
        data = data_of[r.id]
        if r.id in undone or data.get("undo_of"):
            continue
        day = _local_day(r.occurred_at)
        app = r.application_id
        if day is None:
            continue
        reply = None
        if r.kind == "manual" and data.get("awaiting_reply") is True:
            waiting[app] = day
        elif r.kind == "manual" and (data.get("reply_to_read") is True or data.get("awaiting_reply") is False):
            if app in waiting:
                reply = (waiting.pop(app), day, None)
        elif r.kind == "stage_change" and data.get("was_waiting_since"):
            waiting.pop(app, None)
            since = _iso_day(data["was_waiting_since"])
            if since and r.to_stage not in YOURS:
                reply = (since, day, r.id)
        if reply and reply[1] >= reply[0]:
            replies.append(
                {
                    "id": jat.db.types.new_id(),
                    "contact_id": recruiter.get(app),
                    "application_id": app,
                    "waited_since": reply[0],
                    "replied_on": reply[1],
                    "event_id": reply[2],
                    "created_at": now,
                }
            )
    if replies:
        conn.execute(
            sa.text(
                "INSERT INTO replies (id, contact_id, application_id, waited_since, replied_on, event_id, created_at)"
                " VALUES (:id, :contact_id, :application_id, :waited_since, :replied_on, :event_id, :created_at)"
            ),
            replies,
        )


def _data(raw) -> dict:
    try:
        data = json.loads(raw) if raw else {}
    except (TypeError, ValueError):
        return {}
    return data if isinstance(data, dict) else {}


def _iso_day(value) -> str | None:
    try:
        return date.fromisoformat(str(value)[:10]).isoformat()
    except ValueError:
        return None


def _local_day(occurred_at) -> str | None:
    """The local calendar day of a stored UTC time ("2026-10-02T23:30:00Z")."""
    try:
        return datetime.fromisoformat(str(occurred_at).replace("Z", "+00:00")).astimezone().date().isoformat()
    except ValueError:
        return None


def downgrade() -> None:
    with op.batch_alter_table("replies", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_replies_event_id"))
        batch_op.drop_index(batch_op.f("ix_replies_contact_id"))
        batch_op.drop_index(batch_op.f("ix_replies_application_id"))
    op.drop_table("replies")
