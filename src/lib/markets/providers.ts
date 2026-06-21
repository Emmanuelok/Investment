import type { Bar } from "@/lib/markets/yahoo";

/**
 * Server-grade data providers. Finnhub (keyed) is primary for real-time equity
 * quotes/news/fundamentals — it is built for server use and does not IP-block
 * datacenters the way Yahoo does. Finnhub's FREE tier has NO candles, so history
 * comes from Stooq (no key). Crypto via Binance, FX via Frankfurter (ECB),
 * rates via FRED — all reliable from servers, no key.
 */

const FH = "https://finnhub.io/api/v1";
const UA = "Mozilla/5.0 (compatible; PantheonTerminal/1.0)";

export const hasFinnhub = () => !!process.env.FINNHUB_API_KEY;

export type Quote = { price: number; prevClose: number; open: number; high: number; low: number; chg: number; chgPct: number };

/* ── Finnhub real-time quote ─────────────────────────────────────────────── */
export async function finnhubQuote(sym: string): Promise<Quote> {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) throw new Error("no FINNHUB_API_KEY");
  const r = await fetch(`${FH}/quote?symbol=${encodeURIComponent(sym)}&token=${key}`, { next: { revalidate: 20 }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(`finnhub quote ${sym} HTTP ${r.status}`);
  const j = (await r.json()) as { c?: number; d?: number; dp?: number; h?: number; l?: number; o?: number; pc?: number };
  if (!j.c) throw new Error(`finnhub quote ${sym} empty`);
  const pc = j.pc ?? j.c;
  return { price: j.c, prevClose: pc, open: j.o ?? j.c, high: j.h ?? j.c, low: j.l ?? j.c, chg: j.d ?? j.c - pc, chgPct: j.dp ?? (pc ? (j.c / pc - 1) * 100 : 0) };
}

/* ── Finnhub company profile (market cap / shares / sector) ──────────────── */
export type Profile = { name: string; marketCap: number; shares: number; industry: string; currency: string };
export async function finnhubProfile(sym: string): Promise<Profile> {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) throw new Error("no FINNHUB_API_KEY");
  const r = await fetch(`${FH}/stock/profile2?symbol=${encodeURIComponent(sym)}&token=${key}`, { next: { revalidate: 86400 }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(`finnhub profile ${sym} HTTP ${r.status}`);
  const j = (await r.json()) as { name?: string; marketCapitalization?: number; shareOutstanding?: number; finnhubIndustry?: string; currency?: string };
  if (!j.marketCapitalization) throw new Error(`finnhub profile ${sym} empty`);
  // Finnhub reports market cap and shares in MILLIONS.
  return { name: j.name ?? sym, marketCap: j.marketCapitalization * 1e6, shares: (j.shareOutstanding ?? 0) * 1e6, industry: j.finnhubIndustry ?? "", currency: j.currency ?? "USD" };
}

/* ── Stooq daily candles (no key) ────────────────────────────────────────── */
const STOOQ_MAP: Record<string, string> = { "^VIX": "^vix", "^GDAXI": "^dax", "^N225": "^nkx", "^HSI": "^hsi", "^GSPC": "^spx", "^IXIC": "^ndq", "^DJI": "^dji", "^SKEW": "^skew" };
function stooqSym(sym: string): string {
  if (STOOQ_MAP[sym]) return STOOQ_MAP[sym];
  if (sym.startsWith("^")) return sym.toLowerCase();
  return sym.toLowerCase() + ".us";
}
export async function stooqCandles(sym: string): Promise<Bar[]> {
  const r = await fetch(`https://stooq.com/q/d/l/?s=${stooqSym(sym)}&i=d`, { headers: { "User-Agent": UA }, next: { revalidate: 3600 }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(`stooq ${sym} HTTP ${r.status}`);
  const txt = await r.text();
  if (txt.length < 40 || /no data|exceeded/i.test(txt)) throw new Error(`stooq ${sym} no data`);
  const bars: Bar[] = txt.trim().split("\n").slice(1).map((l) => {
    const p = l.split(",");
    return { t: Date.parse(p[0]) / 1000, o: +p[1], h: +p[2], l: +p[3], c: +p[4], v: +(p[5] || 0) };
  }).filter((b) => Number.isFinite(b.c));
  if (bars.length < 2) throw new Error(`stooq ${sym} empty`);
  return bars;
}

/* ── Binance daily klines / candles (no key) ─────────────────────────────── */
export async function binanceKlines(pair: string, limit = 400): Promise<Bar[]> {
  const r = await fetch(`https://api.binance.com/api/v3/klines?symbol=${pair}&interval=1d&limit=${limit}`, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(`binance klines ${pair} HTTP ${r.status}`);
  const rows = (await r.json()) as (string | number)[][];
  if (!Array.isArray(rows) || rows.length < 2) throw new Error(`binance klines ${pair} empty`);
  return rows.map((k) => ({ t: Number(k[0]) / 1000, o: +k[1], h: +k[2], l: +k[3], c: +k[4], v: +k[5] })).filter((b) => Number.isFinite(b.c));
}

/* ── Binance crypto 24h (no key) ─────────────────────────────────────────── */
export async function binance24h(pair: string): Promise<{ price: number; chgPct: number; volUsd: number }> {
  const r = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${pair}`, { next: { revalidate: 20 }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(`binance ${pair} HTTP ${r.status}`);
  const j = (await r.json()) as { lastPrice?: string; priceChangePercent?: string; quoteVolume?: string };
  if (!j.lastPrice) throw new Error(`binance ${pair} empty`);
  return { price: +j.lastPrice, chgPct: +(j.priceChangePercent ?? 0), volUsd: +(j.quoteVolume ?? 0) };
}

/* ── Frankfurter FX (ECB, no key) ────────────────────────────────────────── */
export async function frankfurterPair(from: string, to: string): Promise<{ rate: number; chgPct: number }> {
  const start = new Date(Date.now() - 8 * 864e5).toISOString().slice(0, 10);
  const r = await fetch(`https://api.frankfurter.app/${start}..?from=${from}&to=${to}`, { next: { revalidate: 1800 }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(`frankfurter ${from}${to} HTTP ${r.status}`);
  const j = (await r.json()) as { rates?: Record<string, Record<string, number>> };
  const dates = Object.keys(j.rates ?? {}).sort();
  if (dates.length < 1) throw new Error(`frankfurter ${from}${to} empty`);
  const last = j.rates![dates[dates.length - 1]][to];
  const prev = dates.length > 1 ? j.rates![dates[dates.length - 2]][to] : last;
  return { rate: last, chgPct: prev ? (last / prev - 1) * 100 : 0 };
}

/* ── FRED yield (no key, CSV) ────────────────────────────────────────────── */
export async function fredLatest(id: string): Promise<{ value: number; prev: number }> {
  const r = await fetch(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${id}`, { headers: { "User-Agent": UA }, next: { revalidate: 3600 }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(`fred ${id} HTTP ${r.status}`);
  const rows = (await r.text()).trim().split("\n").slice(1).map((l) => l.split(",")).filter((p) => p[1] && p[1] !== ".");
  if (rows.length < 2) throw new Error(`fred ${id} empty`);
  return { value: +rows[rows.length - 1][1], prev: +rows[rows.length - 2][1] };
}

/** FRED series — the last `n` observations (date + value), no key. */
export async function fredSeries(id: string, n = 24): Promise<{ date: string; value: number }[]> {
  const r = await fetch(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${id}`, { headers: { "User-Agent": UA }, next: { revalidate: 3600 }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(`fred ${id} HTTP ${r.status}`);
  const rows = (await r.text()).trim().split("\n").slice(1).map((l) => l.split(",")).filter((p) => p[1] && p[1] !== ".");
  if (rows.length < 2) throw new Error(`fred ${id} empty`);
  return rows.slice(-n).map((p) => ({ date: p[0], value: +p[1] }));
}

/* ── Finnhub general market news ─────────────────────────────────────────── */
export type FhNews = { title: string; link: string; source: string; ts: string; tickers: string[] };
export async function finnhubNews(category = "general"): Promise<FhNews[]> {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) throw new Error("no FINNHUB_API_KEY");
  const r = await fetch(`${FH}/news?category=${category}&token=${key}`, { next: { revalidate: 120 }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(`finnhub news HTTP ${r.status}`);
  const j = (await r.json()) as Array<{ headline?: string; url?: string; source?: string; datetime?: number; related?: string }>;
  if (!Array.isArray(j) || !j.length) throw new Error("finnhub news empty");
  return j.filter((n) => n.headline && n.url).slice(0, 30).map((n) => ({
    title: n.headline!, link: n.url!, source: n.source ?? "Finnhub", ts: new Date((n.datetime ?? 0) * 1000).toISOString(),
    tickers: (n.related ?? "").split(",").filter(Boolean).slice(0, 4),
  }));
}

/* ── derive metrics from bars ────────────────────────────────────────────── */
const yr = new Date().getUTCFullYear();
const mo = new Date().getUTCMonth();
export function ytdPct(bars: Bar[], price: number): number {
  const first = bars.find((b) => new Date(b.t * 1000).getUTCFullYear() === yr) ?? bars[0];
  return first?.c ? (price / first.c - 1) * 100 : 0;
}
export function mtdPct(bars: Bar[], price: number): number {
  const first = bars.find((b) => { const d = new Date(b.t * 1000); return d.getUTCFullYear() === yr && d.getUTCMonth() === mo; });
  return first?.c ? (price / first.c - 1) * 100 : 0;
}
export const sparkOf = (bars: Bar[], k = 40) => bars.slice(-k).map((b) => b.c);
