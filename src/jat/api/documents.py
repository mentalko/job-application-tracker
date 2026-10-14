"""API routes for CVs and cover letters as versioned documents (PRD FR14).

A document ("Backend CV") has versions ("v3 (fintech)"), each usually with its file stored as an
attachment on the document. Applications record which versions were sent, and each document
shows where it was used.
"""

from __future__ import annotations

import contextlib
import mimetypes
import re

from fastapi import APIRouter, File, Form, HTTPException, Request, Response, UploadFile
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..db.models import Application, ApplicationDocument, Attachment, Company, Document, DocumentVersion, Role
from ..db.types import utcnow
from ..domain import applications as svc
from ..domain.workflow import Workflow
from ..storage.files import FileError, FileStore, TooLarge
from . import schemas as S
from .attachments import _out as attachment_out
from .crud import values
from .deps import SessionDep, WorkflowDep, get_or_404

router = APIRouter(tags=["documents"])


def _versions(session: Session, document_ids: list[str]) -> dict[str, list[S.VersionOut]]:
    if not document_ids:
        return {}
    versions = session.scalars(
        select(DocumentVersion)
        .where(DocumentVersion.document_id.in_(document_ids))
        .order_by(DocumentVersion.created_at.desc(), DocumentVersion.id.desc())
    ).all()
    ids = [v.id for v in versions]
    counts = dict(
        session.execute(
            select(ApplicationDocument.document_version_id, func.count())
            .where(ApplicationDocument.document_version_id.in_(ids))
            .group_by(ApplicationDocument.document_version_id)
        ).all()
    )
    files = {
        a.id: a
        for a in session.scalars(
            select(Attachment).where(Attachment.id.in_([v.attachment_id for v in versions if v.attachment_id]))
        )
    }
    out: dict[str, list[S.VersionOut]] = {}
    for v in versions:
        att = files.get(v.attachment_id) if v.attachment_id else None
        out.setdefault(v.document_id, []).append(
            S.VersionOut(
                id=v.id,
                document_id=v.document_id,
                label=v.label,
                notes=v.notes,
                created_at=v.created_at,
                file=attachment_out(att) if att else None,
                used_in=counts.get(v.id, 0),
            )
        )
    return out


def _doc_out(doc: Document, versions: list[S.VersionOut]) -> S.DocumentOut:
    return S.DocumentOut(
        id=doc.id,
        kind=doc.kind,
        name=doc.name,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
        versions=versions,
    )


def _usages(session: Session, workflow: Workflow, document_id: str) -> list[S.DocumentUsage]:
    rows = session.execute(
        select(ApplicationDocument, DocumentVersion, Application, Role, Company)
        .join(DocumentVersion, ApplicationDocument.document_version_id == DocumentVersion.id)
        .join(Application, ApplicationDocument.application_id == Application.id)
        .join(Role, Application.role_id == Role.id)
        .join(Company, Role.company_id == Company.id)
        .where(DocumentVersion.document_id == document_id)
        .order_by(ApplicationDocument.sent_on.desc().nulls_last(), Company.name)
    ).all()
    return [
        S.DocumentUsage(
            link_id=link.id,
            application_id=app.id,
            company_name=company.name,
            role_title=role.title,
            stage_name=workflow.stage(app.stage).name if workflow.has(app.stage) else app.stage,
            version_id=version.id,
            version_label=version.label,
            sent_on=link.sent_on,
        )
        for link, version, app, role, company in rows
    ]


def sent_documents(session: Session, application_id: str) -> list[S.SentDocumentOut]:
    """The document versions sent with one application (for its detail)."""
    rows = session.execute(
        select(ApplicationDocument, DocumentVersion, Document)
        .join(DocumentVersion, ApplicationDocument.document_version_id == DocumentVersion.id)
        .join(Document, DocumentVersion.document_id == Document.id)
        .where(ApplicationDocument.application_id == application_id)
        .order_by(Document.kind, Document.name)
    ).all()
    return [
        S.SentDocumentOut(
            id=link.id,
            document_id=doc.id,
            document_name=doc.name,
            kind=doc.kind,
            version_id=version.id,
            version_label=version.label,
            sent_on=link.sent_on,
            file_url=f"/api/v1/attachments/{version.attachment_id}/file" if version.attachment_id else None,
        )
        for link, version, doc in rows
    ]


