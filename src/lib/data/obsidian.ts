/**
 * OBSIDIAN module demo data — Bloomberg-class terminal.
 * All series are deterministically seeded. Never call Math.random() at render.
 */
import { Rng, priceWalk, candleSeries } from "@/lib/rng";
import type { Candle } from "@/lib/rng";

/* ── Market Overview ──────────────────────────────────────────────────────── */

export type IndexQuote = {
  sym: string;
  name: string;
  last: number;
  chg: number;
  chgPct: number;
  ytd: number;
  spark: number[];
};

export const MARKET_INDICES: IndexQuote[] = [
  { sym: "SPY", name: "S&P 500", last: 548.21, chg: 3.42, chgPct: 0.63, ytd: 14.2, spark: priceWalk("SPY-idx", 40, 548.21, 0.009, 0.0003) },
  { sym: "QQQ", name: "Nasdaq 100", last: 472.64, chg: 4.18, chgPct: 0.89, ytd: 18.7, spark: priceWalk("QQQ-idx", 40, 472.64, 0.011, 0.0004) },
  { sym: "IWM", name: "Russell 2000", last: 208.35, chg: -1.24, chgPct: -0.59, ytd: 3.8, spark: priceWalk("IWM-idx", 40, 208.35, 0.013, -0.0002) },
  { sym: "DIA", name: "Dow Jones", last: 389.42, chg: 1.87, chgPct: 0.48, ytd: 8.4, spark: priceWalk("DIA-idx", 40, 389.42, 0.008, 0.0002) },
  { sym: "VIX", name: "CBOE VIX", last: 14.82, chg: -0.63, chgPct: -4.08, ytd: -18.3, spark: priceWalk("VIX-idx", 40, 14.82, 0.06, -0.001) },
  { sym: "DAX", name: "DAX 40", last: 18741.2, chg: 124.3, chgPct: 0.67, ytd: 11.2, spark: priceWalk("DAX-idx", 40, 18741.2, 0.009, 0.0003) },
  { sym: "N225", name: "Nikkei 225", last: 38924.6, chg: -312.8, chgPct: -0.80, ytd: 16.4, spark: priceWalk("N225-idx", 40, 38924.6, 0.01, -0.0003) },
  { sym: "HSI", name: "Hang Seng", last: 17842.3, chg: 189.4, chgPct: 1.07, ytd: -4.2, spark: priceWalk("HSI-idx", 40, 17842.3, 0.014, 0.0004) },
];

export const SPY_CANDLES: Candle[] = candleSeries("SPY-candles-90", 90, 510, 0.009, 0.0004);

export type SectorPerf = {
  name: string;
  sym: string;
  chgPct: number;
  mtd: number;
  ytd: number;
  intensity: number; // 0..1 for heat color
};

export const SECTORS: SectorPerf[] = [
  { name: "Technology", sym: "XLK", chgPct: 1.24, mtd: 4.8, ytd: 22.1, intensity: 0.82 },
  { name: "Communication", sym: "XLC", chgPct: 0.87, mtd: 3.2, ytd: 18.4, intensity: 0.72 },
  { name: "Consumer Discr", sym: "XLY", chgPct: 0.41, mtd: 1.6, ytd: 11.2, intensity: 0.62 },
  { name: "Industrials", sym: "XLI", chgPct: 0.22, mtd: 0.9, ytd: 9.3, intensity: 0.57 },
  { name: "Healthcare", sym: "XLV", chgPct: -0.18, mtd: -0.4, ytd: 4.8, intensity: 0.46 },
  { name: "Financials", sym: "XLF", chgPct: -0.31, mtd: -1.2, ytd: 6.7, intensity: 0.43 },
  { name: "Consumer Stapl", sym: "XLP", chgPct: -0.52, mtd: -1.8, ytd: 2.1, intensity: 0.38 },
  { name: "Energy", sym: "XLE", chgPct: -0.74, mtd: -2.4, ytd: 1.4, intensity: 0.32 },
  { name: "Materials", sym: "XLB", chgPct: -0.98, mtd: -3.1, ytd: -1.8, intensity: 0.25 },
  { name: "Utilities", sym: "XLU", chgPct: -1.21, mtd: -4.2, ytd: -3.4, intensity: 0.18 },
  { name: "Real Estate", sym: "XLRE", chgPct: -1.48, mtd: -5.1, ytd: -7.2, intensity: 0.12 },
];

export type MoverRow = { sym: string; name: string; last: number; chgPct: number; vol: string; mktcap: string };

export const TOP_GAINERS: MoverRow[] = [
  { sym: "SMCI", name: "Super Micro Computer", last: 847.32, chgPct: 9.42, vol: "8.2M", mktcap: "$49.8B" },
  { sym: "MSTR", name: "MicroStrategy", last: 1482.6, chgPct: 7.81, vol: "4.1M", mktcap: "$28.3B" },
  { sym: "PLTR", name: "Palantir Technologies", last: 31.42, chgPct: 6.24, vol: "62.4M", mktcap: "$68.1B" },
  { sym: "IONQ", name: "IonQ", last: 14.87, chgPct: 5.93, vol: "11.8M", mktcap: "$3.2B" },
  { sym: "NVDA", name: "NVIDIA Corp", last: 128.47, chgPct: 4.72, vol: "241.6M", mktcap: "$3.15T" },
  { sym: "ARM", name: "Arm Holdings", last: 148.23, chgPct: 4.18, vol: "19.3M", mktcap: "$155.4B" },
  { sym: "ANET", name: "Arista Networks", last: 318.94, chgPct: 3.87, vol: "3.6M", mktcap: "$100.8B" },
];

