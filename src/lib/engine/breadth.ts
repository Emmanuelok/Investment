/**
 * Market-breadth / internals engine — the classic advance-decline toolkit that
 * measures participation *underneath* an index. From a basket of member close
 * series it computes, as a snapshot: the % of members above their 50- and
 * 200-day moving averages, today's advancers/decliners, and 52-week new
 * highs/lows; and, as a time series across the aligned basket: the cumulative
 * advance-decline line, the McClellan oscillator (EMA19−EMA39 of ratio-adjusted
 * net advances) and a Zweig breadth-thrust flag. These fold into a 0–100 breadth
 * score and a risk-on / neutral / risk-off regime. Pure & deterministic.
 */

import { sma, ema } from "./indicators";

export type Member = { symbol: string; closes: number[] };

export type MemberRead = {
  symbol: string;
  last: number;
  aboveSMA50: boolean;
  aboveSMA200: boolean;
  pctFrom52wHigh: number; // ≤0, distance below the 52-week high
  newHigh52w: boolean;
  newLow52w: boolean;
  ret1d: number; // percent
};

export type BreadthRegime = "Risk-on" | "Neutral" | "Risk-off";

export type BreadthReport = {
  members: number;
  pctAboveSMA50: number;
  pctAboveSMA200: number;
  advancers: number;
  decliners: number;
  unchanged: number;
  netAdvances: number;
  adLine: number[]; // cumulative net advances (recent tail)
  mcClellan: number;
  newHighs: number;
  newLows: number;
  highLowIndex: number; // 0..100, newHighs / (newHighs+newLows)
  thrust: boolean; // Zweig breadth thrust fired in the recent window
  breadthScore: number; // 0..100
  regime: BreadthRegime;
  reads: MemberRead[];
};

const lastNum = (a: number[]): number => {
  for (let i = a.length - 1; i >= 0; i--) if (Number.isFinite(a[i])) return a[i];
  return NaN;
};

export function memberRead(symbol: string, closes: number[]): MemberRead | null {
  const n = closes.length;
  if (n < 30) return null;
  const last = closes[n - 1];
  const prev = closes[n - 2];
  const s50 = lastNum(sma(closes, Math.min(50, n)));
  const s200 = lastNum(sma(closes, Math.min(200, n)));
  const win = closes.slice(-252);
  const hi = Math.max(...win);
  const lo = Math.min(...win);
  return {
    symbol,
    last,
    aboveSMA50: Number.isFinite(s50) ? last > s50 : false,
    aboveSMA200: Number.isFinite(s200) ? last > s200 : false,
    pctFrom52wHigh: hi > 0 ? (last / hi - 1) * 100 : 0,
    newHigh52w: last >= hi - 1e-9,
    newLow52w: last <= lo + 1e-9,
    ret1d: prev > 0 ? (last / prev - 1) * 100 : 0,
  };
}

export function computeBreadth(members: Member[], tail = 60): BreadthReport {
  const reads: MemberRead[] = [];
  for (const m of members) {
    const r = memberRead(m.symbol, m.closes);
    if (r) reads.push(r);
  }
  const n = reads.length;

  const pct = (p: (r: MemberRead) => boolean): number => (n ? (reads.filter(p).length / n) * 100 : 0);
  const pctAboveSMA50 = pct((r) => r.aboveSMA50);
  const pctAboveSMA200 = pct((r) => r.aboveSMA200);
  const advancers = reads.filter((r) => r.ret1d > 0).length;
  const decliners = reads.filter((r) => r.ret1d < 0).length;
  const unchanged = n - advancers - decliners;
  const newHighs = reads.filter((r) => r.newHigh52w).length;
  const newLows = reads.filter((r) => r.newLow52w).length;
  const highLowIndex = newHighs + newLows > 0 ? (newHighs / (newHighs + newLows)) * 100 : 50;

  // Aligned daily net-advance series across the basket.
  const minLen = members.length ? Math.min(...members.map((m) => m.closes.length)) : 0;
  const L = Math.max(0, Math.min(minLen - 1, 250));
  const recent = members.map((m) => m.closes.slice(-(L + 1)));
  const netSeries: number[] = [];
  const advRatioSeries: number[] = [];
  for (let t = 1; t <= L; t++) {
    let a = 0;
    let d = 0;
    for (const c of recent) {
      if (c.length <= t) continue;
      const r = c[t] - c[t - 1];
      if (r > 0) a++;
      else if (r < 0) d++;
    }
    netSeries.push(a - d);
    advRatioSeries.push(a + d > 0 ? a / (a + d) : 0.5);
  }

  let cum = 0;
  const adLineFull = netSeries.map((x) => (cum += x));
  const adLine = adLineFull.slice(-tail);

  // McClellan oscillator on ratio-adjusted net advances (−1000..+1000).
  const rana = advRatioSeries.map((ratio) => (2 * ratio - 1) * 1000);
  const e19 = lastNum(ema(rana, 19));
  const e39 = lastNum(ema(rana, 39));
  const mcClellan = Number.isFinite(e19) && Number.isFinite(e39) ? e19 - e39 : 0;

  // Zweig breadth thrust: 10-day EMA of the advance ratio crossing 0.40 → 0.615 within 10 sessions.
  const e10 = ema(advRatioSeries, 10);
  let thrust = false;
  for (let i = 0; i < e10.length && !thrust; i++) {
    if (Number.isFinite(e10[i]) && e10[i] <= 0.4) {
      for (let j = i + 1; j <= Math.min(i + 10, e10.length - 1); j++) {
        if (Number.isFinite(e10[j]) && e10[j] >= 0.615) {
          thrust = true;
          break;
        }
      }
    }
  }

  const breadthScore = Math.round(0.45 * pctAboveSMA200 + 0.3 * pctAboveSMA50 + 0.25 * highLowIndex);
  const regime: BreadthRegime = breadthScore >= 58 ? "Risk-on" : breadthScore <= 42 ? "Risk-off" : "Neutral";

  return {
    members: n,
    pctAboveSMA50,
    pctAboveSMA200,
    advancers,
    decliners,
    unchanged,
    netAdvances: advancers - decliners,
    adLine,
    mcClellan,
    newHighs,
    newLows,
    highLowIndex,
    thrust,
    breadthScore,
    regime,
    reads,
  };
}
