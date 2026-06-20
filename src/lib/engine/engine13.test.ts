import { describe, it, expect } from "vitest";
import { beneishMScore, type BeneishYear } from "./beneish";

// All indices ≈ 1 and TATA ≈ 0 → M ≈ −2.48 (textbook neutral)
const neutralCur: BeneishYear = { revenue: 1000, receivables: 100, grossProfit: 400, currentAssets: 500, ppe: 300, totalAssets: 1000, depreciation: 50, sga: 200, longTermDebt: 150, currentLiabilities: 100, netIncome: 100, operatingCashFlow: 100 };
const neutralPrior: BeneishYear = { revenue: 1000, receivables: 100, grossProfit: 400, currentAssets: 500, ppe: 300, totalAssets: 1000, depreciation: 50, sga: 200, longTermDebt: 150, currentLiabilities: 100, netIncome: 100, operatingCashFlow: 100 };

describe("Beneish M-Score", () => {
  it("a flat, cash-backed company scores 'Unlikely'", () => {
    const r = beneishMScore(neutralCur, neutralPrior);
    expect(r.m).not.toBeNull();
    expect(r.m!).toBeCloseTo(-2.48, 2);
    expect(r.verdict).toBe("Unlikely");
    expect(r.coverage).toBe(1);
  });

  it("aggressive receivables + sales growth + accruals flags manipulation", () => {
    const cur: BeneishYear = {
      revenue: 1600, receivables: 360, grossProfit: 760, currentAssets: 700, ppe: 320, totalAssets: 1300,
      depreciation: 40, sga: 240, longTermDebt: 300, currentLiabilities: 150, netIncome: 260, operatingCashFlow: 40,
    };
    const r = beneishMScore(cur, neutralPrior);
    expect(r.m!).toBeGreaterThan(-1.78);
    expect(r.verdict).toBe("Likely manipulation");
  });

  it("flags estimated indices and lowers coverage when data is missing", () => {
    const sparseCur: BeneishYear = { revenue: 1100, totalAssets: 1000, netIncome: 90, operatingCashFlow: 95 };
    const sparsePrior: BeneishYear = { revenue: 1000, totalAssets: 1000 };
    const r = beneishMScore(sparseCur, sparsePrior);
    expect(r.coverage).toBeLessThan(1);
    expect(r.indices.some((i) => i.estimated)).toBe(true);
    // SGI and TATA are computable here
    expect(r.indices.find((i) => i.key === "SGI")!.estimated).toBe(false);
    expect(r.indices.find((i) => i.key === "TATA")!.estimated).toBe(false);
  });

  it("returns 'Insufficient data' when coverage is too low", () => {
    const r = beneishMScore({ revenue: 1000 }, { revenue: 900 });
    expect(r.verdict).toBe("Insufficient data");
    expect(r.m).toBeNull();
  });

  it("always returns all 8 indices", () => {
    expect(beneishMScore(neutralCur, neutralPrior).indices.length).toBe(8);
  });
});
