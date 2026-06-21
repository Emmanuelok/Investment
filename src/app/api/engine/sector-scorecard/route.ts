import { stooqCandles } from "@/lib/markets/providers";
import { yahooChart } from "@/lib/markets/yahoo";
import { buildSectorScorecard, type SectorSeries, type SectorGroup } from "@/lib/engine/sector-scorecard";

export const runtime = "nodejs";
export const revalidate = 3600; // 1h

const BENCHMARK = "SPY";
const SECTORS: { sym: string; label: string; group: SectorGroup }[] = [
  { sym: "XLK", label: "Technology", group: "Sensitive" },
  { sym: "XLC", label: "Communication Svcs", group: "Sensitive" },
  { sym: "XLE", label: "Energy", group: "Sensitive" },
  { sym: "XLY", label: "Consumer Discretionary", group: "Cyclical" },
  { sym: "XLF", label: "Financials", group: "Cyclical" },
  { sym: "XLI", label: "Industrials", group: "Cyclical" },
  { sym: "XLB", label: "Materials", group: "Cyclical" },
  { sym: "XLRE", label: "Real Estate", group: "Cyclical" },
  { sym: "XLP", label: "Consumer Staples", group: "Defensive" },
  { sym: "XLU", label: "Utilities", group: "Defensive" },
  { sym: "XLV", label: "Health Care", group: "Defensive" },
];

async function closesOf(sym: string): Promise<number[]> {
  try {
    return (await stooqCandles(sym)).map((b) => b.c);
  } catch {
    return (await yahooChart(sym, "2y")).bars.map((b) => b.c);
  }
}
const fulfilled = <T,>(r: PromiseSettledResult<T>): r is PromiseFulfilledResult<T> => r.status === "fulfilled";

export async function GET(req: Request) {
  const debug = new URL(req.url).searchParams.get("debug") !== null;
  try {
    const [benchR, ...sectorR] = await Promise.allSettled([closesOf(BENCHMARK), ...SECTORS.map((s) => closesOf(s.sym))]);
    if (!fulfilled(benchR) || benchR.value.length < 70) throw new Error("no benchmark series");

    const sectors: SectorSeries[] = [];
    sectorR.forEach((res, i) => {
      if (fulfilled(res) && res.value.length >= 70) sectors.push({ id: SECTORS[i].sym, label: SECTORS[i].label, group: SECTORS[i].group, closes: res.value });
    });
    if (sectors.length < 6) throw new Error(`too few sectors (${sectors.length})`);

    const report = buildSectorScorecard(sectors, BENCHMARK, benchR.value);
    return Response.json({ live: true, source: "engine·Stooq", asOf: new Date().toISOString(), ...report });
  } catch (e) {
    return Response.json({ live: false, error: debug ? String(e) : undefined });
  }
}
