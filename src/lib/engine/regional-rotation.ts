/**
 * Global / regional equity-rotation engine. Ranks world equity regions by their
 * relative strength versus a global benchmark and distills the two allocation
 * decisions that matter most: US-vs-rest-of-world leadership, and EM-vs-DM (the
 * global risk-appetite tell — emerging markets lead when global liquidity and
 * risk appetite are expanding). It also reports global breadth (share of regions
 * above their 200-day average), the leader/laggard, and a US / International /
 * Balanced tilt. Pure & deterministic.
 */

export type RegionBucket = "US" | "DM" | "EM";

export type RegionSeries = {
  id: string;
  label: string;
  bucket: RegionBucket;
  closes: number[];
};

export type RegionRead = {
  id: string;
  label: string;
  bucket: RegionBucket;
  ret1m: number;
  ret3m: number;
  ret6m: number;
  ret12m: number;
  rel3m: number; // excess vs benchmark, 3m
  aboveSMA200: boolean;
  score: number;
  rank: number;
};

export type RegionalRisk = "Risk-on" | "Neutral" | "Risk-off";
export type RegionalTilt = "US" | "International" | "Balanced";

export type RegionalReport = {
  benchmark: string;
  regions: RegionRead[];
  leader: string | null;
  laggard: string | null;
  usVsWorld: number; // US 3m − (DM+EM) average 3m
  emVsDm: number; // EM average 3m − DM average 3m
  globalBreadth: number; // % of regions above their 200-DMA
  riskAppetite: RegionalRisk;
  tilt: RegionalTilt;
};

const H = { m1: 21, m3: 63, m6: 126, m12: 252 };
const mean = (a: number[]): number => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);

export function trailingReturn(closes: number[], days: number): number {
  const n = closes.length;
  if (n <= days) return 0;
  const a = closes[n - 1 - days];
  const b = closes[n - 1];
  return a > 0 && b > 0 ? (b / a - 1) * 100 : 0;
}

function aboveSMA200(closes: number[]): boolean {
  if (closes.length < 200) return closes[closes.length - 1] > mean(closes);
  return closes[closes.length - 1] > mean(closes.slice(-200));
}

export function buildRegionalRotation(regions: RegionSeries[], benchmarkId: string, benchmarkCloses: number[]): RegionalReport {
  const bench = {
    m1: trailingReturn(benchmarkCloses, H.m1),
    m3: trailingReturn(benchmarkCloses, H.m3),
    m6: trailingReturn(benchmarkCloses, H.m6),
  };

  const reads: RegionRead[] = regions
    .filter((r) => r.closes.length > H.m1 + 1)
    .map((r) => {
      const ret1m = trailingReturn(r.closes, H.m1);
      const ret3m = trailingReturn(r.closes, H.m3);
      const ret6m = trailingReturn(r.closes, H.m6);
      const ret12m = trailingReturn(r.closes, H.m12);
      const rel3m = ret3m - bench.m3;
      const score = 0.2 * (ret1m - bench.m1) + 0.5 * rel3m + 0.3 * (ret6m - bench.m6);
      return { id: r.id, label: r.label, bucket: r.bucket, ret1m, ret3m, ret6m, ret12m, rel3m, aboveSMA200: aboveSMA200(r.closes), score, rank: 0 };
    })
    .sort((a, b) => b.score - a.score)
    .map((r, i) => ({ ...r, rank: i + 1 }));

  const us = reads.filter((r) => r.bucket === "US");
  const dm = reads.filter((r) => r.bucket === "DM");
  const em = reads.filter((r) => r.bucket === "EM");

  const usRet = us.length ? mean(us.map((r) => r.ret3m)) : 0;
  const dmRet = dm.length ? mean(dm.map((r) => r.ret3m)) : 0;
  const emRet = em.length ? mean(em.map((r) => r.ret3m)) : 0;
  const world = [...dm, ...em];
  const usVsWorld = us.length && world.length ? usRet - mean(world.map((r) => r.ret3m)) : 0;
  const emVsDm = em.length && dm.length ? emRet - dmRet : 0;

  const globalBreadth = reads.length ? (reads.filter((r) => r.aboveSMA200).length / reads.length) * 100 : 0;

  let riskAppetite: RegionalRisk = "Neutral";
  if (emVsDm > 2 && globalBreadth >= 50) riskAppetite = "Risk-on";
  else if (emVsDm < -2 || globalBreadth < 30) riskAppetite = "Risk-off";

  const leader = reads.length ? reads[0] : null;
  let tilt: RegionalTilt = "Balanced";
  if (usVsWorld > 2 || (leader && leader.bucket === "US")) tilt = "US";
  else if (usVsWorld < -2 || (leader && leader.bucket !== "US")) tilt = "International";

  return {
    benchmark: benchmarkId,
    regions: reads,
    leader: leader ? leader.label : null,
    laggard: reads.length ? reads[reads.length - 1].label : null,
    usVsWorld,
    emVsDm,
    globalBreadth,
    riskAppetite,
    tilt,
  };
}
