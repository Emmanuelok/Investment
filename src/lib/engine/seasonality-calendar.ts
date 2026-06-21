/**
 * Multi-asset seasonality calendar. From dated close history it derives each
 * asset's month-of-year return profile — the average return and win rate for
 * every calendar month across all the years of data — then surfaces the current
 * month's seasonal edge and which assets have a seasonal tailwind vs headwind
 * right now. Calendar effects are weak but real and tradeable at the margin.
 * Pure & deterministic.
 */

export type DatedBar = { t: number; c: number }; // unix seconds + close

export type MonthStat = {
  month: number; // 1..12
  avgReturn: number; // % average month-over-month return
  winRate: number; // % of years positive
  count: number;
};

export type AssetSeasonality = {
  id: string;
  label: string;
  months: MonthStat[]; // up to 12 entries
  currentMonth: number;
  currentMonthEdge: number; // avg return for the current month (%)
  currentMonthWinRate: number;
  bestMonth: number;
  worstMonth: number;
  sampleYears: number;
};

export type SeasonalityCalendarReport = {
  assets: AssetSeasonality[];
  currentMonth: number;
  tailwinds: string[]; // assets with a positive current-month edge
  headwinds: string[]; // assets with a negative current-month edge
};

const mean = (a: number[]): number => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);

/** Month-over-month returns labelled by calendar month, from month-end closes. */
export function monthlyReturns(bars: DatedBar[]): { month: number; ret: number }[] {
  const sorted = [...bars].filter((b) => b.c > 0).sort((a, b) => a.t - b.t);
  const ends = new Map<string, { month: number; close: number; order: number }>();
  let order = 0;
  for (const b of sorted) {
    const d = new Date(b.t * 1000);
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
    ends.set(key, { month: d.getUTCMonth() + 1, close: b.c, order: order++ });
  }
  const arr = [...ends.values()].sort((a, b) => a.order - b.order);
  const out: { month: number; ret: number }[] = [];
  for (let i = 1; i < arr.length; i++) out.push({ month: arr[i].month, ret: (arr[i].close / arr[i - 1].close - 1) * 100 });
  return out;
}

export function computeMonthlySeasonality(bars: DatedBar[]): MonthStat[] {
  const rets = monthlyReturns(bars);
  const stats: MonthStat[] = [];
  for (let m = 1; m <= 12; m++) {
    const r = rets.filter((x) => x.month === m).map((x) => x.ret);
    if (!r.length) continue;
    stats.push({ month: m, avgReturn: mean(r), winRate: (r.filter((x) => x > 0).length / r.length) * 100, count: r.length });
  }
  return stats;
}

function assetSeasonality(id: string, label: string, bars: DatedBar[], currentMonth: number): AssetSeasonality | null {
  const months = computeMonthlySeasonality(bars);
  if (months.length < 6) return null;
  const cur = months.find((m) => m.month === currentMonth);
  const best = months.reduce((a, b) => (b.avgReturn > a.avgReturn ? b : a));
  const worst = months.reduce((a, b) => (b.avgReturn < a.avgReturn ? b : a));
  const sampleYears = Math.max(...months.map((m) => m.count));
  return {
    id,
    label,
    months,
    currentMonth,
    currentMonthEdge: cur ? cur.avgReturn : 0,
    currentMonthWinRate: cur ? cur.winRate : 0,
    bestMonth: best.month,
    worstMonth: worst.month,
    sampleYears,
  };
}

export function buildSeasonalityCalendar(
  inputs: { id: string; label: string; bars: DatedBar[] }[],
  currentMonth: number,
): SeasonalityCalendarReport {
  const assets: AssetSeasonality[] = [];
  for (const a of inputs) {
    const s = assetSeasonality(a.id, a.label, a.bars, currentMonth);
    if (s) assets.push(s);
  }
  assets.sort((a, b) => b.currentMonthEdge - a.currentMonthEdge);
  return {
    assets,
    currentMonth,
    tailwinds: assets.filter((a) => a.currentMonthEdge > 0).map((a) => a.label),
    headwinds: assets.filter((a) => a.currentMonthEdge < 0).map((a) => a.label),
  };
}
