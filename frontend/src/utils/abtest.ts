/** Comparing two rates from small numbers, as in "CV A got 4 of 10 to interview, CV B 1 of 9". */

function logFactorials(n: number): number[] {
  const out = [0];
  for (let i = 1; i <= n; i++) out.push(out[i - 1]! + Math.log(i));
  return out;
}

/**
 * Fisher's exact test, two-sided: how likely a split at least this uneven is if both did
 * equally well. Exact, so it's sound for the small numbers a job search has.
 */
export function fisherExact(aHits: number, aTotal: number, bHits: number, bTotal: number): number {
  const n = aTotal + bTotal;
  const hits = aHits + bHits;
  if (aTotal === 0 || bTotal === 0 || hits === 0 || hits === n) return 1;
  const lf = logFactorials(n);
  const choose = (k: number, r: number) => lf[k]! - lf[r]! - lf[k - r]!;
  const prob = (x: number) => Math.exp(choose(aTotal, x) + choose(bTotal, hits - x) - choose(n, hits));
  const observed = prob(aHits);
  let p = 0;
  for (let x = Math.max(0, hits - bTotal); x <= Math.min(aTotal, hits); x++) {
    const px = prob(x);
    if (px <= observed * (1 + 1e-7)) p += px;
  }
  return Math.min(1, p);
}

/** Fewer sent than this on either side and there's nothing to say yet. */
export const TOO_FEW = 5;

export type Verdict = "too-few" | "same" | "hint" | "likely";

/** What the numbers say, in words: too few to tell, no real difference, a hint, or likely real. */
export function verdict(
  aHits: number,
  aTotal: number,
  bHits: number,
  bTotal: number,
): { kind: Verdict; p: number } {
  const p = fisherExact(aHits, aTotal, bHits, bTotal);
  if (aTotal < TOO_FEW || bTotal < TOO_FEW) return { kind: "too-few", p };
  if (p < 0.05) return { kind: "likely", p };
  if (p < 0.2) return { kind: "hint", p };
  return { kind: "same", p };
}
