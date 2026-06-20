/**
 * Position-sizing & money-management engine — Kelly criterion, expectancy,
 * risk-of-ruin and stop-based share sizing. Pure math, live everywhere.
 */

/** Kelly fraction for win prob p and payoff ratio b (= avg win / avg loss). f* = p − (1−p)/b. */
export function kellyFraction(p: number, b: number): number {
  if (b <= 0) return 0;
  return p - (1 - p) / b;
}

/** Per-trade expectancy in R-multiples (avg loss = 1R) and in currency. */
export function expectancy(p: number, avgWin: number, avgLoss: number): { perTrade: number; rMultiple: number } {
  const q = 1 - p;
  const perTrade = p * avgWin - q * avgLoss;
  const rMultiple = avgLoss > 0 ? perTrade / avgLoss : 0;
  return { perTrade, rMultiple };
}

/**
 * Risk of ruin for fixed-fraction betting (gambler's-ruin approximation).
 * `units` = account size measured in risk-per-trade units.
 */
export function riskOfRuin(p: number, units: number): number {
  const q = 1 - p;
  if (p <= q) return 100; // no edge → eventual ruin
  return Math.pow(q / p, Math.max(1, units)) * 100;
}

export type SizingInput = {
  equity: number;
  riskPct: number; // % of equity risked per trade
  entry: number;
  stop: number;
};

export type SizingResult = {
  riskPerShare: number;
  riskAmount: number; // $ at risk
  shares: number;
  positionValue: number;
  positionPct: number; // % of equity deployed
  rTarget2: number; // price for a 2R move
  rTarget3: number;
};

export function positionSize(i: SizingInput): SizingResult {
  const riskPerShare = Math.abs(i.entry - i.stop);
  const riskAmount = i.equity * (i.riskPct / 100);
  const shares = riskPerShare > 0 ? Math.floor(riskAmount / riskPerShare) : 0;
  const positionValue = shares * i.entry;
  const long = i.entry >= i.stop;
  const dir = long ? 1 : -1;
  return {
    riskPerShare,
    riskAmount,
    shares,
    positionValue,
    positionPct: i.equity > 0 ? (positionValue / i.equity) * 100 : 0,
    rTarget2: i.entry + dir * 2 * riskPerShare,
    rTarget3: i.entry + dir * 3 * riskPerShare,
  };
}

/** Suggested risk fraction = fractional Kelly, clamped to a sane cap. */
export function suggestedRiskPct(p: number, b: number, fraction = 0.5, cap = 5): number {
  const f = kellyFraction(p, b) * fraction;
  return Math.max(0, Math.min(cap, f * 100));
}
