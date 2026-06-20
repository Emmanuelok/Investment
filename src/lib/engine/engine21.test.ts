import { describe, it, expect } from "vitest";
import { autocorr, varianceRatio, hurstRS, analyzeEfficiency, logReturns } from "./efficiency";

// Deterministic AR(1) return process → price series, for repeatable regime tests.
function lcg(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647 - 0.5; // centered ~U(−0.5, 0.5)
  };
}
function arCloses(phi: number, n: number, seed: number): number[] {
  const rnd = lcg(seed);
  const closes = [100];
  let prev = 0;
  for (let i = 0; i < n; i++) {
    const e = rnd() * 0.02;
    const r = phi * prev + e;
    prev = r;
    closes.push(closes[closes.length - 1] * Math.exp(r));
  }
  return closes;
}

describe("efficiency — autocorrelation & variance ratio", () => {
  it("autocorr matches hand-computed values", () => {
    expect(autocorr([1, -1, 1, -1, 1, -1], 1)).toBeCloseTo(-5 / 6, 6);
    expect(autocorr([1, 2, 3, 4, 5, 6], 1)).toBeCloseTo(0.5, 6);
  });

  it("varianceRatio is <1 for alternating (mean-reverting) returns", () => {
    const alt = Array.from({ length: 40 }, (_, i) => (i % 2 === 0 ? 1 : -1));
    expect(varianceRatio(alt, 2)).toBeLessThan(1);
  });

  it("varianceRatio is >1 for same-sign blocks (trending) returns", () => {
    const blocks: number[] = [];
    for (let i = 0; i < 40; i++) blocks.push(Math.floor(i / 5) % 2 === 0 ? 1 : -1);
    expect(varianceRatio(blocks, 2)).toBeGreaterThan(1);
  });

  it("varianceRatio guards degenerate inputs", () => {
    expect(varianceRatio([0, 0, 0, 0, 0], 2)).toBe(1);
    expect(varianceRatio([1, 2], 5)).toBe(1);
  });

  it("logReturns drops non-positive prices and counts correctly", () => {
    expect(logReturns([100, 110, 121]).length).toBe(2);
    expect(logReturns([100, 110, 121])[0]).toBeCloseTo(Math.log(1.1), 6);
  });
});

describe("efficiency — Hurst & full classification", () => {
  it("Hurst is higher for a persistent process than an anti-persistent one", () => {
    const trend = logReturns(arCloses(0.6, 400, 11));
    const revert = logReturns(arCloses(-0.6, 400, 11));
    expect(hurstRS(trend)).toBeGreaterThan(hurstRS(revert));
  });

  it("classifies a positively-autocorrelated series as Trending", () => {
    const r = analyzeEfficiency(arCloses(0.6, 400, 7));
    expect(r.ac1).toBeGreaterThan(0);
    expect(r.vr10).toBeGreaterThan(1);
    expect(r.classification).toBe("Trending");
    expect(r.votes).toBeGreaterThan(0);
  });

  it("classifies a negatively-autocorrelated series as Mean-reverting", () => {
    const r = analyzeEfficiency(arCloses(-0.6, 400, 9));
    expect(r.ac1).toBeLessThan(0);
    expect(r.vr10).toBeLessThan(1);
    expect(r.classification).toBe("Mean-reverting");
    expect(r.votes).toBeLessThan(0);
  });

  it("a near-random walk lands close to Hurst 0.5 and reports nObs", () => {
    const r = analyzeEfficiency(arCloses(0, 500, 5));
    expect(r.hurst).toBeGreaterThan(0.3);
    expect(r.hurst).toBeLessThan(0.7);
    expect(r.nObs).toBe(500);
    expect(["Trending", "Mean-reverting", "Random walk"]).toContain(r.classification);
  });
});
