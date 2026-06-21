import { describe, it, expect } from "vitest";
import { trailingReturn, percentileOf, buildDollarRegime, type FxSeries } from "./dollar-regime";

const geo = (daily: number, n = 260, start = 100): number[] => Array.from({ length: n }, (_, i) => start * Math.pow(1 + daily, i));

describe("dollar-regime — primitives", () => {
  it("trailingReturn and percentileOf", () => {
    expect(trailingReturn([100, 101, 102, 103, 104, 105, 110], 6)).toBeCloseTo(10, 6);
    expect(percentileOf([1, 2, 3, 4], 4)).toBe(100);
  });
});

describe("dollar-regime — regime & currency ranking", () => {
  const fx = (e: number, j: number, b: number): FxSeries[] => [
    { id: "FXE", label: "Euro", closes: geo(e) },
    { id: "FXY", label: "Yen", closes: geo(j) },
    { id: "FXB", label: "Pound", closes: geo(b) },
  ];

  it("a rising dollar above its 200-DMA is a Strong regime with a risk-off implication", () => {
    const r = buildDollarRegime(geo(0.0006), fx(-0.0003, -0.0004, -0.0002));
    expect(r.dollarAboveSMA200).toBe(true);
    expect(r.dollarRet3m).toBeGreaterThan(0);
    expect(r.dollarRegime).toBe("Strong");
    expect(r.riskImplication).toMatch(/risk-off/i);
  });

  it("a falling dollar below its 200-DMA is a Weak regime with a risk-on implication", () => {
    const r = buildDollarRegime(geo(-0.0006), fx(0.0004, 0.0003, 0.0005));
    expect(r.dollarRegime).toBe("Weak");
    expect(r.riskImplication).toMatch(/risk-on/i);
    expect(r.strongest).toBe("Pound"); // highest 3m return vs USD
    expect(r.weakest).toBe("Yen");
  });

  it("ranks currencies by their strength versus the dollar", () => {
    const r = buildDollarRegime(geo(0.0001), fx(0.0005, 0.0001, 0.0003));
    expect(r.currencies.map((c) => c.label)).toEqual(["Euro", "Pound", "Yen"]);
    expect(r.currencies[0].trend).toBe("Up");
  });
});
