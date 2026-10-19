"""How applications flow through the stages (PRD FR19), from the event history.

Each application's path is its first stage and then every stage move that wasn't undone, in
the order they happened. A Sankey diagram can't draw loops, so paths are folded forwards in
workflow order (active stages, then success and closed ones): a move back to an earlier stage
counts as staying at the furthest stage reached. A closed stage that was reopened (Ghosted, and
then they came back) is left out, so the application is drawn along where it really went. The
history itself is untouched; this is only how the picture is drawn.
"""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass, field
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from jat.db.models import Application, Event

from .applications import STAGE_CHANGE, _effective_moves, is_implied
from .workflow import Workflow


@dataclass
class Flow:
    applications: int = 0
    reached: Counter[str] = field(default_factory=Counter)  # stage -> applications that got there
    links: Counter[tuple[str, str]] = field(default_factory=Counter)  # (from, to) -> applications
    current: Counter[str] = field(default_factory=Counter)  # where they are now (folded)


def closed_stages(workflow: Workflow) -> frozenset[str]:
    return frozenset(s.id for s in workflow.stages if s.kind == "closed")


def stage_rank(workflow: Workflow) -> dict[str, int]:
    """Active stages in workflow order first, then success, then closed: a left-to-right order."""
    order = [s for s in workflow.stages if s.is_active]
    order += [s for s in workflow.stages if s.kind == "success"]
    order += [s for s in workflow.stages if s.kind == "closed"]
    return {s.id: i for i, s in enumerate(order)}


def applied_rank(workflow: Workflow, rank: dict[str, int]) -> int:
    """Where *Applied* is: the `applied` stage, or the first active stage after the start."""
    if "applied" in rank:
        return rank["applied"]
    active = [st.id for st in workflow.stages if st.is_active]
    after = active[active.index(workflow.initial) + 1 :] if workflow.initial in active else active
    return rank[after[0]] if after else rank.get(workflow.initial, 0)


def before_applied(workflow: Workflow, stage: str) -> bool:
    """An open stage before Applied (Interested, say): you're interested but haven't applied."""
    rank = stage_rank(workflow)
    kinds = {st.id: st.kind for st in workflow.stages}
    return kinds.get(stage) == "active" and rank.get(stage, len(rank)) < applied_rank(workflow, rank)


def role_progress(workflow: Workflow, apps: list[tuple[str, list[str], bool]]) -> str:
    """How far a role's applications got, from each one's (current stage, stage path, whether it
    has an applied date):

    - `applied`: one got to Applied or further at some point (or was recorded straight at a
      closed stage with an applied date: a past application you logged as Rejected);
    - `interested`: none has, and one is still in an open stage before Applied;
    - `closed`: none has, and every one is closed (withdrawn while only interested, say).

    An application with no stage history counts as its current stage.
    """
    rank = stage_rank(workflow)
    applied = applied_rank(workflow, rank)
    kinds = {st.id: st.kind for st in workflow.stages}

    def got_there(stage: str) -> bool:
        return kinds.get(stage) != "closed" and rank.get(stage, applied) >= applied

    for stage, path, has_applied_on in apps:
        path = path or [stage]
        if any(got_there(st) for st in path) or (kinds.get(path[0]) == "closed" and has_applied_on):
            return "applied"
    if all(kinds.get(stage) == "closed" for stage, _, _ in apps):
        return "closed"
    if all(kinds.get(stage) == "closed" or before_applied(workflow, stage) for stage, _, _ in apps):
        return "interested"
    return "applied"  # a stage the workflow no longer has: assume the furthest


def stage_paths(session: Session, app_ids: list[str]) -> dict[str, list[str]]:
    """Each application's stage path (first stage, then moves not undone), for role_progress.

    A first stage the app filled in is left out: the path starts where you started it.
    """
    events: dict[str, list[Event]] = {i: [] for i in app_ids}
    if app_ids:
        for ev in session.scalars(
            select(Event).where(Event.application_id.in_(app_ids), Event.kind == STAGE_CHANGE).order_by(Event.seq)
        ):
            events[ev.application_id].append(ev)
    return {i: stage_path(evs, implied=False) for i, evs in events.items()}


def stage_path(events: list[Event], *, implied: bool = True) -> list[str]:
    """First stage, then the stages moved to (undone moves left out), in time order.

    `implied=False` leaves out a first stage the app filled in (see `create_application`).
    """
    stage_events = [ev for ev in events if ev.kind == STAGE_CHANGE]
    first = next((ev for ev in stage_events if ev.from_stage is None), None)
    if first is None or first.to_stage is None:
        return []
    moves = sorted(_effective_moves(events), key=lambda ev: (ev.occurred_at, ev.seq))
    path = [first.to_stage, *(ev.to_stage for ev in moves if ev.to_stage)]
    return path[1:] if not implied and is_implied(first) and len(path) > 1 else path


def fold_forward(path: list[str], rank: dict[str, int], closed: frozenset[str] = frozenset()) -> list[str]:
    """Keep only moves to a later stage, so the flow has no loops (unknown stages go last).

    `closed` stages count only where the path ends: one that was reopened is skipped.
    """
    last = len(rank)
    folded: list[str] = []
    for i, stage in enumerate(path):
        if stage in closed and i < len(path) - 1:
            continue
        if not folded or rank.get(stage, last) > rank.get(folded[-1], last):
            folded.append(stage)
    return folded


def flow(
    session: Session,
    workflow: Workflow,
    *,
    since: datetime | None = None,
    until: datetime | None = None,
    route: str | None = None,
) -> Flow:
    """Applications added in [since, until) (and by `route`), counted along their folded paths."""
    stmt = select(Application.id)
    if since is not None:
        stmt = stmt.where(Application.created_at >= since)
    if until is not None:
        stmt = stmt.where(Application.created_at < until)
    if route:
        stmt = stmt.where(Application.route == route)
    ids = list(session.scalars(stmt))
    events: dict[str, list[Event]] = {i: [] for i in ids}
    if ids:
        for ev in session.scalars(
            select(Event).where(Event.application_id.in_(ids), Event.kind == STAGE_CHANGE).order_by(Event.seq)
        ):
            events[ev.application_id].append(ev)

    rank = stage_rank(workflow)
    closed = closed_stages(workflow)
    result = Flow()
    for app_id in ids:
        path = fold_forward(stage_path(events[app_id]), rank, closed)
        if not path:
            continue
        result.applications += 1
        result.current[path[-1]] += 1
        for stage in path:
            result.reached[stage] += 1
        for a, b in zip(path, path[1:], strict=False):
            result.links[(a, b)] += 1
    return result
