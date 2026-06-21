/**
 * Cross-asset correlation-regime engine. Diversification is a function of how
 * correlated assets are *right now* — and in stress, cross-asset correlations
 * spike toward 1 and diversification evaporates. From a set of asset-class proxy
 * series it measures the current average pairwise correlation, how that compares
 * to its own rolling history (percentile), the key equity-vs-bond correlation
 * (negative = bonds hedge equities; positive = inflation regime), the effective
 * number of independent bets, and a Diversified→Crisis regime plus a risk-on /
 * risk-off read. Pure & deterministic; reuses pearson / logReturns.
 */

import { pearson, logReturns } from "./correlation";

export type AssetSeries = { symbol: string; assetClass: string; closes: number[] };
export type PairCorr = { a: string; b: string; corr: number };

export type CorrelationRegime = "Diversified" | "Normal" | "Correlated" | "Crisis";
export type RiskAppetite = "Risk-on" | "Neutral" | "Risk-off";

export type CorrelationRegimeReport = {
  n: number;
  avgPairwise: number; // recent-window average off-diagonal correlation
  rolling: number[]; // rolling average pairwise correlation (tail), oldest → newest
  percentile: number; // where the current avg sits within its rolling history (0..100)
  stockBondCorr: number | null;
  topPairs: PairCorr[]; // most-correlated pairs now (diversification risk)
  effectiveBets: number; // n / (1 + (n−1)·avg)
  diversification: number; // 0..100 (effectiveBets / n)
  equityReturn: number; // recent return of the equity proxy (percent)
  regime: CorrelationRegime;
  riskAppetite: RiskAppetite;
};

const clamp = (x: number, lo: number, hi: number): number => (x < lo ? lo : x > hi ? hi : x);

/** Align return rows to their shortest common length, optionally last `window`. */
function align(rows: number[][], window?: number): number[][] {
  const T = rows.length ? Math.min(...rows.map((r) => r.length)) : 0;
  const w = window ? Math.min(window, T) : T;
  return rows.map((r) => r.slice(r.length - w));
}

/** Average of the off-diagonal pairwise correlations across the return rows. */
export function avgPairwise(rows: number[][], window?: number): number {
  const a = align(rows, window);
  const n = a.length;
  if (n < 2) return 0;
  let sum = 0;
  let count = 0;
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) {
      sum += pearson(a[i], a[j]);
      count++;
    }
  return count ? sum / count : 0;
}

/** Every pairwise correlation, labelled, sorted strongest-first. */
export function pairwiseCorrs(rows: number[][], symbols: string[], window?: number): PairCorr[] {
  const a = align(rows, window);
  const out: PairCorr[] = [];
  for (let i = 0; i < a.length; i++)
    for (let j = i + 1; j < a.length; j++) out.push({ a: symbols[i], b: symbols[j], corr: pearson(a[i], a[j]) });
  return out.sort((x, y) => y.corr - x.corr);
}

/** Rolling average pairwise correlation over `window`-sized blocks stepped by `step`. */
export function rollingAvgPairwise(rows: number[][], window = 60, step = 5): number[] {
  const T = rows.length ? Math.min(...rows.map((r) => r.length)) : 0;
  if (T < window + step) return [avgPairwise(rows)];
  const out: number[] = [];
  for (let end = window; end <= T; end += step) {
    const slice = rows.map((r) => r.slice(end - window, end));
    out.push(avgPairwise(slice));
  }
  return out;
}

const percentileOf = (series: number[], value: number): number => {
  if (!series.length) return 50;
  let below = 0;
  for (const x of series) if (x <= value) below++;
  return (below / series.length) * 100;
};

function regimeOf(avg: number): CorrelationRegime {
  if (avg < 0.25) return "Diversified";
  if (avg < 0.45) return "Normal";
  if (avg < 0.65) return "Correlated";
  return "Crisis";
}

export function analyzeCorrelationRegime(assets: AssetSeries[], opts: { window?: number } = {}): CorrelationRegimeReport {
  const window = opts.window ?? 60;
  const valid = assets.filter((a) => a.closes.length > window + 2);
  const symbols = valid.map((a) => a.symbol);
  const rows = valid.map((a) => logReturns(a.closes));
  const n = valid.length;

  const avgPair = avgPairwise(rows, window);
  const rolling = rollingAvgPairwise(rows, window, 5);
  const percentile = percentileOf(rolling, avgPair);
  const topPairs = pairwiseCorrs(rows, symbols, window).slice(0, 5);

  // Equity vs bond correlation, if both proxies are tagged.
  const eqIdx = valid.findIndex((a) => /equit|stock/i.test(a.assetClass));
  const bondIdx = valid.findIndex((a) => /bond|treasur|rate|fixed/i.test(a.assetClass));
  const aligned = align(rows, window);
  const stockBondCorr = eqIdx >= 0 && bondIdx >= 0 && eqIdx !== bondIdx ? pearson(aligned[eqIdx], aligned[bondIdx]) : null;

  // Equity proxy recent return (for the risk-appetite read).
  const eq = eqIdx >= 0 ? valid[eqIdx] : valid[0];
  const eqCloses = eq ? eq.closes : [];
  const eqWin = eqCloses.slice(-(window + 1));
  const equityReturn = eqWin.length > 1 && eqWin[0] > 0 ? (eqWin[eqWin.length - 1] / eqWin[0] - 1) * 100 : 0;

  const effectiveBets = n > 0 ? n / (1 + (n - 1) * clamp(avgPair, 0, 1)) : 0;
  const diversification = n > 0 ? clamp((effectiveBets / n) * 100, 0, 100) : 0;
  const regime = regimeOf(avgPair);

  let riskAppetite: RiskAppetite = "Neutral";
  if (equityReturn > 0 && avgPair < 0.55) riskAppetite = "Risk-on";
  else if (equityReturn < 0 && avgPair >= 0.45) riskAppetite = "Risk-off";

  return {
    n,
    avgPairwise: avgPair,
    rolling,
    percentile,
    stockBondCorr,
    topPairs,
    effectiveBets,
    diversification,
    equityReturn,
    regime,
    riskAppetite,
  };
}
