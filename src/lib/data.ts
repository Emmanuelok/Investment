/**
 * PANTHEON demo data fabric.
 *
 * Deterministic, point-in-time-flavoured datasets that drive the UI without a
 * backend. Every series is seeded so server and client render identically and
 * the demo is reproducible — the same discipline the real platform applies to
 * risk and backtest numerics. Clearly surfaced as DEMO DATA in the shell.
 */
import { Rng, priceWalk } from "@/lib/rng";

/* ── Overview KPIs (mirrors the ARGUS command deck) ───────────────────────── */
export const OVERVIEW_KPIS = [
  { label: "LIVE SIGNALS", value: "47", sub: "8 families · 6 beta", icon: "bolt" },
  { label: "EVENTS / 24H", value: "312,884", sub: "LLM-classified, cited", icon: "radio" },
  { label: "SOURCES HEALTHY", value: "14 / 15", sub: "1 blocked by policy", icon: "plug", tone: "pos" as const },
  { label: "MNPI QUARANTINED", value: "2", sub: "held before research", icon: "shield", tone: "warn" as const },
  { label: "PIT ARCHIVE", value: "38.4 TB", sub: "append-only · +84 GB today", icon: "database" },
  { label: "DATA SPEND / MO", value: "$4,200", sub: "1 of 4 datasets licensed", icon: "lock" },
];

/* ── Top cross-signal candidates ──────────────────────────────────────────── */
export type Candidate = {
  sym: string;
  name: string;
  thesis: string;
  z: number;
  ic: number;
  decay: number;
  crowding: "LOW" | "MED" | "HIGH";
  spark: number[];
};

export const CANDIDATES: Candidate[] = [
  { sym: "LMT", name: "Lockheed Martin", thesis: "Insider buying + contract-award momentum + Congressional accumulation", z: 2.41, ic: 0.071, decay: 14, crowding: "LOW", spark: priceWalk("LMT", 30, 100, 0.012, 0.004) },
  { sym: "NVDA", name: "NVIDIA Corp", thesis: "Hiring acceleration + patent velocity + bullish event intensity", z: 1.97, ic: 0.063, decay: 9, crowding: "HIGH", spark: priceWalk("NVDA", 30, 100, 0.02, 0.006) },
  { sym: "PLTR", name: "Palantir Technologies", thesis: "Gov-contract awards + rising relevance-weighted sentiment", z: 1.55, ic: 0.048, decay: 11, crowding: "MED", spark: priceWalk("PLTR", 30, 100, 0.018, 0.003) },
  { sym: "ELF", name: "e.l.f. Beauty", thesis: "App-ranking + search-interest demand proxies decelerating", z: -1.82, ic: 0.052, decay: 8, crowding: "MED", spark: priceWalk("ELF-x", 30, 100, 0.02, -0.004) },
  { sym: "CVNA", name: "Carvana Co", thesis: "Net insider selling + web-traffic rollover + elevated novelty", z: -2.13, ic: 0.058, decay: 7, crowding: "LOW", spark: priceWalk("CVNA-x", 30, 100, 0.026, -0.006) },
  { sym: "ANET", name: "Arista Networks", thesis: "Datacenter capex pull-through + supplier shipping uptick", z: 1.42, ic: 0.044, decay: 12, crowding: "MED", spark: priceWalk("ANET", 30, 100, 0.017, 0.003) },
  { sym: "TGT", name: "Target Corp", thesis: "Card-panel spend rollover + foot-traffic deceleration", z: -1.36, ic: 0.039, decay: 9, crowding: "MED", spark: priceWalk("TGT-x", 30, 100, 0.014, -0.003) },
];

export const ANOMALIES = [
  {
    tone: "pos" as const,
    head: "Abnormal Congressional buying",
    body: "in defense names — 3 disclosures clustered in 5 sessions (LMT, RTX-class, NOC-class).",
    cta: "view disclosures",
    href: "/signals/disclosures",
  },
  {
    tone: "warn" as const,
    head: "Novelty spike",
    body: "on NVDA supply-chain thread (0.83) — incremental vs. trailing 30d corpus, not already-priced.",
    cta: "open event",
    href: "/signals",
  },
  {
    tone: "neg" as const,
    head: "Insider selling + traffic rollover",
    body: "on CVNA aligning bearish across 2 independent families.",
    cta: "inspect",
    href: "/terminal/security",
  },
];