export const TOP_LOSERS: MoverRow[] = [
  { sym: "MRVL", name: "Marvell Technology", last: 62.18, chgPct: -8.23, vol: "22.1M", mktcap: "$54.2B" },
  { sym: "SNAP", name: "Snap Inc", last: 11.34, chgPct: -7.42, vol: "38.9M", mktcap: "$18.9B" },
  { sym: "RIVN", name: "Rivian Automotive", last: 11.82, chgPct: -6.87, vol: "29.4M", mktcap: "$12.8B" },
  { sym: "LUMN", name: "Lumen Technologies", last: 1.48, chgPct: -5.61, vol: "44.2M", mktcap: "$1.6B" },
  { sym: "PFE", name: "Pfizer", last: 26.41, chgPct: -4.83, vol: "31.8M", mktcap: "$149.3B" },
  { sym: "PARA", name: "Paramount Global", last: 10.72, chgPct: -4.21, vol: "17.2M", mktcap: "$7.1B" },
  { sym: "WBA", name: "Walgreens Boots", last: 14.32, chgPct: -3.94, vol: "14.7M", mktcap: "$12.4B" },
];

export type FxRow = { pair: string; rate: number; chgPct: number };
export const FX_RATES: FxRow[] = [
  { pair: "EUR/USD", rate: 1.0842, chgPct: 0.18 },
  { pair: "GBP/USD", rate: 1.2714, chgPct: 0.24 },
  { pair: "USD/JPY", rate: 156.48, chgPct: -0.31 },
  { pair: "USD/CNY", rate: 7.2413, chgPct: 0.07 },
  { pair: "USD/CHF", rate: 0.8924, chgPct: -0.12 },
  { pair: "AUD/USD", rate: 0.6614, chgPct: 0.41 },
];

export type RateRow = { tenor: string; yield: number; chgBps: number };
export const RATES_TABLE: RateRow[] = [
  { tenor: "2Y UST", yield: 4.842, chgBps: -3.2 },
  { tenor: "5Y UST", yield: 4.521, chgBps: -4.8 },
  { tenor: "10Y UST", yield: 4.384, chgBps: -6.1 },
  { tenor: "30Y UST", yield: 4.518, chgBps: -2.4 },
  { tenor: "Fed Funds", yield: 5.375, chgBps: 0.0 },
  { tenor: "SOFR", yield: 5.314, chgBps: -0.8 },
];

export type CryptoRow = { sym: string; name: string; last: number; chgPct: number; vol24h: string };
export const CRYPTO_TABLE: CryptoRow[] = [
  { sym: "BTC", name: "Bitcoin", last: 67241.0, chgPct: 2.14, vol24h: "$31.4B" },
  { sym: "ETH", name: "Ethereum", last: 3528.4, chgPct: 1.87, vol24h: "$18.2B" },
  { sym: "SOL", name: "Solana", last: 168.42, chgPct: 3.41, vol24h: "$4.8B" },
  { sym: "BNB", name: "BNB", last: 612.38, chgPct: 0.92, vol24h: "$2.1B" },
];

/* ── Security DES (NVDA) ──────────────────────────────────────────────────── */

export const NVDA_CANDLES: Candle[] = candleSeries("NVDA-candles-180", 180, 82, 0.028, 0.0018);

export type AnalystEstimate = {
  period: string;
  revEst: number;
  revAct: number | null;
  epsEst: number;
  epsAct: number | null;
  beat: boolean | null;
};

export const ANALYST_ESTIMATES: AnalystEstimate[] = [
  { period: "Q1 FY24", revEst: 24.1, revAct: 26.04, epsEst: 5.56, epsAct: 6.12, beat: true },
  { period: "Q2 FY24", revEst: 28.2, revAct: 30.04, epsEst: 6.40, epsAct: 0.68, beat: true },
  { period: "Q3 FY24", revEst: 32.9, revAct: 35.08, epsEst: 0.73, epsAct: 0.81, beat: true },
  { period: "Q4 FY24", revEst: 38.1, revAct: 39.33, epsEst: 0.84, epsAct: 0.89, beat: true },
  { period: "Q1 FY25E", revEst: 43.2, revAct: null, epsEst: 0.94, epsAct: null, beat: null },
  { period: "Q2 FY25E", revEst: 47.8, revAct: null, epsEst: 1.04, epsAct: null, beat: null },
];

export type NewsItem = {
  headline: string;
  source: string;
  sentiment: number; // -1..1
  time: string;
  category: string;
};

export const NVDA_NEWS: NewsItem[] = [
  { headline: "NVIDIA announces Blackwell Ultra GPU architecture, targets $2T AI inference market", source: "Reuters", sentiment: 0.84, time: "2h ago", category: "Product" },
  { headline: "Jensen Huang: 'Every dollar of NVIDIA investment returns $5 in savings'", source: "Bloomberg", sentiment: 0.76, time: "4h ago", category: "Strategy" },
  { headline: "TSMC capacity expansion supports NVIDIA H200 supply ramp through 2025", source: "Nikkei", sentiment: 0.68, time: "6h ago", category: "Supply" },
  { headline: "EU regulators open preliminary inquiry into NVIDIA's market position in AI chips", source: "FT", sentiment: -0.42, time: "8h ago", category: "Regulatory" },
  { headline: "Chinese AI labs exploring NVIDIA alternatives amid export control tightening", source: "WSJ", sentiment: -0.38, time: "12h ago", category: "Geopolitical" },
  { headline: "NVDA insider buying cluster: 3 executives acquired shares in past 30 days", source: "SEC EDGAR", sentiment: 0.52, time: "1d ago", category: "Insider" },
];

