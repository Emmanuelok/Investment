/**
 * AEGIS — Risk, Portfolio & Compliance data fabric.
 *
 * All figures are DEMO DATA generated deterministically from fixed seeds.
 * Every number is reproducible from the snapshot id "SNAP-20260608-0930".
 * In production, these are versioned parameter sets pulled from the AEGIS
 * compute graph and stored in the immutable audit ledger.
 */
import { Rng, priceWalk } from "@/lib/rng";

/* ─────────────────────────────────────────────────────────────────────────────
   SNAPSHOT METADATA
───────────────────────────────────────────────────────────────────────────── */
export const SNAPSHOT_ID = "SNAP-20260608-0930";
export const SNAP_AS_OF = "2026-06-08T09:30:00Z";
export const EWMA_LAMBDA = 0.94;
export const VAR_LOOKBACK_DAYS = 500;
export const MC_SEED = "aegis-mc-20260608";
export const MC_PATHS = 50000;
export const RISK_PARAM_VERSION = "v2.4.1";

/* ─────────────────────────────────────────────────────────────────────────────
   ENTITY / FUND HIERARCHY
───────────────────────────────────────────────────────────────────────────── */
export type FundNode = {
  id: string;
  name: string;
  type: "firm" | "fund" | "portfolio";
  aum: number;        // $M
  pnlDay: number;     // $K
  pnlMtd: number;     // $K
  navPerShare?: number;
  children?: FundNode[];
};

export const FUND_HIERARCHY: FundNode = {
  id: "AEGIS-FIRM",
  name: "AEGIS Capital Management",
  type: "firm",
  aum: 4_821.4,
  pnlDay: 2_314.7,
  pnlMtd: 18_472.3,
  children: [
    {
      id: "FUND-I",
      name: "AEGIS Global Macro Fund I",
      type: "fund",
      aum: 2_104.7,
      pnlDay: 1_024.2,
      pnlMtd: 8_831.1,
      navPerShare: 2_418.32,
      children: [
        { id: "PORT-EM", name: "EM Equities", type: "portfolio", aum: 842.1, pnlDay: 412.3, pnlMtd: 3_204.8 },
        { id: "PORT-DM", name: "DM Equities", type: "portfolio", aum: 881.4, pnlDay: 398.7, pnlMtd: 3_481.2 },
        { id: "PORT-RATES", name: "Rates & Credit", type: "portfolio", aum: 381.2, pnlDay: 213.2, pnlMtd: 2_145.1 },
      ],
    },
    {
      id: "FUND-II",
      name: "AEGIS Systematic Alpha Fund II",
      type: "fund",
      aum: 1_988.3,
      pnlDay: 842.1,
      pnlMtd: 6_821.4,
      navPerShare: 1_812.54,
      children: [
        { id: "PORT-TECH", name: "Technology Long/Short", type: "portfolio", aum: 794.2, pnlDay: 421.8, pnlMtd: 3_204.7 },
        { id: "PORT-QUANT", name: "Quant Factor", type: "portfolio", aum: 614.1, pnlDay: 248.3, pnlMtd: 2_187.2 },
        { id: "PORT-CRYPTO", name: "Digital Assets", type: "portfolio", aum: 580.0, pnlDay: 172.0, pnlMtd: 1_429.5 },
      ],
    },
    {
      id: "FUND-III",
      name: "AEGIS Fixed Income Fund III",
      type: "fund",
      aum: 728.4,
      pnlDay: 448.4,
      pnlMtd: 2_819.8,
      navPerShare: 1_121.19,
      children: [
        { id: "PORT-IG", name: "Investment Grade Credit", type: "portfolio", aum: 412.8, pnlDay: 248.1, pnlMtd: 1_524.7 },
        { id: "PORT-HY", name: "High Yield", type: "portfolio", aum: 315.6, pnlDay: 200.3, pnlMtd: 1_295.1 },
      ],
    },
  ],
};

/* ─────────────────────────────────────────────────────────────────────────────
   POSITIONS TABLE (multi-asset IBOR)
───────────────────────────────────────────────────────────────────────────── */
export type AssetClass = "Equity" | "Options" | "FX Fwd" | "Rates" | "Crypto" | "Credit";

