/**
 * Macro-regime / nowcast engine. Classifies the economy into a growth×inflation
 * quadrant and scores recession risk from the yield curve, unemployment trend
 * and growth momentum. Pure logic — the route feeds it FRED-derived trends.
 */

export type MacroRegime = "Goldilocks" | "Reflation" | "Stagflation" | "Contraction";

export type MacroInput = {
  growthScore: number; // -100..100 (momentum of activity: payrolls / industrial production / GDP)
  inflationScore: number; // -100..100 (direction of CPI/PCE YoY)
  curveSlope: number; // 10Y − 2Y, in percentage points (negative = inverted)
  unemploymentTrend: number; // change in UNRATE over ~6m, pp (positive = rising)
};

export type MacroReport = {
  regime: MacroRegime;
  regimeDetail: string;
  growthDir: "Expanding" | "Slowing";
  inflationDir: "Rising" | "Falling";
  recessionRisk: number; // 0..100
  riskLabel: "Low" | "Moderate" | "Elevated" | "High";
  signals: { tone: "pos" | "neg" | "warn" | "info"; text: string }[];
};

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

/** Momentum score from a series: last value vs the value `back` points ago, scaled. */
export function seriesTrend(values: number[], back = 6, scale = 5): number {
  const fin = values.filter(Number.isFinite);
  if (fin.length < back + 1) return 0;
  const last = fin[fin.length - 1];
  const prior = fin[fin.length - 1 - back];
  if (!Number.isFinite(prior) || prior === 0) return 0;
  return clamp(((last - prior) / Math.abs(prior)) * 100 * scale, -100, 100);
}

export function classifyMacroRegime(i: MacroInput): MacroReport {
  const growthDir = i.growthScore >= 0 ? "Expanding" : "Slowing";
  const inflationDir = i.inflationScore >= 0 ? "Rising" : "Falling";

  let regime: MacroRegime;
  let regimeDetail: string;
  if (growthDir === "Expanding" && inflationDir === "Falling") { regime = "Goldilocks"; regimeDetail = "Growth firm, inflation cooling — the most equity-friendly quadrant."; }
  else if (growthDir === "Expanding" && inflationDir === "Rising") { regime = "Reflation"; regimeDetail = "Growth and inflation both accelerating — favors real assets & cyclicals."; }
  else if (growthDir === "Slowing" && inflationDir === "Rising") { regime = "Stagflation"; regimeDetail = "Growth fading while inflation persists — the hardest regime for risk assets."; }
  else { regime = "Contraction"; regimeDetail = "Growth and inflation both falling — disinflationary slowdown; favors duration."; }

  // recession risk
  let risk = 0;
  const signals: MacroReport["signals"] = [];
  if (i.curveSlope < 0) { const add = clamp(-i.curveSlope * 45, 0, 55); risk += add; signals.push({ tone: "neg", text: `Yield curve inverted (${i.curveSlope.toFixed(2)}pp 10Y−2Y) — classic recession lead indicator` }); }
  else if (i.curveSlope < 0.3) { risk += 12; signals.push({ tone: "warn", text: `Yield curve flat (${i.curveSlope.toFixed(2)}pp) — late-cycle` }); }
  else signals.push({ tone: "pos", text: `Yield curve positive (${i.curveSlope.toFixed(2)}pp) — no inversion stress` });

  if (i.unemploymentTrend >= 0.5) { risk += 30; signals.push({ tone: "neg", text: `Unemployment rising ${i.unemploymentTrend.toFixed(1)}pp (~6m) — Sahm-rule territory` }); }
  else if (i.unemploymentTrend >= 0.2) { risk += 15; signals.push({ tone: "warn", text: `Unemployment ticking up ${i.unemploymentTrend.toFixed(1)}pp (~6m)` }); }
  else signals.push({ tone: "pos", text: `Labor market stable (unemployment ${i.unemploymentTrend >= 0 ? "+" : ""}${i.unemploymentTrend.toFixed(1)}pp)` });

  if (i.growthScore < -20) { risk += 20; signals.push({ tone: "neg", text: `Activity momentum negative (${i.growthScore.toFixed(0)})` }); }
  else if (i.growthScore > 20) signals.push({ tone: "pos", text: `Activity momentum positive (${i.growthScore.toFixed(0)})` });

  risk = clamp(risk);
  const riskLabel = risk < 20 ? "Low" : risk < 45 ? "Moderate" : risk < 70 ? "Elevated" : "High";

  return { regime, regimeDetail, growthDir, inflationDir, recessionRisk: Math.round(risk), riskLabel, signals };
}
