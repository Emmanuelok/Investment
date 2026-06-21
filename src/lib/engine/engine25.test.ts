import { describe, it, expect } from "vitest";
import { performanceRatios, simpleReturns, maxDrawdownOf } from "./performance";

const closesFromReturns = (rs: number[], start = 100): number[] => {
  const c = [start];
  for (const r of rs) c.push(c[c.length - 1] * (1 + r));
  return c;
};
// symmetric ±0.001·k returns (mean 0, zero skew)
const symmetric = (): number[] => {
  const rs: number[] = [];
  for (let k = 1; k <= 20; k++) rs.push(0.001 * k, -0.001 * k);
  return rs;
};

describe("performance — primitives", () => {
  it("simpleReturns and maxDrawdownOf are exact", () => {
    expect(simpleReturns([100, 110, 121])).toEqual([expect.closeTo(0.1, 10), expect.closeTo(0.1, 10)]);
    expect(maxDrawdownOf([0.1, -0.5])).toBeCloseTo(-0.5, 10); // 1→1.1→0.55, peak 1.1
  });

  it("Sharpe matches its closed form", () => {
    // returns [0.02, 0.00]: mean 0.01, sd √0.0002, sharpe = (0.01/sd)·√252
    const p = performanceRatios([100, 102, 102]);
    expect(p.sharpe).toBeCloseTo((0.01 / Math.sqrt(0.0002)) * Math.sqrt(252), 2);
  });
});

describe("performance — ratios & shape", () => {
  it("an all-positive (varying) uptrend has no downside, drawdown or losing days", () => {
    // all returns > 0 but varying, so volatility (and Sharpe) are non-zero
    const ups = Array.from({ length: 29 }, (_, i) => (i % 3 === 0 ? 0.02 : i % 3 === 1 ? 0.005 : 0.012));
    const p = performanceRatios(closesFromReturns(ups));
    expect(p.winRate).toBe(1);
    expect(p.maxDrawdown).toBe(0);
    expect(p.sortino).toBeNull(); // no downside deviation
    expect(p.calmar).toBeNull(); // no drawdown
    expect(p.gainToPain).toBeNull();
    expect(p.sharpe).toBeGreaterThan(0);
    expect(p.cagr).toBeGreaterThan(0);
    expect(p.observations).toBe(29);
  });

  it("a symmetric return distribution has ~zero skew and unit tail ratio", () => {
    const p = performanceRatios(closesFromReturns(symmetric()));
    expect(p.skew).toBeCloseTo(0, 6);
    expect(p.tailRatio).not.toBeNull();
    expect(p.tailRatio as number).toBeCloseTo(1, 4);
    expect(p.omega).not.toBeNull();
  });

  it("computes a finite, positive Calmar when there is a real drawdown and positive CAGR", () => {
    const closes = closesFromReturns([0.05, 0.05, -0.2, 0.1, 0.1, 0.05]); // dips then recovers higher
    const p = performanceRatios(closes);
    expect(p.maxDrawdown).toBeLessThan(0);
    expect(p.calmar).not.toBeNull();
    expect(p.calmar as number).toBeGreaterThan(0);
  });

  it("a fat outlier lifts excess kurtosis above zero", () => {
    const rs: number[] = Array.from({ length: 40 }, (_, i) => (i % 2 ? -0.004 : 0.004));
    rs.push(0.15); // shock
    expect(performanceRatios(closesFromReturns(rs)).kurtosis).toBeGreaterThan(0);
  });

  it("handles constant prices without NaN", () => {
    const p = performanceRatios([100, 100, 100, 100]);
    expect(p.annVol).toBe(0);
    expect(p.sharpe).toBe(0);
    expect(p.sortino).toBeNull();
    expect(p.winRate).toBe(0);
    expect(p.observations).toBe(3);
    expect(Number.isFinite(p.cagr)).toBe(true);
  });
});
