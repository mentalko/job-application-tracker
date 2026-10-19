from datetime import UTC, datetime, timedelta

import pytest

from jat.domain.document_performance import applied_rank, wilson
from jat.domain.insights import stage_rank
from jat.domain.workflow import workflow_from_config

from .factories import post


def _version(client, doc_id, label):
    r = client.post(f"/api/v1/documents/{doc_id}/versions", data={"label": label})
    assert r.status_code == 201, r.text
    return r.json()["id"]


def _move(client, app_id, stage):
    r = client.post(f"/api/v1/applications/{app_id}/move", json={"to_stage": stage})
    assert r.status_code == 200, r.text


def _send(client, app_id, version_id):
    post(client, f"/api/v1/applications/{app_id}/documents", {"document_version_id": version_id})


def test_cv_versions_compared(client, seeded):
    role = seeded["role"]["id"]
    cv = post(client, "/api/v1/documents", {"kind": "cv", "name": "Backend CV"})["id"]
    v1, v2 = _version(client, cv, "v1"), _version(client, cv, "v2")
    letter = post(client, "/api/v1/documents", {"kind": "cover_letter", "name": "Short letter"})["id"]
    l1 = _version(client, letter, "plain")

    def app(stage="applied", route="direct", sent=()):
        body = {"role_id": role, "stage": stage, "route": route}
        if route == "agency":
            body["agency_id"] = seeded["agency"]["id"]
        a = post(client, "/api/v1/applications", body)["id"]
        for v in sent:
            _send(client, a, v)
        return a

    # v1: a screen (heard back, got past the CV), a rejection (a reply), and one you withdrew.
    _move(client, app(sent=(v1, l1)), "screen")
    _move(client, app(sent=(v1,)), "rejected")
    _move(client, app(sent=(v1,)), "withdrawn")
    # v2: ghosted, an interview round with no move, and one still at Interested but sent.
    _move(client, app(sent=(v2,)), "ghosted")
    a4 = app(sent=(v2,))
    post(client, f"/api/v1/applications/{a4}/interviews", {"round": 1, "title": "Screen"})
    app(stage="interested", sent=(v2,))
    # No CV recorded, through an agency, with an offer; and one not sent yet (left out).
    a5 = app(route="agency")
    post(client, f"/api/v1/applications/{a5}/offers", {"salary": 90_000, "currency": "GBP"})
    app(stage="interested")

    out = client.get("/api/v1/insights/documents").json()
    assert out["applications"] == 7
    cvs, letters = out["kinds"]
    assert (cvs["kind"], letters["kind"]) == ("cv", "cover_letter")
    [backend] = cvs["documents"]
    assert backend["name"] == "Backend CV" and backend["sent"] == 6
    by = {v["label"]: v for v in backend["versions"]}
    assert [v["label"] for v in backend["versions"]] == ["v1", "v2"]

    def counts(t):
        return (t["sent"], t["heard_back"], t["interviewed"], t["offers"], t["open"], t["ghosted"], t["closed"])

    assert counts(by["v1"]) == (3, 2, 1, 0, 1, 0, 2)
    assert counts(by["v2"]) == (3, 1, 1, 0, 2, 1, 0)
    assert by["v1"]["interview_rate"] == pytest.approx(0.333)
    assert 0 < by["v1"]["interview_low"] < 0.333 < by["v1"]["interview_high"] < 1
    assert by["v1"]["median_reply_days"] is not None
    assert counts(cvs["none"]) == (1, 1, 0, 1, 1, 0, 0)
    assert [d["name"] for d in letters["documents"]] == ["Short letter"]
    assert letters["documents"][0]["sent"] == 1 and letters["none"]["sent"] == 6

    direct = client.get("/api/v1/insights/documents", params={"route": "direct"}).json()
    assert direct["applications"] == 6 and direct["kinds"][0]["none"]["sent"] == 0


def test_moving_it_to_applied_yourself_isnt_hearing_back(client, seeded):
    cv = post(client, "/api/v1/documents", {"kind": "cv", "name": "Backend CV"})["id"]
    v1 = _version(client, cv, "v1")
    a = post(client, "/api/v1/applications", {"role_id": seeded["role"]["id"], "stage": "interested"})["id"]
    _send(client, a, v1)
    _move(client, a, "applied")
    [version] = client.get("/api/v1/insights/documents").json()["kinds"][0]["documents"][0]["versions"]
    assert (version["sent"], version["heard_back"], version["median_reply_days"]) == (1, 0, None)


def test_adding_it_at_screen_has_no_reply_time(client, seeded):
    # Added at Screen: past the CV, but the move on from Interested is the app's, not a reply.
    cv = post(client, "/api/v1/documents", {"kind": "cv", "name": "Backend CV"})["id"]
    v1 = _version(client, cv, "v1")
    a = post(client, "/api/v1/applications", {"role_id": seeded["role"]["id"], "stage": "screen"})["id"]
    _send(client, a, v1)
    [version] = client.get("/api/v1/insights/documents").json()["kinds"][0]["documents"][0]["versions"]
    assert (version["sent"], version["heard_back"], version["median_reply_days"]) == (1, 1, None)


