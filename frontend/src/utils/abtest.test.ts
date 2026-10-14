import { describe, expect, it } from "vitest";

import { fisherExact, verdict } from "./abtest";

describe("fisherExact", () => {
  it("matches known two-sided p-values", () => {
    // R: fisher.test(matrix(c(1, 9, 11, 3), 2))$p.value = 0.002759
    expect(fisherExact(1, 10, 11, 14)).toBeCloseTo(0.002759, 5);
    // R: fisher.test(matrix(c(3, 1, 1, 3), 2))$p.value = 0.4857
    expect(fisherExact(3, 4, 1, 4)).toBeCloseTo(0.4857, 4);
  });

  it("is 1 when there's nothing to compare", () => {
    expect(fisherExact(0, 0, 3, 5)).toBe(1);
    expect(fisherExact(0, 5, 0, 5)).toBe(1);
    expect(fisherExact(2, 4, 3, 6)).toBeCloseTo(1, 9);
  });
});

describe("verdict", () => {
  it("says too few until both have been sent a few times", () => {
    expect(verdict(4, 4, 0, 4).kind).toBe("too-few");
  });

  it("tells a likely difference from a hint and from chance", () => {
    expect(verdict(9, 10, 2, 10).kind).toBe("likely");
    expect(verdict(5, 10, 2, 10).kind).toBe("same");
    expect(verdict(6, 10, 2, 10).kind).toBe("hint");
  });
});
