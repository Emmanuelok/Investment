/**
 * Black-Scholes-Merton option pricing + full Greeks + implied-vol solver.
 * Pure, self-contained math — needs no market feed, so it is fully live
 * everywhere (sandbox included). All rates/vols are decimals (0.05 = 5%).
 */

/** Standard normal PDF. */
export const normPdf = (x: number): number => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);

/** Standard normal CDF (Abramowitz-Stegun 7.1.26, ~1e-7 accuracy). */
export function normCdf(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = normPdf(x);
  const p = d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return x >= 0 ? 1 - p : p;
}

export type Greeks = {
  price: number;
  delta: number;
  gamma: number;
  vega: number; // per 1 vol point (1%)
  theta: number; // per calendar day
  rho: number; // per 1% rate move
  d1: number;
  d2: number;
  intrinsic: number;
  timeValue: number;
};

export type OptionInput = {
  spot: number;
  strike: number;
  /** time to expiry in YEARS */
  t: number;
  vol: number; // annualized, decimal
  rate: number; // risk-free, decimal
  div?: number; // continuous dividend yield, decimal
  type: "call" | "put";
};

export function blackScholes(i: OptionInput): Greeks {
  const { spot: S, strike: K, vol: v, rate: r, type } = i;
  const q = i.div ?? 0;
  const t = Math.max(i.t, 1e-9);
  const sqrtT = Math.sqrt(t);
  const sig = Math.max(v, 1e-9);
  const d1 = (Math.log(S / K) + (r - q + (sig * sig) / 2) * t) / (sig * sqrtT);
  const d2 = d1 - sig * sqrtT;
  const eqT = Math.exp(-q * t), erT = Math.exp(-r * t);
  const Nd1 = normCdf(d1), Nd2 = normCdf(d2);
  const nd1 = normPdf(d1);

  let price: number, delta: number, theta: number, rho: number;
  if (type === "call") {
    price = S * eqT * Nd1 - K * erT * Nd2;
    delta = eqT * Nd1;
    theta = (-(S * eqT * nd1 * sig) / (2 * sqrtT) - r * K * erT * Nd2 + q * S * eqT * Nd1) / 365;
    rho = (K * t * erT * Nd2) / 100;
  } else {
    price = K * erT * normCdf(-d2) - S * eqT * normCdf(-d1);
    delta = eqT * (Nd1 - 1);
    theta = (-(S * eqT * nd1 * sig) / (2 * sqrtT) + r * K * erT * normCdf(-d2) - q * S * eqT * normCdf(-d1)) / 365;
    rho = (-K * t * erT * normCdf(-d2)) / 100;
  }
  const gamma = (eqT * nd1) / (S * sig * sqrtT);
  const vega = (S * eqT * nd1 * sqrtT) / 100;
  const intrinsic = Math.max(type === "call" ? S - K : K - S, 0);

  return { price, delta, gamma, vega, theta, rho, d1, d2, intrinsic, timeValue: price - intrinsic };
}

/** Implied volatility via bisection on a target option price. */
export function impliedVol(target: number, i: Omit<OptionInput, "vol">): number | null {
  const intrinsic = Math.max(i.type === "call" ? i.spot - i.strike : i.strike - i.spot, 0) * Math.exp(-i.rate * i.t);
  if (target < intrinsic - 1e-6) return null;
  let lo = 1e-4, hi = 5;
  const priceAt = (v: number) => blackScholes({ ...i, vol: v }).price;
  if (priceAt(hi) < target) return null;
  for (let k = 0; k < 100; k++) {
    const mid = (lo + hi) / 2;
    const p = priceAt(mid);
    if (Math.abs(p - target) < 1e-6) return mid;
    if (p < target) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Probability the option finishes in-the-money (risk-neutral). */
export function probITM(i: OptionInput): number {
  const q = i.div ?? 0;
  const t = Math.max(i.t, 1e-9);
  const sig = Math.max(i.vol, 1e-9);
  const d2 = (Math.log(i.spot / i.strike) + (i.rate - q - (sig * sig) / 2) * t) / (sig * Math.sqrt(t));
  return i.type === "call" ? normCdf(d2) : normCdf(-d2);
}
