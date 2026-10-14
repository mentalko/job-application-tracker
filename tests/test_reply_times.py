from datetime import date, timedelta

from sqlalchemy import text

from jat.db import make_engine, migrate
from jat.domain.replies import working_days

from .factories import post


def test_working_days_skip_weekends():
    fri, sat, sun, mon = date(2026, 10, 9), date(2026, 10, 10), date(2026, 10, 11), date(2026, 10, 12)
    assert working_days(fri, fri) == 0  # the same day
    assert working_days(fri, mon) == 1  # Friday to Monday: one working day
    assert working_days(sat, sun) == 0
    assert working_days(mon, mon + timedelta(days=7)) == 5
    assert working_days(fri, fri + timedelta(days=14)) == 10
    assert working_days(mon, mon + timedelta(days=4)) == 4  # Monday to Friday
    assert working_days(mon, mon - timedelta(days=3)) == 0  # replied "before" waiting: none


def _person(client, seeded, **body):
    r = client.patch(f"/api/v1/contacts/{seeded['recruiter']['id']}", json=body)
    assert r.status_code == 200, r.text
    return r.json()


def _monday_weeks_ago(weeks: int) -> date:
    today = date.today()
    return today - timedelta(days=today.weekday() + 7 * weeks)


def test_a_person_usually_replies_within(client, seeded):
    assert _person(client, seeded)["usual_reply_days"] is None
    start = _monday_weeks_ago(3)
    # Waiting from a Monday, they replied on the Wednesday: two working days.
    _person(client, seeded, awaiting_reply_since=start.isoformat())
    _person(client, seeded, reply_to_read_since=(start + timedelta(days=2)).isoformat())
    _person(client, seeded, reply_to_read_since=None)
    # Waiting from a Friday, they replied the next Tuesday: two working days again.
    friday = start + timedelta(days=11)
    _person(client, seeded, awaiting_reply_since=friday.isoformat())
    out = _person(client, seeded, reply_to_read_since=(friday + timedelta(days=4)).isoformat())
    assert (out["replies"], out["usual_reply_days"]) == (2, 2)
    listed = {c["id"]: c for c in client.get("/api/v1/contacts").json()}
    assert listed[seeded["recruiter"]["id"]]["usual_reply_days"] == 2


def test_chasing_and_ghosting_arent_replies(client, seeded):
    start = _monday_weeks_ago(2)
    _person(client, seeded, awaiting_reply_since=start.isoformat())
    # A chase waits again from a new day: no reply.
    assert _person(client, seeded, chased_on=(start + timedelta(days=3)).isoformat())["replies"] == 0
    # Ghosted, then Undo (the UI puts every field back as it was): still no reply.
    before = {"awaiting_reply_since": (start + timedelta(days=3)).isoformat(), "reply_to_read_since": None}
    assert _person(client, seeded, closed_as="ghosted")["replies"] == 0
    assert _person(client, seeded, **before, closed_as=None, closed_on=None, chased_on=None)["replies"] == 0


def test_a_reply_stays_when_you_wait_on_them_again_the_same_day(client, seeded):
    today = date.today().isoformat()
    _person(client, seeded, awaiting_reply_since=today)
    assert _person(client, seeded, reply_to_read_since=today)["replies"] == 1
    # You answer them straight away and wait again: their reply still counts.
    out = _person(client, seeded, awaiting_reply_since=today)
    assert (out["replies"], out["usual_reply_days"]) == (1, 0)


def test_deleting_an_application_keeps_the_reply(client, seeded):
    alex = seeded["recruiter"]["id"]
    body = {"role_id": seeded["role"]["id"], "stage": "applied", "route": "agency", "recruiter_id": alex}
    app = post(client, "/api/v1/applications", body)["id"]
    client.patch(f"/api/v1/applications/{app}", json={"awaiting_reply_since": _monday_weeks_ago(1).isoformat()})
    client.patch(f"/api/v1/applications/{app}", json={"awaiting_reply_since": None})
    assert client.delete(f"/api/v1/applications/{app}").status_code == 204
    assert client.get(f"/api/v1/contacts/{alex}").json()["replies"] == 1


def test_an_application_counts_for_its_recruiter(client, seeded):
    alex = seeded["recruiter"]["id"]
    body = {"role_id": seeded["role"]["id"], "stage": "applied", "route": "agency", "recruiter_id": alex}
    app = post(client, "/api/v1/applications", body)["id"]
    waited = _monday_weeks_ago(1).isoformat()
    client.patch(f"/api/v1/applications/{app}", json={"awaiting_reply_since": waited})
    # Moving it on means they got back to you; undoing the move takes that back.
    assert client.post(f"/api/v1/applications/{app}/move", json={"to_stage": "screen"}).status_code == 200
    assert client.get(f"/api/v1/contacts/{alex}").json()["replies"] == 1
    assert client.post(f"/api/v1/applications/{app}/undo").status_code == 200
    assert client.get(f"/api/v1/contacts/{alex}").json()["replies"] == 0
    # Withdrawing yourself isn't a reply; They've replied is.
    assert client.post(f"/api/v1/applications/{app}/move", json={"to_stage": "withdrawn"}).status_code == 200
    assert client.get(f"/api/v1/contacts/{alex}").json()["replies"] == 0
    other = post(client, "/api/v1/applications", body)["id"]
    client.patch(f"/api/v1/applications/{other}", json={"awaiting_reply_since": waited})
    client.patch(f"/api/v1/applications/{other}", json={"reply_to_read_since": date.today().isoformat()})
    assert client.get(f"/api/v1/contacts/{alex}").json()["replies"] == 1


