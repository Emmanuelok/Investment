import type { NextRequest } from "next/server";
import { UA } from "@/lib/markets/yahoo";
import type { Fundamentals } from "@/lib/markets/types";

export const runtime = "nodejs";
export const revalidate = 300;

const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
const pct = (v: unknown): number | undefined => { const n = num(v); return n === undefined ? undefined : n * 100; };

/* ── Finnhub (FINNHUB_API_KEY) ───────────────────────────────────────────── */
async function finnhub(sym: string): Promise<Fundamentals> {
  const key = process.env.FINNHUB_API_KEY;
  const [pR, mR] = await Promise.all([
    fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${sym}&token=${key}`, { next: { revalidate: 300 } }),
    fetch(`https://finnhub.io/api/v1/stock/metric?symbol=${sym}&metric=all&token=${key}`, { next: { revalidate: 300 } }),
  ]);
  if (!pR.ok || !mR.ok) throw new Error(`finnhub ${pR.status}/${mR.status}`);
  const prof = (await pR.json()) as Record<string, unknown>;
  const m = ((await mR.json()) as { metric?: Record<string, unknown> }).metric ?? {};
  if (!prof.name && m.peTTM === undefined) throw new Error("finnhub empty");
  return {
    symbol: sym, name: String(prof.name ?? sym), sector: prof.finnhubIndustry as string, industry: prof.finnhubIndustry as string, exchange: prof.exchange as string,
    marketCap: prof.marketCapitalization ? Number(prof.marketCapitalization) * 1e6 : undefined,
    sharesOut: prof.shareOutstanding ? Number(prof.shareOutstanding) * 1e6 : undefined,
    peTrailing: num(m.peTTM), priceToBook: num(m.pbAnnual ?? m.pbQuarterly), eps: num(m.epsTTM ?? m.epsInclExtraItemsTTM),
    beta: num(m.beta), dividendYield: num(m.dividendYieldIndicatedAnnual ?? m.currentDividendYieldTTM),
    profitMargin: num(m.netProfitMarginTTM), grossMargin: num(m.grossMarginTTM), operatingMargin: num(m.operatingMarginTTM),
    revenueGrowth: num(m.revenueGrowthTTMYoy), roe: num(m.roeTTM),
    week52High: num(m["52WeekHigh"]), week52Low: num(m["52WeekLow"]),
  };
}

/* ── Financial Modeling Prep (FMP_API_KEY) ───────────────────────────────── */
async function fmp(sym: string): Promise<Fundamentals> {
  const key = process.env.FMP_API_KEY;
  const [pR, rR] = await Promise.all([
    fetch(`https://financialmodelingprep.com/api/v3/profile/${sym}?apikey=${key}`, { next: { revalidate: 300 } }),
    fetch(`https://financialmodelingprep.com/api/v3/ratios-ttm/${sym}?apikey=${key}`, { next: { revalidate: 300 } }),
  ]);
  if (!pR.ok) throw new Error(`fmp ${pR.status}`);
  const prof = ((await pR.json()) as Record<string, unknown>[])[0];
  const rt = (rR.ok ? ((await rR.json()) as Record<string, unknown>[])[0] : {}) ?? {};
  if (!prof) throw new Error("fmp empty");
  const [lo, hi] = String(prof.range ?? "").split("-").map((s) => parseFloat(s));
  return {
    symbol: sym, name: String(prof.companyName ?? sym), sector: prof.sector as string, industry: prof.industry as string, exchange: prof.exchangeShortName as string,
    price: num(prof.price), marketCap: num(prof.mktCap), beta: num(prof.beta),
    peTrailing: num(rt.peRatioTTM), priceToBook: num(rt.priceToBookRatioTTM), pegRatio: num(rt.pegRatioTTM),
    dividendYield: pct(rt.dividendYieldTTM), profitMargin: pct(rt.netProfitMarginTTM), grossMargin: pct(rt.grossProfitMarginTTM),
    operatingMargin: pct(rt.operatingProfitMarginTTM), roe: pct(rt.returnOnEquityTTM), debtToEquity: num(rt.debtEquityRatioTTM),
    week52Low: Number.isFinite(lo) ? lo : undefined, week52High: Number.isFinite(hi) ? hi : undefined,
  };
}

