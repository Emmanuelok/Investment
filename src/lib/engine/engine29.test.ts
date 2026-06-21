import { describe, it, expect } from "vitest";
import { avgPairwise, pairwiseCorrs, rollingAvgPairwise, analyzeCorrelationRegime, type AssetSeries } from "./correlation-regime";

const A = Array.from({ length: 90 }, (_, i) => Math.sin(i * 0.6) * 0.012 + 0.0005);
const negA = A.map((x) => -x);

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296 - 0.5;
  };
}
function randCloses(seed: number, n = 140, drift = 0): number[] {
  const rnd = mulberry32(seed * 2654435761);
  const c = [100];
  for (let i = 0; i < n; i++) c.push(c[c.length - 1] * Math.exp(rnd() * 0.02 + drift));
  return c;
}
function closesFromLog(logs: number[]): number[] {
  const c = [100];
  for (const r of logs) c.push(c[c.length - 1] * Math.exp(r));
  return c;
}
const asset = (symbol: string, assetClass: string, closes: number[]): AssetSeries => ({ symbol, assetClass, closes });

describe("correlation-regime — pairwise primitives", () => {
  it("avgPairwise is +1 for identical rows and −1 for negated rows", () => {
    expect(avgPairwise([A, A])).toBeCloseTo(1, 6);
    expect(avgPairwise([A, negA])).toBeCloseTo(-1, 6);
    expect(avgPairwise([A, A, negA])).toBeCloseTo(-1 / 3, 6); // {+1, −1, −1}/3
  });

  it("pairwiseCorrs labels and sorts strongest-first", () => {
    const pairs = pairwiseCorrs([A, A, negA], ["X", "Y", "Z"]);
    expect(pairs[0]).toMatchObject({ a: "X", b: "Y" });
    expect(pairs[0].corr).toBeCloseTo(1, 6);
    expect(pairs[pairs.length - 1].corr).toBeCloseTo(-1, 6);
  });

  it("rollingAvgPairwise produces a series of window estimates", () => {
    const rows = [randCloses(1), randCloses(2), randCloses(3)].map((c) => c.slice(1).map((x, i) => Math.log(x / c[i])));
    const roll = rollingAvgPairwise(rows, 40, 10);
    expect(roll.length).toBeGreaterThan(1);
    for (const v of roll) expect(Math.abs(v)).toBeLessThanOrEqual(1.0001);
  });
});

describe("correlation-regime — full read", () => {
  it("identical assets collapse to a crisis regime with ~1 effective bet", () => {
    const closes = randCloses(7);
    const assets = [asset("A", "Equity", closes), asset("B", "Credit", closes), asset("C", "Commodity", closes), asset("D", "FX", closes)];
    const r = analyzeCorrelationRegime(assets);
    expect(r.avgPairwise).toBeCloseTo(1, 4);
    expect(r.regime).toBe("Crisis");
    expect(r.effectiveBets).toBeCloseTo(1, 3);
    expect(r.diversification).toBeLessThan(30);
  });

  it("independent assets read as diversified with many effective bets", () => {
    const assets = [
      asset("SPY", "Equity", randCloses(11)),
      asset("TLT", "Bond", randCloses(22)),
      asset("GLD", "Commodity", randCloses(33)),
      asset("UUP", "FX", randCloses(44)),
    ];
    const r = analyzeCorrelationRegime(assets);
    expect(r.avgPairwise).toBeLessThan(0.45);
    expect(["Diversified", "Normal"]).toContain(r.regime);
    expect(r.effectiveBets).toBeGreaterThan(2);
  });

  it("reports the equity-vs-bond correlation when both proxies are tagged", () => {
    const eq = randCloses(5);
    const eqLogs = eq.slice(1).map((x, i) => Math.log(x / eq[i]));
    const bond = closesFromLog(eqLogs.map((x) => -x)); // mirror of equity
    const r = analyzeCorrelationRegime([asset("SPY", "Equity", eq), asset("TLT", "Bond", bond)]);
    expect(r.stockBondCorr).not.toBeNull();
    expect(r.stockBondCorr as number).toBeLessThan(0);
  });

  it("reads risk-off when a broad selloff lifts correlations", () => {
    const downAll = randCloses(9, 140, -0.004); // common downward drift → correlated decline
    const r = analyzeCorrelationRegime([asset("A", "Equity", downAll), asset("B", "Credit", downAll), asset("C", "Commodity", downAll)]);
    expect(r.equityReturn).toBeLessThan(0);
    expect(r.avgPairwise).toBeGreaterThan(0.45);
    expect(r.riskAppetite).toBe("Risk-off");
  });

  it("reads risk-on when the equity proxy rises amid low correlations", () => {
    const r = analyzeCorrelationRegime([
      asset("SPY", "Equity", randCloses(2, 140, 0.004)), // upward drift
      asset("TLT", "Bond", randCloses(80)),
      asset("GLD", "Commodity", randCloses(81)),
    ]);
    expect(r.equityReturn).toBeGreaterThan(0);
    expect(r.avgPairwise).toBeLessThan(0.55);
    expect(r.riskAppetite).toBe("Risk-on");
  });
});
