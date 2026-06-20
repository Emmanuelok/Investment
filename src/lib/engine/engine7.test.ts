import { describe, it, expect } from "vitest";
import { bondPrice, yieldToMaturity, analyzeBond, priceChangeForBpShift } from "./bonds";
import { kellyFraction, expectancy, riskOfRuin, positionSize, suggestedRiskPct } from "./sizing";

describe("fixed income", () => {
  it("a par bond prices to face when ytm = coupon", () => {
    expect(bondPrice({ face: 1000, couponRate: 0.05, ytm: 0.05, years: 10, freq: 2 })).toBeCloseTo(1000, 4);
  });
  it("price falls as yield rises (inverse)", () => {
    const lo = bondPrice({ face: 1000, couponRate: 0.05, ytm: 0.04, years: 10, freq: 2 });
    const hi = bondPrice({ face: 1000, couponRate: 0.05, ytm: 0.06, years: 10, freq: 2 });
    expect(lo).toBeGreaterThan(1000);
    expect(hi).toBeLessThan(1000);
  });
  it("YTM inverts the pricing function", () => {
    const price = bondPrice({ face: 1000, couponRate: 0.04, ytm: 0.055, years: 7, freq: 2 });
    const y = yieldToMaturity(1000, 0.04, price, 7, 2);
    expect(y).not.toBeNull();
    expect(y!).toBeCloseTo(0.055, 4);
  });
  it("zero-coupon Macaulay duration ≈ maturity; modified < Macaulay", () => {
    const a = analyzeBond({ face: 1000, couponRate: 0, ytm: 0.05, years: 10, freq: 1 });
    expect(a.macaulayDuration).toBeCloseTo(10, 4);
    expect(a.modifiedDuration).toBeLessThan(a.macaulayDuration);
    expect(a.convexity).toBeGreaterThan(0);
    expect(a.dv01).toBeGreaterThan(0);
  });
  it("duration/convexity estimate ≈ full reprice for a small shift", () => {
    const b = { face: 1000, couponRate: 0.05, ytm: 0.05, years: 10, freq: 2 };
    const a = analyzeBond(b);
    const est = priceChangeForBpShift(a, 50); // +50bp
    const actual = (bondPrice({ ...b, ytm: 0.055 }) / a.price - 1) * 100;
    expect(Math.abs(est - actual)).toBeLessThan(0.1); // within 0.1%
  });
});

describe("position sizing", () => {
  it("kelly matches known cases", () => {
    expect(kellyFraction(0.6, 1)).toBeCloseTo(0.2, 6);
    expect(kellyFraction(0.5, 1)).toBeCloseTo(0, 6);
    expect(kellyFraction(0.5, 2)).toBeCloseTo(0.25, 6);
  });
  it("expectancy signs correctly", () => {
    expect(expectancy(0.5, 2, 1).perTrade).toBeCloseTo(0.5, 6);
    expect(expectancy(0.5, 2, 1).rMultiple).toBeCloseTo(0.5, 6);
    expect(expectancy(0.3, 1, 1).perTrade).toBeLessThan(0);
  });
  it("risk of ruin: no edge → 100%, edge → falls with account units", () => {
    expect(riskOfRuin(0.45, 20)).toBe(100);
    expect(riskOfRuin(0.55, 5)).toBeLessThan(riskOfRuin(0.55, 2));
    expect(riskOfRuin(0.6, 10)).toBeLessThan(5);
  });
  it("stop-based sizing risks exactly riskPct of equity", () => {
    const r = positionSize({ equity: 100000, riskPct: 1, entry: 100, stop: 95 });
    expect(r.riskPerShare).toBe(5);
    expect(r.shares).toBe(200); // 1000 risk / 5
    expect(r.shares * r.riskPerShare).toBeLessThanOrEqual(1000 + 1e-9);
    expect(r.rTarget2).toBe(110); // entry + 2R
    expect(r.positionPct).toBeCloseTo(20, 6);
  });
  it("short trade targets point the right way", () => {
    const r = positionSize({ equity: 50000, riskPct: 2, entry: 100, stop: 105 });
    expect(r.rTarget2).toBe(90); // 2R below entry
  });
  it("fractional-kelly suggestion is clamped", () => {
    expect(suggestedRiskPct(0.9, 5, 0.5, 5)).toBeLessThanOrEqual(5);
    expect(suggestedRiskPct(0.4, 1, 0.5, 5)).toBe(0); // no edge
  });
});
