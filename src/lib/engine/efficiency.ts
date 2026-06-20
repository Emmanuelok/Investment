/**
 * Market-efficiency / mean-reversion engine. Three classic, independent reads
 * on whether a price series trends, mean-reverts, or behaves like a random walk:
 *
 *   • Hurst exponent (R/S analysis)  — H>0.5 persistent/trending, H<0.5
 *     anti-persistent/mean-reverting, H≈0.5 random walk.
 *   • Variance ratio (Lo-MacKinlay) — VR(q)>1 positive serial correlation
 *     (trending), <1 negative (mean-reverting), =1 random walk.
 *   • Lag-1 autocorrelation of returns.
 *
 * A small voting scheme over the three turns them into one classification.
 * Pure math on a close series — runs identically in the sandbox and on deploy.
 */

const mean = (a: number[]): number => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);

/** Lag-`lag` sample autocorrelation of a series (mean-centered, full-variance denominator). */
export function autocorr(x: number[], lag: number): number {
  const n = x.length;
  if (n <= lag + 1) return 0;
  const m = mean(x);
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) den += (x[i] - m) * (x[i] - m);
  for (let i = 0; i < n - lag; i++) num += (x[i] - m) * (x[i + lag] - m);
  return den > 1e-12 ? num / den : 0;
}

/** Log returns from a positive close series. */
export function logReturns(closes: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    const a = closes[i - 1];
    const b = closes[i];
    if (a > 0 && b > 0) out.push(Math.log(b / a));
  }
  return out;
}

/**
 * Lo-MacKinlay overlapping variance ratio VR(q) with the standard bias
 * correction m = q(T−q+1)(1−q/T). VR=1 ⇒ random walk.
 */
export function varianceRatio(returns: number[], q: number): number {
  const T = returns.length;
  if (q < 2 || T < q + 1) return 1;
  const mu = mean(returns);
  let var1 = 0;
  for (const r of returns) var1 += (r - mu) * (r - mu);
  var1 /= T - 1;
  if (var1 <= 1e-18) return 1;
  const m = q * (T - q + 1) * (1 - q / T);
  if (m <= 0) return 1;
  let varq = 0;
  for (let t = q; t <= T; t++) {
    let s = 0;
    for (let i = 0; i < q; i++) s += returns[t - 1 - i];
    varq += (s - q * mu) * (s - q * mu);
  }
  // The q-normalization is already inside the bias-corrected m, so VR = varq/var1.
  varq /= m;
  return varq / var1;
}

function olsSlope(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 2) return 0;
  const mx = mean(xs);
  const my = mean(ys);
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) * (xs[i] - mx);
  }
  return sxx > 1e-12 ? sxy / sxx : 0;
}

/**
 * Hurst exponent via rescaled-range (R/S) analysis on a series of increments
 * (returns). Fits log(R/S) ≈ H·log(n) across a geometric range of window sizes.
 */
export function hurstRS(series: number[]): number {
  const N = series.length;
  if (N < 16) return 0.5;
  const sizes: number[] = [];
  for (let n = 8; n <= Math.floor(N / 2); n = Math.floor(n * 1.6)) sizes.push(n);
  if (sizes.length < 3) return 0.5;

  const xs: number[] = [];
  const ys: number[] = [];
  for (const n of sizes) {
    const k = Math.floor(N / n);
    let rsSum = 0;
    let cnt = 0;
    for (let w = 0; w < k; w++) {
      const seg = series.slice(w * n, w * n + n);
      const m = mean(seg);
      let cum = 0;
      let mn = Infinity;
      let mx = -Infinity;
      let sd = 0;
      for (const v of seg) {
        cum += v - m;
        if (cum < mn) mn = cum;
        if (cum > mx) mx = cum;
      }
      for (const v of seg) sd += (v - m) * (v - m);
      sd = Math.sqrt(sd / seg.length);
      const R = mx - mn;
      if (sd > 1e-12 && R > 0) {
        rsSum += R / sd;
        cnt++;
      }
    }
    if (cnt > 0) {
      xs.push(Math.log(n));
      ys.push(Math.log(rsSum / cnt));
    }
  }
  if (xs.length < 3) return 0.5;
  return olsSlope(xs, ys);
}

export type EfficiencyResult = {
  hurst: number;
  vr2: number;
  vr5: number;
  vr10: number;
  ac1: number;
  classification: "Trending" | "Mean-reverting" | "Random walk";
  votes: number; // signed −3..+3 (positive = trending)
  nObs: number;
};

const vote = (x: number, eps: number): number => (x > eps ? 1 : x < -eps ? -1 : 0);

/** Full efficiency read on a close-price series. */
export function analyzeEfficiency(closes: number[]): EfficiencyResult {
  const returns = logReturns(closes);
  const hurst = hurstRS(returns);
  const vr2 = varianceRatio(returns, 2);
  const vr5 = varianceRatio(returns, 5);
  const vr10 = varianceRatio(returns, 10);
  const ac1 = autocorr(returns, 1);

  const votes = vote(hurst - 0.5, 0.03) + vote(vr10 - 1, 0.05) + vote(ac1, 0.04);
  const classification: EfficiencyResult["classification"] = votes >= 2 ? "Trending" : votes <= -2 ? "Mean-reverting" : "Random walk";

  return { hurst, vr2, vr5, vr10, ac1, classification, votes, nObs: returns.length };
}
