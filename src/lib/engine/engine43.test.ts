import { describe, it, expect } from "vitest";
import { buildIncomeScreen, type IncomeStock } from "./income-screener";

const mk = (symbol: string, dividendYield: number, payoutRatio: number, roe: number, debtToEquity: number): IncomeStock => ({
  symbol,
  name: symbol,
  dividendYield,
  payoutRatio,
  roe,
  debtToEquity,
});

describe("income-screener", () => {
  it("rates a moderate-yield, well-covered, high-quality payer highly", () => {
    const r = buildIncomeScreen([mk("AAA", 4.0, 45, 25, 0.6)]);
    const a = r.stocks[0];
    expect(a.yieldScore).toBeGreaterThan(60);
    expect(a.safetyScore).toBeGreaterThan(80); // 45% payout
    expect(a.composite).toBeGreaterThanOrEqual(60);
    expect(["Top pick", "Solid"]).toContain(a.grade);
    expect(a.flags).toHaveLength(0);
  });

  it("flags a yield trap and grades it poorly", () => {
    const r = buildIncomeScreen([mk("TRAP", 12, 120, 3, 3.0)]);
    const t = r.stocks[0];
    expect(t.flags).toContain("Possible yield trap");
    expect(t.flags).toContain("Payout exceeds earnings");
    expect(t.flags).toContain("Elevated leverage");
    expect(t.flags).toContain("Weak profitability");
    expect(t.safetyScore).toBe(0); // payout 120 ⇒ 0
    expect(t.grade).toBe("Risky");
  });

  it("ranks by composite and reports the best name + average yield", () => {
    const r = buildIncomeScreen([
      mk("LOWQ", 9, 110, 4, 2.8), // trap-ish
      mk("GOOD", 3.5, 40, 22, 0.5), // quality
      mk("MID", 5, 70, 12, 1.2),
    ]);
    expect(r.scanned).toBe(3);
    expect(r.stocks[0].symbol).toBe("GOOD"); // highest composite
    expect(r.best).toBe("GOOD");
    expect(r.stocks.map((s) => s.rank)).toEqual([1, 2, 3]);
    expect(r.avgYield).toBeCloseTo((9 + 3.5 + 5) / 3, 6);
  });

  it("treats an unknown payout ratio as neutral safety", () => {
    const r = buildIncomeScreen([mk("UNK", 3, 0, 15, 1.0)]);
    expect(r.stocks[0].safetyScore).toBe(50);
  });
});
