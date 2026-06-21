import { stooqCandles } from "@/lib/markets/providers";
import { yahooChart } from "@/lib/markets/yahoo";
import { buildRegionalRotation, type RegionSeries, type RegionBucket } from "@/lib/engine/regional-rotation";

export const runtime = "nodejs";
export const revalidate = 3600; // 1h

const BENCHMARK = "ACWI";
const REGIONS: { sym: string; label: string; bucket: RegionBucket }[] = [
  { sym: "SPY", label: "United States", bucket: "US" },
  { sym: "VGK", label: "Europe", bucket: "DM" },
  { sym: "EWJ", label: "Japan", bucket: "DM" },
  { sym: "EWU", label: "United Kingdom", bucket: "DM" },
  { sym: "EFA", label: "Developed ex-US", bucket: "DM" },
  { sym: "EEM", label: "Emerging Markets", bucket: "EM" },
  { sym: "FXI", label: "China", bucket: "EM" },
  { sym: "INDA", label: "India", bucket: "EM" },
  { sym: "EWZ", label: "Brazil", bucket: "EM" },
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
    const [benchR, ...regionR] = await Promise.allSettled([closesOf(BENCHMARK), ...REGIONS.map((r) => closesOf(r.sym))]);
    if (!fulfilled(benchR) || benchR.value.length < 70) throw new Error("no benchmark series");

    const regions: RegionSeries[] = [];
    regionR.forEach((res, i) => {
      if (fulfilled(res) && res.value.length >= 70) regions.push({ id: REGIONS[i].sym, label: REGIONS[i].label, bucket: REGIONS[i].bucket, closes: res.value });
    });
    if (regions.length < 4) throw new Error(`too few regions (${regions.length})`);

    const report = buildRegionalRotation(regions, BENCHMARK, benchR.value);
    return Response.json({ live: true, source: "engine·Stooq", asOf: new Date().toISOString(), ...report });
  } catch (e) {
    return Response.json({ live: false, error: debug ? String(e) : undefined });
  }
}
