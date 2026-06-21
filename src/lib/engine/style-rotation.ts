/**
 * Factor / style-rotation engine. Tracks which equity factors are *leading* the
 * market right now. For each factor proxy it computes trailing returns at
 * 1/3/6/12-month horizons, the excess return over the benchmark at each horizon,
 * and a leadership score (weighted toward the medium-term relative return). It
 * ranks the factors, names the leader and laggard, computes the headline
 * value-vs-growth and size (small-vs-large) spreads, and reads the rotation
 * regime + a defensive/cyclical risk tilt. Pure & deterministic.
 */

export type FactorStyle = "value" | "growth" | "momentum" | "quality" | "lowvol" | "smallcap" | "size" | "other";

export type FactorSeries = {
  id: string;
  label: string;
  style: FactorStyle;
  closes: number[];
};

export type FactorRead = {
  id: string;
  label: string;
  style: FactorStyle;
  ret1m: number;
  ret3m: number;
  ret6m: number;
  ret12m: number;
  rel1m: number;
  rel3m: number;
  rel6m: number;
  rel12m: number;
  score: number; // leadership composite (weighted excess returns)
  rank: number;
};

export type StyleRotationReport = {
  benchmark: string;
  factors: FactorRead[];
  leader: string | null;
  laggard: string | null;
  valueGrowthSpread: number | null; // value 3m − growth 3m return
  sizeSpread: number | null; // small 3m − benchmark 3m return
  regime: string;
  riskTilt: "Defensive" | "Cyclical" | "Neutral";
};

const HORIZONS = { m1: 21, m3: 63, m6: 126, m12: 252 };

/** Trailing simple return (%) over `days` sessions; NaN-safe, 0 when insufficient. */
export function trailingReturn(closes: number[], days: number): number {
  const n = closes.length;
  if (n <= days) return 0;
  const a = closes[n - 1 - days];
  const b = closes[n - 1];
  return a > 0 && b > 0 ? (b / a - 1) * 100 : 0;
}

const DEFENSIVE = new Set<FactorStyle>(["lowvol", "quality"]);
const CYCLICAL = new Set<FactorStyle>(["value", "momentum", "smallcap", "size"]);

export function buildStyleRotation(factors: FactorSeries[], benchmarkId: string, benchmarkCloses: number[]): StyleRotationReport {
  const bench = {
    m1: trailingReturn(benchmarkCloses, HORIZONS.m1),
    m3: trailingReturn(benchmarkCloses, HORIZONS.m3),
    m6: trailingReturn(benchmarkCloses, HORIZONS.m6),
    m12: trailingReturn(benchmarkCloses, HORIZONS.m12),
  };

  const reads: FactorRead[] = factors
    .filter((f) => f.closes.length > HORIZONS.m1 + 1)
    .map((f) => {
      const ret1m = trailingReturn(f.closes, HORIZONS.m1);
      const ret3m = trailingReturn(f.closes, HORIZONS.m3);
      const ret6m = trailingReturn(f.closes, HORIZONS.m6);
      const ret12m = trailingReturn(f.closes, HORIZONS.m12);
      const rel1m = ret1m - bench.m1;
      const rel3m = ret3m - bench.m3;
      const rel6m = ret6m - bench.m6;
      const rel12m = ret12m - bench.m12;
      // Leadership weighted toward the medium term (the persistent signal).
      const score = 0.2 * rel1m + 0.4 * rel3m + 0.3 * rel6m + 0.1 * rel12m;
      return { id: f.id, label: f.label, style: f.style, ret1m, ret3m, ret6m, ret12m, rel1m, rel3m, rel6m, rel12m, score, rank: 0 };
    })
    .sort((a, b) => b.score - a.score)
    .map((r, i) => ({ ...r, rank: i + 1 }));

  const byStyle = (style: FactorStyle): FactorRead | undefined => reads.find((r) => r.style === style);
  const value = byStyle("value");
  const growth = byStyle("growth");
  const small = byStyle("smallcap");

  const valueGrowthSpread = value && growth ? value.ret3m - growth.ret3m : null;
  const sizeSpread = small ? small.ret3m - bench.m3 : null;

  const leader = reads.length ? reads[0] : null;
  const laggard = reads.length ? reads[reads.length - 1] : null;

  let regime = "Balanced";
  if (valueGrowthSpread !== null) {
    if (valueGrowthSpread > 1) regime = "Value leadership";
    else if (valueGrowthSpread < -1) regime = "Growth leadership";
  }

  let riskTilt: StyleRotationReport["riskTilt"] = "Neutral";
  if (leader) {
    if (DEFENSIVE.has(leader.style)) riskTilt = "Defensive";
    else if (CYCLICAL.has(leader.style)) riskTilt = "Cyclical";
  }

  return {
    benchmark: benchmarkId,
    factors: reads,
    leader: leader ? leader.label : null,
    laggard: laggard ? laggard.label : null,
    valueGrowthSpread,
    sizeSpread,
    regime,
    riskTilt,
  };
}
