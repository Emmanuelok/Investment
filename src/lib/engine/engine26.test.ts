import { describe, it, expect } from "vitest";
import {
  meanReturns, tangencyPortfolio, gmvPortfolio, maxSharpe, efficientFrontier, maxSharpeLongOnly, analyzeTangency,
} from "./tangency";
import type { CovMatrix } from "./optimizer";

// Two uncorrelated assets: A (μ=10%, σ²=0.04), B (μ=6%, σ²=0.01).
const MU = [0.1, 0.06];
const COV: CovMatrix = [
  [0.04, 0],
  [0, 0.01],
];
const RF = 0.02;

describe("tangency — closed-form portfolios for uncorrelated assets", () => {
  it("tangency weights ∝ excess return / variance", () => {
    // Σ⁻¹(μ−rf) = [25·0.08, 100·0.04] = [2,4] → normalized [1/3, 2/3]
    const t = tangencyPortfolio(MU, COV, RF);
    expect(t).not.toBeNull();
    expect(t!.weights[0]).toBeCloseTo(1 / 3, 6);
    expect(t!.weights[1]).toBeCloseTo(2 / 3, 6);
  });

  it("GMV weights ∝ 1/variance", () => {
    const g = gmvPortfolio(MU, COV);
    expect(g).not.toBeNull();
    expect(g!.weights[0]).toBeCloseTo(0.2, 6); // 25/125
    expect(g!.weights[1]).toBeCloseTo(0.8, 6); // 100/125
  });

  it("max Sharpe equals √(Sharpe_A² + Sharpe_B²) and the tangency portfolio attains it", () => {
    const ms = maxSharpe(MU, COV, RF); // √(0.4² + 0.4²) = √0.32
    expect(ms).toBeCloseTo(Math.sqrt(0.32), 6);
    const t = tangencyPortfolio(MU, COV, RF);
    expect(t!.sharpe).toBeCloseTo(ms, 6);
  });

  it("the efficient frontier bottoms out at the GMV volatility", () => {
    const g = gmvPortfolio(MU, COV);
    const fr = efficientFrontier(MU, COV, 60);
    expect(fr.length).toBeGreaterThan(10);
    const minVol = Math.min(...fr.map((p) => p.vol));
    expect(minVol).toBeCloseTo(g!.vol, 3); // GMV vol = √(1/125) ≈ 0.08944
    expect(g!.vol).toBeCloseTo(Math.sqrt(1 / 125), 6);
  });
});

describe("tangency — long-only & guards", () => {
  it("long-only max-Sharpe matches the analytical tangency when it is already long-only", () => {
    const lo = maxSharpeLongOnly(MU, COV, RF);
    expect(lo.weights[0]).toBeCloseTo(1 / 3, 2);
    expect(lo.weights[1]).toBeCloseTo(2 / 3, 2);
    expect(lo.sharpe).toBeCloseTo(maxSharpe(MU, COV, RF), 3);
  });

  it("long-only drops an asset whose excess return is negative", () => {
    // B's return (1%) is below rf (2%) → unconstrained tangency would short it
    const lo = maxSharpeLongOnly([0.1, 0.01], COV, RF);
    expect(lo.weights[0]).toBeGreaterThan(0.95);
    expect(lo.weights[1]).toBeLessThan(0.05);
  });

  it("meanReturns annualizes the per-period mean", () => {
    expect(meanReturns([[0.001, 0.001, 0.001]])[0]).toBeCloseTo(0.252, 6);
    expect(meanReturns([[0.001, 0.001]], false)[0]).toBeCloseTo(0.001, 6);
  });

  it("returns null / empty for a singular covariance (perfectly correlated assets)", () => {
    const singular: CovMatrix = [
      [0.04, 0.04],
      [0.04, 0.04],
    ];
    expect(tangencyPortfolio(MU, singular, RF)).toBeNull();
    expect(efficientFrontier(MU, singular)).toEqual([]);
    const res = analyzeTangency(MU, singular, RF);
    expect(res.tangency).toBeNull();
    expect(res.frontier).toEqual([]);
  });

  it("analyzeTangency assembles tangency, gmv, long-only, frontier and maxSharpe", () => {
    const res = analyzeTangency(MU, COV, RF);
    expect(res.assets).toBe(2);
    expect(res.tangency!.sharpe).toBeCloseTo(res.maxSharpe, 6);
    expect(res.gmv!.vol).toBeLessThan(res.tangency!.vol);
    expect(res.frontier.length).toBeGreaterThan(10);
  });
});