export type Position = {
  sym: string;
  name: string;
  assetClass: AssetClass;
  fund: string;
  qty: number;
  price: number;
  mktValue: number;    // $K
  weight: number;      // % of fund NAV
  pnlDay: number;      // $K
  pnlUnreal: number;   // $K
  currency: string;
  spark: number[];
};

export function positions(): Position[] {
  const r = new Rng("aegis-ibor-positions");
  const rows: [string, string, AssetClass, string, number, number, string][] = [
    ["NVDA",   "NVIDIA Corp",             "Equity",  "FUND-II", 42_400,    121.4,  "USD"],
    ["MSFT",   "Microsoft Corp",          "Equity",  "FUND-I",  18_200,    449.8,  "USD"],
    ["AAPL",   "Apple Inc",               "Equity",  "FUND-I",  22_800,    214.3,  "USD"],
    ["AMZN",   "Amazon.com Inc",          "Equity",  "FUND-I",  12_100,    186.2,  "USD"],
    ["META",   "Meta Platforms Inc",      "Equity",  "FUND-II",  9_840,    503.9,  "USD"],
    ["LMT",    "Lockheed Martin",         "Equity",  "FUND-I",   4_210,    463.1,  "USD"],
    ["PLTR",   "Palantir Technologies",   "Equity",  "FUND-II", 84_200,     28.7,  "USD"],
    ["ANET",   "Arista Networks",         "Equity",  "FUND-II",  6_100,    312.7,  "USD"],
    ["BTC-USD","Bitcoin",                 "Crypto",  "FUND-II",     38,  67_241.0, "USD"],
    ["ETH-USD","Ethereum",                "Crypto",  "FUND-II",    412,   3_528.4, "USD"],
    ["EUR/USD","EUR/USD Fwd 1M",          "FX Fwd",  "FUND-I",  2_400_000,   1.082, "EUR"],
    ["GBP/USD","GBP/USD Fwd 3M",          "FX Fwd",  "FUND-I",  1_200_000,   1.271, "GBP"],
    ["UST10Y", "UST 10Y Note Sep-26",     "Rates",   "FUND-III",  180,     96.84,  "USD"],
    ["UST30Y", "UST 30Y Bond Mar-56",     "Rates",   "FUND-III",   85,     91.12,  "USD"],
    ["NVDA-C", "NVDA Call 140 Jul-26",    "Options", "FUND-II", 2_200,     8.40,   "USD"],
    ["SPY-P",  "SPY Put 520 Sep-26",      "Options", "FUND-I",  1_800,    12.60,   "USD"],
    ["HYG",    "iBoxx HY Credit ETF",     "Credit",  "FUND-III",18_400,    76.82, "USD"],
    ["LQD",    "iBoxx IG Credit ETF",     "Credit",  "FUND-III",14_200,   109.14, "USD"],
  ];

  return rows.map(([sym, name, assetClass, fund, qty, price, currency]) => {
    const rp = new Rng(sym + "pos");
    const mktValue = (qty * price) / 1000;
    const pnlDay = rp.gauss(0, mktValue * 0.008);
    const pnlUnreal = rp.gauss(mktValue * 0.04, mktValue * 0.02);
    const fundAum = fund === "FUND-I" ? 2_104_700 : fund === "FUND-II" ? 1_988_300 : 728_400;
    const weight = (mktValue * 1000) / fundAum * 100;
    return {
      sym, name, assetClass, fund, qty, price,
      mktValue: Math.round(mktValue * 10) / 10,
      weight: Math.round(weight * 100) / 100,
      pnlDay: Math.round(pnlDay * 10) / 10,
      pnlUnreal: Math.round(pnlUnreal * 10) / 10,
      currency,
      spark: priceWalk(sym + "ibor", 30, price, 0.014, 0.0003),
    };
  });
}

/* ─────────────────────────────────────────────────────────────────────────────
   CASH LEDGER BY CURRENCY
───────────────────────────────────────────────────────────────────────────── */
export type CashEntry = {
  currency: string;
  balance: number;     // in currency units
  usdEquiv: number;    // $K
  unsettled: number;   // $K
  fxRate: number;
};

