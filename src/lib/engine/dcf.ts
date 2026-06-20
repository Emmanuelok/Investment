/**
 * Discounted-cash-flow valuation engine. Two-stage model: an explicit FCF
 * forecast at `growthRate` for `years`, then a Gordon-growth terminal value.
 * Pure math, live everywhere. Rates are decimals (0.09 = 9%).
 */

export type DCFInput = {
  fcf0: number; // base free cash flow
  growthRate: number; // explicit-period annual FCF growth
  years: number; // explicit forecast horizon
  terminalGrowth: number; // perpetual growth
  discountRate: number; // WACC
  netDebt?: number; // debt − cash (subtracted from EV to get equity)
  shares?: number; // for per-share value
  currentPrice?: number; // for upside
};

export type DCFResult = {
  projectedFcf: number[];
  pvFcf: number[];
  terminalValue: number;
  pvTerminalValue: number;
  sumPvExplicit: number;
  enterpriseValue: number;
  equityValue: number;
  intrinsicPerShare: number | null;
  upsidePct: number | null;
  terminalPctOfValue: number; // 0..1
};

export function dcf(i: DCFInput): DCFResult {
  const years = Math.max(1, Math.round(i.years));
  const r = i.discountRate;
  // keep the Gordon model well-posed: discount rate must exceed terminal growth
  const gt = Math.min(i.terminalGrowth, r - 0.005);

  const projectedFcf: number[] = [];
  const pvFcf: number[] = [];
  let sumPvExplicit = 0;
  for (let t = 1; t <= years; t++) {
    const fcf = i.fcf0 * Math.pow(1 + i.growthRate, t);
    const pv = fcf / Math.pow(1 + r, t);
    projectedFcf.push(fcf);
    pvFcf.push(pv);
    sumPvExplicit += pv;
  }
  const fcfN = projectedFcf[years - 1];
  const terminalValue = (fcfN * (1 + gt)) / (r - gt);
  const pvTerminalValue = terminalValue / Math.pow(1 + r, years);
  const enterpriseValue = sumPvExplicit + pvTerminalValue;
  const equityValue = enterpriseValue - (i.netDebt ?? 0);
  const intrinsicPerShare = i.shares && i.shares > 0 ? equityValue / i.shares : null;
  const upsidePct = intrinsicPerShare != null && i.currentPrice ? (intrinsicPerShare / i.currentPrice - 1) * 100 : null;

  return {
    projectedFcf, pvFcf, terminalValue, pvTerminalValue, sumPvExplicit,
    enterpriseValue, equityValue, intrinsicPerShare, upsidePct,
    terminalPctOfValue: enterpriseValue > 0 ? pvTerminalValue / enterpriseValue : 0,
  };
}

/** Per-share sensitivity grid across discount rates (rows) × terminal growths (cols). */
export function dcfSensitivity(base: DCFInput, discountRates: number[], terminalGrowths: number[]): (number | null)[][] {
  return discountRates.map((r) => terminalGrowths.map((gt) => dcf({ ...base, discountRate: r, terminalGrowth: gt }).intrinsicPerShare));
}
