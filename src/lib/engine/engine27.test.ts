import { describe, it, expect } from "vitest";
import { percentileOf, buildCreditConditions, type SpreadInput } from "./credit-conditions";

// build a series that ends `endValue`, with a stable baseline `base` of length n
const series = (base: number, n: number, endValue: number): number[] => {
  const s = Array.from({ length: n - 1 }, () => base);
  s.push(endValue);
  return s;
};

describe("credit-conditions — percentile", () => {
  it("percentileOf ranks a value within a series", () => {
    expect(percentileOf([1, 2, 3, 4, 5], 3)).toBe(60); // 3 of 5 ≤ 3
    expect(percentileOf([1, 2, 3, 4, 5], 5)).toBe(100);
    expect(percentileOf([1, 2, 3, 4, 5], 0)).toBe(0);
    expect(percentileOf([], 1)).toBe(0);
  });
});

describe("credit-conditions — stress read", () => {
  it("a spread at the top of its range reads as high stress", () => {
    const inputs: SpreadInput[] = [
      { id: "HY", label: "US HY OAS", tier: "HY", series: [...Array.from({ length: 50 }, (_, i) => 3 + i * 0.04), 5.5], weight: 2 },
    ];
    const r = buildCreditConditions(inputs);
    expect(r.gauges[0].percentile).toBeGreaterThan(90);
    expect(r.stressScore).toBeGreaterThan(80);
    expect(r.level).toBe("Crisis");
  });

  it("a spread at the bottom of its range reads as calm", () => {
    const inputs: SpreadInput[] = [
      { id: "HY", label: "US HY OAS", series: [...Array.from({ length: 50 }, (_, i) => 8 - i * 0.05), 3.0] },
    ];
    const r = buildCreditConditions(inputs);
    expect(r.gauges[0].percentile).toBeLessThan(10);
    expect(r.level).toBe("Calm");
  });

  it("detects widening and tightening from the recent change", () => {
    const widen = buildCreditConditions([{ id: "HY", label: "HY", series: series(4, 40, 4.5) }]); // +50 bps
    expect(widen.gauges[0].trend).toBe("Widening");
    expect(widen.gauges[0].changeBps).toBeCloseTo(50, 6);
    expect(widen.momentum).toBeGreaterThan(0);

    const tighten = buildCreditConditions([{ id: "HY", label: "HY", series: series(4, 40, 3.5) }]); // −50 bps
    expect(tighten.gauges[0].trend).toBe("Tightening");
    expect(tighten.momentum).toBeLessThan(0);
  });

  it("weights let a wide high-yield gauge dominate a calm IG gauge", () => {
    const wideHY: SpreadInput = { id: "HY", label: "HY", series: [...Array.from({ length: 40 }, (_, i) => 3 + i * 0.05), 5.2], weight: 3 };
    const calmIG: SpreadInput = { id: "IG", label: "IG", series: [...Array.from({ length: 40 }, (_, i) => 2 - i * 0.02), 1.0], weight: 1 };
    const r = buildCreditConditions([wideHY, calmIG]);
    expect(r.stressScore).toBeGreaterThan(60); // the heavy HY gauge pulls stress up
    expect(r.n).toBe(2);
  });

  it("ignores series too short to rank", () => {
    const r = buildCreditConditions([
      { id: "HY", label: "HY", series: Array.from({ length: 30 }, (_, i) => 3 + i * 0.02) },
      { id: "IG", label: "IG", series: [2] },
    ]);
    expect(r.gauges.length).toBe(1);
  });
});
