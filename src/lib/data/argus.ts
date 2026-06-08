/**
 * ARGUS — Alt-Data & Signals
 * Extra data for the 4 ARGUS signal pages.
 * All series are deterministic (seeded Rng / priceWalk). No Math.random().
 */
import { priceWalk } from "@/lib/rng";

/* ── Extended signal universe (supplements CANDIDATES from data.ts) ─────── */
export type Signal = {
  sym: string;
  name: string;
  thesis: string; // glass-box composite
  z: number;
  ic: number; // 60D info coefficient
  decay: number; // half-life days
  crowding: "LOW" | "MED" | "HIGH";
  novelty: number; // 0–1, incremental vs trailing corpus
  families: Array<"Disclosure" | "NLP" | "Web" | "Consumer">;
  spark: number[];
};

export const EXTRA_SIGNALS: Signal[] = [
  {
    sym: "RTX",
    name: "RTX Corp",
    thesis: "Congressional buy cluster + MNPI-clean contract-award spike + hiring acceleration in propulsion division",
    z: 2.18,
    ic: 0.066,
    decay: 15,
    crowding: "LOW",
    novelty: 0.71,
    families: ["Disclosure", "NLP"],
    spark: priceWalk("RTX-sig", 30, 100, 0.013, 0.0045),
  },
  {
    sym: "NOC",
    name: "Northrop Grumman",
    thesis: "Insider buy + Congressional accumulation + elevated EDGAR contract keywords vs 90D baseline",
    z: 1.88,
    ic: 0.059,
    decay: 16,
    crowding: "LOW",
    novelty: 0.64,
    families: ["Disclosure", "NLP"],
    spark: priceWalk("NOC-sig", 30, 100, 0.011, 0.0038),
  },
  {
    sym: "MSFT",
    name: "Microsoft Corp",
    thesis: "AI patent velocity + enterprise search-interest uptick + positive NLP event tone above 3σ threshold",
    z: 1.62,
    ic: 0.051,
    decay: 10,
    crowding: "HIGH",
    novelty: 0.42,
    families: ["NLP", "Web"],
    spark: priceWalk("MSFT-sig", 30, 100, 0.015, 0.0028),
  },
  {
    sym: "SNOW",
    name: "Snowflake Inc",
    thesis: "Hiring contraction (data-eng roles –18% MoM) + web-traffic plateau aligning bearish",
    z: -1.44,
    ic: 0.046,
    decay: 9,
    crowding: "MED",
    novelty: 0.57,
    families: ["Web"],
    spark: priceWalk("SNOW-sig", 30, 100, 0.022, -0.0025),
  },
  {
    sym: "CMG",
    name: "Chipotle Mexican Grill",
    thesis: "Foot-traffic proxy accelerating +4.1% WoW; app-store review velocity rising; no offsetting disclosure signal",
    z: 1.31,
    ic: 0.041,
    decay: 7,
    crowding: "MED",
    novelty: 0.38,
    families: ["Web", "Consumer"],
    spark: priceWalk("CMG-sig", 30, 100, 0.012, 0.002),
  },
  {
    sym: "SBUX",
    name: "Starbucks Corp",
    thesis: "App spend proxy decelerating; foot-traffic down –2.8% YoY; loyalty redemption cadence slowing",
    z: -1.21,
    ic: 0.037,
    decay: 8,
    crowding: "MED",
    novelty: 0.44,
    families: ["Consumer", "Web"],
    spark: priceWalk("SBUX-sig", 30, 100, 0.014, -0.002),
  },
  {
    sym: "AMD",
    name: "Advanced Micro Devices",
    thesis: "Job-posting acceleration in ML-infra roles + patent-filing velocity above 2σ + positive supply-chain NLP",
    z: 1.53,
    ic: 0.049,
    decay: 11,
    crowding: "HIGH",
    novelty: 0.56,
    families: ["NLP", "Web"],
    spark: priceWalk("AMD-sig", 30, 100, 0.019, 0.003),
  },
  {
    sym: "LULU",
    name: "lululemon Athletica",
    thesis: "Search-interest deceleration + app-rank slipping 12 positions + foot-traffic flat in key DMAs",
    z: -1.09,
    ic: 0.034,
    decay: 8,
    crowding: "LOW",
    novelty: 0.48,
    families: ["Consumer", "Web"],
    spark: priceWalk("LULU-sig", 30, 100, 0.016, -0.0018),
  },
];

