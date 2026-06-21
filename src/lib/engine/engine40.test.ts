import { describe, it, expect } from "vitest";
import { screenPairs, type PriceSeries } from "./pairs-screener";

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296 - 0.5;
  };
}
// log random walk (common stochastic trend)
function rwLog(seed: number, n: number, vol = 0.02): number[] {
  const rnd = mulberry32(seed * 2654435761);
  let lp = Math.log(100);
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    lp += rnd() * vol;
    out.push(lp);
  }
  return out;
}
// persistent AR(1) (mean-reverting idiosyncratic component, half-life ≈ −ln2/ln(phi))
function ar1(seed: number, n: number, phi = 0.92, scale = 0.006): number[] {
  const rnd = mulberry32(seed * 40503);
  let prev = 0;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    prev = phi * prev + rnd() * scale;
    out.push(prev);
  }
  return out;
}

const N = 220;
const logW = rwLog(7, N);
const arA = ar1(11, N);
const arB = ar1(22, N);
// AA, BB share the common trend + a mean-reverting spread ⇒ cointegrated
const AA = logW.map((lw, i) => Math.exp(lw + arA[i]));
const BB = logW.map((lw, i) => Math.exp(lw + arB[i]));
// CC, DD are independent random walks ⇒ unrelated
const CC = rwLog(33, N).map((x) => Math.exp(x));
const DD = rwLog(44, N).map((x) => Math.exp(x));

const universe: PriceSeries[] = [
  { sym: "AA", closes: AA },
  { sym: "BB", closes: BB },
  { sym: "CC", closes: CC },
  { sym: "DD", closes: DD },
];

describe("pairs-screener", () => {
  it("scans every pair in the universe", () => {
    const r = screenPairs(universe, { window: 90 });
    expect(r.scanned).toBe(6); // 4 choose 2
  });

  it("ranks the cointegrated pair top and flags it tradeable", () => {
    const r = screenPairs(universe, { window: 90 });
    expect(r.pairs[0].a).toBe("AA");
    expect(r.pairs[0].b).toBe("BB");
    expect(r.pairs[0].correlation).toBeGreaterThan(0.5);
    expect(r.pairs[0].tradeable).toBe(true);
    expect(r.pairs[0].halfLife).toBeGreaterThan(1);
    expect(r.pairs[0].halfLife).toBeLessThan(60);
  });

  it("scores the cointegrated pair above an unrelated pair", () => {
    const r = screenPairs(universe, { window: 90 });
    const ab = r.pairs.find((p) => p.a === "AA" && p.b === "BB");
    const cd = r.pairs.find((p) => (p.a === "CC" && p.b === "DD") || (p.a === "DD" && p.b === "CC"));
    expect(ab).toBeDefined();
    expect(cd).toBeDefined();
    expect(ab!.score).toBeGreaterThan(cd!.score);
    expect(cd!.tradeable).toBe(false);
  });

  it("provides a human-readable action and respects the top-N cap", () => {
    const r = screenPairs(universe, { window: 90, top: 2 });
    expect(r.pairs.length).toBe(2);
    expect(typeof r.pairs[0].action).toBe("string");
    expect(r.pairs[0].action.length).toBeGreaterThan(0);
  });
});
