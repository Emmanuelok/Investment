import type { NextRequest } from "next/server";
import type { Candle } from "@/lib/rng";
import type { IndexQuote, SectorPerf, MoverRow, FxRow, RateRow, CryptoRow } from "@/lib/data/obsidian";
import type { MarketsLive } from "@/lib/markets/types";

export const runtime = "nodejs";
export const revalidate = 30;

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36";

type Bar = { t: number; o: number; h: number; l: number; c: number; v: number };
type Norm = { price: number; prevClose: number; marketState: string; bars: Bar[] };

/* ── providers ───────────────────────────────────────────────────────────── */

async function yahooChart(sym: string, range = "1y", interval = "1d"): Promise<Norm> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=${range}&interval=${interval}`;
  const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, next: { revalidate: 30 } });
  if (!r.ok) throw new Error(`yahoo ${sym} HTTP ${r.status}`);
  const j = (await r.json()) as { chart?: { result?: Array<{ meta?: Record<string, number | string>; timestamp?: number[]; indicators?: { quote?: Array<Record<string, Array<number | null>>> } }> } };
  const res = j?.chart?.result?.[0];
  if (!res?.meta) throw new Error(`yahoo ${sym} empty`);
  const ts = res.timestamp ?? [];
  const q = res.indicators?.quote?.[0] ?? {};
  const bars: Bar[] = ts
    .map((t, i) => ({ t, o: Number(q.open?.[i]), h: Number(q.high?.[i]), l: Number(q.low?.[i]), c: Number(q.close?.[i]), v: Number(q.volume?.[i]) }))
    .filter((b) => Number.isFinite(b.c));
  const price = Number(res.meta.regularMarketPrice ?? bars.at(-1)?.c);
  const prevClose = Number(res.meta.chartPreviousClose ?? res.meta.previousClose ?? bars.at(-2)?.c ?? price);
  return { price, prevClose, marketState: String(res.meta.marketState ?? ""), bars };
}

async function twelveSeries(sym: string): Promise<Norm> {
  const key = process.env.TWELVEDATA_API_KEY;
  const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(sym)}&interval=1day&outputsize=300&apikey=${key}`;
  const r = await fetch(url, { next: { revalidate: 30 } });
  if (!r.ok) throw new Error(`twelvedata ${sym} HTTP ${r.status}`);
  const j = (await r.json()) as { status?: string; message?: string; values?: Array<Record<string, string>> };
  if (j.status === "error" || !Array.isArray(j.values)) throw new Error(`twelvedata ${sym} ${j.message ?? "no values"}`);
  const bars: Bar[] = j.values
    .map((v) => ({ t: Date.parse(v.datetime) / 1000, o: +v.open, h: +v.high, l: +v.low, c: +v.close, v: +(v.volume ?? 0) }))
    .filter((b) => Number.isFinite(b.c))
    .reverse();
  const price = bars.at(-1)?.c ?? 0;
  const prevClose = bars.at(-2)?.c ?? price;
  return { price, prevClose, marketState: "", bars };
}

const TD_SUPPORTED = new Set(["SPY", "QQQ", "IWM", "DIA", "XLK", "XLC", "XLY", "XLI", "XLV", "XLF", "XLP", "XLE", "XLB", "XLU", "XLRE"]);

async function getChart(display: string, yahoo: string, ctx: { td: boolean }): Promise<Norm> {
  if (process.env.TWELVEDATA_API_KEY && TD_SUPPORTED.has(display)) {
    try {
      const n = await twelveSeries(display);
      ctx.td = true;
      return n;
    } catch {
      /* fall through to yahoo */
    }
  }
  return yahooChart(yahoo);
}

/* ── derived metrics ─────────────────────────────────────────────────────── */

const now = new Date();
const yr = now.getUTCFullYear();
const mo = now.getUTCMonth();
const chgPct = (n: Norm) => (n.prevClose ? (n.price / n.prevClose - 1) * 100 : 0);
function ytdPct(n: Norm): number {
  const first = n.bars.find((b) => new Date(b.t * 1000).getUTCFullYear() === yr) ?? n.bars[0];
  return first?.c ? (n.price / first.c - 1) * 100 : 0;
}
function mtdPct(n: Norm): number {
  const first = n.bars.find((b) => { const d = new Date(b.t * 1000); return d.getUTCFullYear() === yr && d.getUTCMonth() === mo; });
  return first?.c ? (n.price / first.c - 1) * 100 : 0;
}
const spark = (n: Norm, k = 40) => n.bars.slice(-k).map((b) => b.c);

