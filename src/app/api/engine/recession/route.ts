import { fredLatest, fredSeries } from "@/lib/markets/providers";
import { buildRecession, type RecessionInput } from "@/lib/engine/recession";

export const runtime = "nodejs";
export const revalidate = 21600; // 6h

export async function GET(req: Request) {
  const debug = new URL(req.url).searchParams.get("debug") !== null;
  try {
    const [spreadRes, unrateRes, oasRes] = await Promise.allSettled([
      fredLatest("T10Y3M"), // 10y−3m Treasury term spread (percent)
      fredSeries("UNRATE", 30), // monthly unemployment rate
      fredSeries("BAMLH0A0HYM2", 60), // US high-yield OAS
    ]);
    if (spreadRes.status !== "fulfilled" || !Number.isFinite(spreadRes.value.value)) throw new Error("no term spread");
    if (unrateRes.status !== "fulfilled" || unrateRes.value.length < 14) throw new Error("no unemployment series");

    const input: RecessionInput = {
      termSpread: spreadRes.value.value,
      unrate: unrateRes.value.map((d) => d.value).filter((x) => Number.isFinite(x)),
      hyOas: oasRes.status === "fulfilled" ? oasRes.value.map((d) => d.value).filter((x) => Number.isFinite(x)) : undefined,
    };

    const report = buildRecession(input);
    const asOfDate = unrateRes.value[unrateRes.value.length - 1]?.date ?? null;
    return Response.json({ live: true, source: "engine·FRED", asOf: new Date().toISOString(), asOfDate, ...report });
  } catch (e) {
    return Response.json({ live: false, error: debug ? String(e) : undefined });
  }
}
