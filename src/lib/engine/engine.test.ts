import { describe, it, expect } from "vitest";
import { sma, ema, rsi, macd, bollinger, atr, realizedVol, maxDrawdown, percentileRank, streak, swingLevels } from "./indicators";
import { classifyRegime } from "./regime";
import { factorScores } from "./score";
import { evaluateRules, type Rule } from "./alerts";
import { deriveInsights } from "./insights";
import { detectPatterns } from "./patterns";
import { candleSeries, type Candle } from "@/lib/rng";

const up: number[] = Array.from({ length: 120 }, (_, i) => 100 * Math.pow(1.005, i));
const down: number[] = Array.from({ length: 120 }, (_, i) => 100 * Math.pow(0.995, i));
const toCandles = (cl: number[]): Candle[] => cl.map((c, i) => ({ o: i ? cl[i - 1] : c, h: Math.max(c, i ? cl[i - 1] : c) * 1.004, l: Math.min(c, i ? cl[i - 1] : c) * 0.996, c, v: 1e6 }));

describe("indicators", () => {
  it("sma exact on simple sequence", () => {
    expect(sma([1, 2, 3, 4, 5], 3).slice(2)).toEqual([2, 3, 4]);
  });
  it("ema converges toward latest values and aligns length", () => {
    const e = ema(up, 10);
    expect(e.length).toBe(up.length);
    expect(e[up.length - 1]).toBeLessThan(up[up.length - 1]);
    expect(e[up.length - 1]).toBeGreaterThan(up[up.length - 12]);
  });
  it("rsi bounded and directional", () => {
    const rUp = rsi(up).at(-1)!, rDn = rsi(down).at(-1)!;
    expect(rUp).toBeGreaterThan(70);
    expect(rDn).toBeLessThan(30);
    for (const v of rsi(up).filter(Number.isFinite)) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(100); }
  });
  it("macd positive in steady uptrend", () => {
    const m = macd(up);
    expect(m.macd.at(-1)!).toBeGreaterThan(0);
    expect(Number.isFinite(m.signal.at(-1)!)).toBe(true);
  });
  it("bollinger brackets the mean", () => {
    const b = bollinger(up);
    const i = up.length - 1;
    expect(b.lower[i]).toBeLessThan(b.mid[i]);
    expect(b.upper[i]).toBeGreaterThan(b.mid[i]);
  });
  it("atr positive and finite", () => {
    const a = atr(toCandles(up)).at(-1)!;
    expect(a).toBeGreaterThan(0);
  });
  it("realizedVol higher for volatile series", () => {
    const wiggly = up.map((v, i) => v * (1 + (i % 2 ? 0.03 : -0.03)));
    expect(realizedVol(wiggly).at(-1)!).toBeGreaterThan(realizedVol(up).at(-1)!);
  });
  it("maxDrawdown exact", () => {
    expect(maxDrawdown([100, 120, 60, 80])).toBeCloseTo(-50, 6);
  });
  it("percentileRank sane", () => {
    expect(percentileRank([1, 2, 3, 4], 4)).toBe(100);
    expect(percentileRank([1, 2, 3, 4], 0)).toBe(0);
  });
  it("streak counts trailing run", () => {
    expect(streak([1, 2, 3, 4])).toBe(3);
    expect(streak([4, 3, 2, 1])).toBe(-3);
  });
  it("swingLevels straddle the last close", () => {
    const cs = candleSeries("lvl", 120, 100, 0.02, 0);
    const { support, resistance } = swingLevels(cs);
    const last = cs[cs.length - 1].c;
    expect(support).toBeLessThanOrEqual(last);
    expect(resistance).toBeGreaterThanOrEqual(last);
  });
});

describe("regime + scores + insights", () => {
  it("classifies a clean uptrend / downtrend", () => {
    expect(classifyRegime(toCandles(up)).trend).toBe("UPTREND");
    expect(classifyRegime(toCandles(down)).trend).toBe("DOWNTREND");
  });
  it("momentum factor ranks uptrend over downtrend", () => {
    const a = factorScores(toCandles(up)), b = factorScores(toCandles(down));
    expect(a.momentum).toBeGreaterThan(b.momentum);
    expect(a.trend).toBeGreaterThan(b.trend);
    for (const v of [a.composite, b.composite]) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(100); }
  });
  it("insights are evidence-backed and sorted by importance", () => {
    const { insights } = deriveInsights("TEST", candleSeries("ins", 150, 100, 0.02, 0.001));
    expect(insights.length).toBeGreaterThan(2);
    for (const i of insights) expect(i.evidence.length).toBeGreaterThan(0);
    for (let k = 1; k < insights.length; k++) expect(Math.abs(insights[k - 1].score)).toBeGreaterThanOrEqual(Math.abs(insights[k].score));
  });
});

describe("pattern detection", () => {
  it("flags a bullish engulfing", () => {
    const c: Candle[] = [
      ...Array.from({ length: 6 }, (_, i) => ({ o: 100 - i, h: 101 - i, l: 98 - i, c: 99 - i, v: 1 })), // downtrend
      { o: 94, h: 94.5, l: 92, c: 92.5, v: 1 }, // red
      { o: 92, h: 97, l: 91.8, c: 96.5, v: 1 }, // green engulfs prior
    ];
    const names = detectPatterns(c).map((p) => p.name);
    expect(names).toContain("Bullish Engulfing");
  });
  it("flags a gap up and dedupes by name", () => {
    const c: Candle[] = [
      { o: 100, h: 101, l: 99, c: 100, v: 1 },
      { o: 105, h: 106, l: 104, c: 105.5, v: 1 }, // low 104 > prior high 101 → gap up
    ];
    const ps = detectPatterns(c);
    expect(ps.some((p) => p.name === "Gap Up")).toBe(true);
    expect(new Set(ps.map((p) => p.name)).size).toBe(ps.length);
  });
  it("doji has small body", () => {
    const c: Candle[] = [{ o: 100, h: 105, l: 95, c: 100.1, v: 1 }, { o: 100, h: 105, l: 95, c: 100.05, v: 1 }];
    expect(detectPatterns(c).some((p) => p.name === "Doji")).toBe(true);
  });
});

describe("alert rule engine", () => {
  const rules: Rule[] = [
    { id: "1", symbol: "AAA", kind: "priceAbove", value: 100, enabled: true },
    { id: "2", symbol: "AAA", kind: "moveAbsPct", value: 2, enabled: true },
    { id: "3", symbol: "AAA", kind: "priceBelow", value: 90, enabled: true },
    { id: "4", symbol: "AAA", kind: "rsiBelow", value: 35, enabled: true },
  ];
  it("fires only matching rules with computed bodies", () => {
    const fired = evaluateRules(rules, { AAA: { price: 105, chgPct: 2.5, candles: toCandles(down) } });
    const ids = fired.map((x) => x.ruleId).sort();
    expect(ids).toContain("1");
    expect(ids).toContain("2");
    expect(ids).not.toContain("3");
    expect(ids).toContain("4"); // downtrend candles → low RSI
    expect(fired.find((x) => x.ruleId === "2")!.title).toContain("+2.50%");
  });
  it("disabled rules never fire", () => {
    const fired = evaluateRules([{ ...rules[0], enabled: false }], { AAA: { price: 200, chgPct: 0 } });
    expect(fired.length).toBe(0);
  });
});
