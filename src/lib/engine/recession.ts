/**
 * Recession-probability / business-cycle-risk engine. Fuses the most reliable
 * leading indicators into a single recession read:
 *
 *   • Yield-curve probit (Estrella-Mishkin / NY Fed): the 10y−3m term spread
 *     maps to a 12-month recession probability P = Φ(−0.5333 − 0.6330·spread).
 *   • Sahm rule: the 3-month-average unemployment rate rising ≥0.50pp above its
 *     trailing-12-month low — a real-time recession-onset trigger.
 *   • Credit stress: high-yield spread level.
 *   • Leading-index momentum (optional).
 *
 * Each maps to a 0–1 risk, weight-blended into a composite risk score and a
 * Low→High level. Pure & deterministic; reuses the project normal CDF.
 */

import { normCdf } from "./options";

export type RecessionInput = {
  termSpread: number; // 10y − 3m, percentage points
  unrate: number[]; // monthly unemployment rate history, oldest → newest
  hyOas?: number[]; // high-yield OAS history (percent)
  leiYoY?: number; // optional leading-index YoY (%)
};

export type RecessionSignal = {
  id: string;
  label: string;
  value: number; // the raw indicator value
  risk: number; // 0..1 contribution
  weight: number;
  note: string;
};

export type RecessionLevel = "Low" | "Moderate" | "Elevated" | "High";

export type RecessionReport = {
  probability: number; // 0..100, headline 12-mo probit on the term spread
  compositeRisk: number; // 0..100, weighted blend of all signals
  level: RecessionLevel;
  termSpread: number;
  sahmGap: number;
  sahmTriggered: boolean;
  signals: RecessionSignal[];
};

const clamp = (x: number, lo: number, hi: number): number => (x < lo ? lo : x > hi ? hi : x);

/** NY Fed / Estrella-Mishkin probit: 10y−3m term spread → 12-month recession probability (0..1). */
export function probitRecession(termSpread: number): number {
  return normCdf(-0.5333 - 0.633 * termSpread);
}

/** 3-month moving average of a monthly series. */
function ma3(series: number[]): number[] {
  const out: number[] = [];
  for (let i = 2; i < series.length; i++) out.push((series[i] + series[i - 1] + series[i - 2]) / 3);
  return out;
}

/**
 * Sahm rule: current 3-month-average unemployment minus its minimum over the
 * trailing 12 months. A gap ≥ 0.50pp signals a recession has begun.
 */
export function sahmRule(unrate: number[]): { gap: number; triggered: boolean; current: number } {
  const m = ma3(unrate);
  if (m.length < 2) return { gap: 0, triggered: false, current: unrate.length ? unrate[unrate.length - 1] : 0 };
  const current = m[m.length - 1];
  const trailing = m.slice(Math.max(0, m.length - 12));
  const low = Math.min(...trailing);
  const gap = current - low;
  return { gap, triggered: gap >= 0.5, current };
}

function levelOf(score: number): RecessionLevel {
  if (score < 20) return "Low";
  if (score < 40) return "Moderate";
  if (score < 60) return "Elevated";
  return "High";
}

export function buildRecession(input: RecessionInput): RecessionReport {
  const pYc = probitRecession(input.termSpread);
  const sahm = sahmRule(input.unrate);

  const signals: RecessionSignal[] = [
    {
      id: "yieldCurve",
      label: "Yield-curve probit (10y−3m)",
      value: input.termSpread,
      risk: pYc,
      weight: 0.4,
      note: input.termSpread < 0 ? "inverted — classic recession lead" : "positively sloped",
    },
    {
      id: "sahm",
      label: "Sahm rule (unemployment)",
      value: sahm.gap,
      risk: clamp(sahm.gap / 0.5, 0, 1),
      weight: 0.3,
      note: sahm.triggered ? "triggered (≥0.5pp above 12m low)" : "below trigger",
    },
  ];

  if (input.hyOas && input.hyOas.length) {
    const oas = input.hyOas[input.hyOas.length - 1];
    signals.push({
      id: "credit",
      label: "High-yield credit spread",
      value: oas,
      risk: clamp((oas - 3.5) / 6.5, 0, 1), // 3.5% → 0, 10% → 1
      weight: 0.2,
      note: oas > 6 ? "stressed" : oas > 4.5 ? "widening" : "benign",
    });
  }

  if (typeof input.leiYoY === "number") {
    signals.push({
      id: "lei",
      label: "Leading index (YoY)",
      value: input.leiYoY,
      risk: clamp(-input.leiYoY / 5, 0, 1), // −5% YoY → 1
      weight: 0.1,
      note: input.leiYoY < 0 ? "contracting" : "expanding",
    });
  }

  const wsum = signals.reduce((s, x) => s + x.weight, 0) || 1;
  const compositeRisk = Math.round(clamp((signals.reduce((s, x) => s + x.risk * x.weight, 0) / wsum) * 100, 0, 100));

  return {
    probability: Math.round(pYc * 1000) / 10,
    compositeRisk,
    level: levelOf(compositeRisk),
    termSpread: input.termSpread,
    sahmGap: Math.round(sahm.gap * 100) / 100,
    sahmTriggered: sahm.triggered,
    signals,
  };
}
