"""Insights (PRD FR19, FR20): how the search is going."""

from __future__ import annotations

from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import APIRouter, HTTPException, Query
from pydantic import AwareDatetime, BaseModel

from ..domain import conversations as conv_svc
from ..domain import insights as svc
from ..domain import scorecard as score_svc
from ..domain import stats as stats_svc
from . import schemas as S
from .deps import SessionDep, WorkflowDep

router = APIRouter(prefix="/insights", tags=["insights"])


class FlowNode(BaseModel):
    id: str
    name: str
    kind: str
    color: str
    reached: int  # applications that got to this stage
    current: int  # of those, how many are still there


class FlowLink(BaseModel):
    source: str
    target: str
    value: int


class FlowOut(BaseModel):
    applications: int
    nodes: list[FlowNode]  # left-to-right order
    links: list[FlowLink]


@router.get("/flow", response_model=FlowOut)
def stage_flow(
    session: SessionDep,
    workflow: WorkflowDep,
    since: AwareDatetime | None = None,
    until: AwareDatetime | None = None,
    route: S.Route | None = None,
):
    """Stage-to-stage flows for a Sankey diagram, for applications added in [since, until)."""
    result = svc.flow(session, workflow, since=since, until=until, route=route)
    rank = svc.stage_rank(workflow)
    stages = {s.id: s for s in workflow.stages}

    def pos(sid: str) -> tuple[int, str]:
        return (rank.get(sid, len(rank)), sid)  # unknown (removed) stages last

    order = sorted(result.reached, key=pos)
    nodes = [
        FlowNode(
            id=sid,
            name=stages[sid].name if sid in stages else sid,
            kind=stages[sid].kind if sid in stages else "unknown",
            color=stages[sid].color if sid in stages else "gray",
            reached=result.reached[sid],
            current=result.current[sid],
        )
        for sid in order
    ]
    links = [
        FlowLink(source=a, target=b, value=n)
        for (a, b), n in sorted(result.links.items(), key=lambda kv: (pos(kv[0][0]), pos(kv[0][1])))
    ]
    return FlowOut(applications=result.applications, nodes=nodes, links=links)


class StageStatsOut(BaseModel):
    id: str
    name: str
    kind: str
    color: str
    reached: int  # applications that got to this stage (as in the Sankey diagram)
    moved_on: int  # of those, how many went on to a later stage that isn't a closed one
    conversion: float | None  # moved_on / reached, for active stages
    median_days: float | None  # median completed stay, in days
    stays: int  # completed stays behind median_days


class RouteStatsOut(BaseModel):
    route: S.Route
    applications: int
    reached: dict[str, int]  # stage -> applications that got there


class StatsOut(BaseModel):
    applications: int
    stages: list[StageStatsOut]  # left-to-right order
    routes: list[RouteStatsOut]  # routes with at least one application


@router.get("/stats", response_model=StatsOut)
def search_stats(
    session: SessionDep,
    workflow: WorkflowDep,
    since: AwareDatetime | None = None,
    until: AwareDatetime | None = None,
):
    """Conversion and time per stage, and outcomes by route, for applications added in [since, until)."""
    result = stats_svc.stats(session, workflow, since=since, until=until)
    rank = svc.stage_rank(workflow)
    known = {s.id: s for s in workflow.stages}
    reached = [sid for sid, st in result.stages.items() if st.reached]  # not ones only visited going back
    ids = sorted(reached, key=lambda sid: (rank.get(sid, len(rank)), sid))
    stages = []
    for sid in ids:
        st, s = result.stages[sid], known.get(sid)
        active = s is not None and s.is_active
        stages.append(
            StageStatsOut(
                id=sid,
                name=s.name if s else sid,
                kind=s.kind if s else "unknown",
                color=s.color if s else "gray",
                reached=st.reached,
                moved_on=st.moved_on,
                conversion=round(st.moved_on / st.reached, 3) if active and st.reached else None,
                median_days=result.median_days(sid),
                stays=len(st.days),
            )
        )
    routes = [
        RouteStatsOut(route=r, applications=result.route_applications[r], reached=dict(result.route_reached[r]))
        for r in stats_svc.ROUTES
        if result.route_applications[r]
    ]
    return StatsOut(applications=result.applications, stages=stages, routes=routes)


