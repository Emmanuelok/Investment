import { describe, it, expect } from "vitest";
import { SCENARIOS, classifyAsset, applyScenario, computeStress, type StressHolding } from "./stress";

const gfc = SCENARIOS.find((s) => s.id === "gfc2008")!;

describe("stress / scenario engine", () => {
  it("classifies asset classes from symbols", () => {
    expect(classifyAsset("TLT")).toBe("bond");
    expect(classifyAsset("GLD")).toBe("gold");
    expect(classifyAsset("VNQ")).toBe("reit");
    expect(classifyAsset("BTC-USD")).toBe("crypto");
    expect(classifyAsset("NVDA")).toBe("equity");
  });

  it("an all-equity beta-1 holding takes the full equity shock", () => {
    const r = applyScenario([{ sym: "SPY", weight: 1, beta: 1, assetClass: "equity" }], gfc);
    expect(r.portfolioReturn).toBeCloseTo(-38, 6);
  });

  it("a bond holding gets the bond shock, not the equity shock", () => {
    const r = applyScenario([{ sym: "TLT", weight: 1, assetClass: "bond" }], gfc);
    expect(r.portfolioReturn).toBeCloseTo(6, 6);
  });

  it("beta scales the equity drawdown", () => {
    const lo = applyScenario([{ sym: "A", weight: 1, beta: 0.5, assetClass: "equity" }], gfc).portfolioReturn;
    const hi = applyScenario([{ sym: "B", weight: 1, beta: 1.5, assetClass: "equity" }], gfc).portfolioReturn;
    expect(hi).toBeLessThan(lo); // higher beta = worse
    expect(hi).toBeCloseTo(-57, 6);
  });

  it("normalizes weights and sums contributions to the portfolio return", () => {
    const holdings: StressHolding[] = [{ sym: "SPY", weight: 2, beta: 1, assetClass: "equity" }, { sym: "TLT", weight: 2, assetClass: "bond" }];
    const r = applyScenario(holdings, gfc);
    expect(r.portfolioReturn).toBeCloseTo(0.5 * -38 + 0.5 * 6, 6); // −16
    expect(r.contributions.reduce((a, c) => a + c.contribution, 0)).toBeCloseTo(r.portfolioReturn, 9);
    expect(r.contributions.reduce((a, c) => a + c.weight, 0)).toBeCloseTo(1, 9);
  });

  it("computeStress runs every scenario and sorts worst-first", () => {
    const res = computeStress([{ sym: "SPY", weight: 1, beta: 1, assetClass: "equity" }]);
    expect(res.length).toBe(SCENARIOS.length);
    for (let i = 1; i < res.length; i++) expect(res[i - 1].portfolioReturn).toBeLessThanOrEqual(res[i].portfolioReturn);
  });

  it("a diversified book is less negative than pure equity in the GFC", () => {
    const equityOnly = applyScenario([{ sym: "SPY", weight: 1, beta: 1, assetClass: "equity" }], gfc).portfolioReturn;
    const diversified = applyScenario([
      { sym: "SPY", weight: 0.5, beta: 1, assetClass: "equity" },
      { sym: "TLT", weight: 0.3, assetClass: "bond" },
      { sym: "GLD", weight: 0.2, assetClass: "gold" },
    ], gfc).portfolioReturn;
    expect(diversified).toBeGreaterThan(equityOnly);
  });
});
