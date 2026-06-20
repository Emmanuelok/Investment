/** Shared SEC EDGAR helpers — declared User-Agent + ticker→CIK lookup. */

export const SEC_UA = process.env.SEC_EDGAR_USER_AGENT || "Pantheon Research contact@example.com";

export const secFetch = (url: string) =>
  fetch(url, { headers: { "User-Agent": SEC_UA, Accept: "application/json" }, next: { revalidate: 21600 }, signal: AbortSignal.timeout(9000) });

/** ticker → { 10-digit CIK, company title } via SEC's directory file. */
export async function cikFor(symbol: string): Promise<{ cik: string; title: string } | null> {
  const r = await secFetch("https://www.sec.gov/files/company_tickers.json");
  if (!r.ok) throw new Error(`tickers ${r.status}`);
  const j = (await r.json()) as Record<string, { cik_str: number; ticker: string; title: string }>;
  const hit = Object.values(j).find((e) => e.ticker === symbol);
  return hit ? { cik: String(hit.cik_str).padStart(10, "0"), title: hit.title } : null;
}

/* ── XBRL company facts (balance-sheet / income concepts) ────────────────── */

export type FactUnit = { end: string; val: number; fy?: number; fp?: string; form?: string };
export type CompanyFacts = { entityName?: string; facts?: Record<string, Record<string, { units?: Record<string, FactUnit[]> }>> };

/** Fetch the full XBRL companyfacts document for a 10-digit CIK. */
export async function companyFacts(cik: string): Promise<CompanyFacts> {
  const r = await secFetch(`https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`);
  if (!r.ok) throw new Error(`companyfacts ${r.status}`);
  return (await r.json()) as CompanyFacts;
}

/**
 * Most-recent annual (10-K / FY) value for the first concept alias that has
 * data. `aliases` is a list of [taxonomy, concept] pairs tried in order.
 */
export function latestAnnual(facts: CompanyFacts, aliases: [string, string][]): { val: number; fy: number; end: string } | null {
  for (const [tax, concept] of aliases) {
    const node = facts.facts?.[tax]?.[concept];
    const arr = node?.units ? Object.values(node.units)[0] ?? [] : [];
    let best: { val: number; fy: number; end: string } | null = null;
    for (const u of arr) {
      if (u.form !== "10-K" || u.fp !== "FY" || typeof u.fy !== "number" || typeof u.val !== "number") continue;
      if (!best || u.fy > best.fy || (u.fy === best.fy && u.end > best.end)) best = { val: u.val, fy: u.fy, end: u.end };
    }
    if (best) return best;
  }
  return null;
}