/* KPI helpers */
export const SIGNAL_KPIS = {
  liveSignals: 47 + EXTRA_SIGNALS.length,
  families: 4,
  avgIC: 0.053,
  noveltyIndex: 0.59,
};

/* ── Congressional trading (Quiver Quant flavour) ───────────────────────── */
export type CongressTrade = {
  member: string;
  party: "D" | "R" | "I";
  ticker: string;
  transaction: "Buy" | "Sell";
  amountRange: string;
  filedDate: string;
  txDate: string;
  daysToDisclose: number;
  flagged: boolean; // abnormal-cluster flag
};

export const CONGRESS_TRADES: CongressTrade[] = [
  { member: "Sen. H. Caldwell", party: "R", ticker: "LMT", transaction: "Buy", amountRange: "$50K–$100K", filedDate: "2025-05-28", txDate: "2025-05-14", daysToDisclose: 14, flagged: true },
  { member: "Rep. T. Nguyen", party: "D", ticker: "RTX", transaction: "Buy", amountRange: "$15K–$50K", filedDate: "2025-05-27", txDate: "2025-05-12", daysToDisclose: 15, flagged: true },
  { member: "Sen. M. Okafor", party: "R", ticker: "NOC", transaction: "Buy", amountRange: "$50K–$100K", filedDate: "2025-05-29", txDate: "2025-05-15", daysToDisclose: 14, flagged: true },
  { member: "Rep. C. Torres", party: "R", ticker: "GD", transaction: "Buy", amountRange: "$15K–$50K", filedDate: "2025-05-26", txDate: "2025-05-14", daysToDisclose: 12, flagged: false },
  { member: "Sen. A. Patel", party: "D", ticker: "NVDA", transaction: "Buy", amountRange: "$100K–$250K", filedDate: "2025-05-22", txDate: "2025-05-05", daysToDisclose: 17, flagged: false },
  { member: "Rep. S. Mirsky", party: "R", ticker: "MSFT", transaction: "Sell", amountRange: "$50K–$100K", filedDate: "2025-05-21", txDate: "2025-05-06", daysToDisclose: 15, flagged: false },
  { member: "Sen. B. Reinholt", party: "I", ticker: "AAPL", transaction: "Sell", amountRange: "$100K–$250K", filedDate: "2025-05-20", txDate: "2025-05-04", daysToDisclose: 16, flagged: false },
  { member: "Rep. D. Weston", party: "D", ticker: "PLTR", transaction: "Buy", amountRange: "$15K–$50K", filedDate: "2025-05-19", txDate: "2025-05-05", daysToDisclose: 14, flagged: false },
  { member: "Sen. F. Adeyemi", party: "R", ticker: "LHX", transaction: "Buy", amountRange: "$15K–$50K", filedDate: "2025-05-30", txDate: "2025-05-16", daysToDisclose: 14, flagged: false },
  { member: "Rep. L. Chen", party: "D", ticker: "AMZN", transaction: "Buy", amountRange: "$50K–$100K", filedDate: "2025-05-18", txDate: "2025-05-02", daysToDisclose: 16, flagged: false },
];

/* ── Insider Form 4 data ────────────────────────────────────────────────── */
export type InsiderForm4 = {
  name: string;
  title: string;
  ticker: string;
  type: "Buy" | "Sell";
  shares: number;
  price: number;
  value: number; // USD
  filedDate: string;
  txDate: string;
};

export const INSIDER_TRADES: InsiderForm4[] = [
  { name: "J. Taricani", title: "CEO", ticker: "CVNA", type: "Sell", shares: 120_000, price: 132.8, value: 15_936_000, filedDate: "2025-05-30", txDate: "2025-05-28" },
  { name: "M. Borland", title: "CFO", ticker: "CVNA", type: "Sell", shares: 45_000, price: 131.2, value: 5_904_000, filedDate: "2025-05-29", txDate: "2025-05-27" },
  { name: "K. Reinhardt", title: "Director", ticker: "LMT", type: "Buy", shares: 2_800, price: 463.1, value: 1_296_680, filedDate: "2025-05-28", txDate: "2025-05-24" },
  { name: "T. Ashford", title: "EVP Ops", ticker: "LMT", type: "Buy", shares: 1_500, price: 461.4, value: 692_100, filedDate: "2025-05-27", txDate: "2025-05-23" },
  { name: "P. Yamamoto", title: "CTO", ticker: "PLTR", type: "Buy", shares: 50_000, price: 28.7, value: 1_435_000, filedDate: "2025-05-26", txDate: "2025-05-22" },
  { name: "C. Osei", title: "Director", ticker: "NVDA", type: "Sell", shares: 10_000, price: 121.4, value: 1_214_000, filedDate: "2025-05-25", txDate: "2025-05-21" },
  { name: "E. Vance", title: "CEO", ticker: "ELF", type: "Sell", shares: 25_000, price: 188.4, value: 4_710_000, filedDate: "2025-05-24", txDate: "2025-05-20" },
  { name: "R. Hollis", title: "Director", ticker: "ANET", type: "Buy", shares: 3_200, price: 312.7, value: 1_000_640, filedDate: "2025-05-23", txDate: "2025-05-19" },
];

