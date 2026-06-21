import { describe, it, expect } from "vitest";
import { buildYieldMonitor, percentileOf, type YieldSeries } from "./yield-monitor";

const flat = (val: number, n = 60): number[] => Array.from({ length: n }, () => val);
const ending = (base: number, n: number, end: number): number[] => [...flat(base, n - 1), end];

const basket = (over: Partial<Record<string, number[]>> = {}): YieldSeries[] => [
  { id: "DGS2", label: "2Y Treasury", category: "Treasury", series: over.DGS2 ?? flat(4.6) },
  { id: "DGS10", label: "10Y Treasury", category: "Treasury", series: over.DGS10 ?? flat(4.2) },
  { id: "DGS30", label: "30Y Treasury", category: "Treasury", series: over.DGS30 ?? flat(4.4) },
  { id: "BAMLC0A0CMEY", label: "US IG Corp", category: "IG", series: over.IG ?? flat(5.4) },
  { id: "BAMLH0A0HYM2EY", label: "US High Yield", category: "HY", series: over.HY ?? flat(7.8) },
  { id: "BAMLEMCBPIEY", label: "EM Corporate", category: "EM", series: over.EM ?? flat(6.9) },
];

describe("yield-monitor — primitives", () => {
  it("percentileOf ranks the latest yield", () => {
    expect(percentileOf([3, 4, 5, 6], 5)).toBe(75);
  });
});

describe("yield-monitor — income ladder", () => {
  it("ranks the rungs by yield with HY on top and computes spreads over the 10y", () => {
    const r = buildYieldMonitor(basket());
    expect(r.rungs[0].id).toBe("BAMLH0A0HYM2EY"); // 7.8% highest
    expect(r.best).toBe("US High Yield");
    expect(r.treasury10y).toBe(4.2);
    const hy = r.rungs.find((x) => x.id === "BAMLH0A0HYM2EY");
    expect(hy?.spreadOver10y).toBeCloseTo(360, 6); // (7.8 − 4.2) × 100
  });

  it("derives term steepness (30y−2y) and credit pickup (HY−IG)", () => {
    const r = buildYieldMonitor(basket());
    expect(r.steepness2s30s).toBeCloseTo(-0.2, 6); // 4.4 − 4.6 (inverted)
    expect(r.creditPickupHyIg).toBeCloseTo(2.4, 6); // 7.8 − 5.4
  });

  it("flags an attractive-carry regime when yields sit high in their range", () => {
    // every series ends at a fresh high → ~100th percentile
    const high = buildYieldMonitor(basket({
      DGS2: ending(3, 60, 5), DGS10: ending(3, 60, 4.8), DGS30: ending(3, 60, 4.9),
      IG: ending(4, 60, 6), HY: ending(6, 60, 9), EM: ending(5, 60, 7.5),
    }));
    expect(high.avgPercentile).toBeGreaterThan(90);
    expect(high.incomeRegime).toBe("Attractive carry");
  });

  it("flags an expensive regime when yields sit low in their range", () => {
    const low = buildYieldMonitor(basket({
      DGS2: ending(6, 60, 4), DGS10: ending(6, 60, 3.6), DGS30: ending(6, 60, 3.8),
      IG: ending(7, 60, 4.5), HY: ending(10, 60, 6.5), EM: ending(8, 60, 5.5),
    }));
    expect(low.avgPercentile).toBeLessThan(10);
    expect(low.incomeRegime).toBe("Expensive");
  });

  it("reports recent change in basis points", () => {
    const r = buildYieldMonitor(basket({ HY: ending(7.4, 60, 7.8) }));
    const hy = r.rungs.find((x) => x.id === "BAMLH0A0HYM2EY");
    expect(hy?.changeBps).toBeCloseTo(40, 6);
  });
});
