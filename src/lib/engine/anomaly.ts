/**
 * Anomaly-detection engine — flags statistically unusual bars: volume spikes,
 * return shocks, opening gaps, volatility-regime expansion and range blow-outs.
 * Severity is a 0..100 read derived from how extreme the z-score / ratio is.
 */
import type { Candle } from "@/lib/rng";
import { realizedVol, atr, percentileRank } from "./indicators";

export type Anomaly = {
  type: "VOLUME_SPIKE" | "RETURN_SHOCK" | "GAP" | "VOL_EXPANSION" | "RANGE_BLOWOUT";
  tone: "pos" | "neg" | "warn";
  severity: number; // 0..100
  detail: string;
  value: number;
  barsAgo: number;
};

function zStats(arr: number[]): { mean: number; std: number } {
  const fin = arr.filter(Number.isFinite);
  if (!fin.length) return { mean: 0, std: 1 };
  const mean = fin.reduce((a, b) => a + b, 0) / fin.length;
  const std = Math.sqrt(fin.reduce((a, b) => a + (b - mean) ** 2, 0) / fin.length) || 1e-9;
  return { mean, std };
}
const sevFromZ = (z: number, lo = 2, hi = 5) => Math.max(0, Math.min(100, Math.round(((Math.abs(z) - lo) / (hi - lo)) * 100)));

export function detectAnomalies(candles: Candle[], lookback = 3): Anomaly[] {
  const out: Anomaly[] = [];
  const n = candles.length;
  if (n < 30) return out;
  const closes = candles.map((c) => c.c);
  const rets = closes.map((c, i) => (i ? c / closes[i - 1] - 1 : 0));

  for (let k = 0; k < lookback && n - 1 - k >= 21; k++) {
    const i = n - 1 - k;
    const c = candles[i], prev = candles[i - 1];

    // volume spike vs trailing 60
    const volHist = candles.slice(Math.max(0, i - 60), i).map((x) => x.v).filter((v) => v > 0);
    if (volHist.length > 10) {
      const { mean, std } = zStats(volHist);
      const z = (c.v - mean) / std;
      if (z > 2.5 && c.v > 0) out.push({ type: "VOLUME_SPIKE", tone: c.c >= c.o ? "pos" : "neg", severity: sevFromZ(z, 2.5, 6), detail: `Volume ${(c.v / mean).toFixed(1)}× the 60-bar average (${z.toFixed(1)}σ)`, value: z, barsAgo: k });
    }

    // return shock vs trailing 60
    const retHist = rets.slice(Math.max(1, i - 60), i);
    const { mean: rm, std: rs } = zStats(retHist);
    const rz = (rets[i] - rm) / rs;
    if (Math.abs(rz) > 3) out.push({ type: "RETURN_SHOCK", tone: rets[i] >= 0 ? "pos" : "neg", severity: sevFromZ(rz, 3, 7), detail: `${(rets[i] * 100).toFixed(2)}% move — ${rz.toFixed(1)}σ vs recent distribution`, value: rz, barsAgo: k });

    // opening gap
    const gap = (c.o - prev.c) / prev.c;
    if (Math.abs(gap) > 0.02) out.push({ type: "GAP", tone: gap > 0 ? "pos" : "neg", severity: Math.min(100, Math.round((Math.abs(gap) / 0.08) * 100)), detail: `Opened ${(gap * 100).toFixed(2)}% ${gap > 0 ? "above" : "below"} prior close`, value: gap * 100, barsAgo: k });
  }

  // volatility-regime expansion (current 5d realized vs prior 20d)
  const rv5 = realizedVol(closes, 5)[n - 1];
  const rv20 = realizedVol(closes, 20)[n - 6];
  if (Number.isFinite(rv5) && Number.isFinite(rv20) && rv20 > 0 && rv5 / rv20 > 1.8) {
    out.push({ type: "VOL_EXPANSION", tone: "warn", severity: Math.min(100, Math.round(((rv5 / rv20 - 1.8) / 1.7) * 100)), detail: `5-day realized vol ${(rv5 / rv20).toFixed(1)}× the prior 20-day baseline`, value: rv5 / rv20, barsAgo: 0 });
  }

  // range blow-out (ATR percentile)
  const a = atr(candles);
  const aLast = a[n - 1];
  if (Number.isFinite(aLast)) {
    const pct = percentileRank(a.slice(-60), aLast);
    if (pct >= 95) out.push({ type: "RANGE_BLOWOUT", tone: "warn", severity: Math.round(pct), detail: `True range in the ${pct.toFixed(0)}th percentile of the last 60 bars`, value: pct, barsAgo: 0 });
  }

  return out.sort((x, y) => y.severity - x.severity);
}
