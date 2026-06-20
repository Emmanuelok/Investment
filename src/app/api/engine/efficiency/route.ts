import type { NextRequest } from "next/server";
import { stooqCandles } from "@/lib/markets/providers";
import { analyzeEfficiency } from "@/lib/engine/efficiency";

export const runtime = "nodejs";
export const revalidate = 3600; // 1h

const SYM_RE = /^[A-Z][A-Z0-9.-]{0,9}$/;

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const debug = sp.get("debug") !== null;
  const symbol = (sp.get("symbol") ?? "SPY").toUpperCase();
  if (!SYM_RE.test(symbol)) return Response.json({ live: false, error: debug ? "bad symbol" : undefined });

  try {
    const bars = await stooqCandles(symbol);
    const closes = bars.map((b) => b.c).filter((c) => Number.isFinite(c) && c > 0);
    if (closes.length < 120) throw new Error(`insufficient history (${closes.length})`);
    const window = closes.slice(-504); // ~2y of trading days
    const result = analyzeEfficiency(window);
    return Response.json({ live: true, source: "engine·Stooq", asOf: new Date().toISOString(), symbol, bars: window.length, ...result });
  } catch (e) {
    return Response.json({ live: false, error: debug ? String(e) : undefined });
  }
}
