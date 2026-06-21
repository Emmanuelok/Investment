/**
 * Stat-arb pairs screener. Extends the single-pair analyzer into a universe scan:
 * for every pair it runs the cointegration/half-life/z-score analysis and ranks
 * the results by tradeability — a composite of how related the two names are
 * (return correlation), how quickly the spread mean-reverts (OU half-life), and
 * how stretched it is right now (|z|, the entry trigger). Surfaces the best
 * mean-reverting relationships and which side to take. Pure & deterministic;
 * reuses analyzePair.
 */

import { analyzePair, type PairSignal } from "./pairs";

export type PriceSeries = { sym: string; closes: number[] };

export type PairCandidate = {
  a: string;
  b: string;
  correlation: number; // of returns
  hedgeRatio: number;
  halfLife: number; // OU half-life (bars), Infinity if not mean-reverting
  zLast: number; // current spread z-score
  signal: PairSignal;
  action: string; // human-readable trade
  tradeable: boolean;
  score: number; // 0..100 ranking
};

export type PairScreenReport = {
  pairs: PairCandidate[];
  scanned: number;
  tradeableCount: number;
};

const clamp = (x: number, lo: number, hi: number): number => (x < lo ? lo : x > hi ? hi : x);

function actionOf(signal: PairSignal, a: string, b: string): string {
  switch (signal) {
    case "LONG_SPREAD":
      return `Long ${a} / Short ${b}`;
    case "SHORT_SPREAD":
      return `Short ${a} / Long ${b}`;
    case "EXIT":
      return "Exit / take profit";
    default:
      return "Hold (wait for an extreme)";
  }
}

export function screenPairs(series: PriceSeries[], opts: { window?: number; entryZ?: number; top?: number } = {}): PairScreenReport {
  const window = opts.window ?? 90;
  const entryZ = opts.entryZ ?? 2;
  const top = opts.top ?? 15;

  const usable = series.filter((s) => s.closes.length >= window + 5);
  const out: PairCandidate[] = [];

  for (let i = 0; i < usable.length; i++) {
    for (let j = i + 1; j < usable.length; j++) {
      const A = usable[i];
      const B = usable[j];
      const T = Math.min(A.closes.length, B.closes.length);
      const rep = analyzePair(A.sym, B.sym, A.closes.slice(-T), B.closes.slice(-T), window, entryZ);

      const correlation = rep.correlation;
      const halfLife = rep.halfLife;
      const zLast = rep.zLast;
      const tradeable = correlation > 0.5 && Number.isFinite(halfLife) && halfLife > 1 && halfLife < 60;

      const corrScore = clamp(correlation, 0, 1);
      const reversionScore = Number.isFinite(halfLife) && halfLife > 1 && halfLife < 60 ? clamp((60 - halfLife) / 59, 0, 1) : 0;
      const entryScore = clamp(Math.abs(zLast) / 2.5, 0, 1);
      const score = Math.round((0.4 * corrScore + 0.35 * reversionScore + 0.25 * entryScore) * 100);

      out.push({
        a: A.sym,
        b: B.sym,
        correlation,
        hedgeRatio: rep.hedgeRatio,
        halfLife,
        zLast,
        signal: rep.signal,
        action: actionOf(rep.signal, A.sym, B.sym),
        tradeable,
        score,
      });
    }
  }

  out.sort((x, y) => y.score - x.score);
  return { pairs: out.slice(0, top), scanned: out.length, tradeableCount: out.filter((p) => p.tradeable).length };
}
