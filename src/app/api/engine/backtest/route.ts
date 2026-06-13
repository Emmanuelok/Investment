import type { NextRequest } from "next/server";
import { stooqCandles } from "@/lib/markets/providers";
import { yahooChart } from "@/lib/markets/yahoo";
import { runBacktest, type StrategyId, type BacktestParams } from "@/lib/engine/backtest";
import type { Candle } from "@/lib/rng";

export const runtime = "nodejs";
export const revalidate = 1800;

const SYM_RE = /^[A-Z0-9.^=-]{1,12}$/;
const STRATS: StrategyId[] = ["buyhold", "smaCross", "rsiReversion", "macdTrend", "bollingerBreakout", "donchian"];
const numParam = (v: string | null, d: number, lo: number, hi: number) => {
  const n = v === null ? d : Number(v);
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : d;
};

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const debug = sp.get("debug") !== null;
  const sym = (sp.get("symbol") ?? "SPY").toUpperCase();
  if (!SYM_RE.test(sym)) return Response.json({ live: false, error: debug ? "bad symbol" : undefined });
  const strategy = (STRATS.includes(sp.get("strategy") as StrategyId) ? sp.get("strategy") : "smaCross") as StrategyId;
  const params: BacktestParams = {
    fast: numParam(sp.get("fast"), 20, 2, 100),
    slow: numParam(sp.get("slow"), 50, 5, 250),
    rsiLow: numParam(sp.get("rsiLow"), 30, 5, 50),
    rsiHigh: numParam(sp.get("rsiHigh"), 55, 50, 95),
    lookback: numParam(sp.get("lookback"), 20, 5, 120),
    costBps: numParam(sp.get("costBps"), 5, 0, 100),
    allowShort: sp.get("short") === "1",
  };

  try {
    let bars;
    try { bars = await stooqCandles(sym); } catch { bars = (await yahooChart(sym, "5y")).bars; }
    const candles: Candle[] = bars.slice(-756).map((b) => ({ o: b.o, h: b.h, l: b.l, c: b.c, v: b.v }));
    if (candles.length < 60) throw new Error("insufficient history");
    const result = runBacktest(strategy, candles, params);
    return Response.json({ live: true, source: "engine·stooq", asOf: new Date().toISOString(), symbol: sym, bars: candles.length, params, ...result });
  } catch (e) {
    return Response.json({ live: false, error: debug ? String(e) : undefined });
  }
}
