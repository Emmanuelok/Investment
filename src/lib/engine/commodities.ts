/**
 * Commodity & inflation-impulse engine. Commodities carry two macro signals:
 * the copper/gold ratio is a classic growth-&-rates barometer (industrial demand
 * vs safe-haven), and broad-commodity momentum is a real-time inflation impulse.
 * From a basket of commodity proxy series it computes trailing returns per
 * commodity, the copper/gold and gold/oil ratios with their momentum, the broad
 * inflation impulse, the growth signal, and synthesizes the macro cycle quadrant
 * (Reflation / Goldilocks / Stagflation / Deflation). Pure & deterministic.
 */

export type CommoditySeries = {
  id: string; // "copper" | "gold" | "oil" | "broad" | …
  label: string;
  group: string;
  closes: number[];
};

export type CommodityRead = {
  id: string;
  label: string;
  group: string;
  ret1m: number;
  ret3m: number;
  ret6m: number;
  trend: "Up" | "Flat" | "Down";
};

export type CycleQuadrant = "Reflation" | "Goldilocks" | "Stagflation" | "Deflation" | "Mixed";

export type CommodityReport = {
  reads: CommodityRead[];
  copperGoldRatio: number | null;
  copperGoldChange3m: number; // %
  goldOilRatio: number | null;
  broadMomentum: number; // broad-commodity 3-month return (%)
  inflationImpulse: "Rising" | "Neutral" | "Falling";
  growthSignal: "Improving" | "Neutral" | "Deteriorating";
  cycle: CycleQuadrant;
};

const H = { m1: 21, m3: 63, m6: 126 };

export function trailingReturn(closes: number[], days: number): number {
  const n = closes.length;
  if (n <= days) return 0;
  const a = closes[n - 1 - days];
  const b = closes[n - 1];
  return a > 0 && b > 0 ? (b / a - 1) * 100 : 0;
}

/** Current ratio a/b and its % change over `days`, aligning the two series' tails. */
export function ratioChange(a: number[], b: number[], days: number): { ratio: number; change: number } | null {
  const T = Math.min(a.length, b.length);
  if (T < days + 1) return null;
  const ai = a.slice(a.length - T);
  const bi = b.slice(b.length - T);
  const cur = bi[T - 1] > 0 ? ai[T - 1] / bi[T - 1] : null;
  const past = bi[T - 1 - days] > 0 ? ai[T - 1 - days] / bi[T - 1 - days] : null;
  if (cur === null || past === null || past === 0) return null;
  return { ratio: cur, change: (cur / past - 1) * 100 };
}

function cycleOf(growth: CommodityReport["growthSignal"], inflation: CommodityReport["inflationImpulse"]): CycleQuadrant {
  if (growth === "Improving" && inflation === "Rising") return "Reflation";
  if (growth === "Improving" && inflation === "Falling") return "Goldilocks";
  if (growth === "Deteriorating" && inflation === "Rising") return "Stagflation";
  if (growth === "Deteriorating" && inflation === "Falling") return "Deflation";
  return "Mixed";
}

export function buildCommodities(series: CommoditySeries[]): CommodityReport {
  const reads: CommodityRead[] = series
    .filter((s) => s.closes.length > H.m1 + 1)
    .map((s) => {
      const ret1m = trailingReturn(s.closes, H.m1);
      const ret3m = trailingReturn(s.closes, H.m3);
      const ret6m = trailingReturn(s.closes, H.m6);
      const trend: CommodityRead["trend"] = ret3m > 2 ? "Up" : ret3m < -2 ? "Down" : "Flat";
      return { id: s.id, label: s.label, group: s.group, ret1m, ret3m, ret6m, trend };
    });

  const find = (id: string): number[] | undefined => series.find((s) => s.id === id)?.closes;
  const copper = find("copper");
  const gold = find("gold");
  const oil = find("oil");
  const broad = find("broad");

  const cg = copper && gold ? ratioChange(copper, gold, H.m3) : null;
  const go = gold && oil ? ratioChange(gold, oil, H.m3) : null;
  const copperGoldRatio = cg ? cg.ratio : null;
  const copperGoldChange3m = cg ? cg.change : 0;
  const goldOilRatio = go ? go.ratio : null;

  const broadMomentum = broad ? trailingReturn(broad, H.m3) : 0;

  const inflationImpulse: CommodityReport["inflationImpulse"] = broadMomentum > 3 ? "Rising" : broadMomentum < -3 ? "Falling" : "Neutral";
  const growthSignal: CommodityReport["growthSignal"] = copperGoldChange3m > 5 ? "Improving" : copperGoldChange3m < -5 ? "Deteriorating" : "Neutral";

  return {
    reads,
    copperGoldRatio,
    copperGoldChange3m,
    goldOilRatio,
    broadMomentum,
    inflationImpulse,
    growthSignal,
    cycle: cycleOf(growthSignal, inflationImpulse),
  };
}
