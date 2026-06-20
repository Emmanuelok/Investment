import type { NextRequest } from "next/server";
import { stooqCandles } from "@/lib/markets/providers";
import { yahooChart } from "@/lib/markets/yahoo";
import { beta as betaOf } from "@/lib/engine/correlation";
import { computeStress, classifyAsset, type StressHolding } from "@/lib/engine/stress";

export const runtime = "nodejs";
export const revalidate = 3600;

const SYM_RE = /^[A-Z0-9.^=-]{1,12}$/;

function parseHoldings(s: string): { sym: string; weight: number }[] {
  return s.split(",").map((p) => {
    const [sym, w] = p.split(":");
    return { sym: (sym ?? "").trim().toUpperCase(), weight: Math.abs(Number(w)) || 0 };
  }).filter((h) => SYM_RE.test(h.sym) && h.weight > 0).slice(0, 14);
}

async function closesOf(sym: string): Promise<number[]> {
  try { return (await stooqCandles(sym)).map((b) => b.c); } catch { return (await yahooChart(sym, "2y")).bars.map((b) => b.c); }
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const debug = sp.get("debug") !== null;
  const reqHoldings = parseHoldings(sp.get("holdings") ?? "SPY:0.4,QQQ:0.15,TLT:0.2,GLD:0.1,XLE:0.1,BTC-USD:0.05");
  const benchmark = (sp.get("benchmark") ?? "SPY").toUpperCase();
  if (reqHoldings.length < 1) return Response.json({ live: false, error: debug ? "no valid holdings" : undefined });

  try {
    const benchCloses = SYM_RE.test(benchmark) ? await closesOf(benchmark).catch(() => null) : null;
    const settled = await Promise.allSettled(reqHoldings.map(async (h) => ({ ...h, closes: await closesOf(h.sym) })));
    const resolved = settled.filter((r): r is PromiseFulfilledResult<{ sym: string; weight: number; closes: number[] }> => r.status === "fulfilled" && r.value.closes.length > 60);
    if (!resolved.length) throw new Error("no holdings resolved");

    const holdings: StressHolding[] = resolved.map((r) => {
      const assetClass = classifyAsset(r.value.sym);
      const b = assetClass === "equity" && benchCloses ? betaOf(r.value.closes, benchCloses, 252) : undefined;
      return { sym: r.value.sym, weight: r.value.weight, beta: b, assetClass };
    });
    const scenarios = computeStress(holdings);
    const wsum = holdings.reduce((a, h) => a + h.weight, 0) || 1;

    return Response.json({
      live: true, source: "engine·stooq", asOf: new Date().toISOString(), benchmark,
      holdings: holdings.map((h) => ({ sym: h.sym, weight: h.weight / wsum, assetClass: h.assetClass, beta: h.beta ?? null })),
      scenarios,
    });
  } catch (e) {
    return Response.json({ live: false, error: debug ? String(e) : undefined });
  }
}