# --- documents ---------------------------------------------------------------------------


@router.get("/documents", response_model=list[S.DocumentOut])
def list_documents(session: SessionDep):
    docs = session.scalars(select(Document).order_by(Document.kind, func.lower(Document.name))).all()
    versions = _versions(session, [d.id for d in docs])
    return [_doc_out(d, versions.get(d.id, [])) for d in docs]


@router.post("/documents", response_model=S.DocumentOut, status_code=201)
def create_document(body: S.DocumentIn, session: SessionDep):
    doc = Document(kind=body.kind, name=body.name.strip())
    session.add(doc)
    session.flush()
    return _doc_out(doc, [])


@router.get("/documents/{document_id}", response_model=S.DocumentDetail)
def get_document(document_id: str, session: SessionDep, workflow: WorkflowDep):
    doc = get_or_404(session, Document, document_id)
    return S.DocumentDetail(
        **_doc_out(doc, _versions(session, [doc.id]).get(doc.id, [])).model_dump(),
        used_in=_usages(session, workflow, doc.id),
    )


@router.patch("/documents/{document_id}", response_model=S.DocumentOut)
def update_document(document_id: str, body: S.DocumentPatch, session: SessionDep):
    doc = get_or_404(session, Document, document_id)
    for key, value in values(body, partial=True).items():
        setattr(doc, key, value.strip() if isinstance(value, str) else value)
    session.flush()
    return _doc_out(doc, _versions(session, [doc.id]).get(doc.id, []))


def _refuse_if_sent(session: Session, where, what: str) -> None:
    sent = session.scalar(
        select(func.count())
        .select_from(ApplicationDocument)
        .join(DocumentVersion, ApplicationDocument.document_version_id == DocumentVersion.id)
        .where(where)
    )
    if sent:
        raise HTTPException(409, f"{what} was sent with {sent} application(s); remove it from them first.")


def _delete_version_files(session: Session, versions: list[DocumentVersion]) -> list[str]:
    """Delete the files that belong to these versions (not ones since moved to something else)."""
    paths = []
    for v in versions:
        att = session.get(Attachment, v.attachment_id) if v.attachment_id else None
        if att is not None and att.entity_type == "document" and att.entity_id == v.document_id:
            paths.append(att.path)
            session.delete(att)
    return paths


@router.delete("/documents/{document_id}", status_code=204)
def delete_document(document_id: str, request: Request, session: SessionDep):
    doc = get_or_404(session, Document, document_id)
    _refuse_if_sent(session, DocumentVersion.document_id == doc.id, "A version of this document")
    store = FileStore(request.app.state.jat.data_dir)
    versions = list(session.scalars(select(DocumentVersion).where(DocumentVersion.document_id == doc.id)))
    paths = _delete_version_files(session, versions)
    session.delete(doc)
    session.commit()
    for path in paths:
        with contextlib.suppress(FileError):
            store.delete(path)
    return Response(status_code=204)


# --- versions ----------------------------------------------------------------------------


@router.post("/documents/{document_id}/versions", response_model=S.VersionOut, status_code=201)
def add_version(
    document_id: str,
    request: Request,
    session: SessionDep,
    label: str = Form(..., min_length=1, max_length=100),  # noqa: B008
    notes: str | None = Form(None, max_length=2000),  # noqa: B008
    file: UploadFile | None = File(None),  # noqa: B008
):
    """A new version, usually with its file (the PDF you send). Sending it is recorded separately."""
    doc = get_or_404(session, Document, document_id)
    if not label.strip():
        raise HTTPException(422, "label: give the version a name, e.g. v3 (fintech)")
    store = FileStore(request.app.state.jat.data_dir)
    stored = None
    if file is not None and file.filename:
        name = file.filename.replace("\\", "/").rsplit("/", 1)[-1][:300] or "file"
        try:
            stored = store.save(file.file, name)
        except TooLarge as exc:
            raise HTTPException(413, str(exc)) from exc
        except FileError as exc:
            raise HTTPException(422, str(exc)) from exc
    try:
        att = None
        if stored is not None:
            att = Attachment(
                id=stored.id,
                entity_type="document",
                entity_id=doc.id,
                path=stored.path,
                original_name=name,
                content_type=mimetypes.guess_type(name)[0] or "application/octet-stream",
                size=stored.size,
                sha256=stored.sha256,
            )
            session.add(att)
        version = DocumentVersion(
            document_id=doc.id, label=label.strip(), notes=(notes or "").strip() or None, attachment_id=att and att.id
        )
        session.add(version)
        doc.updated_at = version.created_at = utcnow()
        session.flush()
        session.commit()  # now, so a failed save can take its file with it
    except BaseException:
        session.rollback()
        if stored is not None:
            store.delete(stored.path)
        raise
    return _versions(session, [doc.id])[doc.id][0]