export const FAMILY_COVERAGE = [
  { label: "Disclosure", pct: 98, color: "var(--pos)" },
  { label: "NLP / Event", pct: 99, color: "var(--pos)" },
  { label: "Web Signals", pct: 73, color: "var(--warn)" },
  { label: "Consumer Proxy", pct: 88, color: "var(--accent)" },
  { label: "Panel (licensed)", pct: 0, color: "var(--dim)" },
];

/* ── Market watchlist / tape ──────────────────────────────────────────────── */
export type Quote = { sym: string; name: string; last: number; chg: number; cls: string; spark: number[] };

const UNIVERSE: [string, string, string, number][] = [
  ["SPY", "S&P 500 ETF", "Index", 548.2],
  ["QQQ", "Nasdaq 100 ETF", "Index", 472.6],
  ["NVDA", "NVIDIA Corp", "Semis", 121.4],
  ["AAPL", "Apple Inc", "Tech", 214.3],
  ["MSFT", "Microsoft Corp", "Tech", 449.8],
  ["LMT", "Lockheed Martin", "Defense", 463.1],
  ["PLTR", "Palantir Tech", "Software", 28.7],
  ["TSLA", "Tesla Inc", "Auto", 248.5],
  ["AMZN", "Amazon.com", "Retail", 186.2],
  ["META", "Meta Platforms", "Tech", 503.9],
  ["CVNA", "Carvana Co", "Auto", 132.8],
  ["ELF", "e.l.f. Beauty", "Consumer", 188.4],
  ["ANET", "Arista Networks", "Networking", 312.7],
  ["BTC", "Bitcoin", "Crypto", 67241.0],
  ["ETH", "Ethereum", "Crypto", 3528.4],
  ["GLD", "Gold Trust", "Commod", 214.9],
  ["TLT", "20Y Treasury", "Rates", 94.3],
  ["XLE", "Energy Sector", "Energy", 91.2],
];

export function watchlist(): Quote[] {
  return UNIVERSE.map(([sym, name, sector, base], i) => {
    const r = new Rng(sym + "wl");
    const chg = r.gauss(0.1, 1.5);
    const spark = priceWalk(sym + "wl", 32, base, 0.01, chg / 100 / 32);
    return { sym, name, last: base, chg, cls: sector, spark };
  });
}

/* ── Security universe for screener / terminal / risk ─────────────────────── */
export type Security = {
  sym: string;
  name: string;
  sector: string;
  mktcap: number; // $bn
  pe: number;
  revGrowth: number; // %
  fcfYield: number; // %
  beta: number;
  rsi: number;
  momentum: number; // %
  short: number; // % float
};

const SECTORS = ["Semiconductors", "Software", "Defense", "Consumer", "Energy", "Financials", "Healthcare", "Industrials", "Auto", "Networking"];

export function securities(n = 48): Security[] {
  const r = new Rng("universe");
  const names = [
    "NVDA","AMD","AVGO","ASML","TSM","MU","ARM","PLTR","MSFT","CRM","NOW","SNOW","DDOG","NET","LMT","RTX","NOC","GD","LHX","ELF",
    "LULU","NKE","SBUX","CMG","TGT","XOM","CVX","SLB","OXY","FANG","JPM","GS","MS","BAC","V","UNH","LLY","ISRG","VRTX","REGN",
    "CAT","DE","HON","GE","ETN","TSLA","GM","F","RIVN","ANET",
  ];
  return names.slice(0, n).map((sym, i) => {
    const rr = new Rng(sym + "sec");
    return {
      sym,
      name: sym,
      sector: SECTORS[i % SECTORS.length],
      mktcap: Math.round(rr.float(8, 3200) * 10) / 10,
      pe: Math.round(rr.float(9, 64) * 10) / 10,
      revGrowth: Math.round(rr.gauss(14, 18) * 10) / 10,
      fcfYield: Math.round(rr.gauss(3.2, 2.6) * 10) / 10,
      beta: Math.round(rr.float(0.5, 1.9) * 100) / 100,
      rsi: Math.round(rr.float(28, 78)),
      momentum: Math.round(rr.gauss(6, 16) * 10) / 10,
      short: Math.round(rr.float(0.6, 14) * 10) / 10,
    };
  });
}