/* ── Yahoo quoteSummary (no key, needs crumb) ────────────────────────────── */
async function yahooCrumb(): Promise<{ cookie: string; crumb: string }> {
  const r1 = await fetch("https://fc.yahoo.com", { headers: { "User-Agent": UA } });
  const h = r1.headers as Headers & { getSetCookie?: () => string[] };
  const raw = h.getSetCookie?.() ?? [r1.headers.get("set-cookie") ?? ""];
  const cookie = raw.map((c) => c.split(";")[0]).filter(Boolean).join("; ");
  if (!cookie) throw new Error("no cookie");
  const r2 = await fetch("https://query1.finance.yahoo.com/v1/test/getcrumb", { headers: { "User-Agent": UA, Cookie: cookie, Accept: "text/plain" } });
  const crumb = (await r2.text()).trim();
  if (!crumb || crumb.length > 40 || crumb.includes("<")) throw new Error("bad crumb");
  return { cookie, crumb };
}

type YSec = Record<string, { raw?: number } | undefined> & { longName?: string; shortName?: string; exchangeName?: string; sector?: string; industry?: string; recommendationKey?: string };
async function yahooFund(sym: string): Promise<Fundamentals> {
  const { cookie, crumb } = await yahooCrumb();
  const modules = "price,summaryDetail,defaultKeyStatistics,financialData,assetProfile";
  const r = await fetch(`https://query1.finance.yahoo.com/v10/finance/quoteSummary/${sym}?modules=${modules}&crumb=${encodeURIComponent(crumb)}`, { headers: { "User-Agent": UA, Cookie: cookie }, next: { revalidate: 300 } });
  if (!r.ok) throw new Error(`quoteSummary ${r.status}`);
  const res = ((await r.json()) as { quoteSummary?: { result?: Array<Record<string, YSec>> } })?.quoteSummary?.result?.[0];
  if (!res) throw new Error("quoteSummary empty");
  const price = res.price ?? {}, sd = res.summaryDetail ?? {}, ks = res.defaultKeyStatistics ?? {}, fd = res.financialData ?? {}, ap = res.assetProfile ?? {};
  const raw = (o: { raw?: number } | undefined) => (o && typeof o.raw === "number" ? o.raw : undefined);
  const rawPct = (o: { raw?: number } | undefined) => { const v = raw(o); return v === undefined ? undefined : v * 100; };
  return {
    symbol: sym, name: price.longName ?? price.shortName ?? sym, sector: ap.sector, industry: ap.industry, exchange: price.exchangeName,
    price: raw(price.regularMarketPrice), marketCap: raw(price.marketCap), sharesOut: raw(ks.sharesOutstanding),
    peTrailing: raw(sd.trailingPE), peForward: raw(sd.forwardPE), pegRatio: raw(ks.pegRatio), priceToBook: raw(ks.priceToBook),
    eps: raw(ks.trailingEps), beta: raw(sd.beta), dividendYield: rawPct(sd.dividendYield),
    profitMargin: rawPct(fd.profitMargins), grossMargin: rawPct(fd.grossMargins), operatingMargin: rawPct(fd.operatingMargins),
    revenue: raw(fd.totalRevenue), revenueGrowth: rawPct(fd.revenueGrowth), roe: rawPct(fd.returnOnEquity), debtToEquity: raw(fd.debtToEquity),
    week52High: raw(sd.fiftyTwoWeekHigh), week52Low: raw(sd.fiftyTwoWeekLow),
    targetMean: raw(fd.targetMeanPrice), targetHigh: raw(fd.targetHighPrice), targetLow: raw(fd.targetLowPrice), recommendation: fd.recommendationKey,
  };
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const debug = sp.get("debug") !== null;
  const sym = (sp.get("symbol") ?? "AAPL").toUpperCase();
  const attempts: [string, () => Promise<Fundamentals>][] = [];
  if (process.env.FINNHUB_API_KEY) attempts.push(["finnhub", () => finnhub(sym)]);
  if (process.env.FMP_API_KEY) attempts.push(["fmp", () => fmp(sym)]);
  attempts.push(["yahoo", () => yahooFund(sym)]);

  const errs: string[] = [];
  for (const [source, fn] of attempts) {
    try {
      const fundamentals = await fn();
      return Response.json({ live: true, source, asOf: new Date().toISOString(), fundamentals });
    } catch (e) { errs.push(`${source}: ${e}`); }
  }
  return Response.json({ live: false, error: debug ? errs.join(" | ") : undefined });
}
