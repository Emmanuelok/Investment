/**
 * Portfolio stress-test / scenario-shock engine.
 *
 * Each historical scenario defines a return shock per asset class (calibrated to
 * the actual episode). A holding's scenario return = its asset-class shock, with
 * equity holdings scaled by their market beta. Portfolio P&L is the weighted sum.
 * Deterministic; the route estimates betas from real returns.
 */

export type AssetClass = "equity" | "bond" | "gold" | "oil" | "crypto" | "reit" | "cash";

export type StressHolding = { sym: string; weight: number; beta?: number; assetClass?: AssetClass };

export type Scenario = {
  id: string;
  name: string;
  description: string;
  shocks: Record<AssetClass, number>; // % return for that asset class during the episode
};

/** Calibrated to the realized drawdowns of each episode (approximate, %). */
export const SCENARIOS: Scenario[] = [
  { id: "gfc2008", name: "2008 Global Financial Crisis", description: "Sep 2008 – Mar 2009 credit collapse", shocks: { equity: -38, bond: 6, gold: 5, oil: -54, crypto: 0, reit: -42, cash: 0.5 } },
  { id: "covid2020", name: "COVID-19 Crash", description: "Feb–Mar 2020 pandemic shock", shocks: { equity: -34, bond: 8, gold: 3, oil: -55, crypto: -40, reit: -40, cash: 0 } },
  { id: "rate2022", name: "2022 Rate Shock", description: "Fed hiking cycle, duration & growth repricing", shocks: { equity: -25, bond: -15, gold: -1, oil: 30, crypto: -65, reit: -28, cash: 1 } },
  { id: "dotcom", name: "Dot-com Bust", description: "2000–2002 tech unwind", shocks: { equity: -49, bond: 20, gold: 12, oil: 5, crypto: 0, reit: 10, cash: 4 } },
  { id: "q4_2018", name: "Q4 2018 Selloff", description: "Hawkish Fed + growth scare", shocks: { equity: -20, bond: 2, gold: 3, oil: -38, crypto: -45, reit: -7, cash: 0.5 } },
  { id: "correction10", name: "−10% Correction", description: "Garden-variety equity correction", shocks: { equity: -10, bond: 2, gold: 2, oil: -8, crypto: -18, reit: -8, cash: 0 } },
  { id: "rate100bp", name: "Rates +100bp", description: "Parallel curve shift higher", shocks: { equity: -5, bond: -8, gold: -2, oil: 4, crypto: -8, reit: -9, cash: 0.3 } },
  { id: "stagflation", name: "Stagflation", description: "Weak growth + sticky inflation", shocks: { equity: -18, bond: -10, gold: 14, oil: 25, crypto: -30, reit: -15, cash: 0.5 } },
];

const ASSET_MAP: Record<string, AssetClass> = {
  TLT: "bond", IEF: "bond", AGG: "bond", BND: "bond", LQD: "bond", HYG: "bond", SHY: "bond", IEI: "bond", TIP: "bond",
  GLD: "gold", IAU: "gold", SGOL: "gold", GDX: "gold",
  USO: "oil", BNO: "oil", DBO: "oil", USL: "oil",
  VNQ: "reit", XLRE: "reit", IYR: "reit", SCHH: "reit", "O": "reit",
  BIL: "cash", SHV: "cash", "USDU": "cash",
};
const CRYPTO_RE = /^(BTC|ETH|SOL|XRP|DOGE|ADA)(-USD|USDT)?$/;

export function classifyAsset(sym: string): AssetClass {
  const s = sym.toUpperCase();
  if (ASSET_MAP[s]) return ASSET_MAP[s];
  if (CRYPTO_RE.test(s)) return "crypto";
  return "equity";
}

export type ScenarioResult = {
  id: string;
  name: string;
  description: string;
  portfolioReturn: number; // %
  contributions: { sym: string; weight: number; assetClass: AssetClass; ret: number; contribution: number }[];
};

export function applyScenario(holdings: StressHolding[], scenario: Scenario): ScenarioResult {
  const wsum = holdings.reduce((a, h) => a + Math.abs(h.weight), 0) || 1;
  const contributions = holdings.map((h) => {
    const cls = h.assetClass ?? classifyAsset(h.sym);
    const w = h.weight / wsum;
    const ret = cls === "equity" ? (h.beta ?? 1) * scenario.shocks.equity : scenario.shocks[cls];
    return { sym: h.sym, weight: w, assetClass: cls, ret, contribution: w * ret };
  });
  return {
    id: scenario.id, name: scenario.name, description: scenario.description,
    portfolioReturn: contributions.reduce((a, c) => a + c.contribution, 0),
    contributions,
  };
}

/** Run every scenario; results sorted worst (most negative) first. */
export function computeStress(holdings: StressHolding[]): ScenarioResult[] {
  return SCENARIOS.map((s) => applyScenario(holdings, s)).sort((a, b) => a.portfolioReturn - b.portfolioReturn);
}
