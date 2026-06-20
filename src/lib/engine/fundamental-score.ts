/**
 * Fundamental-quality engine — Piotroski F-Score, Altman Z-Score and a composite
 * quality grade. Pure functions over a structured financial-statements input;
 * criteria that lack data are skipped (the F-Score reports its evaluable max),
 * so it degrades gracefully on partial EDGAR coverage.
 */

export type FinancialYear = {
  fiscalYear?: number;
  revenue?: number;
  netIncome?: number;
  operatingCashFlow?: number;
  totalAssets?: number;
  totalLiabilities?: number;
  currentAssets?: number;
  currentLiabilities?: number;
  longTermDebt?: number;
  sharesOutstanding?: number;
  grossProfit?: number;
  retainedEarnings?: number;
  ebit?: number; // operating income
  marketCap?: number;
  stockholdersEquity?: number;
};

const has = (v: number | undefined): v is number => typeof v === "number" && Number.isFinite(v);
const ratio = (a?: number, b?: number): number | undefined => (has(a) && has(b) && b !== 0 ? a / b : undefined);

export type FCriterion = { name: string; pass: boolean | null; detail: string };
export type Piotroski = { score: number; max: number; pct: number; criteria: FCriterion[]; label: "Strong" | "Moderate" | "Weak" };

/** Piotroski F-Score — 9 criteria across profitability, leverage and efficiency. */
export function piotroskiFScore(cur: FinancialYear, prior: FinancialYear): Piotroski {
  const roa = ratio(cur.netIncome, cur.totalAssets);
  const roaPrior = ratio(prior.netIncome, prior.totalAssets);
  const cfoToAssets = ratio(cur.operatingCashFlow, cur.totalAssets);
  const curRatio = ratio(cur.currentAssets, cur.currentLiabilities);
  const curRatioPrior = ratio(prior.currentAssets, prior.currentLiabilities);
  const ltdRatio = ratio(cur.longTermDebt, cur.totalAssets);
  const ltdRatioPrior = ratio(prior.longTermDebt, prior.totalAssets);
  const gm = ratio(cur.grossProfit, cur.revenue);
  const gmPrior = ratio(prior.grossProfit, prior.revenue);
  const turn = ratio(cur.revenue, cur.totalAssets);
  const turnPrior = ratio(prior.revenue, prior.totalAssets);

  const tests: { name: string; cond: boolean | null; detail: string }[] = [
    { name: "Positive ROA", cond: has(roa) ? roa! > 0 : null, detail: has(roa) ? `ROA ${(roa! * 100).toFixed(1)}%` : "n/a" },
    { name: "Positive operating cash flow", cond: has(cur.operatingCashFlow) ? cur.operatingCashFlow! > 0 : null, detail: has(cur.operatingCashFlow) ? "CFO > 0" : "n/a" },
    { name: "Rising ROA", cond: has(roa) && has(roaPrior) ? roa! > roaPrior! : null, detail: has(roa) && has(roaPrior) ? `${(roa! * 100).toFixed(1)}% vs ${(roaPrior! * 100).toFixed(1)}%` : "n/a" },
    { name: "Accruals (CFO > ROA)", cond: has(cfoToAssets) && has(roa) ? cfoToAssets! > roa! : null, detail: has(cfoToAssets) && has(roa) ? "earnings cash-backed" : "n/a" },
    { name: "Falling leverage", cond: has(ltdRatio) && has(ltdRatioPrior) ? ltdRatio! < ltdRatioPrior! : null, detail: has(ltdRatio) && has(ltdRatioPrior) ? `LTD/assets ${(ltdRatio! * 100).toFixed(0)}% vs ${(ltdRatioPrior! * 100).toFixed(0)}%` : "n/a" },
    { name: "Rising current ratio", cond: has(curRatio) && has(curRatioPrior) ? curRatio! > curRatioPrior! : null, detail: has(curRatio) && has(curRatioPrior) ? `${curRatio!.toFixed(2)} vs ${curRatioPrior!.toFixed(2)}` : "n/a" },
    { name: "No share dilution", cond: has(cur.sharesOutstanding) && has(prior.sharesOutstanding) ? cur.sharesOutstanding! <= prior.sharesOutstanding! * 1.001 : null, detail: has(cur.sharesOutstanding) && has(prior.sharesOutstanding) ? "shares flat/down" : "n/a" },
    { name: "Rising gross margin", cond: has(gm) && has(gmPrior) ? gm! > gmPrior! : null, detail: has(gm) && has(gmPrior) ? `${(gm! * 100).toFixed(1)}% vs ${(gmPrior! * 100).toFixed(1)}%` : "n/a" },
    { name: "Rising asset turnover", cond: has(turn) && has(turnPrior) ? turn! > turnPrior! : null, detail: has(turn) && has(turnPrior) ? `${turn!.toFixed(2)} vs ${turnPrior!.toFixed(2)}` : "n/a" },
  ];

  const criteria: FCriterion[] = tests.map((t) => ({ name: t.name, pass: t.cond, detail: t.detail }));
  const evaluable = criteria.filter((c) => c.pass !== null);
  const score = evaluable.filter((c) => c.pass === true).length;
  const max = evaluable.length || 9;
  const pct = max ? (score / max) * 100 : 0;
  const label = pct >= 70 ? "Strong" : pct >= 40 ? "Moderate" : "Weak";
  return { score, max, pct, criteria, label };
}

