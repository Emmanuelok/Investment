import { describe, it, expect } from "vitest";
import { piotroskiFScore, altmanZScore, qualityGrade, type FinancialYear } from "./fundamental-score";

// A strong, improving company
const strongCur: FinancialYear = { fiscalYear: 2024, revenue: 1200, netIncome: 180, operatingCashFlow: 220, totalAssets: 1000, totalLiabilities: 400, currentAssets: 500, currentLiabilities: 200, longTermDebt: 150, sharesOutstanding: 100, grossProfit: 600, retainedEarnings: 450, ebit: 240, marketCap: 3000, stockholdersEquity: 600 };
const strongPrior: FinancialYear = { fiscalYear: 2023, revenue: 1000, netIncome: 120, operatingCashFlow: 150, totalAssets: 950, totalLiabilities: 420, currentAssets: 430, currentLiabilities: 210, longTermDebt: 180, sharesOutstanding: 100, grossProfit: 470, retainedEarnings: 300, ebit: 170, marketCap: 2400, stockholdersEquity: 530 };

// A weak, deteriorating company
const weakCur: FinancialYear = { fiscalYear: 2024, revenue: 800, netIncome: -50, operatingCashFlow: -20, totalAssets: 1200, totalLiabilities: 1050, currentAssets: 200, currentLiabilities: 400, longTermDebt: 600, sharesOutstanding: 140, grossProfit: 160, retainedEarnings: -200, ebit: -40, marketCap: 300, stockholdersEquity: 150 };
const weakPrior: FinancialYear = { fiscalYear: 2023, revenue: 900, netIncome: 10, operatingCashFlow: 30, totalAssets: 1150, totalLiabilities: 900, currentAssets: 300, currentLiabilities: 350, longTermDebt: 500, sharesOutstanding: 110, grossProfit: 230, retainedEarnings: -150, ebit: 20, marketCap: 600, stockholdersEquity: 250 };

describe("Piotroski F-Score", () => {
  it("scores a strong company high and a weak company low", () => {
    const s = piotroskiFScore(strongCur, strongPrior);
    const w = piotroskiFScore(weakCur, weakPrior);
    expect(s.score).toBeGreaterThanOrEqual(7);
    expect(s.label).toBe("Strong");
    expect(w.score).toBeLessThanOrEqual(3);
    expect(w.label).toBe("Weak");
  });
  it("reports 9 criteria and an evaluable max", () => {
    const s = piotroskiFScore(strongCur, strongPrior);
    expect(s.criteria.length).toBe(9);
    expect(s.max).toBe(9);
    expect(s.score).toBeLessThanOrEqual(s.max);
  });
  it("skips criteria with missing data (lower max, not false)", () => {
    const partial = piotroskiFScore({ netIncome: 10, totalAssets: 100 }, { netIncome: 5, totalAssets: 100 });
    expect(partial.max).toBeLessThan(9);
    expect(partial.criteria.some((c) => c.pass === null)).toBe(true);
  });
});

describe("Altman Z-Score", () => {
  it("rates a healthy firm Safe and a distressed firm Distress", () => {
    expect(altmanZScore(strongCur).zone).toBe("Safe");
    expect(altmanZScore(weakCur).zone).toBe("Distress");
  });
  it("returns Unknown when inputs are missing", () => {
    expect(altmanZScore({ revenue: 100 }).z).toBeNull();
    expect(altmanZScore({ revenue: 100 }).zone).toBe("Unknown");
  });
  it("exposes the five components when computed", () => {
    expect(altmanZScore(strongCur).components.length).toBe(5);
  });
});

describe("quality grade", () => {
  it("grades a high-quality profile A/B and a poor one D/F", () => {
    const good = qualityGrade({ profitMargin: 22, grossMargin: 65, roe: 28, revenueGrowth: 20, debtToEquity: 30 });
    const bad = qualityGrade({ profitMargin: -5, grossMargin: 18, roe: -8, revenueGrowth: -12, debtToEquity: 320 });
    expect(["A", "B"]).toContain(good.grade);
    expect(["D", "F"]).toContain(bad.grade);
    expect(good.score).toBeGreaterThan(bad.score);
  });
  it("weights only the metrics present", () => {
    const g = qualityGrade({ roe: 20 });
    expect(g.drivers.length).toBe(1);
    expect(g.score).toBeGreaterThanOrEqual(0);
    expect(g.score).toBeLessThanOrEqual(100);
  });
});
