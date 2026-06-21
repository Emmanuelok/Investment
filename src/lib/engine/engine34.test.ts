import { describe, it, expect } from "vitest";
import { trailingReturn, ratioChange, buildCommodities, type CommoditySeries } from "./commodities";

const geo = (daily: number, n = 200, start = 100): number[] => Array.from({ length: n }, (_, i) => start * Math.pow(1 + daily, i));

describe("commodities — primitives", () => {
  it("trailingReturn and ratioChange compute correctly", () => {
    expect(trailingReturn([100, 101, 102, 103, 104, 105, 110], 6)).toBeCloseTo(10, 6);
    // a rising 2x faster than b → ratio increases
    const rc = ratioChange(geo(0.001), geo(0.0002), 63);
    expect(rc).not.toBeNull();
    expect(rc!.change).toBeGreaterThan(0);
  });

  it("ratioChange returns null without enough overlap", () => {
    expect(ratioChange([1, 2], [1, 2], 63)).toBeNull();
  });
});

describe("commodities — cycle synthesis", () => {
  const mk = (copper: number, gold: number, oil: number, broad: number): CommoditySeries[] => [
    { id: "copper", label: "Copper", group: "Industrial", closes: geo(copper) },
    { id: "gold", label: "Gold", group: "Precious", closes: geo(gold) },
    { id: "oil", label: "Crude Oil", group: "Energy", closes: geo(oil) },
    { id: "broad", label: "Broad Commodities", group: "Broad", closes: geo(broad) },
  ];

  it("reflation: copper outpacing gold (growth↑) + broad rising (inflation↑)", () => {
    const r = buildCommodities(mk(0.0012, 0.0002, 0.001, 0.001));
    expect(r.copperGoldChange3m).toBeGreaterThan(5);
    expect(r.growthSignal).toBe("Improving");
    expect(r.broadMomentum).toBeGreaterThan(3);
    expect(r.inflationImpulse).toBe("Rising");
    expect(r.cycle).toBe("Reflation");
  });

  it("deflation: copper lagging gold (growth↓) + broad falling (inflation↓)", () => {
    const r = buildCommodities(mk(0.0002, 0.0014, -0.001, -0.001));
    expect(r.growthSignal).toBe("Deteriorating");
    expect(r.inflationImpulse).toBe("Falling");
    expect(r.cycle).toBe("Deflation");
  });

  it("stagflation: weak growth but rising commodities", () => {
    const r = buildCommodities(mk(0.0002, 0.0014, 0.0015, 0.0012));
    expect(r.growthSignal).toBe("Deteriorating");
    expect(r.inflationImpulse).toBe("Rising");
    expect(r.cycle).toBe("Stagflation");
  });

  it("computes per-commodity reads with trend tags", () => {
    const r = buildCommodities(mk(0.0012, 0.0002, 0.001, 0.001));
    const copper = r.reads.find((x) => x.id === "copper");
    expect(copper?.trend).toBe("Up");
    expect(r.copperGoldRatio).not.toBeNull();
    expect(r.goldOilRatio).not.toBeNull();
    expect(r.reads.length).toBe(4);
  });
});
