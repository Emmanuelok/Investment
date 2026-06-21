import { stooqCandles } from "@/lib/markets/providers";
import { yahooChart } from "@/lib/markets/yahoo";
import { buildCommodities, type CommoditySeries } from "@/lib/engine/commodities";

export const runtime = "nodejs";
export const revalidate = 3600; // 1h

const BASKET: { sym: string; id: string; label: string; group: string }[] = [
  { sym: "CPER", id: "copper", label: "Copper", group: "Industrial" },
  { sym: "GLD", id: "gold", label: "Gold", group: "Precious" },
  { sym: "SLV", id: "silver", label: "Silver", group: "Precious" },
  { sym: "USO", id: "oil", label: "Crude Oil", group: "Energy" },
  { sym: "UNG", id: "natgas", label: "Natural Gas", group: "Energy" },
  { sym: "DBC", id: "broad", label: "Broad Commodities", group: "Broad" },
  { sym: "DBA", id: "agriculture", label: "Agriculture", group: "Agriculture" },
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
    const settled = await Promise.allSettled(BASKET.map(async (b) => ({ ...b, closes: await closesOf(b.sym) })));
    type Resolved = { sym: string; id: string; label: string; group: string; closes: number[] };
    const series: CommoditySeries[] = settled
      .filter((r): r is PromiseFulfilledResult<Resolved> => r.status === "fulfilled" && r.value.closes.length >= 64)
      .map((r) => ({ id: r.value.id, label: r.value.label, group: r.value.group, closes: r.value.closes }));
    if (series.length < 4) throw new Error(`too few commodity series (${series.length})`);

    const report = buildCommodities(series);
    return Response.json({ live: true, source: "engine·Stooq", asOf: new Date().toISOString(), ...report });
  } catch (e) {
    return Response.json({ live: false, error: debug ? String(e) : undefined });
  }
}
