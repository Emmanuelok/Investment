import { describe, it, expect } from "vitest";
import { memberRead, computeBreadth, type Member } from "./breadth";

const up = (n = 260, start = 100, step = 0.5): number[] => Array.from({ length: n }, (_, i) => start + i * step);
const down = (n = 260, start = 230, step = 0.5): number[] => Array.from({ length: n }, (_, i) => start - i * step);
// V: decline for the first half, rise for the second (recent breadth improving)
const vshape = (n = 260): number[] => Array.from({ length: n }, (_, i) => (i < n / 2 ? 200 - i * 0.5 : 200 - (n / 2) * 0.5 + (i - n / 2) * 0.7));
// Λ: rise for the first half, decline for the second (recent breadth deteriorating)
const invV = (n = 260): number[] => Array.from({ length: n }, (_, i) => (i < n / 2 ? 120 + i * 0.5 : 120 + (n / 2) * 0.5 - (i - n / 2) * 0.7));

const basket = (mk: () => number[], k: number): Member[] => Array.from({ length: k }, (_, i) => ({ symbol: `S${i}`, closes: mk() }));

describe("breadth — member read", () => {
  it("flags an uptrending member above its MAs at a new high", () => {
    const r = memberRead("AAA", up());
    expect(r).not.toBeNull();
    expect(r!.aboveSMA50).toBe(true);
    expect(r!.aboveSMA200).toBe(true);
    expect(r!.newHigh52w).toBe(true);
    expect(r!.pctFrom52wHigh).toBeCloseTo(0, 6);
    expect(r!.ret1d).toBeGreaterThan(0);
  });

  it("flags a downtrending member below its MAs at a new low", () => {
    const r = memberRead("BBB", down());
    expect(r!.aboveSMA50).toBe(false);
    expect(r!.aboveSMA200).toBe(false);
    expect(r!.newLow52w).toBe(true);
    expect(r!.ret1d).toBeLessThan(0);
  });

  it("returns null for series too short to read", () => {
    expect(memberRead("X", [1, 2, 3])).toBeNull();
  });
});

describe("breadth — basket aggregation & regime", () => {
  it("a uniformly strong basket reads risk-on with full participation", () => {
    const b = computeBreadth(basket(up, 6));
    expect(b.members).toBe(6);
    expect(b.pctAboveSMA200).toBe(100);
    expect(b.pctAboveSMA50).toBe(100);
    expect(b.advancers).toBe(6);
    expect(b.newHighs).toBe(6);
    expect(b.highLowIndex).toBe(100);
    expect(b.breadthScore).toBe(100);
    expect(b.regime).toBe("Risk-on");
  });

  it("a uniformly weak basket reads risk-off", () => {
    const b = computeBreadth(basket(down, 6));
    expect(b.pctAboveSMA200).toBe(0);
    expect(b.newLows).toBe(6);
    expect(b.highLowIndex).toBe(0);
    expect(b.breadthScore).toBe(0);
    expect(b.regime).toBe("Risk-off");
  });

  it("a half-up / half-down basket is neutral", () => {
    const members = [...basket(up, 3), ...basket(down, 3)];
    const b = computeBreadth(members);
    expect(b.pctAboveSMA200).toBe(50);
    expect(b.advancers).toBe(3);
    expect(b.decliners).toBe(3);
    expect(b.regime).toBe("Neutral");
  });

  it("McClellan oscillator is positive when breadth is improving, negative when deteriorating", () => {
    expect(computeBreadth(basket(vshape, 5)).mcClellan).toBeGreaterThan(0);
    expect(computeBreadth(basket(invV, 5)).mcClellan).toBeLessThan(0);
  });

  it("detects a breadth thrust when participation flips from washed-out to broad", () => {
    expect(computeBreadth(basket(vshape, 8)).thrust).toBe(true);
    expect(computeBreadth(basket(up, 8)).thrust).toBe(false); // always-advancing never dips to ≤0.40
  });

  it("returns a recent A/D line tail", () => {
    const b = computeBreadth(basket(up, 5), 40);
    expect(b.adLine.length).toBeLessThanOrEqual(40);
    expect(b.adLine[b.adLine.length - 1]).toBeGreaterThan(b.adLine[0]); // cumulative net advances rising
  });
});
