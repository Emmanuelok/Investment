import { fredSeries } from "@/lib/markets/providers";
import { buildYieldMonitor, type YieldSeries } from "@/lib/engine/yield-monitor";

export const runtime = "nodejs";
export const revalidate = 21600; // 6h

const BASKET: { id: string; label: string; category: string }[] = [
  { id: "DGS2", label: "2Y Treasury", category: "Treasury" },
  { id: "DGS5", label: "5Y Treasury", category: "Treasury" },
  { id: "DGS10", label: "10Y Treasury", category: "Treasury" },
  { id: "DGS30", label: "30Y Treasury", category: "Treasury" },
  { id: "DFII10", label: "10Y TIPS (real)", category: "TIPS" },
  { id: "BAMLC0A0CMEY", label: "US IG Corporate", category: "IG" },
  { id: "BAMLH0A0HYM2EY", label: "US High Yield", category: "HY" },
  { id: "BAMLEMCBPIEY", label: "EM Corporate", category: "EM" },
];

export async function GET(req: Request) {
  const debug = new URL(req.url).searchParams.get("debug") !== null;
  try {
    const settled = await Promise.allSettled(BASKET.map((b) => fredSeries(b.id, 760)));
    const inputs: YieldSeries[] = [];
    let asOfDate: string | null = null;
    settled.forEach((res, i) => {
      if (res.status !== "fulfilled" || res.value.length < 20) return;
      const spec = BASKET[i];
      inputs.push({ ...spec, series: res.value.map((d) => d.value).filter((x) => Number.isFinite(x)) });
      const last = res.value[res.value.length - 1];
      if (!asOfDate || last.date > asOfDate) asOfDate = last.date;
    });
    if (inputs.length < 4) throw new Error(`insufficient yield series (${inputs.length})`);

    const report = buildYieldMonitor(inputs);
    return Response.json({ live: true, source: "engine·FRED", asOf: new Date().toISOString(), asOfDate, ...report });
  } catch (e) {
    return Response.json({ live: false, error: debug ? String(e) : undefined });
  }
}
