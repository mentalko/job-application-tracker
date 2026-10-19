"""every application starts at the first stage: fill in Interested before ones added later on

An application added at Applied (or any later or closed stage) skipped the workflow's first
stage. Give it one, as new ones get (see `create_application`): a creation event at the first
stage a second before, and the old creation event becomes the move on from it. Both are marked
`implied`, so insights don't count them as a stay, an update or a reply, and they can't be
undone. The first stage comes from the data folder's config.toml (Interested by default).

Revision ID: 0013
Revises: 0012
Create Date: 2026-10-19 12:00:00
"""

import json
from collections.abc import Sequence
from datetime import UTC, datetime, timedelta
from pathlib import Path

import sqlalchemy as sa
from alembic import op

import jat.db.types
from jat.domain.workflow import DEFAULT_WORKFLOW, Workflow, WorkflowError, load_workflow

revision: str = "0013"
down_revision: str | None = "0012"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

FORMAT = "%Y-%m-%dT%H:%M:%SZ"


def upgrade() -> None:
    conn = op.get_bind()
    workflow = _workflow(conn)
    rows = conn.execute(
        sa.text(
            "SELECT id, application_id, to_stage, occurred_at, data FROM events"
            " WHERE kind = 'stage_change' AND from_stage IS NULL ORDER BY application_id, seq"
        )
    ).all()
    firsts = {}
    for r in rows:
        firsts.setdefault(r.application_id, r)  # the first one recorded, as stage_path reads it
    seq = conn.execute(sa.text("SELECT COALESCE(MAX(seq), 0) FROM events")).scalar_one()
    now = datetime.now(UTC).strftime(FORMAT)
    for first in firsts.values():
        if not first.to_stage or not _after_initial(workflow, first.to_stage):
            continue
        try:
            when = datetime.strptime(str(first.occurred_at), FORMAT).replace(tzinfo=UTC)
        except ValueError:
            continue  # malformed history: leave it alone
        seq += 1
        conn.execute(
            sa.text(
                "INSERT INTO events (id, seq, application_id, kind, occurred_at, from_stage, to_stage,"
                " summary, data, created_at) VALUES (:id, :seq, :app, 'stage_change', :at, NULL, :stage,"
                " 'Application created', :data, :now)"
            ),
            {
                "id": jat.db.types.new_id(),
                "seq": seq,
                "app": first.application_id,
                "at": (when - timedelta(seconds=1)).strftime(FORMAT),
                "stage": workflow.initial,
                "data": json.dumps({"implied": True}),
                "now": now,
            },
        )
        # It's a move now; "Application created" belongs to the new first event.
        conn.execute(
            sa.text(
                "UPDATE events SET from_stage = :stage, data = :data,"
                " summary = NULLIF(summary, 'Application created') WHERE id = :id"
            ),
            {"stage": workflow.initial, "data": json.dumps({**_data(first.data), "implied": True}), "id": first.id},
        )


def downgrade() -> None:
    conn = op.get_bind()
    rows = conn.execute(sa.text("SELECT id, from_stage, data FROM events WHERE kind = 'stage_change'")).all()
    for r in rows:
        data = _data(r.data)
        if not data.get("implied"):
            continue
        if r.from_stage is None:
            conn.execute(sa.text("DELETE FROM events WHERE id = :id"), {"id": r.id})
        else:
            data.pop("implied")
            conn.execute(
                sa.text(
                    "UPDATE events SET from_stage = NULL, data = :data,"
                    " summary = COALESCE(summary, 'Application created') WHERE id = :id"
                ),
                {"data": json.dumps(data), "id": r.id},
            )


def _after_initial(workflow: Workflow, stage: str) -> bool:
    """Started past the first stage: later in the list, or at a closed or success stage.

    A copy of `applications.starts_after_initial` as of this revision, so it never changes.
    """
    ids = [st.id for st in workflow.stages]
    if stage == workflow.initial or workflow.initial not in ids or stage not in ids:
        return False  # a stage since removed from config.toml: leave it alone
    return workflow.stage(stage).kind != "active" or ids.index(stage) > ids.index(workflow.initial)


def _workflow(conn) -> Workflow:
    """The data folder's workflow: the database sits in it (a restore builds it there too)."""
    database = conn.engine.url.database
    if not database or database == ":memory:":
        return DEFAULT_WORKFLOW
    try:
        return load_workflow(Path(database).parent)
    except (WorkflowError, OSError):
        return DEFAULT_WORKFLOW


def _data(raw) -> dict:
    try:
        data = json.loads(raw) if raw else {}
    except (TypeError, ValueError):
        return {}
    return data if isinstance(data, dict) else {}
