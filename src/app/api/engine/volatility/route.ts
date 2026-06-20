import type { NextRequest } from "next/server";
import { stooqCandles } from "@/lib/markets/providers";
import { analyzeVolatility, type OHLC } from "@/lib/engine/volatility";

export const runtime = "nodejs";
export const revalidate = 3600; // 1h

const SYM_RE = /^[A-Z][A-Z0-9.-]{0,9}$/;

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const debug = sp.get("debug") !== null;
  const symbol = (sp.get("symbol") ?? "SPY").toUpperCase();
  if (!SYM_RE.test(symbol)) return Response.json({ live: false, error: debug ? "bad symbol" : undefined });

  try {
    const raw = await stooqCandles(symbol);
    const bars: OHLC[] = raw
      .filter((b) => b.o > 0 && b.h > 0 && b.l > 0 && b.c > 0)
      .map((b) => ({ o: b.o, h: b.h, l: b.l, c: b.c }));
    if (bars.length < 60) throw new Error(`insufficient history (${bars.length})`);
    const report = analyzeVolatility(bars.slice(-400));
    return Response.json({ live: true, source: "engine·Stooq", asOf: new Date().toISOString(), symbol, ...report });
  } catch (e) {
    return Response.json({ live: false, error: debug ? String(e) : undefined });
  }
}
