import { fredSeries } from "@/lib/markets/providers";
import { buildNowcast, type NowcastGroup, type NowcastInput } from "@/lib/engine/nowcast";

export const runtime = "nodejs";
export const revalidate = 21600; // 6h

type Transform = "yoy" | "mom" | "level";
type Spec = { id: string; label: string; group: NowcastGroup; transform: Transform; sign?: 1 | -1; weight?: number };

// A broad business-cycle basket of FRED series (no key, server-reliable).
const BASKET: Spec[] = [
  // Growth
  { id: "INDPRO", label: "Industrial production", group: "Growth", transform: "yoy" },
  { id: "RSAFS", label: "Retail sales", group: "Growth", transform: "yoy" },
  { id: "HOUST", label: "Housing starts", group: "Growth", transform: "yoy" },
  { id: "DGORDER", label: "Durable-goods orders", group: "Growth", transform: "yoy" },
  { id: "UMCSENT", label: "Consumer sentiment", group: "Growth", transform: "level" },
  // Labor
  { id: "PAYEMS", label: "Nonfarm payrolls (Δ)", group: "Labor", transform: "mom", weight: 1.5 },
  { id: "UNRATE", label: "Unemployment rate", group: "Labor", transform: "level", sign: -1 },
  { id: "ICSA", label: "Initial jobless claims", group: "Labor", transform: "level", sign: -1 },
  { id: "AWHMAN", label: "Avg weekly hours (mfg)", group: "Labor", transform: "level" },
  // Inflation
  { id: "CPIAUCSL", label: "CPI", group: "Inflation", transform: "yoy" },
  { id: "PCEPILFE", label: "Core PCE", group: "Inflation", transform: "yoy", weight: 1.5 },
  { id: "T10YIE", label: "10y breakeven", group: "Inflation", transform: "level" },
  { id: "PPIACO", label: "PPI commodities", group: "Inflation", transform: "yoy" },
];

const yoy = (v: number[], lag = 12): number[] => v.slice(lag).map((x, i) => (v[i] > 0 ? (x / v[i] - 1) * 100 : 0));
const mom = (v: number[]): number[] => v.slice(1).map((x, i) => x - v[i]);
function transform(values: number[], t: Transform): number[] {
  if (t === "yoy") return yoy(values);
  if (t === "mom") return mom(values);
  return values;
}

export async function GET(req: Request) {
  const debug = new URL(req.url).searchParams.get("debug") !== null;
  try {
    const settled = await Promise.allSettled(BASKET.map((s) => fredSeries(s.id, 140)));

    const inputs: NowcastInput[] = [];
    const latestValues: Record<string, { value: number; date: string }> = {};
    settled.forEach((res, i) => {
      if (res.status !== "fulfilled" || res.value.length < 14) return;
      const spec = BASKET[i];
      const raw = res.value.map((d) => d.value).filter((x) => Number.isFinite(x));
      const series = transform(raw, spec.transform);
      if (series.length < 8) return;
      inputs.push({ id: spec.id, label: spec.label, group: spec.group, series, sign: spec.sign, weight: spec.weight });
      const last = res.value[res.value.length - 1];
      latestValues[spec.id] = { value: series[series.length - 1], date: last.date };
    });

    if (inputs.length < 5) throw new Error(`insufficient series (${inputs.length})`);

    const nowcast = buildNowcast(inputs);
    // Enrich indicators with the underlying latest reading + as-of date for display.
    const indicators = nowcast.indicators.map((ind) => ({
      ...ind,
      asOf: latestValues[ind.id]?.date ?? null,
      transform: BASKET.find((b) => b.id === ind.id)?.transform ?? "level",
    }));

    return Response.json({
      live: true,
      source: "engine·FRED",
      asOf: new Date().toISOString(),
      seriesUsed: inputs.length,
      ...nowcast,
      indicators,
    });
  } catch (e) {
    return Response.json({ live: false, error: debug ? String(e) : undefined });
  }
}
