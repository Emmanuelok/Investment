export const runtime = "nodejs";

export interface FilingEntry {
  form: string;
  title: string;
  company: string;
  date: string;
  href: string;
}

export interface EdgarResponse {
  live: true;
  filings: FilingEntry[];
}

export interface EdgarError {
  live: false;
}

/** Extract the text content of the first XML element with the given tag name. */
function extractTag(xml: string, tag: string): string {
  const open = `<${tag}`;
  const close = `</${tag}>`;
  const start = xml.indexOf(open);
  if (start < 0) return "";
  const end = xml.indexOf(close, start);
  if (end < 0) return "";
  // Find the end of the opening tag (could have attributes)
  const tagEnd = xml.indexOf(">", start);
  if (tagEnd < 0 || tagEnd > end) return "";
  return xml.slice(tagEnd + 1, end).trim();
}

/** Extract attribute value from a tag occurrence. */
function extractAttr(tagStr: string, attr: string): string {
  const pattern = new RegExp(`${attr}="([^"]*)"`, "i");
  const m = tagStr.match(pattern);
  return m ? m[1] : "";
}

/** Extract the first <category term="..."/> value from a block. */
function extractCategory(block: string): string {
  const m = block.match(/<category[^>]+term="([^"]+)"/i);
  return m ? m[1] : "";
}

/** Extract all <entry>...</entry> blocks from an Atom feed. */
function extractEntries(xml: string): string[] {
  const entries: string[] = [];
  let pos = 0;
  const openTag = "<entry>";
  const closeTag = "</entry>";
  while (true) {
    const start = xml.indexOf(openTag, pos);
    if (start < 0) break;
    const end = xml.indexOf(closeTag, start);
    if (end < 0) break;
    entries.push(xml.slice(start, end + closeTag.length));
    pos = end + closeTag.length;
  }
  return entries;
}

/** Strip XML/HTML tags from a string. */
function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, "").trim();
}

function parseEntry(entry: string): FilingEntry | null {
  try {
    const title = stripTags(extractTag(entry, "title"));
    const updated = extractTag(entry, "updated");
    const form = extractCategory(entry);

    // The link tag is self-closing: <link rel="..." href="..." .../>
    const linkMatch = entry.match(/<link[^>]+href="([^"]+)"/i);
    const href = linkMatch ? linkMatch[1] : "";

    // Company name: title format is typically "TYPE - COMPANY-NAME (CIK NNNNNNN)"
    // Try to parse "FORMTYPE - COMPANY NAME (CIK ...)"
    let company = title;
    const dashIdx = title.indexOf(" - ");
    if (dashIdx >= 0) {
      company = title.slice(dashIdx + 3).replace(/\s*\(CIK[^)]*\)/i, "").trim();
    }

    // Parse date from ISO 8601 updated string
    const date = updated ? updated.slice(0, 10) : "";

    return { form: form || "SEC", title, company, date, href };
  } catch {
    return null;
  }
}

export async function GET(): Promise<Response> {
  const userAgent =
    process.env.SEC_EDGAR_USER_AGENT ?? "Pantheon Research contact@example.com";
  try {
    const url =
      "https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=&company=&dateb=&owner=include&count=40&output=atom";
    const res = await fetch(url, {
      headers: { "User-Agent": userAgent, Accept: "application/atom+xml" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) {
      return Response.json({ live: false } satisfies EdgarError);
    }
    const xml = await res.text();
    const entries = extractEntries(xml);
    const filings: FilingEntry[] = entries
      .map(parseEntry)
      .filter((f): f is FilingEntry => f !== null)
      .slice(0, 30);

    if (filings.length === 0) {
      return Response.json({ live: false } satisfies EdgarError);
    }

    return Response.json({ live: true, filings } satisfies EdgarResponse);
  } catch {
    return Response.json({ live: false } satisfies EdgarError);
  }
}
