import { describe, it, expect } from "vitest";
import { trailingReturn, buildStyleRotation, type FactorSeries } from "./style-rotation";

// geometric close series with constant daily return
const geo = (daily: number, n = 260, start = 100): number[] => Array.from({ length: n }, (_, i) => start * Math.pow(1 + daily, i));

const bench = geo(0.0003); // ~benchmark
const factors = (over: Partial<Record<string, number>> = {}): FactorSeries[] => [
  { id: "VLUE", label: "Value", style: "value", closes: geo(over.value ?? 0.0007) },
  { id: "IWF", label: "Growth", style: "growth", closes: geo(over.growth ?? 0.00005) },
  { id: "USMV", label: "Min Volatility", style: "lowvol", closes: geo(over.lowvol ?? 0.0003) },
  { id: "IWM", label: "Small Cap", style: "smallcap", closes: geo(over.smallcap ?? 0.0006) },
];

describe("style-rotation — trailing return", () => {
  it("computes the simple return over a horizon", () => {
    expect(trailingReturn([100, 101, 102, 103, 104, 105, 110], 6)).toBeCloseTo(10, 6);
    expect(trailingReturn([100, 105], 6)).toBe(0); // insufficient history
  });
});

describe("style-rotation — leadership & regime", () => {
  it("ranks the strongest factor as leader with positive relative returns", () => {
    const r = buildStyleRotation(factors(), "SPY", bench);
    expect(r.factors[0].rank).toBe(1);
    expect(r.leader).toBe("Value"); // 0.0007/day is the strongest
    expect(r.laggard).toBe("Growth");
    expect(r.factors[0].rel3m).toBeGreaterThan(0);
    const growth = r.factors.find((f) => f.style === "growth");
    expect(growth?.rel3m).toBeLessThan(0);
  });

  it("reports value leadership and a cyclical tilt when value outpaces growth", () => {
    const r = buildStyleRotation(factors(), "SPY", bench);
    expect(r.valueGrowthSpread).not.toBeNull();
    expect(r.valueGrowthSpread as number).toBeGreaterThan(1);
    expect(r.regime).toBe("Value leadership");
    expect(r.riskTilt).toBe("Cyclical");
    expect(r.sizeSpread as number).toBeGreaterThan(0); // small caps strong
  });

  it("flips to growth leadership when growth outpaces value", () => {
    const r = buildStyleRotation(factors({ value: 0.0001, growth: 0.0008 }), "SPY", bench);
    expect(r.valueGrowthSpread as number).toBeLessThan(-1);
    expect(r.regime).toBe("Growth leadership");
  });

  it("flags a defensive tilt when low-vol leads", () => {
    const r = buildStyleRotation(factors({ value: 0.0002, growth: 0.0002, smallcap: 0.0002, lowvol: 0.0009 }), "SPY", bench);
    expect(r.factors[0].style).toBe("lowvol");
    expect(r.riskTilt).toBe("Defensive");
  });

  it("ranks are dense and ordered by score", () => {
    const r = buildStyleRotation(factors(), "SPY", bench);
    expect(r.factors.map((f) => f.rank)).toEqual([1, 2, 3, 4]);
    for (let i = 1; i < r.factors.length; i++) expect(r.factors[i - 1].score).toBeGreaterThanOrEqual(r.factors[i].score);
  });
});