class WeekOut(BaseModel):
    start: date  # the week's first day
    added: int  # applications added
    applied: int  # applications with their applied date in the week
    moves: int  # stage moves
    interviews: int  # interview rounds (not cancelled) starting in the week
    calls: int  # calls and meetings with people in the week, marked Happened
    pitched: int  # roles someone told you about, added in the week


@router.get("/activity", response_model=list[WeekOut])
def weekly_activity(
    session: SessionDep,
    start: date | None = None,
    tz: str = "UTC",
    weeks: int = Query(12, ge=1, le=52),
):
    """Activity per week, oldest first. Pass `tz`, your IANA time zone (e.g. Europe/London),
    and `start`, the Monday your first week begins, so weeks are your weeks, clock changes
    included. `start` defaults to the Monday that makes the last week this one.
    """
    try:
        zone = ZoneInfo(tz)
    except (ZoneInfoNotFoundError, ValueError) as exc:
        raise HTTPException(422, f"unknown time zone {tz!r}") from exc
    if start is None:
        today = datetime.now(zone).date()
        start = today - timedelta(days=today.weekday(), weeks=weeks - 1)
    return [WeekOut(**vars(w)) for w in stats_svc.weekly_activity(session, start, weeks, zone)]


class ScoreOut(BaseModel):
    id: str
    name: str
    agency_id: str | None = None  # for a recruiter: their agency
    agency_name: str | None = None
    roles: int  # applications they put you forward for
    interviewed: int  # of those, how many got an interview round (not cancelled)
    active: int
    success: int
    closed: int  # closed, other than ghosted
    ghosted: int
    median_first_update_days: float | None  # adding the application to the first call, email, message or move
    last_contact: datetime | None  # the latest call, email or message logged


class ScorecardOut(BaseModel):
    recruiters: list[ScoreOut]  # most roles first
    agencies: list[ScoreOut]


def _score_out(s: score_svc.Score) -> ScoreOut:
    return ScoreOut(
        id=s.id,
        name=s.name,
        agency_id=s.agency_id,
        agency_name=s.agency_name,
        roles=s.roles,
        interviewed=s.interviewed,
        active=s.active,
        success=s.success,
        closed=s.closed,
        ghosted=s.ghosted,
        median_first_update_days=s.median_first_update,
        last_contact=s.last_contact,
    )


@router.get("/scorecard", response_model=ScorecardOut)
def recruiter_scorecard(
    session: SessionDep,
    workflow: WorkflowDep,
    since: AwareDatetime | None = None,
    until: AwareDatetime | None = None,
):
    """How each recruiter's and agency's roles have gone, for applications added in [since, until)."""
    recruiters, agencies = score_svc.scorecard(session, workflow, since=since, until=until)
    return ScorecardOut(recruiters=[_score_out(s) for s in recruiters], agencies=[_score_out(s) for s in agencies])


class ConversationTally(BaseModel):
    calls_held: int  # marked Happened
    calls_booked: int  # still to come
    calls_cancelled: int
    last_call: datetime | None
    pitched: int  # roles they told you about
    applied: int  # of those, ones you applied for
    passed: int  # ones you passed on
    deciding: int  # neither yet
    apply_rate: float | None  # applied / (applied + passed): of the roles you've decided on
    interviewed: int  # applied roles that got an interview round (not cancelled)
    offers: int  # applied roles with an offer (or a success stage)
    in_progress: int  # applied roles still in an active stage
    closed: int  # applied roles closed, other than ghosted
    ghosted: int
    median_decide_days: float | None  # adding a role to applying or passing


