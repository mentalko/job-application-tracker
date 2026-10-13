import { createMemoryHistory } from "@tanstack/react-router";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { App } from "../App";
import { makeRouter } from "../router";
import { item, mockApi } from "../test/mockApi";

function renderTimeline() {
  render(<App router={makeRouter(createMemoryHistory({ initialEntries: ["/timeline"] }))} />);
}

const now = new Date().toISOString();
const inDays = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();

const ITEMS = [
  item({
    id: "interview:i1",
    at: inDays(3),
    category: "interview",
    title: "Round 2 · System design (booked)",
  }),
  item({ id: "event:e2", at: inDays(-1), category: "stage", title: "Applied → Screen" }),
  item({
    id: "contact:c2",
    at: inDays(-2),
    category: "added",
    title: "Added Riley Chen",
    application_id: null,
    role_id: null,
    role_title: null,
    agency_id: null,
    agency_name: null,
    company_id: "co2",
    company_name: "Fabrikam",
    people: [{ id: "c2", name: "Riley Chen" }],
  }),
];

afterEach(() => vi.unstubAllGlobals());

describe("timeline", () => {
  it("lists what's coming up, then each day, with links to what it's about", async () => {
    const calls = mockApi({
      "/api/v1/timeline": { items: ITEMS, now },
      "/api/v1/companies": [{ id: "co2", name: "Fabrikam" }],
      "/api/v1/agencies": [],
      "/api/v1/contacts": [],
      "/api/v1/health": {},
    });
    renderTimeline();
    const ahead = (await screen.findByRole("heading", { name: "Coming up" })).parentElement!;
    expect(within(ahead).getByText("Round 2 · System design (booked)")).toBeInTheDocument();
    expect(within(ahead).queryByText("Applied → Screen")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^Yesterday/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Riley Chen" })).toHaveAttribute("href", "/people/c2");
    expect(screen.getAllByRole("link", { name: "Backend Engineer at Contoso" })[0]).toHaveAttribute(
      "href",
      "/applications/a1",
    );
    // Three months by default.
    const first = new URL(calls.find((c) => c.path.startsWith("/api/v1/timeline"))!.path, "http://localhost");
    expect(first.searchParams.get("since")).toBeTruthy();

    fireEvent.click(screen.getByRole("checkbox", { name: "Interviews" }));
    await waitFor(() =>
      expect(
        calls.some((c) => c.path.startsWith("/api/v1/timeline") && c.path.includes("category=interview")),
      ).toBe(true),
    );
  });

  it("draws a lane per role (by default), company or person", async () => {
    mockApi({
      "/api/v1/timeline": { items: ITEMS, now },
      "/api/v1/companies": [],
      "/api/v1/agencies": [],
      "/api/v1/contacts": [],
      "/api/v1/health": {},
    });
    renderTimeline();
    fireEvent.click(await screen.findByText("Lanes"));
    const lane = await screen.findByRole("list", { name: "Contoso · Backend Engineer" });
    expect(within(lane).getAllByRole("button")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Contoso · Backend Engineer" })).toHaveAttribute(
      "href",
      "/roles/r1",
    );
    fireEvent.click(screen.getByText("Company"));
    expect(await screen.findByRole("list", { name: "Fabrikam" })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Contoso" })).toBeInTheDocument();
    fireEvent.click(screen.getByText("Person"));
    expect(
      within(await screen.findByRole("list", { name: "Alex Recruiter" })).getAllByRole("button"),
    ).toHaveLength(2);
  });

  it("leaves bookkeeping out until you ask for it", async () => {
    const calls = mockApi({
      "/api/v1/timeline": { items: ITEMS, now },
      "/api/v1/companies": [],
      "/api/v1/agencies": [],
      "/api/v1/contacts": [],
      "/api/v1/health": {},
    });
    renderTimeline();
    await screen.findByText("Applied → Screen");
    const timelineCalls = () => calls.filter((c) => c.path.startsWith("/api/v1/timeline"));
    const first = timelineCalls()[0]!.path;
    expect(first).toContain("category=role");
    expect(first).not.toContain("category=added");
    expect(screen.getByRole("checkbox", { name: "Companies and people added" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Roles pitched or passed" })).toBeChecked();

    fireEvent.click(screen.getByRole("button", { name: "Everything" }));
    await waitFor(() => expect(timelineCalls().at(-1)!.path).not.toContain("category="));

    fireEvent.click(screen.getByRole("button", { name: "None" }));
    expect(await screen.findByText("Tick at least one kind of thing to show.")).toBeInTheDocument();
  });

  it("puts a call on the row of each role that came up on it", async () => {
    const call = item({
      id: "meeting:m1",
      at: inDays(-5),
      category: "meeting",
      title: "Call with Alex Recruiter: Catch-up (done)",
      application_id: null,
      role_id: null,
      role_title: null,
      role_ids: ["r1", "r2"],
      people: [{ id: "c1", name: "Alex Recruiter" }],
    });
    const pitch = item({
      id: "role:r2",
      at: inDays(-5),
      category: "role",
      title: "Alex Recruiter pitched SRE at Contoso",
      application_id: null,
      role_id: "r2",
      role_title: "SRE",
    });
    mockApi({
      "/api/v1/timeline": { items: [...ITEMS, pitch, call], now },
      "/api/v1/companies": [],
      "/api/v1/agencies": [],
      "/api/v1/contacts": [],
      "/api/v1/health": {},
    });
    renderTimeline();
    fireEvent.click(await screen.findByText("Lanes"));
    const applied = await screen.findByRole("list", { name: "Contoso · Backend Engineer" });
    expect(within(applied).getAllByRole("button")).toHaveLength(3); // its two items and the call
    const pitched = screen.getByRole("list", { name: "Contoso · SRE" });
    expect(within(pitched).getAllByRole("button")).toHaveLength(2); // the pitch and the call
  });
});
