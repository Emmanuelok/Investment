/**
 * Quality-income / dividend screener. Ranks a universe of dividend payers by a
 * blended score that rewards yield but, crucially, penalizes *unsafe* yield — a
 * high payout ratio, weak profitability or heavy leverage that puts the dividend
 * at risk (the classic yield trap). Each name gets a yield score, a safety score
 * (payout-driven) and a quality score (ROE + leverage), combined into a composite
 * with a grade and risk flags. Pure & deterministic; the route assembles the
 * per-name metrics from a fundamentals feed.
 */

export type IncomeStock = {
  symbol: string;
  name: string;
  dividendYield: number; // %
  payoutRatio: number; // % (0 = unknown); >100 ⇒ paying out more than it earns
  roe: number; // %
  debtToEquity: number; // ratio
};

export type IncomeGrade = "Top pick" | "Solid" | "Fair" | "Risky";

export type IncomeRead = IncomeStock & {
  yieldScore: number;
  safetyScore: number;
  qualityScore: number;
  composite: number; // 0..100
  rank: number;
  grade: IncomeGrade;
  flags: string[];
};

export type IncomeScreenReport = {
  stocks: IncomeRead[];
  avgYield: number;
  best: string | null;
  scanned: number;
};

const clamp = (x: number, lo: number, hi: number): number => (x < lo ? lo : x > hi ? hi : x);
const mean = (a: number[]): number => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);

function scoreOne(s: IncomeStock): IncomeRead {
  // Yield: reward up to ~6%, then taper (a very high yield often signals risk).
  const yieldScore = s.dividendYield <= 6 ? clamp((s.dividendYield / 6) * 100, 0, 100) : clamp(100 - (s.dividendYield - 6) * 8, 40, 100);

  // Safety: driven by the payout ratio (lower = safer). Unknown ⇒ neutral.
  const safetyScore = s.payoutRatio <= 0 ? 50 : clamp(100 - (s.payoutRatio - 40) * (100 / 60), 0, 100);

  // Quality: ROE and balance-sheet leverage.
  const roeScore = clamp((s.roe / 20) * 100, 0, 100);
  const debtScore = clamp((1 - s.debtToEquity / 2) * 100, 0, 100);
  const qualityScore = 0.6 * roeScore + 0.4 * debtScore;

  const composite = Math.round(0.4 * yieldScore + 0.35 * safetyScore + 0.25 * qualityScore);
  const grade: IncomeGrade = composite >= 75 ? "Top pick" : composite >= 60 ? "Solid" : composite >= 45 ? "Fair" : "Risky";

  const flags: string[] = [];
  if (s.payoutRatio > 100) flags.push("Payout exceeds earnings");
  else if (s.payoutRatio > 90) flags.push("Very high payout ratio");
  if (s.dividendYield > 8) flags.push("Possible yield trap");
  if (s.debtToEquity > 2.5) flags.push("Elevated leverage");
  if (s.roe > 0 && s.roe < 5) flags.push("Weak profitability");

  return { ...s, yieldScore, safetyScore, qualityScore, composite, rank: 0, grade, flags };
}

export function buildIncomeScreen(stocks: IncomeStock[]): IncomeScreenReport {
  const reads = stocks
    .map(scoreOne)
    .sort((a, b) => b.composite - a.composite)
    .map((r, i) => ({ ...r, rank: i + 1 }));

  return {
    stocks: reads,
    avgYield: reads.length ? mean(reads.map((r) => r.dividendYield)) : 0,
    best: reads.length ? reads[0].symbol : null,
    scanned: reads.length,
  };
}
