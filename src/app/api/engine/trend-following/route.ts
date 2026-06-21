import { stooqCandles } from "@/lib/markets/providers";
import { yahooChart } from "@/lib/markets/yahoo";
import { buildTrendFollowing, type TsAsset } from "@/lib/engine/trend-following";

export const runtime = "nodejs";
export const revalidate = 3600; // 1h

const UNIVERSE: { sym: string; label: string; assetClass: string }[] = [
  { sym: "SPY", label: "US Equities", assetClass: "Equity" },
  { sym: "QQQ", label: "US Tech", assetClass: "Equity" },
  { sym: "IWM", label: "US Small Cap", assetClass: "Equity" },
  { sym: "EFA", label: "Developed ex-US", assetClass: "Equity" },
  { sym: "EEM", label: "Emerging Markets", assetClass: "Equity" },
  { sym: "TLT", label: "Long Treasuries", assetClass: "Rates" },
  { sym: "IEF", label: "7-10y Treasuries", assetClass: "Rates" },
  { sym: "LQD", label: "IG Credit", assetClass: "Credit" },
  { sym: "GLD", label: "Gold", assetClass: "Commodity" },
  { sym: "DBC", label: "Broad Commodities", assetClass: "Commodity" },
  { sym: "USO", label: "Crude Oil", assetClass: "Commodity" },
  { sym: "UUP", label: "US Dollar", assetClass: "FX" },
  { sym: "VNQ", label: "Real Estate", assetClass: "Real Estate" },
];

async function closesOf(sym: string): Promise<number[]> {
  try {
    return (await stooqCandles(sym)).map((b) => b.c);
  } catch {
    return (await yahooChart(sym, "2y")).bars.map((b) => b.c);
  }
}

export async function GET(req: Request) {
  const debug = new URL(req.url).searchParams.get("debug") !== null;
  try {
    const settled = await Promise.allSettled(UNIVERSE.map(async (u) => ({ ...u, closes: await closesOf(u.sym) })));
    type Resolved = { sym: string; label: string; assetClass: string; closes: number[] };
    const assets: TsAsset[] = settled
      .filter((r): r is PromiseFulfilledResult<Resolved> => r.status === "fulfilled" && r.value.closes.length > 64)
      .map((r) => ({ id: r.value.sym, label: r.value.label, assetClass: r.value.assetClass, closes: r.value.closes }));
    if (assets.length < 6) throw new Error(`too few assets resolved (${assets.length})`);

    const report = buildTrendFollowing(assets);
    return Response.json({ live: true, source: "engine·Stooq", asOf: new Date().toISOString(), universe: assets.length, ...report });
  } catch (e) {
    return Response.json({ live: false, error: debug ? String(e) : undefined });
  }
}
