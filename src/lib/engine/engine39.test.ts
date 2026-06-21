import { describe, it, expect } from "vitest";
import { buildTrendFollowing, type TsAsset } from "./trend-following";

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296 - 0.5;
  };
}
// trending walk: constant drift + noise (so vol is non-zero)
function walk(drift: number, volDaily: number, seed: number, n = 260): number[] {
  const rnd = mulberry32(seed * 2654435761);
  const c = [100];
  for (let i = 0; i < n; i++) c.push(c[c.length - 1] * Math.exp(drift + rnd() * volDaily));
  return c;
}

describe("trend-following — signals", () => {
  it("goes long on uptrends and short on downtrends", () => {
    const assets: TsAsset[] = [
      { id: "spy", label: "Equities", assetClass: "Equity", closes: walk(0.0008, 0.01, 1) }, // up
      { id: "tlt", label: "Bonds", assetClass: "Rates", closes: walk(-0.0007, 0.01, 2) }, // down
    ];
    const r = buildTrendFollowing(assets);
    const eq = r.signals.find((s) => s.id === "spy");
    const bond = r.signals.find((s) => s.id === "tlt");
    expect(eq?.signal).toBe("Long");
    expect(eq?.mom12m).toBeGreaterThan(0);
    expect(bond?.signal).toBe("Short");
    expect(bond?.mom12m).toBeLessThan(0);
  });

  it("volatility-targets positions so the lower-vol asset carries more weight", () => {
    const assets: TsAsset[] = [
      { id: "lowvol", label: "Low vol", assetClass: "A", closes: walk(0.0008, 0.006, 3) },
      { id: "hivol", label: "High vol", assetClass: "B", closes: walk(0.0008, 0.02, 4) },
    ];
    const r = buildTrendFollowing(assets);
    const lo = r.signals.find((s) => s.id === "lowvol");
    const hi = r.signals.find((s) => s.id === "hivol");
    expect(lo?.signal).toBe("Long");
    expect(hi?.signal).toBe("Long");
    expect(Math.abs(lo!.weight)).toBeGreaterThan(Math.abs(hi!.weight)); // lower vol ⇒ bigger weight
    expect(r.grossExposure).toBeCloseTo(100, 4); // scaled to 100% gross
  });

  it("aggregates net/gross exposure and counts", () => {
    const assets: TsAsset[] = [
      { id: "a", label: "A", assetClass: "Equity", closes: walk(0.0009, 0.01, 5) }, // long
      { id: "b", label: "B", assetClass: "Commodity", closes: walk(0.0008, 0.01, 6) }, // long
      { id: "c", label: "C", assetClass: "Rates", closes: walk(-0.0008, 0.01, 7) }, // short
    ];
    const r = buildTrendFollowing(assets);
    expect(r.longCount).toBe(2);
    expect(r.shortCount).toBe(1);
    expect(r.grossExposure).toBeCloseTo(100, 4);
    expect(r.netExposure).toBeGreaterThan(0); // net long (2 long, 1 short, similar vols)
    expect(r.netExposure).toBeLessThan(r.grossExposure);
  });

  it("reads a strong-trend regime when momentum is large across assets", () => {
    const assets: TsAsset[] = [1, 2, 3, 4].map((s) => ({ id: `a${s}`, label: `A${s}`, assetClass: "X", closes: walk(0.001, 0.008, s + 10) }));
    const r = buildTrendFollowing(assets);
    expect(r.trendStrength).toBeGreaterThan(15);
    expect(r.regime).toBe("Strong trends");
  });
});