export const NVDA_PEERS = [
  { sym: "AMD", name: "Advanced Micro", pe: 48.2, evEbitda: 42.1, fwdPe: 38.4 },
  { sym: "INTC", name: "Intel Corp", pe: 32.1, evEbitda: 18.2, fwdPe: 22.8 },
  { sym: "AVGO", name: "Broadcom", pe: 28.4, evEbitda: 22.4, fwdPe: 24.1 },
  { sym: "QCOM", name: "Qualcomm", pe: 18.2, evEbitda: 12.8, fwdPe: 16.4 },
  { sym: "TSM", name: "TSMC", pe: 24.8, evEbitda: 16.4, fwdPe: 22.1 },
];

/* ── Fundamentals (NVDA, 5-year XBRL framing) ─────────────────────────────── */

export type FinRow = { label: string; vals: (number | null)[]; isTotal?: boolean; isSub?: boolean; fmt?: "usd" | "pct" | "ratio" };

export const INCOME_YEARS = ["FY2020", "FY2021", "FY2022", "FY2023", "FY2024"];

export const INCOME_STATEMENT: FinRow[] = [
  { label: "Revenue", vals: [10918, 16675, 26914, 44870, 130497], isTotal: true, fmt: "usd" },
  { label: "  Product revenue", vals: [9465, 14987, 23811, 39334, 116889], isSub: true, fmt: "usd" },
  { label: "  Service revenue", vals: [1453, 1688, 3103, 5536, 13608], isSub: true, fmt: "usd" },
  { label: "Gross Profit", vals: [6803, 11063, 17475, 29609, 96697], isTotal: true, fmt: "usd" },
  { label: "Gross Margin %", vals: [62.3, 66.3, 64.9, 66.0, 74.1], fmt: "pct" },
  { label: "R&D Expense", vals: [2829, 3924, 5266, 7401, 8675], fmt: "usd" },
  { label: "SG&A Expense", vals: [855, 1174, 1568, 2440, 2569], fmt: "usd" },
  { label: "Operating Income", vals: [2846, 4532, 10041, 32972, 87614], isTotal: true, fmt: "usd" },
  { label: "Operating Margin %", vals: [26.1, 27.2, 37.3, 73.5, 67.1], fmt: "pct" },
  { label: "EBITDA", vals: [3439, 5232, 11382, 34901, 90561], fmt: "usd" },
  { label: "Net Income", vals: [4332, 4332, 9752, 29760, 72880], isTotal: true, fmt: "usd" },
  { label: "EPS (Diluted)", vals: [1.73, 1.71, 3.85, 11.93, 29.76], fmt: "ratio" },
];

export const BALANCE_SHEET: FinRow[] = [
  { label: "Cash & Equivalents", vals: [11561, 19290, 10690, 13296, 31440], fmt: "usd" },
  { label: "Short-Term Invest.", vals: [2000, 9075, 7100, 9924, 25414], fmt: "usd" },
  { label: "Accounts Receivable", vals: [1739, 2429, 4650, 9999, 15490], fmt: "usd" },
  { label: "Inventories", vals: [979, 2111, 5252, 5282, 4180], fmt: "usd" },
  { label: "Total Current Assets", vals: [17651, 33894, 28083, 36510, 78088], isTotal: true, fmt: "usd" },
  { label: "PP&E, net", vals: [1674, 2778, 3807, 4006, 4085], fmt: "usd" },
  { label: "Total Assets", vals: [28791, 44187, 41976, 65728, 111601], isTotal: true, fmt: "usd" },
  { label: "Total Debt", vals: [5964, 6991, 11687, 9703, 8457], fmt: "usd" },
  { label: "Total Liabilities", vals: [7043, 11898, 17752, 21633, 27869], fmt: "usd" },
  { label: "Stockholders Equity", vals: [20748, 32292, 24225, 42978, 83732], isTotal: true, fmt: "usd" },
];

export const CASH_FLOW: FinRow[] = [
  { label: "Net Income", vals: [4332, 4332, 9752, 29760, 72880], fmt: "usd" },
  { label: "D&A", vals: [593, 700, 1341, 1929, 2947], fmt: "usd" },
  { label: "Stock-Based Comp", vals: [1158, 1399, 2004, 3549, 4976], fmt: "usd" },
  { label: "Change in Working Cap", vals: [-381, -2124, -3958, -2131, -2982], fmt: "usd" },
  { label: "Operating Cash Flow", vals: [5822, 9108, 9108, 28608, 64089], isTotal: true, fmt: "usd" },
  { label: "CapEx", vals: [-489, -976, -1833, -2200, -2688], fmt: "usd" },
  { label: "Free Cash Flow", vals: [5333, 8132, 7275, 26408, 61401], isTotal: true, fmt: "usd" },
  { label: "Share Repurchases", vals: [-247, -4200, -7740, -9519, -28684], fmt: "usd" },
  { label: "Dividends Paid", vals: [-154, -166, -268, -395, -590], fmt: "usd" },
];

