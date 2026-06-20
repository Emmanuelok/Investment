/**
 * Relative-strength engine — IBD-style weighted multi-period momentum, an RS
 * line vs a benchmark, RS-new-high detection, and a cross-sectional RS rating
 * (1–99 percentile). Deterministic.
 */

const at = (a: number[], k: number) => a[Math.max(0, a.length - 1 - k)];

/**
 * Weighted momentum score (%) — IBD weights the most recent quarter double.
 * Uses 63/126/189/252-day returns, scaling to whatever history exists.
 */
export function weightedMomentum(closes: number[]): number {
  const n = closes.length;
  if (n < 2) return 0;
  const last = closes[n - 1];
  const periods: [number, number][] = [[63, 0.4], [126, 0.2], [189, 0.2], [252, 0.2]];
  let score = 0, wsum = 0;
  for (const [k, w] of periods) {
    if (n > k) { score += w * (last / at(closes, k) - 1) * 100; wsum += w; }
  }
  if (wsum === 0) return (last / closes[0] - 1) * 100;
  return score / wsum;
}

/** RS line = price / benchmark, rebased to 100 at the start of the aligned window. */
export function rsLine(closes: number[], benchCloses: number[]): number[] {
  const n = Math.min(closes.length, benchCloses.length);
  const a = closes.slice(-n), b = benchCloses.slice(-n);
  const base = a[0] / b[0];
  return a.map((c, i) => (c / b[i] / base) * 100);
}

/** Is the RS line at a new high over the last `lookback` bars? */
export function rsNewHigh(line: number[], lookback = 63): boolean {
  if (line.length < 5) return false;
  const w = line.slice(-lookback);
  const last = w[w.length - 1];
  return last >= Math.max(...w) - 1e-9;
}

/** Excess return of `closes` over `benchCloses` over the last `period` bars (%). */
export function relativeReturn(closes: number[], benchCloses: number[], period = 63): number {
  const n = Math.min(closes.length, benchCloses.length, period + 1);
  if (n < 2) return 0;
  const a = closes.slice(-n), b = benchCloses.slice(-n);
  return ((a[a.length - 1] / a[0]) - (b[b.length - 1] / b[0])) * 100;
}

/** RS rating 1–99: percentile of `score` within the peer `allScores`. */
export function rsRating(score: number, allScores: number[]): number {
  const fin = allScores.filter(Number.isFinite);
  if (fin.length < 2) return 50;
  const below = fin.filter((s) => s <= score).length;
  return Math.max(1, Math.min(99, Math.round((below / fin.length) * 99)));
}
