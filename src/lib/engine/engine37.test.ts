import { describe, it, expect } from "vitest";
import { trailingReturn, buildRegionalRotation, type RegionSeries } from "./regional-rotation";

const geo = (daily: number, n = 260, start = 100): number[] => Array.from({ length: n }, (_, i) => start * Math.pow(1 + daily, i));
const bench = geo(0.0003);

describe("regional-rotation — primitives", () => {
  it("trailingReturn computes the horizon return", () => {
    expect(trailingReturn([100, 101, 102, 103, 104, 105, 110], 6)).toBeCloseTo(10, 6);
  });
});

describe("regional-rotation — allocation signals", () => {
  it("US strength + weak EM reads as a US tilt with risk-off appetite", () => {
    const regions: RegionSeries[] = [
      { id: "SPY", label: "US", bucket: "US", closes: geo(0.0007) },
      { id: "VGK", label: "Europe", bucket: "DM", closes: geo(0.0003) },
      { id: "EWJ", label: "Japan", bucket: "DM", closes: geo(0.0003) },
      { id: "EEM", label: "Emerging", bucket: "EM", closes: geo(-0.001) },
    ];
    const r = buildRegionalRotation(regions, "ACWI", bench);
    expect(r.leader).toBe("US");
    expect(r.tilt).toBe("US");
    expect(r.usVsWorld).toBeGreaterThan(2);
    expect(r.emVsDm).toBeLessThan(-2);
    expect(r.riskAppetite).toBe("Risk-off");
  });

  it("EM leadership reads as international tilt with risk-on appetite", () => {
    const regions: RegionSeries[] = [
      { id: "SPY", label: "US", bucket: "US", closes: geo(0.0002) },
      { id: "VGK", label: "Europe", bucket: "DM", closes: geo(0.0002) },
      { id: "EEM", label: "Emerging", bucket: "EM", closes: geo(0.0009) },
      { id: "INDA", label: "India", bucket: "EM", closes: geo(0.0008) },
    ];
    const r = buildRegionalRotation(regions, "ACWI", bench);
    expect(r.emVsDm).toBeGreaterThan(2);
    expect(r.riskAppetite).toBe("Risk-on");
    expect(r.tilt).toBe("International");
    expect(r.regions[0].bucket).toBe("EM");
  });

  it("global breadth reflects the share of regions above their 200-DMA", () => {
    const regions: RegionSeries[] = [
      { id: "SPY", label: "US", bucket: "US", closes: geo(0.0005) },
      { id: "VGK", label: "Europe", bucket: "DM", closes: geo(0.0004) },
      { id: "EWJ", label: "Japan", bucket: "DM", closes: geo(-0.001) }, // below
      { id: "EEM", label: "Emerging", bucket: "EM", closes: geo(-0.001) }, // below
    ];
    expect(buildRegionalRotation(regions, "ACWI", bench).globalBreadth).toBe(50);
  });

  it("ranks regions by relative strength and reports leader/laggard", () => {
    const regions: RegionSeries[] = [
      { id: "SPY", label: "US", bucket: "US", closes: geo(0.0006) },
      { id: "VGK", label: "Europe", bucket: "DM", closes: geo(0.0001) },
      { id: "EEM", label: "Emerging", bucket: "EM", closes: geo(0.0003) },
    ];
    const r = buildRegionalRotation(regions, "ACWI", bench);
    expect(r.regions.map((x) => x.rank)).toEqual([1, 2, 3]);
    expect(r.leader).toBe("US");
    expect(r.laggard).toBe("Europe");
  });
});