export const CASH_LEDGER: CashEntry[] = [
  { currency: "USD", balance: 48_420_180, usdEquiv: 48_420.2, unsettled: 2_840.0, fxRate: 1.0 },
  { currency: "EUR", balance: 12_180_000, usdEquiv: 13_178.8, unsettled: 820.4,   fxRate: 1.082 },
  { currency: "GBP", balance:  6_440_000, usdEquiv:  8_185.2, unsettled: 412.0,   fxRate: 1.271 },
  { currency: "JPY", balance: 840_000_000,usdEquiv:  5_342.0, unsettled: 181.2,   fxRate: 0.00636 },
  { currency: "BTC", balance:      1.842, usdEquiv:    123.8,  unsettled: 0,       fxRate: 67241.0 },
];

/* ─────────────────────────────────────────────────────────────────────────────
   EXPOSURE SUMMARY
───────────────────────────────────────────────────────────────────────────── */
export const EXPOSURE = {
  grossLong: 3_814.2,  // $M
  grossShort: -821.4,
  netExposure: 2_992.8,
  grossExposure: 4_635.6,
  leverageRatio: 1.48,
  betaAdjNet: 2_741.3,
  byAsset: [
    { label: "Equity",  long: 2_418.4, short: -614.2 },
    { label: "Rates",   long:  682.1,  short: -122.8 },
    { label: "FX",      long:  318.4,  short:  -84.4 },
    { label: "Crypto",  long:  281.8,  short:    0.0 },
    { label: "Options", long:  113.5,  short:    0.0 },
  ],
};

/* ─────────────────────────────────────────────────────────────────────────────
   VaR / ES (Risk Engine KPIs)
───────────────────────────────────────────────────────────────────────────── */
export const VAR_METRICS = {
  histVar99_1d: 18.42,        // $M (1-day 99% Historical)
  histVar95_1d: 12.18,        // $M (1-day 95%)
  parametricVar99_1d: 17.84,  // $M (EWMA Parametric)
  parametricVar95_1d: 11.93,
  mcVar99_1d: 19.11,          // $M (Monte Carlo, seeded)
  mcVar95_1d: 13.44,
  es99_1d: 24.87,             // $M Expected Shortfall
  es95_1d: 17.22,
  varPrevDay: 17.61,          // yesterday
  var30dAvg: 16.94,
  varLimit: 28.0,
  varUtilization: 65.8,       // %
  // Decomp
  factorRisk: 68.4,           // % of total variance
  idioRisk: 31.6,
  // timeseries for sparkline
  varSeries: priceWalk("aegis-var-series", 30, 17.5, 0.04, 0.001).map(v => Math.round(v * 100) / 100),
};

/* ─────────────────────────────────────────────────────────────────────────────
   FACTOR EXPOSURES (BARRA-style)
───────────────────────────────────────────────────────────────────────────── */
export type FactorExposure = {
  factor: string;
  exposure: number;   // standardised beta
  contribution: number; // bps of risk
  returnAttr: number; // bps of return attribution
};

export const FACTOR_EXPOSURES: FactorExposure[] = [
  { factor: "Market",      exposure:  1.14, contribution: 384.2, returnAttr:  42.1 },
  { factor: "Size",        exposure: -0.42, contribution:  84.1, returnAttr: -12.4 },
  { factor: "Value",       exposure: -0.31, contribution:  61.8, returnAttr:   8.2 },
  { factor: "Momentum",    exposure:  0.78, contribution: 148.2, returnAttr:  28.7 },
  { factor: "Quality",     exposure:  0.54, contribution:  92.4, returnAttr:  18.4 },
  { factor: "LowVol",      exposure: -0.28, contribution:  44.1, returnAttr:  -6.8 },
  { factor: "Growth",      exposure:  0.61, contribution: 112.4, returnAttr:  22.1 },
  { factor: "Technology",  exposure:  0.91, contribution: 184.2, returnAttr:  34.8 },
  { factor: "Financials",  exposure: -0.14, contribution:  24.1, returnAttr:   2.4 },
  { factor: "Healthcare",  exposure:  0.22, contribution:  38.4, returnAttr:   8.1 },
  { factor: "Energy",      exposure:  0.08, contribution:  14.2, returnAttr:   1.8 },
  { factor: "Defense",     exposure:  0.33, contribution:  62.1, returnAttr:  14.4 },
];