/* ── Lobbying spend ─────────────────────────────────────────────────────── */
export type LobbyRow = {
  ticker: string;
  company: string;
  q: string; // quarter label
  spend: number; // USD
  qoq: number; // % change
  focus: string; // issue area
};

export const LOBBY_DATA: LobbyRow[] = [
  { ticker: "LMT", company: "Lockheed Martin", q: "Q1 2025", spend: 3_780_000, qoq: +12.4, focus: "Defense Procurement / Export Controls" },
  { ticker: "RTX", company: "RTX Corp", q: "Q1 2025", spend: 2_940_000, qoq: +8.1, focus: "DoD Budget / ITAR" },
  { ticker: "NOC", company: "Northrop Grumman", q: "Q1 2025", spend: 2_450_000, qoq: +6.7, focus: "Space / Strategic Systems" },
  { ticker: "NVDA", company: "NVIDIA Corp", q: "Q1 2025", spend: 1_820_000, qoq: +22.3, focus: "AI Export Controls / Chip Act" },
  { ticker: "MSFT", company: "Microsoft Corp", q: "Q1 2025", spend: 3_120_000, qoq: -4.2, focus: "Cloud / AI Regulation / DOJ" },
  { ticker: "AMZN", company: "Amazon.com", q: "Q1 2025", spend: 4_650_000, qoq: +3.8, focus: "AWS Gov / Antitrust / Labor" },
  { ticker: "META", company: "Meta Platforms", q: "Q1 2025", spend: 5_310_000, qoq: +14.9, focus: "Content Moderation / EU DSA" },
  { ticker: "PLTR", company: "Palantir Technologies", q: "Q1 2025", spend: 890_000, qoq: +31.2, focus: "Defense AI / DHS / DoD" },
];

/* ── Government contract awards ─────────────────────────────────────────── */
export type ContractAward = {
  ticker: string;
  company: string;
  agency: string;
  value: number; // USD
  awardDate: string;
  description: string;
  piFlag: boolean; // point-in-time filing flag
};

export const CONTRACT_AWARDS: ContractAward[] = [
  { ticker: "LMT", company: "Lockheed Martin", agency: "U.S. Air Force", value: 1_240_000_000, awardDate: "2025-05-22", description: "F-35 sustainment & depot maintenance (Lot 17)", piFlag: true },
  { ticker: "NOC", company: "Northrop Grumman", agency: "U.S. Navy", value: 780_000_000, awardDate: "2025-05-20", description: "B-21 Raider low-rate initial production", piFlag: true },
  { ticker: "RTX", company: "RTX Corp", agency: "U.S. Army", value: 540_000_000, awardDate: "2025-05-18", description: "Patriot PAC-3 interceptor production", piFlag: true },
  { ticker: "PLTR", company: "Palantir Technologies", agency: "U.S. Army", value: 230_000_000, awardDate: "2025-05-15", description: "Maven Smart System AI analytics platform", piFlag: false },
  { ticker: "LHX", company: "L3Harris Technologies", agency: "Space Force", value: 410_000_000, awardDate: "2025-05-12", description: "Protected Tactical Satcom WIDEBAND", piFlag: false },
  { ticker: "GD", company: "General Dynamics", agency: "U.S. Navy", value: 920_000_000, awardDate: "2025-05-09", description: "Virginia-class submarine component fabrication", piFlag: false },
];

