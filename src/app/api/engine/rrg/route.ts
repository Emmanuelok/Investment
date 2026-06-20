import type { NextRequest } from "next/server";
import { stooqCandles } from "@/lib/markets/providers";
import { yahooChart } from "@/lib/markets/yahoo";
import { computeRRG, type RRGResult } from "@/lib/engine/rrg";

export const runtime = "nodejs";
export const revalidate = 1800;

const SYM_RE = /^[A-Z0-9.^=-]{1,12}$/;
const SECTOR_NAMES: Record<string, string> = { XLK: "Technology", XLF: "Financials", XLE: "Energy", XLV: "Healthcare", XLI: "Industrials", XLY: "Consumer Discr", XLP: "Consumer Stapl", XLU: "Utilities", XLB: "Materials", XLRE: "Real Estate", XLC: "Communication" };

async function closesOf(sym: string): Promise<number[]> {
  try { return (await stooqCandles(sym)).map((b) => b.c); } catch { return (await yahooChart(sym, "1y")).bars.map((b) => b.c); }
}

export type RRGRow = RRGResult & { sym: string; name: string };

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const debug = sp.get("debug") !== null;
  const benchmark = (sp.get("benchmark") ?? "SPY").toUpperCase();
  const window = Math.max(5, Math.min(30, Number(sp.get("window") ?? 12) || 12));
  const symbols = (sp.get("symbols") ?? "XLK,XLF,XLE,XLV,XLI,XLY,XLP,XLU,XLB,XLRE,XLC")
    .split(",").map((s) => s.trim().toUpperCase()).filter((s) => SYM_RE.test(s)).slice(0, 16);
  if (!symbols.length) return Response.json({ live: false, error: debug ? "no valid symbols" : undefined });

  try {
    const benchCloses = await closesOf(benchmark);
    const settled = await Promise.allSettled(symbols.map(async (sym) => ({ sym, closes: await closesOf(sym) })));
    const rows: RRGRow[] = [];
    settled.forEach((r) => {
      if (r.status !== "fulfilled") return;
      const rrg = computeRRG(r.value.closes, benchCloses, window);
      if (rrg) rows.push({ ...rrg, sym: r.value.sym, name: SECTOR_NAMES[r.value.sym] ?? r.value.sym });
    });
    if (!rows.length) throw new Error("no series resolved");
    return Response.json({ live: true, source: "engine·stooq", asOf: new Date().toISOString(), benchmark, window, rows });
  } catch (e) {
    return Response.json({ live: false, error: debug ? String(e) : undefined });
  }
}
