import { describe, it, expect } from "vitest";
import { meanStd, zOf, zLast, buildNowcast, type NowcastInput } from "./nowcast";

const rising = (n = 12) => Array.from({ length: n }, (_, i) => i); // 0..n-1
const falling = (n = 12) => Array.from({ length: n }, (_, i) => n - 1 - i); // n-1..0

describe("nowcast — standardization primitives", () => {
  it("meanStd uses the sample (n−1) standard deviation", () => {
    const { mean, std } = meanStd([2, 4, 4, 4, 5, 5, 7, 9]);
    expect(mean).toBeCloseTo(5, 6);
    expect(std).toBeCloseTo(2.1381, 3); // sqrt(32/7)
  });

  it("zOf and zLast standardize against the series history", () => {
    expect(zOf(5, 3, 1.5811)).toBeCloseTo(1.2649, 3);
    expect(zLast([1, 2, 3, 4, 5])).toBeCloseTo(1.2649, 3);
    expect(zLast([7])).toBe(0); // too short
    expect(zOf(5, 5, 0)).toBe(0); // zero dispersion guard
  });
});

describe("nowcast — composite & business-cycle regime", () => {
  it("a broadly rising growth basket reads as Expansion with score > 50", () => {
    const inputs: NowcastInput[] = [
      { id: "INDPRO", label: "Industrial production", group: "Growth", series: rising() },
      { id: "RSALES", label: "Retail sales", group: "Growth", series: rising() },
    ];
    const r = buildNowcast(inputs);
    expect(r.growthZ).toBeGreaterThan(0);
    expect(r.momentum).toBeGreaterThan(0);
    expect(r.regime).toBe("Expansion");
    expect(r.score).toBeGreaterThan(50);
  });

  it("a broadly falling growth basket reads as Contraction with score < 50", () => {
    const r = buildNowcast([{ id: "INDPRO", label: "IP", group: "Growth", series: falling() }]);
    expect(r.growthZ).toBeLessThan(0);
    expect(r.momentum).toBeLessThan(0);
    expect(r.regime).toBe("Contraction");
    expect(r.score).toBeLessThan(50);
  });

  it("an inverted indicator (sign −1) flips its contribution", () => {
    // Unemployment RISING is bad for growth: sign −1 turns a positive raw z negative.
    const r = buildNowcast([{ id: "UNRATE", label: "Unemployment", group: "Growth", series: rising(), sign: -1 }]);
    expect(r.growthZ).toBeLessThan(0);
    expect(r.regime).toBe("Contraction");
  });

  it("weights let one indicator dominate the composite", () => {
    const r = buildNowcast([
      { id: "A", label: "Strong up", group: "Growth", series: rising(), weight: 3 },
      { id: "B", label: "Strong down", group: "Growth", series: falling(), weight: 1 },
    ]);
    expect(r.growthZ).toBeGreaterThan(0); // the weight-3 riser wins
  });

  it("blends labor into the growth read and reports per-group composites", () => {
    const r = buildNowcast([
      { id: "INDPRO", label: "IP", group: "Growth", series: rising() },
      { id: "PAYEMS", label: "Payrolls", group: "Labor", series: rising() },
      { id: "CPI", label: "CPI YoY", group: "Inflation", series: falling() },
    ]);
    expect(r.composites.map((c) => c.group).sort()).toEqual(["Growth", "Inflation", "Labor"]);
    expect(r.laborZ).toBeGreaterThan(0);
    expect(r.inflationZ).toBeLessThan(0); // disinflation
    expect(r.growthZ).toBeGreaterThan(0);
  });

  it("ignores series too short to standardize", () => {
    const r = buildNowcast([
      { id: "X", label: "ok", group: "Growth", series: rising() },
      { id: "Y", label: "too short", group: "Growth", series: [3] },
    ]);
    expect(r.indicators.length).toBe(1);
  });
});
