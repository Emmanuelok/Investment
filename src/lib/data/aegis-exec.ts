/**
 * AEGIS Execution + Optimization — demo data fabric.
 *
 * All series generated from fixed seeds → deterministic, hydration-safe.
 * Clearly DEMO DATA; live values come from OMS/EMS websocket adapters when
 * venue connections are enabled (IBKR / Alpaca / CCXT / SIM).
 */
import { Rng, priceWalk } from "@/lib/rng";

/* ─────────────────────────────────────────────────────────────────────────── */
/*  BLOTTER — Order Lifecycle                                                   */
/* ─────────────────────────────────────────────────────────────────────────── */

export type OrderStatus =
  | "CREATED"
  | "COMPLIANCE"
  | "STAGED"
  | "ROUTED"
  | "PARTIAL"
  | "FILLED"
  | "ALLOCATED"
  | "BOOKED"
  | "RECONCILED"
  | "REJECTED"
  | "CANCELLED";

export type OrderType = "MKT" | "LMT" | "STOP" | "TWAP" | "VWAP" | "IS" | "ICE";
export type OrderSide = "BUY" | "SELL" | "SELL_SHORT";
export type Venue = "IBKR" | "ALPACA" | "BINANCE" | "COINBASE" | "SIM" | "IEX" | "DARK";

export interface BlotterOrder {
  id: string;
  time: string;
  side: OrderSide;
  sym: string;
  qty: number;
  type: OrderType;
  limitPx: number | null;
  filledQty: number;
  avgPx: number | null;
  venue: Venue;
  status: OrderStatus;
  notional: number;
}

const STATUS_FLOW: OrderStatus[] = [
  "CREATED", "COMPLIANCE", "STAGED", "ROUTED", "PARTIAL",
  "FILLED", "ALLOCATED", "BOOKED", "RECONCILED",
];

const SYMS_EQ: [string, number][] = [
  ["NVDA", 121.4], ["AAPL", 214.3], ["MSFT", 449.8], ["LMT", 463.1],
  ["PLTR", 28.7], ["META", 503.9], ["ANET", 312.7], ["TSLA", 248.5],
  ["AMZN", 186.2], ["GOOGL", 172.8], ["JPM", 203.4], ["GS", 467.1],
];

const SYMS_CRYPTO: [string, number][] = [
  ["BTC", 67241.0], ["ETH", 3528.4], ["SOL", 168.3], ["BNB", 412.0],
];

export function blotterOrders(): BlotterOrder[] {
  const r = new Rng("blotter-orders-2026");
  const allSyms = [...SYMS_EQ, ...SYMS_CRYPTO];
  const venues: Venue[] = ["IBKR", "ALPACA", "SIM", "IEX", "DARK", "BINANCE"];
  const types: OrderType[] = ["MKT", "LMT", "TWAP", "VWAP", "IS", "ICE"];
  const sides: OrderSide[] = ["BUY", "BUY", "SELL", "BUY", "SELL_SHORT", "BUY"];
  const statuses: OrderStatus[] = [
    "FILLED", "FILLED", "PARTIAL", "RECONCILED", "STAGED",
    "ROUTED", "COMPLIANCE", "FILLED", "BOOKED", "ALLOCATED",
    "REJECTED", "FILLED", "PARTIAL", "CANCELLED", "RECONCILED",
    "FILLED", "FILLED", "ROUTED",
  ];

  const hours = ["07:32", "08:14", "08:47", "09:01", "09:15", "09:33", "09:52",
    "10:08", "10:21", "10:44", "11:02", "11:19", "11:38", "12:03", "12:44",
    "13:17", "14:06", "15:51"];

  return statuses.map((status, i) => {
    const [sym, basePx] = allSyms[i % allSyms.length];
    const side = sides[i % sides.length];
    const type = types[i % types.length];
    const venue = venues[i % venues.length];
    const qty = r.int(100, 25000);
    const slipBps = r.gauss(0, 4);
    const px = basePx * (1 + slipBps / 10000);
    const isFilled = status === "FILLED" || status === "ALLOCATED" || status === "BOOKED" || status === "RECONCILED";
    const isPartial = status === "PARTIAL";
    const filledQty = isFilled ? qty : isPartial ? Math.floor(qty * r.float(0.25, 0.75)) : 0;
    const avgPx = filledQty > 0 ? px : null;
    const limitPx = type === "LMT" || type === "ICE" ? basePx * (side === "BUY" ? r.float(0.995, 1.002) : r.float(0.998, 1.005)) : null;
    const notional = qty * basePx;
    return {
      id: `ORD-${(10000 + i * 137).toString().padStart(5, "0")}`,
      time: hours[i],
      side,
      sym,
      qty,
      type,
      limitPx,
      filledQty,
      avgPx,
      venue,
      status,
      notional,
    };
  });
}

