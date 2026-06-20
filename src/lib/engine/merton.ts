/**
 * Merton (1974) structural credit-risk model — distance-to-default & default
 * probability. A firm's equity is a European call option on its asset value V
 * struck at the face value of its debt D: holders of equity get max(V − D, 0)
 * at maturity. Given observable equity value E and equity volatility σ_E we
 * back out the latent asset value V and asset volatility σ_V by simultaneously
 * solving
 *
 *     E      = V·N(d1) − D·e^(−rT)·N(d2)            (equity = call on assets)
 *     σ_E·E  = N(d1)·σ_V·V                          (Itô: equity vol from asset vol)
 *
 * with d1 = [ln(V/D) + (r + ½σ_V²)T] / (σ_V√T), d2 = d1 − σ_V√T.
 *
 * From the solved (V, σ_V):
 *     Distance to default  DD = [ln(V/D) + (μ − ½σ_V²)T] / (σ_V√T)
 *     Default probability  PD = N(−DD)
 *     Merton credit spread s  = −(1/T)·ln(B/D) − r, with debt value B = V − E.
 *
 * Pure, dependency-free (reuses the project normal CDF) and fully deterministic,
 * so it runs identically in the sandbox and on deploy. All rates/vols are
 * decimals (0.05 = 5%); values share one currency unit.
 */

import { normCdf } from "./options";

export type MertonInput = {
  equity: number; // market value of equity E (e.g. market cap)
  equityVol: number; // annualized equity volatility σ_E
  debt: number; // face value of debt / default barrier D
  rate: number; // risk-free rate r (annual, decimal)
  years?: number; // horizon T in years (default 1)
  drift?: number; // expected asset return μ for DD (default = rate, i.e. risk-neutral)
};

export type MertonResult = {
  assetValue: number; // solved firm asset value V
  assetVol: number; // solved asset volatility σ_V
  d1: number;
  d2: number;
  distanceToDefault: number; // DD (in σ units)
  defaultProb: number; // PD = N(−DD), decimal 0..1
  creditSpread: number; // implied risky-debt spread over r (decimal, annual)
  debtValue: number; // market value of debt B = V − E
  leverage: number; // D·e^(−rT) / V  (risk-neutral leverage)
  iterations: number;
  converged: boolean;
};

/** Black-Scholes value of a call on the asset value V struck at D, + its delta N(d1). */
function assetCall(V: number, D: number, r: number, sig: number, T: number): { c: number; d1: number; d2: number; Nd1: number } {
  const sqrtT = Math.sqrt(T);
  const vt = sig * sqrtT;
  const d1 = (Math.log(V / D) + (r + 0.5 * sig * sig) * T) / vt;
  const d2 = d1 - vt;
  const Nd1 = normCdf(d1);
  const c = V * Nd1 - D * Math.exp(-r * T) * normCdf(d2);
  return { c, d1, d2, Nd1 };
}

/**
 * Forward map used to seed/validate the model and to build honest demo inputs:
 * given the latent (V, σ_V) it returns the observable equity value & volatility.
 */
export function equityFromAsset(V: number, D: number, r: number, sigV: number, T: number): { equity: number; equityVol: number; d1: number; d2: number } {
  const cv = assetCall(V, D, r, sigV, T);
  const equity = cv.c;
  const equityVol = (sigV * V * cv.Nd1) / Math.max(equity, 1e-12);
  return { equity, equityVol, d1: cv.d1, d2: cv.d2 };
}

const degenerate = (V: number, sigV: number): MertonResult => ({
  assetValue: V, assetVol: sigV, d1: 0, d2: 0, distanceToDefault: 0,
  defaultProb: 0.5, creditSpread: 0, debtValue: 0, leverage: 0, iterations: 0, converged: false,
});

/**
 * Solve the Merton system for (V, σ_V) via the standard KMV fixed-point: hold
 * σ_V fixed and Newton-solve the equity equation for V (∂C/∂V = N(d1)), then
 * refresh σ_V from the Itô relation; repeat to convergence.
 */
