import { describe, it, expect } from "vitest";
import { dollarVolume, amihudIlliquidity, rollSpread, analyzeLiquidity, type VBar } from "./liquidity";

// closes that alternate 100 ↔ 100·e^0.01 → returns alternate ±0.01.
const altCloses = (n: number): number[] => Array.from({ length: n }, (_, i) => (i % 2 === 0 ? 100 : 100 * Math.exp(0.01)));
const altBars = (n: number, v: number): VBar[] => altCloses(n).map((c) => ({ c, v }));
const trendCloses = (n: number): number[] => Array.from({ length: n }, (_, i) => 100 * Math.pow(1.001, i));

describe("liquidity — primitives", () => {
  it("dollarVolume averages close × volume", () => {
    expect(dollarVolume([{ c: 100, v: 1000 }, { c: 200, v: 2000 }])).toBeCloseTo(250000, 6);
  });

  it("Roll spread recovers 2·√(−cov) from alternating returns (≈200 bps)", () => {
    expect(rollSpread(altCloses(21)).bps).toBeCloseTo(200, 0);
  });

  it("Roll spread is zero when serial covariance is non-negative (trending)", () => {
    expect(rollSpread(trendCloses(40)).bps).toBe(0);
  });

  it("Amihud illiquidity halves when dollar volume doubles", () => {
    const a = amihudIlliquidity(altBars(40, 1_000_000));
    const b = amihudIlliquidity(altBars(40, 2_000_000));
    expect(a.perMillion).toBeGreaterThan(0);
    expect(b.perMillion).toBeCloseTo(a.perMillion / 2, 10);
  });

  it("Amihud is zero when prices do not move", () => {
    const flat: VBar[] = Array.from({ length: 20 }, () => ({ c: 100, v: 1_000_000 }));
    expect(amihudIlliquidity(flat).perMillion).toBe(0);
  });
});

describe("liquidity — full report", () => {
  it("rates a high dollar-volume name as very liquid", () => {
    const bars = altBars(60, 100_000_000); // ~$10B/day
    const r = analyzeLiquidity(bars);
    expect(r.avgDollarVolume).toBeGreaterThan(1e9);
    expect(r.liquidityScore).toBeGreaterThanOrEqual(75);
    expect(r.grade).toBe("Very liquid");
  });

  it("rates a thin name as thin and scores monotonically in volume", () => {
    const thin = analyzeLiquidity(altCloses(60).map((c) => ({ c: c / 10, v: 1000 }))); // ~$1k/day
    expect(thin.grade).toBe("Thin");
    const mid = analyzeLiquidity(altBars(60, 50_000));
    const big = analyzeLiquidity(altBars(60, 5_000_000));
    expect(big.liquidityScore).toBeGreaterThan(mid.liquidityScore);
    expect(mid.liquidityScore).toBeGreaterThan(thin.liquidityScore);
  });

  it("reports a recent-vs-baseline volume trend", () => {
    const bars: VBar[] = altCloses(60).map((c, i) => ({ c, v: i >= 40 ? 2_000_000 : 1_000_000 }));
    const r = analyzeLiquidity(bars, 20);
    expect(r.volumeTrend).toBeGreaterThan(0); // recent 20 bars are heavier
    expect(r.bars).toBe(60);
  });
});