export const RATIO_GRID = [
  { label: "P/E (TTM)", value: "43.2x", note: "vs sector 38.1x" },
  { label: "EV/EBITDA", value: "38.8x", note: "vs sector 28.4x" },
  { label: "P/S (TTM)", value: "24.1x", note: "vs sector 12.8x" },
  { label: "P/FCF", value: "52.1x", note: "FCF yield 1.92%" },
  { label: "ROE", value: "87.1%", note: "↑ 34pp YoY" },
  { label: "ROIC", value: "68.4%", note: "WACC est. 9.2%" },
  { label: "Rev Growth", value: "+190%", note: "vs semis +21%" },
  { label: "Gross Margin", value: "74.1%", note: "↑ 810bps YoY" },
];

export const PEER_COMPS = [
  { sym: "NVDA", name: "NVIDIA Corp", mktcap: 3150, ev: 3108, revFwd: 192.4, pe: 43.2, evEbitda: 38.8, ps: 24.1, roe: 87.1 },
  { sym: "AMD", name: "Advanced Micro", mktcap: 248, ev: 261, revFwd: 32.8, pe: 48.2, evEbitda: 42.1, ps: 7.6, roe: 12.4 },
  { sym: "AVGO", name: "Broadcom Inc", mktcap: 734, ev: 802, revFwd: 58.2, pe: 28.4, evEbitda: 22.4, ps: 12.6, roe: 44.2 },
  { sym: "INTC", name: "Intel Corp", mktcap: 136, ev: 168, revFwd: 58.4, pe: 32.1, evEbitda: 18.2, ps: 2.3, roe: 8.1 },
  { sym: "QCOM", name: "Qualcomm", mktcap: 202, ev: 218, revFwd: 44.1, pe: 18.2, evEbitda: 12.8, ps: 4.6, roe: 38.4 },
  { sym: "TSM", name: "TSMC ADR", mktcap: 618, ev: 642, revFwd: 92.8, pe: 24.8, evEbitda: 16.4, ps: 6.7, roe: 28.1 },
];

/* ── Filings ──────────────────────────────────────────────────────────────── */

export type FilingRow = {
  form: string;
  company: string;
  sym: string;
  filed: string;
  period: string;
  size: string;
  pages: number;
};

export const FILINGS: FilingRow[] = [
  { form: "10-K", company: "NVIDIA Corporation", sym: "NVDA", filed: "2024-02-21", period: "FY2024", size: "3.2 MB", pages: 128 },
  { form: "10-Q", company: "NVIDIA Corporation", sym: "NVDA", filed: "2024-05-29", period: "Q1 FY2025", size: "1.8 MB", pages: 84 },
  { form: "8-K", company: "NVIDIA Corporation", sym: "NVDA", filed: "2024-06-03", period: "—", size: "0.2 MB", pages: 6 },
  { form: "DEF 14A", company: "NVIDIA Corporation", sym: "NVDA", filed: "2024-04-01", period: "2024 Proxy", size: "4.1 MB", pages: 94 },
  { form: "10-K", company: "Advanced Micro Devices", sym: "AMD", filed: "2024-02-07", period: "FY2023", size: "2.9 MB", pages: 118 },
  { form: "10-Q", company: "Advanced Micro Devices", sym: "AMD", filed: "2024-05-01", period: "Q1 2024", size: "1.6 MB", pages: 76 },
  { form: "S-1", company: "Cerebras Systems", sym: "CBRS", filed: "2024-09-30", period: "IPO", size: "8.4 MB", pages: 312 },
  { form: "10-K", company: "Meta Platforms", sym: "META", filed: "2024-02-01", period: "FY2023", size: "2.8 MB", pages: 111 },
  { form: "8-K", company: "Apple Inc", sym: "AAPL", filed: "2024-05-02", period: "—", size: "0.3 MB", pages: 8 },
  { form: "Form 4", company: "Microsoft Corp", sym: "MSFT", filed: "2024-05-31", period: "—", size: "0.1 MB", pages: 2 },
  { form: "10-Q", company: "Microsoft Corp", sym: "MSFT", filed: "2024-04-25", period: "Q3 FY2024", size: "1.9 MB", pages: 88 },
  { form: "10-K", company: "Alphabet Inc", sym: "GOOGL", filed: "2024-01-31", period: "FY2023", size: "3.1 MB", pages: 122 },
];

export type HoldingRow = {
  institution: string;
  shares: number; // thousands
  value: number; // $M
  pctFloat: number;
  chgQoQ: number; // thousands
  qtr: string;
};