/* ─────────────────────────────────────────────────────────────────────────────
   MARGINAL / COMPONENT VaR BY POSITION
───────────────────────────────────────────────────────────────────────────── */
export type PositionVaR = {
  sym: string;
  name: string;
  mktValue: number;   // $M
  componentVaR: number; // $M
  pctVaR: number;       // % of total VaR
  marginalVaR: number;  // $M per $1M notional
  betaVaR: number;      // contribution vs market
};

export const COMPONENT_VAR: PositionVaR[] = [
  { sym: "NVDA",    name: "NVIDIA Corp",           mktValue: 5.147, componentVaR: 3.84, pctVaR: 20.8, marginalVaR: 0.746, betaVaR: 1.42 },
  { sym: "MSFT",    name: "Microsoft Corp",         mktValue: 8.184, componentVaR: 2.41, pctVaR: 13.1, marginalVaR: 0.294, betaVaR: 1.12 },
  { sym: "BTC-USD", name: "Bitcoin",                mktValue: 2.555, componentVaR: 2.18, pctVaR: 11.8, marginalVaR: 0.854, betaVaR: 0.82 },
  { sym: "AAPL",    name: "Apple Inc",              mktValue: 4.886, componentVaR: 1.84, pctVaR:  9.9, marginalVaR: 0.377, betaVaR: 1.04 },
  { sym: "META",    name: "Meta Platforms",         mktValue: 4.958, componentVaR: 1.74, pctVaR:  9.4, marginalVaR: 0.351, betaVaR: 1.18 },
  { sym: "PLTR",    name: "Palantir Technologies",  mktValue: 2.416, componentVaR: 1.48, pctVaR:  8.0, marginalVaR: 0.612, betaVaR: 1.62 },
  { sym: "ETH-USD", name: "Ethereum",               mktValue: 1.454, componentVaR: 1.12, pctVaR:  6.1, marginalVaR: 0.770, betaVaR: 0.74 },
  { sym: "AMZN",    name: "Amazon.com",             mktValue: 2.253, componentVaR: 0.84, pctVaR:  4.6, marginalVaR: 0.373, betaVaR: 1.08 },
  { sym: "LMT",     name: "Lockheed Martin",        mktValue: 1.950, componentVaR: 0.62, pctVaR:  3.4, marginalVaR: 0.318, betaVaR: 0.72 },
  { sym: "ANET",    name: "Arista Networks",         mktValue: 1.907, componentVaR: 0.58, pctVaR:  3.1, marginalVaR: 0.304, betaVaR: 1.22 },
  { sym: "SPY-P",   name: "SPY Put 520 Sep-26",     mktValue: 0.227, componentVaR:-0.84, pctVaR: -4.6, marginalVaR:-3.700, betaVaR:-0.98 },
  { sym: "Other",   name: "Remaining Positions",    mktValue: 7.310, componentVaR: 2.41, pctVaR: 13.1, marginalVaR: 0.330, betaVaR: 0.94 },
];

/* ─────────────────────────────────────────────────────────────────────────────
   STRESS TESTS
───────────────────────────────────────────────────────────────────────────── */
export type StressTest = {
  scenario: string;
  date: string;
  description: string;
  equityShock: number;  // %
  ratesShock: number;   // bps
  fxShock: number;      // %
  creditShock: number;  // bps
  pnlImpact: number;    // $M
  varChange: number;    // %
};

export const STRESS_TESTS: StressTest[] = [
  {
    scenario: "2008 GFC",
    date: "Sep 2008",
    description: "Lehman collapse — equity -38%, credit spreads +800bps, VIX 80",
    equityShock: -38.0, ratesShock: -120, fxShock: -8.4, creditShock: 820,
    pnlImpact: -184.2, varChange: 312,
  },
  {
    scenario: "COVID-2020",
    date: "Mar 2020",
    description: "Pandemic sell-off — equity -34%, vol spike, rates -120bps",
    equityShock: -33.8, ratesShock: -118, fxShock: 4.2,  creditShock: 380,
    pnlImpact: -148.4, varChange: 241,
  },
  {
    scenario: "Rate +100bps",
    date: "Instantaneous",
    description: "Parallel curve shift +100bps — rates duration shock",
    equityShock:  -4.2, ratesShock:  100, fxShock:  1.4, creditShock:  40,
    pnlImpact:  -28.4, varChange:  38,
  },
  {
    scenario: "Vol Spike ×2",
    date: "Instantaneous",
    description: "Implied vol doubles — VIX from 18 to 36, options mark-to-market",
    equityShock:  -8.1, ratesShock:   24, fxShock:  2.1, creditShock:  80,
    pnlImpact:  -24.1, varChange:  62,
  },
  {
    scenario: "FX USD+15%",
    date: "Instantaneous",
    description: "USD appreciates 15% vs all majors — unhedged foreign positions",
    equityShock:  -2.4, ratesShock:   12, fxShock: 15.0, creditShock:  20,
    pnlImpact:  -18.4, varChange:  22,
  },
  {
    scenario: "Tech Selloff",
    date: "Instantaneous",
    description: "Tech sector down 25% (NVDA, META, MSFT leading)",
    equityShock: -25.0, ratesShock:  -40, fxShock:  0.8, creditShock:  60,
    pnlImpact:  -94.2, varChange: 148,
  },
  {
    scenario: "Crypto -60%",
    date: "Instantaneous",
    description: "Crypto winter — BTC/ETH positions at -60% mark",
    equityShock:  -3.1, ratesShock:    8, fxShock:  0.4, creditShock:  12,
    pnlImpact:  -18.8, varChange:  28,
  },
];

