import { describe, it, expect } from "vitest";
import { analyzePortfolio, type Holding } from "./portfolio";
import { computeSeasonality, type DatedBar } from "./seasonality";

const series = (start: number, drift: number, n = 260): number[] => Array.from({ length: n }, (_, i) => start * Math.pow(1 + drift, i));

describe("portfolio analytics", () => {
  const holdings: Holding[] = [
    { sym: "A", weight: 0.5, closes: series(100, 0.004) },
    { sym: "B", weight: 0.3, closes: series(50, 0.002) },
    { sym: "C", weight: 0.2, closes: series(80, -0.001) },
  ];
  it("normalizes weights and returns aligned outputs", () => {
    const r = analyzePortfolio(holdings);
    expect(r.contributions.reduce((a, c) => a + c.weight, 0)).toBeCloseTo(1, 6);
    expect(r.equity.length).toBeGreaterThan(2);
    expect(r.symbols).toEqual(["A", "B", "C"]);
  });
  it("risk contributions sum to ~100%", () => {
    const r = analyzePortfolio(holdings);
    const sum = r.contributions.reduce((a, c) => a + c.riskContribPct, 0);
    expect(sum).toBeGreaterThan(95);
    expect(sum).toBeLessThan(105);
  });
  it("diversification ratio ≥ ~1", () => {
    const r = analyzePortfolio(holdings);
    expect(r.diversification).toBeGreaterThanOrEqual(0.99);
  });
  it("single-asset portfolio has ~100% risk contribution and div ratio ~1", () => {
    const r = analyzePortfolio([{ sym: "X", weight: 1, closes: series(100, 0.003) }]);
    expect(r.contributions[0].riskContribPct).toBeCloseTo(100, 1);
    expect(r.diversification).toBeCloseTo(1, 2);
  });
  it("VaR is negative for a volatile portfolio", () => {
    const wiggly = (start: number, ph: number) => Array.from({ length: 260 }, (_, i) => start * (1 + Math.sin(i / 5 + ph) * 0.04 + i * 0.0005));
    const r = analyzePortfolio([
      { sym: "A", weight: 0.6, closes: wiggly(100, 0) },
      { sym: "B", weight: 0.4, closes: wiggly(50, 1.5) },
    ]);
    expect(r.var95).toBeLessThan(0);
    expect(r.es95).toBeLessThanOrEqual(r.var95 + 1e-9);
  });
});

describe("seasonality", () => {
  // build ~3 years of daily bars with a deterministic wiggle
  const bars: DatedBar[] = [];
  let c = 100;
  const start = Date.UTC(2022, 0, 3) / 1000;
  for (let i = 0; i < 780; i++) {
    const t = start + i * 86400;
    const d = new Date(t * 1000).getUTCDay();
    if (d === 0 || d === 6) continue; // weekdays only
    c *= 1 + Math.sin(i / 9) * 0.01 + 0.0003;
    bars.push({ t, c });
  }
  it("returns 12 months and 5 weekdays with counts", () => {
    const s = computeSeasonality(bars);
    expect(s.monthly.length).toBe(12);
    expect(s.dayOfWeek.length).toBe(5);
    expect(s.dayOfWeek.every((d) => d.dow >= 1 && d.dow <= 5)).toBe(true);
    expect(s.monthly.some((m) => m.count > 0)).toBe(true);
  });
  it("best month avg ≥ worst month avg; posRate bounded", () => {
    const s = computeSeasonality(bars);
    expect(s.bestMonth.avgRet).toBeGreaterThanOrEqual(s.worstMonth.avgRet);
    expect(s.positiveMonthRate).toBeGreaterThanOrEqual(0);
    expect(s.positiveMonthRate).toBeLessThanOrEqual(100);
    expect(s.years).toBeGreaterThan(1.5);
  });
});
