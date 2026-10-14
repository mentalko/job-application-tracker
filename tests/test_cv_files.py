import pytest

from jat.api import documents as documents_api

from .factories import post

CV = b"%PDF-1.4\n% made-up demo CV, version two\n"
OTHER_CV = b"%PDF-1.4\n% made-up demo CV, fintech version\n"
AD = b"%PDF-1.4\n% made-up job ad\n"


def _app(client, seeded):
    return post(client, "/api/v1/applications", {"role_id": seeded["role"]["id"], "stage": "applied"})["id"]


def _attach(client, app_id, name, data, content_type="application/pdf"):
    r = client.post(
        "/api/v1/attachments",
        files={"file": (name, data, content_type)},
        data={"entity_type": "application", "entity_id": app_id},
    )
    assert r.status_code == 201, r.text
    return r.json()


def test_finds_cv_files_and_makes_them_versions(client, seeded, app):
    a, b, c = (_app(client, seeded) for _ in range(3))
    # The same file on two applications (whatever its name), a CV by name on one, and a job ad.
    _attach(client, a, "Alex Morgan.pdf", CV)
    _attach(client, b, "alex-morgan-2026.pdf", CV)
    _attach(client, c, "Backend_CV.pdf", OTHER_CV)
    _attach(client, c, "Job description.pdf", AD)
    _attach(client, a, "notes.txt", b"not a CV", "text/plain")

    found = client.get("/api/v1/cv-files").json()
    assert [(f["name"], len(f["applications"]), f["version"]) for f in found] == [
        ("Alex Morgan.pdf", 2, None),
        ("Backend_CV.pdf", 1, None),
    ]

    # Make the shared one v2 of a new CV: recorded as sent with both applications.
    sha = found[0]["sha256"]
    r = client.post("/api/v1/cv-files/adopt", json={"sha256": sha, "document_name": "Backend CV", "label": "v2"})
    assert r.status_code == 201, r.text
    made = r.json()
    assert made["recorded"] == 2
    doc = client.get(f"/api/v1/documents/{made['document_id']}").json()
    [version] = doc["versions"]
    assert (version["label"], version["used_in"], version["file"]["original_name"]) == ("v2", 2, "Alex Morgan.pdf")
    # The version has its own copy of the file.
    copy = app.state.jat.data_dir / "files" / version["file"]["path"]
    assert copy.read_bytes() == CV
    assert [d["version_label"] for d in client.get(f"/api/v1/applications/{a}").json()["documents"]] == ["v2"]
    # It's no longer suggested; the other one goes into the same CV, labelled after its file.
    found = client.get("/api/v1/cv-files").json()
    assert [f["name"] for f in found] == ["Backend_CV.pdf"]
    r = client.post("/api/v1/cv-files/adopt", json={"sha256": found[0]["sha256"], "document_id": made["document_id"]})
    assert r.status_code == 201, r.text
    labels = [v["label"] for v in client.get(f"/api/v1/documents/{made['document_id']}").json()["versions"]]
    assert sorted(labels) == ["Backend_CV", "v2"]
    assert client.get("/api/v1/cv-files").json() == []

    # The same CV attached to another application later: offered as "record it" against v2.
    d = _app(client, seeded)
    _attach(client, d, "cv.pdf", CV)
    [again] = client.get("/api/v1/cv-files").json()
    assert again["version"]["label"] == "v2"
    assert [x["has_it"] for x in again["applications"]] == [True, True, False]
    r = client.post("/api/v1/cv-files/adopt", json={"sha256": again["sha256"]})
    assert r.json()["recorded"] == 1
    assert client.get("/api/v1/cv-files").json() == []


def test_adopting_needs_a_document_and_a_known_file(client, seeded):
    a = _app(client, seeded)
    _attach(client, a, "My CV.pdf", CV)
    [found] = client.get("/api/v1/cv-files").json()
    assert client.post("/api/v1/cv-files/adopt", json={"sha256": found["sha256"]}).status_code == 422
    assert client.post("/api/v1/cv-files/adopt", json={"sha256": "0" * 64, "document_name": "X"}).status_code == 404
    # Neither made a document.
    assert client.get("/api/v1/documents").json() == []


@pytest.mark.parametrize(
    ("name", "looks"),
    [
        ("Kai_Waddington_Resume.pdf", True),
        ("Resume_2026.pdf", True),
        ("Curriculum_Vitae.pdf", True),
        ("CV2026.pdf", True),
        ("my cv.pdf", True),
        ("Résumé.pdf", True),
        ("xcv-notes.pdf", False),
        ("Job description.pdf", False),
        ("Recovery plan.pdf", False),
    ],
)
def test_names_that_look_like_a_cv(name, looks):
    assert documents_api._looks_like_cv(name) is looks