/* ─────────────────────────────────────────────────────────────────────────────
   COMPLIANCE RULES
───────────────────────────────────────────────────────────────────────────── */
export type RuleStatus = "PASS" | "WARN" | "BREACH" | "PASSIVE";

export type ComplianceRule = {
  id: string;
  rule: string;
  category: string;
  limit: string;
  current: string;
  currentVal: number;
  limitVal: number;
  status: RuleStatus;
  fund: string;
  regulation: string;
  lastChecked: string;
};

export const COMPLIANCE_RULES: ComplianceRule[] = [
  {
    id: "CR-001", rule: "Single Issuer Concentration", category: "Concentration",
    limit: "≤ 10% NAV", current: "NVDA 8.4%", currentVal: 8.4, limitVal: 10,
    status: "PASS", fund: "FUND-II", regulation: "Internal Policy", lastChecked: "09:30:00",
  },
  {
    id: "CR-002", rule: "Tech Sector Concentration", category: "Sector Cap",
    limit: "≤ 30% NAV", current: "31.4% (NVDA appreciation)", currentVal: 31.4, limitVal: 30,
    status: "PASSIVE", fund: "FUND-II", regulation: "Internal Policy", lastChecked: "09:30:00",
  },
  {
    id: "CR-003", rule: "UCITS 5/10/40 Rule", category: "UCITS",
    limit: "No single >10%, sum of >5% ≤ 40%", current: "Sum of >5% = 36.8%", currentVal: 36.8, limitVal: 40,
    status: "WARN", fund: "FUND-I", regulation: "UCITS IV Art 52", lastChecked: "09:30:00",
  },
  {
    id: "CR-004", rule: "Gross Leverage", category: "Leverage",
    limit: "≤ 200% NAV", current: "148.2%", currentVal: 148.2, limitVal: 200,
    status: "PASS", fund: "ALL", regulation: "Internal Policy", lastChecked: "09:30:00",
  },
  {
    id: "CR-005", rule: "Net Leverage", category: "Leverage",
    limit: "≤ 130% NAV", current: "112.4%", currentVal: 112.4, limitVal: 130,
    status: "PASS", fund: "ALL", regulation: "Internal Policy", lastChecked: "09:30:00",
  },
  {
    id: "CR-006", rule: "Illiquid Asset Cap", category: "Liquidity",
    limit: "≤ 10% NAV in illiquid", current: "3.2%", currentVal: 3.2, limitVal: 10,
    status: "PASS", fund: "ALL", regulation: "AIFMD Art 16", lastChecked: "09:30:00",
  },
  {
    id: "CR-007", rule: "Crypto Allocation Cap", category: "Asset Class",
    limit: "≤ 15% NAV", current: "Digital 12.4%", currentVal: 12.4, limitVal: 15,
    status: "PASS", fund: "FUND-II", regulation: "Internal Policy", lastChecked: "09:30:00",
  },
  {
    id: "CR-008", rule: "Restricted Securities List", category: "Restricted List",
    limit: "0 positions", current: "0 restricted", currentVal: 0, limitVal: 0,
    status: "PASS", fund: "ALL", regulation: "Compliance Manual §4", lastChecked: "09:30:00",
  },
  {
    id: "CR-009", rule: "Single Counterparty OTC", category: "Concentration",
    limit: "≤ 5% NAV per CP", current: "Max 3.8%", currentVal: 3.8, limitVal: 5,
    status: "PASS", fund: "ALL", regulation: "EMIR / Dodd-Frank", lastChecked: "09:30:00",
  },
  {
    id: "CR-010", rule: "Options Notional Cap", category: "Derivatives",
    limit: "≤ 20% gross notional", current: "Options 7.1%", currentVal: 7.1, limitVal: 20,
    status: "PASS", fund: "FUND-II", regulation: "Internal Policy", lastChecked: "09:30:00",
  },
  {
    id: "CR-011", rule: "FX Hedge Coverage", category: "FX",
    limit: "≥ 80% of foreign positions hedged", current: "82.4% hedged", currentVal: 82.4, limitVal: 80,
    status: "PASS", fund: "FUND-I", regulation: "Internal Policy", lastChecked: "09:30:00",
  },
  {
    id: "CR-012", rule: "Duration Limit (Fixed Income)", category: "Rates",
    limit: "≤ 8.0 modified duration", current: "7.2 yr", currentVal: 7.2, limitVal: 8.0,
    status: "PASS", fund: "FUND-III", regulation: "Internal Policy", lastChecked: "09:30:00",
  },
];

