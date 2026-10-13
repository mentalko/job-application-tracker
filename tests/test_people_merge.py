from datetime import date

from jat.domain.people import identity

from .factories import post


def test_identity_normalises_email_and_linkedin():
    assert identity("email", "  Alex@Northwind.Example.com ") == ("email", "alex@northwind.example.com")
    for url in (
        "https://www.linkedin.com/in/Alex-Morgan/",
        "linkedin.com/in/alex-morgan?trk=public_profile",
        "http://uk.linkedin.com/in/alex-morgan#about",
    ):
        assert identity("linkedin", url) == ("linkedin", "linkedin.com/in/alex-morgan")
    assert identity("url", "https://www.linkedin.com/in/alex-morgan") == ("linkedin", "linkedin.com/in/alex-morgan")
    assert identity("email", "mailto:Riley@Contoso.example.com") == ("email", "riley@contoso.example.com")
    assert identity("linkedin", "https://www.linkedin.com/in/j%C3%B6rg-m/") == ("linkedin", "linkedin.com/in/jörg-m")
    assert identity("linkedin", "linkedin.com/in/jörg-m") == ("linkedin", "linkedin.com/in/jörg-m")
    # Old /pub/ profiles: the whole path, since the name alone isn't unique.
    one = identity("url", "https://www.linkedin.com/pub/john-smith/1a/2b/3c")
    two = identity("url", "https://www.linkedin.com/pub/john-smith/4d/5e/6f/")
    assert one == ("linkedin", "linkedin.com/pub/john-smith/1a/2b/3c") and one != two
    assert identity("phone", "+44 7700 900000") is None  # phones can be shared (a switchboard)
    assert identity("url", "https://northwind.example.com") is None


def test_one_person_per_email_and_linkedin(client, seeded):
    alex = seeded["recruiter"]  # alex@northwind.example.com, +44 7700 900000
    client.patch(
        f"/api/v1/contacts/{alex['id']}",
        json={
            "details": [
                *({"kind": d["kind"], "value": d["value"]} for d in alex["details"]),
                {"kind": "linkedin", "value": "https://www.linkedin.com/in/alex-morgan/"},
            ]
        },
    )
    same_email = client.post(
        "/api/v1/contacts",
        json={"name": "A. Morgan", "details": [{"kind": "email", "value": "ALEX@northwind.example.com"}]},
    )
    assert same_email.status_code == 409
    assert "Alex Recruiter already has ALEX@northwind.example.com" in same_email.json()["detail"]
    same_profile = client.post(
        "/api/v1/contacts",
        json={"name": "Alex M", "details": [{"kind": "url", "value": "linkedin.com/in/Alex-Morgan"}]},
    )
    assert same_profile.status_code == 409 and "Alex Recruiter" in same_profile.json()["detail"]
    # A shared phone number (a switchboard) is fine.
    riley = post(
        client, "/api/v1/contacts", {"name": "Riley Chen", "details": [{"kind": "phone", "value": "+44 7700 900000"}]}
    )
    # Editing someone to take Alex's email is refused; keeping your own details isn't.
    taken = client.patch(
        f"/api/v1/contacts/{riley['id']}", json={"details": [{"kind": "email", "value": "alex@northwind.example.com"}]}
    )
    assert taken.status_code == 409
    again = client.patch(
        f"/api/v1/contacts/{alex['id']}",
        json={"title": "Director", "details": [{"kind": "email", "value": "alex@northwind.example.com"}]},
    )
    assert again.status_code == 200 and again.json()["title"] == "Director"