export const HOLDINGS_13F: HoldingRow[] = [
  { institution: "Vanguard Group", shares: 924182, value: 108840, pctFloat: 3.74, chgQoQ: 12480, qtr: "Q1 2024" },
  { institution: "BlackRock Inc", shares: 818247, value: 96340, pctFloat: 3.31, chgQoQ: -8240, qtr: "Q1 2024" },
  { institution: "State Street Corp", shares: 412814, value: 48610, pctFloat: 1.67, chgQoQ: 4120, qtr: "Q1 2024" },
  { institution: "Fidelity Investments", shares: 318290, value: 37480, pctFloat: 1.29, chgQoQ: 24810, qtr: "Q1 2024" },
  { institution: "Capital Research", shares: 284182, value: 33460, pctFloat: 1.15, chgQoQ: -18240, qtr: "Q1 2024" },
  { institution: "Geode Capital Mgmt", shares: 198724, value: 23400, pctFloat: 0.80, chgQoQ: 3840, qtr: "Q1 2024" },
  { institution: "T. Rowe Price", shares: 182481, value: 21490, pctFloat: 0.74, chgQoQ: 11240, qtr: "Q1 2024" },
  { institution: "Wellington Mgmt", shares: 148290, value: 17460, pctFloat: 0.60, chgQoQ: -4820, qtr: "Q1 2024" },
  { institution: "Norges Bank Inv. Mgmt", shares: 121482, value: 14300, pctFloat: 0.49, chgQoQ: 8210, qtr: "Q1 2024" },
  { institution: "Invesco Ltd", shares: 98241, value: 11570, pctFloat: 0.40, chgQoQ: 1840, qtr: "Q1 2024" },
];

export type InsiderTx = {
  insider: string;
  title: string;
  sym: string;
  txType: "Buy" | "Sell" | "Option Exercise";
  shares: number;
  price: number;
  value: number;
  date: string;
};

export const INSIDER_TRANSACTIONS: InsiderTx[] = [
  { insider: "Jensen Huang", title: "CEO", sym: "NVDA", txType: "Sell", shares: 240000, price: 118.42, value: 28420800, date: "2024-06-01" },
  { insider: "Colette Kress", title: "EVP & CFO", sym: "NVDA", txType: "Sell", shares: 40000, price: 112.84, value: 4513600, date: "2024-05-28" },
  { insider: "Lisa Su", title: "CEO", sym: "AMD", txType: "Sell", shares: 20000, price: 148.21, value: 2964200, date: "2024-05-25" },
  { insider: "Mark Zuckerberg", title: "CEO", sym: "META", txType: "Sell", shares: 150000, price: 482.14, value: 72321000, date: "2024-05-22" },
  { insider: "Satya Nadella", title: "CEO", sym: "MSFT", txType: "Buy", shares: 2000, price: 414.82, value: 829640, date: "2024-05-20" },
  { insider: "Tim Cook", title: "CEO", sym: "AAPL", txType: "Option Exercise", shares: 75000, price: 189.24, value: 14193000, date: "2024-05-15" },
  { insider: "George Kurtz", title: "CEO", sym: "CRWD", txType: "Buy", shares: 5000, price: 312.84, value: 1564200, date: "2024-05-12" },
  { insider: "Alex Karp", title: "CEO", sym: "PLTR", txType: "Sell", shares: 500000, price: 24.18, value: 12090000, date: "2024-05-10" },
];

/* ── Screener ─────────────────────────────────────────────────────────────── */

export type ScreenerRow = {
  sym: string;
  name: string;
  sector: string;
  mktcap: number;
  pe: number;
  fwdPe: number;
  revGrowth: number;
  epsGrowth: number;
  fcfYield: number;
  beta: number;
  rsi: number;
  momentum: number;
  short: number;
  divYield: number;
};

function mkScreenerRow(sym: string, name: string, sector: string, seed: string): ScreenerRow {
  const r = new Rng(seed + "-scr");
  return {
    sym,
    name,
    sector,
    mktcap: Math.round(r.float(8, 2800) * 10) / 10,
    pe: Math.round(r.float(9, 72) * 10) / 10,
    fwdPe: Math.round(r.float(8, 55) * 10) / 10,
    revGrowth: Math.round(r.gauss(14, 22) * 10) / 10,
    epsGrowth: Math.round(r.gauss(18, 28) * 10) / 10,
    fcfYield: Math.round(r.gauss(3.2, 2.8) * 10) / 10,
    beta: Math.round(r.float(0.4, 2.1) * 100) / 100,
    rsi: Math.round(r.float(24, 82)),
    momentum: Math.round(r.gauss(8, 18) * 10) / 10,
    short: Math.round(r.float(0.4, 18) * 10) / 10,
    divYield: Math.round(r.float(0, 4.8) * 100) / 100,
  };
}

