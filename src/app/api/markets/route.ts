import type { NextRequest } from "next/server";
import type { Candle } from "@/lib/rng";
import type { IndexQuote, SectorPerf, MoverRow, FxRow, RateRow, CryptoRow } from "@/lib/data/obsidian";
import type { MarketsLive } from "@/lib/markets/types";
import { finnhubQuote, stooqCandles, binance24h, frankfurterPair, fredLatest, hasFinnhub, ytdPct, mtdPct, sparkOf, type Quote } from "@/lib/markets/providers";
import { yahooChart, compact, type Bar } from "@/lib/markets/yahoo";

export const runtime = "nodejs";
export const revalidate = 30;

/** real-time quote: Finnhub → Yahoo */
async function rtQuote(sym: string): Promise<Quote> {
  if (hasFinnhub()) { try { return await finnhubQuote(sym); } catch { /* fall */ } }
  const n = await yahooChart(sym, "5d");
  const last = n.bars.at(-1);
  return { price: n.price, prevClose: n.prevClose, open: last?.o ?? n.price, high: last?.h ?? n.price, low: last?.l ?? n.price, chg: n.price - n.prevClose, chgPct: n.prevClose ? (n.price / n.prevClose - 1) * 100 : 0 };
}
/** daily candles: Stooq → Yahoo */
async function histBars(sym: string): Promise<Bar[]> {
  try { return await stooqCandles(sym); } catch { /* fall */ }
  return (await yahooChart(sym, "1y")).bars;
}

function marketState(): string {
  const et = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
  const day = et.getDay();
  const t = et.getHours() * 60 + et.getMinutes();
  if (day === 0 || day === 6) return "CLOSED";
  if (t >= 570 && t < 960) return "OPEN";
  if (t >= 240 && t < 570) return "PRE-MARKET";
  if (t >= 960 && t < 1200) return "AFTER-HOURS";
  return "CLOSED";
}

const MOVER_UNIVERSE: [string, string][] = [["NVDA", "NVIDIA"], ["AMD", "Advanced Micro"], ["AVGO", "Broadcom"], ["MSFT", "Microsoft"], ["AAPL", "Apple"], ["META", "Meta"], ["GOOGL", "Alphabet"], ["AMZN", "Amazon"], ["TSLA", "Tesla"], ["PLTR", "Palantir"], ["SMCI", "Super Micro"], ["MSTR", "MicroStrategy"], ["COIN", "Coinbase"], ["NFLX", "Netflix"], ["MU", "Micron"], ["ARM", "Arm"], ["INTC", "Intel"], ["UBER", "Uber"], ["DELL", "Dell"], ["MRVL", "Marvell"]];

