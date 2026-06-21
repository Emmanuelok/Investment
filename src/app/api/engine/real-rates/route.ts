import { fredSeries } from "@/lib/markets/providers";
import { buildRealRates, type RateSeries, type RateKind } from "@/lib/engine/real-rates";

export const runtime = "nodejs";
export const revalidate = 21600; // 6h

const BASKET: { id: string; label: string; tenor: string; kind: RateKind }[] = [
  { id: "DGS2", label: "2Y Nominal", tenor: "2Y", kind: "Nominal" },
  { id: "DGS5", label: "5Y Nominal", tenor: "5Y", kind: "Nominal" },
  { id: "DFII5", label: "5Y Real (TIPS)", tenor: "5Y", kind: "Real" },
  { id: "T5YIE", label: "5Y Breakeven", tenor: "5Y", kind: "Breakeven" },
  { id: "DGS10", label: "10Y Nominal", tenor: "10Y", kind: "Nominal" },
  { id: "DFII10", label: "10Y Real (TIPS)", tenor: "10Y", kind: "Real" },
  { id: "T10YIE", label: "10Y Breakeven", tenor: "10Y", kind: "Breakeven" },
  { id: "T5YIFR", label: "5y5y Forward Inflation", tenor: "5y5y", kind: "Forward" },
];

export async function GET(req: Request) {
  const debug = new URL(req.url).searchParams.get("debug") !== null;
  try {
    const settled = await Promise.allSettled(BASKET.map((b) => fredSeries(b.id, 520)));
    const inputs: RateSeries[] = [];
    let asOfDate: string | null = null;
    settled.forEach((res, i) => {
      if (res.status !== "fulfilled" || res.value.length < 10) return;
      const spec = BASKET[i];
      inputs.push({ ...spec, series: res.value.map((d) => d.value).filter((x) => Number.isFinite(x)) });
      const last = res.value[res.value.length - 1];
      if (!asOfDate || last.date > asOfDate) asOfDate = last.date;
    });
    if (inputs.length < 4) throw new Error(`insufficient rate series (${inputs.length})`);

    const report = buildRealRates(inputs);
    return Response.json({ live: true, source: "engine·FRED", asOf: new Date().toISOString(), asOfDate, ...report });
  } catch (e) {
    return Response.json({ live: false, error: debug ? String(e) : undefined });
  }
}
