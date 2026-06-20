import { describe, it, expect } from "vitest";
import { mertonModel, equityFromAsset, annualizedVol, creditGrade } from "./merton";

describe("Merton structural credit model", () => {
  it("recovers latent asset value & volatility from observable equity (round-trip)", () => {
    // Start from a known firm: V=100, D=70, σ_V=0.25, r=3%, T=1y.
    const V = 100, D = 70, r = 0.03, sigV = 0.25, T = 1;
    const { equity, equityVol } = equityFromAsset(V, D, r, sigV, T);
    // The forward map must produce a smaller, more volatile equity claim.
    expect(equity).toBeGreaterThan(0);
    expect(equity).toBeLessThan(V);
    expect(equityVol).toBeGreaterThan(sigV);

    const m = mertonModel({ equity, equityVol, debt: D, rate: r, years: T });
    expect(m.converged).toBe(true);
    expect(m.assetValue).toBeCloseTo(V, 3);
    expect(m.assetVol).toBeCloseTo(sigV, 4);
  });

  it("distance-to-default equals d2 under risk-neutral drift (μ = r)", () => {
    const { equity, equityVol } = equityFromAsset(120, 80, 0.04, 0.3, 1);
    const m = mertonModel({ equity, equityVol, debt: 80, rate: 0.04, years: 1 });
    expect(m.distanceToDefault).toBeCloseTo(m.d2, 6);
    expect(m.defaultProb).toBeCloseTo(normCdfRef(-m.d2), 6);
  });

  it("higher leverage lowers DD and raises default probability & spread", () => {
    const mk = (debt: number) => {
      const { equity, equityVol } = equityFromAsset(100, debt, 0.03, 0.25, 1);
      return mertonModel({ equity, equityVol, debt, rate: 0.03, years: 1 });
    };
    const safe = mk(40); // low leverage
    const risky = mk(90); // high leverage
    expect(risky.distanceToDefault).toBeLessThan(safe.distanceToDefault);
    expect(risky.defaultProb).toBeGreaterThan(safe.defaultProb);
    expect(risky.creditSpread).toBeGreaterThan(safe.creditSpread);
    expect(safe.creditSpread).toBeGreaterThanOrEqual(0);
  });

  it("a very safe firm has a near-zero default probability and a tiny spread", () => {
    const { equity, equityVol } = equityFromAsset(100, 20, 0.03, 0.2, 1);
    const m = mertonModel({ equity, equityVol, debt: 20, rate: 0.03, years: 1 });
    expect(m.defaultProb).toBeLessThan(0.01);
    expect(m.distanceToDefault).toBeGreaterThan(2);
    expect(m.creditSpread).toBeLessThan(0.01);
  });

  it("annualizedVol matches a hand-computed two-return series", () => {
    // closes 100→110→121 are two equal log returns of ln(1.1); stdev = 0 → vol 0.
    expect(annualizedVol([100, 110, 121])).toBeCloseTo(0, 6);
    // alternating up/down gives a positive vol; check it's finite & scaled by √252.
    const v = annualizedVol([100, 105, 100, 105, 100, 105]);
    expect(v).toBeGreaterThan(0);
    expect(Number.isFinite(v)).toBe(true);
    expect(annualizedVol([100])).toBe(0);
  });

  it("creditGrade buckets map PD to plausible rating tones", () => {
    expect(creditGrade(0.0001)).toMatchObject({ tone: "pos" });
    expect(creditGrade(0.02).grade).toBe("BB");
    expect(creditGrade(0.5)).toMatchObject({ grade: "CC / D", tone: "neg" });
  });

  it("guards against degenerate inputs without producing NaN", () => {
    const z = mertonModel({ equity: 0, equityVol: 0, debt: 0, rate: 0.03 });
    expect(Number.isFinite(z.defaultProb)).toBe(true);
    expect(z.converged).toBe(false);
    const neg = mertonModel({ equity: -5, equityVol: 0.2, debt: 50, rate: 0.03 });
    expect(Number.isFinite(neg.defaultProb)).toBe(true);
  });
});

// local reference normal CDF (Abramowitz-Stegun) to validate PD = N(−DD).
function normCdfRef(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
  const p = d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return x >= 0 ? 1 - p : p;
}
