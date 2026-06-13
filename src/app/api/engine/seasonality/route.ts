import type { NextRequest } from "next/server";
import { stooqCandles } from "@/lib/markets/providers";
import { yahooChart } from "@/lib/markets/yahoo";
import { computeSeasonality, type DatedBar } from "@/lib/engine/seasonality";

export const runtime = "nodejs";
export const revalidate = 86400;

const SYM_RE = /^[A-Z0-9.^=-]{1,12}$/;

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const debug = sp.get("debug") !== null;
  const sym = (sp.get("symbol") ?? "SPY").toUpperCase();
  if (!SYM_RE.test(sym)) return Response.json({ live: false, error: debug ? "bad symbol" : undefined });

  try {
    let bars: DatedBar[];
    try { bars = (await stooqCandles(sym)).map((b) => ({ t: b.t, c: b.c })); }
    catch { bars = (await yahooChart(sym, "10y")).bars.map((b) => ({ t: b.t, c: b.c })); }
    if (bars.length < 260) throw new Error("insufficient history for seasonality");
    const seasonality = computeSeasonality(bars);
    return Response.json({ live: true, source: "engine·stooq", asOf: new Date().toISOString(), symbol: sym, ...seasonality });
  } catch (e) {
    return Response.json({ live: false, error: debug ? String(e) : undefined });
  }
}
