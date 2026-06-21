import { fredLatest, fredSeries, stooqCandles } from "@/lib/markets/providers";
import { yahooChart } from "@/lib/markets/yahoo";
import { buildRecession } from "@/lib/engine/recession";
import {
  buildRiskPosture, scoreFromSpread, scoreFromOas, scoreFromVix, scoreFromMomentum, scoreFromPercent,
  type PostureSignal,
} from "@/lib/engine/risk-posture";

export const runtime = "nodejs";
export const revalidate = 3600; // 1h

const SECTORS = ["XLK", "XLF", "XLE", "XLV", "XLI", "XLY", "XLP", "XLU", "XLB", "XLRE", "XLC"];
const mean = (a: number[]): number => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);

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
    const [spreadR, oasR, vixR, spyR, unrateR, ...sectorR] = await Promise.allSettled([
      fredLatest("T10Y3M"),
      fredSeries("BAMLH0A0HYM2", 60),
      fredLatest("VIXCLS"),
      closesOf("SPY"),
      fredSeries("UNRATE", 30),
      ...SECTORS.map(closesOf),
    ]);

    const signals: PostureSignal[] = [];

    if (fulfilled(spreadR) && Number.isFinite(spreadR.value.value)) {
      const spread = spreadR.value.value;
      signals.push({ id: "curve", label: "Yield curve (10y−3m)", category: "Rates", reading: spread, score: scoreFromSpread(spread), weight: 1, note: spread < 0 ? "inverted" : "positively sloped" });
    }
    const oasSeries = fulfilled(oasR) ? oasR.value.map((d) => d.value).filter((x) => Number.isFinite(x)) : [];
    if (oasSeries.length) {
      const oas = oasSeries[oasSeries.length - 1];
      signals.push({ id: "credit", label: "High-yield credit spread", category: "Credit", reading: oas, score: scoreFromOas(oas), weight: 1, note: oas > 5 ? "wide" : "contained" });
    }
    if (fulfilled(vixR) && Number.isFinite(vixR.value.value)) {
      const vix = vixR.value.value;
      signals.push({ id: "vol", label: "Implied volatility (VIX)", category: "Volatility", reading: vix, score: scoreFromVix(vix), weight: 1, note: vix > 25 ? "elevated" : "calm" });
    }
    if (fulfilled(spyR) && spyR.value.length > 64) {
      const c = spyR.value;
      const ret3m = c[c.length - 1] / c[c.length - 1 - 63] - 1;
      const pct = ret3m * 100;
      signals.push({ id: "trend", label: "Equity trend (SPY 3m)", category: "Trend", reading: pct, score: scoreFromMomentum(pct), weight: 1, note: pct >= 0 ? "uptrend" : "downtrend" });
    }

    // Breadth: share of sector ETFs above their 200-day average.
    const sectorCloses = sectorR.filter(fulfilled).map((r) => r.value).filter((c) => c.length >= 200);
    if (sectorCloses.length >= 6) {
      const above = sectorCloses.filter((c) => c[c.length - 1] > mean(c.slice(-200))).length;
      const breadthPct = (above / sectorCloses.length) * 100;
      signals.push({ id: "breadth", label: "Sector breadth (% > 200-DMA)", category: "Breadth", reading: breadthPct, score: scoreFromPercent(breadthPct), weight: 1, note: `${above}/${sectorCloses.length} sectors` });
    }

    // Macro: recession composite (lower recession risk ⇒ higher support score).
    if (fulfilled(spreadR) && fulfilled(unrateR) && unrateR.value.length >= 14) {
      const rec = buildRecession({
        termSpread: spreadR.value.value,
        unrate: unrateR.value.map((d) => d.value).filter((x) => Number.isFinite(x)),
        hyOas: oasSeries.length ? oasSeries : undefined,
      });
      signals.push({ id: "macro", label: "Recession risk (composite)", category: "Macro", reading: rec.probability, score: scoreFromPercent(100 - rec.compositeRisk), weight: 1, note: `${rec.level} (${rec.probability}% 12m)` });
    }

    if (signals.length < 4) throw new Error(`too few signals resolved (${signals.length})`);

    const report = buildRiskPosture(signals);
    return Response.json({ live: true, source: "engine·FRED+Stooq", asOf: new Date().toISOString(), ...report });
  } catch (e) {
    return Response.json({ live: false, error: debug ? String(e) : undefined });
  }
}
