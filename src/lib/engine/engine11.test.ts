import { describe, it, expect } from "vitest";
import { earningsQuality } from "./earnings-quality";
import type { FinancialYear } from "./fundamental-score";

const cashRich: FinancialYear = { netIncome: 100, operatingCashFlow: 140, totalAssets: 1000 };
const accrualHeavy: FinancialYear = { netIncome: 200, operatingCashFlow: 40, totalAssets: 1000 };
const prior: FinancialYear = { totalAssets: 900 };

describe("earnings quality", () => {
  it("rewards cash-backed earnings (negative accruals, high conversion)", () => {
    const q = earningsQuality(cashRich, prior);
    expect(q.accrualsRatio).toBeLessThan(0);
    expect(q.cashConversion).toBeCloseTo(1.4, 6);
    expect(["A", "B"]).toContain(q.grade);
    expect(q.flags.some((f) => f.tone === "pos")).toBe(true);
  });
  it("penalizes high accruals / weak conversion", () => {
    const q = earningsQuality(accrualHeavy, prior);
    expect(q.accrualsRatio).toBeGreaterThan(15);
    expect(q.cashConversion).toBeLessThan(0.6);
    expect(["D", "F"]).toContain(q.grade);
    expect(q.flags.some((f) => f.tone === "neg")).toBe(true);
  });
  it("flags negative operating cash flow", () => {
    const q = earningsQuality({ netIncome: 50, operatingCashFlow: -30, totalAssets: 500 });
    expect(q.flags.some((f) => /negative operating/i.test(f.text))).toBe(true);
  });
  it("averages assets across years when prior is given; score is bounded", () => {
    const q = earningsQuality(cashRich, prior);
    // avg assets = (1000+900)/2 = 950 → accruals = (100-140)/950*100 ≈ -4.21
    expect(q.accrualsRatio!).toBeCloseTo(-4.21, 1);
    expect(q.score).toBeGreaterThanOrEqual(0);
    expect(q.score).toBeLessThanOrEqual(100);
  });
  it("returns nulls gracefully when inputs are missing", () => {
    const q = earningsQuality({ revenue: 100 });
    expect(q.accrualsRatio).toBeNull();
    expect(q.cashConversion).toBeNull();
    expect(q.flags.length).toBeGreaterThan(0);
  });
});