/* Block order → child allocations */
export interface BlockAllocation {
  account: string;
  fund: string;
  pct: number;
  qty: number;
  avgPx: number;
  notional: number;
}
export interface BlockOrder {
  id: string;
  sym: string;
  side: OrderSide;
  totalQty: number;
  type: OrderType;
  filledQty: number;
  avgPx: number;
  status: OrderStatus;
  allocations: BlockAllocation[];
}

export function blockOrders(): BlockOrder[] {
  const r = new Rng("block-orders-2026");
  const px = 449.8; // MSFT
  const totalQty = 50000;
  const accounts: [string, string, number][] = [
    ["ACC-001", "Global Equity Fund", 0.35],
    ["ACC-002", "Emerging Growth", 0.22],
    ["ACC-003", "Market-Neutral Alpha", 0.18],
    ["ACC-004", "Macro Opportunities", 0.15],
    ["ACC-005", "Event-Driven Sleeve", 0.10],
  ];
  const avgPx = px * (1 + r.gauss(0, 3) / 10000);
  return [{
    id: "BLOK-0042",
    sym: "MSFT",
    side: "BUY",
    totalQty,
    type: "TWAP",
    filledQty: totalQty,
    avgPx,
    status: "ALLOCATED",
    allocations: accounts.map(([account, fund, pct]) => ({
      account,
      fund,
      pct: pct * 100,
      qty: Math.round(totalQty * pct),
      avgPx,
      notional: Math.round(totalQty * pct) * avgPx,
    })),
  }];
}

/* KPIs */
export const BLOTTER_KPIS = [
  { label: "ORDERS TODAY", value: "1,847", sub: "↑ 12% vs. prev session", icon: "bars", tone: "accent" as const },
  { label: "FILL RATE", value: "97.3%", sub: "94.1% prior 5-day avg", icon: "target", tone: "pos" as const },
  { label: "BLOCKED — COMPLIANCE", value: "4", sub: "2 fat-finger, 2 AML hold", icon: "shield", tone: "warn" as const },
  { label: "OPEN NOTIONAL", value: "$18.7M", sub: "across 23 open orders", icon: "coins", tone: "accent" as const },
];

/* Order lifecycle legend */
export const ORDER_LIFECYCLE: { state: OrderStatus; desc: string }[] = [
  { state: "CREATED", desc: "New order record in OMS — pre-validation" },
  { state: "COMPLIANCE", desc: "Pre-trade compliance check (AML, fat-finger, limits)" },
  { state: "STAGED", desc: "Passed all checks; queued for routing" },
  { state: "ROUTED", desc: "Sent to venue / algo engine via FIX or REST" },
  { state: "PARTIAL", desc: "Partial fill received; remainder still live" },
  { state: "FILLED", desc: "100% filled at venue(s)" },
  { state: "ALLOCATED", desc: "Block order pro-rata allocated to accounts" },
  { state: "BOOKED", desc: "Booking confirmed in prime/portfolio system" },
  { state: "RECONCILED", desc: "End-of-day custodian reconciliation passed" },
];

/* ─────────────────────────────────────────────────────────────────────────── */
/*  EMS — Execution Algorithms, SOR, FIX, TCA                                  */
/* ─────────────────────────────────────────────────────────────────────────── */

