import type { Candle } from "@/lib/rng";

/** Shared Yahoo Finance helpers (server-side). No key required. */

export const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36";

export type Bar = { t: number; o: number; h: number; l: number; c: number; v: number };
export type Norm = { price: number; prevClose: number; marketState: string; bars: Bar[] };

export async function yahooChart(sym: string, range = "3mo", interval = "1d"): Promise<Norm> {
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

export const chgPctOf = (n: Norm) => (n.prevClose ? (n.price / n.prevClose - 1) * 100 : 0);
export const toCandles = (n: Norm, k = 90): Candle[] => n.bars.slice(-k).map((b) => ({ o: b.o, h: b.h, l: b.l, c: b.c, v: b.v }));

export function compact(n: number): string {
  if (!Number.isFinite(n)) return "—";
  const a = Math.abs(n);
  if (a >= 1e12) return (n / 1e12).toFixed(1) + "T";
  if (a >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (a >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (a >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return String(Math.round(n));
}

export function marketLabel(s: string): string {
  if (s === "REGULAR") return "OPEN";
  if (s.startsWith("PRE")) return "PRE-MARKET";
  if (s.startsWith("POST")) return "AFTER-HOURS";
  if (s === "CLOSED") return "CLOSED";
  return s || "—";
}

export type QuoteRow = {
  sym: string;
  name: string;
  price: number;
  chg: number;
  chgPct: number;
  vol: string;
  mktcap: string;
  dayHigh?: number;
  dayLow?: number;
  prevClose?: number;
};

/** Batch quotes — tries the rich v7 endpoint (name, market cap), falls back to v8 charts. */
export async function batchQuotes(symbols: string[], names: Record<string, string> = {}): Promise<{ rows: QuoteRow[]; source: string }> {
  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols.map(encodeURIComponent).join(",")}`;
    const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, next: { revalidate: 30 } });
    if (r.ok) {
      const j = (await r.json()) as { quoteResponse?: { result?: Array<Record<string, number | string>> } };
      const arr = j?.quoteResponse?.result;
      if (arr?.length) {
        return {
          source: "yahoo:v7",
          rows: arr.map((q) => ({
            sym: String(q.symbol),
            name: String(q.shortName ?? q.longName ?? names[String(q.symbol)] ?? q.symbol),
            price: Number(q.regularMarketPrice ?? 0),
            chg: Number(q.regularMarketChange ?? 0),
            chgPct: Number(q.regularMarketChangePercent ?? 0),
            vol: compact(Number(q.regularMarketVolume ?? 0)),
            mktcap: q.marketCap ? "$" + compact(Number(q.marketCap)) : "—",
            dayHigh: Number(q.regularMarketDayHigh ?? 0),
            dayLow: Number(q.regularMarketDayLow ?? 0),
            prevClose: Number(q.regularMarketPreviousClose ?? 0),
          })),
        };
      }
    }
  } catch {
    /* fall through */
  }
  // fallback: per-symbol v8 charts (price/chg/vol only)
  const norms = await Promise.allSettled(symbols.map((s) => yahooChart(s, "5d")));
  const rows: QuoteRow[] = [];
  norms.forEach((res, i) => {
    if (res.status !== "fulfilled") return;
    const n = res.value;
    const last = n.bars.at(-1);
    rows.push({
      sym: symbols[i],
      name: names[symbols[i]] ?? symbols[i],
      price: n.price,
      chg: n.price - n.prevClose,
      chgPct: chgPctOf(n),
      vol: compact(Number(last?.v ?? 0)),
      mktcap: "—",
      dayHigh: last?.h,
      dayLow: last?.l,
      prevClose: n.prevClose,
    });
  });
  if (!rows.length) throw new Error("batchQuotes: all symbols failed");
  return { rows, source: "yahoo:v8" };
}
