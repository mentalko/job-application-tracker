import { describe, expect, it } from "vitest";

import { orderings, shape, tangle, untangle, wrap } from "./SankeyChart";

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

  it("counts the count when fitting the last line", () => {
    // "hear back" fits in 70px (9 characters), "hear back 12" doesn't.
    expect(wrap("Waiting to hear back", 12, 70)).toEqual(["Waiting to", "hear", "back 12"]);
  });

  it("copes with a word too long for the room, or no room at all", () => {
    expect(wrap("Interviewing", 3, 20)).toEqual(["Interviewing 3"]);
    expect(wrap("Still at Phone", 2, 0)).toEqual(["Still", "at", "Phone 2"]);
  });
});

describe("orderings", () => {
  it("tries every order of a few nodes", () => {
    expect(orderings(["a", "b", "c"])).toHaveLength(6);
    expect(orderings(["a"])).toEqual([["a"]]);
  });

  it("swaps neighbours in a busy column, rather than trying every order", () => {
    const six = ["a", "b", "c", "d", "e", "f"];
    expect(orderings(six)).toHaveLength(5);
    expect(orderings(six)[0]).toEqual(["b", "a", "c", "d", "e", "f"]);
  });
});

describe("shape", () => {
  it("counts columns along the longest chain, and the busiest one", () => {
    const n = (id: string) => ({ id, name: id, kind: "active", color: "blue", reached: 1, current: 0 });
    const flow = {
      applications: 3,
      nodes: ["a", "b", "c", "x", "y"].map(n),
      links: [
        { source: "a", target: "b", value: 1 },
        { source: "b", target: "c", value: 1 },
        { source: "a", target: "c", value: 1 }, // skips a column: c still sits after b
        { source: "a", target: "x", value: 1 },
        { source: "a", target: "y", value: 1 },
      ],
    };
    expect(shape(flow)).toEqual({ columns: 3, busiest: 3 }); // b, x and y share the second column
  });
});

describe("untangle", () => {
  // Built crossed (a→d, b→c) unless the order puts d above c.
  const [a, b] = [node("a", 0, 0), node("b", 0, 100)];
  const layoutWith = (dOnTop: boolean) => {
    const [c, d] = dOnTop
      ? [node("c", 200, 100), node("d", 200, 0)]
      : [node("c", 200, 0), node("d", 200, 100)];
    return { nodes: [a, b, c, d], links: [link(a, d), link(b, c)] } as never;
  };

  it("finds the order of a column that stops two flows crossing", () => {
    const order = untangle((o) => layoutWith(o !== undefined && o.get("d")! < o.get("c")!));
    expect(order).toBeDefined();
    expect(order!.get("d")!).toBeLessThan(order!.get("c")!);
    expect(tangle(layoutWith(true))).toBe(0);
  });

  it("keeps d3's own layout when nothing crosses", () => {
    expect(untangle(() => layoutWith(true))).toBeUndefined();
  });
});