/* ── Data sources & licensing (Sources / License Manager) ─────────────────── */
export type Source = {
  name: string;
  kind: string;
  tier: "free" | "freemium" | "paid";
  status: "healthy" | "degraded" | "blocked";
  latency: number; // ms
  cost: number; // $/mo
  license: string;
  caps: string[];
};

export const SOURCES: Source[] = [
  { name: "SEC EDGAR", kind: "Filings / XBRL", tier: "free", status: "healthy", latency: 180, cost: 0, license: "Public", caps: ["FUNDAMENTALS", "FILINGS", "INSIDER"] },
  { name: "FRED", kind: "Macro / Curves", tier: "free", status: "healthy", latency: 120, cost: 0, license: "Public", caps: ["ECON", "YIELD_CURVE"] },
  { name: "yfinance", kind: "Quotes / OHLCV", tier: "free", status: "healthy", latency: 240, cost: 0, license: "Best-effort", caps: ["QUOTES", "OHLCV", "OPTIONS"] },
  { name: "Finnhub", kind: "News / Estimates", tier: "free", status: "healthy", latency: 210, cost: 0, license: "Free tier", caps: ["NEWS", "ESTIMATES", "WS_TRADES"] },
  { name: "Alpha Vantage", kind: "Quotes / TA", tier: "free", status: "degraded", latency: 640, cost: 0, license: "Free tier", caps: ["QUOTES", "TA", "FX"] },
  { name: "GDELT + RSS", kind: "Global news", tier: "free", status: "healthy", latency: 300, cost: 0, license: "Open", caps: ["NEWS", "SENTIMENT"] },
  { name: "Binance WS", kind: "Crypto L2/L3", tier: "free", status: "healthy", latency: 38, cost: 0, license: "Public WS", caps: ["DEPTH", "TRADES", "FULL_BOOK"] },
  { name: "Coinbase WS", kind: "Crypto L2", tier: "free", status: "healthy", latency: 44, cost: 0, license: "Public WS", caps: ["DEPTH", "TRADES"] },
  { name: "Quiver Quant", kind: "Disclosures", tier: "freemium", status: "healthy", latency: 420, cost: 75, license: "API Trader", caps: ["CONGRESS", "LOBBYING", "INSIDER"] },
  { name: "Thinknum", kind: "Web signals", tier: "paid", status: "healthy", latency: 510, cost: 1400, license: "1 seat", caps: ["JOBS", "WEB_TRAFFIC", "APP_RANK"] },
  { name: "YipitData", kind: "Consumer panel", tier: "paid", status: "blocked", latency: 0, cost: 0, license: "Not provisioned", caps: ["CARD_PANEL", "TRANSACTIONS"] },
  { name: "Databento", kind: "Equities MBO", tier: "paid", status: "blocked", latency: 0, cost: 0, license: "Optional upgrade", caps: ["L3", "MBO", "TICK"] },
  { name: "Polygon.io", kind: "Stocks/Options", tier: "paid", status: "blocked", latency: 0, cost: 0, license: "Optional upgrade", caps: ["QUOTES", "OPTIONS", "WS"] },
  { name: "Alpaca", kind: "Execution", tier: "freemium", status: "healthy", latency: 95, cost: 0, license: "Paper", caps: ["ORDERS", "FILLS"] },
  { name: "IBKR", kind: "Execution", tier: "paid", status: "degraded", latency: 130, cost: 0, license: "Gateway off", caps: ["ORDERS", "FILLS", "FIX"] },
];

