/**
 * SEC Form 4 (insider transaction) parser + aggregation. Parses the ownership
 * XML with regex (no xml dependency) and classifies transactions into
 * buys/sells/grants, then summarizes net insider activity. Pure & testable.
 */

export type InsiderTx = {
  owner: string;
  title: string; // director / officer title / 10% owner
  date: string;
  code: string; // SEC transaction code (P, S, A, M, F, G…)
  action: string; // human label
  isBuy: boolean;
  isSell: boolean;
  shares: number;
  price: number;
  value: number; // shares × price
  sharesAfter: number | null;
};

const tag = (xml: string, name: string): string | undefined => xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`))?.[1]?.trim();
const valOf = (block: string, name: string): string | undefined => {
  const seg = block.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`))?.[1];
  return seg ? (seg.match(/<value>([\s\S]*?)<\/value>/)?.[1] ?? seg).trim() : undefined;
};
const truthy = (v?: string) => v === "1" || v?.toLowerCase() === "true";

export function classifyCode(code: string): { action: string; isBuy: boolean; isSell: boolean } {
  switch (code) {
    case "P": return { action: "Buy", isBuy: true, isSell: false };
    case "S": return { action: "Sell", isBuy: false, isSell: true };
    case "A": return { action: "Grant", isBuy: false, isSell: false };
    case "M": return { action: "Exercise", isBuy: false, isSell: false };
    case "F": return { action: "Tax wh.", isBuy: false, isSell: false };
    case "G": return { action: "Gift", isBuy: false, isSell: false };
    case "C": return { action: "Conversion", isBuy: false, isSell: false };
    case "X": return { action: "Exercise", isBuy: false, isSell: false };
    default: return { action: code || "—", isBuy: false, isSell: false };
  }
}

export function parseForm4(xml: string): InsiderTx[] {
  const owner = tag(xml, "rptOwnerName") ?? "Unknown";
  const rel = xml.match(/<reportingOwnerRelationship>([\s\S]*?)<\/reportingOwnerRelationship>/)?.[1] ?? "";
  const isDir = truthy(tag(rel, "isDirector"));
  const isOff = truthy(tag(rel, "isOfficer"));
  const isTen = truthy(tag(rel, "isTenPercentOwner"));
  const officerTitle = tag(rel, "officerTitle");
  const title = officerTitle?.trim() || (isOff ? "Officer" : isDir ? "Director" : isTen ? "10% Owner" : "Insider");

  const out: InsiderTx[] = [];
  const blocks = xml.match(/<nonDerivativeTransaction>[\s\S]*?<\/nonDerivativeTransaction>/g) ?? [];
  for (const b of blocks) {
    const date = valOf(b, "transactionDate") ?? "";
    const code = (b.match(/<transactionCode>([\s\S]*?)<\/transactionCode>/)?.[1] ?? "").trim();
    const shares = Number(valOf(b, "transactionShares") ?? 0);
    const price = Number(valOf(b, "transactionPricePerShare") ?? 0);
    const sa = valOf(b, "sharesOwnedFollowingTransaction");
    if (!Number.isFinite(shares) || shares <= 0) continue;
    const cls = classifyCode(code);
    out.push({ owner, title, date, code, ...cls, shares, price, value: shares * price, sharesAfter: sa != null ? Number(sa) : null });
  }
  return out;
}

export type InsiderSummary = {
  buyCount: number; sellCount: number;
  buyValue: number; sellValue: number; netValue: number;
  buyers: string[]; sellers: string[];
  signal: "Net buying" | "Net selling" | "Mixed" | "Neutral";
};

export function summarizeInsider(txs: InsiderTx[]): InsiderSummary {
  const buys = txs.filter((t) => t.isBuy), sells = txs.filter((t) => t.isSell);
  const buyValue = buys.reduce((a, t) => a + t.value, 0);
  const sellValue = sells.reduce((a, t) => a + t.value, 0);
  const netValue = buyValue - sellValue;
  const buyers = [...new Set(buys.map((t) => t.owner))];
  const sellers = [...new Set(sells.map((t) => t.owner))];
  let signal: InsiderSummary["signal"] = "Neutral";
  if (buyValue > 0 && sellValue > 0) signal = "Mixed";
  else if (buyValue > 0) signal = "Net buying";
  else if (sellValue > 0) signal = "Net selling";
  return { buyCount: buys.length, sellCount: sells.length, buyValue, sellValue, netValue, buyers, sellers, signal };
}