/* ── Web signals (Thinknum-style) ────────────────────────────────────────── */
export type WebSignalRow = {
  sym: string;
  name: string;
  hiringTrend: number; // % MoM change in job postings
  hiringAbs: number; // absolute open roles
  webTrafficTrend: number; // % YoY
  appRankDelta: number; // +good (rank improved), -bad
  searchInterest: number; // 0–100 Google Trends normalized
  searchTrend: number; // % 4-week change
  demandFlag: "ACCEL" | "FLAT" | "DECEL" | "ROLLOVER";
  hiringFlag: "ACCEL" | "FLAT" | "DECEL";
  hiringSpark: number[];
  trafficSpark: number[];
  searchSpark: number[];
  appSpark: number[];
};

export const WEB_SIGNALS: WebSignalRow[] = [
  {
    sym: "NVDA", name: "NVIDIA Corp",
    hiringTrend: +28.4, hiringAbs: 3_412,
    webTrafficTrend: +41.2,
    appRankDelta: +8, searchInterest: 88, searchTrend: +14.2,
    demandFlag: "ACCEL", hiringFlag: "ACCEL",
    hiringSpark: priceWalk("NVDA-hire", 12, 100, 0.04, 0.018),
    trafficSpark: priceWalk("NVDA-traf", 12, 100, 0.03, 0.022),
    searchSpark: priceWalk("NVDA-srch", 12, 100, 0.025, 0.014),
    appSpark: priceWalk("NVDA-app", 12, 100, 0.02, 0.009),
  },
  {
    sym: "ELF", name: "e.l.f. Beauty",
    hiringTrend: -4.1, hiringAbs: 218,
    webTrafficTrend: -8.3,
    appRankDelta: -7, searchInterest: 52, searchTrend: -11.4,
    demandFlag: "DECEL", hiringFlag: "DECEL",
    hiringSpark: priceWalk("ELF-hire", 12, 100, 0.03, -0.010),
    trafficSpark: priceWalk("ELF-traf", 12, 100, 0.025, -0.011),
    searchSpark: priceWalk("ELF-srch", 12, 100, 0.03, -0.013),
    appSpark: priceWalk("ELF-app", 12, 100, 0.025, -0.009),
  },
  {
    sym: "CVNA", name: "Carvana Co",
    hiringTrend: -6.8, hiringAbs: 1_104,
    webTrafficTrend: -12.7,
    appRankDelta: -4, searchInterest: 61, searchTrend: -7.8,
    demandFlag: "ROLLOVER", hiringFlag: "DECEL",
    hiringSpark: priceWalk("CVNA-hire", 12, 100, 0.03, -0.009),
    trafficSpark: priceWalk("CVNA-traf", 12, 100, 0.025, -0.012),
    searchSpark: priceWalk("CVNA-srch", 12, 100, 0.03, -0.008),
    appSpark: priceWalk("CVNA-app", 12, 100, 0.02, -0.007),
  },
  {
    sym: "PLTR", name: "Palantir Technologies",
    hiringTrend: +11.2, hiringAbs: 642,
    webTrafficTrend: +22.4,
    appRankDelta: +3, searchInterest: 72, searchTrend: +8.6,
    demandFlag: "ACCEL", hiringFlag: "ACCEL",
    hiringSpark: priceWalk("PLTR-hire", 12, 100, 0.035, 0.011),
    trafficSpark: priceWalk("PLTR-traf", 12, 100, 0.03, 0.014),
    searchSpark: priceWalk("PLTR-srch", 12, 100, 0.025, 0.009),
    appSpark: priceWalk("PLTR-app", 12, 100, 0.02, 0.004),
  },
  {
    sym: "TGT", name: "Target Corp",
    hiringTrend: -2.4, hiringAbs: 4_872,
    webTrafficTrend: -3.9,
    appRankDelta: -2, searchInterest: 58, searchTrend: -4.2,
    demandFlag: "ROLLOVER", hiringFlag: "FLAT",
    hiringSpark: priceWalk("TGT-hire", 12, 100, 0.02, -0.003),
    trafficSpark: priceWalk("TGT-traf", 12, 100, 0.018, -0.004),
    searchSpark: priceWalk("TGT-srch", 12, 100, 0.022, -0.005),
    appSpark: priceWalk("TGT-app", 12, 100, 0.018, -0.003),
  },
  {
    sym: "AMD", name: "Advanced Micro Devices",
    hiringTrend: +18.7, hiringAbs: 2_184,
    webTrafficTrend: +31.6,
    appRankDelta: +5, searchInterest: 78, searchTrend: +11.8,
    demandFlag: "ACCEL", hiringFlag: "ACCEL",
    hiringSpark: priceWalk("AMD-hire", 12, 100, 0.035, 0.014),
    trafficSpark: priceWalk("AMD-traf", 12, 100, 0.03, 0.018),
    searchSpark: priceWalk("AMD-srch", 12, 100, 0.025, 0.012),
    appSpark: priceWalk("AMD-app", 12, 100, 0.02, 0.006),
  },
  {
    sym: "SNOW", name: "Snowflake Inc",
    hiringTrend: -18.2, hiringAbs: 387,
    webTrafficTrend: +1.4,
    appRankDelta: -1, searchInterest: 44, searchTrend: -3.1,
    demandFlag: "DECEL", hiringFlag: "DECEL",
    hiringSpark: priceWalk("SNOW-hire", 12, 100, 0.04, -0.015),
    trafficSpark: priceWalk("SNOW-traf", 12, 100, 0.025, +0.001),
    searchSpark: priceWalk("SNOW-srch", 12, 100, 0.03, -0.003),
    appSpark: priceWalk("SNOW-app", 12, 100, 0.02, -0.002),
  },
  {
    sym: "ANET", name: "Arista Networks",
    hiringTrend: +9.6, hiringAbs: 812,
    webTrafficTrend: +16.8,
    appRankDelta: +2, searchInterest: 48, searchTrend: +6.2,
    demandFlag: "ACCEL", hiringFlag: "ACCEL",
    hiringSpark: priceWalk("ANET-hire", 12, 100, 0.028, 0.008),
    trafficSpark: priceWalk("ANET-traf", 12, 100, 0.024, 0.010),
    searchSpark: priceWalk("ANET-srch", 12, 100, 0.022, 0.006),
    appSpark: priceWalk("ANET-app", 12, 100, 0.018, 0.003),
  },
];

