"""How your CVs and cover letters do: an A/B test across the versions you've sent.

Each application you sent (it got to the first stage after the start, Applied by default, or
has a document recorded against it) counts for every document version recorded as sent with
it, and once for its document as a whole. Applications with no CV recorded (or no cover letter)
make a row of their own, so you can compare with and without.

For each version, document and that row:
- **sent**: applications;
- **heard back**: any sign of life: a move to a stage that isn't closed, a call, email or
  message logged, or a move to a closed stage that isn't yours (a rejection is a reply;
  Withdrawn and the `reopen_from` stages, Ghosted by default, aren't), or a screen, interview
  round or offer;
- **interviewed**: got past the CV: reached a stage beyond Applied that isn't closed (a screen
  counts), or has an interview round that wasn't cancelled;
- **offers**: an offer recorded, or reached the Offer stage or a success stage;
- **open** / **ghosted** / **closed**: where they are now;
- **reply days**: median days from applying to hearing back.

Undone moves don't count, and nothing dated in the future does either. Rates are out of
`sent`; `interview_low` and `interview_high` are a 95% Wilson interval, so small numbers show
how unsure they are.
"""

from __future__ import annotations

import math
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import UTC, datetime
from statistics import median

from sqlalchemy import select
from sqlalchemy.orm import Session

from jat.db.models import Application, ApplicationDocument, Document, DocumentVersion, Event, Interview, Offer

from .applications import STAGE_CHANGE, _effective_moves
from .insights import stage_rank
from .scorecard import CONTACT_KINDS, _added_at
from .workflow import Workflow

KINDS = ("cv", "cover_letter", "other")
NOT_A_REPLY = frozenset({"withdrawn"})  # closing moves you make yourself (besides reopen_from)


@dataclass
class Tally:
    sent: int = 0
    heard_back: int = 0
    interviewed: int = 0
    offers: int = 0
    open: int = 0
    ghosted: int = 0
    closed: int = 0
    reply_days: list[float] = field(default_factory=list)

    @property
    def median_reply_days(self) -> float | None:
        return round(median(self.reply_days), 1) if self.reply_days else None


@dataclass
class Version:
    id: str
    label: str
    created_at: datetime
    tally: Tally = field(default_factory=Tally)


@dataclass
class Doc:
    id: str
    name: str
    kind: str
    tally: Tally = field(default_factory=Tally)
    versions: list[Version] = field(default_factory=list)


@dataclass
class Kind:
    kind: str
    documents: list[Doc] = field(default_factory=list)
    none: Tally = field(default_factory=Tally)  # applications sent without one recorded


@dataclass
class Result:
    applications: int = 0
    kinds: list[Kind] = field(default_factory=list)


def wilson(successes: int, n: int, z: float = 1.96) -> tuple[float, float] | None:
    """A 95% confidence interval for a rate, sound even for small numbers."""
    if n == 0:
        return None
    p = successes / n
    centre = (p + z * z / (2 * n)) / (1 + z * z / n)
    half = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / (1 + z * z / n)
    return max(0.0, centre - half), min(1.0, centre + half)


@dataclass
class _Outcome:
    heard_back: bool
    interviewed: bool
    offer: bool
    now: str  # open | ghosted | closed
    reply_days: float | None


def _outcome(
    app: Application,
    history: list[Event],
    workflow: Workflow,
    *,
    interviewed: bool,
    offered: bool,
    now: datetime,
) -> _Outcome:
    kinds = {s.id: s.kind for s in workflow.stages}
    rank = stage_rank(workflow)
    applied_rank = rank.get("applied", rank.get(workflow.initial, 0))
    yours = NOT_A_REPLY | set(workflow.reopen_from)
    added = _added_at(app.created_at, history)
    moves = [ev for ev in _effective_moves(history) if ev.occurred_at <= now]
    signs = [
        ev.occurred_at
        for ev in moves
        if ev.to_stage and (kinds.get(ev.to_stage) != "closed" or ev.to_stage not in yours)
    ]
    signs += [ev.occurred_at for ev in history if ev.kind in CONTACT_KINDS and ev.occurred_at <= now]
    signs = [t for t in signs if t >= added]
    reached = {ev.to_stage for ev in moves if ev.to_stage}
    first = next((ev.to_stage for ev in history if ev.kind == STAGE_CHANGE and ev.from_stage is None), None)
    if first:
        reached.add(first)
    past_cv = any(kinds.get(s) != "closed" and rank.get(s, -1) > applied_rank for s in reached)
    offer = offered or any(s == "offer" or kinds.get(s) == "success" for s in reached)
    kind = kinds.get(app.stage, "active")
    return _Outcome(
        # A round or an offer means they replied, even if nothing else was logged.
        heard_back=bool(signs) or interviewed or past_cv or offer,
        interviewed=interviewed or past_cv,
        offer=offer,
        now="ghosted" if app.stage in workflow.reopen_from else ("closed" if kind == "closed" else "open"),
        reply_days=(min(signs) - added).total_seconds() / 86_400 if signs else None,
    )


