/**
 * Dividend-safety & capital-return engine. Scores how comfortably a company
 * funds its dividend from earnings and free cash flow, and how much balance-
 * sheet room it has, blending four factors into a 0–100 safety score:
 *
 *   • FCF coverage   = free cash flow / dividends   (can the cash fund it?)
 *   • Payout ratio   = dividends / net income       (is it covered by earnings?)
 *   • Leverage       = net debt / EBITDA            (balance-sheet cushion)
 *   • FCF positivity (is the firm self-funding at all?)
 *
 * Free cash flow = operating cash flow − capex. Pure math; the route supplies
 * the figures from SEC XBRL company facts.
 */

export type DivInput = {
  dividends: number; // cash common dividends paid (positive)
  buybacks: number; // share repurchases (positive)
  netIncome: number;
  operatingCashFlow: number;
  capex: number; // capital expenditure (positive)
  totalDebt: number;
  cash: number; // cash & equivalents
  ebitda: number; // operating income + D&A (approx)
};

export type DivGrade = "Very safe" | "Safe" | "Borderline" | "At risk" | "No dividend";

export type DivSafety = {
  freeCashFlow: number;
  netDebt: number;
  payoutRatio: number | null; // div / net income
  fcfPayout: number | null; // div / FCF
  fcfCoverage: number | null; // FCF / div
  totalPayoutRatio: number | null; // (div + buybacks) / FCF
  netDebtToEbitda: number | null;
  subscores: { coverage: number; payout: number; leverage: number; cashflow: number };
  score: number; // 0..100
  grade: DivGrade;
  flags: string[];
};

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

export function dividendSafety(i: DivInput): DivSafety {
  const freeCashFlow = i.operatingCashFlow - i.capex;
  const netDebt = i.totalDebt - i.cash;
  const payDiv = Math.max(i.dividends, 0);

  if (payDiv <= 0) {
    return {
      freeCashFlow, netDebt,
      payoutRatio: null, fcfPayout: null, fcfCoverage: null, totalPayoutRatio: null,
      netDebtToEbitda: i.ebitda > 0 ? netDebt / i.ebitda : null,
      subscores: { coverage: 0, payout: 0, leverage: 0, cashflow: 0 },
      score: 0, grade: "No dividend", flags: ["No common dividend paid"],
    };
  }

  const payoutRatio = i.netIncome > 0 ? payDiv / i.netIncome : null;
  const cover = freeCashFlow > 0 ? freeCashFlow / payDiv : 0; // 0 drives the sub-score when uncovered
  const fcfCoverage = freeCashFlow > 0 ? cover : null; // but the reported ratio is undefined w/o positive FCF
  const fcfPayout = freeCashFlow > 0 ? payDiv / freeCashFlow : null;
  const totalPayoutRatio = freeCashFlow > 0 ? (payDiv + Math.max(i.buybacks, 0)) / freeCashFlow : null;
  const netDebtToEbitda = i.ebitda > 0 ? netDebt / i.ebitda : null;

  // Factor sub-scores (0..100).
  const coverage = clamp01(cover / 2.5) * 100; // 2.5× FCF cover ⇒ full marks
  const payout = payoutRatio === null
    ? (i.netIncome <= 0 ? 0 : 100)
    : clamp01(1 - (payoutRatio - 0.3) / 0.9) * 100; // 30% payout ⇒ 100, 120% ⇒ 0
  const leverage = netDebtToEbitda === null
    ? 60 // unknown EBITDA → neutral-ish
    : netDebt <= 0
      ? 100 // net cash
      : clamp01(1 - netDebtToEbitda / 5) * 100; // 5× net debt/EBITDA ⇒ 0
  const cashflow = freeCashFlow > 0 ? 100 : 0;

  const score = Math.round(0.35 * coverage + 0.25 * payout + 0.25 * leverage + 0.15 * cashflow);

  const grade: DivGrade = score >= 80 ? "Very safe" : score >= 65 ? "Safe" : score >= 45 ? "Borderline" : "At risk";

  const flags: string[] = [];
  if (freeCashFlow <= 0) flags.push("Negative free cash flow");
  else if (cover < 1) flags.push("Free cash flow does not cover the dividend");
  if (payoutRatio !== null && payoutRatio > 1) flags.push("Dividend exceeds net income");
  else if (payoutRatio !== null && payoutRatio > 0.8) flags.push("High earnings payout ratio");
  if (i.netIncome <= 0) flags.push("Unprofitable on a net-income basis");
  if (netDebtToEbitda !== null && netDebtToEbitda > 4) flags.push("Elevated leverage (>4× net debt/EBITDA)");
  if (totalPayoutRatio !== null && totalPayoutRatio > 1) flags.push("Dividends + buybacks exceed free cash flow");

  return {
    freeCashFlow, netDebt,
    payoutRatio, fcfPayout, fcfCoverage, totalPayoutRatio, netDebtToEbitda,
    subscores: { coverage, payout, leverage, cashflow },
    score, grade, flags,
  };
}
