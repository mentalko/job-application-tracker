import pytest

from jat.domain.document_performance import wilson

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
