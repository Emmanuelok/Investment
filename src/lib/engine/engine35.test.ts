import { describe, it, expect } from "vitest";
import {
  scoreFromSpread, scoreFromOas, scoreFromVix, scoreFromMomentum, scoreFromPercent,
  buildRiskPosture, type PostureSignal,
} from "./risk-posture";

describe("risk-posture — normalizers", () => {
  it("maps each raw reading to a 0..100 support score", () => {
    expect(scoreFromSpread(0)).toBe(50);
    expect(scoreFromSpread(2.5)).toBe(100);
    expect(scoreFromSpread(-2.5)).toBe(0);
    expect(scoreFromSpread(-1)).toBe(30);

    expect(scoreFromOas(3)).toBe(100);
    expect(scoreFromOas(11)).toBeCloseTo(4, 6);

    expect(scoreFromVix(12)).toBe(100);
    expect(scoreFromVix(20)).toBe(76);
    expect(scoreFromVix(45)).toBeCloseTo(1, 6);

    expect(scoreFromMomentum(0)).toBe(50);
    expect(scoreFromMomentum(15)).toBe(100);
    expect(scoreFromMomentum(-15)).toBe(0);
    expect(scoreFromMomentum(7.5)).toBe(75);

    expect(scoreFromPercent(63)).toBe(63);
    expect(scoreFromPercent(140)).toBe(100); // clamped
  });
});

describe("risk-posture — composite", () => {
  const sig = (id: string, score: number, weight = 1): PostureSignal => ({ id, label: id, category: "Test", reading: 0, score, weight, note: "" });

  it("blends supportive signals into a risk-on posture with full agreement", () => {
    const r = buildRiskPosture([sig("a", 90), sig("b", 85), sig("c", 80)]);
    expect(r.composite).toBe(85);
    expect(r.posture).toBe("Risk-on");
    expect(r.agreement).toBe(100);
    expect(r.riskOnCount).toBe(3);
  });

  it("blends stressed signals into a risk-off posture", () => {
    const r = buildRiskPosture([sig("a", 10), sig("b", 15), sig("c", 20)]);
    expect(r.composite).toBe(15);
    expect(r.posture).toBe("Risk-off");
    expect(r.riskOffCount).toBe(3);
    expect(r.agreement).toBe(100);
  });

  it("conflicting signals net to neutral with low agreement", () => {
    const r = buildRiskPosture([sig("a", 80), sig("b", 20), sig("c", 50)]);
    expect(r.composite).toBe(50);
    expect(r.posture).toBe("Neutral");
    expect(r.agreement).toBe(33); // only the ~neutral signal is "aligned"
  });

  it("weights let a heavy stress signal dominate", () => {
    const r = buildRiskPosture([sig("trend", 90, 1), sig("credit", 10, 4)]);
    expect(r.composite).toBe(26); // (90 + 40) / 5
    expect(r.posture).toBe("Risk-off");
  });
});
