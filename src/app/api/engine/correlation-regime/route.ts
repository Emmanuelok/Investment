import type { NextRequest } from "next/server";
import { stooqCandles } from "@/lib/markets/providers";
import { yahooChart } from "@/lib/markets/yahoo";
import { analyzeCorrelationRegime, type AssetSeries } from "@/lib/engine/correlation-regime";

export const runtime = "nodejs";
export const revalidate = 3600; // 1h

// Cross-asset proxy ETFs, one per major asset class.
const PROXIES: { symbol: string; assetClass: string }[] = [
  { symbol: "SPY", assetClass: "Equity (US)" },
  { symbol: "QQQ", assetClass: "Equity (Tech)" },
  { symbol: "IWM", assetClass: "Equity (Small)" },
  { symbol: "EEM", assetClass: "Equity (EM)" },
  { symbol: "EFA", assetClass: "Equity (Intl)" },
  { symbol: "TLT", assetClass: "Bond (Long Treasury)" },
  { symbol: "HYG", assetClass: "Credit (High Yield)" },
  { symbol: "LQD", assetClass: "Credit (IG)" },
  { symbol: "GLD", assetClass: "Commodity (Gold)" },
  { symbol: "DBC", assetClass: "Commodity (Broad)" },
  { symbol: "USO", assetClass: "Commodity (Oil)" },
  { symbol: "UUP", assetClass: "FX (US Dollar)" },
  { symbol: "VNQ", assetClass: "Real Estate" },
];

async function closesOf(sym: string): Promise<number[]> {
  try {
    return (await stooqCandles(sym)).map((b) => b.c);
  } catch {
    return (await yahooChart(sym, "2y")).bars.map((b) => b.c);
  }
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const debug = sp.get("debug") !== null;
  const window = Math.max(20, Math.min(120, Number(sp.get("window") ?? 60) || 60));

  try {
    const settled = await Promise.allSettled(
      PROXIES.map(async (p) => ({ symbol: p.symbol, assetClass: p.assetClass, closes: await closesOf(p.symbol) })),
    );
    const assets: AssetSeries[] = settled
      .filter((r): r is PromiseFulfilledResult<AssetSeries> => r.status === "fulfilled" && r.value.closes.length > window + 5)
      .map((r) => r.value);
    if (assets.length < 5) throw new Error(`too few asset proxies resolved (${assets.length})`);

    const report = analyzeCorrelationRegime(assets, { window });
    const classes = assets.map((a) => ({ symbol: a.symbol, assetClass: a.assetClass }));
    return Response.json({ live: true, source: "engine·Stooq", asOf: new Date().toISOString(), window, classes, ...report });
  } catch (e) {
    return Response.json({ live: false, error: debug ? String(e) : undefined });
  }
}