export type Altman = { z: number | null; zone: "Safe" | "Grey" | "Distress" | "Unknown"; components: { name: string; value: number }[] };

/** Altman Z-Score (classic manufacturing model). Returns null if inputs are missing. */
export function altmanZScore(f: FinancialYear): Altman {
  const wc = has(f.currentAssets) && has(f.currentLiabilities) ? f.currentAssets! - f.currentLiabilities! : undefined;
  const x1 = ratio(wc, f.totalAssets);
  const x2 = ratio(f.retainedEarnings, f.totalAssets);
  const x3 = ratio(f.ebit, f.totalAssets);
  const x4 = ratio(f.marketCap, f.totalLiabilities);
  const x5 = ratio(f.revenue, f.totalAssets);
  if ([x1, x2, x3, x4, x5].some((x) => !has(x))) return { z: null, zone: "Unknown", components: [] };
  const z = 1.2 * x1! + 1.4 * x2! + 3.3 * x3! + 0.6 * x4! + 1.0 * x5!;
  const zone = z > 2.99 ? "Safe" : z >= 1.81 ? "Grey" : "Distress";
  return {
    z, zone,
    components: [
      { name: "Working capital / assets", value: x1! },
      { name: "Retained earnings / assets", value: x2! },
      { name: "EBIT / assets", value: x3! },
      { name: "Mkt equity / liabilities", value: x4! },
      { name: "Sales / assets", value: x5! },
    ],
  };
}

export type QualityGrade = { grade: "A" | "B" | "C" | "D" | "F"; score: number; drivers: { name: string; value: string; good: boolean }[] };

/** Composite quality grade from margins, returns, growth and leverage (each 0..1 normalized). */
export function qualityGrade(m: { profitMargin?: number; roe?: number; revenueGrowth?: number; debtToEquity?: number; grossMargin?: number }): QualityGrade {
  const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
  const parts: { w: number; s: number; name: string; value: string; good: boolean }[] = [];
  if (has(m.profitMargin)) parts.push({ w: 0.25, s: clamp01(m.profitMargin! / 25), name: "Net margin", value: `${m.profitMargin!.toFixed(1)}%`, good: m.profitMargin! > 10 });
  if (has(m.grossMargin)) parts.push({ w: 0.15, s: clamp01(m.grossMargin! / 60), name: "Gross margin", value: `${m.grossMargin!.toFixed(1)}%`, good: m.grossMargin! > 40 });
  if (has(m.roe)) parts.push({ w: 0.25, s: clamp01(m.roe! / 30), name: "ROE", value: `${m.roe!.toFixed(1)}%`, good: m.roe! > 15 });
  if (has(m.revenueGrowth)) parts.push({ w: 0.2, s: clamp01((m.revenueGrowth! + 5) / 30), name: "Revenue growth", value: `${m.revenueGrowth!.toFixed(1)}%`, good: m.revenueGrowth! > 8 });
  if (has(m.debtToEquity)) parts.push({ w: 0.15, s: clamp01(1 - m.debtToEquity! / 200), name: "Debt/equity", value: m.debtToEquity!.toFixed(0), good: m.debtToEquity! < 100 });
  const wsum = parts.reduce((a, p) => a + p.w, 0) || 1;
  const score = Math.round((parts.reduce((a, p) => a + p.w * p.s, 0) / wsum) * 100);
  const grade = score >= 80 ? "A" : score >= 65 ? "B" : score >= 50 ? "C" : score >= 35 ? "D" : "F";
  return { grade, score, drivers: parts.map((p) => ({ name: p.name, value: p.value, good: p.good })) };
}
