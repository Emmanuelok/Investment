import { describe, it, expect } from "vitest";
import { probitRecession, sahmRule, buildRecession, type RecessionInput } from "./recession";

describe("recession — components", () => {
  it("the NY Fed probit maps the term spread to a recession probability", () => {
    expect(probitRecession(0)).toBeCloseTo(0.2969, 3); // Φ(−0.5333)
    expect(probitRecession(-1)).toBeCloseTo(0.5397, 3); // inverted ⇒ >50%
    expect(probitRecession(2)).toBeCloseTo(0.036, 3); // steep ⇒ low
    expect(probitRecession(-1)).toBeGreaterThan(probitRecession(0));
  });

  it("the Sahm rule triggers when 3-mo unemployment rises ≥0.5pp above its 12-mo low", () => {
    const rising = [...Array.from({ length: 10 }, () => 3.5), 3.6, 3.8, 4.0, 4.2];
    const s = sahmRule(rising);
    expect(s.gap).toBeCloseTo(0.5, 6);
    expect(s.triggered).toBe(true);

    const stable = Array.from({ length: 15 }, () => 3.6);
    expect(sahmRule(stable).triggered).toBe(false);
    expect(sahmRule(stable).gap).toBeCloseTo(0, 6);
  });
});

describe("recession — composite read", () => {
  const inverted: RecessionInput = {
    termSpread: -1.0,
    unrate: [...Array.from({ length: 10 }, () => 3.5), 3.6, 3.8, 4.0, 4.2],
    hyOas: [...Array.from({ length: 20 }, () => 5), 8],
  };
  const expansion: RecessionInput = {
    termSpread: 2.5,
    unrate: Array.from({ length: 15 }, () => 3.6),
    hyOas: Array.from({ length: 20 }, () => 3.5),
  };

  it("an inverted curve + Sahm trigger + wide credit reads as High risk", () => {
    const r = buildRecession(inverted);
    expect(r.probability).toBeCloseTo(54.0, 0); // probit(−1)
    expect(r.sahmTriggered).toBe(true);
    expect(r.compositeRisk).toBeGreaterThan(60);
    expect(r.level).toBe("High");
  });

  it("a steep curve + stable jobs + tight credit reads as Low risk", () => {
    const r = buildRecession(expansion);
    expect(r.probability).toBeLessThan(5);
    expect(r.compositeRisk).toBeLessThan(20);
    expect(r.level).toBe("Low");
  });

  it("includes the credit signal only when HY OAS is supplied, and LEI when present", () => {
    const withCredit = buildRecession(inverted);
    expect(withCredit.signals.some((s) => s.id === "credit")).toBe(true);

    const noCredit = buildRecession({ termSpread: -1, unrate: inverted.unrate });
    expect(noCredit.signals.some((s) => s.id === "credit")).toBe(false);

    const withLei = buildRecession({ ...inverted, leiYoY: -4 });
    const lei = withLei.signals.find((s) => s.id === "lei");
    expect(lei).toBeDefined();
    expect(lei?.risk).toBeGreaterThan(0.5); // −4% YoY is recessionary
  });
});