export const SCREENER_ROWS: ScreenerRow[] = [
  mkScreenerRow("NVDA", "NVIDIA Corp", "Semiconductors", "NVDA"),
  mkScreenerRow("AMD", "Advanced Micro Devices", "Semiconductors", "AMD"),
  mkScreenerRow("AVGO", "Broadcom Inc", "Semiconductors", "AVGO"),
  mkScreenerRow("ASML", "ASML Holding", "Semiconductors", "ASML"),
  mkScreenerRow("PLTR", "Palantir Tech", "Software", "PLTR"),
  mkScreenerRow("MSFT", "Microsoft Corp", "Software", "MSFT"),
  mkScreenerRow("CRM", "Salesforce", "Software", "CRM"),
  mkScreenerRow("NOW", "ServiceNow", "Software", "NOW"),
  mkScreenerRow("SNOW", "Snowflake", "Software", "SNOW"),
  mkScreenerRow("DDOG", "Datadog", "Software", "DDOG"),
  mkScreenerRow("LMT", "Lockheed Martin", "Defense", "LMT"),
  mkScreenerRow("RTX", "RTX Corp", "Defense", "RTX"),
  mkScreenerRow("NOC", "Northrop Grumman", "Defense", "NOC"),
  mkScreenerRow("ELF", "e.l.f. Beauty", "Consumer", "ELF"),
  mkScreenerRow("LULU", "Lululemon", "Consumer", "LULU"),
  mkScreenerRow("NKE", "Nike Inc", "Consumer", "NKE"),
  mkScreenerRow("XOM", "Exxon Mobil", "Energy", "XOM"),
  mkScreenerRow("CVX", "Chevron Corp", "Energy", "CVX"),
  mkScreenerRow("JPM", "JPMorgan Chase", "Financials", "JPM"),
  mkScreenerRow("GS", "Goldman Sachs", "Financials", "GS"),
  mkScreenerRow("UNH", "UnitedHealth", "Healthcare", "UNH"),
  mkScreenerRow("LLY", "Eli Lilly", "Healthcare", "LLY"),
  mkScreenerRow("ISRG", "Intuitive Surgical", "Healthcare", "ISRG"),
  mkScreenerRow("CAT", "Caterpillar", "Industrials", "CAT"),
  mkScreenerRow("ANET", "Arista Networks", "Networking", "ANET"),
  mkScreenerRow("TSLA", "Tesla Inc", "Auto", "TSLA"),
  mkScreenerRow("RIVN", "Rivian Automotive", "Auto", "RIVN"),
  mkScreenerRow("META", "Meta Platforms", "Software", "META"),
  mkScreenerRow("GOOGL", "Alphabet Inc", "Software", "GOOGL"),
  mkScreenerRow("AAPL", "Apple Inc", "Technology", "AAPL"),
];

export const SAVED_SCREENS = [
  { name: "AI Infrastructure Compounders", count: 12, lastRun: "2h ago", desc: "Rev growth >40%, operating leverage expanding, AI capex beneficiaries" },
  { name: "Quality FCF Yield", count: 24, lastRun: "1d ago", desc: "FCF yield >4%, ROIC >20%, net debt/EBITDA <1x" },
  { name: "Momentum + Low Short", count: 18, lastRun: "4h ago", desc: "RSI 55-75, 6M momentum >15%, short interest <3% float" },
  { name: "Defense Budget Tailwind", count: 8, lastRun: "6h ago", desc: "Government revenue >40%, backlog growth, congressional support" },
  { name: "Beaten-Down Value Reopeners", count: 31, lastRun: "3d ago", desc: "P/S <2x, net-cash balance sheet, analyst upgrades in 30d" },
];

/* ── News & Sentiment ─────────────────────────────────────────────────────── */

export type NewsStreamItem = {
  id: number;
  headline: string;
  source: string;
  entities: string[];
  sentiment: number; // -1..1
  novelty: number; // 0..1
  eventClass: string;
  time: string;
  category: string;
};

export const NEWS_STREAM: NewsStreamItem[] = [
  { id: 1, headline: "Federal Reserve signals higher-for-longer rate stance as inflation cools slowly", source: "Bloomberg", entities: ["FED", "SPY", "TLT"], sentiment: -0.48, novelty: 0.62, eventClass: "Macro Policy", time: "12m ago", category: "Central Bank" },
  { id: 2, headline: "NVIDIA Blackwell production ramp ahead of schedule — TSMC sources", source: "Nikkei Asia", entities: ["NVDA", "TSM"], sentiment: 0.81, novelty: 0.74, eventClass: "Supply Chain", time: "34m ago", category: "Semiconductors" },
  { id: 3, headline: "Microsoft Azure AI revenue exceeds $5B quarterly run-rate for first time", source: "Reuters", entities: ["MSFT"], sentiment: 0.72, novelty: 0.58, eventClass: "Earnings Beat", time: "1h ago", category: "Cloud" },
  { id: 4, headline: "Palantir wins $480M DoD contract extension for battlefield AI platform", source: "DefenseNews", entities: ["PLTR", "LMT"], sentiment: 0.88, novelty: 0.83, eventClass: "Contract Award", time: "1h ago", category: "Defense" },
  { id: 5, headline: "China export controls tightened: NVIDIA H20 shipments suspended pending review", source: "WSJ", entities: ["NVDA", "AMD"], sentiment: -0.71, novelty: 0.91, eventClass: "Regulatory Risk", time: "2h ago", category: "Geopolitical" },
  { id: 6, headline: "Eli Lilly GLP-1 manufacturing capacity doubles; supply constraints easing", source: "FT", entities: ["LLY", "NVO"], sentiment: 0.64, novelty: 0.44, eventClass: "Operations", time: "2h ago", category: "Healthcare" },
  { id: 7, headline: "Credit Suisse initiates PLTR at Outperform, $38 PT on government AI adoption", source: "CS Research", entities: ["PLTR"], sentiment: 0.56, novelty: 0.31, eventClass: "Analyst Action", time: "3h ago", category: "Rating Change" },
  { id: 8, headline: "Tesla Q2 deliveries miss consensus by 8%; margin pressure from price cuts persists", source: "Reuters", entities: ["TSLA"], sentiment: -0.68, novelty: 0.52, eventClass: "Earnings Miss", time: "3h ago", category: "Auto" },
  { id: 9, headline: "ELF Beauty app store ranking declines 7 consecutive sessions — web signal alert", source: "PANTHEON Signal", entities: ["ELF"], sentiment: -0.44, novelty: 0.67, eventClass: "Web Signal", time: "4h ago", category: "Consumer" },
  { id: 10, headline: "Arista Networks reports Q1 beat; AI networking demand drives 20% backlog growth", source: "Seeking Alpha", entities: ["ANET"], sentiment: 0.76, novelty: 0.38, eventClass: "Earnings Beat", time: "4h ago", category: "Networking" },
  { id: 11, headline: "Congress: House Armed Services Committee members buy $2.4M defense equities", source: "Quiver Quant", entities: ["LMT", "RTX", "NOC", "GD"], sentiment: 0.41, novelty: 0.72, eventClass: "Disclosure", time: "5h ago", category: "Congress" },
  { id: 12, headline: "Bitcoin ETF net inflows reach $1.2B single-day record; institutional adoption cited", source: "CoinDesk", entities: ["BTC", "IBIT"], sentiment: 0.84, novelty: 0.48, eventClass: "Flow", time: "5h ago", category: "Crypto" },
  { id: 13, headline: "Amazon AWS launches Trainium 3 chip, direct challenge to NVIDIA data-center dominance", source: "Bloomberg", entities: ["AMZN", "NVDA"], sentiment: -0.32, novelty: 0.61, eventClass: "Competitive", time: "6h ago", category: "Cloud" },
  { id: 14, headline: "CPI report: Core PCE +2.8% YoY, slightly above 2.6% estimate — rate cut timeline pushes out", source: "BLS", entities: ["SPY", "TLT", "GLD"], sentiment: -0.54, novelty: 0.44, eventClass: "Macro Data", time: "7h ago", category: "Inflation" },
  { id: 15, headline: "Goldman Sachs upgrades energy sector to Overweight; oil demand revision upward", source: "GS Research", entities: ["XLE", "XOM", "CVX"], sentiment: 0.52, novelty: 0.29, eventClass: "Analyst Action", time: "8h ago", category: "Energy" },
];

