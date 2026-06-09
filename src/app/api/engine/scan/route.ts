import type { NextRequest } from "next/server";
import { stooqCandles } from "@/lib/markets/providers";
import { yahooChart } from "@/lib/markets/yahoo";
import { factorScores, type FactorScores } from "@/lib/engine/score";
import { classifyRegime } from "@/lib/engine/regime";
import type { Candle } from "@/lib/rng";

export const runtime = "nodejs";
export const revalidate = 1800;

const SYM_RE = /^[A-Z0-9.^=-]{1,12}$/;

export type ScanRow = FactorScores & { sym: string; price: number; chgPct: number; regime: string; volRegime: string };

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const debug = sp.get("debug") !== null;
  const symbols = (sp.get("symbols") ?? "SPY,QQQ,NVDA,AAPL,MSFT,AMZN,META,GOOGL,TSLA,AMD,JPM,XOM")
    .split(",").map((s) => s.trim().toUpperCase()).filter((s) => SYM_RE.test(s)).slice(0, 16);
  if (!symbols.length) return Response.json({ live: false, error: debug ? "no valid symbols" : undefined });

  try {
    const settled = await Promise.allSettled(symbols.map(async (sym): Promise<ScanRow> => {
      let bars;
      try { bars = await stooqCandles(sym); } catch { bars = (await yahooChart(sym, "1y")).bars; }
      const candles: Candle[] = bars.slice(-260).map((b) => ({ o: b.o, h: b.h, l: b.l, c: b.c, v: b.v }));
      const fs = factorScores(candles);
      const rg = classifyRegime(candles);
      const last = candles[candles.length - 1].c;
      const prev = candles[candles.length - 2]?.c ?? last;
      return { sym, price: last, chgPct: prev ? (last / prev - 1) * 100 : 0, regime: rg.trend, volRegime: rg.volRegime, ...fs };
    }));
    const rows = settled.filter((r): r is PromiseFulfilledResult<ScanRow> => r.status === "fulfilled").map((r) => r.value);
    if (!rows.length) throw new Error("all symbols failed");
    rows.sort((a, b) => b.composite - a.composite);
    return Response.json({ live: true, source: "engine·stooq", asOf: new Date().toISOString(), rows, failed: symbols.length - rows.length });
  } catch (e) {
    return Response.json({ live: false, error: debug ? String(e) : undefined });
  }
}
