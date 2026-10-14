import { createMemoryHistory } from "@tanstack/react-router";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "../App";
import { makeRouter } from "../router";
import { mockApi, row, WORKFLOW } from "../test/mockApi";

function renderAt(path: string) {
  render(<App router={makeRouter(createMemoryHistory({ initialEntries: [path] }))} />);
}

const file = {
  id: "f1",
  entity_type: "document",
  entity_id: "d1",
  original_name: "backend-cv-v3.pdf",
  content_type: "application/pdf",
  size: 120_000,
  sha256: "x",
  path: "2026/09/f1-backend-cv-v3.pdf",
  created_at: "2026-09-20T10:00:00Z",
  url: "/api/v1/attachments/f1/file",
  inline: true,
  meta: {},
};
const cv = {
  id: "d1",
  kind: "cv",
  name: "Backend CV",
  created_at: "2026-09-01T10:00:00Z",
  updated_at: "2026-09-20T10:00:00Z",
  versions: [
    {
      id: "v3",
      document_id: "d1",
      label: "v3 (fintech)",
      notes: "Payments first",
      created_at: "2026-09-20T10:00:00Z",
      file,
      used_in: 1,
    },
    {
      id: "v2",
      document_id: "d1",
      label: "v2",
      notes: null,
      created_at: "2026-09-05T10:00:00Z",
      file: null,
      used_in: 0,
    },
  ],
};

beforeEach(() => localStorage.clear());
afterEach(() => vi.unstubAllGlobals());

