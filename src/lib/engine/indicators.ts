/**
 * PANTHEON intelligence engine — pure, deterministic technical analytics.
 * Every function is real math over price series; no randomness, no fabrication.
 * NaN-padded outputs align 1:1 with the input series.
 */
import type { Candle } from "@/lib/rng";

export function sma(v: number[], n: number): number[] {
  const out = new Array(v.length).fill(NaN);
  let s = 0;
  for (let i = 0; i < v.length; i++) {
    s += v[i];
    if (i >= n) s -= v[i - n];
    if (i >= n - 1) out[i] = s / n;
  }
  return out;
}

export function ema(v: number[], n: number): number[] {
  const out = new Array(v.length).fill(NaN);
  const k = 2 / (n + 1);
  let prev = NaN;
  for (let i = 0; i < v.length; i++) {
    if (i === n - 1) prev = v.slice(0, n).reduce((a, b) => a + b, 0) / n;
    else if (i >= n) prev = v[i] * k + prev * (1 - k);
    if (i >= n - 1) out[i] = prev;
  }
  return out;
}

/** Wilder RSI. */
export function rsi(closes: number[], n = 14): number[] {
  const out = new Array(closes.length).fill(NaN);
  let g = 0, l = 0;
  for (let i = 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    const up = Math.max(d, 0), dn = Math.max(-d, 0);
    if (i <= n) { g += up; l += dn; if (i === n) { g /= n; l /= n; out[i] = l === 0 ? 100 : 100 - 100 / (1 + g / l); } }
    else { g = (g * (n - 1) + up) / n; l = (l * (n - 1) + dn) / n; out[i] = l === 0 ? 100 : 100 - 100 / (1 + g / l); }
  }
  return out;
}

export function macd(closes: number[], fast = 12, slow = 26, sig = 9): { macd: number[]; signal: number[]; hist: number[] } {
  const ef = ema(closes, fast), es = ema(closes, slow);
  const m = closes.map((_, i) => ef[i] - es[i]);
  const firstIdx = slow - 1;
  const valid = m.slice(firstIdx);
  const sigValid = ema(valid, sig);
  const s = new Array(closes.length).fill(NaN);
  for (let i = 0; i < sigValid.length; i++) s[firstIdx + i] = sigValid[i];
  return { macd: m, signal: s, hist: m.map((x, i) => x - s[i]) };
}

export function bollinger(closes: number[], n = 20, k = 2): { mid: number[]; upper: number[]; lower: number[] } {
  const mid = sma(closes, n);
  const upper = new Array(closes.length).fill(NaN), lower = new Array(closes.length).fill(NaN);
  for (let i = n - 1; i < closes.length; i++) {
    const w = closes.slice(i - n + 1, i + 1);
    const m = mid[i];
    const sd = Math.sqrt(w.reduce((a, x) => a + (x - m) ** 2, 0) / n);
    upper[i] = m + k * sd; lower[i] = m - k * sd;
  }
  return { mid, upper, lower };
}

export function atr(c: Candle[], n = 14): number[] {
  const out = new Array(c.length).fill(NaN);
  let prev = NaN;
  for (let i = 1; i < c.length; i++) {
    const tr = Math.max(c[i].h - c[i].l, Math.abs(c[i].h - c[i - 1].c), Math.abs(c[i].l - c[i - 1].c));
    if (i <= n) { prev = i === 1 ? tr : prev + tr; if (i === n) { prev /= n; out[i] = prev; } }
    else { prev = (prev * (n - 1) + tr) / n; out[i] = prev; }
  }
  return out;
}

/** Rolling annualized realized vol (close-to-close, window n). */
export function realizedVol(closes: number[], n = 20): number[] {
  const rets = closes.map((c, i) => (i === 0 ? NaN : Math.log(c / closes[i - 1])));
  const out = new Array(closes.length).fill(NaN);
  for (let i = n; i < closes.length; i++) {
    const w = rets.slice(i - n + 1, i + 1);
    const m = w.reduce((a, b) => a + b, 0) / n;
    out[i] = Math.sqrt((w.reduce((a, x) => a + (x - m) ** 2, 0) / (n - 1)) * 252) * 100;
  }
  return out;
}

export function maxDrawdown(closes: number[]): number {
  let peak = -Infinity, mdd = 0;
  for (const c of closes) { peak = Math.max(peak, c); mdd = Math.min(mdd, c / peak - 1); }
  return mdd * 100;
}

/** Percentile rank of v within arr (0..100). */
export function percentileRank(arr: number[], v: number): number {
  const fin = arr.filter(Number.isFinite);
  if (!fin.length) return 50;
  const below = fin.filter((x) => x <= v).length;
  return (below / fin.length) * 100;
}

/** Recent swing support/resistance from pivot highs/lows (k-bar pivots). */
export function swingLevels(c: Candle[], k = 3, span = 60): { support: number; resistance: number } {
  const w = c.slice(-span);
  const last = w[w.length - 1].c;
  let support = -Infinity, resistance = Infinity;
  for (let i = k; i < w.length - k; i++) {
    const isHi = w.slice(i - k, i + k + 1).every((b) => b.h <= w[i].h);
    const isLo = w.slice(i - k, i + k + 1).every((b) => b.l >= w[i].l);
    if (isHi && w[i].h > last && w[i].h < resistance) resistance = w[i].h;
    if (isLo && w[i].l < last && w[i].l > support) support = w[i].l;
  }
  if (!Number.isFinite(support)) support = Math.min(...w.map((b) => b.l));
  if (!Number.isFinite(resistance)) resistance = Math.max(...w.map((b) => b.h));
  return { support, resistance };
}

/** Consecutive up/down close streak ending at the last bar (+ up / − down). */
export function streak(closes: number[]): number {
  let s = 0;
  for (let i = closes.length - 1; i > 0; i--) {
    const d = Math.sign(closes[i] - closes[i - 1]);
    if (d === 0) break;
    if (s === 0) s = d;
    else if (Math.sign(s) === d) s += d;
    else break;
  }
  return s;
}
