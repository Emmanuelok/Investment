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
