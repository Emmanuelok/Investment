/**
 * Multi-leg options strategy engine. Builds combined expiry payoff + current
 * theoretical-value curves, net Greeks, break-evens and max profit/loss for any
 * set of legs. Pure math on top of the Black-Scholes engine — live everywhere.
 */
import { blackScholes } from "./options";

export type OptType = "call" | "put";
export type Side = "long" | "short";
export type Leg = { type: OptType; side: Side; strike: number; qty: number; premium?: number };

export type StrategySpec = {
  spot: number;
  vol: number; // decimal
  rate: number; // decimal
  days: number; // to expiry
  legs: Leg[];
};

const sign = (s: Side) => (s === "long" ? 1 : -1);
const intrinsic = (l: Leg, S: number) => (l.type === "call" ? Math.max(S - l.strike, 0) : Math.max(l.strike - S, 0));

/** Theoretical premium of a leg via Black-Scholes (used when no premium is supplied). */
export function legPremium(l: Leg, spot: number, vol: number, rate: number, t: number): number {
  return l.premium ?? blackScholes({ spot, strike: l.strike, t: Math.max(t, 1e-9), vol, rate, type: l.type }).price;
}

export type StrategyAnalysis = {
  netDebit: number; // > 0 you pay (debit), < 0 you receive (credit)
  maxProfit: number; lossUnlimited: boolean;
  maxLoss: number; profitUnlimited: boolean;
  breakevens: number[];
  netGreeks: { delta: number; gamma: number; vega: number; theta: number; rho: number };
  curve: { S: number; payoff: number; value: number }[]; // expiry P&L and current-theoretical P&L
  legs: (Leg & { premium: number })[];
};

export function analyzeStrategy(spec: StrategySpec): StrategyAnalysis {
  const t = Math.max(spec.days / 365, 1e-9);
  const legs = spec.legs.map((l) => ({ ...l, premium: legPremium(l, spec.spot, spec.vol, spec.rate, t) }));
  const netDebit = legs.reduce((a, l) => a + sign(l.side) * l.premium * l.qty, 0);

  // expiry P&L for the whole position at underlying S
  const payoffAt = (S: number) => legs.reduce((a, l) => a + sign(l.side) * l.qty * (intrinsic(l, S) - l.premium), 0);
  // current theoretical P&L (mark-to-model) at underlying S
  const valueAt = (S: number) => legs.reduce((a, l) => a + sign(l.side) * l.qty * (blackScholes({ spot: S, strike: l.strike, t, vol: spec.vol, rate: spec.rate, type: l.type }).price - l.premium), 0);

  const strikes = legs.map((l) => l.strike);
  const lo = Math.max(0.01, Math.min(spec.spot * 0.5, Math.min(...strikes) * 0.6));
  const hi = Math.max(spec.spot * 1.5, Math.max(...strikes) * 1.4);
  const N = 140, step = (hi - lo) / N;
  const curve = Array.from({ length: N + 1 }, (_, i) => { const S = lo + i * step; return { S, payoff: payoffAt(S), value: valueAt(S) }; });

  // break-evens: payoff sign changes (linear interpolation)
  const breakevens: number[] = [];
  for (let i = 1; i < curve.length; i++) {
    const a = curve[i - 1], b = curve[i];
    if ((a.payoff <= 0 && b.payoff > 0) || (a.payoff >= 0 && b.payoff < 0)) {
      breakevens.push(a.S + (b.S - a.S) * (0 - a.payoff) / (b.payoff - a.payoff));
    }
  }

  const payoffs = curve.map((p) => p.payoff);
  const maxProfit = Math.max(...payoffs), maxLoss = Math.min(...payoffs);
  // unbounded detection: still trending at the edges
  const profitUnlimited = curve[N].payoff > curve[N - 1].payoff + 1e-6 && curve[N].payoff >= maxProfit - 1e-6;
  const lossUnlimited = (curve[0].payoff < curve[1].payoff - 1e-6 && curve[0].payoff <= maxLoss + 1e-6);

  const g = legs.reduce((acc, l) => {
    const bs = blackScholes({ spot: spec.spot, strike: l.strike, t, vol: spec.vol, rate: spec.rate, type: l.type });
    const s = sign(l.side) * l.qty;
    acc.delta += s * bs.delta; acc.gamma += s * bs.gamma; acc.vega += s * bs.vega; acc.theta += s * bs.theta; acc.rho += s * bs.rho;
    return acc;
  }, { delta: 0, gamma: 0, vega: 0, theta: 0, rho: 0 });

  return { netDebit, maxProfit, lossUnlimited, maxLoss, profitUnlimited, breakevens, netGreeks: g, curve, legs };
}

/** Preset strategies — strikes placed relative to spot (rounded). */
export type PresetId = "longCall" | "longPut" | "shortPut" | "bullCallSpread" | "bearPutSpread" | "longStraddle" | "longStrangle" | "ironCondor" | "callButterfly";
export const PRESET_LABELS: Record<PresetId, string> = {
  longCall: "Long Call", longPut: "Long Put", shortPut: "Short Put (cash-secured)",
  bullCallSpread: "Bull Call Spread", bearPutSpread: "Bear Put Spread",
  longStraddle: "Long Straddle", longStrangle: "Long Strangle", ironCondor: "Iron Condor", callButterfly: "Call Butterfly",
};

export function presetLegs(id: PresetId, spot: number): Leg[] {
  const k = (mult: number) => Math.round(spot * mult);
  const atm = Math.round(spot);
  switch (id) {
    case "longCall": return [{ type: "call", side: "long", strike: atm, qty: 1 }];
    case "longPut": return [{ type: "put", side: "long", strike: atm, qty: 1 }];
    case "shortPut": return [{ type: "put", side: "short", strike: k(0.95), qty: 1 }];
    case "bullCallSpread": return [{ type: "call", side: "long", strike: atm, qty: 1 }, { type: "call", side: "short", strike: k(1.1), qty: 1 }];
    case "bearPutSpread": return [{ type: "put", side: "long", strike: atm, qty: 1 }, { type: "put", side: "short", strike: k(0.9), qty: 1 }];
    case "longStraddle": return [{ type: "call", side: "long", strike: atm, qty: 1 }, { type: "put", side: "long", strike: atm, qty: 1 }];
    case "longStrangle": return [{ type: "call", side: "long", strike: k(1.07), qty: 1 }, { type: "put", side: "long", strike: k(0.93), qty: 1 }];
    case "ironCondor": return [{ type: "put", side: "long", strike: k(0.85), qty: 1 }, { type: "put", side: "short", strike: k(0.92), qty: 1 }, { type: "call", side: "short", strike: k(1.08), qty: 1 }, { type: "call", side: "long", strike: k(1.15), qty: 1 }];
    case "callButterfly": return [{ type: "call", side: "long", strike: k(0.92), qty: 1 }, { type: "call", side: "short", strike: atm, qty: 2 }, { type: "call", side: "long", strike: k(1.08), qty: 1 }];
  }
}