def test_merge_moves_everything_to_the_person_kept(client, seeded):
    alex = seeded["recruiter"]
    company = seeded["company"]["id"]
    dup = post(
        client,
        "/api/v1/contacts",
        {
            "name": "Alex Morgan",
            "title": "Principal Consultant",
            "details": [
                {"kind": "phone", "value": "+44 7700 900000"},  # Alex has it already
                {"kind": "linkedin", "value": "https://linkedin.com/in/alex-morgan"},
            ],
        },
    )
    client.patch(f"/api/v1/contacts/{dup['id']}", json={"awaiting_reply_since": "2026-10-01"})
    call = post(
        client,
        "/api/v1/meetings",
        {"contact_id": dup["id"], "status": "done", "starts_at": "2026-10-01T10:00:00+00:00"},
    )
    role = post(
        client,
        "/api/v1/roles",
        {"company_id": company, "title": "SRE", "contact_id": dup["id"], "meeting_id": call["id"]},
    )
    app = post(
        client,
        "/api/v1/applications",
        {"role_id": seeded["role"]["id"], "stage": "applied", "route": "agency", "recruiter_id": dup["id"]},
    )
    post(client, f"/api/v1/applications/{app['id']}/contacts", {"contact_id": dup["id"], "relation": "recruiter"})
    post(client, f"/api/v1/applications/{app['id']}/contacts", {"contact_id": alex["id"], "relation": "recruiter"})
    interview = post(
        client, f"/api/v1/applications/{app['id']}/interviews", {"title": "Screen", "interviewer_ids": [dup["id"]]}
    )
    ref = {"entity_type": "contact", "entity_id": dup["id"]}
    link = post(client, "/api/v1/links", {**ref, "url": "https://www.linkedin.com/in/alex-morgan"})
    todo = post(client, "/api/v1/todos", {"text": "Reply to Alex", **ref})
    note = post(client, "/api/v1/notes", {"title": "About Alex", "links": [f"contact:{dup['id']}"]})

    merged = client.post(f"/api/v1/contacts/{alex['id']}/merge", json={"from_id": dup["id"]})
    assert merged.status_code == 200, merged.text
    kept = merged.json()
    assert kept["id"] == alex["id"] and kept["name"] == "Alex Recruiter"
    assert kept["title"] == "Principal Consultant"  # Alex had none
    assert kept["awaiting_reply_since"] == "2026-10-01"
    # Details: Alex's, then the other record's new ones; the shared phone once.
    assert [(d["kind"], d["value"]) for d in kept["details"]] == [
        ("email", "alex@northwind.example.com"),
        ("phone", "+44 7700 900000"),
        ("linkedin", "https://linkedin.com/in/alex-morgan"),
    ]
    assert client.get(f"/api/v1/contacts/{dup['id']}").status_code == 404

    assert client.get(f"/api/v1/meetings/{call['id']}").json()["contact_id"] == alex["id"]
    assert client.get(f"/api/v1/roles/{role['id']}").json()["contact_id"] == alex["id"]
    detail = client.get(f"/api/v1/applications/{app['id']}").json()
    assert detail["recruiter_id"] == alex["id"]
    assert [(c["contact_id"], c["relation"]) for c in detail["contacts"]] == [(alex["id"], "recruiter")]
    rounds = client.get("/api/v1/interviews", params={"application_id": app["id"]}).json()
    assert [r["interviewer_ids"] for r in rounds if r["id"] == interview["id"]] == [[alex["id"]]]
    ref = {"entity_type": "contact", "entity_id": alex["id"]}
    assert [x["id"] for x in client.get("/api/v1/links", params=ref).json()] == [link["id"]]
    assert [t["id"] for t in client.get("/api/v1/todos", params=ref).json()] == [todo["id"]]
    notes = client.get("/api/v1/notes", params={"entity": f"contact:{alex['id']}"}).json()
    assert [n["id"] for n in notes] == [note["id"]]
    assert notes[0]["links"] == [f"contact:{alex['id']}"]


def test_merge_keeps_the_kept_persons_own_state_and_refuses_itself(client, seeded):
    alex = seeded["recruiter"]
    client.patch(f"/api/v1/contacts/{alex['id']}", json={"reply_to_read_since": str(date.today())})
    dup = post(client, "/api/v1/contacts", {"name": "Alex M"})
    client.patch(f"/api/v1/contacts/{dup['id']}", json={"closed_as": "ghosted"})
    kept = client.post(f"/api/v1/contacts/{alex['id']}/merge", json={"from_id": dup["id"]}).json()
    assert kept["reply_to_read_since"] == str(date.today()) and kept["closed_as"] is None
    same = client.post(f"/api/v1/contacts/{alex['id']}/merge", json={"from_id": alex["id"]})
    assert same.status_code == 422
    assert client.post(f"/api/v1/contacts/{alex['id']}/merge", json={"from_id": "nope"}).status_code == 404