export function mertonModel(input: MertonInput): MertonResult {
  const { equity: E, equityVol: sigE, debt: D, rate: r } = input;
  const T = input.years ?? 1;
  const mu = input.drift ?? r;
  if (!(E > 0) || !(D > 0) || !(sigE > 0) || !(T > 0)) return degenerate(Math.max(E, 0) + Math.max(D, 0), Math.max(sigE, 0));

  let V = E + D; // start at book-style asset value
  let sigV = (sigE * E) / (E + D); // leverage-scaled initial vol
  let cv = assetCall(V, D, r, sigV, T);
  let converged = false;
  let iter = 0;

  for (; iter < 200; iter++) {
    // Inner Newton: solve assetCall(Vn).c = E for Vn at the current σ_V.
    let Vn = V;
    for (let k = 0; k < 100; k++) {
      cv = assetCall(Vn, D, r, sigV, T);
      const fp = Math.max(cv.Nd1, 1e-10); // delta is the derivative ∂C/∂V
      const step = (cv.c - E) / fp;
      Vn -= step;
      if (Vn <= 0) Vn = E + D * 1e-6; // keep the asset value strictly positive
      if (Math.abs(step) <= 1e-10 * Vn) break;
    }
    cv = assetCall(Vn, D, r, sigV, T);
    const sigVn = (sigE * E) / Math.max(Vn * cv.Nd1, 1e-12); // Itô refresh
    const dV = Math.abs(Vn - V) / Math.max(V, 1e-9);
    const dS = Math.abs(sigVn - sigV) / Math.max(sigV, 1e-9);
    V = Vn;
    sigV = sigVn;
    if (dV < 1e-8 && dS < 1e-8) {
      converged = true;
      iter++;
      break;
    }
  }

  const sqrtT = Math.sqrt(T);
  const distanceToDefault = (Math.log(V / D) + (mu - 0.5 * sigV * sigV) * T) / (sigV * sqrtT);
  const defaultProb = normCdf(-distanceToDefault);
  const debtValue = Math.max(V - E, 1e-12); // B = V − E (assets net of equity)
  const creditSpread = -(1 / T) * Math.log(debtValue / D) - r;
  const leverage = (D * Math.exp(-r * T)) / V;

  return {
    assetValue: V, assetVol: sigV, d1: cv.d1, d2: cv.d2,
    distanceToDefault, defaultProb, creditSpread, debtValue, leverage, iterations: iter, converged,
  };
}

/** Annualized volatility from a price series via stdev of daily log returns × √252. */
export function annualizedVol(closes: number[], periodsPerYear = 252): number {
  if (closes.length < 3) return 0;
  const rets: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    const a = closes[i - 1];
    const b = closes[i];
    if (a > 0 && b > 0) rets.push(Math.log(b / a));
  }
  if (rets.length < 2) return 0;
  const mean = rets.reduce((s, x) => s + x, 0) / rets.length;
  const variance = rets.reduce((s, x) => s + (x - mean) * (x - mean), 0) / (rets.length - 1);
  return Math.sqrt(variance) * Math.sqrt(periodsPerYear);
}

/** Coarse letter grade from default probability, à la agency rating buckets. */
export function creditGrade(pd: number): { grade: string; tone: "pos" | "warn" | "neg" } {
  if (pd < 0.0005) return { grade: "AAA / AA", tone: "pos" };
  if (pd < 0.0025) return { grade: "A", tone: "pos" };
  if (pd < 0.01) return { grade: "BBB", tone: "pos" };
  if (pd < 0.05) return { grade: "BB", tone: "warn" };
  if (pd < 0.15) return { grade: "B", tone: "warn" };
  if (pd < 0.35) return { grade: "CCC", tone: "neg" };
  return { grade: "CC / D", tone: "neg" };
}
