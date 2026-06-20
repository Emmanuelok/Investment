import type { NextRequest } from "next/server";
import { SEC_UA, secFetch, cikFor } from "@/lib/markets/edgar";
import { parseForm4, summarizeInsider, type InsiderTx } from "@/lib/engine/insider";

export const runtime = "nodejs";
export const revalidate = 7200; // 2h

const SYM_RE = /^[A-Z][A-Z0-9.-]{0,9}$/;

type Recent = { accessionNumber: string[]; filingDate: string[]; form: string[]; primaryDocument: string[] };

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const debug = sp.get("debug") !== null;
  const symbol = (sp.get("symbol") ?? "NVDA").toUpperCase();
  if (!SYM_RE.test(symbol)) return Response.json({ live: false, error: debug ? "bad symbol" : undefined });

  try {
    const co = await cikFor(symbol);
    if (!co) throw new Error(`no CIK for ${symbol}`);
    const sr = await secFetch(`https://data.sec.gov/submissions/CIK${co.cik}.json`);
    if (!sr.ok) throw new Error(`submissions ${sr.status}`);
    const subs = (await sr.json()) as { name?: string; filings?: { recent?: Recent } };
    const recent = subs.filings?.recent;
    if (!recent) throw new Error("no recent filings");

    const cikInt = parseInt(co.cik, 10);
    const idxs: number[] = [];
    for (let i = 0; i < recent.form.length && idxs.length < 12; i++) if (recent.form[i] === "4") idxs.push(i);
    if (!idxs.length) throw new Error("no Form 4 filings");

    const settled = await Promise.allSettled(idxs.map(async (i) => {
      const acc = recent.accessionNumber[i].replace(/-/g, "");
      const url = `https://www.sec.gov/Archives/edgar/data/${cikInt}/${acc}/${recent.primaryDocument[i]}`;
      const r = await fetch(url, { headers: { "User-Agent": SEC_UA, Accept: "application/xml, text/xml, */*" }, next: { revalidate: 7200 }, signal: AbortSignal.timeout(9000) });
      if (!r.ok) throw new Error(`doc ${r.status}`);
      const xml = await r.text();
      if (!xml.includes("ownershipDocument")) return [] as InsiderTx[];
      return parseForm4(xml).map((t) => ({ ...t, date: t.date || recent.filingDate[i] }));
    }));

    const transactions = settled.filter((r): r is PromiseFulfilledResult<InsiderTx[]> => r.status === "fulfilled").flatMap((r) => r.value)
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)).slice(0, 40);
    if (!transactions.length) throw new Error("no transactions parsed");

    return Response.json({ live: true, source: "SEC EDGAR Form 4", asOf: new Date().toISOString(), symbol, name: subs.name ?? co.title, transactions, summary: summarizeInsider(transactions) });
  } catch (e) {
    return Response.json({ live: false, error: debug ? String(e) : undefined });
  }
}