function compact(n: number): string {
  if (!Number.isFinite(n)) return "—";
  const a = Math.abs(n);
  if (a >= 1e12) return (n / 1e12).toFixed(1) + "T";
  if (a >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (a >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (a >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return String(Math.round(n));
}

function marketLabel(s: string): string {
  if (s === "REGULAR") return "OPEN";
  if (s.startsWith("PRE")) return "PRE-MARKET";
  if (s.startsWith("POST")) return "AFTER-HOURS";
  if (s === "CLOSED") return "CLOSED";
  return s || "—";
}

/* ── movers ──────────────────────────────────────────────────────────────── */

const MOVER_NAMES: Record<string, string> = { NVDA: "NVIDIA", AMD: "Advanced Micro", AVGO: "Broadcom", MSFT: "Microsoft", AAPL: "Apple", META: "Meta Platforms", GOOGL: "Alphabet", AMZN: "Amazon", TSLA: "Tesla", PLTR: "Palantir", SMCI: "Super Micro", MSTR: "MicroStrategy", COIN: "Coinbase", NFLX: "Netflix", MU: "Micron", ARM: "Arm Holdings", CRM: "Salesforce", SNAP: "Snap", RIVN: "Rivian", MRVL: "Marvell", INTC: "Intel", BABA: "Alibaba", UBER: "Uber", DELL: "Dell" };
const UNIVERSE = Object.keys(MOVER_NAMES);

async function screener(scrId: string): Promise<MoverRow[]> {
  const url = `https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?count=10&scrIds=${scrId}`;
  const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, next: { revalidate: 60 } });
  if (!r.ok) throw new Error(`screener ${scrId} HTTP ${r.status}`);
  const j = (await r.json()) as { finance?: { result?: Array<{ quotes?: Array<Record<string, number | string>> }> } };
  const quotes = j?.finance?.result?.[0]?.quotes ?? [];
  if (!quotes.length) throw new Error(`screener ${scrId} empty`);
  return quotes.slice(0, 8).map((q) => ({
    sym: String(q.symbol),
    name: String(q.shortName ?? q.longName ?? q.symbol),
    last: Number(q.regularMarketPrice ?? 0),
    chgPct: Number(q.regularMarketChangePercent ?? 0),
    vol: compact(Number(q.regularMarketVolume ?? 0)),
    mktcap: "$" + compact(Number(q.marketCap ?? 0)),
  }));
}

async function moversFromUniverse(): Promise<{ gainers: MoverRow[]; losers: MoverRow[] }> {
  const norms = await Promise.allSettled(UNIVERSE.map((s) => yahooChart(s, "5d")));
  const rows: MoverRow[] = [];
  norms.forEach((res, i) => {
    if (res.status !== "fulfilled") return;
    const n = res.value;
    const last = n.bars.at(-1);
    rows.push({ sym: UNIVERSE[i], name: MOVER_NAMES[UNIVERSE[i]], last: n.price, chgPct: chgPct(n), vol: compact(Number(last?.v ?? 0)), mktcap: "—" });
  });
  const sorted = [...rows].sort((a, b) => b.chgPct - a.chgPct);
  return { gainers: sorted.slice(0, 8), losers: sorted.slice(-8).reverse() };
}

/* ── handler ─────────────────────────────────────────────────────────────── */

export async function GET(req: NextRequest) {
  const debug = req.nextUrl.searchParams.get("debug") !== null;
  const partial: string[] = [];
  const ctx = { td: false };

  try {
    // CORE — indices (must succeed) + SPY chart
    const idxDefs: [string, string, string][] = [
      ["SPY", "SPY", "S&P 500"], ["QQQ", "QQQ", "Nasdaq 100"], ["IWM", "IWM", "Russell 2000"], ["DIA", "DIA", "Dow Jones"],
      ["VIX", "^VIX", "CBOE VIX"], ["DAX", "^GDAXI", "DAX 40"], ["N225", "^N225", "Nikkei 225"], ["HSI", "^HSI", "Hang Seng"],
    ];
    const idxNorms = await Promise.all(idxDefs.map(([d, y]) => getChart(d, y, ctx)));
    const indices: IndexQuote[] = idxDefs.map(([sym, , name], i) => {
      const n = idxNorms[i];
      return { sym, name, last: n.price, chg: n.price - n.prevClose, chgPct: chgPct(n), ytd: ytdPct(n), spark: spark(n) };
    });

    const spyN = idxNorms[0];
    const spyBars = spyN.bars.slice(-90);
    const candles: Candle[] = spyBars.map((b) => ({ o: b.o, h: b.h, l: b.l, c: b.c, v: b.v }));
    const lastBar = spyBars.at(-1);
    const spy = { candles, open: lastBar?.o ?? spyN.price, high: lastBar?.h ?? spyN.price, low: lastBar?.l ?? spyN.price, volume: lastBar?.v ?? 0, price: spyN.price };

    // SECONDARY — settled so a failure degrades that panel only
    const secDefs: [string, string][] = [["Technology", "XLK"], ["Communication", "XLC"], ["Consumer Discr", "XLY"], ["Industrials", "XLI"], ["Healthcare", "XLV"], ["Financials", "XLF"], ["Consumer Stapl", "XLP"], ["Energy", "XLE"], ["Materials", "XLB"], ["Utilities", "XLU"], ["Real Estate", "XLRE"]];
    const cryptoDefs: [string, string, string][] = [["BTC", "BTC-USD", "Bitcoin"], ["ETH", "ETH-USD", "Ethereum"], ["SOL", "SOL-USD", "Solana"], ["XRP", "XRP-USD", "XRP"]];
    const fxDefs: [string, string][] = [["EUR/USD", "EURUSD=X"], ["GBP/USD", "GBPUSD=X"], ["USD/JPY", "JPY=X"], ["USD/CHF", "CHF=X"]];
    const rateDefs: [string, string][] = [["3M UST", "^IRX"], ["5Y UST", "^FVX"], ["10Y UST", "^TNX"], ["30Y UST", "^TYX"]];

    const [secRes, cryptoRes, fxRes, rateRes, skewRes, gainRes, loseRes] = await Promise.allSettled([
      Promise.all(secDefs.map(([, y]) => getChart(y, y, ctx))),
      Promise.all(cryptoDefs.map(([, y]) => yahooChart(y, "5d"))),
      Promise.all(fxDefs.map(([, y]) => yahooChart(y, "5d"))),
      Promise.all(rateDefs.map(([, y]) => yahooChart(y, "5d"))),
      yahooChart("^SKEW", "5d"),
      screener("day_gainers"),
      screener("day_losers"),
    ]);

    let sectors: SectorPerf[] = [];
    if (secRes.status === "fulfilled") {
      sectors = secDefs.map(([name, sym], i) => { const nm = secRes.value[i]; return { name, sym, chgPct: chgPct(nm), mtd: mtdPct(nm), ytd: ytdPct(nm), intensity: Math.min(1, Math.abs(chgPct(nm)) / 2.5) }; });
    } else partial.push("sectors");

    let crypto: CryptoRow[] = [];
    if (cryptoRes.status === "fulfilled") {
      crypto = cryptoDefs.map(([sym, , name], i) => { const n = cryptoRes.value[i]; const last = n.bars.at(-1); return { sym, name, last: n.price, chgPct: chgPct(n), vol24h: "$" + compact(Number(last?.v ?? 0) * n.price) }; });
    } else partial.push("crypto");

    let fx: FxRow[] = [];
    if (fxRes.status === "fulfilled") fx = fxDefs.map(([pair], i) => ({ pair, rate: fxRes.value[i].price, chgPct: chgPct(fxRes.value[i]) }));
    else partial.push("fx");

    let rates: RateRow[] = [];
    if (rateRes.status === "fulfilled") rates = rateDefs.map(([tenor], i) => ({ tenor, yield: rateRes.value[i].price, chgBps: (rateRes.value[i].price - rateRes.value[i].prevClose) * 100 }));
    else partial.push("rates");

    const vix = indices.find((x) => x.sym === "VIX")?.last ?? 0;
    const skew = skewRes.status === "fulfilled" ? skewRes.value.price : 0;
    if (skewRes.status !== "fulfilled") partial.push("skew");

    let gainers: MoverRow[] = [];
    let losers: MoverRow[] = [];
    if (gainRes.status === "fulfilled" && loseRes.status === "fulfilled") {
      gainers = gainRes.value; losers = loseRes.value;
    } else {
      try {
        const u = await moversFromUniverse();
        gainers = u.gainers; losers = u.losers; partial.push("movers:computed");
      } catch { partial.push("movers"); }
    }

    const payload: MarketsLive = {
      live: true,
      source: ctx.td ? "twelvedata" : "yahoo",
      asOf: new Date().toISOString(),
      marketState: marketLabel(idxNorms.find((n) => n.marketState)?.marketState ?? ""),
      indices, spy, sectors, gainers, losers, fx, rates, crypto,
      vol: { vix, skew },
      partial,
    };
    return Response.json(debug ? { ...payload, _debug: { ctx, partial } } : payload);
  } catch (e) {
    return Response.json({ live: false, error: debug ? String(e) : undefined });
  }
}
