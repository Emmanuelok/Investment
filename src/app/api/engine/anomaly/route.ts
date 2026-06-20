import type { NextRequest } from "next/server";
import { stooqCandles } from "@/lib/markets/providers";
import { yahooChart } from "@/lib/markets/yahoo";
import { detectAnomalies, type Anomaly } from "@/lib/engine/anomaly";
import type { Candle } from "@/lib/rng";

export const runtime = "nodejs";
export const revalidate = 900;

const SYM_RE = /^[A-Z0-9.^=-]{1,12}$/;

export type AnomalyHit = Anomaly & { symbol: string };

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const debug = sp.get("debug") !== null;
  const symbols = (sp.get("symbols") ?? "SPY,QQQ,NVDA,AAPL,MSFT,AMZN,META,TSLA,AMD,AVGO,JPM,XOM")
    .split(",").map((s) => s.trim().toUpperCase()).filter((s) => SYM_RE.test(s)).slice(0, 16);
  if (!symbols.length) return Response.json({ live: false, error: debug ? "no valid symbols" : undefined });

  try {
    const settled = await Promise.allSettled(symbols.map(async (sym) => {
      let bars;
      try { bars = await stooqCandles(sym); } catch { bars = (await yahooChart(sym, "6mo")).bars; }
      const candles: Candle[] = bars.slice(-90).map((b) => ({ o: b.o, h: b.h, l: b.l, c: b.c, v: b.v }));
      return detectAnomalies(candles).map((a): AnomalyHit => ({ ...a, symbol: sym }));
    }));
    const ok = settled.filter((r): r is PromiseFulfilledResult<AnomalyHit[]> => r.status === "fulfilled");
    if (!ok.length) throw new Error("no symbols resolved"); // all feeds failed → honest demo fallback
    const hits = ok.flatMap((r) => r.value).sort((x, y) => y.severity - x.severity);
    return Response.json({ live: true, source: "engine·stooq", asOf: new Date().toISOString(), scanned: ok.length, anomalies: hits.slice(0, 40) });
  } catch (e) {
    return Response.json({ live: false, error: debug ? String(e) : undefined });
  }
}