def test_no_documents_yet(client, seeded):
    out = client.get("/api/v1/insights/documents").json()
    assert out == {
        "applications": 0,
        "kinds": [
            {
                "kind": "cv",
                "documents": [],
                "none": {
                    "sent": 0,
                    "heard_back": 0,
                    "interviewed": 0,
                    "offers": 0,
                    "open": 0,
                    "ghosted": 0,
                    "closed": 0,
                    "reply_rate": None,
                    "interview_rate": None,
                    "interview_low": None,
                    "interview_high": None,
                    "median_reply_days": None,
                },
            }
        ],
    }


def test_wilson_interval():
    assert wilson(0, 0) is None
    low, high = wilson(0, 3)
    assert low == 0 and 0.5 < high < 0.6
    low, high = wilson(50, 100)
    assert low == pytest.approx(0.404, abs=0.001) and high == pytest.approx(0.596, abs=0.001)


def _iso(days_ago: float) -> str:
    return (datetime.now(UTC) - timedelta(days=days_ago)).replace(microsecond=0).isoformat()


def test_closed_before_applying_wasnt_sent(client, seeded):
    role = seeded["role"]["id"]
    for stage in ("withdrawn", "rejected"):
        a = post(client, "/api/v1/applications", {"role_id": role, "stage": "interested"})["id"]
        _move(client, a, stage)
    out = client.get("/api/v1/insights/documents").json()
    assert out["applications"] == 0 and out["kinds"][0]["none"]["sent"] == 0


def test_one_application_with_two_versions_counts_once_for_the_document(client, seeded):
    cv = post(client, "/api/v1/documents", {"kind": "cv", "name": "Backend CV"})["id"]
    v1, v2 = _version(client, cv, "v1"), _version(client, cv, "v2")
    other = post(client, "/api/v1/documents", {"kind": "cv", "name": "Frontend CV"})["id"]
    f1 = _version(client, other, "v1")
    a = post(client, "/api/v1/applications", {"role_id": seeded["role"]["id"], "stage": "applied"})["id"]
    for v in (v1, v2, f1):
        _send(client, a, v)
    [cvs] = [k for k in client.get("/api/v1/insights/documents").json()["kinds"] if k["kind"] == "cv"]
    docs = {d["name"]: d for d in cvs["documents"]}
    assert docs["Backend CV"]["sent"] == 1
    assert [v["sent"] for v in docs["Backend CV"]["versions"]] == [1, 1]
    assert docs["Frontend CV"]["sent"] == 1 and cvs["none"]["sent"] == 0


def test_reply_time_counts_from_applying(client, seeded):
    cv = post(client, "/api/v1/documents", {"kind": "cv", "name": "Backend CV"})["id"]
    v1 = _version(client, cv, "v1")
    # Added as Interested, applied four days ago, heard back a day later.
    a = post(client, "/api/v1/applications", {"role_id": seeded["role"]["id"], "stage": "interested"})["id"]
    _send(client, a, v1)
    r = client.post(f"/api/v1/applications/{a}/move", json={"to_stage": "applied", "occurred_at": _iso(4)})
    assert r.status_code == 200, r.text
    r = client.post(f"/api/v1/applications/{a}/move", json={"to_stage": "screen", "occurred_at": _iso(3)})
    assert r.status_code == 200, r.text
    [version] = client.get("/api/v1/insights/documents").json()["kinds"][0]["documents"][0]["versions"]
    assert version["median_reply_days"] == 1.0


def test_the_date_range_is_by_when_applications_were_added(client, seeded):
    post(client, "/api/v1/applications", {"role_id": seeded["role"]["id"], "stage": "applied"})
    later = client.get("/api/v1/insights/documents", params={"since": _iso(-1)}).json()
    assert later["applications"] == 0
    assert client.get("/api/v1/insights/documents", params={"since": _iso(1)}).json()["applications"] == 1


def test_applied_in_a_workflow_without_an_applied_stage():
    wf = workflow_from_config(
        {
            "initial": "lead",
            "stages": [{"id": "lead"}, {"id": "submitted"}, {"id": "screen"}, {"id": "gone", "kind": "closed"}],
        }
    )
    rank = stage_rank(wf)
    assert applied_rank(wf, rank) == rank["submitted"]


def test_custom_workflow_end_to_end(app, client):
    (app.state.jat.data_dir / "config.toml").write_text(
        '[workflow]\ninitial = "lead"\n'
        '[[workflow.stages]]\nid = "lead"\n'
        '[[workflow.stages]]\nid = "submitted"\n'
        '[[workflow.stages]]\nid = "screen"\n'
        '[[workflow.stages]]\nid = "gone"\nkind = "closed"\n'
    )
    company = post(client, "/api/v1/companies", {"name": "Fabrikam"})["id"]
    role = post(client, "/api/v1/roles", {"company_id": company, "title": "SRE"})["id"]
    lead = post(client, "/api/v1/applications", {"role_id": role, "stage": "lead"})["id"]  # not sent
    sent = post(client, "/api/v1/applications", {"role_id": role, "stage": "lead"})["id"]
    _move(client, sent, "submitted")  # yours: not a reply
    screened = post(client, "/api/v1/applications", {"role_id": role, "stage": "lead"})["id"]
    _move(client, screened, "submitted")
    _move(client, screened, "screen")
    assert lead
    none = client.get("/api/v1/insights/documents").json()["kinds"][0]["none"]
    assert (none["sent"], none["heard_back"], none["interviewed"]) == (2, 1, 1)
