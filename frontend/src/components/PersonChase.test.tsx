import { createMemoryHistory } from "@tanstack/react-router";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import dayjs from "dayjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "../App";
import { makeRouter } from "../router";
import { mockApi, WORKFLOW } from "../test/mockApi";

function renderAt(path: string) {
  render(<App router={makeRouter(createMemoryHistory({ initialEntries: [path] }))} />);
}

const today = dayjs().format("YYYY-MM-DD");
const daysAgo = (n: number) => dayjs().subtract(n, "day").format("YYYY-MM-DD");

const alex = (overrides: Record<string, unknown> = {}) => ({
  id: "c1",
  name: "Alex Morgan",
  title: "Senior Consultant",
  agency_id: null,
  company_id: null,
  details: [],
  awaiting_reply_since: daysAgo(9),
  reply_to_read_since: null,
  chased_on: null,
  closed_as: null,
  closed_on: null,
  created_at: "",
  updated_at: "",
  ...overrides,
});

const nothingElse = {
  follow_ups: [],
  stale: [],
  upcoming: [],
  awaiting_outcome: [],
  offer_deadlines: [],
  waiting: [],
  today,
};

beforeEach(() => localStorage.clear());
afterEach(() => vi.unstubAllGlobals());

describe("chasing people", () => {
  it("chases, or gives up on, someone you're waiting on, with an undo", async () => {
    const calls = mockApi({
      "/api/v1/workflow": WORKFLOW,
      "/api/v1/next-actions": { ...nothingElse, waiting_people: [alex()] },
      "PATCH /api/v1/contacts/c1": alex(),
      "/api/v1/health": {},
    });
    renderAt("/");
    const section = (await screen.findByRole("heading", { name: "Waiting to hear back" })).closest(
      ".mantine-Card-root",
    ) as HTMLElement;

    fireEvent.click(within(section).getByRole("button", { name: "Chased: Alex Morgan" }));
    await waitFor(() =>
      expect(calls.filter((c) => c.method === "PATCH").map((c) => c.body)).toEqual([{ chased_on: today }]),
    );

    fireEvent.click(within(section).getByRole("button", { name: "Ghosted: Alex Morgan" }));
    expect(await screen.findByText("Alex Morgan: ghosted, off Today")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "Undo" }).at(-1)!);
    await waitFor(() => {
      const patches = calls.filter((c) => c.method === "PATCH").map((c) => c.body);
      expect(patches[1]).toEqual({ closed_as: "ghosted", closed_on: today });
      // Undo puts back exactly what was there: waiting since 9 days ago, not closed.
      expect(patches[2]).toEqual({
        awaiting_reply_since: daysAgo(9),
        reply_to_read_since: null,
        chased_on: null,
        closed_as: null,
        closed_on: null,
      });
    });
  });

  it("says when the waiting started with a chase", async () => {
    mockApi({
      "/api/v1/workflow": WORKFLOW,
      "/api/v1/next-actions": {
        ...nothingElse,
        waiting_people: [alex({ awaiting_reply_since: daysAgo(2), chased_on: daysAgo(2) })],
      },
      "/api/v1/health": {},
    });
    renderAt("/");
    expect(await screen.findByText("Chased 2 days ago")).toBeInTheDocument();
  });

  it("shows a closed conversation on the person's page, and reopens it", async () => {
    const calls = mockApi({
      "/api/v1/workflow": WORKFLOW,
      "GET /api/v1/contacts/c1/summary": {
        contact: alex({ awaiting_reply_since: null, closed_as: "not_interested", closed_on: "2026-10-05" }),
        applications: [],
        interviews: [],
      },
      "PATCH /api/v1/contacts/c1": alex(),
      "/api/v1/agencies": [],
      "/api/v1/companies": [],
      "/api/v1/health": {},
    });
    renderAt("/people/c1");
    expect(await screen.findByText(/^Not interested · /)).toBeInTheDocument();
    // Closed: no chasing buttons until it's reopened.
    expect(screen.queryByRole("button", { name: "Chased: Alex Morgan" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove Not interested" }));
    await waitFor(() => expect(calls.find((c) => c.method === "PATCH")?.body).toEqual({ closed_as: null }));
  });

  it("takes Ghosted off a person whenever you like, with an undo", async () => {
    const calls = mockApi({
      "/api/v1/workflow": WORKFLOW,
      "GET /api/v1/contacts/c1/summary": {
        contact: alex({ awaiting_reply_since: null, closed_as: "ghosted", closed_on: "2026-09-01" }),
        applications: [],
        interviews: [],
      },
      "PATCH /api/v1/contacts/c1": alex(),
      "/api/v1/agencies": [],
      "/api/v1/companies": [],
      "/api/v1/health": {},
    });
    renderAt("/people/c1");
    expect((await screen.findAllByRole("img", { name: "Ghosted" })).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Not a ghost" }));
    await waitFor(() => expect(calls.find((c) => c.method === "PATCH")?.body).toEqual({ closed_as: null }));
    const toast = (await screen.findByText("Alex Morgan: not a ghost any more")).parentElement!;
    fireEvent.click(within(toast).getByRole("button", { name: "Undo" }));
    await waitFor(() =>
      expect(calls.filter((c) => c.method === "PATCH").at(-1)?.body).toMatchObject({
        closed_as: "ghosted",
        closed_on: "2026-09-01",
      }),
    );
  });
});