export async function GET(req: NextRequest) {
  const debug = req.nextUrl.searchParams.get("debug") !== null;
  const partial: string[] = [];
  const src = hasFinnhub() ? "finnhub" : "yahoo";

  try {
    // ── CORE: indices (must succeed) ──────────────────────────────────────
    const IDX: { sym: string; stooq: string; name: string; rt: boolean }[] = [
      { sym: "SPY", stooq: "SPY", name: "S&P 500", rt: true }, { sym: "QQQ", stooq: "QQQ", name: "Nasdaq 100", rt: true },
      { sym: "IWM", stooq: "IWM", name: "Russell 2000", rt: true }, { sym: "DIA", stooq: "DIA", name: "Dow Jones", rt: true },
      { sym: "VIX", stooq: "^VIX", name: "CBOE VIX", rt: false }, { sym: "DAX", stooq: "^GDAXI", name: "DAX 40", rt: false },
      { sym: "N225", stooq: "^N225", name: "Nikkei 225", rt: false }, { sym: "HSI", stooq: "^HSI", name: "Hang Seng", rt: false },
    ];
    let spyBars: Bar[] = [];
    const indices: IndexQuote[] = await Promise.all(IDX.map(async (ix) => {
      const bars = await histBars(ix.stooq);
      let price = bars.at(-1)!.c, prevClose = bars.at(-2)?.c ?? price;
      if (ix.rt) { try { const q = await rtQuote(ix.sym); price = q.price; prevClose = q.prevClose; } catch { /* keep close */ } }
      if (ix.sym === "SPY") spyBars = bars;
      return { sym: ix.sym, name: ix.name, last: price, chg: price - prevClose, chgPct: prevClose ? (price / prevClose - 1) * 100 : 0, ytd: ytdPct(bars, price), spark: sparkOf(bars) };
    }));

    const spyLast = spyBars.at(-1)!;
    const spy = { candles: spyBars.slice(-90).map((b) => ({ o: b.o, h: b.h, l: b.l, c: b.c, v: b.v })) as Candle[], open: spyLast.o, high: spyLast.h, low: spyLast.l, volume: spyLast.v, price: indices[0].last };

    // ── SECONDARY (graceful) ──────────────────────────────────────────────
    const SEC: [string, string][] = [["Technology", "XLK"], ["Communication", "XLC"], ["Consumer Discr", "XLY"], ["Industrials", "XLI"], ["Healthcare", "XLV"], ["Financials", "XLF"], ["Consumer Stapl", "XLP"], ["Energy", "XLE"], ["Materials", "XLB"], ["Utilities", "XLU"], ["Real Estate", "XLRE"]];
    const FX: [string, string, string][] = [["EUR/USD", "EUR", "USD"], ["GBP/USD", "GBP", "USD"], ["USD/JPY", "USD", "JPY"], ["USD/CHF", "USD", "CHF"]];
    const RATES: [string, string][] = [["2Y UST", "DGS2"], ["5Y UST", "DGS5"], ["10Y UST", "DGS10"], ["30Y UST", "DGS30"]];
    const CRYPTO: [string, string, string][] = [["BTC", "BTCUSDT", "Bitcoin"], ["ETH", "ETHUSDT", "Ethereum"], ["SOL", "SOLUSDT", "Solana"], ["XRP", "XRPUSDT", "XRP"]];

    const [secR, fxR, rateR, cryptoR, moversR, skewR] = await Promise.allSettled([
      Promise.all(SEC.map(async ([name, sym]) => {
        const [q, bars] = await Promise.all([rtQuote(sym), histBars(sym).catch(() => [] as Bar[])]);
        return { name, sym, chgPct: q.chgPct, mtd: bars.length ? mtdPct(bars, q.price) : 0, ytd: bars.length ? ytdPct(bars, q.price) : 0, intensity: Math.min(1, Math.abs(q.chgPct) / 2.5) } as SectorPerf;
      })),
      Promise.all(FX.map(async ([pair, f, t]) => { const r = await frankfurterPair(f, t); return { pair, rate: r.rate, chgPct: r.chgPct } as FxRow; })),
      Promise.all(RATES.map(async ([tenor, id]) => { const r = await fredLatest(id); return { tenor, yield: r.value, chgBps: (r.value - r.prev) * 100 } as RateRow; })),
      Promise.all(CRYPTO.map(async ([sym, pair, name]) => { const c = await binance24h(pair); return { sym, name, last: c.price, chgPct: c.chgPct, vol24h: "$" + compact(c.volUsd) } as CryptoRow; })),
      Promise.allSettled(MOVER_UNIVERSE.map(([s]) => rtQuote(s))),
      stooqCandles("^SKEW"),
    ]);

    const sectors = secR.status === "fulfilled" ? secR.value : (partial.push("sectors"), []);
    const fx = fxR.status === "fulfilled" ? fxR.value : (partial.push("fx"), []);
    const rates = rateR.status === "fulfilled" ? rateR.value : (partial.push("rates"), []);
    const crypto = cryptoR.status === "fulfilled" ? cryptoR.value : (partial.push("crypto"), []);

    let gainers: MoverRow[] = [], losers: MoverRow[] = [];
    if (moversR.status === "fulfilled") {
      const rows: MoverRow[] = [];
      moversR.value.forEach((res, i) => { if (res.status === "fulfilled") rows.push({ sym: MOVER_UNIVERSE[i][0], name: MOVER_UNIVERSE[i][1], last: res.value.price, chgPct: res.value.chgPct, vol: "—", mktcap: "—" }); });
      const sorted = [...rows].sort((a, b) => b.chgPct - a.chgPct);
      gainers = sorted.slice(0, 8); losers = sorted.slice(-8).reverse();
      if (!rows.length) partial.push("movers");
    } else partial.push("movers");

    const vix = indices.find((x) => x.sym === "VIX")?.last ?? 0;
    const skew = skewR.status === "fulfilled" ? (skewR.value.at(-1)?.c ?? 0) : (partial.push("skew"), 0);

    const payload: MarketsLive = {
      live: true, source: src, asOf: new Date().toISOString(), marketState: marketState(),
      indices, spy, sectors, gainers, losers, fx, rates, crypto, vol: { vix, skew }, partial,
    };
    return Response.json(debug ? { ...payload, _debug: { src, hasFinnhub: hasFinnhub(), partial } } : payload);
  } catch (e) {
    return Response.json({ live: false, error: debug ? String(e) : undefined });
  }
}
