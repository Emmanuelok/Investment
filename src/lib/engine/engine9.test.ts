import { describe, it, expect } from "vitest";
import { dcf, dcfSensitivity } from "./dcf";

describe("DCF valuation", () => {
  it("flat-FCF perpetuity identity: EV ≈ fcf0 / r", () => {
    // g=0, terminalGrowth=0 → total value telescopes to a perpetuity = fcf0/r
    const r = dcf({ fcf0: 100, growthRate: 0, terminalGrowth: 0, discountRate: 0.1, years: 10 });
    expect(r.enterpriseValue).toBeCloseTo(1000, 2);
  });
  it("per share = equity value / shares; net debt reduces equity", () => {
    const r = dcf({ fcf0: 100, growthRate: 0, terminalGrowth: 0, discountRate: 0.1, years: 10, netDebt: 200, shares: 100 });
    expect(r.equityValue).toBeCloseTo(800, 2);
    expect(r.intrinsicPerShare).toBeCloseTo(8, 4);
  });
  it("higher discount rate lowers value; higher growth raises it", () => {
    const baseEv = dcf({ fcf0: 100, growthRate: 0.05, terminalGrowth: 0.02, discountRate: 0.09, years: 10 }).enterpriseValue;
    const highR = dcf({ fcf0: 100, growthRate: 0.05, terminalGrowth: 0.02, discountRate: 0.12, years: 10 }).enterpriseValue;
    const highG = dcf({ fcf0: 100, growthRate: 0.10, terminalGrowth: 0.02, discountRate: 0.09, years: 10 }).enterpriseValue;
    expect(highR).toBeLessThan(baseEv);
    expect(highG).toBeGreaterThan(baseEv);
  });
  it("guards against terminalGrowth ≥ discountRate", () => {
    const r = dcf({ fcf0: 100, growthRate: 0.05, terminalGrowth: 0.20, discountRate: 0.08, years: 10 });
    expect(Number.isFinite(r.enterpriseValue)).toBe(true);
    expect(r.enterpriseValue).toBeGreaterThan(0);
  });
  it("terminal share of value is between 0 and 1; upside computes", () => {
    const r = dcf({ fcf0: 100, growthRate: 0.06, terminalGrowth: 0.025, discountRate: 0.09, years: 10, shares: 50, currentPrice: 30 });
    expect(r.terminalPctOfValue).toBeGreaterThan(0);
    expect(r.terminalPctOfValue).toBeLessThan(1);
    expect(r.upsidePct).not.toBeNull();
  });
  it("sensitivity grid matches dimensions and is monotonic in discount rate", () => {
    const base = { fcf0: 100, growthRate: 0.05, terminalGrowth: 0.02, discountRate: 0.09, years: 10, shares: 100 };
    const grid = dcfSensitivity(base, [0.08, 0.10, 0.12], [0.01, 0.02, 0.03]);
    expect(grid.length).toBe(3);
    expect(grid[0].length).toBe(3);
    // for a fixed terminal growth, a higher discount rate → lower value
    expect(grid[0][1]!).toBeGreaterThan(grid[2][1]!);
  });
});
