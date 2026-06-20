/**
 * Beneish M-Score — an 8-variable model that flags likely earnings manipulation
 * from two years of financials. Each index is computed where data exists; missing
 * indices fall back to a neutral value (and are flagged), with a coverage score.
 *
 * M = −4.84 + 0.92·DSRI + 0.528·GMI + 0.404·AQI + 0.892·SGI + 0.115·DEPI
 *     − 0.172·SGAI + 4.679·TATA − 0.327·LVGI
 * M > −1.78 → likely manipulator; M < −2.22 → unlikely.
 */

export type BeneishYear = {
  revenue?: number;
  receivables?: number;
  grossProfit?: number;
  currentAssets?: number;
  ppe?: number; // property, plant & equipment (net)
  totalAssets?: number;
  depreciation?: number;
  sga?: number; // selling, general & administrative
  longTermDebt?: number;
  currentLiabilities?: number;
  netIncome?: number;
  operatingCashFlow?: number;
};

const has = (v: number | undefined): v is number => typeof v === "number" && Number.isFinite(v);
const div = (a?: number, b?: number): number | undefined => (has(a) && has(b) && b !== 0 ? a / b : undefined);

export type BeneishIndex = { key: string; name: string; value: number; estimated: boolean };
export type Beneish = {
  m: number | null;
  verdict: "Likely manipulation" | "Grey" | "Unlikely" | "Insufficient data";
  indices: BeneishIndex[];
  coverage: number; // 0..1 of indices backed by real data
};

export function beneishMScore(cur: BeneishYear, prior: BeneishYear): Beneish {
  const arT = div(cur.receivables, cur.revenue), arP = div(prior.receivables, prior.revenue);
  const dsri = div(arT, arP);
  const gmT = div(cur.grossProfit, cur.revenue), gmP = div(prior.grossProfit, prior.revenue);
  const gmi = div(gmP, gmT);
  const aqT = has(cur.currentAssets) && has(cur.ppe) && has(cur.totalAssets) ? 1 - (cur.currentAssets + cur.ppe) / cur.totalAssets : undefined;
  const aqP = has(prior.currentAssets) && has(prior.ppe) && has(prior.totalAssets) ? 1 - (prior.currentAssets + prior.ppe) / prior.totalAssets : undefined;
  const aqi = div(aqT, aqP);
  const sgi = div(cur.revenue, prior.revenue);
  const depT = div(cur.depreciation, has(cur.depreciation) && has(cur.ppe) ? cur.depreciation + cur.ppe : undefined);
  const depP = div(prior.depreciation, has(prior.depreciation) && has(prior.ppe) ? prior.depreciation + prior.ppe : undefined);
  const depi = div(depP, depT);
  const sgaT = div(cur.sga, cur.revenue), sgaP = div(prior.sga, prior.revenue);
  const sgai = div(sgaT, sgaP);
  const lvT = has(cur.longTermDebt) && has(cur.currentLiabilities) && has(cur.totalAssets) ? (cur.longTermDebt + cur.currentLiabilities) / cur.totalAssets : undefined;
  const lvP = has(prior.longTermDebt) && has(prior.currentLiabilities) && has(prior.totalAssets) ? (prior.longTermDebt + prior.currentLiabilities) / prior.totalAssets : undefined;
  const lvgi = div(lvT, lvP);
  const tata = has(cur.netIncome) && has(cur.operatingCashFlow) && has(cur.totalAssets) && cur.totalAssets !== 0 ? (cur.netIncome - cur.operatingCashFlow) / cur.totalAssets : undefined;

  const defs: { key: string; name: string; val: number | undefined; neutral: number }[] = [
    { key: "DSRI", name: "Days Sales in Receivables", val: dsri, neutral: 1 },
    { key: "GMI", name: "Gross Margin Index", val: gmi, neutral: 1 },
    { key: "AQI", name: "Asset Quality Index", val: aqi, neutral: 1 },
    { key: "SGI", name: "Sales Growth Index", val: sgi, neutral: 1 },
    { key: "DEPI", name: "Depreciation Index", val: depi, neutral: 1 },
    { key: "SGAI", name: "SG&A Index", val: sgai, neutral: 1 },
    { key: "LVGI", name: "Leverage Index", val: lvgi, neutral: 1 },
    { key: "TATA", name: "Total Accruals / Assets", val: tata, neutral: 0 },
  ];
  const indices: BeneishIndex[] = defs.map((d) => ({ key: d.key, name: d.name, value: has(d.val) ? d.val! : d.neutral, estimated: !has(d.val) }));
  const coverage = indices.filter((i) => !i.estimated).length / indices.length;

  const v = (k: string) => indices.find((i) => i.key === k)!.value;
  const m = -4.84 + 0.92 * v("DSRI") + 0.528 * v("GMI") + 0.404 * v("AQI") + 0.892 * v("SGI") + 0.115 * v("DEPI") - 0.172 * v("SGAI") + 4.679 * v("TATA") - 0.327 * v("LVGI");

  if (coverage < 0.4) return { m: null, verdict: "Insufficient data", indices, coverage };
  const verdict = m > -1.78 ? "Likely manipulation" : m < -2.22 ? "Unlikely" : "Grey";
  return { m, verdict, indices, coverage };
}
