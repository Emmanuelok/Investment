/**
 * Credit-conditions engine — turns a basket of corporate credit spreads (ICE
 * BofA option-adjusted spreads from FRED) into a systemic credit-stress read.
 * For each spread it computes where today sits in its own historical
 * distribution (percentile + z-score) and whether it is widening or tightening,
 * then blends the percentiles — tilted by recent momentum — into a 0–100 stress
 * score and a regime label from Calm to Crisis. Wide, widening spreads = stress.
 * Pure & deterministic; the route supplies the FRED series.
 */

export type SpreadInput = {
  id: string;
  label: string;
  tier?: string; // IG / HY / BBB / CCC …
  series: number[]; // historical spread (percent), oldest → newest
  weight?: number;
};

export type SpreadTrend = "Widening" | "Tightening" | "Stable";

export type SpreadGauge = {
  id: string;
  label: string;
  tier?: string;
  latest: number; // current spread (percent)
  percentile: number; // 0..100 within its own history (high = wide = stress)
  z: number;
  changeBps: number; // recent change in basis points
  trend: SpreadTrend;
  weight: number;
};

export type CreditLevel = "Calm" | "Normal" | "Cautious" | "Stressed" | "Crisis";

export type CreditConditions = {
  gauges: SpreadGauge[];
  stressScore: number; // 0..100
  level: CreditLevel;
  momentum: number; // weighted recent change in bps (+ = widening)
  n: number;
};

const MOM_LAG = 20;
const clamp = (x: number, lo: number, hi: number): number => (x < lo ? lo : x > hi ? hi : x);
const mean = (a: number[]): number => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);

/** Percentile rank of `value` within `series`: % of observations ≤ value. */
export function percentileOf(series: number[], value: number): number {
  if (!series.length) return 0;
  let below = 0;
  for (const x of series) if (x <= value) below++;
  return (below / series.length) * 100;
}

function meanStd(series: number[]): { mean: number; std: number } {
  const m = mean(series);
  if (series.length < 2) return { mean: m, std: 0 };
  const v = series.reduce((s, x) => s + (x - m) * (x - m), 0) / (series.length - 1);
  return { mean: m, std: Math.sqrt(v) };
}

function levelOf(score: number): CreditLevel {
  if (score < 20) return "Calm";
  if (score < 40) return "Normal";
  if (score < 60) return "Cautious";
  if (score < 80) return "Stressed";
  return "Crisis";
}

export function buildCreditConditions(inputs: SpreadInput[]): CreditConditions {
  const gauges: SpreadGauge[] = inputs
    .filter((d) => d.series.length >= 2)
    .map((d) => {
      const n = d.series.length;
      const latest = d.series[n - 1];
      const { mean: m, std } = meanStd(d.series);
      const past = d.series[Math.max(0, n - 1 - MOM_LAG)];
      const changeBps = (latest - past) * 100; // spreads are in percent → ×100 = bps
      const trend: SpreadTrend = changeBps > 10 ? "Widening" : changeBps < -10 ? "Tightening" : "Stable";
      return {
        id: d.id, label: d.label, tier: d.tier, latest,
        percentile: percentileOf(d.series, latest),
        z: std > 1e-9 ? (latest - m) / std : 0,
        changeBps, trend, weight: d.weight ?? 1,
      };
    });

  const wsum = gauges.reduce((s, g) => s + g.weight, 0);
  const weightedPercentile = wsum > 0 ? gauges.reduce((s, g) => s + g.percentile * g.weight, 0) / wsum : 0;
  const momentum = wsum > 0 ? gauges.reduce((s, g) => s + g.changeBps * g.weight, 0) / wsum : 0;
  const momentumTilt = clamp(momentum / 10, -10, 10); // up to ±10 points from recent widening/tightening
  const stressScore = Math.round(clamp(weightedPercentile + momentumTilt, 0, 100));

  return { gauges, stressScore, level: levelOf(stressScore), momentum, n: gauges.length };
}