describe("documents", () => {
  it("lists documents with versions and where they were used", async () => {
    const calls = mockApi({
      "/api/v1/workflow": WORKFLOW,
      "GET /api/v1/documents": [cv],
      "GET /api/v1/documents/d1": {
        ...cv,
        used_in: [
          {
            link_id: "l1",
            application_id: "a1",
            company_name: "Contoso",
            role_title: "Backend Engineer",
            stage_name: "Applied",
            version_id: "v3",
            version_label: "v3 (fintech)",
            sent_on: "2026-09-21",
          },
        ],
      },
      "POST /api/v1/documents": { ...cv, id: "d2", kind: "cover_letter", name: "Cover letter", versions: [] },
      "/api/v1/health": {},
    });
    renderAt("/documents");
    expect(await screen.findByRole("heading", { name: "Backend CV" })).toBeInTheDocument();
    expect(screen.getByText("sent 1×")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /backend-cv-v3.pdf/ })).toHaveAttribute("href", file.url);
    // A version that was sent can't be deleted.
    expect(screen.getByRole("button", { name: "Delete v3 (fintech)" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Delete v2" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: /Where it was used \(1\)/ }));
    expect(await screen.findByRole("link", { name: "Contoso · Backend Engineer" })).toHaveAttribute(
      "href",
      "/applications/a1",
    );

    fireEvent.click(screen.getByRole("button", { name: "New document" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByText("Cover letter"));
    fireEvent.change(within(dialog).getByLabelText("Name"), { target: { value: "Cover letter" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Create" }));
    await waitFor(() =>
      expect(calls.find((c) => c.method === "POST")?.body).toEqual({
        kind: "cover_letter",
        name: "Cover letter",
      }),
    );
  });

  it("records which version was sent with an application", async () => {
    const detail = {
      ...row(),
      events: [],
      contacts: [],
      allowed_next: [],
      suggested_next: [],
      can_undo: false,
      duplicates: [],
      documents: [
        {
          id: "l1",
          document_id: "d9",
          document_name: "Cover letter",
          kind: "cover_letter",
          version_id: "c1",
          version_label: "v1",
          sent_on: "2026-09-21",
          file_url: null,
        },
      ],
    };
    const calls = mockApi({
      "/api/v1/workflow": WORKFLOW,
      "GET /api/v1/applications/a1": detail,
      "GET /api/v1/documents": [cv],
      "POST /api/v1/applications/a1/documents": detail.documents[0],
      "/api/v1/contacts": [],
      "/api/v1/roles": [],
      "/api/v1/health": {},
    });
    renderAt("/applications/a1");
    const card = (await screen.findByRole("heading", { name: "Documents sent" })).closest(
      ".mantine-Card-root",
    ) as HTMLElement;
    expect(within(card).getByText("Cover letter")).toBeInTheDocument();
    expect(within(card).getByText(/^Cover letter · sent /)).toBeInTheDocument();

    fireEvent.click(within(card).getByLabelText("Version"));
    fireEvent.click(await screen.findByText("Backend CV · v3 (fintech)"));
    fireEvent.click(within(card).getByRole("button", { name: "Add" }));
    await waitFor(() => {
      const post = calls.find((c) => c.method === "POST");
      expect(post?.body).toMatchObject({ document_version_id: "v3" });
    });
  });

  it("turns CV files on applications, roles and people into versions, on the applications you tick", async () => {
    const app = (id: string, company: string, has_it = false) => ({
      id,
      company_name: company,
      role_title: "Backend Engineer",
      has_it,
    });
    const calls = mockApi({
      "/api/v1/workflow": WORKFLOW,
      "GET /api/v1/documents": [cv],
      "GET /api/v1/cv-files": [
        {
          sha256: "a".repeat(64),
          name: "Alex Morgan 2026.pdf",
          size: 90_000,
          content_type: "application/pdf",
          sources: [
            { kind: "contact", id: "c1", name: "Alex Morgan" },
            { kind: "application", id: "a2", name: "Fabrikam · Backend Engineer" },
          ],
          applications: [app("a1", "Contoso"), app("a2", "Fabrikam")],
          version: null,
        },
        {
          sha256: "b".repeat(64),
          name: "cv.pdf",
          size: 800,
          content_type: "application/pdf",
          sources: [{ kind: "role", id: "r4", name: "Platform Engineer at Northwind Traders" }],
          applications: [app("a3", "Litware", true), app("a4", "Northwind Traders")],
          version: { id: "v3", label: "v3 (fintech)", document_id: "d1", document_name: "Backend CV" },
        },
        {
          sha256: "c".repeat(64),
          name: "Resume template.pdf",
          size: 10_000,
          content_type: "application/pdf",
          sources: [{ kind: "contact", id: "c9", name: "Sam Patel" }],
          applications: [],
          version: null,
        },
      ],
      "POST /api/v1/cv-files/adopt": { document_id: "d2", version_id: "v9", recorded: 1 },
      "/api/v1/health": {},
    });
    renderAt("/documents");
    const card = (await screen.findByRole("heading", { name: "CV files you've attached" })).closest(
      ".mantine-Card-root",
    ) as HTMLElement;
    // Where each was found: a person it was sent to, a role; and the applications it counts for.
    expect(within(card).getByRole("link", { name: "Alex Morgan" })).toHaveAttribute("href", "/people/c1");
    expect(
      within(card).getByRole("link", { name: "Platform Engineer at Northwind Traders" }),
    ).toHaveAttribute("href", "/roles/r4");
    expect(within(card).getByText("800 B")).toBeInTheDocument();
    expect(within(card).getByRole("link", { name: "Contoso · Backend Engineer" })).toHaveAttribute(
      "href",
      "/applications/a1",
    );
    expect(within(card).getByText("No applications for it yet.")).toBeInTheDocument();

    // Already a version: record it on the application missing it (Litware has it).
    fireEvent.click(within(card).getByRole("button", { name: "Record as sent" }));
    let dialog = await screen.findByRole("dialog");
    expect(within(dialog).queryByLabelText("Litware · Backend Engineer")).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Record as sent" }));
    await waitFor(() =>
      expect(calls.find((c) => c.path.endsWith("/adopt"))?.body).toEqual({
        sha256: "b".repeat(64),
        kind: "cv",
        application_ids: ["a4"],
      }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    // Not a CV: hidden, remembered, and can be brought back.
    fireEvent.click(within(card).getByRole("button", { name: "Resume template.pdf is not a CV" }));
    expect(within(card).queryByText(/Resume template.pdf/)).not.toBeInTheDocument();
    expect(localStorage.getItem("jat.notACv")).toContain("c".repeat(64));
    fireEvent.click(within(card).getByRole("button", { name: "Show 1 you said isn't a CV" }));
    expect(within(card).getByText(/Resume template.pdf/)).toBeInTheDocument();

    // Make the CV sent to Alex a version of a new CV, but only for Contoso.
    fireEvent.click(within(card).getAllByRole("button", { name: "Make it a version" })[0]!);
    dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByLabelText("Version")).toHaveValue("Alex Morgan 2026");
    fireEvent.click(within(dialog).getAllByLabelText("Add it to")[0]!);
    fireEvent.click(await screen.findByRole("option", { name: "A new CV…", hidden: true }));
    fireEvent.change(within(dialog).getByLabelText("Name of the new CV"), {
      target: { value: "Platform CV" },
    });
    fireEvent.change(within(dialog).getByLabelText("Version"), { target: { value: "v1" } });
    fireEvent.click(within(dialog).getByLabelText("Fabrikam · Backend Engineer"));
    fireEvent.click(within(dialog).getByRole("button", { name: "Make it a version" }));
    await waitFor(() =>
      expect(calls.filter((c) => c.path.endsWith("/adopt")).at(-1)?.body).toEqual({
        sha256: "a".repeat(64),
        document_name: "Platform CV",
        kind: "cv",
        label: "v1",
        application_ids: ["a1"],
      }),
    );
  });
});
