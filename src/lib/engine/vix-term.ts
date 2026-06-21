/**
 * VIX term-structure / fear-regime engine. The shape of the implied-volatility
 * term structure is a clean stress signal: in calm markets near-term VIX trades
 * *below* 3-month VIX (contango); in stress the curve inverts (backwardation) as
 * spot fear spikes above longer-dated vol. From VIX and VIX3M histories it
 * computes the term ratio and structure, where spot VIX sits in its own history
 * (percentile), the recent change, the variance-risk premium (implied − realized
 * vol) when a realized-vol reading is supplied, and a 0–100 fear score with a
 * Calm→Panic regime. Pure & deterministic; the route supplies the FRED series.
 */

export type VixInput = {
  vix: number[]; // VIX (≈1-month implied vol) history, oldest → newest
  vix3m: number[]; // VIX3M (3-month implied vol) history
  realizedVol?: number; // optional current annualized realized vol (%) for the VRP
};

export type TermStructure = "Contango" | "Flat" | "Backwardation";
export type FearRegime = "Calm" | "Normal" | "Elevated" | "Panic";

export type VixTermReport = {
  vix: number;
  vix3m: number;
  termRatio: number; // vix / vix3m  (<1 contango, >1 backwardation)
  termStructure: TermStructure;
  vixPercentile: number; // current VIX within its own history (0..100)
  vixChange: number; // change over the recent window (vol points)
  varianceRiskPremium: number | null; // VIX − realized vol
  fearScore: number; // 0..100
  regime: FearRegime;
};

const CHG_LAG = 5;
const clamp = (x: number, lo: number, hi: number): number => (x < lo ? lo : x > hi ? hi : x);

export function percentileOf(series: number[], value: number): number {
  if (!series.length) return 50;
  let below = 0;
  for (const x of series) if (x <= value) below++;
  return (below / series.length) * 100;
}

function structureOf(ratio: number): TermStructure {
  if (ratio < 0.95) return "Contango";
  if (ratio > 1.05) return "Backwardation";
  return "Flat";
}

function regimeOf(vix: number): FearRegime {
  if (vix < 16) return "Calm";
  if (vix < 22) return "Normal";
  if (vix < 30) return "Elevated";
  return "Panic";
}

export function analyzeVixTerm(input: VixInput): VixTermReport {
  const v = input.vix.filter((x) => Number.isFinite(x) && x > 0);
  const v3 = input.vix3m.filter((x) => Number.isFinite(x) && x > 0);
  if (v.length < 2) {
    return {
      vix: 0, vix3m: 0, termRatio: 1, termStructure: "Flat", vixPercentile: 50,
      vixChange: 0, varianceRiskPremium: null, fearScore: 0, regime: "Calm",
    };
  }
  const vix = v[v.length - 1];
  const vix3m = v3.length ? v3[v3.length - 1] : vix;
  const termRatio = vix3m > 0 ? vix / vix3m : 1;
  const past = v[Math.max(0, v.length - 1 - CHG_LAG)];
  const vixChange = vix - past;
  const vixPercentile = percentileOf(v, vix);
  const varianceRiskPremium = typeof input.realizedVol === "number" ? vix - input.realizedVol : null;

  // Fear score: blend of where spot VIX sits historically and term-structure stress.
  const termStress = clamp((termRatio - 0.85) / 0.4, 0, 1) * 100; // 0.85 → 0, 1.25 → 100
  const fearScore = Math.round(clamp(0.6 * vixPercentile + 0.4 * termStress, 0, 100));

  return {
    vix,
    vix3m,
    termRatio,
    termStructure: structureOf(termRatio),
    vixPercentile,
    vixChange,
    varianceRiskPremium,
    fearScore,
    regime: regimeOf(vix),
  };
}