export type AlgoStatus = "RUNNING" | "COMPLETE" | "PAUSED" | "IDLE";

export interface ExecAlgo {
  name: string;
  desc: string;
  order: string;
  sym: string;
  qty: number;
  filledPct: number;
  elapsed: string;
  remaining: string;
  status: AlgoStatus;
  scheduleVols: number[];  // participation schedule
}

export function execAlgos(): ExecAlgo[] {
  return [
    {
      name: "TWAP",
      desc: "Time-Weighted Average Price — uniform slicing over horizon",
      order: "ORD-10042",
      sym: "MSFT",
      qty: 50000,
      filledPct: 72,
      elapsed: "1h 26m",
      remaining: "34m",
      status: "RUNNING",
      scheduleVols: priceWalk("twap-sched", 12, 4200, 0.06, 0).map(Math.round),
    },
    {
      name: "VWAP",
      desc: "Volume-Weighted Average Price — follows intraday volume curve",
      order: "ORD-10055",
      sym: "NVDA",
      qty: 12000,
      filledPct: 61,
      elapsed: "2h 01m",
      remaining: "1h 12m",
      status: "RUNNING",
      scheduleVols: priceWalk("vwap-sched", 12, 6000, 0.12, 0.01).map(Math.round),
    },
    {
      name: "POV",
      desc: "Percentage of Volume — 15% participation rate cap",
      order: "ORD-10067",
      sym: "TSLA",
      qty: 8500,
      filledPct: 100,
      elapsed: "4h 48m",
      remaining: "—",
      status: "COMPLETE",
      scheduleVols: priceWalk("pov-sched", 12, 3200, 0.08, 0.002).map(Math.round),
    },
    {
      name: "IS",
      desc: "Implementation Shortfall — minimizes total cost vs. arrival price",
      order: "ORD-10079",
      sym: "AAPL",
      qty: 30000,
      filledPct: 38,
      elapsed: "42m",
      remaining: "1h 55m",
      status: "RUNNING",
      scheduleVols: priceWalk("is-sched", 12, 7500, 0.09, -0.005).map(Math.round),
    },
    {
      name: "ICEBERG",
      desc: "Displays 500-share clip; replenishes until parent filled",
      order: "ORD-10081",
      sym: "LMT",
      qty: 5000,
      filledPct: 0,
      elapsed: "—",
      remaining: "on trigger",
      status: "IDLE",
      scheduleVols: priceWalk("ice-sched", 12, 400, 0.05, 0).map(Math.round),
    },
  ];
}

/* Smart Order Router */
export interface SorVenue {
  venue: string;
  type: string;
  routedPct: number;
  topOfBook: number;
  liquidity: string;
  estCost: number; // bps
  latencyUs: number;
  enabled: boolean;
}

export function sorVenues(): SorVenue[] {
  return [
    { venue: "IBKR-SmartRoute", type: "Multi-venue", routedPct: 38, topOfBook: 449.76, liquidity: "HI", estCost: 0.3, latencyUs: 420, enabled: true },
    { venue: "IEX Exchange", type: "Lit / Speed-bump", routedPct: 22, topOfBook: 449.78, liquidity: "MED", estCost: 0.5, latencyUs: 350, enabled: true },
    { venue: "BATS BZX", type: "Lit ECN", routedPct: 18, topOfBook: 449.77, liquidity: "HI", estCost: 0.4, latencyUs: 160, enabled: true },
    { venue: "NYSE Arca", type: "Lit ECN", routedPct: 11, topOfBook: 449.75, liquidity: "MED", estCost: 0.6, latencyUs: 210, enabled: true },
    { venue: "Liquidnet ATS", type: "Dark pool", routedPct: 8, topOfBook: 449.80, liquidity: "LOW", estCost: 0.1, latencyUs: 1200, enabled: true },
    { venue: "Alpaca Paper", type: "SIM", routedPct: 3, topOfBook: 449.78, liquidity: "SIM", estCost: 0.0, latencyUs: 95, enabled: true },
    { venue: "CCXT/Binance", type: "Crypto", routedPct: 0, topOfBook: 0, liquidity: "N/A", estCost: 8.0, latencyUs: 38, enabled: false },
  ];
}

