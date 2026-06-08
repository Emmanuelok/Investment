/**
 * Technical indicators — computed client-side for the interactive charting
 * engine. Each returns an array aligned to the input length, with leading
 * `null` where the window isn't yet full.
 */
import type { Candle } from "@/lib/rng";

export type Series = (number | null)[];

export function sma(values: number[], period: number): Series {
  const out: Series = new Array(values.length).fill(null);
  if (period <= 0) return out;
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

export function ema(values: number[], period: number): Series {
  const out: Series = new Array(values.length).fill(null);
  if (period <= 0 || values.length === 0) return out;
  const k = 2 / (period + 1);
  let prev = values[0];
  out[0] = values[0];
  for (let i = 1; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    out[i] = i >= period - 1 ? prev : null;
  }
  return out;
}

export function rsi(values: number[], period = 14): Series {
  const out: Series = new Array(values.length).fill(null);
  if (values.length <= period) return out;
  let gain = 0, loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = values[i] - values[i - 1];
    if (d >= 0) gain += d; else loss -= d;
  }
  gain /= period;
  loss /= period;
  out[period] = 100 - 100 / (1 + gain / (loss || 1e-9));
  for (let i = period + 1; i < values.length; i++) {
    const d = values[i] - values[i - 1];
    gain = (gain * (period - 1) + Math.max(d, 0)) / period;
    loss = (loss * (period - 1) + Math.max(-d, 0)) / period;
    out[i] = 100 - 100 / (1 + gain / (loss || 1e-9));
  }
  return out;
}

export function macd(values: number[], fast = 12, slow = 26, signal = 9): { macd: Series; signal: Series; hist: Series } {
  const ef = ema(values, fast);
  const es = ema(values, slow);
  const line: Series = values.map((_, i) => (ef[i] != null && es[i] != null ? (ef[i] as number) - (es[i] as number) : null));
  const compact = line.map((v) => v ?? 0);
  const sig = ema(compact, signal).map((v, i) => (line[i] == null ? null : v));
  const hist: Series = line.map((v, i) => (v != null && sig[i] != null ? v - (sig[i] as number) : null));
  return { macd: line, signal: sig, hist };
}

export function bollinger(values: number[], period = 20, mult = 2): { mid: Series; upper: Series; lower: Series } {
  const mid = sma(values, period);
  const upper: Series = new Array(values.length).fill(null);
  const lower: Series = new Array(values.length).fill(null);
  for (let i = period - 1; i < values.length; i++) {
    const win = values.slice(i - period + 1, i + 1);
    const m = mid[i] as number;
    const sd = Math.sqrt(win.reduce((a, v) => a + (v - m) ** 2, 0) / period);
    upper[i] = m + mult * sd;
    lower[i] = m - mult * sd;
  }
  return { mid, upper, lower };
}

/** Session VWAP over candles (cumulative). */
export function vwap(candles: Candle[]): Series {
  const out: Series = new Array(candles.length).fill(null);
  let pv = 0, vol = 0;
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const typical = (c.h + c.l + c.c) / 3;
    pv += typical * c.v;
    vol += c.v;
    out[i] = vol > 0 ? pv / vol : null;
  }
  return out;
}

export function closes(candles: Candle[]): number[] {
  return candles.map((c) => c.c);
}