def test_merge_moves_files_keeps_calls_roles_and_panels_and_relinks_notes(app, client, seeded):
    alex = seeded["recruiter"]
    company = seeded["company"]["id"]
    dup = post(
        client,
        "/api/v1/contacts",
        {
            "name": "Alex Morgan",
            "company_id": company,  # Alex is at an agency: he keeps that, not both
            "details": [{"kind": "url", "value": "https://www.linkedin.com/in/alex-morgan"}],
        },
    )
    # Alex has the same profile saved as a LinkedIn detail (allowed: it was there first).
    from jat.db.models import ContactDetail  # noqa: PLC0415

    with app.state.sessions() as s:
        s.add(ContactDetail(contact_id=alex["id"], kind="linkedin", value="linkedin.com/in/Alex-Morgan/", position=9))
        s.commit()

    call = post(
        client,
        "/api/v1/meetings",
        {"contact_id": dup["id"], "status": "done", "starts_at": "2026-10-01T10:00:00+00:00"},
    )
    role = post(
        client,
        "/api/v1/roles",
        {"company_id": company, "title": "SRE", "contact_id": dup["id"], "meeting_id": call["id"]},
    )
    app_ = post(client, "/api/v1/applications", {"role_id": seeded["role"]["id"], "stage": "applied"})
    both = post(
        client,
        f"/api/v1/applications/{app_['id']}/interviews",
        {"title": "Final", "interviewer_ids": [alex["id"], dup["id"]]},
    )
    upload = client.post(
        "/api/v1/attachments",
        files={"file": ("cv.pdf", b"%PDF-1.4 x", "application/pdf")},
        data={"entity_type": "contact", "entity_id": dup["id"]},
    )
    assert upload.status_code == 201, upload.text
    # A note written by hand outside the app, linked to the duplicate.
    notes_dir = app.state.jat.data_dir / "notes"
    notes_dir.mkdir(exist_ok=True)
    (notes_dir / "by-hand.md").write_text(
        "---\n"
        "id: 01a00000-0000-7000-8000-000000000001\n"
        "title: Alex, by hand\n"
        f"links: [contact:{dup['id']}, company:{company}]\n"
        "created: 2026-09-01T10:00:00Z\n"
        "updated: 2026-09-02T10:00:00Z\n"
        "---\n\nMet at a meetup.\n"
    )

    kept = client.post(f"/api/v1/contacts/{alex['id']}/merge", json={"from_id": dup["id"]})
    assert kept.status_code == 200, kept.text
    kept = kept.json()
    assert (kept["agency_id"], kept["company_id"]) == (alex["agency_id"], None)
    assert [d["kind"] for d in kept["details"]].count("linkedin") + [d["kind"] for d in kept["details"]].count(
        "url"
    ) == 1  # the same profile once, whatever kind it was saved as

    assert client.get(f"/api/v1/roles/{role['id']}").json()["meeting_id"] == call["id"]  # the call survived
    assert client.get(f"/api/v1/meetings/{call['id']}").json()["contact_id"] == alex["id"]
    rounds = client.get("/api/v1/interviews", params={"application_id": app_["id"]}).json()
    assert [r["interviewer_ids"] for r in rounds if r["id"] == both["id"]] == [[alex["id"]]]
    files = client.get("/api/v1/attachments", params={"entity_type": "contact", "entity_id": alex["id"]}).json()
    assert [f["original_name"] for f in files] == ["cv.pdf"]

    text = (notes_dir / "by-hand.md").read_text()
    assert alex["id"] in text and dup["id"] not in text and company in text  # relinked in the file
    note = client.get("/api/v1/notes", params={"entity": f"contact:{alex['id']}"}).json()
    assert [n["title"] for n in note] == ["Alex, by hand"]
    assert note[0]["updated_at"].startswith("2026-09-02")  # relinking isn't an edit
