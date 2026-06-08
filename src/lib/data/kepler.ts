/**
 * KEPLER quant platform demo data.
 * All series seeded deterministically — server and client render identically.
 * Reproducibility is a first-class design principle of the real platform.
 */
import { Rng, priceWalk, candleSeries } from "@/lib/rng";
import type { Candle } from "@/lib/rng";

/* ── Dataset Catalog ────────────────────────────────────────────────────── */
export type DatasetField = {
  field: string;
  dataset: string;
  coverage: number; // %
  frequency: string;
  pit: string; // PIT semantics description
  source: string;
};

export const DATASET_CATALOG: DatasetField[] = [
  { field: "close, volume, ohlcv", dataset: "Equity Prices", coverage: 99, frequency: "1-min / EOD", pit: "trade_date ≤ as_of", source: "Polygon / yfinance" },
  { field: "eps_actual, eps_est, surprise", dataset: "Earnings Estimates", coverage: 94, frequency: "Quarterly (point release)", pit: "announce_date ≤ as_of; vintages stored", source: "Compustat / Refinitiv" },
  { field: "rev_growth, fcf_yield, pe_fwd", dataset: "Fundamentals / XBRL", coverage: 97, frequency: "Quarterly (EDGAR lag)", pit: "filing_date ≤ as_of; restatements tracked", source: "SEC EDGAR" },
  { field: "transaction_shares, insider_role", dataset: "Insider Transactions", coverage: 99, frequency: "Daily (Form 4)", pit: "filed_date ≤ as_of; amended forms versioned", source: "SEC EDGAR / Quiver" },
  { field: "congress_member, chamber, amount", dataset: "Congressional Disclosures", coverage: 98, frequency: "Daily (eFD filings)", pit: "filed_date ≤ as_of", source: "Quiver Quant" },
  { field: "sentiment_z, novelty, relevance", dataset: "NLP / Event Scores", coverage: 91, frequency: "Real-time (15-min batch)", pit: "event_ts ≤ as_of; no future text used", source: "GDELT + Finnhub" },
  { field: "job_postings, web_traffic, app_rank", dataset: "Web Signals (Alt)", coverage: 74, frequency: "Daily", pit: "scrape_date ≤ as_of", source: "Thinknum" },
  { field: "card_spend, txn_volume", dataset: "Consumer Panel", coverage: 0, frequency: "Weekly", pit: "cohort_end ≤ as_of", source: "YipitData (not provisioned)" },
  { field: "implied_vol, skew, oi", dataset: "Options Surface", coverage: 88, frequency: "15-min snapshots", pit: "snapshot_ts ≤ as_of", source: "CBOE / Polygon" },
  { field: "bid_ask, depth_imbalance, cvd", dataset: "Micro-structure L2", coverage: 82, frequency: "Tick", pit: "feed_ts ≤ as_of; no synthetic construction", source: "Databento" },
];

/* ── Alpha Expression DSL examples ─────────────────────────────────────── */
export type AlphaExpression = {
  id: string;
  label: string;
  expr: string;
  icMean: number;
  icIr: number;
  turnover: number;
  halfLife: number; // days
};

export const DSL_EXAMPLES: AlphaExpression[] = [
  {
    id: "momentum_rank",
    label: "Cross-sectional momentum",
    expr: `rank(ts_delta(close, 21)) - 0.3 * rank(ts_delta(close, 5))`,
    icMean: 0.048, icIr: 0.81, turnover: 18, halfLife: 12,
  },
  {
    id: "volume_decay",
    label: "Volume-adjusted reversal",
    expr: `-1 * rank(ts_delta(close, 1)) * decay_linear(volume / adv20, 5)`,
    icMean: 0.031, icIr: 0.62, turnover: 64, halfLife: 4,
  },
  {
    id: "insider_z",
    label: "Insider buying z-score",
    expr: `zscore(group_neutralize(rank(net_insider_shares_21d), sector))`,
    icMean: 0.071, icIr: 1.12, turnover: 8, halfLife: 22,
  },
  {
    id: "vol_surprise",
    label: "Earnings surprise × vol-crush",
    expr: `winsorize(eps_surprise, 0.05) * -1 * zscore(iv_rank_30d)`,
    icMean: 0.059, icIr: 0.94, turnover: 11, halfLife: 9,
  },
];

/* ── Recent Experiments ─────────────────────────────────────────────────── */
export type Experiment = {
  id: string;
  name: string;
  alpha: string;
  universe: string;
  icMean: number;
  icIr: number;
  sharpeIS: number;
  sharpeOOS: number;
  oosDecay: number; // pct decay IS→OOS
  trials: number;
  dsr: number; // deflated sharpe ratio
  pbo: number; // probability of backtest overfitting
  status: "pass" | "warn" | "fail";
  runAt: string;
};

