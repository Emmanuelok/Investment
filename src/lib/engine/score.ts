/**
 * Factor-scoring engine for the scanner — momentum, trend, low-vol and
 * mean-reversion scores (0..100) computed from candles, plus a composite.
 */
import type { Candle } from "@/lib/rng";
import { sma, rsi, realizedVol, maxDrawdown } from "./indicators";

export type FactorScores = {
  momentum: number;
  trend: number;
  lowVol: number;
  meanRev: number;
  composite: number;
  ret1m: number; // %
  ret3m: number; // %
  rsi14: number;
  vol20: number; // annualized %
  maxDD: number; // %
};

const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

export function factorScores(candles: Candle[]): FactorScores {
  const closes = candles.map((c) => c.c);
  const n = closes.length;
  const last = closes[n - 1];
  const at = (k: number) => closes[Math.max(0, n - 1 - k)];

  const ret1m = (last / at(21) - 1) * 100;
  const ret3m = (last / at(63) - 1) * 100;
  // 12-1 style momentum when history allows, else 3m
  const retMom = n > 230 ? (at(21) / at(252 > n - 1 ? n - 1 : 252) - 1) * 100 : ret3m;

  const s20 = sma(closes, 20), s50 = sma(closes, 50);
  const aboveS20 = Number.isFinite(s20[n - 1]) ? (last / s20[n - 1] - 1) * 100 : 0;
  const stack = Number.isFinite(s50[n - 1]) && s20[n - 1] > s50[n - 1] ? 1 : 0;

  const r = rsi(closes)[n - 1] ?? 50;
  const rv = realizedVol(closes)[n - 1] ?? 25;
  const dd = maxDrawdown(closes.slice(-126));

  const momentum = clamp(50 + retMom * 1.4);
  const trend = clamp(50 + aboveS20 * 4 + stack * 15);
  const lowVol = clamp(100 - rv * 1.8);
  // mean-reversion setup: oversold + limited drawdown is a higher-quality dip
  const meanRev = clamp(100 - r * 1.1 + Math.max(dd, -30) * 0.6);
  const composite = clamp(momentum * 0.35 + trend * 0.3 + lowVol * 0.2 + meanRev * 0.15);

  return { momentum, trend, lowVol, meanRev, composite, ret1m, ret3m, rsi14: r, vol20: rv, maxDD: dd };
}
