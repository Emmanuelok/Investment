/**
 * Volatility-estimators lab. Close-to-close throws away the intraday path; these
 * range-based estimators use the full OHLC bar and are far more efficient:
 *
 *   • Parkinson      — high-low range only (≈5× efficiency of close-to-close)
 *   • Garman-Klass   — OHLC, assumes zero drift
 *   • Rogers-Satchell— OHLC, drift-independent (handles trending markets)
 *   • Yang-Zhang     — overnight + open-close + Rogers-Satchell, minimum-variance
 *                      and drift-independent (the most efficient of the set)
 *
 * Plus a volatility cone: realized vol across several look-back windows with the
 * historical min/quartile/median/max envelope, and where the latest reading sits
 * in its own percentile — a realized-vol analogue of IV rank. All annualized.
 * Pure math over a bar series; runs identically in the sandbox and on deploy.
 */

export type OHLC = { o: number; h: number; l: number; c: number };

const LN2 = Math.LN2;
const sq = (x: number): number => x * x;
const mean = (a: number[]): number => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);

/** Annualize a daily variance into a volatility (σ × √periods). */
const annVol = (dailyVar: number, periods: number): number => (dailyVar > 0 ? Math.sqrt(dailyVar * periods) : 0);

/** Classic close-to-close annualized volatility (sample stdev of log returns). */
export function closeToCloseVol(closes: number[], periods = 252): number {
  if (closes.length < 3) return 0;
  const r: number[] = [];
  for (let i = 1; i < closes.length; i++) if (closes[i - 1] > 0 && closes[i] > 0) r.push(Math.log(closes[i] / closes[i - 1]));
  if (r.length < 2) return 0;
  const m = mean(r);
  const v = r.reduce((s, x) => s + sq(x - m), 0) / (r.length - 1);
  return annVol(v, periods);
}

/** Parkinson (1980): uses the high-low range. */
export function parkinsonVol(bars: OHLC[], periods = 252): number {
  const valid = bars.filter((b) => b.h > 0 && b.l > 0);
  if (!valid.length) return 0;
  const v = mean(valid.map((b) => sq(Math.log(b.h / b.l)))) / (4 * LN2);
  return annVol(v, periods);
}

/** Garman-Klass (1980): OHLC, assumes no drift. */
export function garmanKlassVol(bars: OHLC[], periods = 252): number {
  const valid = bars.filter((b) => b.h > 0 && b.l > 0 && b.o > 0 && b.c > 0);
  if (!valid.length) return 0;
  const v = mean(valid.map((b) => 0.5 * sq(Math.log(b.h / b.l)) - (2 * LN2 - 1) * sq(Math.log(b.c / b.o))));
  return annVol(v, periods);
}

/** Rogers-Satchell (1991): OHLC, independent of drift. */
export function rogersSatchellVol(bars: OHLC[], periods = 252): number {
  const valid = bars.filter((b) => b.h > 0 && b.l > 0 && b.o > 0 && b.c > 0);
  if (!valid.length) return 0;
  const v = mean(valid.map((b) => {
    const hc = Math.log(b.h / b.c);
    const ho = Math.log(b.h / b.o);
    const lc = Math.log(b.l / b.c);
    const lo = Math.log(b.l / b.o);
    return hc * ho + lc * lo;
  }));
  return annVol(v, periods);
}

/** Yang-Zhang (2000): overnight + open-close + Rogers-Satchell; minimum variance. */
export function yangZhangVol(bars: OHLC[], periods = 252): number {
  const valid = bars.filter((b) => b.h > 0 && b.l > 0 && b.o > 0 && b.c > 0);
  const n = valid.length;
  if (n < 3) return 0;
  const overnight: number[] = []; // ln(O_t / C_{t-1})
  const openClose: number[] = []; // ln(C_t / O_t)
  for (let i = 1; i < n; i++) {
    overnight.push(Math.log(valid[i].o / valid[i - 1].c));
    openClose.push(Math.log(valid[i].c / valid[i].o));
  }
  const variance = (a: number[]): number => {
    const m = mean(a);
    return a.length > 1 ? a.reduce((s, x) => s + sq(x - m), 0) / (a.length - 1) : 0;
  };
  const sigO2 = variance(overnight);
  const sigC2 = variance(openClose);
  // Rogers-Satchell daily variance over the same (drift-free) bars.
  const rs = valid.slice(1).map((b) => Math.log(b.h / b.c) * Math.log(b.h / b.o) + Math.log(b.l / b.c) * Math.log(b.l / b.o));
  const sigRS2 = mean(rs);
  const m = overnight.length;
  const k = 0.34 / (1.34 + (m + 1) / (m - 1));
  const v = sigO2 + k * sigC2 + (1 - k) * sigRS2;
  return annVol(v, periods);
}

export type VolConePoint = {
  window: number;
  current: number;
  min: number;
  p25: number;
  median: number;
  p75: number;
  max: number;
  percentile: number; // where `current` sits within the historical distribution (0..100)
};

const quantile = (sorted: number[], q: number): number => {
  if (!sorted.length) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
};

/**
 * Volatility cone: for each look-back window, the rolling close-to-close vol
 * distribution across history, the latest value, and its percentile rank.
 */
export function volatilityCone(closes: number[], windows: number[]): VolConePoint[] {
  const logret: number[] = [];
  for (let i = 1; i < closes.length; i++) if (closes[i - 1] > 0 && closes[i] > 0) logret.push(Math.log(closes[i] / closes[i - 1]));
  const out: VolConePoint[] = [];
  for (const w of windows) {
    if (logret.length < w + 1) continue;
    const vols: number[] = [];
    for (let end = w; end <= logret.length; end++) {
      const seg = logret.slice(end - w, end);
      const m = mean(seg);
      const v = seg.reduce((s, x) => s + sq(x - m), 0) / (seg.length - 1);
      vols.push(Math.sqrt(v * 252));
    }
    if (vols.length < 2) continue;
    const sorted = [...vols].sort((a, b) => a - b);
    const current = vols[vols.length - 1];
    const below = sorted.filter((x) => x <= current).length;
    out.push({
      window: w,
      current,
      min: sorted[0],
      p25: quantile(sorted, 0.25),
      median: quantile(sorted, 0.5),
      p75: quantile(sorted, 0.75),
      max: sorted[sorted.length - 1],
      percentile: (below / sorted.length) * 100,
    });
  }
  return out;
}

export type VolReport = {
  closeToClose: number;
  parkinson: number;
  garmanKlass: number;
  rogersSatchell: number;
  yangZhang: number;
  cone: VolConePoint[];
  current: number; // headline = Yang-Zhang on the recent window
  percentile: number; // percentile of the shortest-window cone (regime read)
  bars: number;
};

const CONE_WINDOWS = [10, 20, 30, 60, 120, 250];

export function analyzeVolatility(bars: OHLC[], recentWindow = 30): VolReport {
  const closes = bars.map((b) => b.c);
  const recent = bars.slice(-recentWindow - 1);
  const cone = volatilityCone(closes, CONE_WINDOWS);
  const shortest = cone[0];
  return {
    closeToClose: closeToCloseVol(closes.slice(-recentWindow - 1)),
    parkinson: parkinsonVol(recent),
    garmanKlass: garmanKlassVol(recent),
    rogersSatchell: rogersSatchellVol(recent),
    yangZhang: yangZhangVol(recent),
    cone,
    current: yangZhangVol(recent),
    percentile: shortest ? shortest.percentile : 0,
    bars: bars.length,
  };
}