export const RECENT_EXPERIMENTS: Experiment[] = [
  { id: "exp-0041", name: "Momentum + Insider Fusion", alpha: "insider_z × momentum_rank", universe: "Russell 1000", icMean: 0.068, icIr: 1.14, sharpeIS: 2.41, sharpeOOS: 1.05, oosDecay: 56, trials: 64, dsr: 0.78, pbo: 0.42, status: "warn", runAt: "2026-06-07 14:22" },
  { id: "exp-0040", name: "Reversal Micro", alpha: "volume_decay", universe: "S&P 500", icMean: 0.031, icIr: 0.62, sharpeIS: 1.82, sharpeOOS: 0.41, oosDecay: 77, trials: 128, dsr: 0.31, pbo: 0.71, status: "fail", runAt: "2026-06-06 09:55" },
  { id: "exp-0039", name: "Earnings Vol Crush", alpha: "vol_surprise", universe: "S&P 500", icMean: 0.059, icIr: 0.94, sharpeIS: 1.61, sharpeOOS: 1.22, oosDecay: 24, trials: 12, dsr: 1.18, pbo: 0.21, status: "pass", runAt: "2026-06-05 16:08" },
  { id: "exp-0038", name: "NLP Novelty Momentum", alpha: "rank(ts_delta(novelty_z, 5))", universe: "Russell 2000", icMean: 0.043, icIr: 0.71, sharpeIS: 1.44, sharpeOOS: 0.88, oosDecay: 39, trials: 32, dsr: 0.91, pbo: 0.31, status: "pass", runAt: "2026-06-04 11:40" },
  { id: "exp-0037", name: "Congressional Proxy", alpha: "zscore(congress_buy_z)", universe: "S&P 500", icMean: 0.072, icIr: 1.28, sharpeIS: 1.98, sharpeOOS: 1.54, oosDecay: 22, trials: 8, dsr: 1.42, pbo: 0.15, status: "pass", runAt: "2026-06-03 08:30" },
];

/* ── Backtest Equity Curve ──────────────────────────────────────────────── */
export function backtestEquityCurve(): number[] {
  return priceWalk("kepler-bt-equity-001", 252, 1_000_000, 0.011, 0.0012);
}

export function backtestCandles(): Candle[] {
  return candleSeries("kepler-bt-candles-001", 120, 1_000_000, 0.009, 0.0009);
}

export function oosEquityCurve(): number[] {
  return priceWalk("kepler-bt-oos-001", 126, 1_000_000, 0.016, 0.0003);
}

/* ── Performance Statistics ──────────────────────────────────────────────── */
export const BACKTEST_STATS = {
  cagr: 18.4,
  sharpeIS: 2.41,
  sharpeOOS: 1.05,
  sortino: 3.12,
  calmar: 1.84,
  maxDD: -12.8,
  vol: 9.6,
  winPct: 58.2,
  profitFactor: 1.74,
  turnover: 18.3,
  beta: 0.28,
  alpha: 14.1,
  avgHoldDays: 12,
  numTrades: 1847,
  // overfitting diagnostics
  dsr: 0.78,
  pbo: 0.42,
  trials: 64,
  minTRL: 3.2,   // minimum track record length years
};

/* ── Trade Log ──────────────────────────────────────────────────────────── */
export type TradeLog = {
  date: string;
  sym: string;
  side: "LONG" | "SHORT";
  entry: number;
  exit: number;
  shares: number;
  pnl: number;
  slippage: number; // bps
  commission: number; // $
  impact: number; // bps
};

export function generateTradeLog(): TradeLog[] {
  const r = new Rng("kepler-trade-log-v1");
  const syms = ["NVDA", "LMT", "PLTR", "MSFT", "AAPL", "ANET", "TSLA", "AMZN", "JPM", "META"];
  const dates = ["2026-05-28", "2026-05-27", "2026-05-26", "2026-05-23", "2026-05-22", "2026-05-21", "2026-05-20", "2026-05-19", "2026-05-16", "2026-05-15"];
  return dates.map((date, i) => {
    const sym = syms[i % syms.length];
    const side: "LONG" | "SHORT" = r.bool(0.6) ? "LONG" : "SHORT";
    const entry = r.float(80, 500);
    const move = r.gauss(0.008, 0.025) * (side === "LONG" ? 1 : -1);
    const exit = entry * (1 + move);
    const shares = r.int(100, 2000);
    const pnl = (exit - entry) * shares * (side === "SHORT" ? -1 : 1);
    return {
      date, sym, side,
      entry: Math.round(entry * 100) / 100,
      exit: Math.round(exit * 100) / 100,
      shares,
      pnl: Math.round(pnl * 100) / 100,
      slippage: Math.round(r.float(0.8, 4.2) * 10) / 10,
      commission: Math.round(r.float(1.5, 8.5) * 100) / 100,
      impact: Math.round(r.float(0.3, 2.8) * 10) / 10,
    };
  });
}

