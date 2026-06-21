import { describe, it, expect } from "vitest";
import { buildSectorScorecard, type SectorSeries } from "./sector-scorecard";

const geo = (daily: number, n = 220, start = 100): number[] => Array.from({ length: n }, (_, i) => start * Math.pow(1 + daily, i));
const bench = geo(0.0003);

describe("sector-scorecard — scoring & tilt", () => {
  it("a strongly outperforming sector scores high and is Overweight; a laggard Underweight", () => {
    const sectors: SectorSeries[] = [
      { id: "XLK", label: "Technology", group: "Sensitive", closes: geo(0.0009) }, // strong
      { id: "XLU", label: "Utilities", group: "Defensive", closes: geo(-0.0006) }, // weak
    ];
    const r = buildSectorScorecard(sectors, "SPY", bench);
    const tech = r.sectors.find((s) => s.id === "XLK");
    const util = r.sectors.find((s) => s.id === "XLU");
    expect(tech?.rank).toBe(1);
    expect(tech?.score).toBeGreaterThan(65);
    expect(tech?.tilt).toBe("Overweight");
    expect(util?.tilt).toBe("Underweight");
    expect(r.leader).toBe("Technology");
    expect(r.laggard).toBe("Utilities");
  });
});

describe("sector-scorecard — offense vs defense", () => {
  it("cyclicals/sensitives leading defensives reads as risk-on", () => {
    const sectors: SectorSeries[] = [
      { id: "XLK", label: "Technology", group: "Sensitive", closes: geo(0.0009) },
      { id: "XLY", label: "Consumer Disc", group: "Cyclical", closes: geo(0.0008) },
      { id: "XLF", label: "Financials", group: "Cyclical", closes: geo(0.0007) },
      { id: "XLP", label: "Staples", group: "Defensive", closes: geo(-0.0002) },
      { id: "XLU", label: "Utilities", group: "Defensive", closes: geo(-0.0004) },
    ];
    const r = buildSectorScorecard(sectors, "SPY", bench);
    expect(r.offenseScore).toBeGreaterThan(r.defenseScore);
    expect(r.offenseDefenseSpread).toBeGreaterThan(10);
    expect(r.riskAppetite).toBe("Risk-on");
  });

  it("defensives leading reads as risk-off", () => {
    const sectors: SectorSeries[] = [
      { id: "XLK", label: "Technology", group: "Sensitive", closes: geo(-0.0006) },
      { id: "XLY", label: "Consumer Disc", group: "Cyclical", closes: geo(-0.0005) },
      { id: "XLP", label: "Staples", group: "Defensive", closes: geo(0.0006) },
      { id: "XLU", label: "Utilities", group: "Defensive", closes: geo(0.0007) },
      { id: "XLV", label: "Health Care", group: "Defensive", closes: geo(0.0005) },
    ];
    const r = buildSectorScorecard(sectors, "SPY", bench);
    expect(r.offenseDefenseSpread).toBeLessThan(-10);
    expect(r.riskAppetite).toBe("Risk-off");
  });

  it("ranks dense and reports trend flags", () => {
    const sectors: SectorSeries[] = [
      { id: "XLK", label: "Technology", group: "Sensitive", closes: geo(0.0008) },
      { id: "XLE", label: "Energy", group: "Sensitive", closes: geo(0.0001) },
      { id: "XLU", label: "Utilities", group: "Defensive", closes: geo(-0.0005) },
    ];
    const r = buildSectorScorecard(sectors, "SPY", bench);
    expect(r.sectors.map((s) => s.rank)).toEqual([1, 2, 3]);
    expect(r.sectors[0].aboveSMA200).toBe(true);
    expect(r.sectors[r.sectors.length - 1].aboveSMA200).toBe(false);
  });
});
