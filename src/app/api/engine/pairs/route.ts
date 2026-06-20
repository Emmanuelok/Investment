import type { NextRequest } from "next/server";
import { stooqCandles } from "@/lib/markets/providers";
import { yahooChart } from "@/lib/markets/yahoo";
import { analyzePair } from "@/lib/engine/pairs";

export const runtime = "nodejs";
export const revalidate = 1800;

const SYM_RE = /^[A-Z0-9.^=-]{1,12}$/;

async function closesOf(sym: string): Promise<number[]> {
  try { return (await stooqCandles(sym)).map((b) => b.c); } catch { return (await yahooChart(sym, "2y")).bars.map((b) => b.c); }
}
// downsample a series to <= k points for transport
const ds = (a: number[], k = 180) => (a.length <= k ? a : a.filter((_, i) => i % Math.ceil(a.length / k) === 0));

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const debug = sp.get("debug") !== null;
  const a = (sp.get("a") ?? "KO").toUpperCase();
  const b = (sp.get("b") ?? "PEP").toUpperCase();
  const window = Math.max(20, Math.min(252, Number(sp.get("window") ?? 90) || 90));
  if (!SYM_RE.test(a) || !SYM_RE.test(b) || a === b) return Response.json({ live: false, error: debug ? "need two distinct valid symbols" : undefined });

  try {
    const [ca, cb] = await Promise.all([closesOf(a), closesOf(b)]);
    if (ca.length < 60 || cb.length < 60) throw new Error("insufficient history");
    const r = analyzePair(a, b, ca, cb, window);
    return Response.json({
      live: true, source: "engine·stooq", asOf: new Date().toISOString(),
      symA: r.symA, symB: r.symB, hedgeRatio: r.hedgeRatio, correlation: r.correlation,
      zLast: r.zLast, halfLife: Number.isFinite(r.halfLife) ? r.halfLife : null, signal: r.signal, rationale: r.rationale,
      entryZ: r.entryZ, exitZ: r.exitZ, spread: ds(r.spread), zscore: ds(r.zscore),
    });
  } catch (e) {
    return Response.json({ live: false, error: debug ? String(e) : undefined });
  }
}
