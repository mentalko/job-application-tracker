import { describe, expect, it } from "vitest";

import { tangle, wrap } from "./SankeyChart";

// Two nodes on the left (a above b), two on the right (c above d), joined by two links.
const node = (id: string, x0: number, y0: number) => ({ id, x0, x1: x0 + 10, y0, y1: y0 + 20, value: 1 });
const link = (source: ReturnType<typeof node>, target: ReturnType<typeof node>) => ({
  source,
  target,
  value: 1,
  y0: source.y0 + 10,
  y1: target.y0 + 10,
});

describe("tangle", () => {
  const [a, b, c, d] = [node("a", 0, 0), node("b", 0, 100), node("c", 200, 0), node("d", 200, 100)];
  const nodes = [a, b, c, d];

  it("is nothing when the flows run side by side", () => {
    expect(tangle({ nodes, links: [link(a, c), link(b, d)] } as never)).toBe(0);
  });

  it("counts flows that cross", () => {
    expect(tangle({ nodes, links: [link(a, d), link(b, c)] } as never)).toBeGreaterThan(0);
  });

  it("counts a flow running through a node in a column it skips", () => {
    const mid = node("mid", 100, 50); // the a→d link is at y 60 here, through the middle of it
    expect(tangle({ nodes: [...nodes, mid], links: [link(a, d)] } as never)).toBeGreaterThan(0);
  });
});

describe("wrap", () => {
  it("keeps a label on one line when it fits", () => {
    expect(wrap("Applied", 10, 200)).toEqual(["Applied 10"]);
  });

  it("wraps a long label, keeping the count with the last word", () => {
    expect(wrap("Deciding whether to apply", 4, 110)).toEqual(["Deciding whether", "to apply 4"]);
    expect(wrap("Still interviewing", 1, 100)).toEqual(["Still", "interviewing 1"]);
  });
});
