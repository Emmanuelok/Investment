import type { NextRequest } from "next/server";
import { stooqCandles } from "@/lib/markets/providers";
import { analyzeLiquidity, type VBar } from "@/lib/engine/liquidity";

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
    const bars: VBar[] = raw.filter((b) => b.c > 0 && b.v > 0).map((b) => ({ c: b.c, v: b.v }));
    if (bars.length < 40) throw new Error(`insufficient volume history (${bars.length})`);
    const report = analyzeLiquidity(bars.slice(-250));
    return Response.json({ live: true, source: "engine·Stooq", asOf: new Date().toISOString(), symbol, ...report });
  } catch (e) {
    return Response.json({ live: false, error: debug ? String(e) : undefined });
  }
}
