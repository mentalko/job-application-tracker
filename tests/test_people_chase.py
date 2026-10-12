def test_chasing_someone_means_waiting_again(client, seeded):
    alex = seeded["recruiter"]["id"]
    url = f"/api/v1/contacts/{alex}"
    client.patch(url, json={"awaiting_reply_since": "2026-09-20"})
    r = client.patch(url, json={"chased_on": "2026-10-01"}).json()
    assert r["chased_on"] == "2026-10-01" and r["awaiting_reply_since"] == "2026-10-01"
    out = client.get("/api/v1/next-actions").json()
    assert [p["id"] for p in out["waiting_people"]] == [alex]
    titles = [i["title"] for i in client.get("/api/v1/timeline").json()["items"]]
    assert "Chased Alex Recruiter" in titles
    # Not also "replied; waiting" for the same day.
    assert "Replied to Alex Recruiter; waiting to hear back" not in titles
    # A date with nothing closed is ignored.
    assert client.patch(url, json={"closed_on": "2026-10-04"}).json()["closed_on"] is None

    # Chasing someone whose reply you'd still to read: you've read it, and you're waiting again.
    client.patch(url, json={"reply_to_read_since": "2026-10-02"})
    r = client.patch(url, json={"chased_on": "2026-10-03"}).json()
    assert r["reply_to_read_since"] is None and r["awaiting_reply_since"] == "2026-10-03"


def test_ghosted_and_not_interested_close_the_conversation(client, seeded):
    alex = seeded["recruiter"]["id"]
    url = f"/api/v1/contacts/{alex}"
    client.patch(url, json={"awaiting_reply_since": "2026-09-20"})
    r = client.patch(url, json={"closed_as": "ghosted", "closed_on": "2026-10-05"}).json()
    assert (r["closed_as"], r["closed_on"], r["awaiting_reply_since"]) == ("ghosted", "2026-10-05", None)
    out = client.get("/api/v1/next-actions").json()
    assert out["waiting_people"] == [] and out["to_read_people"] == []
    titles = [i["title"] for i in client.get("/api/v1/timeline").json()["items"]]
    assert "Alex Recruiter: ghosted" in titles

    # A reply to read is cleared too; the date defaults to today.
    client.patch(url, json={"closed_as": None})
    client.patch(url, json={"reply_to_read_since": "2026-10-06"})
    r = client.patch(url, json={"closed_as": "not_interested"}).json()
    assert r["closed_as"] == "not_interested" and r["closed_on"] is not None
    assert r["reply_to_read_since"] is None

    # They get in touch again: waiting (or a reply to read) reopens it.
    r = client.patch(url, json={"reply_to_read_since": "2026-10-08"}).json()
    assert r["closed_as"] is None and r["closed_on"] is None
    assert [p["id"] for p in client.get("/api/v1/next-actions").json()["to_read_people"]] == [alex]

    # Reopening by hand clears the date as well.
    client.patch(url, json={"closed_as": "ghosted"})
    r = client.patch(url, json={"closed_as": None}).json()
    assert r["closed_as"] is None and r["closed_on"] is None
    assert client.patch(url, json={"closed_as": "bored"}).status_code == 422
