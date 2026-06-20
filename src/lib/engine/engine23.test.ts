import { describe, it, expect } from "vitest";
import {
  closeToCloseVol, parkinsonVol, garmanKlassVol, rogersSatchellVol, yangZhangVol,
  volatilityCone, analyzeVolatility, type OHLC,
} from "./volatility";

// n identical bars: open=close=100, high/low = 100·e^±0.01 (so ln(H/L)=0.02).
const flatRange = (n: number): OHLC[] =>
  Array.from({ length: n }, () => ({ o: 100, c: 100, h: 100 * Math.exp(0.01), l: 100 * Math.exp(-0.01) }));

const dead = (n: number): OHLC[] => Array.from({ length: n }, () => ({ o: 100, h: 100, l: 100, c: 100 }));

function lcg(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647 - 0.5);
}
function genBars(n: number, seed: number): OHLC[] {
  const rnd = lcg(seed);
  let prev = 100;
  const bars: OHLC[] = [];
  for (let i = 0; i < n; i++) {
    const o = prev * (1 + rnd() * 0.004);
    const c = prev * Math.exp(rnd() * 0.02);
    const h = Math.max(o, c) * (1 + Math.abs(rnd()) * 0.012);
    const l = Math.min(o, c) * (1 - Math.abs(rnd()) * 0.012);
    bars.push({ o, h, l, c });
    prev = c;
  }
  return bars;
}

describe("volatility estimators — closed forms", () => {
  it("Parkinson matches its closed form on constant-range bars", () => {
    // σ² = (ln(H/L))²/(4 ln2); annualized = √(σ²·252)
    expect(parkinsonVol(flatRange(50))).toBeCloseTo(Math.sqrt((0.02 ** 2 / (4 * Math.LN2)) * 252), 5);
  });

  it("Garman-Klass and Rogers-Satchell match closed forms (o=c)", () => {
    // both reduce to √(0.0002·252) for these symmetric, drift-free bars
    const expected = Math.sqrt(0.0002 * 252);
    expect(garmanKlassVol(flatRange(50))).toBeCloseTo(expected, 5);
    expect(rogersSatchellVol(flatRange(50))).toBeCloseTo(expected, 5);
  });

  it("Yang-Zhang sits below Rogers-Satchell when overnight/open-close moves vanish", () => {
    const yz = yangZhangVol(flatRange(50));
    const rs = rogersSatchellVol(flatRange(50));
    expect(yz).toBeGreaterThan(0);
    expect(yz).toBeLessThan(rs); // (1−k) weighting on RS, zero from the other two terms
  });

  it("all estimators are zero on dead (no-movement) bars", () => {
    const d = dead(50);
    expect(parkinsonVol(d)).toBe(0);
    expect(garmanKlassVol(d)).toBe(0);
    expect(rogersSatchellVol(d)).toBe(0);
    expect(yangZhangVol(d)).toBe(0);
    expect(closeToCloseVol(d.map((b) => b.c))).toBe(0);
  });
});

describe("volatility — cone & full report", () => {
  it("cone windows are ordered and percentiles bounded", () => {
    const closes = genBars(400, 3).map((b) => b.c);
    const cone = volatilityCone(closes, [10, 20, 30, 60]);
    expect(cone.length).toBe(4);
    for (const p of cone) {
      expect(p.min).toBeLessThanOrEqual(p.p25);
      expect(p.p25).toBeLessThanOrEqual(p.median);
      expect(p.median).toBeLessThanOrEqual(p.p75);
      expect(p.p75).toBeLessThanOrEqual(p.max);
      expect(p.percentile).toBeGreaterThanOrEqual(0);
      expect(p.percentile).toBeLessThanOrEqual(100);
      expect(p.current).toBeGreaterThan(0);
    }
  });

  it("cone skips windows longer than the available history", () => {
    const closes = genBars(40, 1).map((b) => b.c);
    const cone = volatilityCone(closes, [10, 250]);
    expect(cone.map((c) => c.window)).toEqual([10]);
  });

  it("analyzeVolatility returns positive, finite, comparable estimators", () => {
    const r = analyzeVolatility(genBars(400, 7));
    for (const v of [r.closeToClose, r.parkinson, r.garmanKlass, r.rogersSatchell, r.yangZhang]) {
      expect(v).toBeGreaterThan(0);
      expect(Number.isFinite(v)).toBe(true);
    }
    // range-based estimators should be within an order of magnitude of close-to-close
    expect(r.parkinson).toBeLessThan(r.closeToClose * 5 + 1);
    expect(r.bars).toBe(400);
    expect(r.cone.length).toBeGreaterThan(0);
    expect(r.percentile).toBeGreaterThanOrEqual(0);
    expect(r.percentile).toBeLessThanOrEqual(100);
  });
});
