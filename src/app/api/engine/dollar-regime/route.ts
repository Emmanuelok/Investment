import { stooqCandles } from "@/lib/markets/providers";
import { yahooChart } from "@/lib/markets/yahoo";
import { buildDollarRegime, type FxSeries } from "@/lib/engine/dollar-regime";

export const runtime = "nodejs";
export const revalidate = 3600; // 1h

const DOLLAR = "UUP"; // Invesco DB US Dollar Bullish
const CURRENCIES: { sym: string; id: string; label: string }[] = [
  { sym: "FXE", id: "eur", label: "Euro" },
  { sym: "FXY", id: "jpy", label: "Japanese Yen" },
  { sym: "FXB", id: "gbp", label: "British Pound" },
  { sym: "FXF", id: "chf", label: "Swiss Franc" },
  { sym: "FXC", id: "cad", label: "Canadian Dollar" },
  { sym: "FXA", id: "aud", label: "Australian Dollar" },
];

async function closesOf(sym: string): Promise<number[]> {
  try {
    return (await stooqCandles(sym)).map((b) => b.c);
  } catch {
    return (await yahooChart(sym, "2y")).bars.map((b) => b.c);
  }
}
const fulfilled = <T,>(r: PromiseSettledResult<T>): r is PromiseFulfilledResult<T> => r.status === "fulfilled";

export async function GET(req: Request) {
  const debug = new URL(req.url).searchParams.get("debug") !== null;
  try {
    const [dollarR, ...curR] = await Promise.allSettled([closesOf(DOLLAR), ...CURRENCIES.map((c) => closesOf(c.sym))]);
    if (!fulfilled(dollarR) || dollarR.value.length < 70) throw new Error("no dollar series");

    const currencies: FxSeries[] = [];
    curR.forEach((res, i) => {
      if (fulfilled(res) && res.value.length >= 70) currencies.push({ id: CURRENCIES[i].id, label: CURRENCIES[i].label, closes: res.value });
    });
    if (currencies.length < 3) throw new Error(`too few currency series (${currencies.length})`);

    const report = buildDollarRegime(dollarR.value, currencies);
    return Response.json({ live: true, source: "engine·Stooq", asOf: new Date().toISOString(), dollarSymbol: DOLLAR, ...report });
  } catch (e) {
    return Response.json({ live: false, error: debug ? String(e) : undefined });
  }
}