/* FIX Sessions */
export type FixStatus = "ACTIVE" | "LOGON" | "LOGOUT" | "DISCONNECTED" | "RESET";

export interface FixSession {
  senderCompId: string;
  targetCompId: string;
  qualifier: string;
  seqNum: number;
  inSeq: number;
  status: FixStatus;
  msgs24h: number;
  rejects: number;
}

export const FIX_SESSIONS: FixSession[] = [
  { senderCompId: "PANTHEON1", targetCompId: "IBKR_FIX_PROD", qualifier: "equities-oms", seqNum: 84217, inSeq: 84109, status: "ACTIVE", msgs24h: 84217, rejects: 3 },
  { senderCompId: "PANTHEON1", targetCompId: "IBKR_FIX_PROD", qualifier: "algo-twap", seqNum: 12441, inSeq: 12384, status: "ACTIVE", msgs24h: 12441, rejects: 0 },
  { senderCompId: "PANTHEON1", targetCompId: "IEX_DIRECT", qualifier: "direct-mkt", seqNum: 31880, inSeq: 31721, status: "ACTIVE", msgs24h: 31880, rejects: 7 },
  { senderCompId: "PANTHEON1", targetCompId: "ALPACA_PAPER", qualifier: "paper-dev", seqNum: 2203, inSeq: 2201, status: "ACTIVE", msgs24h: 2203, rejects: 0 },
  { senderCompId: "PANTHEON1", targetCompId: "LIQUIDNET_DK", qualifier: "dark-pool", seqNum: 411, inSeq: 399, status: "LOGON", msgs24h: 411, rejects: 1 },
  { senderCompId: "PANTHEON1", targetCompId: "CCXT_BINANCE", qualifier: "crypto-cex", seqNum: 0, inSeq: 0, status: "DISCONNECTED", msgs24h: 0, rejects: 0 },
];

/* TCA */
export interface TcaMetric {
  label: string;
  value: number;
  unit: string;
  bench: number;
  tone: "pos" | "neg" | "warn" | "muted";
}

export const TCA_METRICS: TcaMetric[] = [
  { label: "Arrival Price Slippage", value: -3.2, unit: "bps", bench: 0, tone: "neg" },
  { label: "Implementation Shortfall", value: -5.7, unit: "bps", bench: 0, tone: "neg" },
  { label: "VWAP Benchmark", value: +1.4, unit: "bps", bench: 0, tone: "pos" },
  { label: "TWAP Benchmark", value: +0.8, unit: "bps", bench: 0, tone: "pos" },
  { label: "Market Impact", value: -4.1, unit: "bps", bench: 0, tone: "neg" },
  { label: "Timing Cost", value: -1.6, unit: "bps", bench: 0, tone: "neg" },
  { label: "Spread Cost", value: -2.0, unit: "bps", bench: 0, tone: "warn" },
  { label: "Opportunity Cost", value: -0.9, unit: "bps", bench: 0, tone: "warn" },
];

export const TCA_DECOMP = {
  marketImpact: 4.1,
  timingCost: 1.6,
  spreadCost: 2.0,
  opportunityCost: 0.9,
  total: 8.6,
};

export const TCA_SERIES = priceWalk("tca-is-series", 30, 0, 0.8, -0.15);
export const TCA_VWAP_SERIES = priceWalk("tca-vwap-series", 30, 0, 0.4, 0.05);

export const EMS_KPIS = [
  { label: "ACTIVE ALGOS", value: "3", sub: "2× TWAP · 1× IS", icon: "wave", tone: "accent" as const },
  { label: "SOR VENUES LIVE", value: "6 / 7", sub: "1 disabled (CCXT)", icon: "route", tone: "pos" as const },
  { label: "FIX SESSIONS", value: "5 / 6", sub: "1 disconnected", icon: "pulse", tone: "warn" as const },
  { label: "AVG SLIPPAGE", value: "−3.2bps", sub: "vs −5.1bps prior wk", icon: "gauge", tone: "pos" as const },
];

