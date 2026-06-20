/**
 * Trend-template engine — Mark Minervini's 8-point Stage-2 uptrend template.
 * Each criterion is evaluated where data exists; criteria lacking history are
 * reported as null (not failed), so it degrades gracefully on short series.
 */
import type { Candle } from "@/lib/rng";
import { sma } from "./indicators";

export type TTCriterion = { name: string; pass: boolean | null; detail: string };
export type TrendTemplate = { pass: number; max: number; pct: number; passed: boolean; criteria: TTCriterion[] };

const f = (v: number) => Number.isFinite(v);
const pctStr = (a: number, b: number) => `${((a / b - 1) * 100).toFixed(0)}%`;

export function trendTemplate(candles: Candle[], rsRating?: number): TrendTemplate {
  const closes = candles.map((c) => c.c);
  const n = closes.length;
  const last = closes[n - 1];
  const s50 = sma(closes, 50), s150 = sma(closes, 150), s200 = sma(closes, 200);
  const a50 = s50[n - 1], a150 = s150[n - 1], a200 = s200[n - 1];
  const a200ago = s200[n - 23] ?? NaN; // 200-day SMA ~1 month ago
  const win = closes.slice(-252);
  const hi52 = win.length ? Math.max(...win) : last;
  const lo52 = win.length ? Math.min(...win) : last;

  const criteria: TTCriterion[] = [
    { name: "Price above 150d & 200d MA", pass: f(a150) && f(a200) ? last > a150 && last > a200 : null, detail: f(a200) ? `px ${last.toFixed(2)} vs 200d ${a200.toFixed(2)}` : "n/a" },
    { name: "150d MA above 200d MA", pass: f(a150) && f(a200) ? a150 > a200 : null, detail: f(a150) && f(a200) ? `${a150.toFixed(2)} vs ${a200.toFixed(2)}` : "n/a" },
    { name: "200d MA trending up (1m)", pass: f(a200) && f(a200ago) ? a200 > a200ago : null, detail: f(a200) && f(a200ago) ? `${pctStr(a200, a200ago)} over 1m` : "n/a" },
    { name: "50d MA above 150d & 200d MA", pass: f(a50) && f(a150) && f(a200) ? a50 > a150 && a50 > a200 : null, detail: f(a50) ? `50d ${a50.toFixed(2)}` : "n/a" },
    { name: "Price above 50d MA", pass: f(a50) ? last > a50 : null, detail: f(a50) ? `px ${last.toFixed(2)} vs 50d ${a50.toFixed(2)}` : "n/a" },
    { name: "≥30% above 52-week low", pass: lo52 > 0 ? last >= lo52 * 1.3 : null, detail: lo52 > 0 ? `${pctStr(last, lo52)} above low` : "n/a" },
    { name: "Within 25% of 52-week high", pass: hi52 > 0 ? last >= hi52 * 0.75 : null, detail: hi52 > 0 ? `${pctStr(last, hi52)} from high` : "n/a" },
    { name: "RS rating ≥ 70", pass: rsRating != null ? rsRating >= 70 : null, detail: rsRating != null ? `RS ${rsRating}` : "n/a" },
  ];

  const evaluable = criteria.filter((c) => c.pass !== null);
  const pass = evaluable.filter((c) => c.pass === true).length;
  const max = evaluable.length || 8;
  const pct = max ? (pass / max) * 100 : 0;
  const passed = max >= 6 && pass === max;
  return { pass, max, pct, passed, criteria };
}
