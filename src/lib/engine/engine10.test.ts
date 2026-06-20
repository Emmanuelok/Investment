import { describe, it, expect } from "vitest";
import { weightedMomentum, rsLine, rsNewHigh, relativeReturn, rsRating } from "./relative-strength";
import { trendTemplate } from "./trend-template";
import type { Candle } from "@/lib/rng";

const up = Array.from({ length: 260 }, (_, i) => 100 * Math.pow(1.004, i));
const down = Array.from({ length: 260 }, (_, i) => 100 * Math.pow(0.996, i));
const bench = Array.from({ length: 260 }, (_, i) => 100 * Math.pow(1.0015, i));
const toCandles = (cl: number[]): Candle[] => cl.map((c, i) => ({ o: i ? cl[i - 1] : c, h: Math.max(c, i ? cl[i - 1] : c) * 1.003, l: Math.min(c, i ? cl[i - 1] : c) * 0.997, c, v: 1e6 }));

describe("relative strength", () => {
  it("weighted momentum is positive in an uptrend, negative in a downtrend", () => {
    expect(weightedMomentum(up)).toBeGreaterThan(0);
    expect(weightedMomentum(down)).toBeLessThan(0);
  });
  it("RS line rises for an outperformer and registers a new high", () => {
    const line = rsLine(up, bench);
    expect(line[0]).toBeCloseTo(100, 6);
    expect(line.at(-1)!).toBeGreaterThan(100);
    expect(rsNewHigh(line)).toBe(true);
    expect(rsNewHigh(rsLine(down, bench))).toBe(false);
  });
  it("relative return is positive vs a slower benchmark", () => {
    expect(relativeReturn(up, bench, 63)).toBeGreaterThan(0);
    expect(relativeReturn(down, bench, 63)).toBeLessThan(0);
  });
  it("RS rating maps to a 1–99 percentile", () => {
    const scores = Array.from({ length: 50 }, (_, i) => i);
    expect(rsRating(49, scores)).toBeGreaterThanOrEqual(95);
    expect(rsRating(0, scores)).toBeLessThanOrEqual(5);
    const mid = rsRating(25, scores);
    expect(mid).toBeGreaterThan(40);
    expect(mid).toBeLessThan(60);
  });
});

describe("trend template", () => {
  it("a clean Stage-2 uptrend passes all 8 criteria with a strong RS", () => {
    const t = trendTemplate(toCandles(up), 88);
    expect(t.max).toBe(8);
    expect(t.pass).toBe(8);
    expect(t.passed).toBe(true);
  });
  it("a downtrend fails most criteria", () => {
    const t = trendTemplate(toCandles(down), 15);
    expect(t.pass).toBeLessThanOrEqual(2);
    expect(t.passed).toBe(false);
  });
  it("short series reports criteria as null (lower max), never false-positive", () => {
    const t = trendTemplate(toCandles(up.slice(-40)), 80);
    expect(t.max).toBeLessThan(8);
    expect(t.criteria.some((c) => c.pass === null)).toBe(true);
  });
  it("RS criterion reflects the supplied rating", () => {
    const lowRs = trendTemplate(toCandles(up), 40).criteria.find((c) => c.name.startsWith("RS"))!;
    expect(lowRs.pass).toBe(false);
    const noRs = trendTemplate(toCandles(up)).criteria.find((c) => c.name.startsWith("RS"))!;
    expect(noRs.pass).toBeNull();
  });
});