/* ─────────────────────────────────────────────────────────────────────────── */
/*  OPTIMIZER — Portfolio Construction                                          */
/* ─────────────────────────────────────────────────────────────────────────── */

export type OptObjective = "Mean-Variance" | "Risk-Parity" | "Max-Diversification" | "Black-Litterman" | "CVaR";

export interface EfficientFrontierPoint {
  risk: number;   // annualised vol %
  ret: number;    // annualised return %
  sharpe: number;
  isOptimal?: boolean;
  isCurrent?: boolean;
}

export function efficientFrontier(): EfficientFrontierPoint[] {
  const r = new Rng("ef-2026");
  const pts: EfficientFrontierPoint[] = [];
  for (let i = 0; i < 320; i++) {
    const risk = r.float(4, 26);
    const sharpe = r.gauss(0.8, 0.35);
    const ret = risk * Math.max(0.1, sharpe) + r.gauss(0, 0.5);
    pts.push({ risk, ret, sharpe });
  }
  // Mark optimal (max sharpe ≈ 1.6 risk/ret trade-off around 12% vol)
  pts.push({ risk: 12.2, ret: 19.8, sharpe: 1.62, isOptimal: true });
  // Mark current portfolio
  pts.push({ risk: 15.8, ret: 21.4, sharpe: 1.35, isCurrent: true });
  return pts;
}

export interface ProposedTrade {
  sym: string;
  currentWt: number;  // %
  targetWt: number;
  delta: number;
  qty: number;
  notional: number;
  reason: string;
}

export const PROPOSED_TRADES: ProposedTrade[] = [
  { sym: "NVDA", currentWt: 6.2, targetWt: 8.5, delta: +2.3, qty: 1840, notional: 223376, reason: "Factor tilt: momentum + quality" },
  { sym: "MSFT", currentWt: 7.8, targetWt: 7.0, delta: -0.8, qty: -891, notional: -400442, reason: "Reduce concentration; cov shrinkage" },
  { sym: "LMT",  currentWt: 2.1, targetWt: 3.4, delta: +1.3, qty: 2795, notional: 1294424, reason: "BL view: defense capex cycle" },
  { sym: "TLT",  currentWt: 4.5, targetWt: 6.2, delta: +1.7, qty: 18100, notional: 1706630, reason: "Duration hedge; rates peak signal" },
  { sym: "ELF",  currentWt: 1.2, targetWt: 0.4, delta: -0.8, qty: -4250, notional: -800700, reason: "Signal: demand proxy rollover" },
  { sym: "BTC",  currentWt: 2.8, targetWt: 3.5, delta: +0.7, qty: 10, notional: 672410, reason: "Crypto risk budget expansion" },
];

export interface Constraint {
  label: string;
  current: number;
  limit: number;
  unit: string;
  tone: "pos" | "warn" | "neg";
}

export const CONSTRAINTS: Constraint[] = [
  { label: "Turnover (1-way)", current: 4.2, limit: 8.0, unit: "%", tone: "pos" },
  { label: "Tech sector cap", current: 28.4, limit: 35.0, unit: "% wt", tone: "pos" },
  { label: "Defense sector cap", current: 14.1, limit: 15.0, unit: "% wt", tone: "warn" },
  { label: "Single position cap", current: 8.5, limit: 10.0, unit: "% wt", tone: "pos" },
  { label: "Tracking error budget", current: 3.8, limit: 5.0, unit: "% TE", tone: "pos" },
  { label: "Transaction costs (est)", current: 0.12, limit: 0.30, unit: "% AUM", tone: "pos" },
  { label: "Leverage", current: 1.04, limit: 1.10, unit: "×", tone: "pos" },
  { label: "Net equity exposure", current: 87.3, limit: 95.0, unit: "% NAV", tone: "pos" },
];