def test_merging_people_keeps_their_replies(client, seeded):
    alex = seeded["recruiter"]["id"]
    twin = post(client, "/api/v1/contacts", {"name": "Alex R"})["id"]
    start = _monday_weeks_ago(2).isoformat()
    client.patch(f"/api/v1/contacts/{twin}", json={"awaiting_reply_since": start})
    client.patch(f"/api/v1/contacts/{twin}", json={"awaiting_reply_since": None})
    r = client.post(f"/api/v1/contacts/{alex}/merge", json={"from_id": twin})
    assert r.status_code == 200, r.text
    assert r.json()["replies"] == 1


def test_0011_backfills_replies_from_application_history(tmp_path):
    path = tmp_path / "old.sqlite3"
    migrate(path, "0010")
    eng = make_engine(path)
    ts = "'2026-01-01T00:00:00Z'"
    with eng.begin() as conn:
        conn.execute(text(f"INSERT INTO companies (id, name, created_at, updated_at) VALUES ('c', 'C', {ts}, {ts})"))
        conn.execute(text(f"INSERT INTO contacts (id, name, created_at, updated_at) VALUES ('p', 'P', {ts}, {ts})"))
        conn.execute(
            text(
                f"INSERT INTO roles (id, company_id, title, created_at, updated_at) VALUES ('r', 'c', 'T', {ts}, {ts})"
            )
        )
        for app_id, recruiter in (("a", "'p'"), ("b", "NULL")):
            conn.execute(
                text(
                    "INSERT INTO applications (id, role_id, route, recruiter_id, stage, last_activity_at, tags, "
                    f"archived, created_at, updated_at) VALUES ('{app_id}', 'r', 'direct', {recruiter}, 'screen', "
                    f"{ts}, '[]', 0, {ts}, {ts})"
                )
            )
        events = [
            # a: waiting on Fri 2 Oct, they replied Tue 6 Oct; then waiting again and it moved on.
            ("e1", "a", "manual", None, "2026-10-02T09:00:00Z", '{"awaiting_reply": true}'),
            ("e2", "a", "manual", None, "2026-10-06T09:00:00Z", '{"reply_to_read": true}'),
            ("e3", "a", "manual", None, "2026-10-07T09:00:00Z", '{"awaiting_reply": true}'),
            ("e4", "a", "stage_change", "screen", "2026-10-09T09:00:00Z", '{"was_waiting_since": "2026-10-07"}'),
            # b: waiting, then you withdrew (yours), and a move that was undone.
            ("e5", "b", "stage_change", "withdrawn", "2026-10-09T09:00:00Z", '{"was_waiting_since": "2026-10-01"}'),
            ("e6", "b", "stage_change", "screen", "2026-10-10T09:00:00Z", '{"was_waiting_since": "2026-10-01"}'),
            ("e7", "b", "stage_change", "withdrawn", "2026-10-10T10:00:00Z", '{"undo_of": "e6"}'),
            # Malformed history is skipped, not fatal.
            ("e8", "b", "manual", None, "2026-10-11T09:00:00Z", "null"),
            ("e9", "b", "manual", None, "2026-10-11T09:00:00Z", "[]"),
            ("e10", "b", "manual", None, "2026-10-11T09:00:00Z", "{bad"),
            ("e11", "b", "stage_change", "screen", "2026-10-12T09:00:00Z", '{"was_waiting_since": "soon"}'),
            ("e12", "b", "stage_change", "accepted", "2026-10-13T09:00:00Z", '{"was_waiting_since": "2026-10-12"}'),
        ]
        for seq, (eid, app_id, kind, to_stage, at, data) in enumerate(events, start=1):
            stage = f"'{to_stage}'" if to_stage else "NULL"
            conn.execute(
                text(
                    "INSERT INTO events (id, seq, application_id, kind, to_stage, occurred_at, data, created_at) "
                    f"VALUES ('{eid}', {seq}, '{app_id}', '{kind}', {stage}, '{at}', '{data}', {ts})"
                )
            )
    eng.dispose()
    migrate(path)
    eng = make_engine(path)
    with eng.connect() as conn:
        rows = conn.execute(
            text(
                "SELECT contact_id, application_id, waited_since, replied_on, event_id FROM replies ORDER BY replied_on"
            )
        ).all()
    eng.dispose()
    assert [tuple(r) for r in rows] == [
        ("p", "a", "2026-10-02", "2026-10-06", None),
        ("p", "a", "2026-10-07", "2026-10-09", "e4"),
    ]


def test_your_own_moves_arent_replies():
    from jat.domain.replies import is_reply_move
    from jat.domain.workflow import DEFAULT_WORKFLOW as W

    assert is_reply_move(W, "screen") and is_reply_move(W, "rejected")
    assert not any(is_reply_move(W, s) for s in ("withdrawn", "declined", "ghosted", "accepted"))
