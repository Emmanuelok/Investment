/**
 * Candlestick / price-action pattern detection — deterministic geometry over
 * OHLC bars. Returns named patterns with a tone and how many bars back.
 */
import type { Candle } from "@/lib/rng";

export type Pattern = { name: string; tone: "pos" | "neg" | "info"; barsAgo: number; detail: string };

const body = (c: Candle) => Math.abs(c.c - c.o);
const range = (c: Candle) => Math.max(c.h - c.l, 1e-9);
const upperWick = (c: Candle) => c.h - Math.max(c.o, c.c);
const lowerWick = (c: Candle) => Math.min(c.o, c.c) - c.l;
const isGreen = (c: Candle) => c.c >= c.o;

/** Trend just before bar i (avg slope of prior 5 closes). */
function priorTrend(candles: Candle[], i: number): number {
  if (i < 5) return 0;
  return candles[i - 1].c / candles[i - 5].c - 1;
}

export function detectPatterns(candles: Candle[], lookback = 4): Pattern[] {
  const out: Pattern[] = [];
  const n = candles.length;
  for (let k = 0; k < lookback && n - 1 - k >= 1; k++) {
    const i = n - 1 - k;
    const c = candles[i], p = candles[i - 1];
    const b = body(c), r = range(c);
    const trend = priorTrend(candles, i);

    if (b <= 0.1 * r) out.push({ name: "Doji", tone: "info", barsAgo: k, detail: "Open≈close — indecision; watch for a follow-through break." });
    else if (lowerWick(c) >= 2 * b && upperWick(c) <= b && trend < -0.01) out.push({ name: "Hammer", tone: "pos", barsAgo: k, detail: "Long lower shadow after a decline — potential bullish reversal." });
    else if (upperWick(c) >= 2 * b && lowerWick(c) <= b && trend > 0.01) out.push({ name: "Shooting Star", tone: "neg", barsAgo: k, detail: "Long upper shadow after a rally — potential bearish reversal." });
    else if (b >= 0.9 * r) out.push({ name: isGreen(c) ? "Bullish Marubozu" : "Bearish Marubozu", tone: isGreen(c) ? "pos" : "neg", barsAgo: k, detail: "Full-body bar — one-sided conviction." });

    // two-bar patterns
    if (!isGreen(p) && isGreen(c) && c.o <= p.c && c.c >= p.o) out.push({ name: "Bullish Engulfing", tone: "pos", barsAgo: k, detail: "Up bar fully engulfs the prior down bar — demand stepped in." });
    else if (isGreen(p) && !isGreen(c) && c.o >= p.c && c.c <= p.o) out.push({ name: "Bearish Engulfing", tone: "neg", barsAgo: k, detail: "Down bar fully engulfs the prior up bar — supply stepped in." });

    if (c.l > p.h) out.push({ name: "Gap Up", tone: "pos", barsAgo: k, detail: "Opened above the prior bar's high — momentum gap." });
    else if (c.h < p.l) out.push({ name: "Gap Down", tone: "neg", barsAgo: k, detail: "Opened below the prior bar's low — momentum gap." });
    else if (c.h < p.h && c.l > p.l) out.push({ name: "Inside Bar", tone: "info", barsAgo: k, detail: "Range contracts inside the prior bar — coiling for a break." });
  }
  // dedupe by name, keep the most recent occurrence
  const seen = new Set<string>();
  return out.filter((x) => (seen.has(x.name) ? false : (seen.add(x.name), true)));
}
