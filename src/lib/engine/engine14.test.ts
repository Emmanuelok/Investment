import { describe, it, expect } from "vitest";
import { analyzeStrategy, presetLegs, type StrategySpec } from "./options-strategy";

const base = { spot: 100, vol: 0.25, rate: 0.04, days: 60 };
const mk = (legs: StrategySpec["legs"]): StrategySpec => ({ ...base, legs });

describe("options strategy engine", () => {
  it("long call: debit position, break-even above strike, positive delta, bounded loss", () => {
    const r = analyzeStrategy(mk(presetLegs("longCall", 100)));
    expect(r.netDebit).toBeGreaterThan(0); // you pay a premium
    expect(r.netGreeks.delta).toBeGreaterThan(0);
    expect(r.breakevens.length).toBe(1);
    expect(r.breakevens[0]).toBeGreaterThan(100);
    expect(r.maxLoss).toBeCloseTo(-r.legs[0].premium, 1); // can't lose more than the premium
    expect(r.profitUnlimited).toBe(true);
  });

  it("short put: credit position, positive delta", () => {
    const r = analyzeStrategy(mk(presetLegs("shortPut", 100)));
    expect(r.netDebit).toBeLessThan(0); // you receive a credit
    expect(r.netGreeks.delta).toBeGreaterThan(0);
  });

  it("bull call spread: capped profit & loss, single break-even", () => {
    const r = analyzeStrategy(mk(presetLegs("bullCallSpread", 100)));
    expect(r.netDebit).toBeGreaterThan(0);
    expect(r.profitUnlimited).toBe(false);
    expect(r.lossUnlimited).toBe(false);
    expect(r.breakevens.length).toBe(1);
    // max profit ≈ spread width − debit; both finite
    expect(r.maxProfit).toBeGreaterThan(0);
    expect(r.maxLoss).toBeLessThan(0);
  });

  it("long straddle: two break-evens straddling spot, near-zero net delta", () => {
    const r = analyzeStrategy(mk(presetLegs("longStraddle", 100)));
    expect(r.breakevens.length).toBe(2);
    expect(r.breakevens[0]).toBeLessThan(100);
    expect(r.breakevens[1]).toBeGreaterThan(100);
    expect(Math.abs(r.netGreeks.delta)).toBeLessThan(0.25);
    expect(r.netGreeks.vega).toBeGreaterThan(0); // long vol
  });

  it("iron condor: credit, capped both sides, two break-evens", () => {
    const r = analyzeStrategy(mk(presetLegs("ironCondor", 100)));
    expect(r.netDebit).toBeLessThan(0); // net credit
    expect(r.profitUnlimited).toBe(false);
    expect(r.lossUnlimited).toBe(false);
    expect(r.breakevens.length).toBe(2);
    expect(r.netGreeks.vega).toBeLessThan(0); // short vol
  });

  it("call butterfly: low cost, capped, peaks near the body strike", () => {
    const r = analyzeStrategy(mk(presetLegs("callButterfly", 100)));
    expect(r.profitUnlimited).toBe(false);
    expect(r.lossUnlimited).toBe(false);
    // max profit occurs near the middle strike (100)
    const peak = r.curve.reduce((a, b) => (b.payoff > a.payoff ? b : a));
    expect(Math.abs(peak.S - 100)).toBeLessThan(12);
  });

  it("curve covers a wide range and payoff is finite everywhere", () => {
    const r = analyzeStrategy(mk(presetLegs("longStrangle", 100)));
    expect(r.curve.length).toBeGreaterThan(100);
    expect(r.curve.every((p) => Number.isFinite(p.payoff) && Number.isFinite(p.value))).toBe(true);
  });
});
