import { describe, it, expect } from "vitest";
import { computeRRG, quadrantOf } from "./rrg";

const flat = Array.from({ length: 120 }, () => 100);

describe("RRG / sector rotation", () => {
  it("quadrantOf maps the four corners", () => {
    expect(quadrantOf(101, 101)).toBe("Leading");
    expect(quadrantOf(101, 99)).toBe("Weakening");
    expect(quadrantOf(99, 99)).toBe("Lagging");
    expect(quadrantOf(99, 101)).toBe("Improving");
  });

  it("an outperformer sits on the right (RS-Ratio > 100)", () => {
    const up = Array.from({ length: 120 }, (_, i) => 100 * Math.pow(1.004, i));
    const r = computeRRG(up, flat, 12, 8)!;
    expect(r).not.toBeNull();
    expect(r.ratio).toBeGreaterThan(100);
    expect(["Leading", "Weakening"]).toContain(r.quadrant);
  });

  it("an underperformer sits on the left (RS-Ratio < 100)", () => {
    const down = Array.from({ length: 120 }, (_, i) => 100 * Math.pow(0.996, i));
    const r = computeRRG(down, flat, 12, 8)!;
    expect(r.ratio).toBeLessThan(100);
    expect(["Lagging", "Improving"]).toContain(r.quadrant);
  });

  it("accelerating outperformance lands in Leading", () => {
    const accel = Array.from({ length: 160 }, (_, i) => 100 * Math.pow(1.0006 * (1 + i / 400), i));
    const r = computeRRG(accel, flat, 12, 8)!;
    expect(r.ratio).toBeGreaterThan(100);
    expect(r.momentum).toBeGreaterThan(100);
    expect(r.quadrant).toBe("Leading");
  });

  it("returns a bounded tail and null on short series", () => {
    const r = computeRRG(Array.from({ length: 120 }, (_, i) => 100 + Math.sin(i / 5)), flat, 12, 8)!;
    expect(r.tail.length).toBeGreaterThan(0);
    expect(r.tail.length).toBeLessThanOrEqual(8);
    expect(computeRRG([1, 2, 3], flat, 12)).toBeNull();
  });
});
