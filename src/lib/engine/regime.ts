/**
 * Market-regime classifier — deterministic, computed from price action only.
 */
import type { Candle } from "@/lib/rng";
import { sma, realizedVol, percentileRank, rsi } from "./indicators";

export type Trend = "UPTREND" | "DOWNTREND" | "RANGE";
export type VolRegime = "LOW" | "NORMAL" | "ELEVATED" | "EXTREME";
export type Momentum = "ACCELERATING" | "STEADY" | "FADING" | "REVERSING";

export type Regime = {
  trend: Trend;
  trendStrength: number; // 0..100
  volRegime: VolRegime;
  volPercentile: number; // 0..100
  realizedVol20: number; // annualized %
  momentum: Momentum;
  rsi14: number;
  confidence: number; // 0..100, falls with conflicting evidence
};

export function classifyRegime(candles: Candle[]): Regime {
  const closes = candles.map((c) => c.c);
  const n = closes.length;
  const last = closes[n - 1];
  const s20 = sma(closes, 20), s50 = sma(closes, 50);
  const a20 = s20[n - 1], a50 = Number.isFinite(s50[n - 1]) ? s50[n - 1] : a20;
  const slope20 = Number.isFinite(s20[n - 6]) ? (a20 / s20[n - 6] - 1) * 100 : 0;

  // trend votes: price vs SMA20, SMA20 vs SMA50, SMA20 slope
  let votes = 0;
  votes += last > a20 ? 1 : -1;
  votes += a20 > a50 ? 1 : -1;
  votes += slope20 > 0.15 ? 1 : slope20 < -0.15 ? -1 : 0;
  const trend: Trend = votes >= 2 ? "UPTREND" : votes <= -2 ? "DOWNTREND" : "RANGE";
  const trendStrength = Math.min(100, Math.round(Math.abs((last / a50 - 1) * 100) * 12 + Math.abs(slope20) * 20));

  const rv = realizedVol(closes, 20);
  const realizedVol20 = rv[n - 1] ?? 0;
  const volPercentile = percentileRank(rv.slice(-252), realizedVol20);
  const volRegime: VolRegime = volPercentile < 25 ? "LOW" : volPercentile < 70 ? "NORMAL" : volPercentile < 92 ? "ELEVATED" : "EXTREME";

  const r = rsi(closes, 14);
  const rsi14 = r[n - 1] ?? 50;
  const rsiPrev = r[n - 6] ?? rsi14;
  const dirUp = trend !== "DOWNTREND";
  let momentum: Momentum;
  if (dirUp) momentum = rsi14 > rsiPrev + 3 ? "ACCELERATING" : rsi14 < rsiPrev - 6 ? (rsi14 < 45 ? "REVERSING" : "FADING") : "STEADY";
  else momentum = rsi14 < rsiPrev - 3 ? "ACCELERATING" : rsi14 > rsiPrev + 6 ? (rsi14 > 55 ? "REVERSING" : "FADING") : "STEADY";

  // confidence: agreement between votes magnitude, trendStrength, and non-extreme vol
  const confidence = Math.max(15, Math.min(96, Math.round(Math.abs(votes) * 22 + Math.min(trendStrength, 60) * 0.6 - (volRegime === "EXTREME" ? 18 : 0))));

  return { trend, trendStrength, volRegime, volPercentile: Math.round(volPercentile), realizedVol20, momentum, rsi14, confidence };
}
