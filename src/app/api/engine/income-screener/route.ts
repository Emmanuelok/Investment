import { finnhubMetrics } from "@/lib/markets/providers";
import { buildIncomeScreen, type IncomeStock } from "@/lib/engine/income-screener";

export const runtime = "nodejs";
export const revalidate = 21600; // 6h

const SYM_RE = /^[A-Z][A-Z0-9.-]{0,9}$/;
// A universe of established dividend payers across sectors.
const NAMES: Record<string, string> = {
  KO: "Coca-Cola", PEP: "PepsiCo", JNJ: "Johnson & Johnson", PG: "Procter & Gamble",
  XOM: "Exxon Mobil", CVX: "Chevron", VZ: "Verizon", MO: "Altria",
  ABBV: "AbbVie", MMM: "3M", IBM: "IBM", KMB: "Kimberly-Clark",
  O: "Realty Income", PM: "Philip Morris", TXN: "Texas Instruments", HD: "Home Depot",
};

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const debug = sp.get("debug") !== null;
  const param = sp.get("symbols");
  const symbols = (param ? param.split(",").map((s) => s.trim().toUpperCase()) : Object.keys(NAMES))
    .filter((s) => SYM_RE.test(s)).slice(0, 30);

  try {
    const settled = await Promise.allSettled(symbols.map(async (s) => ({ s, m: await finnhubMetrics(s) })));
    const stocks: IncomeStock[] = [];
    settled.forEach((r) => {
      if (r.status !== "fulfilled") return;
      const { s, m } = r.value;
      if (!(m.dividendYield > 0)) return; // dividend payers only
      stocks.push({
        symbol: s,
        name: NAMES[s] ?? s,
        dividendYield: m.dividendYield,
        payoutRatio: m.payoutRatio,
        roe: m.roe,
        debtToEquity: m.debtToEquity,
      });
    });
    if (stocks.length < 5) throw new Error(`too few payers resolved (${stocks.length})`);

    const report = buildIncomeScreen(stocks);
    return Response.json({ live: true, source: "engine·Finnhub", asOf: new Date().toISOString(), ...report });
  } catch (e) {
    return Response.json({ live: false, error: debug ? String(e) : undefined });
  }
}
