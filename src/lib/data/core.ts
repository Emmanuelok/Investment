/**
 * Extra data for Command + Infrastructure pages.
 * Deterministic via Rng — no Math.random() at module scope.
 */
import { Rng, priceWalk } from "@/lib/rng";

/* ── Data Lake ─────────────────────────────────────────────────────────────── */

export type Dataset = {
  name: string;
  format: string;
  rows: string;
  partitions: string;
  pitSemantic: string;
  sizeGb: number;
  updated: string;
};

export const DATASETS: Dataset[] = [
  { name: "equity_ohlcv", format: "Parquet / DuckDB", rows: "2.1B", partitions: "sym / date", pitSemantic: "as_of=close_date", sizeGb: 4.2, updated: "2026-06-08" },
  { name: "edgar_filings_xbrl", format: "Parquet", rows: "84M", partitions: "cik / period", pitSemantic: "as_of=filed_at", sizeGb: 1.8, updated: "2026-06-08" },
  { name: "order_flow_l2l3", format: "Parquet (zstd)", rows: "48B", partitions: "exchange / date / sym", pitSemantic: "as_of=event_ts", sizeGb: 14.7, updated: "2026-06-08" },
  { name: "nlp_events_classified", format: "Parquet", rows: "312M", partitions: "source / date", pitSemantic: "as_of=published_at", sizeGb: 3.1, updated: "2026-06-08" },
  { name: "factor_exposures_daily", format: "Parquet", rows: "8.4M", partitions: "date / universe", pitSemantic: "as_of=calc_date", sizeGb: 0.9, updated: "2026-06-08" },
  { name: "macro_fred_curves", format: "Parquet", rows: "6.2M", partitions: "series / date", pitSemantic: "as_of=vintage_date", sizeGb: 0.4, updated: "2026-06-08" },
  { name: "disclosures_form4_congress", format: "Parquet", rows: "1.4M", partitions: "form / date", pitSemantic: "as_of=filed_at", sizeGb: 0.2, updated: "2026-06-08" },
  { name: "backtest_snapshots", format: "Parquet", rows: "22M", partitions: "strategy / run_id", pitSemantic: "as_of=snapshot_ts", sizeGb: 1.8, updated: "2026-06-07" },
  { name: "crypto_full_book", format: "Parquet (zstd)", rows: "96B", partitions: "exchange / sym / date", pitSemantic: "as_of=event_ts", sizeGb: 11.3, updated: "2026-06-08" },
];

export const SNAPSHOTS = [
  { id: "pit-2026-06-08-T18:00Z", ts: "2026-06-08 18:00:00 UTC", hash: "a3f9d2e1b7c048f2", obs: "312,884", sizeMb: "84,231" },
  { id: "pit-2026-06-07-T18:00Z", ts: "2026-06-07 18:00:00 UTC", hash: "7bc42a9e3d1f80c5", obs: "311,201", sizeMb: "82,740" },
  { id: "pit-2026-06-06-T18:00Z", ts: "2026-06-06 18:00:00 UTC", hash: "e1d8b3a0c5f29471", obs: "309,884", sizeMb: "81,980" },
  { id: "pit-2026-06-05-T18:00Z", ts: "2026-06-05 18:00:00 UTC", hash: "f2e0c7d4b9a31856", obs: "310,044", sizeMb: "80,120" },
  { id: "pit-2026-06-04-T18:00Z", ts: "2026-06-04 18:00:00 UTC", hash: "c4b2a1e8d6f93750", obs: "308,917", sizeMb: "79,400" },
];

// Deterministic storage growth (30 days)
export const STORAGE_GROWTH: number[] = (() => {
  const r = new Rng("storage-growth-2026");
  const out: number[] = [];
  let tb = 33.6;
  for (let i = 0; i < 30; i++) {
    tb += r.float(0.06, 0.11);
    out.push(Math.round(tb * 100) / 100);
  }
  return out;
})();

/* ── Audit Trail ───────────────────────────────────────────────────────────── */

export type AuditEntry = {
  seq: number;
  ts: string;
  actor: string;
  action: string;
  object: string;
  module: "orders" | "compliance" | "risk" | "data";
  hash: string;
  prevHash: string;
};

