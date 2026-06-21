import { stooqCandles } from "@/lib/markets/providers";
import { yahooChart } from "@/lib/markets/yahoo";
import { buildStyleRotation, type FactorSeries, type FactorStyle } from "@/lib/engine/style-rotation";

export const runtime = "nodejs";
export const revalidate = 3600; // 1h

const BENCHMARK = "SPY";
const FACTORS: { id: string; label: string; style: FactorStyle }[] = [
  { id: "VLUE", label: "Value", style: "value" },
  { id: "IWF", label: "Growth", style: "growth" },
  { id: "MTUM", label: "Momentum", style: "momentum" },
  { id: "QUAL", label: "Quality", style: "quality" },
  { id: "USMV", label: "Min Volatility", style: "lowvol" },
  { id: "IWM", label: "Small Cap", style: "smallcap" },
  { id: "SIZE", label: "Size", style: "size" },
];

async function closesOf(sym: string): Promise<number[]> {
  try {
    return (await stooqCandles(sym)).map((b) => b.c);
  } catch {
    return (await yahooChart(sym, "2y")).bars.map((b) => b.c);
  }
}

export async function GET(req: Request) {
  const debug = new URL(req.url).searchParams.get("debug") !== null;
  try {
    const [benchRes, ...factorRes] = await Promise.allSettled([
      closesOf(BENCHMARK),
      ...FACTORS.map((f) => closesOf(f.id)),
    ]);
    if (benchRes.status !== "fulfilled" || benchRes.value.length < 70) throw new Error("no benchmark series");

    const factors: FactorSeries[] = [];
    factorRes.forEach((res, i) => {
      if (res.status === "fulfilled" && res.value.length >= 70) factors.push({ ...FACTORS[i], closes: res.value });
    });
    if (factors.length < 4) throw new Error(`too few factor series (${factors.length})`);

    const report = buildStyleRotation(factors, BENCHMARK, benchRes.value);
    return Response.json({ live: true, source: "engine·Stooq", asOf: new Date().toISOString(), ...report });
  } catch (e) {
    return Response.json({ live: false, error: debug ? String(e) : undefined });
  }
}