/* ── Alpha Pool ─────────────────────────────────────────────────────────── */
export type AlphaRow = {
  id: string;
  expression: string;
  sharpeIS: number;
  sharpeOOS: number;
  fitness: number;
  turnover: number;
  maxDD: number;
  corrToPool: number;
  status: "active" | "shadow" | "retired";
};

export const ALPHA_POOL: AlphaRow[] = [
  { id: "A-037", expression: "zscore(group_neutralize(rank(net_insider_shares_21d), sector))", sharpeIS: 1.98, sharpeOOS: 1.54, fitness: 0.91, turnover: 8, maxDD: -7.2, corrToPool: 0.12, status: "active" },
  { id: "A-041", expression: "rank(ts_delta(close,21)) - 0.3*rank(ts_delta(close,5))", sharpeIS: 2.41, sharpeOOS: 1.05, fitness: 0.63, turnover: 18, maxDD: -12.1, corrToPool: 0.34, status: "shadow" },
  { id: "A-039", expression: "winsorize(eps_surprise,0.05) * -1*zscore(iv_rank_30d)", sharpeIS: 1.61, sharpeOOS: 1.22, fitness: 0.78, turnover: 11, maxDD: -9.4, corrToPool: 0.21, status: "active" },
  { id: "A-038", expression: "rank(ts_delta(novelty_z,5))", sharpeIS: 1.44, sharpeOOS: 0.88, fitness: 0.58, turnover: 22, maxDD: -14.8, corrToPool: 0.44, status: "shadow" },
  { id: "A-035", expression: "correlation(rank(close,10), rank(volume,10), 20)", sharpeIS: 1.29, sharpeOOS: 1.11, fitness: 0.72, turnover: 14, maxDD: -8.8, corrToPool: 0.18, status: "active" },
  { id: "A-031", expression: "-1*rank(ts_delta(close,1))*decay_linear(volume/adv20,5)", sharpeIS: 1.82, sharpeOOS: 0.41, fitness: 0.24, turnover: 64, maxDD: -22.4, corrToPool: 0.59, status: "retired" },
  { id: "A-028", expression: "group_neutralize(zscore(congress_buy_z), sector)", sharpeIS: 1.74, sharpeOOS: 1.38, fitness: 0.84, turnover: 6, maxDD: -6.1, corrToPool: 0.09, status: "active" },
];

/* ── Robustness Heat Grid ─────────────────────────────────────────────────── */
export type RobustnessCell = {
  label: string;
  sharpe: number;
  heat: number; // 0-1
};

export const ROBUSTNESS_GRID: { bucket: string; cells: RobustnessCell[] }[] = [
  {
    bucket: "By Market Cap",
    cells: [
      { label: "Mega (>$200B)", sharpe: 1.42, heat: 0.72 },
      { label: "Large ($10-200B)", sharpe: 1.54, heat: 0.78 },
      { label: "Mid ($2-10B)", sharpe: 1.21, heat: 0.61 },
      { label: "Small (<$2B)", sharpe: 0.88, heat: 0.44 },
    ],
  },
  {
    bucket: "By Liquidity",
    cells: [
      { label: "High (ADV>$100M)", sharpe: 1.62, heat: 0.82 },
      { label: "Med (ADV $10-100M)", sharpe: 1.31, heat: 0.66 },
      { label: "Low (ADV<$10M)", sharpe: 0.71, heat: 0.36 },
      { label: "Illiquid", sharpe: 0.38, heat: 0.19 },
    ],
  },
  {
    bucket: "By Time Period",
    cells: [
      { label: "2019-2020", sharpe: 1.88, heat: 0.94 },
      { label: "2021-2022", sharpe: 1.44, heat: 0.72 },
      { label: "2023-2024", sharpe: 1.11, heat: 0.56 },
      { label: "2025-2026", sharpe: 1.54, heat: 0.77 },
    ],
  },
  {
    bucket: "By Sector",
    cells: [
      { label: "Technology", sharpe: 1.71, heat: 0.86 },
      { label: "Industrials", sharpe: 1.28, heat: 0.64 },
      { label: "Consumer", sharpe: 1.09, heat: 0.55 },
      { label: "Healthcare", sharpe: 0.94, heat: 0.47 },
    ],
  },
];

/* ── DSL Operator Reference ──────────────────────────────────────────────── */
export type Operator = {
  name: string;
  sig: string;
  desc: string;
  category: string;
};

