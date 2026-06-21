import { describe, it, expect } from "vitest";
import { analyzeVixTerm, percentileOf, type VixInput } from "./vix-term";

const flat = (val: number, n = 60): number[] => Array.from({ length: n }, () => val);

describe("vix-term — primitives", () => {
  it("percentileOf ranks the current value", () => {
    expect(percentileOf([10, 12, 14, 16, 18], 14)).toBe(60);
    expect(percentileOf([10, 12, 14, 16, 18], 18)).toBe(100);
  });
});

describe("vix-term — term structure & regime", () => {
  it("contango when spot VIX trades below 3-month VIX", () => {
    const r = analyzeVixTerm({ vix: [...flat(18, 59), 20], vix3m: flat(22) });
    expect(r.termRatio).toBeCloseTo(20 / 22, 6);
    expect(r.termStructure).toBe("Contango");
  });

  it("backwardation (inversion) when spot spikes above 3-month VIX", () => {
    const r = analyzeVixTerm({ vix: [...flat(20, 59), 33], vix3m: flat(27) });
    expect(r.termRatio).toBeGreaterThan(1.05);
    expect(r.termStructure).toBe("Backwardation");
    expect(r.regime).toBe("Panic"); // 33 ≥ 30
  });

  it("maps the spot VIX level to a fear regime", () => {
    expect(analyzeVixTerm({ vix: [12, 12, 13], vix3m: flat(15, 3) }).regime).toBe("Calm");
    expect(analyzeVixTerm({ vix: [18, 18, 19], vix3m: flat(20, 3) }).regime).toBe("Normal");
    expect(analyzeVixTerm({ vix: [25, 25, 26], vix3m: flat(24, 3) }).regime).toBe("Elevated");
  });

  it("computes the variance-risk premium only when realized vol is supplied", () => {
    const withRv = analyzeVixTerm({ vix: flat(20), vix3m: flat(22), realizedVol: 14 });
    expect(withRv.varianceRiskPremium).toBeCloseTo(6, 6); // 20 − 14
    expect(analyzeVixTerm({ vix: flat(20), vix3m: flat(22) }).varianceRiskPremium).toBeNull();
  });

  it("fear score rises with the VIX percentile and a stressed term structure", () => {
    const calm = analyzeVixTerm({ vix: [...Array.from({ length: 59 }, (_, i) => 12 + i * 0.3), 13], vix3m: flat(20) });
    const panic = analyzeVixTerm({ vix: [...Array.from({ length: 59 }, (_, i) => 12 + i * 0.3), 45], vix3m: flat(30) });
    expect(panic.fearScore).toBeGreaterThan(calm.fearScore);
    expect(panic.vixPercentile).toBeGreaterThan(calm.vixPercentile);
    expect(panic.vixChange).toBeGreaterThan(0);
  });

  it("guards empty input", () => {
    const r = analyzeVixTerm({ vix: [], vix3m: [] });
    expect(Number.isFinite(r.fearScore)).toBe(true);
    expect(r.regime).toBe("Calm");
  });
});
