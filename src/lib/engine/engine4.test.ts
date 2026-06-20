import { describe, it, expect } from "vitest";
import { ols, halfLife, analyzePair } from "./pairs";
import { detectAnomalies, type Anomaly } from "./anomaly";
import { classifyMacroRegime, seriesTrend } from "./macro";
import { simulateGBM } from "./montecarlo";
import type { Candle } from "@/lib/rng";

describe("pairs / stat-arb", () => {
  it("ols recovers a known line", () => {
    const x = [0, 1, 2, 3, 4, 5];
    const y = x.map((v) => 2 * v + 1);
    const r = ols(x, y);
    expect(r.slope).toBeCloseTo(2, 6);
    expect(r.intercept).toBeCloseTo(1, 6);
    expect(r.r2).toBeCloseTo(1, 6);
  });
  it("half-life of an AR(1) decay matches theory", () => {
    // s_i = 0.9 s_{i-1} → Δs = -0.1 s_{i-1} → HL = -ln2/ln(0.9) ≈ 6.58
    const s = [1];
    for (let i = 1; i < 80; i++) s.push(0.9 * s[i - 1]);
    expect(halfLife(s)).toBeCloseTo(6.58, 1);
  });
  it("recovers the hedge ratio and yields a stationary spread", () => {
    const N = 300, lb: number[] = [], la: number[] = [];
    for (let i = 0; i < N; i++) {
      const b = Math.log(100) + 0.001 * i + 0.02 * Math.sin(i / 7);
      lb.push(b);
      la.push(Math.log(50) + 1.5 * b + 0.05 * Math.sin(i / 5)); // spread stationary
    }
    const rep = analyzePair("A", "B", la.map(Math.exp), lb.map(Math.exp), 90);
    expect(rep.hedgeRatio).toBeCloseTo(1.5, 1);
    expect(Number.isFinite(rep.halfLife)).toBe(true);
    expect(Math.abs(rep.zLast)).toBeLessThan(4);
    expect(["LONG_SPREAD", "SHORT_SPREAD", "FLAT", "EXIT"]).toContain(rep.signal);
  });
});

describe("anomaly detection", () => {
  const base: Candle[] = Array.from({ length: 80 }, (_, i) => {
    const c = 100 + Math.sin(i / 6) * 1.5;
    return { o: c, h: c * 1.004, l: c * 0.996, c, v: 1_000_000 };
  });
  it("flags a volume spike on the last bar", () => {
    const c = [...base];
    c[c.length - 1] = { ...c[c.length - 1], v: 12_000_000 };
    expect(detectAnomalies(c).some((a: Anomaly) => a.type === "VOLUME_SPIKE")).toBe(true);
  });
  it("flags an opening gap", () => {
    const c = [...base];
    const prev = c[c.length - 2].c;
    c[c.length - 1] = { o: prev * 1.05, h: prev * 1.06, l: prev * 1.045, c: prev * 1.055, v: 1_000_000 };
    const an = detectAnomalies(c);
    expect(an.some((a) => a.type === "GAP")).toBe(true);
    expect(an.every((a) => a.severity >= 0 && a.severity <= 100)).toBe(true);
  });
  it("a calm series produces no volume/return anomalies", () => {
    const types = detectAnomalies(base).map((a) => a.type);
    expect(types).not.toContain("VOLUME_SPIKE");
    expect(types).not.toContain("RETURN_SHOCK");
  });
});

describe("macro regime", () => {
  it("seriesTrend signs correctly", () => {
    expect(seriesTrend([1, 2, 3, 4, 5, 6, 7, 8])).toBeGreaterThan(0);
    expect(seriesTrend([8, 7, 6, 5, 4, 3, 2, 1])).toBeLessThan(0);
  });
  it("maps the four quadrants", () => {
    expect(classifyMacroRegime({ growthScore: 30, inflationScore: -20, curveSlope: 0.5, unemploymentTrend: 0 }).regime).toBe("Goldilocks");
    expect(classifyMacroRegime({ growthScore: 30, inflationScore: 20, curveSlope: 0.5, unemploymentTrend: 0 }).regime).toBe("Reflation");
    expect(classifyMacroRegime({ growthScore: -30, inflationScore: 20, curveSlope: 0.5, unemploymentTrend: 0 }).regime).toBe("Stagflation");
    expect(classifyMacroRegime({ growthScore: -30, inflationScore: -20, curveSlope: 0.5, unemploymentTrend: 0 }).regime).toBe("Contraction");
  });
  it("inverted curve + rising unemployment → high recession risk", () => {
    const r = classifyMacroRegime({ growthScore: -40, inflationScore: 10, curveSlope: -0.8, unemploymentTrend: 0.6 });
    expect(r.recessionRisk).toBeGreaterThan(70);
    expect(r.riskLabel).toBe("High");
    const calm = classifyMacroRegime({ growthScore: 40, inflationScore: -10, curveSlope: 1.5, unemploymentTrend: -0.1 });
    expect(calm.recessionRisk).toBeLessThan(20);
    expect(calm.riskLabel).toBe("Low");
  });
});

describe("monte carlo (GBM)", () => {
  it("is reproducible for a fixed seed", () => {
    const a = simulateGBM({ spot: 100, driftPct: 6, volPct: 25, days: 63, paths: 2000, seed: "x" });
    const b = simulateGBM({ spot: 100, driftPct: 6, volPct: 25, days: 63, paths: 2000, seed: "x" });
    expect(a.terminalMean).toBe(b.terminalMean);
  });
  it("percentiles are ordered and histogram sums to paths", () => {
    const r = simulateGBM({ spot: 100, driftPct: 5, volPct: 20, days: 126, paths: 4000, seed: "y" });
    expect(r.p5).toBeLessThan(r.p25);
    expect(r.p25).toBeLessThan(r.terminalMedian);
    expect(r.terminalMedian).toBeLessThan(r.p75);
    expect(r.p75).toBeLessThan(r.p95);
    expect(r.var95Pct).toBeLessThan(0);
    expect(r.histogram.reduce((s, h) => s + h.count, 0)).toBe(4000);
    expect(r.samplePaths.length).toBeLessThanOrEqual(48);
  });
  it("drift direction moves the mean", () => {
    const upd = simulateGBM({ spot: 100, driftPct: 40, volPct: 15, days: 252, paths: 3000, seed: "u" });
    const dnd = simulateGBM({ spot: 100, driftPct: -40, volPct: 15, days: 252, paths: 3000, seed: "d" });
    expect(upd.terminalMean).toBeGreaterThan(100);
    expect(dnd.terminalMean).toBeLessThan(100);
    expect(upd.probUp).toBeGreaterThan(dnd.probUp);
  });
  it("probAboveTarget responds to the target", () => {
    const r = simulateGBM({ spot: 100, driftPct: 8, volPct: 30, days: 252, paths: 3000, seed: "t", target: 120 });
    expect(r.probAboveTarget).not.toBeNull();
    expect(r.probAboveTarget!).toBeGreaterThan(0);
    expect(r.probAboveTarget!).toBeLessThan(100);
  });
});
