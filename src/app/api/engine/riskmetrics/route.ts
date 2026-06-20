import type { NextRequest } from "next/server";
import { stooqCandles } from "@/lib/markets/providers";
import { yahooChart } from "@/lib/markets/yahoo";
import { rollingMetrics, drawdownAnalytics } from "@/lib/engine/riskmetrics";

export const runtime = "nodejs";
export const revalidate = 1800;

const SYM_RE = /^[A-Z0-9.^=-]{1,12}$/;
async function closesOf(sym: string): Promise<number[]> {
  try { return (await stooqCandles(sym)).map((b) => b.c); } catch { return (await yahooChart(sym, "3y")).bars.map((b) => b.c); }
}
const ds = (a: number[], k = 200) => (a.length <= k ? a : a.filter((_, i) => i % Math.ceil(a.length / k) === 0));

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const debug = sp.get("debug") !== null;
  const sym = (sp.get("symbol") ?? "SPY").toUpperCase();
  const bench = (sp.get("benchmark") ?? "SPY").toUpperCase();
  const window = Math.max(20, Math.min(252, Number(sp.get("window") ?? 63) || 63));
  if (!SYM_RE.test(sym)) return Response.json({ live: false, error: debug ? "bad symbol" : undefined });

  try {
    const closes = await closesOf(sym);
    if (closes.length < window + 20) throw new Error("insufficient history");
    let benchCloses: number[] | undefined;
    if (bench !== sym && SYM_RE.test(bench)) { try { benchCloses = await closesOf(bench); } catch { /* optional */ } }

    const rolling = rollingMetrics(closes, window, benchCloses);
    const dd = drawdownAnalytics(closes);
    return Response.json({
      live: true, source: "engine·stooq", asOf: new Date().toISOString(), symbol: sym, benchmark: bench, window,
      rolling: { sharpe: ds(rolling.map((p) => p.sharpe)), vol: ds(rolling.map((p) => p.vol)), beta: benchCloses ? ds(rolling.map((p) => p.beta ?? 0)) : null },
      underwater: ds(dd.underwater),
      maxDrawdownPct: dd.maxDrawdownPct, currentDrawdownPct: dd.currentDrawdownPct, ulcerIndex: dd.ulcerIndex, inDrawdown: dd.inDrawdown,
      longestBars: dd.longestBars, episodes: dd.episodes,
    });
  } catch (e) {
    return Response.json({ live: false, error: debug ? String(e) : undefined });
  }
}