/* ─────────────────────────────────────────────────────────────────────────────
   ACTIVE BREACHES
───────────────────────────────────────────────────────────────────────────── */
export type Breach = {
  id: string;
  rule: string;
  fund: string;
  severity: "HIGH" | "MED" | "LOW";
  breachType: "ACTIVE" | "PASSIVE";
  detail: string;
  detectedAt: string;
  owner: string;
  status: "OPEN" | "REMEDIATION" | "MONITORING";
  dueDate: string;
};

export const ACTIVE_BREACHES: Breach[] = [
  {
    id: "BR-2026-042",
    rule: "Tech Sector Concentration (CR-002)",
    fund: "FUND-II",
    severity: "MED",
    breachType: "PASSIVE",
    detail: "NVDA appreciation drove Tech sector to 31.4% vs 30% limit. No new purchases made — passive breach from mark-to-market. Remediation window: 10 business days per policy §7.4.",
    detectedAt: "2026-06-06 09:30",
    owner: "J. Harrison (PM)",
    status: "MONITORING",
    dueDate: "2026-06-20",
  },
  {
    id: "BR-2026-031",
    rule: "UCITS 5/10/40 Warning (CR-003)",
    fund: "FUND-I",
    severity: "LOW",
    breachType: "PASSIVE",
    detail: "Sum of positions >5% reached 36.8%, approaching 40% UCITS IV limit. Triggered monitoring threshold at 36%. Requires no immediate action but flagged for next rebalance.",
    detectedAt: "2026-06-07 14:18",
    owner: "Compliance Team",
    status: "MONITORING",
    dueDate: "2026-06-30",
  },
];

/* ─────────────────────────────────────────────────────────────────────────────
   PRE-TRADE CHECK SCENARIOS
───────────────────────────────────────────────────────────────────────────── */
export type PreTradeResult = "PASS" | "WARN" | "BLOCK";

export type PreTradeCheck = {
  rule: string;
  result: PreTradeResult;
  detail: string;
};

export type PreTradeOrder = {
  sym: string;
  side: "BUY" | "SELL";
  qty: number;
  notional: number; // $M
  fund: string;
  checks: PreTradeCheck[];
  overall: PreTradeResult;
};

export const PRETRADE_SCENARIO: PreTradeOrder = {
  sym: "NVDA",
  side: "BUY",
  qty: 8_000,
  notional: 0.971,
  fund: "FUND-II",
  overall: "WARN",
  checks: [
    { rule: "Restricted List",         result: "PASS", detail: "NVDA not on restricted list." },
    { rule: "Single Issuer (10%)",      result: "WARN", detail: "Post-trade NVDA would reach 9.2% vs 10% limit. 0.8% headroom remaining." },
    { rule: "Sector Cap (Tech 30%)",    result: "BLOCK",detail: "Tech already at 31.4% (passive breach). Any BUY in sector requires PM override + compliance sign-off." },
    { rule: "Leverage (200% gross)",    result: "PASS", detail: "Gross leverage post-trade: 149.8% — within limit." },
    { rule: "UCITS 5/10/40",           result: "WARN", detail: "Sum of >5% positions would increase to 37.4%. Approaching 40% limit." },
    { rule: "Liquidity Check",          result: "PASS", detail: "NVDA ADV $12.4B; order is 0.008% ADV — no market impact concern." },
    { rule: "Short-Selling Compliance", result: "PASS", detail: "Long-side order. No SSR check required." },
  ],
};

