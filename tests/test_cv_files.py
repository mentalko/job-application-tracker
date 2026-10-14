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
    # A failed adopt leaves nothing behind.
    assert client.get("/api/v1/documents").json() == []
