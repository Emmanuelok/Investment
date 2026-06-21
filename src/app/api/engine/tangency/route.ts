import type { NextRequest } from "next/server";
import { stooqCandles, fredLatest } from "@/lib/markets/providers";
import { yahooChart } from "@/lib/markets/yahoo";
import { logReturns } from "@/lib/engine/correlation";
import { covarianceMatrix } from "@/lib/engine/optimizer";
import { analyzeTangency, meanReturns } from "@/lib/engine/tangency";

export const runtime = "nodejs";
export const revalidate = 3600;

const SYM_RE = /^[A-Z0-9.^=-]{1,12}$/;

async function closesOf(sym: string): Promise<number[]> {
  try { return (await stooqCandles(sym)).map((b) => b.c); } catch { return (await yahooChart(sym, "1y")).bars.map((b) => b.c); }
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const debug = sp.get("debug") !== null;
  const symbols = (sp.get("symbols") ?? "SPY,QQQ,TLT,GLD,XLE,XLF,IWM,EFA")
    .split(",").map((s) => s.trim().toUpperCase()).filter((s) => SYM_RE.test(s)).slice(0, 12);
  if (symbols.length < 2) return Response.json({ live: false, error: debug ? "need ≥2 symbols" : undefined });

  try {
    const [settled, rfRes] = await Promise.all([
      Promise.allSettled(symbols.map(async (s) => ({ s, closes: await closesOf(s) }))),
      fredLatest("DGS3MO").catch(() => null),
    ]);
    const ok = settled.filter((r): r is PromiseFulfilledResult<{ s: string; closes: number[] }> => r.status === "fulfilled" && r.value.closes.length > 60);
    if (ok.length < 2) throw new Error("too few series resolved");

    const syms = ok.map((r) => r.value.s);
    const rets = ok.map((r) => logReturns(r.value.closes));
    const T = Math.min(...rets.map((r) => r.length));
    const aligned = rets.map((r) => r.slice(-T));
    const cov = covarianceMatrix(aligned);
    const mu = meanReturns(aligned);
    const rf = rfRes && Number.isFinite(rfRes.value) ? rfRes.value / 100 : 0.04;

    const result = analyzeTangency(mu, cov, rf);
    const muPct = mu.map((x) => x * 100);

    return Response.json({
      live: true,
      source: "engine·Stooq+FRED",
      asOf: new Date().toISOString(),
      symbols: syms,
      expectedReturns: muPct,
      rfSource: rfRes ? "FRED DGS3MO" : "fallback",
      ...result,
    });
  } catch (e) {
    return Response.json({ live: false, error: debug ? String(e) : undefined });
  }
}