export const DSL_OPERATORS: Operator[] = [
  { name: "rank", sig: "rank(x, d?)", desc: "Cross-sectional rank (0,1], optional lookback d", category: "cross-section" },
  { name: "zscore", sig: "zscore(x, d?)", desc: "Cross-sectional z-score; d-period rolling window", category: "cross-section" },
  { name: "group_neutralize", sig: "group_neutralize(x, grp)", desc: "Demean within group (sector, industry)", category: "cross-section" },
  { name: "winsorize", sig: "winsorize(x, pct)", desc: "Clip to [pct, 1-pct] quantile per day", category: "cross-section" },
  { name: "ts_mean", sig: "ts_mean(x, d)", desc: "Rolling mean over d trading days", category: "time-series" },
  { name: "ts_delta", sig: "ts_delta(x, d)", desc: "x[t] − x[t-d] (raw change)", category: "time-series" },
  { name: "ts_std", sig: "ts_std(x, d)", desc: "Rolling standard deviation", category: "time-series" },
  { name: "ts_rank", sig: "ts_rank(x, d)", desc: "Rank of today's value in past d-day window", category: "time-series" },
  { name: "decay_linear", sig: "decay_linear(x, d)", desc: "Linearly-decayed weighted mean; most-recent weight 2/(d+1)", category: "time-series" },
  { name: "correlation", sig: "correlation(x, y, d)", desc: "Rolling Pearson correlation over d days", category: "time-series" },
];

/* ── Strategies Library ──────────────────────────────────────────────────── */
export type StrategyStatus = "live" | "paper" | "backtest" | "research" | "paused";

export type Strategy = {
  id: string;
  name: string;
  type: string;
  status: StrategyStatus;
  cagr: number;
  sharpe: number;
  maxDD: number;
  capacityM: number; // $M
  lastRun: string;
  universe: string;
  gateStatus: { research: boolean; backtest: boolean; paper: boolean; live: boolean };
  liveVsBt: number; // % divergence (negative = underperforming)
  pbo: number;
  killSwitch: boolean;
};

export const STRATEGIES: Strategy[] = [
  {
    id: "STR-001", name: "Cross-Sectional Factor", type: "Equity CS Factor",
    status: "live", cagr: 18.4, sharpe: 1.54, maxDD: -8.2, capacityM: 250,
    lastRun: "2026-06-08 09:30", universe: "Russell 1000",
    gateStatus: { research: true, backtest: true, paper: true, live: true },
    liveVsBt: -3.8, pbo: 0.22, killSwitch: false,
  },
  {
    id: "STR-002", name: "TS Momentum / Trend", type: "Time-Series Momentum",
    status: "paper", cagr: 14.8, sharpe: 1.28, maxDD: -11.4, capacityM: 500,
    lastRun: "2026-06-08 09:00", universe: "Multi-asset (20 futures)",
    gateStatus: { research: true, backtest: true, paper: true, live: false },
    liveVsBt: -1.2, pbo: 0.18, killSwitch: false,
  },
  {
    id: "STR-003", name: "Mean Reversion / Pairs", type: "Statistical Arbitrage",
    status: "paper", cagr: 11.2, sharpe: 1.82, maxDD: -5.6, capacityM: 80,
    lastRun: "2026-06-07 20:00", universe: "S&P 500 pairs",
    gateStatus: { research: true, backtest: true, paper: true, live: false },
    liveVsBt: -8.1, pbo: 0.31, killSwitch: false,
  },
  {
    id: "STR-004", name: "ARGUS Event-Driven", type: "Event / Catalyst",
    status: "backtest", cagr: 22.1, sharpe: 2.08, maxDD: -14.2, capacityM: 60,
    lastRun: "2026-06-06 22:14", universe: "S&P 1500",
    gateStatus: { research: true, backtest: true, paper: false, live: false },
    liveVsBt: 0, pbo: 0.34, killSwitch: false,
  },
  {
    id: "STR-005", name: "Options Vol Surface", type: "Options / Volatility",
    status: "research", cagr: 31.4, sharpe: 2.64, maxDD: -18.8, capacityM: 30,
    lastRun: "2026-06-05 15:00", universe: "S&P 500 options",
    gateStatus: { research: true, backtest: false, paper: false, live: false },
    liveVsBt: 0, pbo: 0.51, killSwitch: false,
  },
  {
    id: "STR-006", name: "Risk Parity Portfolio", type: "Risk Parity / Allocation",
    status: "live", cagr: 9.8, sharpe: 1.14, maxDD: -6.4, capacityM: 1000,
    lastRun: "2026-06-08 09:30", universe: "Equities + Bonds + Commod",
    gateStatus: { research: true, backtest: true, paper: true, live: true },
    liveVsBt: -0.9, pbo: 0.11, killSwitch: false,
  },
];

/* ── Live vs Backtest Divergence ─────────────────────────────────────────── */
export function liveEquitySeries(seed: string): number[] {
  return priceWalk(seed + "-live", 63, 100, 0.013, 0.0006);
}

export function btEquitySeries(seed: string): number[] {
  return priceWalk(seed + "-bt", 63, 100, 0.010, 0.0010);
}