def test_only_pdf_and_word_files(client, seeded):
    a = _app(client, seeded)
    _attach(client, a, "CV.docx", b"word cv", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
    _attach(client, a, "CV.xlsx", b"sheet", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    _attach(client, a, "CV.png", b"image", "image/png")
    assert [f["name"] for f in client.get("/api/v1/cv-files").json()] == ["CV.docx"]


def test_sent_on_is_the_day_you_applied_and_the_original_stays(client, seeded, app):
    a = post(
        client,
        "/api/v1/applications",
        {"role_id": seeded["role"]["id"], "stage": "applied", "applied_on": "2026-09-01"},
    )["id"]
    original = _attach(client, a, "My CV.pdf", CV)
    _attach(client, a, "My CV (copy).pdf", CV)  # the same file twice on one application: once
    [found] = client.get("/api/v1/cv-files").json()
    assert len(found["applications"]) == 1
    r = client.post("/api/v1/cv-files/adopt", json={"sha256": found["sha256"], "document_name": "CV"})
    assert r.json()["recorded"] == 1
    [sent] = client.get(f"/api/v1/applications/{a}").json()["documents"]
    assert sent["sent_on"] == "2026-09-01"
    assert client.get(f"/api/v1/attachments/{original['id']}").status_code == 200
    assert (app.state.jat.data_dir / "files" / original["path"]).read_bytes() == CV
    # Adopting it again finds nothing to do.
    assert (
        client.post("/api/v1/cv-files/adopt", json={"sha256": found["sha256"], "document_name": "X"}).status_code == 404
    )


def test_a_file_that_is_a_version_of_two_documents_isnt_recorded_twice(client, seeded):
    a, b = _app(client, seeded), _app(client, seeded)
    for app_id in (a, b):
        _attach(client, app_id, "CV.pdf", CV)
    sha = client.get("/api/v1/cv-files").json()[0]["sha256"]
    client.post("/api/v1/cv-files/adopt", json={"sha256": sha, "document_name": "Backend CV"})
    # The same file uploaded as a version of a second CV: both applications already have it.
    other = post(client, "/api/v1/documents", {"kind": "cv", "name": "Platform CV"})["id"]
    r = client.post(
        f"/api/v1/documents/{other}/versions", data={"label": "v1"}, files={"file": ("CV.pdf", CV, "application/pdf")}
    )
    assert r.status_code == 201, r.text
    assert client.get("/api/v1/cv-files").json() == []


def test_a_failed_adopt_leaves_nothing_behind(client, seeded, app, monkeypatch):
    a = _app(client, seeded)
    _attach(client, a, "My CV.pdf", CV)
    [found] = client.get("/api/v1/cv-files").json()
    files = app.state.jat.data_dir / "files"
    before = sorted(p for p in files.rglob("*") if p.is_file())

    def boom(*args, **kwargs):
        raise RuntimeError("disk full")

    monkeypatch.setattr(documents_api.svc, "log_activity", boom)
    with pytest.raises(RuntimeError):
        client.post("/api/v1/cv-files/adopt", json={"sha256": found["sha256"], "document_name": "CV"})
    assert client.get("/api/v1/documents").json() == []
    assert sorted(p for p in files.rglob("*") if p.is_file()) == before


def _attach_to(client, entity_type, entity_id, name, data):
    r = client.post(
        "/api/v1/attachments",
        files={"file": (name, data, "application/pdf")},
        data={"entity_type": entity_type, "entity_id": entity_id},
    )
    assert r.status_code == 201, r.text


def test_cvs_on_roles_and_people_count_for_their_applications(client, seeded):
    alex = seeded["recruiter"]["id"]
    company = seeded["company"]["id"]
    role = post(client, "/api/v1/roles", {"company_id": company, "title": "Platform Engineer", "contact_id": alex})[
        "id"
    ]
    via_alex = post(
        client,
        "/api/v1/applications",
        {"role_id": role, "stage": "applied", "route": "agency", "recruiter_id": alex},
    )["id"]
    # Another of Alex's applications already has a CV recorded: the one sent to Alex doesn't claim it.
    other_role = post(client, "/api/v1/roles", {"company_id": company, "title": "SRE"})["id"]
    recorded = post(
        client,
        "/api/v1/applications",
        {"role_id": other_role, "stage": "applied", "route": "agency", "recruiter_id": alex},
    )["id"]
    _attach(client, recorded, "Old CV.pdf", OTHER_CV)
    sha_old = next(f["sha256"] for f in client.get("/api/v1/cv-files").json())
    client.post("/api/v1/cv-files/adopt", json={"sha256": sha_old, "document_name": "Backend CV", "label": "v1"})

    _attach_to(client, "contact", alex, "CV for Alex.pdf", CV)
    _attach_to(client, "role", role, "Tailored CV.pdf", AD)  # a CV on the role
    found = {f["name"]: f for f in client.get("/api/v1/cv-files").json()}
    sent_to_alex = found["CV for Alex.pdf"]
    assert [(x["kind"], x["name"]) for x in sent_to_alex["sources"]] == [("contact", "Alex Recruiter")]
    assert [a["id"] for a in sent_to_alex["applications"]] == [via_alex]
    on_role = found["Tailored CV.pdf"]
    assert [(x["kind"], x["name"]) for x in on_role["sources"]] == [("role", "Platform Engineer at Contoso")]
    assert [a["id"] for a in on_role["applications"]] == [via_alex]

    # Choose the applications: none here, so it's a version recorded nowhere yet.
    r = client.post(
        "/api/v1/cv-files/adopt",
        json={"sha256": sent_to_alex["sha256"], "document_name": "Backend CV", "label": "v2", "application_ids": []},
    )
    assert r.status_code == 201, r.text
    assert r.json()["recorded"] == 0
    # It's still offered for that application, now as a version to record.
    again = next(f for f in client.get("/api/v1/cv-files").json() if f["sha256"] == sent_to_alex["sha256"])
    assert again["version"]["label"] == "v2"
    bad = client.post("/api/v1/cv-files/adopt", json={"sha256": again["sha256"], "application_ids": [recorded]})
    assert bad.status_code == 422
    r = client.post("/api/v1/cv-files/adopt", json={"sha256": again["sha256"], "application_ids": [via_alex]})
    assert r.json()["recorded"] == 1
    # Now via_alex has a CV, so the role's file no longer claims it.
    on_role = next(f for f in client.get("/api/v1/cv-files").json() if f["name"] == "Tailored CV.pdf")
    assert on_role["applications"] == []


def test_a_cv_sent_to_a_recruiter_before_any_application(client, seeded):
    sam = post(client, "/api/v1/contacts", {"name": "Sam Patel"})["id"]
    _attach_to(client, "contact", sam, "Resume.pdf", CV)
    [found] = client.get("/api/v1/cv-files").json()
    assert found["applications"] == [] and found["sources"][0]["name"] == "Sam Patel"


def test_a_job_ad_on_a_role_and_its_application_isnt_a_cv(client, seeded):
    role = seeded["role"]["id"]
    a = post(client, "/api/v1/applications", {"role_id": role, "stage": "applied"})["id"]
    _attach_to(client, "role", role, "Job description.pdf", AD)
    _attach(client, a, "Job description.pdf", AD)
    assert client.get("/api/v1/cv-files").json() == []


def test_a_cv_sent_to_someone_on_the_people_card(client, seeded):
    hm = post(client, "/api/v1/contacts", {"name": "Riley Chen"})["id"]
    a = post(client, "/api/v1/applications", {"role_id": seeded["role"]["id"], "stage": "applied", "applied_on": None})[
        "id"
    ]
    b = post(client, "/api/v1/applications", {"role_id": seeded["role"]["id"], "stage": "applied"})["id"]
    for app_id in (a, b):
        r = client.post(
            f"/api/v1/applications/{app_id}/contacts", json={"contact_id": hm, "relation": "hiring_manager"}
        )
        assert r.status_code in (200, 201), r.text
    _attach_to(client, "contact", hm, "CV.pdf", CV)
    [found] = client.get("/api/v1/cv-files").json()
    assert sorted(x["id"] for x in found["applications"]) == sorted([a, b])
    # Only one of them got it: the other stays on offer.
    r = client.post(
        "/api/v1/cv-files/adopt",
        json={"sha256": found["sha256"], "document_name": "CV", "label": "v1", "application_ids": [a]},
    )
    assert r.json()["recorded"] == 1
    [again] = client.get("/api/v1/cv-files").json()
    assert {x["id"]: x["has_it"] for x in again["applications"]} == {a: True, b: False}
    # Sent on the day the file went to them (no applied date).
    [sent] = client.get(f"/api/v1/applications/{a}").json()["documents"]
    assert sent["sent_on"] is not None
