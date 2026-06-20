import type { NextRequest } from "next/server";
import { finnhubProfile, stooqCandles, fredLatest } from "@/lib/markets/providers";
import { cikFor, companyFacts, latestAnnual } from "@/lib/markets/edgar";
import { mertonModel, annualizedVol, creditGrade } from "@/lib/engine/merton";

export const runtime = "nodejs";
export const revalidate = 21600; // 6h

const SYM_RE = /^[A-Z][A-Z0-9.-]{0,9}$/;

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const debug = sp.get("debug") !== null;
  const symbol = (sp.get("symbol") ?? "NVDA").toUpperCase();
  if (!SYM_RE.test(symbol)) return Response.json({ live: false, error: debug ? "bad symbol" : undefined });

  try {
    // Resolve CIK first (cheap, gates the SEC balance-sheet lookup).
    const co = await cikFor(symbol);

    const [prof, candles, facts, rate] = await Promise.allSettled([
      finnhubProfile(symbol),
      stooqCandles(symbol),
      co ? companyFacts(co.cik) : Promise.reject(new Error("no CIK")),
      fredLatest("DGS1"),
    ]);

    if (prof.status !== "fulfilled") throw new Error("no market cap");
    if (candles.status !== "fulfilled" || candles.value.length < 30) throw new Error("no price history");
    if (facts.status !== "fulfilled") throw new Error("no balance sheet");

    const equity = prof.value.marketCap;
    // Equity volatility from ~1y of daily closes (or all we have).
    const closes = candles.value.slice(-252).map((b) => b.c);
    const equityVol = annualizedVol(closes);
    if (!(equityVol > 0)) throw new Error("no equity vol");

    // Default barrier (KMV convention): current liabilities + ½·long-term debt.
    const curLiab = latestAnnual(facts.value, [["us-gaap", "LiabilitiesCurrent"]]);
    const ltd = latestAnnual(facts.value, [["us-gaap", "LongTermDebtNoncurrent"], ["us-gaap", "LongTermDebt"]]);
    const totLiab = latestAnnual(facts.value, [["us-gaap", "Liabilities"]]);
    let debt = 0;
    let barrierBasis = "";
    if (curLiab || ltd) {
      debt = (curLiab?.val ?? 0) + 0.5 * (ltd?.val ?? 0);
      barrierBasis = "current liabilities + ½ long-term debt";
    } else if (totLiab) {
      debt = totLiab.val;
      barrierBasis = "total liabilities";
    }
    if (!(debt > 0)) throw new Error("no debt barrier");

    const r = rate.status === "fulfilled" && Number.isFinite(rate.value.value) ? rate.value.value / 100 : 0.045;
    const fiscalYear = curLiab?.fy ?? ltd?.fy ?? totLiab?.fy;

    const model = mertonModel({ equity, equityVol, debt, rate: r, years: 1 });
    const grade = creditGrade(model.defaultProb);

    return Response.json({
      live: true,
      source: "engine·Finnhub+SEC+FRED",
      asOf: new Date().toISOString(),
      symbol,
      name: prof.value.name,
      inputs: {
        equity,
        equityVol,
        debt,
        barrierBasis,
        rate: r,
        years: 1,
        fiscalYear,
        rateSource: rate.status === "fulfilled" ? "FRED DGS1" : "fallback",
      },
      model,
      grade,
    });
  } catch (e) {
    return Response.json({ live: false, error: debug ? String(e) : undefined });
  }
}
