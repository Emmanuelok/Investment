/**
 * Factor-attribution engine — multivariate OLS regression of an asset's returns
 * on factor returns (market, size, value, momentum, quality, low-vol). Returns
 * factor betas, annualized alpha, R² and each factor's contribution to return.
 */

/** Gauss-Jordan matrix inverse with partial pivoting. */
function invert(m: number[][]): number[][] | null {
  const n = m.length;
  const a = m.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(a[r][col]) > Math.abs(a[piv][col])) piv = r;
    if (Math.abs(a[piv][col]) < 1e-12) return null;
    [a[col], a[piv]] = [a[piv], a[col]];
    const d = a[col][col];
    for (let j = 0; j < 2 * n; j++) a[col][j] /= d;
    for (let r = 0; r < n; r++) if (r !== col) { const f = a[r][col]; for (let j = 0; j < 2 * n; j++) a[r][j] -= f * a[col][j]; }
  }
  return a.map((row) => row.slice(n));
}

export type Regression = { intercept: number; coef: number[]; r2: number; residualStd: number };

/** OLS of y on X (X = [obs][factors]); intercept added automatically. */
export function multiRegress(y: number[], X: number[][]): Regression {
  const n = y.length;
  const k = X[0]?.length ?? 0;
  const p = k + 1;
  const A = X.map((row) => [1, ...row]);
  const AtA = Array.from({ length: p }, () => new Array(p).fill(0));
  const Aty = new Array(p).fill(0);
  for (let i = 0; i < n; i++) {
    for (let aIdx = 0; aIdx < p; aIdx++) {
      Aty[aIdx] += A[i][aIdx] * y[i];
      for (let b = 0; b < p; b++) AtA[aIdx][b] += A[i][aIdx] * A[i][b];
    }
  }
  const inv = invert(AtA);
  if (!inv) return { intercept: 0, coef: new Array(k).fill(0), r2: 0, residualStd: 0 };
  const beta = new Array(p).fill(0);
  for (let aIdx = 0; aIdx < p; aIdx++) for (let b = 0; b < p; b++) beta[aIdx] += inv[aIdx][b] * Aty[b];

  const my = y.reduce((s, v) => s + v, 0) / n;
  let ssr = 0, sst = 0;
  for (let i = 0; i < n; i++) {
    let pred = 0;
    for (let aIdx = 0; aIdx < p; aIdx++) pred += beta[aIdx] * A[i][aIdx];
    ssr += (y[i] - pred) ** 2;
    sst += (y[i] - my) ** 2;
  }
  return { intercept: beta[0], coef: beta.slice(1), r2: sst > 0 ? 1 - ssr / sst : 0, residualStd: Math.sqrt(ssr / Math.max(1, n - p)) };
}

const ANN = 252;

export type FactorLoad = { name: string; beta: number; contribution: number }; // contribution = annualized % of return
export type FactorModel = {
  alphaDaily: number;
  alphaAnnualPct: number;
  r2: number;
  residualVolPct: number; // annualized %
  factors: FactorLoad[];
};

/** Regress aligned asset returns on a set of named factor-return series. */
export function attributeReturns(assetRets: number[], factorRets: Record<string, number[]>): FactorModel {
  const names = Object.keys(factorRets);
  const n = Math.min(assetRets.length, ...names.map((k) => factorRets[k].length));
  const y = assetRets.slice(-n);
  const cols = names.map((k) => factorRets[k].slice(-n));
  const X = Array.from({ length: n }, (_, i) => cols.map((c) => c[i]));
  const reg = multiRegress(y, X);
  const factors: FactorLoad[] = names.map((name, j) => {
    const mean = cols[j].reduce((s, v) => s + v, 0) / n;
    return { name, beta: reg.coef[j], contribution: reg.coef[j] * mean * ANN * 100 };
  });
  return {
    alphaDaily: reg.intercept,
    alphaAnnualPct: reg.intercept * ANN * 100,
    r2: reg.r2,
    residualVolPct: reg.residualStd * Math.sqrt(ANN) * 100,
    factors,
  };
}