/* ── Demand nowcast (web-derived) ────────────────────────────────────────── */
export type NowcastPoint = { sym: string; label: string; estimate: number; consensus: number; surprise: number };

export const DEMAND_NOWCAST: NowcastPoint[] = [
  { sym: "NVDA", label: "Data Center Rev Q2E", estimate: 24.8, consensus: 23.1, surprise: +7.4 },
  { sym: "AMD", label: "PC + Server Rev Q2E", estimate: 6.9, consensus: 6.5, surprise: +6.2 },
  { sym: "ANET", label: "Networking Rev Q2E", estimate: 1.9, consensus: 1.8, surprise: +5.6 },
  { sym: "PLTR", label: "Gov Rev Q2E", estimate: 0.42, consensus: 0.39, surprise: +7.7 },
  { sym: "ELF", label: "Cosmetics Rev Q2E", estimate: 0.31, consensus: 0.34, surprise: -8.8 },
  { sym: "TGT", label: "Comparable Sales Q2E", estimate: -1.4, consensus: -0.6, surprise: -133.3 }, // pct
  { sym: "CVNA", label: "Retail Units Q2E", estimate: 108, consensus: 118, surprise: -8.5 },
  { sym: "SNOW", label: "Product Rev Q2E", estimate: 0.91, consensus: 0.95, surprise: -4.2 },
];

/* ── Consumer proxies (Yipit-style: search + app + web, no licensed panel) ─ */
export type ConsumerProxy = {
  sym: string;
  name: string;
  category: string;
  searchIndex: number; // 0–100
  searchYoY: number; // %
  appRank: number; // lower = better (App Store rank)
  appRankYoY: number;
  footTrafficYoY: number; // %
  spendProxy: number; // normalized 0–100 (free proxy, NOT licensed panel)
  spendYoY: number; // %
  trend: "UP" | "FLAT" | "DOWN";
  nowcast: number; // estimated same-store-sales YoY %
  searchSpark: number[];
  trafficSpark: number[];
  spendSpark: number[];
};

