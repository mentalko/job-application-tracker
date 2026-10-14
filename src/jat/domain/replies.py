"""How long people take to get back to you, in working days (weekends don't count).

A reply is recorded when you'd been waiting on someone (or on an application, which counts
for its recruiter) and then: they replied (*They've replied*), you heard back (*Heard back*),
or the application moved on while you were waiting, to a stage that isn't yours to choose
(Withdrawn, Declined, success stages such as Accepted, and the `reopen_from` stages, Ghosted by
default, are yours). Undoing that move takes the reply back. Days are your local days. A
person's usual reply time is the median of theirs, rounded up.
"""

from __future__ import annotations

import math
from collections import defaultdict
from dataclasses import dataclass
from datetime import date, timedelta
from statistics import median

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from jat.db.models import Reply

from .workflow import Workflow

YOURS = frozenset({"withdrawn", "declined"})  # closing moves you make (besides reopen_from)


def working_days(start: date, end: date) -> int:
    """Weekdays after `start`, up to and including `end`: a reply the next Monday after waiting
    from Friday took one working day; one on the same day took none."""
    if end <= start:
        return 0
    days = (end - start).days
    weeks, extra = divmod(days, 7)
    count = weeks * 5
    for i in range(1, extra + 1):
        if (start + timedelta(days=weeks * 7 + i)).weekday() < 5:
            count += 1
    return count


def is_reply_move(workflow: Workflow, to_stage: str) -> bool:
    """A move that means they got back to you (not one you made yourself)."""
    success = {st.id for st in workflow.stages if st.kind == "success"}
    return to_stage not in YOURS and to_stage not in workflow.reopen_from and to_stage not in success


def record(
    session: Session,
    *,
    contact_id: str | None,
    application_id: str | None,
    waited_since: date,
    replied_on: date,
    event_id: str | None = None,
) -> None:
    if replied_on < waited_since:
        return
    session.add(
        Reply(
            contact_id=contact_id,
            application_id=application_id,
            waited_since=waited_since,
            replied_on=replied_on,
            event_id=event_id,
        )
    )


def take_back_move(session: Session, event_id: str) -> None:
    session.execute(delete(Reply).where(Reply.event_id == event_id))


@dataclass
class ReplyStats:
    replies: int
    usual_days: int  # median working days, rounded up


def stats(session: Session, contact_ids: list[str] | None = None) -> dict[str, ReplyStats]:
    """Each person's replies and usual reply time (only people with at least one)."""
    stmt = select(Reply.contact_id, Reply.waited_since, Reply.replied_on).where(Reply.contact_id.is_not(None))
    if contact_ids is not None:
        stmt = stmt.where(Reply.contact_id.in_(contact_ids))
    days: dict[str, list[int]] = defaultdict(list)
    for contact_id, waited, replied in session.execute(stmt):
        days[contact_id].append(working_days(waited, replied))
    return {cid: ReplyStats(replies=len(d), usual_days=math.ceil(median(d))) for cid, d in days.items()}
