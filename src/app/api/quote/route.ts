import type { NextRequest } from "next/server";
import { yahooChart, batchQuotes, chgPctOf, toCandles, compact } from "@/lib/markets/yahoo";

export const runtime = "nodejs";
export const revalidate = 30;

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

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const debug = sp.get("debug") !== null;
  try {
    const single = sp.get("symbol");
    if (single) {
      const sym = single.toUpperCase();
      const n = await yahooChart(sym, sp.get("range") ?? "3mo", sp.get("interval") ?? "1d");
      const last = n.bars.at(-1);
      const quote = {
        sym, name: NAMES[sym] ?? sym, price: n.price, chg: n.price - n.prevClose, chgPct: chgPctOf(n),
        vol: compact(Number(last?.v ?? 0)), open: last?.o ?? n.price, high: last?.h ?? n.price, low: last?.l ?? n.price, prevClose: n.prevClose,
      };
      return Response.json({ live: true, source: "yahoo", asOf: new Date().toISOString(), quote, candles: toCandles(n, Number(sp.get("limit") ?? 90)) });
    }

    const symbols = (sp.get("symbols") ?? "").split(",").map((s) => s.trim().toUpperCase()).filter(Boolean).slice(0, 50);
    if (!symbols.length) return Response.json({ live: false, error: debug ? "no symbols param" : undefined });
    const { rows, source } = await batchQuotes(symbols, NAMES);
    return Response.json({ live: true, source, asOf: new Date().toISOString(), quotes: rows });
  } catch (e) {
    return Response.json({ live: false, error: debug ? String(e) : undefined });
  }
}
