import { describe, it, expect } from "vitest";
import { rollingMetrics, drawdownAnalytics } from "./riskmetrics";

describe("rolling metrics", () => {
  const up = Array.from({ length: 200 }, (_, i) => 100 * Math.pow(1.003, i));
  it("emits a point per window step with finite Sharpe/vol", () => {
    const r = rollingMetrics(up, 63);
    expect(r.length).toBeGreaterThan(100);
    for (const p of r) { expect(Number.isFinite(p.sharpe)).toBe(true); expect(p.vol).toBeGreaterThanOrEqual(0); }
  });
  it("beta vs itself is ~1, null without a benchmark", () => {
    expect(rollingMetrics(up, 63)[0].beta).toBeNull();
    const withBench = rollingMetrics(up, 63, up);
    expect(withBench.at(-1)!.beta).toBeCloseTo(1, 4);
  });
  it("steady uptrend has a positive rolling Sharpe", () => {
    expect(rollingMetrics(up, 63).at(-1)!.sharpe).toBeGreaterThan(0);
  });
});

describe("drawdown analytics", () => {
  it("computes a known drawdown exactly", () => {
    // 100 → 120 (peak) → 60 (−50%) → 90
    const series = [100, 110, 120, 90, 60, 75, 90];
    const d = drawdownAnalytics(series);
    expect(d.maxDrawdownPct).toBeCloseTo(-50, 6);
    expect(d.underwater[0]).toBeCloseTo(0, 6);
    expect(d.underwater[2]).toBeCloseTo(0, 6); // at the peak
    expect(d.currentDrawdownPct).toBeCloseTo(-25, 6); // 90 vs 120 peak
    expect(d.inDrawdown).toBe(true);
    expect(d.ulcerIndex).toBeGreaterThan(0);
  });
  it("a monotonic rise has no drawdown", () => {
    const d = drawdownAnalytics([1, 2, 3, 4, 5]);
    expect(d.maxDrawdownPct).toBeCloseTo(0, 9);
    expect(d.episodes.length).toBe(0);
    expect(d.inDrawdown).toBe(false);
  });
  it("episodes are sorted worst-first and bounded", () => {
    const s = [100, 90, 100, 80, 100, 95, 100, 70, 100];
    const d = drawdownAnalytics(s);
    expect(d.episodes.length).toBeGreaterThan(0);
    for (let k = 1; k < d.episodes.length; k++) expect(d.episodes[k - 1].depthPct).toBeLessThanOrEqual(d.episodes[k].depthPct);
    expect(d.episodes[0].depthPct).toBeCloseTo(-30, 6); // 70 vs 100
  });
});
