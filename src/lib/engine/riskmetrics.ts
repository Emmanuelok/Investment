/**
 * Rolling risk-metrics & drawdown analytics. Rolling Sharpe / vol / beta over a
 * window, plus a full drawdown profile (underwater curve, Ulcer index, and the
 * worst peak-to-recovery episodes). Deterministic.
 */
import { logReturns } from "./correlation";

const ANN = 252;
const mean = (a: number[]) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0);
const std = (a: number[]) => { const m = mean(a); return Math.sqrt(mean(a.map((v) => (v - m) ** 2))); };

export type RollingPoint = { i: number; sharpe: number; vol: number; beta: number | null };

/** Rolling annualized Sharpe, vol (%) and (optional) beta over `window` returns. */
export function rollingMetrics(closes: number[], window = 63, benchCloses?: number[]): RollingPoint[] {
  const r = logReturns(closes);
  const br = benchCloses ? logReturns(benchCloses) : null;
  const out: RollingPoint[] = [];
  for (let i = window; i <= r.length; i++) {
    const w = r.slice(i - window, i);
    const m = mean(w), s = std(w);
    const sharpe = s > 0 ? (m * ANN) / (s * Math.sqrt(ANN)) : 0;
    let beta: number | null = null;
    if (br && br.length >= i) {
      const bw = br.slice(i - window, i);
      const bm = mean(bw);
      let cov = 0, vb = 0;
      for (let k = 0; k < window; k++) { cov += (bw[k] - bm) * (w[k] - m); vb += (bw[k] - bm) ** 2; }
      beta = vb > 0 ? cov / vb : null;
    }
    out.push({ i, sharpe, vol: s * Math.sqrt(ANN) * 100, beta });
  }
  return out;
}

export type DrawdownEpisode = { startIdx: number; troughIdx: number; endIdx: number | null; depthPct: number; lengthBars: number; recovered: boolean };

export type DrawdownProfile = {
  underwater: number[]; // % from running peak, ≤ 0
  maxDrawdownPct: number;
  currentDrawdownPct: number;
  ulcerIndex: number; // sqrt(mean(underwater²)), in %
  inDrawdown: boolean;
  episodes: DrawdownEpisode[]; // worst first
  longestBars: number;
};

export function drawdownAnalytics(closes: number[]): DrawdownProfile {
  const n = closes.length;
  const underwater: number[] = new Array(n).fill(0);
  let peak = -Infinity;
  for (let i = 0; i < n; i++) { peak = Math.max(peak, closes[i]); underwater[i] = (closes[i] / peak - 1) * 100; }

  // identify episodes: from a new peak (uw==0) into the red and back to 0
  const episodes: DrawdownEpisode[] = [];
  let i = 0;
  while (i < n) {
    if (underwater[i] < -1e-9) {
      const startIdx = i - 1 >= 0 ? i - 1 : i;
      let troughIdx = i, depth = underwater[i];
      let j = i;
      while (j < n && underwater[j] < -1e-9) { if (underwater[j] < depth) { depth = underwater[j]; troughIdx = j; } j++; }
      const recovered = j < n;
      episodes.push({ startIdx, troughIdx, endIdx: recovered ? j : null, depthPct: depth, lengthBars: (recovered ? j : n - 1) - startIdx, recovered });
      i = j;
    } else i++;
  }
  episodes.sort((a, b) => a.depthPct - b.depthPct); // most negative first

  const ulcerIndex = Math.sqrt(mean(underwater.map((u) => u * u)));
  return {
    underwater,
    maxDrawdownPct: Math.min(0, ...underwater),
    currentDrawdownPct: underwater[n - 1] ?? 0,
    ulcerIndex,
    inDrawdown: (underwater[n - 1] ?? 0) < -1e-9,
    episodes: episodes.slice(0, 6),
    longestBars: episodes.reduce((m, e) => Math.max(m, e.lengthBars), 0),
  };
}
