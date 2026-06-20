import type { NextRequest } from "next/server";
import { stooqCandles } from "@/lib/markets/providers";
import { yahooChart } from "@/lib/markets/yahoo";
import { logReturns } from "@/lib/engine/correlation";
import { covarianceMatrix, portfolioVol, riskContributions, buildWeights, type Scheme } from "@/lib/engine/optimizer";

export const runtime = "nodejs";
export const revalidate = 3600;

const SYM_RE = /^[A-Z0-9.^=-]{1,12}$/;
const SCHEMES: Scheme[] = ["equal", "inverseVol", "riskParity", "minVariance"];

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
    const settled = await Promise.allSettled(symbols.map(async (s) => ({ s, closes: await closesOf(s) })));
    const ok = settled.filter((r): r is PromiseFulfilledResult<{ s: string; closes: number[] }> => r.status === "fulfilled" && r.value.closes.length > 60);
    if (ok.length < 2) throw new Error("too few series resolved");
    const syms = ok.map((r) => r.value.s);
    const rets = ok.map((r) => logReturns(r.value.closes));
    const T = Math.min(...rets.map((r) => r.length));
    const aligned = rets.map((r) => r.slice(-T));
    const cov = covarianceMatrix(aligned);
    const mu = aligned.map((r) => (r.reduce((a, b) => a + b, 0) / r.length) * 252);

    const schemes = Object.fromEntries(SCHEMES.map((scheme) => {
      const w = buildWeights(scheme, cov);
      const vol = portfolioVol(w, cov);
      const ret = w.reduce((a, wi, i) => a + wi * mu[i], 0);
      return [scheme, {
        weights: w.map((x) => Math.round(x * 1e4) / 1e4),
        volPct: vol * 100, retPct: ret * 100, sharpe: vol > 0 ? ret / vol : 0,
        riskContrib: riskContributions(w, cov).map((x) => Math.round(x * 10) / 10),
      }];
    }));

    return Response.json({ live: true, source: "engine·stooq", asOf: new Date().toISOString(), symbols: syms, schemes });
  } catch (e) {
    return Response.json({ live: false, error: debug ? String(e) : undefined });
  }
}
