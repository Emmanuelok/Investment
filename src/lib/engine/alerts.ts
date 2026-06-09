/**
 * Alert rule engine — evaluates user rules against quote/candle snapshots and
 * emits alerts whose every number is computed from the inputs.
 */
import type { Candle } from "@/lib/rng";
import { rsi, sma } from "./indicators";

export type RuleKind = "priceAbove" | "priceBelow" | "moveAbsPct" | "rsiAbove" | "rsiBelow" | "crossSMA20";
export type Rule = { id: string; symbol: string; kind: RuleKind; value: number; enabled: boolean };

export type EngineAlert = {
  ruleId: string;
  symbol: string;
  tone: "pos" | "neg" | "warn";
  title: string;
  body: string;
};

export type SymbolSnap = { price: number; chgPct: number; candles?: Candle[] };

export const RULE_LABEL: Record<RuleKind, string> = {
  priceAbove: "Price above",
  priceBelow: "Price below",
  moveAbsPct: "Daily move ±%",
  rsiAbove: "RSI above",
  rsiBelow: "RSI below",
  crossSMA20: "Cross SMA-20",
};

export function defaultRules(symbols: string[]): Rule[] {
  return symbols.slice(0, 4).map((s, i) => ({ id: `def-${s}-${i}`, symbol: s, kind: "moveAbsPct" as RuleKind, value: 2, enabled: true }));
}

export function evaluateRules(rules: Rule[], snaps: Record<string, SymbolSnap>): EngineAlert[] {
  const out: EngineAlert[] = [];
  for (const r of rules) {
    if (!r.enabled) continue;
    const s = snaps[r.symbol];
    if (!s) continue;
    const closes = s.candles?.map((c) => c.c) ?? [];
    switch (r.kind) {
      case "priceAbove":
        if (s.price > r.value) out.push({ ruleId: r.id, symbol: r.symbol, tone: "pos", title: `${r.symbol} above ${r.value}`, body: `Last ${s.price.toFixed(2)} crossed your ${r.value} level (${s.chgPct >= 0 ? "+" : ""}${s.chgPct.toFixed(2)}% today)` });
        break;
      case "priceBelow":
        if (s.price < r.value) out.push({ ruleId: r.id, symbol: r.symbol, tone: "neg", title: `${r.symbol} below ${r.value}`, body: `Last ${s.price.toFixed(2)} broke your ${r.value} level (${s.chgPct >= 0 ? "+" : ""}${s.chgPct.toFixed(2)}% today)` });
        break;
      case "moveAbsPct":
        if (Math.abs(s.chgPct) >= r.value) out.push({ ruleId: r.id, symbol: r.symbol, tone: s.chgPct >= 0 ? "pos" : "neg", title: `${r.symbol} ${s.chgPct >= 0 ? "+" : ""}${s.chgPct.toFixed(2)}% today`, body: `Move exceeds your ±${r.value}% threshold · last ${s.price.toFixed(2)}` });
        break;
      case "rsiAbove": {
        const v = rsi(closes).at(-1);
        if (v !== undefined && Number.isFinite(v) && v > r.value) out.push({ ruleId: r.id, symbol: r.symbol, tone: "warn", title: `${r.symbol} RSI ${v.toFixed(1)}`, body: `RSI-14 above your ${r.value} threshold — stretched` });
        break;
      }
      case "rsiBelow": {
        const v = rsi(closes).at(-1);
        if (v !== undefined && Number.isFinite(v) && v < r.value) out.push({ ruleId: r.id, symbol: r.symbol, tone: "pos", title: `${r.symbol} RSI ${v.toFixed(1)}`, body: `RSI-14 below your ${r.value} threshold — oversold zone` });
        break;
      }
      case "crossSMA20": {
        if (closes.length < 22) break;
        const s20 = sma(closes, 20);
        const a = closes[closes.length - 1] - s20[s20.length - 1];
        const b = closes[closes.length - 2] - s20[s20.length - 2];
        if (Number.isFinite(a) && Number.isFinite(b) && Math.sign(a) !== Math.sign(b)) {
          out.push({ ruleId: r.id, symbol: r.symbol, tone: a > 0 ? "pos" : "neg", title: `${r.symbol} crossed ${a > 0 ? "above" : "below"} SMA-20`, body: `Close ${closes[closes.length - 1].toFixed(2)} vs SMA-20 ${s20[s20.length - 1].toFixed(2)}` });
        }
        break;
      }
    }
  }
  return out;
}
