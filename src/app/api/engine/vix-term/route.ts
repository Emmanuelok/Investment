import { fredSeries, stooqCandles } from "@/lib/markets/providers";
import { analyzeVixTerm } from "@/lib/engine/vix-term";
import { closeToCloseVol } from "@/lib/engine/volatility";

export const runtime = "nodejs";
export const revalidate = 3600; // 1h

export async function GET(req: Request) {
  const debug = new URL(req.url).searchParams.get("debug") !== null;
  try {
    const [vixRes, vix3mRes, spyRes] = await Promise.allSettled([
      fredSeries("VIXCLS", 520), // CBOE VIX (≈1M)
      fredSeries("VXVCLS", 520), // CBOE 3-Month Volatility (VIX3M)
      stooqCandles("SPY"),
    ]);
    if (vixRes.status !== "fulfilled" || vixRes.value.length < 20) throw new Error("no VIX series");

    const vix = vixRes.value.map((d) => d.value).filter((x) => Number.isFinite(x));
    const vix3m = vix3mRes.status === "fulfilled" ? vix3mRes.value.map((d) => d.value).filter((x) => Number.isFinite(x)) : [];

    // Realized vol of SPY (annualized %, ~21 sessions) for the variance-risk premium.
    let realizedVol: number | undefined;
    if (spyRes.status === "fulfilled") {
      const closes = spyRes.value.map((b) => b.c).filter((c) => c > 0).slice(-22);
      const rv = closeToCloseVol(closes) * 100;
      if (rv > 0) realizedVol = rv;
    }

    const report = analyzeVixTerm({ vix, vix3m, realizedVol });
    const asOfDate = vixRes.value[vixRes.value.length - 1]?.date ?? null;
    // Recent VIX history tail for the client chart.
    const vixHistory = vixRes.value.slice(-90);

    return Response.json({ live: true, source: "engine·FRED", asOf: new Date().toISOString(), asOfDate, vixHistory, ...report });
  } catch (e) {
    return Response.json({ live: false, error: debug ? String(e) : undefined });
  }
}
