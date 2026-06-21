/**
 * Fixed-income yield / carry monitor — the income ladder. Ranks the fixed-income
 * spectrum (Treasuries by tenor → TIPS → investment-grade → high-yield → EM) by
 * absolute yield, shows where each sits in its own history (percentile: high =
 * cheap / more income), its recent change, and its spread pickup over the 10-year
 * Treasury. It also distils the two carry levers — term carry (30y−2y steepness)
 * and credit carry (HY−IG) — and an income-attractiveness regime. Pure FRED math.
 */

export type YieldSeries = {
  id: string;
  label: string;
  category: string; // Treasury | TIPS | IG | HY | EM
  series: number[]; // yield (%) history, oldest → newest
};

export type YieldRung = {
  id: string;
  label: string;
  category: string;
  latest: number; // current yield (%)
  percentile: number; // 0..100 within its own history (high = cheap / high income)
  changeBps: number; // recent change (bps)
  spreadOver10y: number; // bps over the 10-year Treasury
};

export type IncomeRegime = "Attractive carry" | "Fair" | "Expensive";

export type YieldMonitorReport = {
  rungs: YieldRung[]; // sorted by yield, highest first
  best: string | null;
  treasury10y: number | null;
  steepness2s30s: number; // 30y − 2y (pp)
  creditPickupHyIg: number; // HY − IG (pp)
  avgPercentile: number;
  incomeRegime: IncomeRegime;
};

const CHG_LAG = 20;
const mean = (a: number[]): number => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);

export function percentileOf(series: number[], value: number): number {
  if (!series.length) return 50;
  let below = 0;
  for (const x of series) if (x <= value) below++;
  return (below / series.length) * 100;
}

export function buildYieldMonitor(inputs: YieldSeries[]): YieldMonitorReport {
  const valid = inputs.filter((s) => s.series.some((x) => Number.isFinite(x)));
  const latestOf = (id: string): number | null => {
    const s = valid.find((v) => v.id === id);
    if (!s) return null;
    const f = s.series.filter((x) => Number.isFinite(x));
    return f.length ? f[f.length - 1] : null;
  };

  const treasury10y = latestOf("DGS10");

  const rungs: YieldRung[] = valid
    .map((s) => {
      const f = s.series.filter((x) => Number.isFinite(x));
      const n = f.length;
      const latest = n ? f[n - 1] : 0;
      const past = n ? f[Math.max(0, n - 1 - CHG_LAG)] : latest;
      return {
        id: s.id,
        label: s.label,
        category: s.category,
        latest,
        percentile: percentileOf(f, latest),
        changeBps: (latest - past) * 100,
        spreadOver10y: treasury10y !== null ? (latest - treasury10y) * 100 : 0,
      };
    })
    .sort((a, b) => b.latest - a.latest);

  const dgs2 = latestOf("DGS2");
  const dgs30 = latestOf("DGS30");
  const ig = latestOf("BAMLC0A0CMEY");
  const hy = latestOf("BAMLH0A0HYM2EY");

  const steepness2s30s = dgs2 !== null && dgs30 !== null ? dgs30 - dgs2 : 0;
  const creditPickupHyIg = ig !== null && hy !== null ? hy - ig : 0;
  const avgPercentile = rungs.length ? mean(rungs.map((r) => r.percentile)) : 50;
  const incomeRegime: IncomeRegime = avgPercentile > 60 ? "Attractive carry" : avgPercentile < 40 ? "Expensive" : "Fair";

  return {
    rungs,
    best: rungs.length ? rungs[0].label : null,
    treasury10y,
    steepness2s30s,
    creditPickupHyIg,
    avgPercentile,
    incomeRegime,
  };
}
