import type { NextRequest } from "next/server";
import { fredLatest } from "@/lib/markets/providers";
import { analyzeCurve, type CurvePoint } from "@/lib/engine/yield-curve";

export const runtime = "nodejs";
export const revalidate = 21600; // 6h

// FRED constant-maturity Treasury series → (label, tenor in years)
const TENORS: [string, string, number][] = [
  ["DGS1MO", "1M", 1 / 12], ["DGS3MO", "3M", 0.25], ["DGS6MO", "6M", 0.5], ["DGS1", "1Y", 1],
  ["DGS2", "2Y", 2], ["DGS3", "3Y", 3], ["DGS5", "5Y", 5], ["DGS7", "7Y", 7],
  ["DGS10", "10Y", 10], ["DGS20", "20Y", 20], ["DGS30", "30Y", 30],
];

export async function GET(req: NextRequest) {
  const debug = req.nextUrl.searchParams.get("debug") !== null;
  try {
    const settled = await Promise.allSettled(TENORS.map(([id]) => fredLatest(id)));
    const points: (CurvePoint & { changeBps: number })[] = [];
    settled.forEach((r, i) => {
      if (r.status === "fulfilled") points.push({ tenorYears: TENORS[i][2], label: TENORS[i][1], yield: r.value.value, changeBps: (r.value.value - r.value.prev) * 100 });
    });
    if (points.length < 4) throw new Error("insufficient curve points");
    const analysis = analyzeCurve(points.map(({ tenorYears, label, yield: y }) => ({ tenorYears, label, yield: y })));
    return Response.json({ live: true, source: "engine·FRED", asOf: new Date().toISOString(), points, ...analysis });
  } catch (e) {
    return Response.json({ live: false, error: debug ? String(e) : undefined });
  }
}