/* ─────────────────────────────────────────────────────────────────────────────
   AUDIT TRAIL
───────────────────────────────────────────────────────────────────────────── */
export type AuditEntry = {
  ts: string;
  user: string;
  action: string;
  detail: string;
  ruleId: string;
};

export const AUDIT_TRAIL: AuditEntry[] = [
  { ts: "09:30:02", user: "SYSTEM",       action: "RULE CHECK",    detail: "Full compliance scan — 12 rules evaluated. 1 passive breach, 1 warning.", ruleId: "ALL" },
  { ts: "09:30:04", user: "SYSTEM",       action: "BREACH LOGGED", detail: "CR-002 Tech sector 31.4% > 30.0% (passive, NVDA mark-to-market).", ruleId: "CR-002" },
  { ts: "09:32:18", user: "J.Harrison",   action: "ACK BREACH",    detail: "PM acknowledged BR-2026-042. Remediation plan: trim 2% NVDA within 10bd.", ruleId: "CR-002" },
  { ts: "09:44:11", user: "SYSTEM",       action: "PRE-TRADE",     detail: "NVDA BUY 8,000 sh FUND-II flagged WARN — sector cap near limit.", ruleId: "CR-002" },
  { ts: "09:44:55", user: "Compliance",   action: "OVERRIDE REQ",  detail: "Compliance override request logged for NVDA BUY. Pending senior approval.", ruleId: "CR-002" },
  { ts: "09:58:32", user: "SYSTEM",       action: "RULE CHECK",    detail: "CR-003 UCITS 5/10/40 monitoring — sum of >5% at 36.8%, threshold 36% triggered.", ruleId: "CR-003" },
];

/* ─────────────────────────────────────────────────────────────────────────────
   PERFORMANCE & ATTRIBUTION
───────────────────────────────────────────────────────────────────────────── */
export type ReturnPeriod = {
  label: string;
  twr: number;     // %
  mwr: number;     // %
  benchmark: number; // %
  active: number;  // %
};

export const RETURN_PERIODS: ReturnPeriod[] = [
  { label: "MTD",   twr:  2.41, mwr:  2.38, benchmark:  1.84, active:  0.57 },
  { label: "QTD",   twr:  6.82, mwr:  6.74, benchmark:  5.41, active:  1.41 },
  { label: "YTD",   twr: 14.34, mwr: 14.01, benchmark: 11.28, active:  3.06 },
  { label: "1Y",    twr: 22.84, mwr: 22.41, benchmark: 18.41, active:  4.43 },
  { label: "3Y Ann",twr: 18.12, mwr: 17.88, benchmark: 14.22, active:  3.90 },
  { label: "ITD",   twr: 84.21, mwr: 81.44, benchmark: 62.18, active: 22.03 },
];

export type BrinsonRow = {
  sector: string;
  portWeight: number;    // %
  benchWeight: number;   // %
  portReturn: number;    // %
  benchReturn: number;   // %
  allocation: number;    // bps
  selection: number;     // bps
  interaction: number;   // bps
  total: number;         // bps
};

