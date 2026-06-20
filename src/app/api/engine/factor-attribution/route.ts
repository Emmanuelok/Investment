import type { NextRequest } from "next/server";
import { stooqCandles } from "@/lib/markets/providers";
import { yahooChart } from "@/lib/markets/yahoo";
import { logReturns } from "@/lib/engine/correlation";
import { attributeReturns } from "@/lib/engine/factor-attribution";

export const runtime = "nodejs";
export const revalidate = 3600;

const SYM_RE = /^[A-Z0-9.^=-]{1,12}$/;
// factor-proxy ETFs
const PROXIES = ["SPY", "IWM", "IWF", "IWD", "MTUM", "QUAL", "USMV"] as const;

async function retsOf(sym: string): Promise<number[]> {
  let closes: number[];
  try { closes = (await stooqCandles(sym)).map((b) => b.c); } catch { closes = (await yahooChart(sym, "2y")).bars.map((b) => b.c); }
  return logReturns(closes);
}
const sub = (a: number[], b: number[]) => a.map((v, i) => v - b[i]);

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const debug = sp.get("debug") !== null;
  const symbol = (sp.get("symbol") ?? "NVDA").toUpperCase();
  if (!SYM_RE.test(symbol)) return Response.json({ live: false, error: debug ? "bad symbol" : undefined });

  try {
    const [assetRes, ...proxyRes] = await Promise.allSettled([symbol, ...PROXIES].map((s) => retsOf(s)));
    if (assetRes.status !== "fulfilled") throw new Error("asset returns unavailable");
    const px: Record<string, number[]> = {};
    PROXIES.forEach((p, i) => { const r = proxyRes[i]; if (r.status === "fulfilled") px[p] = r.value; });
    if (!px.SPY) throw new Error("market proxy (SPY) unavailable");

    // align to the shortest series
    const all = [assetRes.value, ...Object.values(px)];
    const n = Math.min(...all.map((a) => a.length));
    const cut = (a: number[]) => a.slice(-n);
    const asset = cut(assetRes.value);
    const spy = cut(px.SPY);

    const factorRets: Record<string, number[]> = { Market: spy };
    if (px.IWM) factorRets["Size"] = sub(cut(px.IWM), spy);
    if (px.IWD && px.IWF) factorRets["Value"] = sub(cut(px.IWD), cut(px.IWF));
    if (px.MTUM) factorRets["Momentum"] = sub(cut(px.MTUM), spy);
    if (px.QUAL) factorRets["Quality"] = sub(cut(px.QUAL), spy);
    if (px.USMV) factorRets["Low Vol"] = sub(cut(px.USMV), spy);

    const model = attributeReturns(asset, factorRets);
    return Response.json({ live: true, source: "engine·stooq", asOf: new Date().toISOString(), symbol, observations: n, ...model });
  } catch (e) {
    return Response.json({ live: false, error: debug ? String(e) : undefined });
  }
}