class ConversationPerson(ConversationTally):
    id: str
    name: str
    agency_id: str | None
    agency_name: str | None
    company_name: str | None  # an in-house recruiter's company
    closed_as: str | None  # ghosted | not_interested


class ConversationAgency(ConversationTally):
    id: str
    name: str
    people: int


class PassReasonOut(BaseModel):
    role_id: str
    role_title: str
    company_name: str
    person_name: str | None
    reason: str
    decided_on: date | None


class ConversationsOut(BaseModel):
    total: ConversationTally
    people_talked_to: int  # people with a call held or a role pitched
    flow: FlowOut  # pitched roles: applied, passed or deciding, and where applied ones went
    people: list[ConversationPerson]  # most roles pitched first
    agencies: list[ConversationAgency]
    pass_reasons: list[PassReasonOut]  # newest first


def _tally(t: conv_svc.Tally) -> dict:
    decided = t.applied + t.passed
    return dict(
        calls_held=t.calls_held,
        calls_booked=t.calls_booked,
        calls_cancelled=t.calls_cancelled,
        last_call=t.last_call,
        pitched=t.pitched,
        applied=t.applied,
        passed=t.passed,
        deciding=t.deciding,
        apply_rate=round(t.applied / decided, 3) if decided else None,
        interviewed=t.interviewed,
        offers=t.outcomes["offer"],
        in_progress=t.outcomes["in_progress"],
        closed=t.outcomes["closed"],
        ghosted=t.outcomes["ghosted"],
        median_decide_days=t.median_decide_days,
    )


def _role_flow(t: conv_svc.Tally) -> FlowOut:
    """Pitched roles as a Sankey diagram: pitched, then applied / passed / deciding, then outcomes."""
    nodes = [
        ("pitched", "Pitched to you", "active", "indigo", t.pitched),
        ("applied", "Applied", "active", "blue", t.applied),
        ("passed", "Passed", "outcome", "gray", t.passed),
        ("deciding", "Still deciding", "outcome", "yellow", t.deciding),
        ("in_progress", "In progress", "outcome", "cyan", t.outcomes["in_progress"]),
        ("offer", "Offer", "outcome", "green", t.outcomes["offer"]),
        ("closed", "Closed", "outcome", "red", t.outcomes["closed"]),
        ("ghosted", "Ghosted", "outcome", "dark", t.outcomes["ghosted"]),
    ]
    links = [
        FlowLink(source="pitched", target=target, value=n)
        for target, n in (("applied", t.applied), ("passed", t.passed), ("deciding", t.deciding))
        if n
    ] + [FlowLink(source="applied", target=k, value=t.outcomes[k]) for k in conv_svc.OUTCOMES if t.outcomes[k]]
    return FlowOut(
        applications=t.pitched,
        nodes=[
            FlowNode(id=i, name=name, kind=kind, color=color, reached=n, current=0)
            for i, name, kind, color, n in nodes
            if n
        ],
        links=links,
    )


@router.get("/conversations", response_model=ConversationsOut)
def recruiter_conversations(
    session: SessionDep,
    workflow: WorkflowDep,
    since: AwareDatetime | None = None,
    until: AwareDatetime | None = None,
):
    """What happens before applications: calls with people, the roles they pitched, which you
    applied for or passed on, and how those went. Calls count by when they happen, roles by
    when they were added, in [since, until)."""
    c = conv_svc.conversations(session, workflow, since=since, until=until)
    return ConversationsOut(
        total=ConversationTally(**_tally(c.total)),
        people_talked_to=c.people_talked_to,
        flow=_role_flow(c.total),
        people=[
            ConversationPerson(
                **_tally(p),
                id=p.id,
                name=p.name,
                agency_id=p.agency_id,
                agency_name=p.agency_name,
                company_name=p.company_name,
                closed_as=p.closed_as,
            )
            for p in c.people
        ],
        agencies=[ConversationAgency(**_tally(a), id=a.id, name=a.name, people=a.people) for a in c.agencies],
        pass_reasons=[PassReasonOut(**vars(r)) for r in c.pass_reasons],
    )
