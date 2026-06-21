import type { NextRequest } from "next/server";
import { stooqCandles } from "@/lib/markets/providers";
import { yahooChart } from "@/lib/markets/yahoo";
import { computeBreadth, type Member } from "@/lib/engine/breadth";

export const runtime = "nodejs";
export const revalidate = 3600; // 1h

const SYM_RE = /^[A-Z0-9.^=-]{1,12}$/;

// A broad large-cap basket — representative S&P participation, good Stooq coverage.
const DEFAULT_BASKET = [
  "AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "META", "TSLA", "AVGO", "JPM", "V",
  "UNH", "XOM", "JNJ", "WMT", "MA", "PG", "HD", "COST", "ORCL", "BAC",
  "KO", "PEP", "CVX", "ABBV", "MRK", "ADBE", "CRM", "NFLX", "AMD", "INTC",
  "CSCO", "QCOM", "TXN", "DIS", "MCD", "CAT",
];

async function closesOf(sym: string): Promise<number[]> {
  try {
    return (await stooqCandles(sym)).map((b) => b.c);
  } catch {
    return (await yahooChart(sym, "2y")).bars.map((b) => b.c);
  }
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const debug = sp.get("debug") !== null;
  const param = sp.get("symbols");
  const symbols = (param ? param.split(",").map((s) => s.trim().toUpperCase()) : DEFAULT_BASKET)
    .filter((s) => SYM_RE.test(s)).slice(0, 50);
  if (symbols.length < 5) return Response.json({ live: false, error: debug ? "need ≥5 symbols" : undefined });

  try {
    const settled = await Promise.allSettled(symbols.map(async (s) => ({ symbol: s, closes: await closesOf(s) })));
    const members: Member[] = settled
      .filter((r): r is PromiseFulfilledResult<Member> => r.status === "fulfilled" && r.value.closes.length >= 60)
      .map((r) => r.value);
    if (members.length < 10) throw new Error(`too few members resolved (${members.length})`);

    const report = computeBreadth(members);
    return Response.json({ live: true, source: "engine·Stooq", asOf: new Date().toISOString(), universe: members.length, ...report });
  } catch (e) {
    return Response.json({ live: false, error: debug ? String(e) : undefined });
  }
}