export interface WhatIfImpact {
  metric: string;
  before: number;
  after: number;
  unit: string;
  delta: number;
}

export const WHATIF_IMPACTS: WhatIfImpact[] = [
  { metric: "Portfolio Vol (ann.)", before: 15.8, after: 14.9, unit: "%", delta: -0.9 },
  { metric: "Expected Return (ann.)", before: 21.4, after: 22.1, unit: "%", delta: +0.7 },
  { metric: "Sharpe Ratio", before: 1.35, after: 1.48, unit: "", delta: +0.13 },
  { metric: "Max Drawdown (hist.)", before: -18.4, after: -17.1, unit: "%", delta: +1.3 },
  { metric: "CVaR 95 (1D)", before: -2.14, after: -2.01, unit: "%", delta: +0.13 },
  { metric: "Beta to SPY", before: 1.12, after: 1.08, unit: "", delta: -0.04 },
  { metric: "Tech Exposure", before: 28.4, after: 27.8, unit: "% NAV", delta: -0.6 },
  { metric: "Tracking Error", before: 3.8, after: 3.5, unit: "%", delta: -0.3 },
];

export const OPT_KPIS = [
  { label: "OPT OBJECTIVE", value: "Mean-Var", sub: "Black-Litterman views active", icon: "target", tone: "accent" as const },
  { label: "UNIVERSE SIZE", value: "248", sub: "assets eligible", icon: "grid", tone: "accent" as const },
  { label: "TRADES PROPOSED", value: "6", sub: "$3.1M notional", icon: "flow", tone: "warn" as const },
  { label: "RISK REDUCTION", value: "−0.9%", sub: "vol 15.8→14.9%", icon: "gauge", tone: "pos" as const },
];

/* ─────────────────────────────────────────────────────────────────────────── */
/*  PRIVATE MARKETS / ALTERNATIVES                                              */
/* ─────────────────────────────────────────────────────────────────────────── */

export type FundType = "PE" | "VC" | "HEDGE" | "INFRA" | "RE" | "CREDIT";

export interface PrivateFund {
  id: string;
  name: string;
  manager: string;
  type: FundType;
  vintage: number;
  commitment: number;    // $M
  called: number;        // $M
  distributions: number; // $M
  nav: number;           // $M
  irr: number;           // %
  moic: number;
  tvpi: number;
  dpi: number;
  rvpi: number;
  pme: number;           // KS-PME vs S&P 500
  status: "ACTIVE" | "HARVESTING" | "LIQUIDATED";
  jCurve: number[];      // cumulative cashflow series (can go negative)
}

