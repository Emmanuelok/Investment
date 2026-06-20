/**
 * Macro nowcast composite — turns a basket of transformed FRED indicators into
 * standardized growth / inflation / labor signals and a business-cycle regime.
 *
 * Each indicator is z-scored against its OWN history (so a series sits in
 * standard-deviation units relative to its normal range), sign-adjusted so that
 * "+" always means stronger growth / higher inflation / tighter labor, then
 * weighted-averaged within its group. The growth composite's level × its
 * short-term momentum places the economy in the classic four-quadrant cycle:
 *
 *            momentum →      rising            falling
 *   level ↑ (≥0)            Expansion          Slowdown
 *   level ↓ (<0)            Recovery           Contraction
 *
 * Pure & deterministic — z-scoring and compositing only; the route does the
 * data fetching and the economic transforms (YoY, level, change).
 */

export type NowcastGroup = "Growth" | "Inflation" | "Labor";

export type NowcastInput = {
  id: string;
  label: string;
  group: NowcastGroup;
  series: number[]; // transformed historical values, oldest → newest
  sign?: 1 | -1; // -1 inverts (e.g. unemployment, jobless claims: higher = weaker)
  weight?: number; // weight within its group (default 1)
};

export type NowcastIndicator = {
  id: string;
  label: string;
  group: NowcastGroup;
  latest: number;
  z: number; // sign-adjusted standardized level
  trend: number; // sign-adjusted change in z vs ~6 periods ago (acceleration)
  weight: number;
};

export type NowcastComposite = { group: NowcastGroup; z: number; momentum: number; n: number };

export type Regime = "Expansion" | "Slowdown" | "Contraction" | "Recovery";

export type NowcastResult = {
  indicators: NowcastIndicator[];
  composites: NowcastComposite[];
  growthZ: number;
  inflationZ: number;
  laborZ: number;
  momentum: number; // growth-composite momentum
  regime: Regime;
  score: number; // 0..100 friendly growth score (50 = neutral)
};

const MOM_LAG = 6;

/** Sample mean and standard deviation (n−1) of a numeric series. */
export function meanStd(series: number[]): { mean: number; std: number } {
  const n = series.length;
  if (n === 0) return { mean: 0, std: 0 };
  const mean = series.reduce((s, x) => s + x, 0) / n;
  if (n < 2) return { mean, std: 0 };
  const variance = series.reduce((s, x) => s + (x - mean) * (x - mean), 0) / (n - 1);
  return { mean, std: Math.sqrt(variance) };
}

/** Z-score of `value` given a distribution's mean/std (0 when std≈0). */
export const zOf = (value: number, mean: number, std: number): number => (std > 1e-12 ? (value - mean) / std : 0);

/** Z-score of the most-recent observation against the whole series' history. */
export function zLast(series: number[]): number {
  if (series.length < 2) return 0;
  const { mean, std } = meanStd(series);
  return zOf(series[series.length - 1], mean, std);
}

function classify(growthZ: number, momentum: number): Regime {
  if (growthZ >= 0) return momentum >= 0 ? "Expansion" : "Slowdown";
  return momentum >= 0 ? "Recovery" : "Contraction";
}

/** Logistic squash of a z-score into a friendly 0..100 score (50 = neutral). */
const toScore = (z: number): number => 100 / (1 + Math.exp(-z));

export function buildNowcast(inputs: NowcastInput[]): NowcastResult {
  const indicators: NowcastIndicator[] = inputs
    .filter((d) => d.series.length >= 2)
    .map((d) => {
      const sign = d.sign ?? 1;
      const weight = d.weight ?? 1;
      const { mean, std } = meanStd(d.series);
      const n = d.series.length;
      const latest = d.series[n - 1];
      const z = sign * zOf(latest, mean, std);
      const past = d.series[Math.max(0, n - 1 - MOM_LAG)];
      const trend = sign * (zOf(latest, mean, std) - zOf(past, mean, std));
      return { id: d.id, label: d.label, group: d.group, latest, z, trend, weight };
    });

  const composite = (group: NowcastGroup): NowcastComposite => {
    const g = indicators.filter((i) => i.group === group);
    const wsum = g.reduce((s, i) => s + i.weight, 0);
    const z = wsum > 0 ? g.reduce((s, i) => s + i.z * i.weight, 0) / wsum : 0;
    const momentum = wsum > 0 ? g.reduce((s, i) => s + i.trend * i.weight, 0) / wsum : 0;
    return { group, z, momentum, n: g.length };
  };

  const composites: NowcastComposite[] = (["Growth", "Inflation", "Labor"] as NowcastGroup[])
    .map(composite)
    .filter((c) => c.n > 0);

  const growth = composites.find((c) => c.group === "Growth");
  const inflation = composites.find((c) => c.group === "Inflation");
  const labor = composites.find((c) => c.group === "Labor");

  // Labor strength feeds the growth read at half weight (employment leads output).
  const growthZ = growth?.z ?? 0;
  const laborZ = labor?.z ?? 0;
  const blendedGrowth = growth && labor ? (growthZ + 0.5 * laborZ) / 1.5 : growthZ || laborZ;
  const momentum = growth?.momentum ?? labor?.momentum ?? 0;

  return {
    indicators,
    composites,
    growthZ: blendedGrowth,
    inflationZ: inflation?.z ?? 0,
    laborZ,
    momentum,
    regime: classify(blendedGrowth, momentum),
    score: toScore(blendedGrowth),
  };
}
