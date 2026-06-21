/**
 * Cross-asset risk-posture engine — the synthesis layer. It blends independent
 * risk signals (rates curve, credit spreads, volatility, equity trend, breadth,
 * recession odds) into one market risk-on / risk-off read. Each signal is first
 * normalized to a 0–100 "support" score (50 = neutral, >50 risk-on, <50 stress)
 * via the pure mappers below, then weight-averaged into a composite with an
 * agreement gauge (how aligned the signals are). Pure & deterministic; the route
 * supplies the live readings.
 */

export type PostureSignal = {
  id: string;
  label: string;
  category: string; // Rates | Credit | Volatility | Trend | Breadth | Macro
  reading: number; // the raw indicator value (for display)
  score: number; // 0..100 normalized support (50 = neutral, >50 = risk-on)
  weight: number;
  note: string;
};

export type Posture = "Risk-on" | "Neutral" | "Risk-off";

export type RiskPostureReport = {
  composite: number; // 0..100
  posture: Posture;
  agreement: number; // 0..100, share of signals aligned with the composite
  riskOnCount: number;
  riskOffCount: number;
  neutralCount: number;
  signals: PostureSignal[];
};

const clamp = (x: number, lo: number, hi: number): number => (x < lo ? lo : x > hi ? hi : x);

/* ── Pure normalizers (each maps a raw reading to a 0..100 support score) ── */

/** 10y−3m term spread: +2.5pp ⇒ 100 (risk-on), −2.5pp ⇒ 0 (inverted). */
export const scoreFromSpread = (spread: number): number => clamp(50 + spread * 20, 0, 100);
/** High-yield OAS: 3% ⇒ 100 (tight), ~11% ⇒ ~0 (stressed). */
export const scoreFromOas = (oas: number): number => clamp(100 - (oas - 3) * 12, 0, 100);
/** VIX: 12 ⇒ 100 (calm), ~45 ⇒ ~0 (panic). */
export const scoreFromVix = (vix: number): number => clamp(100 - (vix - 12) * 3, 0, 100);
/** Trailing return (%): +15% ⇒ ~100, −15% ⇒ ~0, 0 ⇒ 50. */
export const scoreFromMomentum = (retPct: number): number => clamp(50 + retPct * (50 / 15), 0, 100);
/** A percentage that is already risk-on-positive (e.g. % above 200-DMA, recession-safety). */
export const scoreFromPercent = (pct: number): number => clamp(pct, 0, 100);

export function buildRiskPosture(signals: PostureSignal[]): RiskPostureReport {
  const wsum = signals.reduce((s, x) => s + x.weight, 0) || 1;
  const composite = Math.round(signals.reduce((s, x) => s + x.score * x.weight, 0) / wsum);
  const posture: Posture = composite >= 58 ? "Risk-on" : composite <= 42 ? "Risk-off" : "Neutral";

  const riskOnCount = signals.filter((s) => s.score > 55).length;
  const riskOffCount = signals.filter((s) => s.score < 45).length;
  const neutralCount = signals.length - riskOnCount - riskOffCount;

  // Agreement: share of signals on the composite's side (or near-neutral when Neutral).
  let aligned: number;
  if (posture === "Risk-on") aligned = signals.filter((s) => s.score > 50).length;
  else if (posture === "Risk-off") aligned = signals.filter((s) => s.score < 50).length;
  else aligned = signals.filter((s) => Math.abs(s.score - 50) <= 12).length;
  const agreement = signals.length ? Math.round((aligned / signals.length) * 100) : 0;

  return { composite, posture, agreement, riskOnCount, riskOffCount, neutralCount, signals };
}
