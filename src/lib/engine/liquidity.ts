/**
 * Liquidity / microstructure engine. Three complementary reads on how cheaply a
 * name can be traded, from daily price + volume:
 *
 *   • Dollar volume        — the first-order liquidity measure (price × shares).
 *   • Amihud illiquidity   — |return| per dollar traded: the price impact of
 *                            flow (Amihud 2002). Higher ⇒ more illiquid.
 *   • Roll implied spread  — the effective bid-ask spread inferred from the
 *                            negative serial covariance of returns (Roll 1984):
 *                            s = 2·√(−Cov(r_t, r_{t−1})).
 *
 * Blended into a 0–100 liquidity score + grade. Pure math over a bar series.
 */

export type VBar = { c: number; v: number };

const mean = (a: number[]): number => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const clamp = (x: number, lo: number, hi: number): number => (x < lo ? lo : x > hi ? hi : x);

/** Average daily dollar volume (close × volume) over the bars. */
export function dollarVolume(bars: VBar[]): number {
  const dv = bars.filter((b) => b.c > 0 && b.v > 0).map((b) => b.c * b.v);
  return mean(dv);
}

/**
 * Amihud illiquidity = mean(|r_t| / dollarVolume_t). Returned raw and scaled to
 * "price impact per $1M traded" (×1e6) for human readability.
 */
export function amihudIlliquidity(bars: VBar[]): { raw: number; perMillion: number } {
  const vals: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    const p0 = bars[i - 1].c;
    const p1 = bars[i].c;
    const dvol = bars[i].c * bars[i].v;
    if (p0 > 0 && p1 > 0 && dvol > 0) vals.push(Math.abs(Math.log(p1 / p0)) / dvol);
  }
  const raw = mean(vals);
  return { raw, perMillion: raw * 1e6 };
}

/** Lag-1 autocovariance of a series (sample, mean-centered). */
function autocov1(x: number[]): number {
  const n = x.length;
  if (n < 3) return 0;
  const m = mean(x);
  let s = 0;
  for (let i = 1; i < n; i++) s += (x[i] - m) * (x[i - 1] - m);
  return s / (n - 1);
}

/**
 * Roll (1984) effective spread from the serial covariance of returns. Defined
 * only when that covariance is negative; otherwise the model is degenerate and
 * the spread is reported as 0. Returns the spread as a fraction and in bps.
 */
export function rollSpread(closes: number[]): { fraction: number; bps: number } {
  const r: number[] = [];
  for (let i = 1; i < closes.length; i++) if (closes[i - 1] > 0 && closes[i] > 0) r.push(Math.log(closes[i] / closes[i - 1]));
  const cov = autocov1(r);
  // Only a meaningfully negative covariance implies a spread; denoise FP residuals.
  const fraction = cov < -1e-12 ? 2 * Math.sqrt(-cov) : 0;
  return { fraction, bps: fraction * 1e4 };
}

export type LiquidityGrade = "Very liquid" | "Liquid" | "Moderate" | "Thin";

export type LiquidityReport = {
  avgDollarVolume: number;
  amihud: number; // illiquidity per $1M
  rollSpreadBps: number;
  volumeTrend: number; // recent vs baseline volume, as a ratio − 1
  liquidityScore: number; // 0..100, higher = more liquid
  grade: LiquidityGrade;
  bars: number;
};

export function analyzeLiquidity(bars: VBar[], recentWindow = 20): LiquidityReport {
  const valid = bars.filter((b) => b.c > 0 && b.v > 0);
  const avgDollarVolume = dollarVolume(valid);
  const amihud = amihudIlliquidity(valid).perMillion;
  const rollSpreadBps = rollSpread(valid.map((b) => b.c)).bps;

  // Recent vs baseline volume.
  const vols = valid.map((b) => b.v);
  const recent = mean(vols.slice(-recentWindow));
  const baseline = mean(vols.slice(0, Math.max(1, vols.length - recentWindow)));
  const volumeTrend = baseline > 0 ? recent / baseline - 1 : 0;

  // Score: dominated by dollar volume (objective), penalized by a wide spread.
  const dvScore = avgDollarVolume > 0 ? clamp((Math.log10(avgDollarVolume) - 5) / 4.5, 0, 1) * 100 : 0; // $100k→0, ~$3.5B→100
  const spreadPenalty = clamp(rollSpreadBps / 50, 0, 1) * 25; // up to −25 for a ≥50bp implied spread
  const liquidityScore = Math.round(clamp(dvScore - spreadPenalty, 0, 100));

  const grade: LiquidityGrade = liquidityScore >= 75 ? "Very liquid" : liquidityScore >= 50 ? "Liquid" : liquidityScore >= 25 ? "Moderate" : "Thin";

  return { avgDollarVolume, amihud, rollSpreadBps, volumeTrend, liquidityScore, grade, bars: valid.length };
}