export type SentimentLeader = { sym: string; name: string; score: number; articles: number; trend: number[] };

export const SENTIMENT_BULLS: SentimentLeader[] = [
  { sym: "PLTR", name: "Palantir Tech", score: 0.84, articles: 48, trend: priceWalk("PLTR-sent", 14, 0.6, 0.08, 0.01) },
  { sym: "NVDA", name: "NVIDIA Corp", score: 0.78, articles: 312, trend: priceWalk("NVDA-sent", 14, 0.72, 0.06, 0.004) },
  { sym: "ANET", name: "Arista Networks", score: 0.72, articles: 24, trend: priceWalk("ANET-sent", 14, 0.58, 0.06, 0.008) },
  { sym: "LMT", name: "Lockheed Martin", score: 0.68, articles: 31, trend: priceWalk("LMT-sent", 14, 0.52, 0.05, 0.008) },
  { sym: "LLY", name: "Eli Lilly", score: 0.64, articles: 87, trend: priceWalk("LLY-sent", 14, 0.58, 0.05, 0.004) },
];

export const SENTIMENT_BEARS: SentimentLeader[] = [
  { sym: "TSLA", name: "Tesla Inc", score: -0.72, articles: 124, trend: priceWalk("TSLA-sent", 14, 0.42, 0.07, -0.012) },
  { sym: "SNAP", name: "Snap Inc", score: -0.68, articles: 38, trend: priceWalk("SNAP-sent", 14, 0.40, 0.08, -0.01) },
  { sym: "ELF", name: "e.l.f. Beauty", score: -0.58, articles: 19, trend: priceWalk("ELF-sent", 14, 0.44, 0.06, -0.008) },
  { sym: "CVNA", name: "Carvana Co", score: -0.54, articles: 22, trend: priceWalk("CVNA-sent", 14, 0.38, 0.07, -0.01) },
  { sym: "WBA", name: "Walgreens", score: -0.52, articles: 16, trend: priceWalk("WBA-sent", 14, 0.35, 0.05, -0.008) },
];

/* ── Economics / FRED ─────────────────────────────────────────────────────── */

export type MacroKpi = {
  label: string;
  value: string;
  sub: string;
  chgLabel: string;
  chg: number;
  tone: "pos" | "neg" | "warn" | "accent";
  icon: string;
};

export const MACRO_KPIS: MacroKpi[] = [
  { label: "FED FUNDS", value: "5.375%", sub: "Upper bound target", chgLabel: "unch", chg: 0, tone: "warn", icon: "gauge" },
  { label: "CPI YOY", value: "3.4%", sub: "Apr 2024 · BLS", chgLabel: "−10bps", chg: -0.1, tone: "warn", icon: "activity" },
  { label: "CORE PCE", value: "2.8%", sub: "Mar 2024 · BEA", chgLabel: "−5bps", chg: -0.05, tone: "warn", icon: "wave" },
  { label: "GDP QOQ SAAR", value: "+1.6%", sub: "Q1 2024 Advance Est", chgLabel: "−170bps", chg: -1.7, tone: "neg", icon: "bars" },
  { label: "UNEMPLOYMENT", value: "3.9%", sub: "Apr 2024 · BLS", chgLabel: "+10bps", chg: 0.1, tone: "accent", icon: "pulse" },
  { label: "ISM MFG PMI", value: "49.2", sub: "May 2024 · ISM", chgLabel: "−0.5pt", chg: -0.5, tone: "neg", icon: "grid" },
  { label: "10Y UST YIELD", value: "4.384%", sub: "As of close", chgLabel: "−6.1bps", chg: -0.061, tone: "accent", icon: "wave" },
  { label: "2Y-10Y SPREAD", value: "−45.8bps", sub: "Inverted", chgLabel: "+2.8bps", chg: 2.8, tone: "warn", icon: "route" },
];