export const AUDIT_LOG: AuditEntry[] = [
  { seq: 48221, ts: "2026-06-08 17:58:42 UTC", actor: "HELIOS/order-router", action: "ORDER_ROUTED", object: "ORD-4821 · LMT 200sh @MKT · IBKR", module: "orders", hash: "9f3c2a1e", prevHash: "7bc42a9e" },
  { seq: 48220, ts: "2026-06-08 17:58:40 UTC", actor: "AEGIS/compliance", action: "PRE_TRADE_APPROVED", object: "ORD-4821 · limits OK · tech-conc 28.4%<30%", module: "compliance", hash: "7bc42a9e", prevHash: "a3f9d2e1" },
  { seq: 48219, ts: "2026-06-08 17:57:11 UTC", actor: "AEGIS/risk-engine", action: "RISK_RUN_COMPLETED", object: "pit-2026-06-08-T17:57Z · VaR $2.41M (+18.2%)", module: "risk", hash: "a3f9d2e1", prevHash: "e1d8b3a0" },
  { seq: 48218, ts: "2026-06-08 17:55:04 UTC", actor: "AEGIS/compliance", action: "SOFT_BREACH_LOGGED", object: "FUND-II tech-conc 31.4% > 30% mandate", module: "compliance", hash: "e1d8b3a0", prevHash: "c4b2a1e8" },
  { seq: 48217, ts: "2026-06-08 17:54:22 UTC", actor: "PIT-LAKE/archiver", action: "SNAPSHOT_ARCHIVED", object: "pit-2026-06-08-T17:54Z · 84 GB · hash a3f9d2e1", module: "data", hash: "c4b2a1e8", prevHash: "f2e0c7d4" },
  { seq: 48216, ts: "2026-06-08 17:48:03 UTC", actor: "ARGUS/mnpi-filter", action: "MNPI_QUARANTINE", object: "Event-7714 · NVDA supply-chain memo · policy hold", module: "compliance", hash: "f2e0c7d4", prevHash: "b9a31856" },
  { seq: 48215, ts: "2026-06-08 17:45:18 UTC", actor: "HELIOS/order-router", action: "ORDER_FILLED", object: "ORD-4820 · PLTR 1500sh · avg $28.72 · slippage +0.4bps", module: "orders", hash: "b9a31856", prevHash: "d6f93750" },
  { seq: 48214, ts: "2026-06-08 17:41:07 UTC", actor: "KEPLER/backtester", action: "BACKTEST_RUN", object: "strat-ts-momentum-64 · IS Sharpe 2.41 · PBO 0.42", module: "risk", hash: "d6f93750", prevHash: "a1e8d6f9" },
  { seq: 48213, ts: "2026-06-08 17:38:55 UTC", actor: "ARGUS/ingest", action: "EVENTS_INGESTED", object: "312,884 events · EDGAR 8-K LMT $1.2B contract", module: "data", hash: "a1e8d6f9", prevHash: "3750c4b2" },
  { seq: 48212, ts: "2026-06-08 17:32:44 UTC", actor: "AEGIS/risk-engine", action: "STRESS_TEST_RUN", object: "pit-2026-06-08 · scenario GFC-2008 · drawdown -28.4%", module: "risk", hash: "3750c4b2", prevHash: "9471e1d8" },
  { seq: 48211, ts: "2026-06-08 17:28:10 UTC", actor: "HELIOS/order-router", action: "ORDER_ROUTED", object: "ORD-4819 · NVDA 500sh @LMT 121.20 · IBKR", module: "orders", hash: "9471e1d8", prevHash: "f93750c4" },
  { seq: 48210, ts: "2026-06-08 17:22:01 UTC", actor: "AEGIS/compliance", action: "COMPLIANCE_REPORT_GENERATED", object: "Daily EOD · 1 soft breach · 2 MNPI holds", module: "compliance", hash: "f93750c4", prevHash: "b2a1e8d6" },
];

/* ── License Manager ───────────────────────────────────────────────────────── */

export type FeedLicense = {
  name: string;
  kind: string;
  mode: "display" | "non-display" | "redistribution" | "internal";
  seats: number | null;
  monthlyCost: number;
  status: "active" | "paper" | "not-provisioned" | "optional";
  notes: string;
};

export const FEED_LICENSES: FeedLicense[] = [
  { name: "SEC EDGAR", kind: "Filings / XBRL", mode: "non-display", seats: null, monthlyCost: 0, status: "active", notes: "Public domain — no license required" },
  { name: "FRED (St. Louis Fed)", kind: "Macro / Curves", mode: "non-display", seats: null, monthlyCost: 0, status: "active", notes: "Public domain — no license required" },
  { name: "yfinance / Yahoo", kind: "Quotes / OHLCV", mode: "display", seats: null, monthlyCost: 0, status: "active", notes: "Personal / research use — no redistribution" },
  { name: "Finnhub", kind: "News / Estimates", mode: "non-display", seats: null, monthlyCost: 0, status: "active", notes: "Free tier — 60 API calls/min; no model input" },
  { name: "GDELT + RSS", kind: "Global news", mode: "non-display", seats: null, monthlyCost: 0, status: "active", notes: "Open license — free for research & analysis" },
  { name: "Binance WS", kind: "Crypto L2/L3", mode: "non-display", seats: null, monthlyCost: 0, status: "active", notes: "Public websocket — non-display permitted" },
  { name: "Quiver Quant", kind: "Disclosures", mode: "non-display", seats: 1, monthlyCost: 75, status: "active", notes: "API Trader plan — internal use licensed" },
  { name: "Thinknum", kind: "Web signals", mode: "non-display", seats: 1, monthlyCost: 1400, status: "active", notes: "Non-display / internal — 1 seat" },
  { name: "Alpaca Markets", kind: "Execution", mode: "display", seats: null, monthlyCost: 0, status: "paper", notes: "Paper account — live requires verified entity" },
  { name: "YipitData", kind: "Consumer panel", mode: "non-display", seats: null, monthlyCost: 0, status: "not-provisioned", notes: "High-value upgrade — $2–5K/mo when licensed" },
  { name: "Databento (MBO)", kind: "Equities L3", mode: "non-display", seats: null, monthlyCost: 0, status: "optional", notes: "Upgrade path — $600–1,200/mo estimated" },
  { name: "Polygon.io", kind: "Stocks / Options", mode: "non-display", seats: null, monthlyCost: 0, status: "optional", notes: "Upgrade path — $79–799/mo depending on tier" },
  { name: "IBKR TWS", kind: "Execution / FIX", mode: "non-display", seats: null, monthlyCost: 0, status: "optional", notes: "Gateway license — requires live brokerage account" },
];

export const MNPI_QUARANTINE = [
  { id: "Event-7714", ts: "2026-06-08 17:48 UTC", source: "Internal memo", desc: "NVDA supply-chain restructuring memo — potential material non-public detail", reason: "Source classification: internal · policy hold until public" },
  { id: "Event-7698", ts: "2026-06-08 14:22 UTC", source: "Meeting notes", desc: "LMT contract discussion referencing unannounced award value", reason: "Marked private by compliance officer · awaiting EDGAR 8-K" },
];
