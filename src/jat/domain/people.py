"""People: one person per email address and LinkedIn profile, and merging two records of the
same person into one.
"""

from __future__ import annotations

import re
from collections.abc import Iterable

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from jat.db.models import (
    Application,
    ApplicationContact,
    Attachment,
    Contact,
    ContactDetail,
    InterviewContact,
    Link,
    Meeting,
    NoteIndex,
    Role,
    Todo,
)
from jat.storage.notes import NoteStore

_LINKEDIN = re.compile(r"^(?:https?://)?(?:[a-z]{2,3}\.)?(?:www\.)?linkedin\.com/(in|pub)/([^/?#]+)", re.I)


def identity(kind: str, value: str) -> tuple[str, str] | None:
    """What makes a detail point at exactly one person, normalised: an email address, or a
    LinkedIn profile (written however: with or without https://, www., a trailing slash or
    ?tracking). Other details (phone numbers, sites) can be shared, so they don't count."""
    value = value.strip()
    if kind == "email" and "@" in value:
        return ("email", value.lower())
    if kind in ("linkedin", "url", "other") and (m := _LINKEDIN.match(value)):
        return ("linkedin", f"linkedin.com/in/{m.group(2).lower()}")
    return None


def _identities(details: Iterable[tuple[str, str]]) -> dict[tuple[str, str], str]:
    """Identity -> the detail's value as written, for the given (kind, value) pairs."""
    out: dict[tuple[str, str], str] = {}
    for kind, value in details:
        if key := identity(kind, value):
            out.setdefault(key, value.strip())
    return out


def conflicts(
    session: Session, details: Iterable[tuple[str, str]], *, exclude: str | None = None
) -> list[tuple[str, Contact]]:
    """Other people who already have one of these email addresses or LinkedIn profiles, as
    (the value as given, that person)."""
    wanted = _identities(details)
    if not wanted:
        return []
    found: list[tuple[str, Contact]] = []
    seen: set[tuple[str, str]] = set()
    stmt = select(ContactDetail, Contact).join(Contact, ContactDetail.contact_id == Contact.id)
    if exclude:
        stmt = stmt.where(ContactDetail.contact_id != exclude)
    for detail, contact in session.execute(stmt.order_by(Contact.name)):
        key = identity(detail.kind, detail.value)
        if key in wanted and (key, contact.id) not in seen:
            seen.add((key, contact.id))
            found.append((wanted[key], contact))
    return found


def check_unique(
    session: Session,
    details: Iterable[tuple[str, str]],
    *,
    contact: Contact | None = None,
) -> str | None:
    """A message saying who already has an email address or LinkedIn profile, or None.

    Only details new to `contact` are checked, so people who already shared one (from before
    this rule) can still be edited, and merged.
    """
    details = list(details)
    if contact is not None:
        had = set(
            _identities(
                (d.kind, d.value)
                for d in session.scalars(select(ContactDetail).where(ContactDetail.contact_id == contact.id))
            )
        )
        details = [(k, v) for k, v in details if identity(k, v) not in had]
    clashes = conflicts(session, details, exclude=contact.id if contact else None)
    if not clashes:
        return None
    value, other = clashes[0]
    return (
        f"{other.name} already has {value}. One person per email address and LinkedIn profile: "
        f"open {other.name} instead, or merge the two."
    )


def merge(session: Session, keep: Contact, gone: Contact, notes: NoteStore) -> None:
    """Fold `gone` into `keep`, then delete `gone`.

    Everything that points at `gone` moves to `keep`: contact details (not ones `keep` already
    has), roles they pitched, applications they're the recruiter on or part of, interview
    panels, calls, links, files, to-dos and notes. `keep`'s own fields win; any it doesn't have
    (title, agency, company, waiting or to-read dates, chased, closed) come from `gone`.
    """
    if keep.id == gone.id:
        raise ValueError("Pick two different people to merge.")

    # Contact details: append the ones `keep` doesn't have; duplicates go.
    mine = session.scalars(
        select(ContactDetail).where(ContactDetail.contact_id == keep.id).order_by(ContactDetail.position)
    ).all()
    have = {(d.kind, identity(d.kind, d.value) or d.value.strip().lower()) for d in mine}
    position = len(mine)
    theirs = session.scalars(
        select(ContactDetail).where(ContactDetail.contact_id == gone.id).order_by(ContactDetail.position)
    ).all()
    for d in theirs:
        key = (d.kind, identity(d.kind, d.value) or d.value.strip().lower())
        if key in have:
            session.delete(d)
            continue
        have.add(key)
        d.contact_id = keep.id
        d.position = position
        position += 1

    for name in ("title", "agency_id", "company_id"):
        if getattr(keep, name) is None:
            setattr(keep, name, getattr(gone, name))
    # Reply states: keep `keep`'s if it has any, else take `gone`'s (never both at once).
    if not (keep.awaiting_reply_since or keep.reply_to_read_since or keep.closed_as):
        keep.awaiting_reply_since = gone.awaiting_reply_since
        keep.reply_to_read_since = gone.reply_to_read_since
        keep.closed_as, keep.closed_on = gone.closed_as, gone.closed_on
    keep.chased_on = max(filter(None, (keep.chased_on, gone.chased_on)), default=None)

    session.execute(update(Role).where(Role.contact_id == gone.id).values(contact_id=keep.id))
    session.execute(update(Application).where(Application.recruiter_id == gone.id).values(recruiter_id=keep.id))
    session.execute(update(Meeting).where(Meeting.contact_id == gone.id).values(contact_id=keep.id))

    # On applications and interview panels, once per (application, relation) or interview.
    on_apps = {
        (link.application_id, link.relation)
        for link in session.scalars(select(ApplicationContact).where(ApplicationContact.contact_id == keep.id))
    }
    for link in session.scalars(select(ApplicationContact).where(ApplicationContact.contact_id == gone.id)):
        if (link.application_id, link.relation) in on_apps:
            session.delete(link)
        else:
            link.contact_id = keep.id
    panels = set(session.scalars(select(InterviewContact.interview_id).where(InterviewContact.contact_id == keep.id)))
    for link in session.scalars(select(InterviewContact).where(InterviewContact.contact_id == gone.id)):
        if link.interview_id in panels:
            session.delete(link)
        else:
            link.contact_id = keep.id

    for model in (Link, Attachment, Todo):
        session.execute(
            update(model).where(model.entity_type == "contact", model.entity_id == gone.id).values(entity_id=keep.id)
        )

    # Notes keep their links in the Markdown file itself.
    old, new = f"contact:{gone.id}", f"contact:{keep.id}"
    for row in session.scalars(select(NoteIndex)):
        if old in row.links:
            note = notes.read(row.path)
            note.links = list(dict.fromkeys(new if link == old else link for link in note.links))
            notes.index(session, notes.save(note))

    # Moved first, then deleted: deleting `gone` would otherwise take its links with it.
    session.flush()
    session.expire_all()
    session.delete(session.get(Contact, gone.id))
    session.flush()
