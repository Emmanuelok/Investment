/**
 * Real-rates & inflation-expectations engine. Decomposes nominal Treasury yields
 * into their two economic components via the TIPS market:
 *
 *     nominal yield  =  real yield (TIPS)  +  breakeven inflation
 *
 * Real yields measure the restrictiveness of policy (how much above growth the
 * cost of capital sits); breakevens measure the market's inflation expectations.
 * From a basket of FRED series it computes each rate's latest level, recent
 * change and historical percentile, checks the decomposition identity, and
 * classifies the real-rate regime (Restrictive/Neutral/Accommodative) and the
 * inflation-expectations regime (Rising/Anchored/Falling). Pure & deterministic.
 */

export type RateKind = "Nominal" | "Real" | "Breakeven" | "Forward";

export type RateSeries = {
  id: string;
  label: string;
  tenor: string;
  kind: RateKind;
  series: number[]; // history (percent), oldest → newest
};

export type RatePoint = {
  id: string;
  label: string;
  tenor: string;
  kind: RateKind;
  latest: number;
  changeBps: number; // recent change in basis points
  percentile: number; // 0..100 within its own history
};

export type RealRateRegime = "Restrictive" | "Neutral" | "Accommodative";
export type InflationRegime = "Rising" | "Anchored" | "Falling";

export type RealRatesReport = {
  points: RatePoint[];
  nominal10y: number | null;
  real10y: number | null;
  breakeven10y: number | null;
  fwd5y5y: number | null;
  decompositionGap: number | null; // nominal − (real + breakeven), ≈ 0 by no-arbitrage
  realRegime: RealRateRegime;
  inflationRegime: InflationRegime;
  realChangeBps: number;
  breakevenChangeBps: number;
};

const CHG_LAG = 20;

export function percentileOf(series: number[], value: number): number {
  if (!series.length) return 50;
  let below = 0;
  for (const x of series) if (x <= value) below++;
  return (below / series.length) * 100;
}

function toPoint(s: RateSeries): RatePoint {
  const v = s.series.filter((x) => Number.isFinite(x));
  const n = v.length;
  const latest = n ? v[n - 1] : 0;
  const past = n ? v[Math.max(0, n - 1 - CHG_LAG)] : latest;
  return {
    id: s.id,
    label: s.label,
    tenor: s.tenor,
    kind: s.kind,
    latest,
    changeBps: (latest - past) * 100,
    percentile: percentileOf(v, latest),
  };
}

function realRegimeOf(real10y: number | null): RealRateRegime {
  if (real10y === null) return "Neutral";
  if (real10y > 1.0) return "Restrictive";
  if (real10y < 0) return "Accommodative";
  return "Neutral";
}

function inflationRegimeOf(breakevenChangeBps: number): InflationRegime {
  if (breakevenChangeBps > 15) return "Rising";
  if (breakevenChangeBps < -15) return "Falling";
  return "Anchored";
}

export function buildRealRates(inputs: RateSeries[]): RealRatesReport {
  const points = inputs.filter((s) => s.series.some((x) => Number.isFinite(x))).map(toPoint);
  const find = (id: string): RatePoint | undefined => points.find((p) => p.id === id);

  const nom = find("DGS10");
  const real = find("DFII10");
  const be = find("T10YIE");
  const fwd = find("T5YIFR");

  const nominal10y = nom ? nom.latest : null;
  const real10y = real ? real.latest : null;
  const breakeven10y = be ? be.latest : null;
  const fwd5y5y = fwd ? fwd.latest : null;
  const decompositionGap =
    nominal10y !== null && real10y !== null && breakeven10y !== null ? nominal10y - (real10y + breakeven10y) : null;

  const realChangeBps = real ? real.changeBps : 0;
  const breakevenChangeBps = be ? be.changeBps : 0;

  return {
    points,
    nominal10y,
    real10y,
    breakeven10y,
    fwd5y5y,
    decompositionGap,
    realRegime: realRegimeOf(real10y),
    inflationRegime: inflationRegimeOf(breakevenChangeBps),
    realChangeBps,
    breakevenChangeBps,
  };
}
