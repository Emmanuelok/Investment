import { describe, it, expect } from "vitest";
import { blackScholes, impliedVol, normCdf, probITM } from "./options";
import { runBacktest, signal } from "./backtest";
import { pearson, correlationMatrix, beta, historicalVar, logReturns } from "./correlation";
import { candleSeries, type Candle } from "@/lib/rng";

const toCandles = (cl: number[]): Candle[] => cl.map((c, i) => ({ o: i ? cl[i - 1] : c, h: Math.max(c, i ? cl[i - 1] : c) * 1.005, l: Math.min(c, i ? cl[i - 1] : c) * 0.995, c, v: 1e6 }));
const up = Array.from({ length: 260 }, (_, i) => 100 * Math.pow(1.004, i));

describe("options — Black-Scholes", () => {
  it("normCdf anchors", () => {
    expect(normCdf(0)).toBeCloseTo(0.5, 5);
    expect(normCdf(1.96)).toBeCloseTo(0.975, 3);
    expect(normCdf(-1.96)).toBeCloseTo(0.025, 3);
  });
  it("ATM call ~ textbook value", () => {
    // S=100,K=100,T=1,σ=20%,r=5% → call ≈ 10.45
    const g = blackScholes({ spot: 100, strike: 100, t: 1, vol: 0.2, rate: 0.05, type: "call" });
    expect(g.price).toBeCloseTo(10.45, 1);
    expect(g.delta).toBeGreaterThan(0.5);
    expect(g.delta).toBeLessThan(0.7);
    expect(g.gamma).toBeGreaterThan(0);
    expect(g.vega).toBeGreaterThan(0);
    expect(g.theta).toBeLessThan(0);
  });
  it("put-call parity holds", () => {
    const a = { spot: 100, strike: 95, t: 0.5, vol: 0.25, rate: 0.04 } as const;
    const call = blackScholes({ ...a, type: "call" }).price;
    const put = blackScholes({ ...a, type: "put" }).price;
    // C - P = S - K e^{-rT}
    expect(call - put).toBeCloseTo(100 - 95 * Math.exp(-0.04 * 0.5), 4);
  });
  it("implied vol round-trips", () => {
    const i = { spot: 100, strike: 105, t: 0.75, rate: 0.03, type: "call" as const };
    const price = blackScholes({ ...i, vol: 0.33 }).price;
    const iv = impliedVol(price, i);
    expect(iv).not.toBeNull();
    expect(iv!).toBeCloseTo(0.33, 3);
  });
  it("probITM bounded and directional", () => {
    const deepITM = probITM({ spot: 150, strike: 100, t: 0.5, vol: 0.2, rate: 0.03, type: "call" });
    const deepOTM = probITM({ spot: 80, strike: 100, t: 0.5, vol: 0.2, rate: 0.03, type: "call" });
    expect(deepITM).toBeGreaterThan(0.9);
    expect(deepOTM).toBeLessThan(0.1);
  });
});

describe("backtester", () => {
  it("buy & hold equals the benchmark", () => {
    const r = runBacktest("buyhold", toCandles(up), { costBps: 0 });
    expect(r.metrics.totalReturn).toBeCloseTo(r.metrics.benchReturn, 4);
    expect(r.equity.at(-1)!).toBeCloseTo(r.benchmark.at(-1)!, 6);
  });
  it("produces aligned equity curves and bounded exposure", () => {
    const r = runBacktest("smaCross", toCandles(up), { costBps: 5 });
    expect(r.equity.length).toBe(up.length);
    expect(r.position.length).toBe(up.length);
    expect(r.metrics.exposure).toBeGreaterThanOrEqual(0);
    expect(r.metrics.exposure).toBeLessThanOrEqual(100);
    expect(r.metrics.winRate).toBeGreaterThanOrEqual(0);
    expect(r.metrics.winRate).toBeLessThanOrEqual(100);
  });
  it("costs drag returns vs zero-cost", () => {
    const cs = candleSeries("bt", 260, 100, 0.02, 0.0005);
    const free = runBacktest("smaCross", cs, { costBps: 0 }).metrics.totalReturn;
    const costed = runBacktest("smaCross", cs, { costBps: 50 }).metrics.totalReturn;
    expect(costed).toBeLessThanOrEqual(free + 1e-9);
  });
  it("signal stays within {-1,0,1}", () => {
    for (const v of signal("bollingerBreakout", candleSeries("s", 200, 100, 0.02, 0), { allowShort: true })) {
      expect([-1, 0, 1]).toContain(v);
    }
  });
});

describe("correlation & risk", () => {
  it("pearson: identical=1, inverse=-1", () => {
    const a = [1, 2, 3, 4, 5];
    expect(pearson(a, a)).toBeCloseTo(1, 6);
    expect(pearson(a, [5, 4, 3, 2, 1])).toBeCloseTo(-1, 6);
  });
  it("correlation matrix is symmetric with unit diagonal", () => {
    const series = { A: up, B: up.map((v) => v * 1.01), C: [...up].reverse() };
    const cm = correlationMatrix(series, 120);
    for (let i = 0; i < 3; i++) {
      expect(cm.matrix[i][i]).toBe(1);
      for (let j = 0; j < 3; j++) expect(cm.matrix[i][j]).toBeCloseTo(cm.matrix[j][i], 6);
    }
  });
  it("beta of a series vs itself is 1", () => {
    expect(beta(up, up, 120)).toBeCloseTo(1, 4);
  });
  it("historical VaR is negative and ES no better than VaR", () => {
    const rets = logReturns(candleSeries("v", 300, 100, 0.03, 0).map((c) => c.c));
    const { var: v, es } = historicalVar(rets, 0.95);
    expect(v).toBeLessThan(0);
    expect(es).toBeLessThanOrEqual(v + 1e-9);
  });
});
