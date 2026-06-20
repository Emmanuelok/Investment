import { describe, it, expect } from "vitest";
import { forwardRate, analyzeCurve, type CurvePoint } from "./yield-curve";

const mk = (rows: [number, string, number][]): CurvePoint[] => rows.map(([tenorYears, label, yld]) => ({ tenorYears, label, yield: yld }));

describe("yield-curve analytics", () => {
  it("implied forward rate: 1y1y from 4% and 5% ≈ 6.01%", () => {
    expect(forwardRate(1, 4, 2, 5)).toBeCloseTo(6.01, 1);
  });

  it("classifies a normal upward curve", () => {
    const c = analyzeCurve(mk([[0.25, "3M", 4.2], [2, "2Y", 4.5], [5, "5Y", 4.7], [10, "10Y", 4.9], [30, "30Y", 5.1]]));
    expect(c.shape).toBe("Normal");
    expect(c.slope2s10s).toBeCloseTo(0.4, 6);
    expect(c.slope3m10s).toBeCloseTo(0.7, 6);
    expect(c.invertedSegments.length).toBe(0);
    expect(c.forwards.length).toBe(4);
  });

  it("flags an inverted curve with inverted segments", () => {
    const c = analyzeCurve(mk([[0.25, "3M", 5.4], [2, "2Y", 4.9], [5, "5Y", 4.4], [10, "10Y", 4.2], [30, "30Y", 4.3]]));
    expect(c.shape).toBe("Inverted");
    expect(c.slope2s10s).toBeLessThan(0);
    expect(c.invertedSegments.length).toBeGreaterThan(0);
  });

  it("detects a humped curve (peak in the belly)", () => {
    const c = analyzeCurve(mk([[0.25, "3M", 4.0], [1, "1Y", 4.8], [2, "2Y", 5.0], [5, "5Y", 5.1], [10, "10Y", 4.95], [30, "30Y", 4.9]]));
    expect(c.shape).toBe("Humped");
  });

  it("computes curvature (2·5Y − 2Y − 10Y)", () => {
    const c = analyzeCurve(mk([[2, "2Y", 4.0], [5, "5Y", 4.6], [10, "10Y", 5.0]]));
    expect(c.curvature).toBeCloseTo(2 * 4.6 - 4.0 - 5.0, 6); // 0.2
  });

  it("sorts unordered input and keeps forwards increasing in tenor", () => {
    const c = analyzeCurve(mk([[10, "10Y", 4.9], [2, "2Y", 4.5], [0.25, "3M", 4.2]]));
    expect(c.forwards[0].fromYears).toBeLessThan(c.forwards[0].toYears);
    expect(c.forwards.every((f, i, a) => i === 0 || f.fromYears >= a[i - 1].fromYears)).toBe(true);
  });
});
