/**
 * Sector scorecard & cyclical/defensive engine. Ranks the equity sectors by a
 * composite of their relative strength versus the broad market (excess returns
 * across 1/3/6-month horizons) and trend (above 50/200-DMA), turning each into a
 * 0–100 score with an Overweight/Neutral/Underweight tilt. Its centerpiece is
 * the offense-vs-defense read: whether cyclical/sensitive sectors are leading
 * defensives — a clean equity-internal risk-appetite signal. Pure & deterministic.
 */

export type SectorGroup = "Cyclical" | "Sensitive" | "Defensive";

export type SectorSeries = {
  id: string;
  label: string;
  group: SectorGroup;
  closes: number[];
};

export type SectorTilt = "Overweight" | "Neutral" | "Underweight";

export type SectorRead = {
  id: string;
  label: string;
  group: SectorGroup;
  ret1m: number;
  ret3m: number;
  ret6m: number;
  rel3m: number; // excess vs benchmark, 3m
  aboveSMA50: boolean;
  aboveSMA200: boolean;
  score: number; // 0..100
  rank: number;
  tilt: SectorTilt;
};

export type SectorRisk = "Risk-on" | "Neutral" | "Risk-off";

export type SectorScorecard = {
  benchmark: string;
  sectors: SectorRead[];
  leader: string | null;
  laggard: string | null;
  offenseScore: number; // avg score of Cyclical + Sensitive
  defenseScore: number; // avg score of Defensive
  offenseDefenseSpread: number; // offense − defense (equity risk appetite)
  riskAppetite: SectorRisk;
};

const H = { m1: 21, m3: 63, m6: 126 };
const mean = (a: number[]): number => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const clamp = (x: number, lo: number, hi: number): number => (x < lo ? lo : x > hi ? hi : x);

function ret(closes: number[], days: number): number {
  const n = closes.length;
  return n > days && closes[n - 1 - days] > 0 ? (closes[n - 1] / closes[n - 1 - days] - 1) * 100 : 0;
}
function smaAbove(closes: number[], n: number): boolean {
  if (closes.length < n) return closes[closes.length - 1] > mean(closes);
  return closes[closes.length - 1] > mean(closes.slice(-n));
}

export function buildSectorScorecard(sectors: SectorSeries[], benchmarkId: string, benchmarkCloses: number[]): SectorScorecard {
  const bench = { m1: ret(benchmarkCloses, H.m1), m3: ret(benchmarkCloses, H.m3), m6: ret(benchmarkCloses, H.m6) };

  const reads: SectorRead[] = sectors
    .filter((s) => s.closes.length > H.m1 + 1)
    .map((s) => {
      const ret1m = ret(s.closes, H.m1);
      const ret3m = ret(s.closes, H.m3);
      const ret6m = ret(s.closes, H.m6);
      const rel1m = ret1m - bench.m1;
      const rel3m = ret3m - bench.m3;
      const rel6m = ret6m - bench.m6;
      const aboveSMA50 = smaAbove(s.closes, 50);
      const aboveSMA200 = smaAbove(s.closes, 200);
      // Score: relative strength (excess returns) mapped to 0..100 + a trend bonus.
      const relMix = 0.25 * rel1m + 0.45 * rel3m + 0.3 * rel6m; // % excess
      const rsScore = clamp(50 + relMix * 3, 0, 100); // ±~16% excess spans the range
      const trendBonus = (aboveSMA50 ? 5 : -5) + (aboveSMA200 ? 5 : -5);
      const score = Math.round(clamp(rsScore + trendBonus, 0, 100));
      const tilt: SectorTilt = score >= 65 ? "Overweight" : score <= 35 ? "Underweight" : "Neutral";
      return { id: s.id, label: s.label, group: s.group, ret1m, ret3m, ret6m, rel3m, aboveSMA50, aboveSMA200, score, rank: 0, tilt };
    })
    .sort((a, b) => b.score - a.score)
    .map((s, i) => ({ ...s, rank: i + 1 }));

  const offense = reads.filter((s) => s.group === "Cyclical" || s.group === "Sensitive");
  const defense = reads.filter((s) => s.group === "Defensive");
  const offenseScore = offense.length ? mean(offense.map((s) => s.score)) : 0;
  const defenseScore = defense.length ? mean(defense.map((s) => s.score)) : 0;
  const offenseDefenseSpread = offense.length && defense.length ? offenseScore - defenseScore : 0;

  let riskAppetite: SectorRisk = "Neutral";
  if (offenseDefenseSpread > 10) riskAppetite = "Risk-on";
  else if (offenseDefenseSpread < -10) riskAppetite = "Risk-off";

  return {
    benchmark: benchmarkId,
    sectors: reads,
    leader: reads.length ? reads[0].label : null,
    laggard: reads.length ? reads[reads.length - 1].label : null,
    offenseScore,
    defenseScore,
    offenseDefenseSpread,
    riskAppetite,
  };
}
