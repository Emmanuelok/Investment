import { stooqCandles } from "@/lib/markets/providers";
import { yahooChart } from "@/lib/markets/yahoo";
import { screenPairs, type PriceSeries } from "@/lib/engine/pairs-screener";

export const runtime = "nodejs";
export const revalidate = 3600; // 1h

const SYM_RE = /^[A-Z0-9.^=-]{1,12}$/;
// A universe of liquid names with plausible cointegrating relationships.
const DEFAULT_UNIVERSE = [
  "KO", "PEP", "V", "MA", "HD", "LOW", "XOM", "CVX", "GLD", "SLV",
  "JPM", "BAC", "GOOGL", "META", "MSFT", "AAPL",
];

async function closesOf(sym: string): Promise<number[]> {
  try {
    return (await stooqCandles(sym)).map((b) => b.c);
  } catch {
    return (await yahooChart(sym, "2y")).bars.map((b) => b.c);
  }
}

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const debug = sp.get("debug") !== null;
  const param = sp.get("symbols");
  const symbols = (param ? param.split(",").map((s) => s.trim().toUpperCase()) : DEFAULT_UNIVERSE)
    .filter((s) => SYM_RE.test(s)).slice(0, 24);
  if (symbols.length < 4) return Response.json({ live: false, error: debug ? "need ≥4 symbols" : undefined });

  try {
    const settled = await Promise.allSettled(symbols.map(async (s) => ({ sym: s, closes: await closesOf(s) })));
    const series: PriceSeries[] = settled
      .filter((r): r is PromiseFulfilledResult<PriceSeries> => r.status === "fulfilled" && r.value.closes.length >= 120)
      .map((r) => r.value);
    if (series.length < 4) throw new Error(`too few series resolved (${series.length})`);

    const report = screenPairs(series, { window: 90, entryZ: 2, top: 15 });
    return Response.json({ live: true, source: "engine·Stooq", asOf: new Date().toISOString(), universe: series.length, ...report });
  } catch (e) {
    return Response.json({ live: false, error: debug ? String(e) : undefined });
  }
}
