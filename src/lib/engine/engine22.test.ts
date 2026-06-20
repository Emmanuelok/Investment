import { describe, it, expect } from "vitest";
import { dividendSafety, type DivInput } from "./dividend-safety";

const base: DivInput = {
  dividends: 15, buybacks: 80, netIncome: 100, operatingCashFlow: 110, capex: 10,
  totalDebt: 100, cash: 60, ebitda: 130,
};

describe("dividend-safety engine", () => {
  it("rates a well-covered, low-payout, net-cash payer as very safe", () => {
    const r = dividendSafety({ ...base, totalDebt: 20, cash: 60 }); // net cash
    expect(r.freeCashFlow).toBe(100); // 110 − 10
    expect(r.fcfCoverage).toBeCloseTo(100 / 15, 4);
    expect(r.payoutRatio).toBeCloseTo(0.15, 4);
    expect(r.netDebt).toBe(-40);
    expect(r.subscores.leverage).toBe(100); // net cash ⇒ full marks
    expect(r.grade).toBe("Very safe");
    expect(r.score).toBeGreaterThanOrEqual(80);
    expect(r.flags).toHaveLength(0);
  });

  it("flags an over-distributing payer that out-pays earnings and FCF", () => {
    const r = dividendSafety({
      dividends: 90, buybacks: 0, netIncome: 80, operatingCashFlow: 85, capex: 20,
      totalDebt: 300, cash: 20, ebitda: 70,
    });
    // FCF = 65, coverage 0.72 (<1), payout 1.125 (>1), net debt/EBITDA = 280/70 = 4
    expect(r.freeCashFlow).toBe(65);
    expect(r.fcfCoverage).toBeCloseTo(65 / 90, 4);
    expect(r.payoutRatio).toBeCloseTo(1.125, 4);
    expect(r.grade).toBe("At risk");
    expect(r.flags).toContain("Free cash flow does not cover the dividend");
    expect(r.flags).toContain("Dividend exceeds net income");
  });

  it("treats no dividend as a distinct grade, not a failure", () => {
    const r = dividendSafety({ ...base, dividends: 0 });
    expect(r.grade).toBe("No dividend");
    expect(r.payoutRatio).toBeNull();
    expect(r.fcfCoverage).toBeNull();
    expect(r.score).toBe(0);
    expect(r.flags).toContain("No common dividend paid");
  });

  it("flags negative free cash flow and unprofitability", () => {
    const r = dividendSafety({
      dividends: 10, buybacks: 0, netIncome: -5, operatingCashFlow: 8, capex: 20,
      totalDebt: 100, cash: 10, ebitda: 5,
    });
    expect(r.freeCashFlow).toBe(-12);
    expect(r.subscores.cashflow).toBe(0);
    expect(r.fcfCoverage).toBeNull();
    expect(r.flags).toContain("Negative free cash flow");
    expect(r.flags).toContain("Unprofitable on a net-income basis");
    expect(r.grade).toBe("At risk");
  });

  it("flags buybacks + dividends together exceeding free cash flow", () => {
    const r = dividendSafety({ ...base, dividends: 30, buybacks: 90 }); // FCF 100, total payout 120%
    expect(r.totalPayoutRatio).toBeCloseTo(1.2, 4);
    expect(r.flags).toContain("Dividends + buybacks exceed free cash flow");
  });

  it("score is monotonic in leverage, all else equal", () => {
    const low = dividendSafety({ ...base, totalDebt: 50, cash: 50 }); // net debt 0
    const high = dividendSafety({ ...base, totalDebt: 600, cash: 20 }); // net debt 580 → ~4.5×
    expect(high.score).toBeLessThan(low.score);
  });
});
