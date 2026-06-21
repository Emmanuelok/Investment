import { fredSeries } from "@/lib/markets/providers";
import { buildCreditConditions, type SpreadInput } from "@/lib/engine/credit-conditions";

export const runtime = "nodejs";
export const revalidate = 21600; // 6h

// ICE BofA option-adjusted spreads on FRED (percent), no key.
const BASKET: { id: string; label: string; tier: string; weight: number }[] = [
  { id: "BAMLH0A0HYM2", label: "US High Yield OAS", tier: "HY", weight: 2 },
  { id: "BAMLC0A4CBBB", label: "US BBB OAS", tier: "BBB", weight: 1.5 },
  { id: "BAMLH0A3HYC", label: "US CCC & Lower OAS", tier: "CCC", weight: 1.5 },
  { id: "BAMLC0A0CM", label: "US Corporate (IG) OAS", tier: "IG", weight: 1 },
  { id: "BAMLEMCBPIOAS", label: "EM Corporate OAS", tier: "EM", weight: 1 },
];

export async function GET(req: Request) {
  const debug = new URL(req.url).searchParams.get("debug") !== null;
  try {
    const settled = await Promise.allSettled(BASKET.map((b) => fredSeries(b.id, 1100)));
    const inputs: SpreadInput[] = [];
    let asOfDate: string | null = null;
    settled.forEach((res, i) => {
      if (res.status !== "fulfilled" || res.value.length < 30) return;
      const spec = BASKET[i];
      const series = res.value.map((d) => d.value).filter((x) => Number.isFinite(x));
      if (series.length < 30) return;
      inputs.push({ id: spec.id, label: spec.label, tier: spec.tier, series, weight: spec.weight });
      const last = res.value[res.value.length - 1];
      if (!asOfDate || last.date > asOfDate) asOfDate = last.date;
    });

    if (inputs.length < 3) throw new Error(`insufficient spread series (${inputs.length})`);

    const conditions = buildCreditConditions(inputs);
    return Response.json({ live: true, source: "engine·FRED", asOf: new Date().toISOString(), asOfDate, ...conditions });
  } catch (e) {
    return Response.json({ live: false, error: debug ? String(e) : undefined });
  }
}
