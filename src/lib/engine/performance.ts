/**
 * Performance-analytics engine — the full-period risk-adjusted ratio suite that
 * complements the rolling metrics in riskmetrics.ts. From a close series it
 * derives simple returns and computes return, risk, and a battery of ratios:
 * Sharpe, Sortino, Calmar, Omega, gain-to-pain, tail ratio, plus distribution
 * shape (skew, excess kurtosis). Ratios whose denominator vanishes (e.g. no
 * downside, no drawdown) are returned as null rather than ±Infinity so they
 * survive JSON and render honestly as "∞"/"—". Pure, deterministic.
 */

export type PerfOptions = { rf?: number; periodsPerYear?: number; mar?: number };

export type PerfRatios = {
  totalReturn: number;
  cagr: number;
  annReturn: number; // arithmetic, annualized
  annVol: number;
  sharpe: number; // 0 when vol is zero
  sortino: number | null;
  calmar: number | null;
  omega: number | null;
  gainToPain: number | null;
  tailRatio: number | null;
  maxDrawdown: number; // negative fraction (e.g. −0.25)
  winRate: number;
  bestDay: number;
  worstDay: number;
  skew: number;
  kurtosis: number; // excess (normal ⇒ 0)
  observations: number;
};

const mean = (a: number[]): number => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);

function quantile(sorted: number[], q: number): number {
  if (!sorted.length) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

/** Simple (arithmetic) returns from a close series. */
export function simpleReturns(closes: number[]): number[] {
  const r: number[] = [];
  for (let i = 1; i < closes.length; i++) if (closes[i - 1] > 0) r.push(closes[i] / closes[i - 1] - 1);
  return r;
}

/** Max drawdown (negative fraction) of the compounded equity curve of returns. */
export function maxDrawdownOf(returns: number[]): number {
  let eq = 1;
  let peak = 1;
  let mdd = 0;
  for (const r of returns) {
    eq *= 1 + r;
    if (eq > peak) peak = eq;
    const dd = eq / peak - 1;
    if (dd < mdd) mdd = dd;
  }
  return mdd;
}

export function performanceRatios(closes: number[], opts: PerfOptions = {}): PerfRatios {
  const periodsPerYear = opts.periodsPerYear ?? 252;
  const rf = opts.rf ?? 0;
  const mar = opts.mar ?? 0;
  const rfPer = rf / periodsPerYear;
  const marPer = mar / periodsPerYear;

  const r = simpleReturns(closes);
  const n = r.length;
  const empty: PerfRatios = {
    totalReturn: 0, cagr: 0, annReturn: 0, annVol: 0, sharpe: 0, sortino: null, calmar: null,
    omega: null, gainToPain: null, tailRatio: null, maxDrawdown: 0, winRate: 0, bestDay: 0,
    worstDay: 0, skew: 0, kurtosis: 0, observations: 0,
  };
  if (n < 2) return empty;

  const m = mean(r);
  const variance = r.reduce((s, x) => s + (x - m) * (x - m), 0) / (n - 1);
  const sd = Math.sqrt(variance);
  const annVol = sd * Math.sqrt(periodsPerYear);
  const annReturn = m * periodsPerYear;

  const totalReturn = closes[closes.length - 1] / closes[0] - 1;
  const cagr = Math.pow(1 + totalReturn, periodsPerYear / n) - 1;

  // Sharpe (annualized) from per-period excess returns.
  const excessMean = m - rfPer;
  const sharpe = sd > 1e-12 ? (excessMean / sd) * Math.sqrt(periodsPerYear) : 0;

  // Sortino — downside deviation below the MAR.
  const downside = r.map((x) => Math.min(0, x - marPer));
  const dsdVar = downside.reduce((s, x) => s + x * x, 0) / n;
  const dsd = Math.sqrt(dsdVar);
  const sortino = dsd > 1e-12 ? ((m - marPer) / dsd) * Math.sqrt(periodsPerYear) : null;

  const maxDrawdown = maxDrawdownOf(r);
  const calmar = maxDrawdown < -1e-9 ? cagr / Math.abs(maxDrawdown) : null;

  // Omega & gain-to-pain around the threshold (per-period MAR).
  let gain = 0;
  let pain = 0;
  for (const x of r) {
    const d = x - marPer;
    if (d > 0) gain += d;
    else pain += -d;
  }
  const omega = pain > 1e-12 ? gain / pain : null;

  let posSum = 0;
  let negSum = 0;
  for (const x of r) (x >= 0 ? (posSum += x) : (negSum += -x));
  const gainToPain = negSum > 1e-12 ? posSum / negSum : null;

  const sorted = [...r].sort((a, b) => a - b);
  const p95 = quantile(sorted, 0.95);
  const p5 = quantile(sorted, 0.05);
  const tailRatio = Math.abs(p5) > 1e-12 ? Math.abs(p95) / Math.abs(p5) : null;

  // Distribution shape (population skew & excess kurtosis).
  const skew = sd > 1e-12 ? r.reduce((s, x) => s + Math.pow((x - m) / sd, 3), 0) / n : 0;
  const kurtosis = sd > 1e-12 ? r.reduce((s, x) => s + Math.pow((x - m) / sd, 4), 0) / n - 3 : 0;

  const winRate = r.filter((x) => x > 0).length / n;

  return {
    totalReturn, cagr, annReturn, annVol, sharpe, sortino, calmar, omega, gainToPain, tailRatio,
    maxDrawdown, winRate, bestDay: sorted[sorted.length - 1], worstDay: sorted[0], skew, kurtosis, observations: n,
  };
}
