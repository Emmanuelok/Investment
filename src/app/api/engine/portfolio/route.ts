import type { NextRequest } from "next/server";
import { stooqCandles } from "@/lib/markets/providers";
import { yahooChart } from "@/lib/markets/yahoo";
import { analyzePortfolio, type Holding } from "@/lib/engine/portfolio";

export const runtime = "nodejs";
export const revalidate = 1800;

const SYM_RE = /^[A-Z0-9.^=-]{1,12}$/;

/** holdings param: "SPY:0.4,QQQ:0.3,TLT:0.2,GLD:0.1" */
function parseHoldings(s: string): { sym: string; weight: number }[] {
  return s.split(",").map((part) => {
    const [sym, w] = part.split(":");
    return { sym: (sym ?? "").trim().toUpperCase(), weight: Math.abs(Number(w)) || 0 };
  }).filter((h) => SYM_RE.test(h.sym) && h.weight > 0).slice(0, 12);
}

async function closesOf(sym: string): Promise<number[]> {
  try { return (await stooqCandles(sym)).map((b) => b.c); } catch { return (await yahooChart(sym, "1y")).bars.map((b) => b.c); }
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const debug = sp.get("debug") !== null;
  const reqHoldings = parseHoldings(sp.get("holdings") ?? "SPY:0.4,QQQ:0.25,TLT:0.2,GLD:0.15");
  const bench = (sp.get("benchmark") ?? "SPY").toUpperCase();
  if (reqHoldings.length < 1) return Response.json({ live: false, error: debug ? "no valid holdings" : undefined });

  try {
    const resolved = await Promise.allSettled(reqHoldings.map(async (h) => ({ ...h, closes: await closesOf(h.sym) })));
    const holdings: Holding[] = resolved.filter((r): r is PromiseFulfilledResult<Holding> => r.status === "fulfilled" && r.value.closes.length > 30).map((r) => r.value);
    if (!holdings.length) throw new Error("no holdings resolved");
    let benchCloses: number[] | undefined;
    if (SYM_RE.test(bench)) { try { benchCloses = await closesOf(bench); } catch { /* optional */ } }
    const report = analyzePortfolio(holdings, benchCloses);
    return Response.json({ live: true, source: "engine·stooq", asOf: new Date().toISOString(), benchmark: bench, ...report });
  } catch (e) {
    return Response.json({ live: false, error: debug ? String(e) : undefined });
  }
}
