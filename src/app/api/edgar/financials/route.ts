import type { NextRequest } from "next/server";
import { stooqCandles } from "@/lib/markets/providers";
import { piotroskiFScore, altmanZScore, qualityGrade, type FinancialYear } from "@/lib/engine/fundamental-score";

export const runtime = "nodejs";
export const revalidate = 21600; // 6h

const SYM_RE = /^[A-Z][A-Z0-9.-]{0,9}$/;
const UA = process.env.SEC_EDGAR_USER_AGENT || "Pantheon Research contact@example.com";
const sec = (url: string) => fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, next: { revalidate: 21600 }, signal: AbortSignal.timeout(9000) });

type FactUnit = { end: string; val: number; fy?: number; fp?: string; form?: string };
type Facts = { entityName?: string; facts?: Record<string, Record<string, { units?: Record<string, FactUnit[]> }>> };

/** ticker → zero-padded 10-digit CIK via SEC's directory. */
async function cikFor(symbol: string): Promise<{ cik: string; title: string } | null> {
  const r = await sec("https://www.sec.gov/files/company_tickers.json");
  if (!r.ok) throw new Error(`tickers ${r.status}`);
  const j = (await r.json()) as Record<string, { cik_str: number; ticker: string; title: string }>;
  const hit = Object.values(j).find((e) => e.ticker === symbol);
  return hit ? { cik: String(hit.cik_str).padStart(10, "0"), title: hit.title } : null;
}

/** Map of fiscalYear → annual (10-K, FY) value for a concept, keeping the latest filing. */
function annualByYear(facts: Facts, taxonomy: string, concept: string): Map<number, number> {
  const out = new Map<number, number>();
  const node = facts.facts?.[taxonomy]?.[concept];
  if (!node?.units) return out;
  const arr = Object.values(node.units)[0] ?? [];
  const seenEnd = new Map<number, string>();
  for (const u of arr) {
    if (u.form !== "10-K" || u.fp !== "FY" || typeof u.fy !== "number" || typeof u.val !== "number") continue;
    const prevEnd = seenEnd.get(u.fy);
    if (!prevEnd || u.end > prevEnd) { out.set(u.fy, u.val); seenEnd.set(u.fy, u.end); }
  }
  return out;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const debug = sp.get("debug") !== null;
  const symbol = (sp.get("symbol") ?? "AAPL").toUpperCase();
  if (!SYM_RE.test(symbol)) return Response.json({ live: false, error: debug ? "bad symbol" : undefined });

  try {
    const co = await cikFor(symbol);
    if (!co) throw new Error(`no CIK for ${symbol}`);
    const fr = await sec(`https://data.sec.gov/api/xbrl/companyfacts/CIK${co.cik}.json`);
    if (!fr.ok) throw new Error(`companyfacts ${fr.status}`);
    const facts = (await fr.json()) as Facts;

    const pick = (aliases: [string, string][], fy: number): number | undefined => {
      for (const [tax, c] of aliases) { const v = annualByYear(facts, tax, c).get(fy); if (typeof v === "number") return v; }
      return undefined;
    };
    const C = {
      revenue: [["us-gaap", "RevenueFromContractWithCustomerExcludingAssessedTax"], ["us-gaap", "Revenues"], ["us-gaap", "SalesRevenueNet"]] as [string, string][],
      netIncome: [["us-gaap", "NetIncomeLoss"]] as [string, string][],
      ocf: [["us-gaap", "NetCashProvidedByUsedInOperatingActivities"], ["us-gaap", "NetCashProvidedByUsedInOperatingActivitiesContinuingOperations"]] as [string, string][],
      assets: [["us-gaap", "Assets"]] as [string, string][],
      liabilities: [["us-gaap", "Liabilities"]] as [string, string][],
      curAssets: [["us-gaap", "AssetsCurrent"]] as [string, string][],
      curLiab: [["us-gaap", "LiabilitiesCurrent"]] as [string, string][],
      ltd: [["us-gaap", "LongTermDebtNoncurrent"], ["us-gaap", "LongTermDebt"]] as [string, string][],
      gross: [["us-gaap", "GrossProfit"]] as [string, string][],
      retained: [["us-gaap", "RetainedEarningsAccumulatedDeficit"]] as [string, string][],
      ebit: [["us-gaap", "OperatingIncomeLoss"]] as [string, string][],
      equity: [["us-gaap", "StockholdersEquity"], ["us-gaap", "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest"]] as [string, string][],
      shares: [["dei", "EntityCommonStockSharesOutstanding"], ["us-gaap", "CommonStockSharesOutstanding"]] as [string, string][],
    };

    // determine the two most recent fiscal years present (from Assets, the most universal concept)
    const years = [...annualByYear(facts, "us-gaap", "Assets").keys()].sort((a, b) => b - a);
    if (years.length < 2) throw new Error("insufficient annual history");
    const [cy, py] = years;
    const build = (fy: number): FinancialYear => ({
      fiscalYear: fy, revenue: pick(C.revenue, fy), netIncome: pick(C.netIncome, fy), operatingCashFlow: pick(C.ocf, fy),
      totalAssets: pick(C.assets, fy), totalLiabilities: pick(C.liabilities, fy), currentAssets: pick(C.curAssets, fy), currentLiabilities: pick(C.curLiab, fy),
      longTermDebt: pick(C.ltd, fy), grossProfit: pick(C.gross, fy), retainedEarnings: pick(C.retained, fy), ebit: pick(C.ebit, fy),
      stockholdersEquity: pick(C.equity, fy), sharesOutstanding: pick(C.shares, fy),
    });
    const cur = build(cy), prior = build(py);

    // market cap (for Altman X4) from real price × shares, no key
    if (typeof cur.sharesOutstanding === "number") {
      try { const px = (await stooqCandles(symbol)).at(-1)?.c; if (px) cur.marketCap = px * cur.sharesOutstanding; } catch { /* optional */ }
    }

    const piotroski = piotroskiFScore(cur, prior);
    const altman = altmanZScore(cur);
    const quality = qualityGrade({
      profitMargin: cur.revenue ? ((cur.netIncome ?? 0) / cur.revenue) * 100 : undefined,
      grossMargin: cur.revenue && cur.grossProfit != null ? (cur.grossProfit / cur.revenue) * 100 : undefined,
      roe: cur.stockholdersEquity ? ((cur.netIncome ?? 0) / cur.stockholdersEquity) * 100 : undefined,
      revenueGrowth: cur.revenue && prior.revenue ? (cur.revenue / prior.revenue - 1) * 100 : undefined,
      debtToEquity: cur.stockholdersEquity ? ((cur.totalLiabilities ?? 0) / cur.stockholdersEquity) * 100 : undefined,
    });

    return Response.json({ live: true, source: "SEC EDGAR XBRL", asOf: new Date().toISOString(), symbol, cik: co.cik, name: facts.entityName ?? co.title, cur, prior, piotroski, altman, quality });
  } catch (e) {
    return Response.json({ live: false, error: debug ? String(e) : undefined });
  }
}
