/**
 * Earnings-quality engine — Sloan accruals ratio and cash-conversion analysis.
 * High accruals (earnings not backed by cash) historically predict weaker
 * forward returns. Operates on the same FinancialYear shape as the EDGAR route.
 */
import type { FinancialYear } from "./fundamental-score";

const has = (v: number | undefined): v is number => typeof v === "number" && Number.isFinite(v);

export type EarningsQuality = {
  accrualsRatio: number | null; // (NI − CFO) / avg assets, % — lower/negative = higher quality
  cashConversion: number | null; // CFO / NI — > 1 = earnings cash-backed
  score: number; // 0..100
  grade: "A" | "B" | "C" | "D" | "F";
  flags: { tone: "pos" | "neg" | "warn"; text: string }[];
};

export function earningsQuality(cur: FinancialYear, prior?: FinancialYear): EarningsQuality {
  const avgAssets = has(cur.totalAssets) && prior && has(prior.totalAssets) ? (cur.totalAssets + prior.totalAssets) / 2 : cur.totalAssets;
  const accrualsRatio = has(cur.netIncome) && has(cur.operatingCashFlow) && has(avgAssets) && avgAssets !== 0
    ? ((cur.netIncome - cur.operatingCashFlow) / avgAssets) * 100 : null;
  const cashConversion = has(cur.operatingCashFlow) && has(cur.netIncome) && cur.netIncome !== 0 ? cur.operatingCashFlow / cur.netIncome : null;

  let score = 50;
  const flags: EarningsQuality["flags"] = [];

  if (accrualsRatio !== null) {
    if (accrualsRatio < 0) { score += 25; flags.push({ tone: "pos", text: `Cash flow exceeds earnings (accruals ${accrualsRatio.toFixed(1)}%) — conservative` }); }
    else if (accrualsRatio < 5) score += 10;
    else if (accrualsRatio < 15) { score -= 5; }
    else { score -= 25; flags.push({ tone: "neg", text: `High accruals (${accrualsRatio.toFixed(1)}%) — earnings may not persist` }); }
  }
  if (cashConversion !== null) {
    if (cashConversion > 1.1) score += 20;
    else if (cashConversion >= 0.9) score += 10;
    else if (cashConversion >= 0.6) { score -= 5; flags.push({ tone: "warn", text: `Earnings only ${cashConversion.toFixed(2)}× cash-backed` }); }
    else { score -= 20; flags.push({ tone: "neg", text: `Weak cash conversion (${cashConversion.toFixed(2)}×)` }); }
  }
  if (has(cur.operatingCashFlow) && cur.operatingCashFlow < 0) { score -= 10; flags.push({ tone: "neg", text: "Negative operating cash flow" }); }
  else if (has(cur.operatingCashFlow)) score += 5;
  if (has(cur.netIncome) && cur.netIncome > 0) score += 5;

  score = Math.max(0, Math.min(100, Math.round(score)));
  const grade = score >= 80 ? "A" : score >= 65 ? "B" : score >= 50 ? "C" : score >= 35 ? "D" : "F";
  if (!flags.length) flags.push({ tone: "pos", text: "Earnings well-supported by cash flow" });
  return { accrualsRatio, cashConversion, score, grade, flags };
}
