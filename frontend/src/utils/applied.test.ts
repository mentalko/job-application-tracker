import { describe, expect, it } from "vitest";

import { WORKFLOW } from "../test/mockApi";
import { beforeApplied } from "./applied";

describe("beforeApplied", () => {
  it("is the open stages before Applied", () => {
    expect(beforeApplied(WORKFLOW, "interested")).toBe(true);
    expect(beforeApplied(WORKFLOW, "applied")).toBe(false);
    expect(beforeApplied(WORKFLOW, "rejected")).toBe(false);
    expect(beforeApplied(WORKFLOW, null)).toBe(false);
  });

  it("works without an applied stage: the first open stage after the start", () => {
    const flow = {
      initial: "lead",
      stages: [
        { id: "lead", kind: "active" },
        { id: "submitted", kind: "active" },
        { id: "gone", kind: "closed" },
      ],
    };
    expect(beforeApplied(flow, "lead")).toBe(true);
    expect(beforeApplied(flow, "submitted")).toBe(false);
    // A workflow that starts at Applied has nothing before it.
    expect(
      beforeApplied({ initial: "applied", stages: [{ id: "applied", kind: "active" }] }, "applied"),
    ).toBe(false);
  });
});