export const CONSUMER_PROXIES: ConsumerProxy[] = [
  {
    sym: "TGT", name: "Target Corp", category: "Mass Retail",
    searchIndex: 58, searchYoY: -4.2,
    appRank: 12, appRankYoY: -3.1,
    footTrafficYoY: -2.8,
    spendProxy: 54, spendYoY: -3.6,
    trend: "DOWN", nowcast: -2.1,
    searchSpark: priceWalk("TGT-csrch", 16, 100, 0.022, -0.005),
    trafficSpark: priceWalk("TGT-ctraf", 16, 100, 0.018, -0.004),
    spendSpark: priceWalk("TGT-cspend", 16, 100, 0.02, -0.004),
  },
  {
    sym: "CMG", name: "Chipotle Mexican Grill", category: "QSR",
    searchIndex: 74, searchYoY: +6.4,
    appRank: 8, appRankYoY: +4.2,
    footTrafficYoY: +4.1,
    spendProxy: 79, spendYoY: +7.2,
    trend: "UP", nowcast: +5.8,
    searchSpark: priceWalk("CMG-csrch", 16, 100, 0.018, 0.007),
    trafficSpark: priceWalk("CMG-ctraf", 16, 100, 0.015, 0.006),
    spendSpark: priceWalk("CMG-cspend", 16, 100, 0.016, 0.008),
  },
  {
    sym: "SBUX", name: "Starbucks Corp", category: "QSR",
    searchIndex: 61, searchYoY: -5.8,
    appRank: 14, appRankYoY: -6.1,
    footTrafficYoY: -2.8,
    spendProxy: 56, spendYoY: -4.9,
    trend: "DOWN", nowcast: -3.4,
    searchSpark: priceWalk("SBUX-csrch", 16, 100, 0.021, -0.006),
    trafficSpark: priceWalk("SBUX-ctraf", 16, 100, 0.018, -0.005),
    spendSpark: priceWalk("SBUX-cspend", 16, 100, 0.02, -0.006),
  },
  {
    sym: "LULU", name: "lululemon Athletica", category: "Apparel",
    searchIndex: 48, searchYoY: -8.2,
    appRank: 26, appRankYoY: -8.4,
    footTrafficYoY: -0.6,
    spendProxy: 47, spendYoY: -6.1,
    trend: "DOWN", nowcast: -4.8,
    searchSpark: priceWalk("LULU-csrch", 16, 100, 0.024, -0.009),
    trafficSpark: priceWalk("LULU-ctraf", 16, 100, 0.02, -0.003),
    spendSpark: priceWalk("LULU-cspend", 16, 100, 0.022, -0.007),
  },
  {
    sym: "ELF", name: "e.l.f. Beauty", category: "Beauty",
    searchIndex: 52, searchYoY: -11.4,
    appRank: 41, appRankYoY: -12.7,
    footTrafficYoY: -1.4,
    spendProxy: 49, spendYoY: -9.3,
    trend: "DOWN", nowcast: -7.2,
    searchSpark: priceWalk("ELF-csrch", 16, 100, 0.028, -0.012),
    trafficSpark: priceWalk("ELF-ctraf", 16, 100, 0.022, -0.006),
    spendSpark: priceWalk("ELF-cspend", 16, 100, 0.025, -0.011),
  },
  {
    sym: "AMZN", name: "Amazon.com", category: "eCommerce",
    searchIndex: 91, searchYoY: +3.8,
    appRank: 3, appRankYoY: +1.2,
    footTrafficYoY: +2.1,
    spendProxy: 88, spendYoY: +5.4,
    trend: "UP", nowcast: +6.2,
    searchSpark: priceWalk("AMZN-csrch", 16, 100, 0.012, 0.004),
    trafficSpark: priceWalk("AMZN-ctraf", 16, 100, 0.01, 0.003),
    spendSpark: priceWalk("AMZN-cspend", 16, 100, 0.012, 0.005),
  },
  {
    sym: "NKE", name: "Nike Inc", category: "Apparel",
    searchIndex: 66, searchYoY: -2.1,
    appRank: 19, appRankYoY: -1.8,
    footTrafficYoY: -1.1,
    spendProxy: 63, spendYoY: -2.8,
    trend: "FLAT", nowcast: -1.4,
    searchSpark: priceWalk("NKE-csrch", 16, 100, 0.018, -0.002),
    trafficSpark: priceWalk("NKE-ctraf", 16, 100, 0.015, -0.001),
    spendSpark: priceWalk("NKE-cspend", 16, 100, 0.017, -0.003),
  },
  {
    sym: "MCD", name: "McDonald's Corp", category: "QSR",
    searchIndex: 77, searchYoY: +1.8,
    appRank: 6, appRankYoY: +2.3,
    footTrafficYoY: +0.9,
    spendProxy: 74, spendYoY: +2.4,
    trend: "FLAT", nowcast: +1.6,
    searchSpark: priceWalk("MCD-csrch", 16, 100, 0.015, 0.002),
    trafficSpark: priceWalk("MCD-ctraf", 16, 100, 0.013, 0.001),
    spendSpark: priceWalk("MCD-cspend", 16, 100, 0.014, 0.003),
  },
];