def _count(t: Tally, o: _Outcome) -> None:
    t.sent += 1
    t.heard_back += o.heard_back
    t.interviewed += o.interviewed
    t.offers += o.offer
    setattr(t, o.now, getattr(t, o.now) + 1)
    if o.reply_days is not None:
        t.reply_days.append(o.reply_days)


def performance(
    session: Session,
    workflow: Workflow,
    *,
    since: datetime | None = None,
    until: datetime | None = None,
    route: str | None = None,
) -> Result:
    """Every document's versions, compared on the applications added in [since, until) (and by route)."""
    stmt = select(Application)
    if since is not None:
        stmt = stmt.where(Application.created_at >= since)
    if until is not None:
        stmt = stmt.where(Application.created_at < until)
    if route:
        stmt = stmt.where(Application.route == route)
    apps = {a.id: a for a in session.scalars(stmt)}
    ids = list(apps)

    history: dict[str, list[Event]] = defaultdict(list)
    sent: dict[str, set[str]] = defaultdict(set)  # application -> version ids
    interviewed: set[str] = set()
    offered: set[str] = set()
    if ids:
        for ev in session.scalars(
            select(Event)
            .where(Event.application_id.in_(ids), Event.kind.in_((STAGE_CHANGE, *CONTACT_KINDS)))
            .order_by(Event.seq)
        ):
            history[ev.application_id].append(ev)
        for app_id, version_id in session.execute(
            select(ApplicationDocument.application_id, ApplicationDocument.document_version_id).where(
                ApplicationDocument.application_id.in_(ids)
            )
        ):
            sent[app_id].add(version_id)
        interviewed = set(
            session.scalars(
                select(Interview.application_id).where(
                    Interview.application_id.in_(ids), Interview.status != "cancelled"
                )
            )
        )
        offered = set(session.scalars(select(Offer.application_id).where(Offer.application_id.in_(ids))))

    docs: dict[str, Doc] = {}
    versions: dict[str, tuple[Doc, Version]] = {}
    for d in session.scalars(select(Document).order_by(Document.name)):
        docs[d.id] = Doc(id=d.id, name=d.name, kind=d.kind)
    for v in session.scalars(select(DocumentVersion).order_by(DocumentVersion.created_at, DocumentVersion.id)):
        if (doc := docs.get(v.document_id)) is not None:
            version = Version(id=v.id, label=v.label, created_at=v.created_at)
            doc.versions.append(version)
            versions[v.id] = (doc, version)

    kinds = {k: Kind(kind=k) for k in KINDS}
    rank = stage_rank(workflow)
    applied_rank = rank.get("applied", rank.get(workflow.initial, 0))
    now = datetime.now(UTC)
    result = Result()
    for app_id, app in apps.items():
        events = history[app_id]
        path_ranks = [rank.get(app.stage, -1)] + [rank.get(ev.to_stage or "", -1) for ev in events]
        if not sent[app_id] and max(path_ranks) < applied_rank:
            continue  # not sent yet (still Interested)
        o = _outcome(app, events, workflow, interviewed=app_id in interviewed, offered=app_id in offered, now=now)
        result.applications += 1
        had: dict[str, set[str]] = defaultdict(set)  # kind -> document ids
        for version_id in sent[app_id]:
            if version_id not in versions:
                continue
            doc, version = versions[version_id]
            _count(version.tally, o)
            had[doc.kind].add(doc.id)
        for doc_ids in had.values():
            for doc_id in doc_ids:
                _count(docs[doc_id].tally, o)
        for kind in ("cv", "cover_letter"):
            if kind not in had:
                _count(kinds[kind].none, o)

    for doc in docs.values():
        kinds.get(doc.kind, kinds["other"]).documents.append(doc)
    for k in kinds.values():
        k.documents.sort(key=lambda d: (-d.tally.sent, d.name.lower()))
    result.kinds = [k for k in kinds.values() if k.documents or k.kind == "cv"]
    return result
