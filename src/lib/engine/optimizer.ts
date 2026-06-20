/**
 * Portfolio construction engine — covariance estimation and long-only weight
 * schemes: equal-weight, inverse-volatility, risk-parity (equal risk
 * contribution) and minimum-variance (projected gradient). Deterministic.
 */

export type CovMatrix = number[][];
const ANN = 252;

/** Sample covariance of return rows [asset][t], annualized by default. */
export function covarianceMatrix(returns: number[][], annualize = true): CovMatrix {
  const a = returns.length;
  const T = Math.min(...returns.map((r) => r.length));
  const rows = returns.map((r) => r.slice(-T));
  const mean = rows.map((r) => r.reduce((s, v) => s + v, 0) / T);
  const k = annualize ? ANN : 1;
  const cov: CovMatrix = Array.from({ length: a }, () => new Array(a).fill(0));
  for (let i = 0; i < a; i++)
    for (let j = i; j < a; j++) {
      let s = 0;
      for (let t = 0; t < T; t++) s += (rows[i][t] - mean[i]) * (rows[j][t] - mean[j]);
      cov[i][j] = cov[j][i] = (s / (T - 1)) * k;
    }
  return cov;
}

const matVec = (m: CovMatrix, v: number[]) => m.map((row) => row.reduce((s, x, j) => s + x * v[j], 0));
export const portfolioVariance = (w: number[], cov: CovMatrix) => w.reduce((s, wi, i) => s + wi * matVec(cov, w)[i], 0);
export const portfolioVol = (w: number[], cov: CovMatrix) => Math.sqrt(Math.max(portfolioVariance(w, cov), 0));

/** Percent contribution of each asset to portfolio variance (sums to ~100). */
export function riskContributions(w: number[], cov: CovMatrix): number[] {
  const mrc = matVec(cov, w);
  const variance = w.reduce((s, wi, i) => s + wi * mrc[i], 0) || 1e-12;
  return w.map((wi, i) => (wi * mrc[i] / variance) * 100);
}

const normalize = (w: number[]) => { const s = w.reduce((a, b) => a + Math.max(b, 0), 0) || 1; return w.map((x) => Math.max(x, 0) / s); };

export function equalWeight(n: number): number[] { return new Array(n).fill(1 / n); }

export function inverseVolWeights(cov: CovMatrix): number[] {
  const inv = cov.map((row, i) => 1 / (Math.sqrt(Math.max(row[i], 1e-12))));
  const s = inv.reduce((a, b) => a + b, 0);
  return inv.map((x) => x / s);
}

/** Equal-risk-contribution via multiplicative fixed-point iteration. */
export function riskParityWeights(cov: CovMatrix, iters = 400): number[] {
  const n = cov.length;
  let w = equalWeight(n);
  for (let k = 0; k < iters; k++) {
    const mrc = matVec(cov, w);
    const rc = w.map((wi, i) => wi * mrc[i]);
    const avg = rc.reduce((a, b) => a + b, 0) / n || 1e-12;
    w = normalize(w.map((wi, i) => wi * (avg / (rc[i] || 1e-12)) ** 0.5));
  }
  return w;
}

/** Invert a square matrix via Gauss-Jordan with partial pivoting. */
function invert(m: CovMatrix): CovMatrix | null {
  const n = m.length;
  const a = m.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(a[r][col]) > Math.abs(a[piv][col])) piv = r;
    if (Math.abs(a[piv][col]) < 1e-14) return null;
    [a[col], a[piv]] = [a[piv], a[col]];
    const d = a[col][col];
    for (let j = 0; j < 2 * n; j++) a[col][j] /= d;
    for (let r = 0; r < n; r++) if (r !== col) { const f = a[r][col]; for (let j = 0; j < 2 * n; j++) a[r][j] -= f * a[col][j]; }
  }
  return a.map((row) => row.slice(n));
}

/** Euclidean projection onto the probability simplex {w≥0, Σw=1}. */
function projectSimplex(v: number[]): number[] {
  const n = v.length;
  const u = [...v].sort((a, b) => b - a);
  let css = 0, rho = 0, theta = 0;
  for (let j = 0; j < n; j++) { css += u[j]; const t = (css - 1) / (j + 1); if (u[j] - t > 0) { rho = j + 1; theta = t; } }
  return v.map((x) => Math.max(x - theta, 0));
}

/** Long-only minimum variance: analytical Σ⁻¹·1 if non-negative, else projected-gradient. */
export function minVarianceWeights(cov: CovMatrix, iters = 4000): number[] {
  const n = cov.length;
  const inv = invert(cov);
  if (inv) {
    const ones = new Array(n).fill(1);
    const raw = matVec(inv, ones);
    const s = raw.reduce((a, b) => a + b, 0);
    if (s > 0) {
      const w = raw.map((x) => x / s);
      if (w.every((x) => x >= -1e-9)) return normalize(w);
    }
  }
  // constrained fallback: projected gradient onto the simplex
  let w = equalWeight(n);
  const diagMax = Math.max(...cov.map((r, i) => r[i]), 1e-6);
  const lr = 1 / (2 * diagMax * n);
  for (let k = 0; k < iters; k++) {
    const grad = matVec(cov, w).map((g) => 2 * g);
    w = projectSimplex(w.map((wi, i) => wi - lr * grad[i]));
  }
  return w;
}

export type Scheme = "equal" | "inverseVol" | "riskParity" | "minVariance";
export const SCHEME_LABELS: Record<Scheme, string> = {
  equal: "Equal Weight",
  inverseVol: "Inverse Volatility",
  riskParity: "Risk Parity (ERC)",
  minVariance: "Minimum Variance",
};

export function buildWeights(scheme: Scheme, cov: CovMatrix): number[] {
  switch (scheme) {
    case "equal": return equalWeight(cov.length);
    case "inverseVol": return inverseVolWeights(cov);
    case "riskParity": return riskParityWeights(cov);
    case "minVariance": return minVarianceWeights(cov);
  }
}
