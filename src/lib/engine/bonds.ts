/**
 * Fixed-income analytics — bond pricing, yield-to-maturity (bisection),
 * Macaulay & modified duration, convexity and DV01. Closed-form / numeric,
 * needs no market feed, so it is live everywhere.
 */

export type BondInput = {
  face: number; // par value
  couponRate: number; // annual, decimal (0.05 = 5%)
  ytm: number; // annual yield, decimal
  years: number; // time to maturity
  freq: number; // coupon payments per year (1, 2, 4)
};

/** Dirty/clean price ignoring accrued (priced on a coupon date). */
export function bondPrice(b: BondInput): number {
  const n = Math.max(1, Math.round(b.years * b.freq));
  const c = (b.face * b.couponRate) / b.freq;
  const y = b.ytm / b.freq;
  let pv = 0;
  for (let t = 1; t <= n; t++) pv += c / Math.pow(1 + y, t);
  pv += b.face / Math.pow(1 + y, n);
  return pv;
}

/** Solve YTM from a market price via bisection. */
export function yieldToMaturity(face: number, couponRate: number, price: number, years: number, freq: number): number | null {
  if (price <= 0) return null;
  let lo = 1e-6, hi = 1; // 0%..100%
  const priceAt = (y: number) => bondPrice({ face, couponRate, ytm: y, years, freq });
  if (priceAt(lo) < price) return null; // price too high even at ~0% yield
  for (let k = 0; k < 200; k++) {
    const mid = (lo + hi) / 2;
    const p = priceAt(mid);
    if (Math.abs(p - price) < 1e-7) return mid;
    if (p > price) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

export type BondAnalytics = {
  price: number;
  macaulayDuration: number; // years
  modifiedDuration: number; // years
  convexity: number;
  dv01: number; // $ change per 1bp, per `face`
  currentYield: number; // %
};

export function analyzeBond(b: BondInput): BondAnalytics {
  const n = Math.max(1, Math.round(b.years * b.freq));
  const c = (b.face * b.couponRate) / b.freq;
  const y = b.ytm / b.freq;
  const price = bondPrice(b);

  let macaulayPeriods = 0, convexNum = 0;
  for (let t = 1; t <= n; t++) {
    const cf = t === n ? c + b.face : c;
    const pv = cf / Math.pow(1 + y, t);
    macaulayPeriods += t * pv;
    convexNum += t * (t + 1) * cf / Math.pow(1 + y, t + 2);
  }
  macaulayPeriods /= price;
  const macaulayDuration = macaulayPeriods / b.freq;
  const modifiedDuration = macaulayDuration / (1 + y);
  const convexity = convexNum / price / (b.freq * b.freq);
  const dv01 = modifiedDuration * price * 1e-4;
  const currentYield = (b.face * b.couponRate / price) * 100;

  return { price, macaulayDuration, modifiedDuration, convexity, dv01, currentYield };
}

/** Estimated % price change for a yield shift (bps) using duration + convexity. */
export function priceChangeForBpShift(a: BondAnalytics, bps: number): number {
  const dy = bps / 1e4;
  return (-a.modifiedDuration * dy + 0.5 * a.convexity * dy * dy) * 100;
}