export function privateFunds(): PrivateFund[] {
  const r = new Rng("private-funds-2026");

  const specs: [string, string, string, FundType, number, number, number][] = [
    ["KKR-NA-XIV", "KKR North America XIV", "KKR", "PE", 2019, 80, 68],
    ["SEQ-CAP-VII", "Sequoia Capital VII", "Sequoia", "VC", 2020, 25, 20],
    ["CARLYLE-R-XII", "Carlyle Realty XII", "Carlyle", "RE", 2018, 50, 48],
    ["BROOKFIELD-T-IV", "Brookfield Infra IV", "Brookfield", "INFRA", 2021, 60, 38],
    ["HPS-CORP-V", "HPS Corporate Credit V", "HPS Inv.", "CREDIT", 2022, 35, 29],
    ["VISTA-EQ-VIII", "Vista Equity VIII", "Vista", "PE", 2021, 45, 35],
    ["TIGER-GLOBAL-XIV", "Tiger Global XIV", "Tiger Global", "VC", 2022, 20, 15],
    ["ARES-EUR-VII", "Ares Europe VII", "Ares", "CREDIT", 2020, 30, 27],
  ];

  return specs.map(([id, name, manager, type, vintage, commitment, calledM]) => {
    const rr = new Rng(id + "pfund");
    const called = calledM;
    const yearsOld = 2026 - vintage;
    const irr = rr.gauss(type === "VC" ? 22 : type === "PE" ? 17 : 10, 5);
    const moic = Math.max(0.8, 1 + irr / 100 * yearsOld * rr.float(0.75, 1.1));
    const tvpi = moic;
    const dpi = moic * rr.float(0.3, 0.85);
    const rvpi = tvpi - dpi;
    const nav = called * rvpi;
    const distributions = called * dpi;
    const pme = 0.95 + rr.gauss(0.12, 0.08);
    const status: "ACTIVE" | "HARVESTING" | "LIQUIDATED" =
      yearsOld > 7 ? "HARVESTING" : "ACTIVE";

    // J-Curve: starts negative (drawdowns), inflects, rises
    const jPoints = 16;
    const jCurve: number[] = [];
    let cum = 0;
    for (let q = 0; q < jPoints; q++) {
      if (q < 4) {
        cum -= called / 6 * rr.float(0.8, 1.2);
      } else if (q < 8) {
        cum -= called / 12 * rr.float(0.2, 0.5);
      } else {
        cum += called * (moic - 1) / 8 * rr.float(0.7, 1.3);
      }
      jCurve.push(Math.round(cum * 10) / 10);
    }

    return {
      id, name, manager, type, vintage,
      commitment,
      called,
      distributions: Math.round(distributions * 10) / 10,
      nav: Math.round(nav * 10) / 10,
      irr: Math.round(irr * 10) / 10,
      moic: Math.round(moic * 100) / 100,
      tvpi: Math.round(tvpi * 100) / 100,
      dpi: Math.round(dpi * 100) / 100,
      rvpi: Math.round(rvpi * 100) / 100,
      pme: Math.round(pme * 100) / 100,
      status,
      jCurve,
    };
  });
}

/* Unified exposure: public + private + crypto */
export interface UnifiedExposure {
  bucket: string;
  subtype: string;
  nav: number;    // $M
  pct: number;    // % of total
  color: string;
}

export function unifiedExposure(): UnifiedExposure[] {
  return [
    { bucket: "Public Equity", subtype: "US Large Cap", nav: 148.2, pct: 29.6, color: "var(--accent)" },
    { bucket: "Public Equity", subtype: "International", nav: 62.4, pct: 12.5, color: "var(--accent)" },
    { bucket: "Fixed Income", subtype: "IG Credit", nav: 55.1, pct: 11.0, color: "var(--info)" },
    { bucket: "Fixed Income", subtype: "Gov / Duration", nav: 38.7, pct: 7.7, color: "var(--info)" },
    { bucket: "Private Equity", subtype: "Buyout", nav: 62.5, pct: 12.5, color: "var(--pos)" },
    { bucket: "Private Equity", subtype: "Venture", nav: 21.8, pct: 4.4, color: "var(--pos)" },
    { bucket: "Real Assets", subtype: "Real Estate", nav: 28.4, pct: 5.7, color: "var(--warn)" },
    { bucket: "Real Assets", subtype: "Infrastructure", nav: 22.1, pct: 4.4, color: "var(--warn)" },
    { bucket: "Credit", subtype: "Private Credit", nav: 31.6, pct: 6.3, color: "var(--neg)" },
    { bucket: "Crypto / Digital", subtype: "BTC / ETH / Alt", nav: 17.5, pct: 3.5, color: "var(--ai)" },
    { bucket: "Hedge Funds", subtype: "Multi-strat / L/S", nav: 11.7, pct: 2.3, color: "var(--dim)" },
  ];
}

export const PRIVATE_KPIS = [
  { label: "TOTAL COMMITMENTS", value: "$345M", sub: "8 funds · 4 managers", icon: "layers", tone: "accent" as const },
  { label: "CALLED CAPITAL", value: "$280M", sub: "81% draw-down rate", icon: "coins", tone: "accent" as const },
  { label: "PORTFOLIO IRR", value: "14.8%", sub: "KS-PME 1.12×", icon: "gauge", tone: "pos" as const },
  { label: "UNREALISED NAV", value: "$312M", sub: "TVPI 1.84× wtd avg", icon: "database", tone: "pos" as const },
];