export const BRINSON_TABLE: BrinsonRow[] = [
  { sector: "Technology",    portWeight: 31.4, benchWeight: 28.1, portReturn: 24.8, benchReturn: 21.4, allocation:  12.4, selection: 48.2, interaction:  7.1, total:  67.7 },
  { sector: "Defense",       portWeight:  8.2, benchWeight:  3.4, portReturn: 18.4, benchReturn: 12.8, allocation:  18.4, selection: 14.8, interaction:  3.2, total:  36.4 },
  { sector: "Crypto",        portWeight: 11.8, benchWeight:  0.0, portReturn: 38.4, benchReturn:  0.0, allocation:  48.2, selection:  0.0, interaction:  0.0, total:  48.2 },
  { sector: "Financials",    portWeight:  6.4, benchWeight:  8.2, portReturn: 12.1, benchReturn: 11.8, allocation:  -2.4, selection:  0.8, interaction: -0.2, total:  -1.8 },
  { sector: "Healthcare",    portWeight:  4.1, benchWeight:  6.8, portReturn: 14.2, benchReturn: 13.4, allocation:  -4.1, selection:  1.2, interaction: -0.3, total:  -3.2 },
  { sector: "Consumer",      portWeight:  3.8, benchWeight:  5.4, portReturn:  8.4, benchReturn: 10.2, allocation:  -2.8, selection: -2.4, interaction:  0.8, total:  -4.4 },
  { sector: "Energy",        portWeight:  2.4, benchWeight:  4.1, portReturn:  6.2, benchReturn:  7.8, allocation:  -2.1, selection: -0.8, interaction:  0.3, total:  -2.6 },
  { sector: "Rates",         portWeight: 14.2, benchWeight: 16.4, portReturn:  3.8, benchReturn:  2.4, allocation:   1.8, selection:  4.8, interaction: -0.4, total:   6.2 },
  { sector: "FX",            portWeight:  6.6, benchWeight:  8.2, portReturn:  4.2, benchReturn:  3.8, allocation:  -0.8, selection:  0.8, interaction: -0.1, total:  -0.1 },
  { sector: "Other",         portWeight: 11.1, benchWeight: 19.4, portReturn:  9.8, benchReturn: 10.4, allocation:  -8.4, selection: -1.4, interaction:  1.2, total:  -8.6 },
];

export type FactorAttrib = {
  factor: string;
  exposure: number;
  factorReturn: number;  // %
  contribution: number;  // bps
};

export const FACTOR_ATTRIBUTION: FactorAttrib[] = [
  { factor: "Market",      exposure:  1.14, factorReturn: 11.28, contribution: 128.6 },
  { factor: "Momentum",    exposure:  0.78, factorReturn:  8.42, contribution:  65.7 },
  { factor: "Growth",      exposure:  0.61, factorReturn:  7.18, contribution:  43.8 },
  { factor: "Quality",     exposure:  0.54, factorReturn:  5.84, contribution:  31.5 },
  { factor: "Technology",  exposure:  0.91, factorReturn: 12.18, contribution: 110.8 },
  { factor: "Defense",     exposure:  0.33, factorReturn:  9.84, contribution:  32.5 },
  { factor: "Value",       exposure: -0.31, factorReturn:  4.12, contribution: -12.8 },
  { factor: "LowVol",      exposure: -0.28, factorReturn:  3.88, contribution: -10.9 },
  { factor: "Size",        exposure: -0.42, factorReturn:  2.84, contribution: -11.9 },
  { factor: "Specific",    exposure:   1.0, factorReturn:  0,    contribution:  55.5 },
];

export const BENCHMARK_ANALYTICS = {
  trackingError: 6.84,          // % annualized
  informationRatio: 0.648,
  activeReturn: 4.43,           // % (1Y)
  activeSharePct: 68.4,
  upCapture: 112.4,             // %
  downCapture:  88.2,           // %
  sharpe: 1.48,
  sortino: 2.14,
  maxDrawdown: -11.4,
  calmar: 2.00,
  hitRate: 58.4,                // %
};

export type FixedIncomeAttrib = {
  component: string;
  contribution: number; // bps
  description: string;
};

export const FIXED_INCOME_ATTRIBUTION: FixedIncomeAttrib[] = [
  { component: "Carry",       contribution: 184.2, description: "Coupon income + roll-down along curve" },
  { component: "Curve",       contribution:  48.4, description: "Duration + convexity from curve flattening" },
  { component: "Spread",      contribution:  82.4, description: "HY/IG credit spread tightening" },
  { component: "Allocation",  contribution:  24.1, description: "Sector / duration bucket over/under-weight" },
  { component: "Selection",   contribution:  38.2, description: "Issuer selection within bucket" },
  { component: "Residual",    contribution:  -8.4, description: "Option-adjusted / residual terms" },
];

/* Monthly NAV series for TWR/MWR chart */
export const NAV_SERIES = priceWalk("aegis-nav", 12, 100, 0.028, 0.012);
export const BENCH_SERIES = priceWalk("aegis-bench", 12, 100, 0.022, 0.008);
