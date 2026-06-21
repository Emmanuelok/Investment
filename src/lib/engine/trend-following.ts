/**
 * Time-series-momentum / trend-following (CTA) engine. Unlike cross-sectional
 * rotation (each asset vs its peers), time-series momentum judges each asset
 * against ITS OWN past: a positive trailing 12-month return ⇒ go long, negative
 * ⇒ go short (Moskowitz-Ooi-Pedersen). Positions are volatility-targeted so each
 * contributes roughly equal risk, then aggregated into a net/gross exposure and
 * a trend-regime read (are trends strong and tradeable, or choppy?). Pure &
 * deterministic; reuses the project annualized-vol estimator.
 */

import { annualizedVol } from "./merton";

export type TsAsset = {
  id: string;
  label: string;
  assetClass: string;
  closes: number[];
};

export type TsDirection = "Long" | "Short" | "Flat";

export type TsSignal = {
  id: string;
  label: string;
  assetClass: string;
  mom12m: number; // trailing 12-month return (%)
  mom3m: number; // trailing 3-month return (%)
  vol: number; // annualized volatility (%)
  signal: TsDirection;
  weight: number; // signed, volatility-targeted (% of gross)
};

export type TrendRegime = "Strong trends" | "Mixed" | "Choppy";

export type TrendReport = {
  signals: TsSignal[];
  netExposure: number; // sum of signed weights (−100..+100)
  grossExposure: number; // sum of |weights|
  longCount: number;
  shortCount: number;
  flatCount: number;
  trendStrength: number; // average |12-month momentum| (%)
  regime: TrendRegime;
};

const TARGET_VOL = 10; // % per-position vol target
const DEADBAND = 1; // % 12-month return inside which we stay flat
const mean = (a: number[]): number => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);

function ret(closes: number[], days: number): number {
  const n = closes.length;
  return n > days && closes[n - 1 - days] > 0 ? (closes[n - 1] / closes[n - 1 - days] - 1) * 100 : 0;
}

export function buildTrendFollowing(assets: TsAsset[]): TrendReport {
  const signals: TsSignal[] = assets
    .filter((a) => a.closes.length > 64)
    .map((a) => {
      const mom12m = ret(a.closes, Math.min(252, a.closes.length - 1));
      const mom3m = ret(a.closes, 63);
      const vol = annualizedVol(a.closes.slice(-252)) * 100;
      const signal: TsDirection = mom12m > DEADBAND ? "Long" : mom12m < -DEADBAND ? "Short" : "Flat";
      return { id: a.id, label: a.label, assetClass: a.assetClass, mom12m, mom3m, vol, signal, weight: 0 };
    });

  // Volatility-target the active positions and scale so gross exposure = 100%.
  const active = signals.filter((s) => s.signal !== "Flat");
  const raw = active.map((s) => (s.signal === "Long" ? 1 : -1) * (TARGET_VOL / Math.max(s.vol, 1)));
  const grossRaw = raw.reduce((sum, w) => sum + Math.abs(w), 0);
  active.forEach((s, i) => {
    s.weight = grossRaw > 0 ? (raw[i] / grossRaw) * 100 : 0;
  });

  const netExposure = signals.reduce((sum, s) => sum + s.weight, 0);
  const grossExposure = signals.reduce((sum, s) => sum + Math.abs(s.weight), 0);
  const longCount = signals.filter((s) => s.signal === "Long").length;
  const shortCount = signals.filter((s) => s.signal === "Short").length;
  const flatCount = signals.filter((s) => s.signal === "Flat").length;

  const trendStrength = signals.length ? mean(signals.map((s) => Math.abs(s.mom12m))) : 0;
  const regime: TrendRegime = trendStrength > 15 ? "Strong trends" : trendStrength > 7 ? "Mixed" : "Choppy";

  return {
    signals: signals.sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight)),
    netExposure,
    grossExposure,
    longCount,
    shortCount,
    flatCount,
    trendStrength,
    regime,
  };
}