@router.patch("/documents/versions/{version_id}", response_model=S.VersionOut)
def update_version(version_id: str, body: S.VersionPatch, session: SessionDep):
    version = get_or_404(session, DocumentVersion, version_id)
    for key, value in values(body, partial=True).items():
        if isinstance(value, str):
            value = value.strip() or None if key == "notes" else value.strip()
        setattr(version, key, value)
    session.flush()
    return next(v for v in _versions(session, [version.document_id])[version.document_id] if v.id == version.id)


@router.delete("/documents/versions/{version_id}", status_code=204)
def delete_version(version_id: str, request: Request, session: SessionDep):
    version = get_or_404(session, DocumentVersion, version_id)
    _refuse_if_sent(session, DocumentVersion.id == version.id, "This version")
    store = FileStore(request.app.state.jat.data_dir)
    paths = _delete_version_files(session, [version])
    session.delete(version)
    session.commit()
    for path in paths:
        with contextlib.suppress(FileError):
            store.delete(path)
    return Response(status_code=204)


# --- sent with an application -------------------------------------------------------------


@router.post("/applications/{app_id}/documents", response_model=S.SentDocumentOut, status_code=201)
def send_document(app_id: str, body: S.SentDocumentIn, session: SessionDep):
    app = get_or_404(session, Application, app_id)
    version = session.get(DocumentVersion, body.document_version_id)
    if version is None:
        raise HTTPException(422, f"document_version_id: {body.document_version_id} not found")
    exists = session.scalar(
        select(ApplicationDocument).where(
            ApplicationDocument.application_id == app.id, ApplicationDocument.document_version_id == version.id
        )
    )
    if exists is not None:
        raise HTTPException(409, "That version is already recorded for this application.")
    doc = session.get(Document, version.document_id)
    session.add(ApplicationDocument(application_id=app.id, document_version_id=version.id, sent_on=body.sent_on))
    session.flush()
    kind = {"cv": "CV", "cover_letter": "Cover letter"}.get(doc.kind, "Document")
    svc.log_activity(
        session,
        app,
        "file",
        summary=f"{kind} sent: {doc.name} {version.label}",
        data={"document_version_id": version.id},
    )
    return next(d for d in sent_documents(session, app.id) if d.version_id == version.id)


@router.delete("/applications/{app_id}/documents/{link_id}", status_code=204)
def unsend_document(app_id: str, link_id: str, session: SessionDep):
    link = get_or_404(session, ApplicationDocument, link_id)
    if link.application_id != app_id:
        raise HTTPException(404, f"ApplicationDocument {link_id} not found")
    session.delete(link)
    session.flush()
    return Response(status_code=204)


# Files on applications that look like a CV: by name, or the same file on two or more.
CV_NAME = re.compile(r"\b(cv|resume|résumé|curriculum)\b|cv[._ -]|_cv\b", re.IGNORECASE)
CV_TYPES = ("application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument")


