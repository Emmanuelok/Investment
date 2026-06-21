import { describe, it, expect } from "vitest";
import { buildRealRates, percentileOf, type RateSeries } from "./real-rates";

const flat = (val: number, n = 60): number[] => Array.from({ length: n }, () => val);
const ending = (base: number, n: number, end: number): number[] => [...flat(base, n - 1), end];

const baseInputs = (over: Partial<Record<string, number[]>> = {}): RateSeries[] => [
  { id: "DGS10", label: "10Y Nominal", tenor: "10Y", kind: "Nominal", series: over.DGS10 ?? flat(4.2) },
  { id: "DFII10", label: "10Y Real (TIPS)", tenor: "10Y", kind: "Real", series: over.DFII10 ?? flat(1.8) },
  { id: "T10YIE", label: "10Y Breakeven", tenor: "10Y", kind: "Breakeven", series: over.T10YIE ?? flat(2.4) },
  { id: "T5YIFR", label: "5y5y Forward", tenor: "5y5y", kind: "Forward", series: over.T5YIFR ?? flat(2.3) },
];

describe("real-rates — primitives", () => {
  it("percentileOf ranks within history", () => {
    expect(percentileOf([1, 2, 3, 4], 3)).toBe(75);
  });
});

describe("real-rates — decomposition & regimes", () => {
  it("nominal decomposes into real + breakeven with ~zero gap", () => {
    const r = buildRealRates(baseInputs());
    expect(r.nominal10y).toBe(4.2);
    expect(r.real10y).toBe(1.8);
    expect(r.breakeven10y).toBe(2.4);
    expect(r.decompositionGap).toBeCloseTo(0, 6); // 4.2 − (1.8 + 2.4)
    expect(r.fwd5y5y).toBe(2.3);
  });

  it("classifies the real-rate regime from the real 10y level", () => {
    expect(buildRealRates(baseInputs({ DFII10: flat(1.8) })).realRegime).toBe("Restrictive"); // >1
    expect(buildRealRates(baseInputs({ DFII10: flat(0.4) })).realRegime).toBe("Neutral");
    expect(buildRealRates(baseInputs({ DFII10: flat(-0.5) })).realRegime).toBe("Accommodative");
  });

  it("classifies the inflation regime from breakeven momentum", () => {
    expect(buildRealRates(baseInputs({ T10YIE: ending(2.2, 60, 2.6) })).inflationRegime).toBe("Rising"); // +40 bps
    expect(buildRealRates(baseInputs({ T10YIE: flat(2.3) })).inflationRegime).toBe("Anchored");
    expect(buildRealRates(baseInputs({ T10YIE: ending(2.5, 60, 2.1) })).inflationRegime).toBe("Falling"); // −40 bps
  });

  it("reports change in basis points and percentiles for each point", () => {
    const r = buildRealRates(baseInputs({ DFII10: ending(1.5, 60, 1.9) }));
    const real = r.points.find((p) => p.id === "DFII10");
    expect(real?.changeBps).toBeCloseTo(40, 6);
    expect(r.realChangeBps).toBeCloseTo(40, 6);
    expect(real?.percentile).toBeGreaterThan(90); // ending at a new high
  });

  it("handles a missing TIPS series gracefully (null decomposition)", () => {
    const r = buildRealRates([
      { id: "DGS10", label: "10Y", tenor: "10Y", kind: "Nominal", series: flat(4.2) },
      { id: "T10YIE", label: "BE", tenor: "10Y", kind: "Breakeven", series: flat(2.4) },
    ]);
    expect(r.real10y).toBeNull();
    expect(r.decompositionGap).toBeNull();
    expect(r.realRegime).toBe("Neutral");
    expect(r.points.length).toBe(2);
  });
});
