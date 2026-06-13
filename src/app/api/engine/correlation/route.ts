import type { NextRequest } from "next/server";
import { stooqCandles } from "@/lib/markets/providers";
import { yahooChart } from "@/lib/markets/yahoo";
import { correlationMatrix, avgPairwiseCorr } from "@/lib/engine/correlation";

export const runtime = "nodejs";
export const revalidate = 3600;

const SYM_RE = /^[A-Z0-9.^=-]{1,12}$/;

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const debug = sp.get("debug") !== null;
  const symbols = (sp.get("symbols") ?? "SPY,QQQ,NVDA,AAPL,XLE,TLT,GLD,BTC-USD")
    .split(",").map((s) => s.trim().toUpperCase()).filter((s) => SYM_RE.test(s)).slice(0, 14);
  const window = Math.max(20, Math.min(252, Number(sp.get("window") ?? 90) || 90));
  if (symbols.length < 2) return Response.json({ live: false, error: debug ? "need ≥2 symbols" : undefined });

  try {
    const settled = await Promise.allSettled(symbols.map(async (s) => {
      let bars;
      try { bars = await stooqCandles(s); } catch { bars = (await yahooChart(s, "1y")).bars; }
      return { s, closes: bars.map((b) => b.c) };
    }));
    const series: Record<string, number[]> = {};
    settled.forEach((r) => { if (r.status === "fulfilled" && r.value.closes.length > window) series[r.value.s] = r.value.closes; });
    if (Object.keys(series).length < 2) throw new Error("too few series resolved");
    const cm = correlationMatrix(series, window);
    return Response.json({ live: true, source: "engine·stooq", asOf: new Date().toISOString(), window, ...cm, avgCorr: Math.round(avgPairwiseCorr(cm) * 1000) / 1000 });
  } catch (e) {
    return Response.json({ live: false, error: debug ? String(e) : undefined });
  }
}
