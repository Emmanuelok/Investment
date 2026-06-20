import type { NextRequest } from "next/server";
import { fredSeries } from "@/lib/markets/providers";
import { classifyMacroRegime, seriesTrend } from "@/lib/engine/macro";

export const runtime = "nodejs";
export const revalidate = 21600; // 6h — macro data is slow-moving

export async function GET(req: NextRequest) {
  const debug = req.nextUrl.searchParams.get("debug") !== null;
  try {
    // pull the series we need (no key required)
    const [dgs10, dgs2, unrate, indpro, cpi] = await Promise.all([
      fredSeries("DGS10", 5), fredSeries("DGS2", 5), fredSeries("UNRATE", 10), fredSeries("INDPRO", 14), fredSeries("CPIAUCSL", 16),
    ]);

    const curveSlope = dgs10[dgs10.length - 1].value - dgs2[dgs2.length - 1].value;
    const unVals = unrate.map((p) => p.value);
    const unemploymentTrend = unVals[unVals.length - 1] - (unVals[unVals.length - 7] ?? unVals[0]);
    const growthScore = seriesTrend(indpro.map((p) => p.value), 6, 8);

    // CPI YoY series → trend of inflation direction
    const cpiVals = cpi.map((p) => p.value);
    const yoy: number[] = [];
    for (let i = 12; i < cpiVals.length; i++) yoy.push((cpiVals[i] / cpiVals[i - 12] - 1) * 100);
    const inflationScore = yoy.length >= 2 ? seriesTrend(yoy, Math.min(3, yoy.length - 1), 30) : 0;
    const cpiYoY = yoy.length ? yoy[yoy.length - 1] : null;

    const report = classifyMacroRegime({ growthScore, inflationScore, curveSlope, unemploymentTrend });
    return Response.json({
      live: true, source: "engine·FRED", asOf: new Date().toISOString(),
      indicators: {
        tenYear: dgs10[dgs10.length - 1].value, twoYear: dgs2[dgs2.length - 1].value, curveSlope,
        unemployment: unVals[unVals.length - 1], unemploymentTrend,
        cpiYoY, growthScore: Math.round(growthScore), inflationScore: Math.round(inflationScore),
      },
      ...report,
    });
  } catch (e) {
    return Response.json({ live: false, error: debug ? String(e) : undefined });
  }
}
