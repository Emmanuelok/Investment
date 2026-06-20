/**
 * Pairs / statistical-arbitrage engine.
 *
 * Computes an OLS hedge ratio between two log-price series, the resulting
 * spread and its rolling z-score, the Ornstein-Uhlenbeck mean-reversion
 * half-life, return correlation, and a trade signal. All deterministic.
 */
import { logReturns, pearson } from "./correlation";

/** Ordinary least squares slope & intercept of y on x. */
export function ols(x: number[], y: number[]): { slope: number; intercept: number; r2: number } {
  const n = Math.min(x.length, y.length);
  if (n < 2) return { slope: 0, intercept: 0, r2: 0 };
  const xs = x.slice(-n), ys = y.slice(-n);
  const mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { const dx = xs[i] - mx, dy = ys[i] - my; sxy += dx * dy; sxx += dx * dx; syy += dy * dy; }
  const slope = sxx === 0 ? 0 : sxy / sxx;
  const intercept = my - slope * mx;
  const r2 = sxx === 0 || syy === 0 ? 0 : (sxy * sxy) / (sxx * syy);
  return { slope, intercept, r2 };
}

export type PairSignal = "LONG_SPREAD" | "SHORT_SPREAD" | "FLAT" | "EXIT";

export type PairReport = {
  symA: string;
  symB: string;
  hedgeRatio: number; // β: logA ≈ α + β·logB
  correlation: number; // of returns
  spread: number[]; // logA − β·logB
  zscore: number[]; // rolling z of spread
  zLast: number;
  halfLife: number; // bars to revert halfway (Infinity = none)
  mean: number;
  std: number;
  signal: PairSignal;
  rationale: string;
  entryZ: number;
  exitZ: number;
};

/** OU half-life of mean reversion: Δs_t = a + b·s_{t-1}; HL = −ln2 / ln(1+b). */
export function halfLife(spread: number[]): number {
  if (spread.length < 10) return Infinity;
  const lag = spread.slice(0, -1);
  const delta = spread.slice(1).map((s, i) => s - spread[i]);
  const { slope: b } = ols(lag, delta);
  if (b >= 0) return Infinity; // not mean-reverting
  const hl = -Math.log(2) / Math.log(1 + b);
  return hl > 0 && Number.isFinite(hl) ? hl : Infinity;
}

export function analyzePair(symA: string, symB: string, closesA: number[], closesB: number[], window = 90, entryZ = 2, exitZ = 0.5): PairReport {
  const n = Math.min(closesA.length, closesB.length);
  const la = closesA.slice(-n).map((c) => Math.log(c));
  const lb = closesB.slice(-n).map((c) => Math.log(c));
  const { slope: hedgeRatio } = ols(lb, la); // regress logA on logB
  const spread = la.map((v, i) => v - hedgeRatio * lb[i]);

  const win = Math.min(window, spread.length);
  const w = spread.slice(-win);
  const mean = w.reduce((a, b) => a + b, 0) / win;
  const std = Math.sqrt(w.reduce((a, b) => a + (b - mean) ** 2, 0) / win) || 1e-9;
  const zscore = spread.map((s) => (s - mean) / std);
  const zLast = zscore[zscore.length - 1];

  const correlation = pearson(logReturns(closesA.slice(-n)), logReturns(closesB.slice(-n)));
  const hl = halfLife(spread);

  let signal: PairSignal = "FLAT";
  if (Math.abs(zLast) < exitZ) signal = "EXIT";
  else if (zLast >= entryZ) signal = "SHORT_SPREAD"; // spread rich → short A / long B
  else if (zLast <= -entryZ) signal = "LONG_SPREAD"; // spread cheap → long A / short B

  const rationale =
    signal === "SHORT_SPREAD" ? `Spread ${zLast.toFixed(2)}σ rich — short ${symA}, long ${symB} (β ${hedgeRatio.toFixed(2)})`
    : signal === "LONG_SPREAD" ? `Spread ${zLast.toFixed(2)}σ cheap — long ${symA}, short ${symB} (β ${hedgeRatio.toFixed(2)})`
    : signal === "EXIT" ? `Spread near fair value (${zLast.toFixed(2)}σ) — no edge`
    : `Spread ${zLast.toFixed(2)}σ — inside ±${entryZ}σ band, wait`;

  return { symA, symB, hedgeRatio, correlation, spread, zscore, zLast, halfLife: hl, mean, std, signal, rationale, entryZ, exitZ };
}
