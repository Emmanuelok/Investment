import { describe, it, expect } from "vitest";
import { monthlyReturns, computeMonthlySeasonality, buildSeasonalityCalendar, type DatedBar } from "./seasonality-calendar";

// one month-end bar per month, 2018–2023, with a chosen Jan & Jul return
function makeBars(janRet = 0.05, julRet = -0.03, base = 0.005): DatedBar[] {
  const bars: DatedBar[] = [];
  let c = 100;
  for (let y = 2018; y <= 2023; y++) {
    for (let m = 0; m < 12; m++) {
      const r = m === 0 ? janRet : m === 6 ? julRet : base;
      c *= 1 + r;
      bars.push({ t: Date.UTC(y, m, 15) / 1000, c });
    }
  }
  return bars;
}

describe("seasonality-calendar — monthly stats", () => {
  it("monthlyReturns labels each return by calendar month", () => {
    const r = monthlyReturns(makeBars());
    expect(r.length).toBe(71); // 72 month-ends → 71 returns
    expect(r.every((x) => x.month >= 1 && x.month <= 12)).toBe(true);
  });

  it("computeMonthlySeasonality recovers the seeded January strength and July weakness", () => {
    const m = computeMonthlySeasonality(makeBars());
    const jan = m.find((x) => x.month === 1);
    const jul = m.find((x) => x.month === 7);
    expect(jan?.avgReturn).toBeCloseTo(5, 1);
    expect(jan?.winRate).toBe(100);
    expect(jul?.avgReturn).toBeCloseTo(-3, 1);
    expect(jul?.winRate).toBe(0);
  });
});

describe("seasonality-calendar — cross-asset current-month read", () => {
  it("identifies the current month's best/worst and tailwinds vs headwinds", () => {
    const cal = buildSeasonalityCalendar(
      [
        { id: "SPY", label: "S&P 500", bars: makeBars(0.05, -0.03) }, // strong January
        { id: "GLD", label: "Gold", bars: makeBars(-0.04, 0.05) }, // weak January
      ],
      1, // current month = January
    );
    const spy = cal.assets.find((a) => a.id === "SPY");
    const gld = cal.assets.find((a) => a.id === "GLD");
    expect(spy?.bestMonth).toBe(1);
    expect(spy?.worstMonth).toBe(7);
    expect(spy?.currentMonthEdge).toBeCloseTo(5, 1);
    expect(gld?.currentMonthEdge).toBeCloseTo(-4, 1);
    expect(cal.assets[0].id).toBe("SPY"); // sorted by current-month edge desc
    expect(cal.tailwinds).toContain("S&P 500");
    expect(cal.headwinds).toContain("Gold");
  });

  it("respects a different current month", () => {
    const cal = buildSeasonalityCalendar([{ id: "SPY", label: "S&P 500", bars: makeBars(0.05, -0.03) }], 7);
    expect(cal.assets[0].currentMonthEdge).toBeCloseTo(-3, 1); // July
    expect(cal.headwinds).toContain("S&P 500");
  });

  it("skips assets without enough monthly history", () => {
    const shortBars: DatedBar[] = [
      { t: Date.UTC(2023, 0, 15) / 1000, c: 100 },
      { t: Date.UTC(2023, 1, 15) / 1000, c: 101 },
    ];
    const cal = buildSeasonalityCalendar([{ id: "X", label: "X", bars: shortBars }], 1);
    expect(cal.assets.length).toBe(0);
  });
});
