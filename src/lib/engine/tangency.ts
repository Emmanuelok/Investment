/**
 * Mean-variance (Markowitz) tangency engine — the analytical optimal portfolios
 * that the construction schemes in optimizer.ts don't cover. From expected
 * returns μ and covariance Σ it derives the frontier constants
 *
 *     A = 1ᵀΣ⁻¹1,  B = 1ᵀΣ⁻¹μ,  C = μᵀΣ⁻¹μ,  D = AC − B²
 *
 * and from them:
 *   • Global minimum-variance portfolio  w_gmv = Σ⁻¹1 / A,  μ_gmv = B/A, σ²=1/A
 *   • Tangency (max-Sharpe) portfolio     w_tan ∝ Σ⁻¹(μ − rf·1)
 *   • Efficient frontier                  σ²(μ_p) = (Aμ_p² − 2Bμ_p + C)/D
 *   • Maximum Sharpe ratio                √((μ−rf1)ᵀΣ⁻¹(μ−rf1))
 *
 * Also a long-only max-Sharpe via projected gradient ascent (no shorting).
 * Pure, deterministic; reuses the covariance/inverse/simplex machinery.
 */

import { type CovMatrix, invert, portfolioVol, portfolioVariance } from "./optimizer";

const ANN = 252;
const matVec = (m: CovMatrix, v: number[]): number[] => m.map((row) => row.reduce((s, x, j) => s + x * v[j], 0));
const dot = (a: number[], b: number[]): number => a.reduce((s, x, i) => s + x * b[i], 0);

export type PortfolioStat = { weights: number[]; ret: number; vol: number; sharpe: number };
export type FrontierPoint = { ret: number; vol: number };

/** Annualized arithmetic mean return of each asset's return row. */
export function meanReturns(returns: number[][], annualize = true): number[] {
  const k = annualize ? ANN : 1;
  return returns.map((r) => (r.length ? (r.reduce((s, v) => s + v, 0) / r.length) * k : 0));
}

const stat = (weights: number[], mu: number[], cov: CovMatrix, rf: number): PortfolioStat => {
  const ret = dot(weights, mu);
  const vol = portfolioVol(weights, cov);
  return { weights, ret, vol, sharpe: vol > 1e-12 ? (ret - rf) / vol : 0 };
};

export type FrontierConstants = { A: number; B: number; C: number; D: number; inv: CovMatrix };

/** Frontier constants A, B, C, D and the inverse covariance (null if singular). */
export function frontierConstants(mu: number[], cov: CovMatrix): FrontierConstants | null {
  const inv = invert(cov);
  if (!inv) return null;
  const ones = new Array(mu.length).fill(1);
  const invOnes = matVec(inv, ones);
  const invMu = matVec(inv, mu);
  const A = dot(ones, invOnes);
  const B = dot(ones, invMu);
  const C = dot(mu, invMu);
  const D = A * C - B * B;
  return { A, B, C, D, inv };
}

/** Global minimum-variance portfolio (may hold shorts). */
export function gmvPortfolio(mu: number[], cov: CovMatrix): PortfolioStat | null {
  const inv = invert(cov);
  if (!inv) return null;
  const ones = new Array(mu.length).fill(1);
  const invOnes = matVec(inv, ones);
  const A = dot(ones, invOnes);
  if (Math.abs(A) < 1e-12) return null;
  return stat(invOnes.map((x) => x / A), mu, cov, 0);
}

/** Tangency (max-Sharpe) portfolio for a given risk-free rate (may hold shorts). */
export function tangencyPortfolio(mu: number[], cov: CovMatrix, rf: number): PortfolioStat | null {
  const inv = invert(cov);
  if (!inv) return null;
  const excess = mu.map((m) => m - rf);
  const raw = matVec(inv, excess);
  const denom = raw.reduce((s, x) => s + x, 0); // 1ᵀΣ⁻¹(μ−rf)
  if (Math.abs(denom) < 1e-12) return null;
  return stat(raw.map((x) => x / denom), mu, cov, rf);
}

/** Maximum attainable Sharpe ratio = √((μ−rf1)ᵀ Σ⁻¹ (μ−rf1)). */
export function maxSharpe(mu: number[], cov: CovMatrix, rf: number): number {
  const inv = invert(cov);
  if (!inv) return 0;
  const excess = mu.map((m) => m - rf);
  const q = dot(excess, matVec(inv, excess));
  return q > 0 ? Math.sqrt(q) : 0;
}

/** Efficient frontier traced analytically over a span of target returns. */
export function efficientFrontier(mu: number[], cov: CovMatrix, points = 40): FrontierPoint[] {
  const fc = frontierConstants(mu, cov);
  if (!fc || Math.abs(fc.D) < 1e-18 || fc.A < 1e-18) return [];
  const muGmv = fc.B / fc.A;
  const spread = Math.max(...mu) - Math.min(...mu) || Math.abs(muGmv) || 0.1;
  const lo = muGmv - spread * 0.6;
  const hi = Math.max(...mu) + spread * 0.4;
  const out: FrontierPoint[] = [];
  for (let i = 0; i < points; i++) {
    const muP = lo + ((hi - lo) * i) / (points - 1);
    const var2 = (fc.A * muP * muP - 2 * fc.B * muP + fc.C) / fc.D;
    if (var2 > 0) out.push({ ret: muP, vol: Math.sqrt(var2) });
  }
  return out;
}

/**
 * Long-only max-Sharpe via the active-set method: solve the analytical tangency,
 * drop the most-negative weight, and re-solve on the surviving assets until every
 * weight is non-negative. Exact and converges in ≤ n steps.
 */
export function maxSharpeLongOnly(mu: number[], cov: CovMatrix, rf: number): PortfolioStat {
  const n = mu.length;
  let active = Array.from({ length: n }, (_, i) => i);
  while (active.length > 0) {
    const subMu = active.map((i) => mu[i]);
    const subCov = active.map((i) => active.map((j) => cov[i][j]));
    const t = tangencyPortfolio(subMu, subCov, rf);
    if (!t) {
      if (active.length === 1) break;
      active = active.slice(0, -1);
      continue;
    }
    let minIdx = 0;
    for (let k = 1; k < t.weights.length; k++) if (t.weights[k] < t.weights[minIdx]) minIdx = k;
    if (t.weights[minIdx] >= -1e-9) {
      const full = new Array(n).fill(0);
      active.forEach((idx, k) => { full[idx] = Math.max(t.weights[k], 0); });
      const s = full.reduce((a, b) => a + b, 0) || 1;
      return stat(full.map((x) => x / s), mu, cov, rf);
    }
    active = active.filter((_, k) => k !== minIdx);
  }
  return stat(new Array(n).fill(1 / n), mu, cov, rf);
}

export type TangencyResult = {
  assets: number;
  rf: number;
  tangency: PortfolioStat | null;
  gmv: PortfolioStat | null;
  longOnly: PortfolioStat;
  frontier: FrontierPoint[];
  maxSharpe: number;
};

/**
 * Full tangency analysis from asset return rows. `cov` is provided by the caller
 * (so it can match the project's covariance convention), `mu` from meanReturns.
 */
export function analyzeTangency(mu: number[], cov: CovMatrix, rf: number): TangencyResult {
  return {
    assets: mu.length,
    rf,
    tangency: tangencyPortfolio(mu, cov, rf),
    gmv: gmvPortfolio(mu, cov),
    longOnly: maxSharpeLongOnly(mu, cov, rf),
    frontier: efficientFrontier(mu, cov),
    maxSharpe: maxSharpe(mu, cov, rf),
  };
}

export { portfolioVariance };
