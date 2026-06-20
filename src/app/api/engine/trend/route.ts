import type { NextRequest } from "next/server";
import { stooqCandles } from "@/lib/markets/providers";
import { yahooChart } from "@/lib/markets/yahoo";
import { weightedMomentum, rsRating, relativeReturn, rsLine, rsNewHigh } from "@/lib/engine/relative-strength";
import { trendTemplate, type TTCriterion } from "@/lib/engine/trend-template";
import type { Candle } from "@/lib/rng";

export const runtime = "nodejs";
export const revalidate = 1800;

const SYM_RE = /^[A-Z0-9.^=-]{1,12}$/;

async function candlesOf(sym: string): Promise<Candle[]> {
  let bars;
  try { bars = await stooqCandles(sym); } catch { bars = (await yahooChart(sym, "2y")).bars; }
  return bars.map((b) => ({ o: b.o, h: b.h, l: b.l, c: b.c, v: b.v }));
}

export type TrendRow = {
  sym: string; price: number; chgPct: number; momentum: number; rsRating: number;
  relRet63: number | null; rsNewHigh: boolean | null;
  trendPass: number; trendMax: number; trendPassed: boolean; criteria: TTCriterion[];
};

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const debug = sp.get("debug") !== null;
  const benchmark = (sp.get("benchmark") ?? "SPY").toUpperCase();
  const symbols = (sp.get("symbols") ?? "NVDA,AAPL,MSFT,AMZN,META,GOOGL,TSLA,AMD,AVGO,LLY,JPM,XOM,COST,NFLX,CRM,UNH")
    .split(",").map((s) => s.trim().toUpperCase()).filter((s) => SYM_RE.test(s)).slice(0, 24);
  if (!symbols.length) return Response.json({ live: false, error: debug ? "no valid symbols" : undefined });

  try {
    const benchCloses = SYM_RE.test(benchmark) ? await candlesOf(benchmark).then((c) => c.map((x) => x.c)).catch(() => null) : null;
    const settled = await Promise.allSettled(symbols.map(async (sym) => ({ sym, candles: await candlesOf(sym) })));
    const ok = settled.filter((r): r is PromiseFulfilledResult<{ sym: string; candles: Candle[] }> => r.status === "fulfilled" && r.value.candles.length > 30);
    if (!ok.length) throw new Error("no symbols resolved");

    const withScore = ok.map((r) => ({ ...r.value, closes: r.value.candles.map((c) => c.c), momentum: weightedMomentum(r.value.candles.map((c) => c.c)) }));
    const allScores = withScore.map((w) => w.momentum);

    const rows: TrendRow[] = withScore.map((w) => {
      const rs = rsRating(w.momentum, allScores);
      const tt = trendTemplate(w.candles, rs);
      const last = w.closes[w.closes.length - 1];
      const prev = w.closes[w.closes.length - 2] ?? last;
      return {
        sym: w.sym, price: last, chgPct: prev ? (last / prev - 1) * 100 : 0, momentum: w.momentum, rsRating: rs,
        relRet63: benchCloses ? relativeReturn(w.closes, benchCloses, 63) : null,
        rsNewHigh: benchCloses ? rsNewHigh(rsLine(w.closes, benchCloses)) : null,
        trendPass: tt.pass, trendMax: tt.max, trendPassed: tt.passed, criteria: tt.criteria,
      };
    });
    rows.sort((a, b) => b.rsRating - a.rsRating || b.trendPass - a.trendPass);

    return Response.json({ live: true, source: "engine·stooq", asOf: new Date().toISOString(), benchmark, scanned: ok.length, rows });
  } catch (e) {
    return Response.json({ live: false, error: debug ? String(e) : undefined });
  }
}