def _cv_files(session: Session) -> list[S.CvFile]:
    rows = session.execute(
        select(Attachment, Application.id, Company.name, Role.title)
        .join(Application, (Attachment.entity_type == "application") & (Attachment.entity_id == Application.id))
        .join(Role, Application.role_id == Role.id)
        .join(Company, Role.company_id == Company.id)
        .order_by(Attachment.created_at)
    ).all()
    groups: dict[str, list] = {}
    for att, app_id, company, title in rows:
        if att.content_type and not att.content_type.startswith(CV_TYPES):
            continue
        groups.setdefault(att.sha256, []).append((att, app_id, company, title))
    versions = {
        sha: (v, d)
        for v, d, sha in session.execute(
            select(DocumentVersion, Document, Attachment.sha256)
            .join(Document, DocumentVersion.document_id == Document.id)
            .join(Attachment, DocumentVersion.attachment_id == Attachment.id)
            .order_by(DocumentVersion.created_at)
        )
    }
    sent = set(session.execute(select(ApplicationDocument.application_id, ApplicationDocument.document_version_id)))
    out = []
    for sha, items in groups.items():
        apps = {app_id: (company, title) for _, app_id, company, title in items}
        first = items[0][0]
        if len(apps) < 2 and not CV_NAME.search(first.original_name):
            continue
        match = versions.get(sha)
        out.append(
            S.CvFile(
                sha256=sha,
                name=first.original_name,
                size=first.size,
                content_type=first.content_type,
                applications=[
                    S.CvFileApplication(
                        id=app_id,
                        company_name=company,
                        role_title=title,
                        has_it=bool(match and (app_id, match[0].id) in sent),
                    )
                    for app_id, (company, title) in apps.items()
                ],
                version=S.CvFileVersion(
                    id=match[0].id, label=match[0].label, document_id=match[1].id, document_name=match[1].name
                )
                if match
                else None,
            )
        )
    # Most to do first: files not yet versions, then the most applications.
    out.sort(key=lambda f: (f.version is not None, -len(f.applications), f.name.lower()))
    return [f for f in out if f.version is None or not all(a.has_it for a in f.applications)]


@router.get("/cv-files", response_model=list[S.CvFile])
def cv_files(session: SessionDep):
    """CV files attached to applications that aren't recorded as document versions sent with them
    yet: one per distinct file, named like a CV or on two or more applications."""
    return _cv_files(session)


@router.post("/cv-files/adopt", response_model=S.CvFileAdopted, status_code=201)
def adopt_cv_file(body: S.CvFileAdopt, request: Request, session: SessionDep):
    """Make the file a version of a document (copying the file, so the version keeps it), unless
    it already is one, and record that version as sent with every application it's attached to."""
    found = next((f for f in _cv_files(session) if f.sha256 == body.sha256), None)
    if found is None:
        raise HTTPException(404, "No CV file like that on your applications (or it's all recorded already).")
    store = FileStore(request.app.state.jat.data_dir)
    stored = None
    try:
        if found.version is not None:
            version = session.get(DocumentVersion, found.version.id)
            doc = session.get(Document, version.document_id)
        else:
            if body.document_id:
                doc = get_or_404(session, Document, body.document_id)
            elif body.document_name and body.document_name.strip():
                doc = Document(kind=body.kind, name=body.document_name.strip())
                session.add(doc)
                session.flush()
            else:
                raise HTTPException(422, "Pick a document to add it to, or name a new one.")
            src = session.scalar(
                select(Attachment).where(Attachment.sha256 == body.sha256, Attachment.entity_type == "application")
            )
            with store.resolve(src.path).open("rb") as f:
                stored = store.save(f, src.original_name)
            att = Attachment(
                id=stored.id,
                entity_type="document",
                entity_id=doc.id,
                path=stored.path,
                original_name=src.original_name,
                content_type=src.content_type,
                size=stored.size,
                sha256=stored.sha256,
            )
            session.add(att)
            label = (body.label or "").strip() or src.original_name.rsplit(".", 1)[0][:100]
            version = DocumentVersion(document_id=doc.id, label=label, attachment_id=att.id)
            session.add(version)
            doc.updated_at = utcnow()
            session.flush()
        recorded = 0
        kind = {"cv": "CV", "cover_letter": "Cover letter"}.get(doc.kind, "Document")
        for a in found.applications:
            if a.has_it:
                continue
            attached = session.scalar(
                select(Attachment.created_at).where(
                    Attachment.sha256 == body.sha256,
                    Attachment.entity_type == "application",
                    Attachment.entity_id == a.id,
                )
            )
            session.add(
                ApplicationDocument(
                    application_id=a.id,
                    document_version_id=version.id,
                    sent_on=attached.astimezone().date() if attached else None,
                )
            )
            svc.log_activity(
                session,
                session.get(Application, a.id),
                "file",
                summary=f"{kind} sent: {doc.name} {version.label}",
                data={"document_version_id": version.id},
            )
            recorded += 1
        session.flush()
        session.commit()  # now, so a failed save can take its copied file with it
    except BaseException:
        session.rollback()
        if stored is not None:
            store.delete(stored.path)
        raise
    return S.CvFileAdopted(document_id=doc.id, version_id=version.id, recorded=recorded)
