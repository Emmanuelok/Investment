/**
 * Seasonality engine — monthly and day-of-week return patterns computed from a
 * dated daily close series. All averages are real, with sample counts attached.
 */
export type DatedBar = { t: number; c: number }; // t in seconds (UTC)

export type MonthStat = { month: number; avgRet: number; posRate: number; count: number };
export type DowStat = { dow: number; avgRet: number; posRate: number; count: number };

export type Seasonality = {
  monthly: MonthStat[]; // 12 entries, Jan..Dec; avgRet in %
  dayOfWeek: DowStat[]; // Mon..Fri; avgRet in %
  bestMonth: MonthStat;
  worstMonth: MonthStat;
  positiveMonthRate: number; // % of all months that were up
  years: number;
  currentMonth: MonthStat;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const monthName = (m: number) => MONTHS[m] ?? "—";

export function computeSeasonality(bars: DatedBar[]): Seasonality {
  // month-end closes → monthly returns tagged by the ending month
  const monthEnds: { y: number; m: number; c: number }[] = [];
  for (let i = 0; i < bars.length; i++) {
    const d = new Date(bars[i].t * 1000);
    const y = d.getUTCFullYear(), m = d.getUTCMonth();
    const prev = monthEnds[monthEnds.length - 1];
    if (!prev || prev.y !== y || prev.m !== m) monthEnds.push({ y, m, c: bars[i].c });
    else prev.c = bars[i].c; // keep latest close in the month
  }
  const monthlyRets: { m: number; r: number }[] = [];
  for (let i = 1; i < monthEnds.length; i++) monthlyRets.push({ m: monthEnds[i].m, r: monthEnds[i].c / monthEnds[i - 1].c - 1 });

  const monthly: MonthStat[] = MONTHS.map((_, m) => {
    const xs = monthlyRets.filter((x) => x.m === m).map((x) => x.r);
    const avg = xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
    const pos = xs.length ? xs.filter((r) => r > 0).length / xs.length : 0;
    return { month: m, avgRet: avg * 100, posRate: pos * 100, count: xs.length };
  });

  // day-of-week from daily returns
  const dowAgg: { sum: number; pos: number; n: number }[] = Array.from({ length: 7 }, () => ({ sum: 0, pos: 0, n: 0 }));
  for (let i = 1; i < bars.length; i++) {
    const r = bars[i].c / bars[i - 1].c - 1;
    const dow = new Date(bars[i].t * 1000).getUTCDay();
    dowAgg[dow].sum += r; dowAgg[dow].n++; if (r > 0) dowAgg[dow].pos++;
  }
  const dayOfWeek: DowStat[] = [1, 2, 3, 4, 5].map((dow) => ({
    dow,
    avgRet: dowAgg[dow].n ? (dowAgg[dow].sum / dowAgg[dow].n) * 100 : 0,
    posRate: dowAgg[dow].n ? (dowAgg[dow].pos / dowAgg[dow].n) * 100 : 0,
    count: dowAgg[dow].n,
  }));

  const withData = monthly.filter((m) => m.count > 0);
  const bestMonth = withData.reduce((a, b) => (b.avgRet > a.avgRet ? b : a), withData[0] ?? monthly[0]);
  const worstMonth = withData.reduce((a, b) => (b.avgRet < a.avgRet ? b : a), withData[0] ?? monthly[0]);
  const positiveMonthRate = monthlyRets.length ? (monthlyRets.filter((x) => x.r > 0).length / monthlyRets.length) * 100 : 0;
  const years = monthlyRets.length / 12;
  const currentMonth = monthly[new Date().getUTCMonth()];

  return { monthly, dayOfWeek, bestMonth, worstMonth, positiveMonthRate, years, currentMonth };
}
