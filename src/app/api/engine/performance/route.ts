import type { NextRequest } from "next/server";
import { stooqCandles, fredLatest } from "@/lib/markets/providers";
import { performanceRatios } from "@/lib/engine/performance";

export const runtime = "nodejs";
export const revalidate = 3600; // 1h

const SYM_RE = /^[A-Z][A-Z0-9.-]{0,9}$/;

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const debug = sp.get("debug") !== null;
  const symbol = (sp.get("symbol") ?? "SPY").toUpperCase();
  if (!SYM_RE.test(symbol)) return Response.json({ live: false, error: debug ? "bad symbol" : undefined });

  try {
    const [candles, rfRes] = await Promise.allSettled([stooqCandles(symbol), fredLatest("DGS3MO")]);
    if (candles.status !== "fulfilled") throw new Error("no price history");
    const closes = candles.value.map((b) => b.c).filter((c) => Number.isFinite(c) && c > 0);
    if (closes.length < 60) throw new Error(`insufficient history (${closes.length})`);

    const rf = rfRes.status === "fulfilled" && Number.isFinite(rfRes.value.value) ? rfRes.value.value / 100 : 0.04;
    const window = closes.slice(-756); // ~3y of trading days
    const ratios = performanceRatios(window, { rf, periodsPerYear: 252 });

    return Response.json({
      live: true,
      source: "engine·Stooq+FRED",
      asOf: new Date().toISOString(),
      symbol,
      rf,
      rfSource: rfRes.status === "fulfilled" ? "FRED DGS3MO" : "fallback",
      ...ratios,
    });
  } catch (e) {
    return Response.json({ live: false, error: debug ? String(e) : undefined });
  }
}
