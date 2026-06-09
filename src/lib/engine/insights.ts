/**
 * Insight engine — converts computed analytics into ranked, evidence-backed
 * statements. Every figure in `evidence` is calculated from the input series.
 */
import type { Candle } from "@/lib/rng";
import { rsi, macd, bollinger, atr, realizedVol, percentileRank, swingLevels, streak, sma, maxDrawdown } from "./indicators";
import { classifyRegime, type Regime } from "./regime";

export type Insight = {
  id: string;
  tone: "pos" | "neg" | "warn" | "info";
  title: string;
  detail: string;
  evidence: string[];
  score: number; // signed importance, sort by |score|
};

const f = (n: number, d = 2) => (Number.isFinite(n) ? n.toFixed(d) : "—");

export function deriveInsights(sym: string, candles: Candle[]): { insights: Insight[]; regime: Regime } {
  const closes = candles.map((c) => c.c);
  const n = closes.length;
  const last = closes[n - 1];
  const regime = classifyRegime(candles);
  const out: Insight[] = [];

  // RSI extremes
  const r14 = regime.rsi14;
  if (r14 >= 70) out.push({ id: "rsi-ob", tone: "warn", title: `${sym} overbought`, detail: "RSI-14 in the overbought zone — extended moves often pause or mean-revert.", evidence: [`RSI-14 ${f(r14, 1)} (≥70)`], score: -55 - (r14 - 70) });
  else if (r14 <= 30) out.push({ id: "rsi-os", tone: "pos", title: `${sym} oversold`, detail: "RSI-14 in the oversold zone — selling pressure is statistically stretched.", evidence: [`RSI-14 ${f(r14, 1)} (≤30)`], score: 55 + (30 - r14) });

  // MACD cross within last 3 bars
  const m = macd(closes);
  for (let k = 1; k <= 3; k++) {
    const i = n - k, j = i - 1;
    if (j < 0 || !Number.isFinite(m.hist[i]) || !Number.isFinite(m.hist[j])) break;
    if (m.hist[j] <= 0 && m.hist[i] > 0) { out.push({ id: "macd-x-up", tone: "pos", title: "MACD bullish cross", detail: `MACD line crossed above its signal ${k === 1 ? "on the latest bar" : `${k} bars ago`}.`, evidence: [`MACD ${f(m.macd[i], 3)} > signal ${f(m.signal[i], 3)}`], score: 48 }); break; }
    if (m.hist[j] >= 0 && m.hist[i] < 0) { out.push({ id: "macd-x-dn", tone: "neg", title: "MACD bearish cross", detail: `MACD line crossed below its signal ${k === 1 ? "on the latest bar" : `${k} bars ago`}.`, evidence: [`MACD ${f(m.macd[i], 3)} < signal ${f(m.signal[i], 3)}`], score: -48 }); break; }
  }

  // Bollinger position
  const bb = bollinger(closes);
  if (Number.isFinite(bb.upper[n - 1])) {
    const width = bb.upper[n - 1] - bb.lower[n - 1];
    const pos = width > 0 ? (last - bb.lower[n - 1]) / width : 0.5;
    if (last > bb.upper[n - 1]) out.push({ id: "bb-up", tone: "warn", title: "Above upper Bollinger band", detail: "Close beyond +2σ of the 20-day mean — statistically stretched.", evidence: [`close ${f(last)} > upper ${f(bb.upper[n - 1])}`], score: -40 });
    else if (last < bb.lower[n - 1]) out.push({ id: "bb-dn", tone: "pos", title: "Below lower Bollinger band", detail: "Close beyond −2σ of the 20-day mean — capitulation territory.", evidence: [`close ${f(last)} < lower ${f(bb.lower[n - 1])}`], score: 40 });
    else if (pos > 0.85 || pos < 0.15) out.push({ id: "bb-edge", tone: "info", title: `Pressing the ${pos > 0.5 ? "upper" : "lower"} band`, detail: "Price is riding the edge of its 2σ envelope.", evidence: [`band position ${f(pos * 100, 0)}%`], score: pos > 0.5 ? 18 : -18 });
  }

  // Volatility spike: ATR vs its 60-bar history
  const a = atr(candles);
  const aLast = a[n - 1];
  if (Number.isFinite(aLast)) {
    const pct = percentileRank(a.slice(-60), aLast);
    if (pct >= 90) out.push({ id: "atr-spike", tone: "warn", title: "Volatility expansion", detail: "True range is in the top decile of the last 60 sessions — size positions accordingly.", evidence: [`ATR-14 ${f(aLast)} · ${f(pct, 0)}th pct (60d)`], score: -30 });
  }

  // 52w (window) high/low proximity
  const hi = Math.max(...closes), lo = Math.min(...closes);
  if (last >= hi * 0.995) out.push({ id: "near-hi", tone: "pos", title: "At period highs", detail: "Trading within 0.5% of the highest close in the loaded window.", evidence: [`close ${f(last)} vs high ${f(hi)}`], score: 35 });
  else if (last <= lo * 1.005) out.push({ id: "near-lo", tone: "neg", title: "At period lows", detail: "Trading within 0.5% of the lowest close in the loaded window.", evidence: [`close ${f(last)} vs low ${f(lo)}`], score: -35 });

  // streaks
  const st = streak(closes);
  if (Math.abs(st) >= 4) out.push({ id: "streak", tone: st > 0 ? "pos" : "neg", title: `${Math.abs(st)}-day ${st > 0 ? "winning" : "losing"} streak`, detail: "Long streaks raise the odds of a pause; momentum is one-sided.", evidence: [`${Math.abs(st)} consecutive ${st > 0 ? "up" : "down"} closes`], score: st > 0 ? 22 : -22 });

  // SMA structure
  const s20 = sma(closes, 20), s50 = sma(closes, 50);
  if (Number.isFinite(s50[n - 1])) {
    const above = last > s20[n - 1] && s20[n - 1] > s50[n - 1];
    const below = last < s20[n - 1] && s20[n - 1] < s50[n - 1];
    if (above) out.push({ id: "stack-up", tone: "pos", title: "Bullish moving-average stack", detail: "Price > SMA-20 > SMA-50 — textbook uptrend structure.", evidence: [`${f(last)} > ${f(s20[n - 1])} > ${f(s50[n - 1])}`], score: 30 });
    if (below) out.push({ id: "stack-dn", tone: "neg", title: "Bearish moving-average stack", detail: "Price < SMA-20 < SMA-50 — textbook downtrend structure.", evidence: [`${f(last)} < ${f(s20[n - 1])} < ${f(s50[n - 1])}`], score: -30 });
  }

  // drawdown depth
  const dd = maxDrawdown(closes);
  if (dd <= -15) out.push({ id: "dd", tone: "warn", title: `Deep drawdown ${f(dd, 1)}%`, detail: "Max peak-to-trough decline in the window exceeds 15%.", evidence: [`max drawdown ${f(dd, 1)}%`], score: -26 });

  // realized vol context
  const rv = realizedVol(closes);
  if (Number.isFinite(rv[n - 1])) out.push({ id: "rv", tone: "info", title: `Realized vol ${f(rv[n - 1], 1)}%`, detail: `20-day annualized volatility sits in the ${regime.volRegime.toLowerCase()} regime (${regime.volPercentile}th percentile of the window).`, evidence: [`σ₂₀ ${f(rv[n - 1], 1)}% · ${regime.volPercentile}th pct`], score: 10 });

  // levels
  const lv = swingLevels(candles);
  out.push({ id: "levels", tone: "info", title: "Key levels", detail: "Nearest swing support and resistance from pivot structure.", evidence: [`support ${f(lv.support)} · resistance ${f(lv.resistance)} · close ${f(last)}`], score: 8 });

  out.sort((x, y) => Math.abs(y.score) - Math.abs(x.score));
  return { insights: out, regime };
}

/** One-paragraph computed read — every number comes from the series. */
export function composeRead(sym: string, candles: Candle[]): string {
  const { regime } = deriveInsights(sym, candles);
  const closes = candles.map((c) => c.c);
  const last = closes[closes.length - 1];
  const chg5 = closes.length > 5 ? (last / closes[closes.length - 6] - 1) * 100 : 0;
  return `${sym}: ${regime.trend.toLowerCase()} (strength ${regime.trendStrength}/100, confidence ${regime.confidence}%), momentum ${regime.momentum.toLowerCase()}, RSI-14 ${regime.rsi14.toFixed(1)}, ${regime.volRegime.toLowerCase()} vol regime (σ₂₀ ${regime.realizedVol20.toFixed(1)}%, ${regime.volPercentile}th pct). 5-day move ${chg5 >= 0 ? "+" : ""}${chg5.toFixed(2)}%.`;
}
