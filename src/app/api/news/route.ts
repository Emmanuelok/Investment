import type { NextRequest } from "next/server";
import { UA } from "@/lib/markets/yahoo";

export const runtime = "nodejs";
export const revalidate = 300;

export type NewsItem = { title: string; link: string; source: string; ts: string; tickers: string[] };

const clean = (s: string) =>
  s.replace(/<!\[CDATA\[/g, "").replace(/\]\]>/g, "").replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&apos;/g, "'").trim();

function parseRss(xml: string): NewsItem[] {
  const items: NewsItem[] = [];
  const blocks = xml.match(/<item>([\s\S]*?)<\/item>/g) ?? [];
  for (const b of blocks) {
    const title = clean(b.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "");
    const link = clean(b.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? "");
    const pub = b.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? "";
    if (!title || !link) continue;
    const ts = pub ? new Date(pub).toISOString() : new Date().toISOString();
    items.push({ title, link, source: "Yahoo Finance", ts, tickers: [] });
  }
  return items;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const debug = sp.get("debug") !== null;
  const symbols = (sp.get("symbols") ?? "AAPL,NVDA,MSFT,TSLA,AMZN,SPY").split(",").map((s) => s.trim().toUpperCase()).filter(Boolean).slice(0, 10);
  try {
    const url = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${symbols.join(",")}&region=US&lang=en-US`;
    const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/rss+xml, application/xml, text/xml" }, next: { revalidate: 300 } });
    if (!r.ok) throw new Error(`news HTTP ${r.status}`);
    const items = parseRss(await r.text())
      .sort((a, b) => +new Date(b.ts) - +new Date(a.ts))
      .slice(0, 30);
    if (!items.length) throw new Error("news empty");
    return Response.json({ live: true, source: "yahoo-rss", asOf: new Date().toISOString(), items });
  } catch (e) {
    return Response.json({ live: false, error: debug ? String(e) : undefined });
  }
}
