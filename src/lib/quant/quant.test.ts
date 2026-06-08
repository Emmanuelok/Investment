import { describe, it, expect } from "vitest";
import { mean, std, variance, normCdf, normInv, erf, correlation, skewness } from "@/lib/quant/stats";
import { sma, ema, rsi, bollinger } from "@/lib/quant/indicators";
import { candleSeries, type Candle } from "@/lib/rng";
import { runBacktest, deflatedSharpe, pbo, STRATEGIES } from "@/lib/quant/backtest";

/* ── stats: numerical-correctness vs known closed-form values ─────────────── */
describe("stats", () => {
  it("mean and sample std match textbook values", () => {
    expect(mean([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])).toBeCloseTo(5.5, 10);
    // sample std of {2,4,4,4,5,5,7,9} is exactly 2.138... ; population is 2.0
    expect(variance([2, 4, 4, 4, 5, 5, 7, 9], false)).toBeCloseTo(4, 10);
    expect(std([2, 4, 4, 4, 5, 5, 7, 9], false)).toBeCloseTo(2, 10);
  });

  it("normal CDF/inverse are consistent and accurate", () => {
    expect(erf(0)).toBeCloseTo(0, 6);
    expect(normCdf(0)).toBeCloseTo(0.5, 6);
    expect(normCdf(1.959963985)).toBeCloseTo(0.975, 4);
    expect(normInv(0.975)).toBeCloseTo(1.959963985, 3);
    // round-trip
    expect(normCdf(normInv(0.84))).toBeCloseTo(0.84, 4);
  });

  it("correlation of identical series is 1, of negated is -1", () => {
    const a = [1, 2, 3, 4, 5, 6];
    expect(correlation(a, a)).toBeCloseTo(1, 10);
    expect(correlation(a, a.map((x) => -x))).toBeCloseTo(-1, 10);
  });

  it("skewness of a symmetric series is ~0", () => {
    expect(skewness([-2, -1, 0, 1, 2])).toBeCloseTo(0, 6);
  });
});

/* ── indicators: window math and alignment ───────────────────────────────── */
describe("indicators", () => {
  it("SMA computes the trailing average with correct leading nulls", () => {
    const s = sma([1, 2, 3, 4, 5], 3);
    expect(s[0]).toBeNull();
    expect(s[1]).toBeNull();
    expect(s[2]).toBeCloseTo(2, 10); // (1+2+3)/3
    expect(s[3]).toBeCloseTo(3, 10);
    expect(s[4]).toBeCloseTo(4, 10);
  });

  it("EMA seeds at the first value and stays within range", () => {
    const e = ema([10, 10, 10, 10, 10], 3);
    expect(e[4]).toBeCloseTo(10, 10);
  });

  it("RSI of a strictly increasing series approaches 100", () => {
    const up = Array.from({ length: 30 }, (_, i) => 100 + i);
    const r = rsi(up, 14);
    expect(r[29]).not.toBeNull();
    expect(r[29] as number).toBeGreaterThan(99);
  });

  it("Bollinger upper >= mid >= lower", () => {
    const vals = Array.from({ length: 40 }, (_, i) => 100 + Math.sin(i / 3) * 5);
    const b = bollinger(vals, 20, 2);
    const i = 39;
    expect(b.upper[i] as number).toBeGreaterThanOrEqual(b.mid[i] as number);
    expect(b.mid[i] as number).toBeGreaterThanOrEqual(b.lower[i] as number);
  });
});

/* ── backtest engine: no look-ahead + metric sanity ──────────────────────── */
describe("backtest engine", () => {
  const candles = candleSeries("test-series", 260, 100, 0.02, 0.0006);

  it("buy-and-hold benchmark equals the compounded market return", () => {
    const res = runBacktest(candles, STRATEGIES.sma_cross, { fast: 10, slow: 50 }, 0);
    const manual = candles.slice(1).reduce((acc, c, i) => acc * (c.c / candles[i].c), 1);
    expect(res.benchmark[res.benchmark.length - 1]).toBeCloseTo(manual, 6);
  });

  it("an always-long strategy with zero cost reproduces buy & hold (no look-ahead leakage)", () => {
    const alwaysLong: Candle[] = candles;
    const strat = { ...STRATEGIES.momentum, positions: () => alwaysLong.map(() => 1) };
    const res = runBacktest(candles, strat, {}, 0);
    expect(res.equity[res.equity.length - 1]).toBeCloseTo(res.benchmark[res.benchmark.length - 1], 6);
  });

  it("transaction cost reduces return vs frictionless", () => {
    const free = runBacktest(candles, STRATEGIES.sma_cross, { fast: 10, slow: 30 }, 0).metrics.totalReturn;
    const costly = runBacktest(candles, STRATEGIES.sma_cross, { fast: 10, slow: 30 }, 25).metrics.totalReturn;
    expect(costly).toBeLessThanOrEqual(free);
  });

  it("metrics are finite", () => {
    const m = runBacktest(candles, STRATEGIES.rsi_meanrev, { period: 14, lo: 30, hi: 70 }, 5).metrics;
    expect(Number.isFinite(m.sharpe)).toBe(true);
    expect(Number.isFinite(m.maxDD)).toBe(true);
    expect(m.maxDD).toBeLessThanOrEqual(0);
    expect(m.exposure).toBeGreaterThanOrEqual(0);
    expect(m.exposure).toBeLessThanOrEqual(1);
  });
});

/* ── overfitting diagnostics ─────────────────────────────────────────────── */
describe("overfitting diagnostics", () => {
  const rets = candleSeries("dsr-test", 252, 100, 0.01, 0.0008).slice(1).map((c, i, a) => (i === 0 ? 0 : c.c / a[i - 1].c - 1));

  it("Deflated Sharpe is a probability in [0,1] and rises with the observed Sharpe", () => {
    const low = deflatedSharpe(rets, 0.02, 20, 0.0004);
    const high = deflatedSharpe(rets, 0.12, 20, 0.0004);
    expect(low).toBeGreaterThanOrEqual(0);
    expect(low).toBeLessThanOrEqual(1);
    expect(high).toBeGreaterThanOrEqual(low);
  });

  it("PBO is in [0,1]; a dominant config yields low overfitting probability", () => {
    // config 0 is strictly best every block; others are noise
    const T = 200;
    const good = Array.from({ length: T }, () => 0.01);
    const noise = () => Array.from({ length: T }, (_, i) => Math.sin(i) * 0.01);
    const matrix = [good, noise(), noise(), noise()];
    const p = pbo(matrix, 10);
    expect(p).toBeGreaterThanOrEqual(0);
    expect(p).toBeLessThanOrEqual(1);
    expect(p).toBeLessThan(0.5);
  });
});
