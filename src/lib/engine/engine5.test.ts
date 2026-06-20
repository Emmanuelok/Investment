import { describe, it, expect } from "vitest";
import { covarianceMatrix, portfolioVol, riskContributions, equalWeight, inverseVolWeights, riskParityWeights, minVarianceWeights, type CovMatrix } from "./optimizer";

// 3 assets: vols 20%, 30%, 40%; mild positive cov between 0&1, asset 2 independent
const cov: CovMatrix = [
  [0.04, 0.01, 0.0],
  [0.01, 0.09, 0.0],
  [0.0, 0.0, 0.16],
];

describe("portfolio optimizer", () => {
  it("covarianceMatrix annualizes variances", () => {
    const r0 = Array.from({ length: 252 }, (_, i) => (i % 2 ? 0.01 : -0.01));
    const r1 = Array.from({ length: 252 }, (_, i) => (i % 2 ? 0.02 : -0.02));
    const c = covarianceMatrix([r0, r1]);
    // daily var of ±0.01 alternating ≈ 0.0001 → annualized ≈ 0.0252
    expect(c[0][0]).toBeGreaterThan(0.02);
    expect(c[1][1]).toBeGreaterThan(c[0][0]);
    expect(c[0][1]).toBeCloseTo(c[1][0], 12); // symmetric
  });

  it("inverse-vol tilts to the lower-vol asset", () => {
    const w = inverseVolWeights(cov);
    expect(w[0]).toBeGreaterThan(w[1]);
    expect(w[1]).toBeGreaterThan(w[2]);
    expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
  });

  it("risk-parity equalizes risk contributions", () => {
    const w = riskParityWeights(cov);
    const rc = riskContributions(w, cov);
    expect(rc.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 4);
    for (const c of rc) expect(Math.abs(c - 100 / 3)).toBeLessThan(3); // ~equal
  });

  it("minimum-variance has the lowest vol of the schemes", () => {
    const eq = equalWeight(3);
    const mv = minVarianceWeights(cov);
    expect(portfolioVol(mv, cov)).toBeLessThanOrEqual(portfolioVol(eq, cov) + 1e-9);
    expect(portfolioVol(mv, cov)).toBeLessThanOrEqual(portfolioVol(inverseVolWeights(cov), cov) + 1e-9);
    expect(mv.every((x) => x >= -1e-9)).toBe(true); // long-only
    expect(mv.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
  });

  it("risk contributions sum to 100 for any weights", () => {
    expect(riskContributions([0.5, 0.3, 0.2], cov).reduce((a, b) => a + b, 0)).toBeCloseTo(100, 6);
  });
});