export type YieldPoint = { tenor: string; maturity: number; yield: number }; // maturity in months

export const YIELD_CURVE: YieldPoint[] = [
  { tenor: "1M", maturity: 1, yield: 5.524 },
  { tenor: "3M", maturity: 3, yield: 5.482 },
  { tenor: "6M", maturity: 6, yield: 5.362 },
  { tenor: "1Y", maturity: 12, yield: 5.148 },
  { tenor: "2Y", maturity: 24, yield: 4.842 },
  { tenor: "3Y", maturity: 36, yield: 4.674 },
  { tenor: "5Y", maturity: 60, yield: 4.521 },
  { tenor: "7Y", maturity: 84, yield: 4.468 },
  { tenor: "10Y", maturity: 120, yield: 4.384 },
  { tenor: "20Y", maturity: 240, yield: 4.612 },
  { tenor: "30Y", maturity: 360, yield: 4.518 },
];

// Historical yield curve for 1yr ago comparison
export const YIELD_CURVE_1YR_AGO: YieldPoint[] = [
  { tenor: "1M", maturity: 1, yield: 5.28 },
  { tenor: "3M", maturity: 3, yield: 5.22 },
  { tenor: "6M", maturity: 6, yield: 5.14 },
  { tenor: "1Y", maturity: 12, yield: 4.92 },
  { tenor: "2Y", maturity: 24, yield: 4.48 },
  { tenor: "3Y", maturity: 36, yield: 4.21 },
  { tenor: "5Y", maturity: 60, yield: 4.08 },
  { tenor: "7Y", maturity: 84, yield: 3.98 },
  { tenor: "10Y", maturity: 120, yield: 3.91 },
  { tenor: "20Y", maturity: 240, yield: 4.14 },
  { tenor: "30Y", maturity: 360, yield: 3.98 },
];

export type EconRelease = {
  date: string;
  time: string;
  event: string;
  actual: string | null;
  forecast: string;
  prior: string;
  importance: "High" | "Medium" | "Low";
};

export const ECON_CALENDAR: EconRelease[] = [
  { date: "Jun 12", time: "08:30", event: "CPI MoM (May)", actual: null, forecast: "+0.3%", prior: "+0.3%", importance: "High" },
  { date: "Jun 12", time: "08:30", event: "CPI YoY (May)", actual: null, forecast: "3.4%", prior: "3.4%", importance: "High" },
  { date: "Jun 12", time: "14:00", event: "FOMC Rate Decision", actual: null, forecast: "5.375%", prior: "5.375%", importance: "High" },
  { date: "Jun 12", time: "14:30", event: "Fed Chair Press Conference", actual: null, forecast: "—", prior: "—", importance: "High" },
  { date: "Jun 13", time: "08:30", event: "PPI MoM (May)", actual: null, forecast: "+0.2%", prior: "+0.5%", importance: "Medium" },
  { date: "Jun 14", time: "08:30", event: "Retail Sales MoM (May)", actual: null, forecast: "+0.3%", prior: "0.0%", importance: "High" },
  { date: "Jun 14", time: "09:15", event: "Industrial Production MoM", actual: null, forecast: "+0.1%", prior: "+0.4%", importance: "Medium" },
  { date: "Jun 20", time: "08:30", event: "Jobless Claims (wk)", actual: null, forecast: "220K", prior: "218K", importance: "Medium" },
  { date: "Jun 20", time: "10:00", event: "Existing Home Sales (May)", actual: null, forecast: "4.10M", prior: "4.14M", importance: "Medium" },
  { date: "Jun 25", time: "08:30", event: "Durable Goods Orders MoM", actual: null, forecast: "+0.5%", prior: "+0.7%", importance: "Medium" },
  { date: "Jun 28", time: "08:30", event: "PCE Price Index YoY (May)", actual: null, forecast: "2.8%", prior: "2.7%", importance: "High" },
  { date: "Jul 5", time: "08:30", event: "Nonfarm Payrolls (Jun)", actual: null, forecast: "185K", prior: "175K", importance: "High" },
  { date: "Jul 5", time: "08:30", event: "Unemployment Rate (Jun)", actual: null, forecast: "3.9%", prior: "3.9%", importance: "High" },
];

export const RECESSION_INDICATORS = [
  { name: "Sahm Rule Indicator", value: "0.18", threshold: "0.50", status: "Normal", note: "0.32 below trigger" },
  { name: "Yield Curve (2s10s)", value: "−45.8bps", threshold: "0bps", status: "Inverted", note: "Inverted 22+ months" },
  { name: "LEI MoM", value: "−0.3%", threshold: "0%", status: "Caution", note: "6-mo avg: −0.4%" },
  { name: "Credit Spreads (IG)", value: "+89bps", threshold: "+150bps", status: "Normal", note: "Near multi-yr tight" },
  { name: "ISM New Orders", value: "49.1", threshold: "50.0", status: "Contraction", note: "Below 50 for 3mo" },
];