/* ── Pain points → solutions (from market research) ───────────────────────── */
export const PAIN_POINTS = [
  { pain: "Bloomberg costs ~$31,980 / seat / year.", fix: "Comparable capability, self-hosted, at a fraction of the cost — with more sources and a modern UI.", stat: "$31,980", statLabel: "Bloomberg / seat / yr" },
  { pain: "You use ~5% of your terminal. You pay for 100%.", fix: "Modular workspaces — run only the data and tools you actually use.", stat: "~5%", statLabel: "of features used" },
  { pain: "Your risk model is a black box.", fix: "Glass-box factor risk: inspect every factor, weight, covariance estimate, and reproduce it in a notebook.", stat: "100%", statLabel: "figures traceable" },
  { pain: "Look-ahead bias silently inflates backtests.", fix: "Point-in-time snapshots enforced by default — a backtest sees only what existed on that date.", stat: "as_of ≤ t", statLabel: "PIT guarantee" },
  { pain: "Your Sharpe is probably overstated.", fix: "Deflated Sharpe & Probability of Backtest Overfitting computed on every strategy, surfaced loudly.", stat: "−63%", statLabel: "avg IS→OOS Sharpe decay" },
  { pain: "Research is spread across 8 vendor portals.", fix: "One book: equities, rates, FX, crypto, alternatives + alt-data — unified and queryable in one script.", stat: "1 book", statLabel: "all assets" },
  { pain: "Your AI invents citations.", fix: "ATHENA grounds every claim in source-linked filings, transcripts and numbers — or says it doesn't know.", stat: "0", statLabel: "fabricated figures" },
  { pain: "Aladdin runs $500K–$10M+ / year.", fix: "Open risk, compliance, OMS/EMS and attribution — sovereign and self-hostable.", stat: "$500K+", statLabel: "Aladdin / yr" },
  { pain: "AlphaSense research is $10–40K / seat.", fix: "RAG over EDGAR + transcripts + news, cited, in the same workspace as your data.", stat: "$10–40K", statLabel: "AlphaSense / seat" },
  { pain: "Crypto order flow is synthetic or delayed.", fix: "Real, full-depth L2/L3 crypto order flow over free exchange websockets — never faked.", stat: "L3", statLabel: "free crypto depth" },
  { pain: "Your data can't leave the vendor's cloud.", fix: "Self-host the entire stack in your own VPC — positions and prompts never leave.", stat: "VPC", statLabel: "data sovereignty" },
  { pain: "A 2-day course just to find a function.", fix: "Command-bar + natural language. Type, or just ask ATHENA.", stat: "⌘K", statLabel: "everything reachable" },
];

export const COMPETITOR_COSTS = [
  { name: "Bloomberg Terminal", cost: 31980, unit: "/seat/yr" },
  { name: "S&P Capital IQ", cost: 21000, unit: "/seat/yr" },
  { name: "FactSet", cost: 18000, unit: "/seat/yr" },
  { name: "LSEG Workspace", cost: 18000, unit: "/seat/yr" },
  { name: "AlphaSense", cost: 18375, unit: "/seat/yr" },
  { name: "RavenPack", cost: 30000, unit: "/yr" },
  { name: "Thinknum", cost: 16800, unit: "/user/yr" },
  { name: "BlackRock Aladdin", cost: 500000, unit: "/yr (1–4bps AUM)" },
];

/* ── Live event ticker strip ──────────────────────────────────────────────── */
export const EVENT_STRIP = [
  "EDGAR 8-K · LMT · contract award $1.2B",
  "FORM 4 · CVNA · CEO sold 120,000 sh",
  "CONGRESS · NVDA · committee member buy",
  "NLP · novelty 0.83 · NVDA supply chain",
  "FRED · CPI YoY 3.1% · in line",
  "WEB · ELF app-rank ↓ 7 days",
  "CRYPTO · BTC sweep 4,200 contracts ask",
  "EARNINGS · ANET beat +6% rev",
  "MNPI · 2 items quarantined · policy hold",
  "PIT LAKE · +84 GB archived today",
];
