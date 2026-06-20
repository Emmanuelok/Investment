import { describe, it, expect } from "vitest";
import { multiRegress, attributeReturns } from "./factor-attribution";

// deterministic pseudo-random for reproducible factor series
function seeded(n: number, seed: number): number[] {
  let s = seed; const out: number[] = [];
  for (let i = 0; i < n; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; out.push((s / 0x7fffffff - 0.5) * 0.02); }
  return out;
}

describe("multivariate regression", () => {
  it("recovers known coefficients and intercept", () => {
    const n = 400;
    const x1 = seeded(n, 1), x2 = seeded(n, 2);
    const y = x1.map((v, i) => 0.0003 + 1.5 * v + 0.5 * x2[i]); // exact linear, no noise
    const r = multiRegress(y, x1.map((v, i) => [v, x2[i]]));
    expect(r.intercept).toBeCloseTo(0.0003, 6);
    expect(r.coef[0]).toBeCloseTo(1.5, 4);
    expect(r.coef[1]).toBeCloseTo(0.5, 4);
    expect(r.r2).toBeCloseTo(1, 6);
  });
  it("single factor matches simple regression beta", () => {
    const n = 300;
    const x = seeded(n, 5);
    const y = x.map((v) => 0.8 * v + 0.001);
    const r = multiRegress(y, x.map((v) => [v]));
    expect(r.coef[0]).toBeCloseTo(0.8, 4);
  });
});

describe("factor attribution", () => {
  it("recovers betas and annualizes alpha", () => {
    const n = 500;
    const market = seeded(n, 11), size = seeded(n, 12), value = seeded(n, 13);
    const asset = market.map((v, i) => 0.0002 + 1.2 * v + 0.3 * size[i] - 0.1 * value[i]);
    const m = attributeReturns(asset, { Market: market, Size: size, Value: value });
    const byName = Object.fromEntries(m.factors.map((f) => [f.name, f.beta]));
    expect(byName.Market).toBeCloseTo(1.2, 3);
    expect(byName.Size).toBeCloseTo(0.3, 3);
    expect(byName.Value).toBeCloseTo(-0.1, 3);
    expect(m.r2).toBeGreaterThan(0.99);
    expect(m.alphaAnnualPct).toBeCloseTo(0.0002 * 252 * 100, 4);
    expect(m.factors.length).toBe(3);
  });
  it("residual vol is ~0 for a perfectly explained asset", () => {
    const n = 300;
    const market = seeded(n, 21);
    const asset = market.map((v) => 1.0 * v);
    const m = attributeReturns(asset, { Market: market });
    expect(m.residualVolPct).toBeLessThan(0.01);
    expect(m.r2).toBeGreaterThan(0.999);
  });
});
