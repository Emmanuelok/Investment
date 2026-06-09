import type { NextRequest } from "next/server";
import { finnhubQuote, stooqCandles, hasFinnhub, sparkOf, ytdPct, type Quote } from "@/lib/markets/providers";
import { yahooChart, batchQuotes, compact, type Bar, type QuoteRow } from "@/lib/markets/yahoo";

export const runtime = "nodejs";
export const revalidate = 20;

const NAMES: Record<string, string> = {
  NVDA: "NVIDIA", AMD: "Advanced Micro Devices", AVGO: "Broadcom", MSFT: "Microsoft", AAPL: "Apple", META: "Meta Platforms",
  GOOGL: "Alphabet", AMZN: "Amazon", TSLA: "Tesla", PLTR: "Palantir", SMCI: "Super Micro", MSTR: "MicroStrategy",
  COIN: "Coinbase", NFLX: "Netflix", MU: "Micron", ARM: "Arm Holdings", CRM: "Salesforce", SNAP: "Snap", RIVN: "Rivian",
  MRVL: "Marvell", INTC: "Intel", BABA: "Alibaba", UBER: "Uber", DELL: "Dell", ORCL: "Oracle", ADBE: "Adobe",
  QCOM: "Qualcomm", TXN: "Texas Instruments", JPM: "JPMorgan", BAC: "Bank of America", GS: "Goldman Sachs", V: "Visa",
  MA: "Mastercard", UNH: "UnitedHealth", LLY: "Eli Lilly", XOM: "Exxon Mobil", CVX: "Chevron", LMT: "Lockheed Martin",
  RTX: "RTX Corp", NOC: "Northrop Grumman", BA: "Boeing", CAT: "Caterpillar", DIS: "Disney", WMT: "Walmart", COST: "Costco",
  SPY: "S&P 500 ETF", QQQ: "Nasdaq 100 ETF", IWM: "Russell 2000 ETF", DIA: "Dow Jones ETF",
};

/** Real-time quote: Finnhub (server-grade) → Yahoo fallback. */
async function getQuote(sym: string): Promise<{ q: Quote; source: string }> {
  if (hasFinnhub()) {
    try { return { q: await finnhubQuote(sym), source: "finnhub" }; } catch { /* fall through */ }
  }
  const n = await yahooChart(sym, "5d");
  const last = n.bars.at(-1);
  return { q: { price: n.price, prevClose: n.prevClose, open: last?.o ?? n.price, high: last?.h ?? n.price, low: last?.l ?? n.price, chg: n.price - n.prevClose, chgPct: n.prevClose ? (n.price / n.prevClose - 1) * 100 : 0 }, source: "yahoo" };
}

/** Daily candles: Stooq (server-grade) → Yahoo fallback. */
async function getCandles(sym: string): Promise<{ bars: Bar[]; source: string }> {
  try { return { bars: await stooqCandles(sym), source: "stooq" }; } catch { /* fall through */ }
  return { bars: (await yahooChart(sym, "1y")).bars, source: "yahoo" };
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const debug = sp.get("debug") !== null;
  try {
    const single = sp.get("symbol");
    if (single) {
      const sym = single.toUpperCase();
      const [{ bars, source: cs }, quoteRes] = await Promise.all([getCandles(sym), getQuote(sym).catch(() => null)]);
      const last = bars.at(-1)!;
      const price = quoteRes?.q.price ?? last.c;
      const prevClose = quoteRes?.q.prevClose ?? bars.at(-2)?.c ?? price;
      const limit = Number(sp.get("limit") ?? 90);
      const quote = {
        sym, name: NAMES[sym] ?? sym, price, chg: price - prevClose, chgPct: prevClose ? (price / prevClose - 1) * 100 : 0,
        vol: compact(Number(last.v ?? 0)),
        open: quoteRes?.q.open ?? last.o, high: quoteRes?.q.high ?? last.h, low: quoteRes?.q.low ?? last.l, prevClose, ytd: ytdPct(bars, price),
      };
      return Response.json({ live: true, source: `${quoteRes?.source ?? cs}+${cs}`, asOf: new Date().toISOString(), quote, candles: bars.slice(-limit).map((b) => ({ o: b.o, h: b.h, l: b.l, c: b.c, v: b.v })), spark: sparkOf(bars) });
    }

    const symbols = (sp.get("symbols") ?? "").split(",").map((s) => s.trim().toUpperCase()).filter(Boolean).slice(0, 40);
    if (!symbols.length) return Response.json({ live: false, error: debug ? "no symbols param" : undefined });

    if (hasFinnhub()) {
      const settled = await Promise.allSettled(symbols.map((s) => finnhubQuote(s)));
      const rows: QuoteRow[] = [];
      settled.forEach((res, i) => {
        if (res.status !== "fulfilled") return;
        rows.push({ sym: symbols[i], name: NAMES[symbols[i]] ?? symbols[i], price: res.value.price, chg: res.value.chg, chgPct: res.value.chgPct, vol: "—", mktcap: "—", dayHigh: res.value.high, dayLow: res.value.low, prevClose: res.value.prevClose });
      });
      if (rows.length) return Response.json({ live: true, source: "finnhub", asOf: new Date().toISOString(), quotes: rows });
    }
    const { rows, source } = await batchQuotes(symbols, NAMES);
    return Response.json({ live: true, source, asOf: new Date().toISOString(), quotes: rows });
  } catch (e) {
    return Response.json({ live: false, error: debug ? String(e) : undefined });
  }
}
