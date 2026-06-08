/**
 * ARGUS 2 — Alt-Data & Signals (deeper pages)
 * Data for: Events, Ingestion, Research, Governance
 * All series deterministic via Rng / priceWalk. No Math.random().
 */
import { Rng, priceWalk } from "@/lib/rng";

/* ═══════════════════════════════════════════════════════════════════════════
   EVENTS PAGE — NLP / Event-Detection Engine
   ═══════════════════════════════════════════════════════════════════════════ */

export type EventType =
  | "earnings"
  | "guidance"
  | "M&A"
  | "mgmt-change"
  | "legal-regulatory"
  | "product"
  | "partnership"
  | "layoffs"
  | "buyback"
  | "rating-change"
  | "supply-chain"
  | "macro";

export type SentimentDir = "pos" | "neg" | "neu";

export type ClassifiedEvent = {
  timestamp: string;
  headline: string;
  source: string;
  sourceUrl: string;
  ticker: string;
  name: string;
  eventType: EventType;
  sentiment: SentimentDir;
  sentimentMag: number; // 0–1
  relevance: number;   // 0–100 %
  novelty: number;     // 0–1
  contentHash: string;
  fetchedAt: string;
  asOf: string;
};

export const CLASSIFIED_EVENTS: ClassifiedEvent[] = [
  {
    timestamp: "2025-06-06 09:42:18",
    headline: "NVDA secures $4.2B HGX-H100 cluster order from unnamed hyperscaler",
    source: "Reuters",
    sourceUrl: "https://reuters.com",
    ticker: "NVDA",
    name: "NVIDIA Corp",
    eventType: "supply-chain",
    sentiment: "pos",
    sentimentMag: 0.84,
    relevance: 96,
    novelty: 0.83,
    contentHash: "sha256:a1f9e2c3",
    fetchedAt: "2025-06-06T09:42:18Z",
    asOf: "2025-06-06",
  },
  {
    timestamp: "2025-06-06 09:28:04",
    headline: "LMT awarded $1.24B F-35 sustainment contract — Lot 17",
    source: "SAM.gov / USASpending",
    sourceUrl: "https://sam.gov",
    ticker: "LMT",
    name: "Lockheed Martin",
    eventType: "earnings",
    sentiment: "pos",
    sentimentMag: 0.79,
    relevance: 98,
    novelty: 0.61,
    contentHash: "sha256:b2d4f178",
    fetchedAt: "2025-06-06T09:28:04Z",
    asOf: "2025-06-06",
  },
  {
    timestamp: "2025-06-06 09:14:52",
    headline: "Pfizer initiates $3.5B buyback; cites undervalued pipeline",
    source: "SEC EDGAR 8-K",
    sourceUrl: "https://sec.gov/cgi-bin/browse-edgar",
    ticker: "PFE",
    name: "Pfizer Inc",
    eventType: "buyback",
    sentiment: "pos",
    sentimentMag: 0.66,
    relevance: 92,
    novelty: 0.54,
    contentHash: "sha256:c3e5a289",
    fetchedAt: "2025-06-06T09:14:52Z",
    asOf: "2025-06-06",
  },
  {
    timestamp: "2025-06-06 09:03:11",
    headline: "SNOW lays off 14% of workforce; restructuring to focus on AI workloads",
    source: "EDGAR 8-K",
    sourceUrl: "https://sec.gov/cgi-bin/browse-edgar",
    ticker: "SNOW",
    name: "Snowflake Inc",
    eventType: "layoffs",
    sentiment: "neg",
    sentimentMag: 0.71,
    relevance: 97,
    novelty: 0.78,
    contentHash: "sha256:d4a6b391",
    fetchedAt: "2025-06-06T09:03:11Z",
    asOf: "2025-06-06",
  },
  {
    timestamp: "2025-06-06 08:55:38",
    headline: "Wells Fargo upgrades PLTR to Overweight; raises PT to $38",
    source: "Finnhub News",
    sourceUrl: "https://finnhub.io",
    ticker: "PLTR",
    name: "Palantir Technologies",
    eventType: "rating-change",
    sentiment: "pos",
    sentimentMag: 0.73,
    relevance: 88,
    novelty: 0.46,
    contentHash: "sha256:e5b7c402",
    fetchedAt: "2025-06-06T08:55:38Z",
    asOf: "2025-06-06",
  },
  {
    timestamp: "2025-06-06 08:41:07",
    headline: "FTC opens investigation into AMZN third-party seller data practices",
    source: "GDELT",
    sourceUrl: "https://gdeltproject.org",
    ticker: "AMZN",
    name: "Amazon.com",
    eventType: "legal-regulatory",
    sentiment: "neg",
    sentimentMag: 0.68,
    relevance: 91,
    novelty: 0.69,
    contentHash: "sha256:f6c8d513",
    fetchedAt: "2025-06-06T08:41:07Z",
    asOf: "2025-06-06",
  },
  {
    timestamp: "2025-06-06 08:22:44",
    headline: "TSLA announces Model Y production redesign, cuts per-unit cost 18%",
    source: "EDGAR 8-K",
    sourceUrl: "https://sec.gov/cgi-bin/browse-edgar",
    ticker: "TSLA",
    name: "Tesla Inc",
    eventType: "product",
    sentiment: "pos",
    sentimentMag: 0.77,
    relevance: 94,
    novelty: 0.71,
    contentHash: "sha256:g7d9e624",
    fetchedAt: "2025-06-06T08:22:44Z",
    asOf: "2025-06-06",
  },
  {
    timestamp: "2025-06-06 08:11:19",
    headline: "MSFT and OpenAI deepen partnership — Azure AI exclusive for GPT-5 deployment",
    source: "EDGAR 8-K",
    sourceUrl: "https://sec.gov/cgi-bin/browse-edgar",
    ticker: "MSFT",
    name: "Microsoft Corp",
    eventType: "partnership",
    sentiment: "pos",
    sentimentMag: 0.81,
    relevance: 95,
    novelty: 0.58,
    contentHash: "sha256:h8e0f735",
    fetchedAt: "2025-06-06T08:11:19Z",
    asOf: "2025-06-06",
  },
  {
    timestamp: "2025-06-06 07:58:02",
    headline: "AMD guides Q2 revenue below consensus; GPU inventory correction cited",
    source: "Finnhub News",
    sourceUrl: "https://finnhub.io",
    ticker: "AMD",
    name: "Advanced Micro Devices",
    eventType: "guidance",
    sentiment: "neg",
    sentimentMag: 0.76,
    relevance: 97,
    novelty: 0.82,
    contentHash: "sha256:i9f1a846",
    fetchedAt: "2025-06-06T07:58:02Z",
    asOf: "2025-06-06",
  },
  {
    timestamp: "2025-06-06 07:39:41",
    headline: "Apple acquires AI startup Novu for $620M — talent + vision-language tech",
    source: "Reuters",
    sourceUrl: "https://reuters.com",
    ticker: "AAPL",
    name: "Apple Inc",
    eventType: "M&A",
    sentiment: "pos",
    sentimentMag: 0.72,
    relevance: 93,
    novelty: 0.76,
    contentHash: "sha256:j0a2b957",
    fetchedAt: "2025-06-06T07:39:41Z",
    asOf: "2025-06-06",
  },
  {
    timestamp: "2025-06-06 07:18:33",
    headline: "RTX CEO Mark Brandt steps down; COO Elena Vasquez appointed interim",
    source: "PR Newswire / EDGAR 8-K",
    sourceUrl: "https://sec.gov/cgi-bin/browse-edgar",
    ticker: "RTX",
    name: "RTX Corp",
    eventType: "mgmt-change",
    sentiment: "neg",
    sentimentMag: 0.62,
    relevance: 89,
    novelty: 0.74,
    contentHash: "sha256:k1b3c068",
    fetchedAt: "2025-06-06T07:18:33Z",
    asOf: "2025-06-06",
  },
  {
    timestamp: "2025-06-06 06:54:17",
    headline: "Fed CPI data: YoY 3.1% — in line with consensus, no macro surprise",
    source: "FRED / BLS",
    sourceUrl: "https://fred.stlouisfed.org",
    ticker: "SPY",
    name: "S&P 500",
    eventType: "macro",
    sentiment: "neu",
    sentimentMag: 0.31,
    relevance: 72,
    novelty: 0.22,
    contentHash: "sha256:l2c4d179",
    fetchedAt: "2025-06-06T06:54:17Z",
    asOf: "2025-06-06",
  },
];

export const EVENT_KPI = {
  docsProcessed24h: 312_884,
  entitiesLinked: 48_312,
  eventsClassified: 21_447,
  avgNovelty: 0.59,
  pctLlmCallsSaved: 84.2, // cheap spaCy/embedding pre-filter saves this % of LLM calls
};

export type TaxonomyCategory = {
  eventType: EventType;
  label: string;
  count24h: number;
  pct: number; // of total events
  color: string;
};

export const EVENT_TAXONOMY: TaxonomyCategory[] = [
  { eventType: "earnings",          label: "Earnings / Results",      count24h: 3_821, pct: 17.8, color: "var(--pos)" },
  { eventType: "guidance",          label: "Forward Guidance",        count24h: 2_614, pct: 12.2, color: "var(--accent)" },
  { eventType: "supply-chain",      label: "Supply Chain",            count24h: 2_308, pct: 10.8, color: "var(--accent)" },
  { eventType: "rating-change",     label: "Rating / PT Change",      count24h: 2_102, pct: 9.8,  color: "var(--warn)" },
  { eventType: "legal-regulatory",  label: "Legal / Regulatory",      count24h: 1_983, pct: 9.2,  color: "var(--neg)" },
  { eventType: "product",           label: "Product Launch",          count24h: 1_876, pct: 8.7,  color: "var(--info)" },
  { eventType: "M&A",               label: "M&A / Deals",             count24h: 1_512, pct: 7.1,  color: "var(--ai)" },
  { eventType: "partnership",       label: "Partnership",             count24h: 1_418, pct: 6.6,  color: "var(--info)" },
  { eventType: "macro",             label: "Macro / Policy",          count24h: 1_284, pct: 6.0,  color: "var(--dim)" },
  { eventType: "buyback",           label: "Buyback / Capital",       count24h: 1_011, pct: 4.7,  color: "var(--pos)" },
  { eventType: "layoffs",           label: "Layoffs / Restructuring", count24h: 876,   pct: 4.1,  color: "var(--neg)" },
  { eventType: "mgmt-change",       label: "Management Change",       count24h: 642,   pct: 3.0,  color: "var(--warn)" },
];

export type EntityLink = {
  docFragment: string;
  rawMention: string;
  linkedTicker: string;
  linkedName: string;
  confidence: number; // 0–100
  pitNote: string; // ticker-change / split note if any
};

export const ENTITY_LINKS: EntityLink[] = [
  { docFragment: "...the company's GPU delivery timeline...", rawMention: "the company", linkedTicker: "NVDA", linkedName: "NVIDIA Corp", confidence: 97, pitNote: "No ticker change. Current mapping valid." },
  { docFragment: "...Meta's Llama-3 fine-tuning cluster...", rawMention: "Meta", linkedTicker: "META", linkedName: "Meta Platforms", confidence: 99, pitNote: "Previously FB → META (Oct 2021). PIT-mapped by as_of date." },
  { docFragment: "...Twitter's ad revenue down 18%...", rawMention: "Twitter", linkedTicker: "X-UNLISTED", linkedName: "X Corp (private)", confidence: 82, pitNote: "Delisted Oct 2022. Post-delisting signal filtered; pre-delisting PIT archive intact." },
  { docFragment: "...Alphabet's quantum processor milestone...", rawMention: "Alphabet", linkedTicker: "GOOGL", linkedName: "Alphabet Inc", confidence: 98, pitNote: "GOOG/GOOGL dual-class; signal uses GOOGL. Stable since 2014." },
  { docFragment: "...the chip maker's Taiwan fab capacity...", rawMention: "the chip maker", linkedTicker: "TSM", linkedName: "TSMC", confidence: 91, pitNote: "Context disambiguation via supply-chain NLP. Confidence 91% (ambiguous pronoun)." },
  { docFragment: "...Warner Bros. Discovery streaming subs...", rawMention: "Warner Bros. Discovery", linkedTicker: "WBD", linkedName: "Warner Bros. Discovery", confidence: 96, pitNote: "Merged entity (WarnerMedia + Discovery, Apr 2022). PIT split-adjusted." },
];

/* Per-entity rolling sentiment sparklines (30d) */
export const ENTITY_SENTIMENT_SPARKS: Record<string, number[]> = {
  NVDA: priceWalk("nvda-sent", 30, 0.62, 0.04, 0.003),
  LMT:  priceWalk("lmt-sent",  30, 0.58, 0.03, 0.004),
  SNOW: priceWalk("snow-sent", 30, 0.48, 0.04, -0.004),
  PLTR: priceWalk("pltr-sent", 30, 0.55, 0.035, 0.002),
  AMZN: priceWalk("amzn-sent", 30, 0.52, 0.03, -0.001),
  MSFT: priceWalk("msft-sent", 30, 0.60, 0.028, 0.002),
};

/* ═══════════════════════════════════════════════════════════════════════════
   INGESTION PAGE — Source Framework + PIT Lake
   ═══════════════════════════════════════════════════════════════════════════ */

export type RobotsPosture = "ALLOWED" | "BLOCKED" | "CONDITIONAL";
export type SourceHealth = "healthy" | "degraded" | "blocked";
export type LicenseMode = "public-domain" | "official-api" | "freemium-api" | "licensed" | "BLOCKED-ToS";

export type IngestionSource = {
  source: string;
  signalFamily: string;
  cadence: string;
  lastFetch: string;
  nextRun: string;
  status: SourceHealth;
  robotsPosture: RobotsPosture;
  tosPosture: "allowed" | "BLOCKED";
  licenseMode: LicenseMode;
  rateLimit: string;
  backoffPolicy: string;
  dedup: string;
  archiveGrowthPerDay: string;
  blocked: boolean; // hard-blocked by permission registry
  blockedReason?: string;
};

export const INGESTION_SOURCES: IngestionSource[] = [
  {
    source: "SEC EDGAR",
    signalFamily: "Disclosure / Filings",
    cadence: "Real-time (RSS + EFTS)",
    lastFetch: "2025-06-06 09:44:02",
    nextRun: "2025-06-06 09:49:00",
    status: "healthy",
    robotsPosture: "ALLOWED",
    tosPosture: "allowed",
    licenseMode: "public-domain",
    rateLimit: "10 req/s (polite)",
    backoffPolicy: "Exp. backoff on 429/503",
    dedup: "SHA-256 content hash",
    archiveGrowthPerDay: "~1.2 GB",
    blocked: false,
  },
  {
    source: "House/Senate eFD (STOCK Act)",
    signalFamily: "Disclosure / Congressional",
    cadence: "Daily at 06:00 ET",
    lastFetch: "2025-06-06 06:02:11",
    nextRun: "2025-06-07 06:00:00",
    status: "healthy",
    robotsPosture: "ALLOWED",
    tosPosture: "allowed",
    licenseMode: "public-domain",
    rateLimit: "2 req/s",
    backoffPolicy: "Exp. backoff on 429",
    dedup: "Filing ID + content hash",
    archiveGrowthPerDay: "~12 MB",
    blocked: false,
  },
  {
    source: "USASpending / SAM.gov",
    signalFamily: "Disclosure / Contract Awards",
    cadence: "Daily at 07:00 ET",
    lastFetch: "2025-06-06 07:01:38",
    nextRun: "2025-06-07 07:00:00",
    status: "healthy",
    robotsPosture: "ALLOWED",
    tosPosture: "allowed",
    licenseMode: "official-api",
    rateLimit: "10 req/s",
    backoffPolicy: "Exp. backoff on 429",
    dedup: "Award ID + hash",
    archiveGrowthPerDay: "~40 MB",
    blocked: false,
  },
  {
    source: "Senate LDA (Lobbying)",
    signalFamily: "Disclosure / Lobbying",
    cadence: "Quarterly (+ incremental)",
    lastFetch: "2025-04-15 08:14:00",
    nextRun: "2025-07-15 08:00:00",
    status: "healthy",
    robotsPosture: "ALLOWED",
    tosPosture: "allowed",
    licenseMode: "public-domain",
    rateLimit: "1 req/s",
    backoffPolicy: "Exp. backoff on 429",
    dedup: "Registrant + period hash",
    archiveGrowthPerDay: "~2 MB (quarterly burst)",
    blocked: false,
  },
  {
    source: "FEC (Campaign Finance)",
    signalFamily: "Disclosure / Political",
    cadence: "Daily at 08:00 ET",
    lastFetch: "2025-06-06 08:02:47",
    nextRun: "2025-06-07 08:00:00",
    status: "healthy",
    robotsPosture: "ALLOWED",
    tosPosture: "allowed",
    licenseMode: "public-domain",
    rateLimit: "120 req/min",
    backoffPolicy: "Exp. backoff on 429",
    dedup: "Committee ID + transaction hash",
    archiveGrowthPerDay: "~8 MB",
    blocked: false,
  },
  {
    source: "USPTO PatentsView",
    signalFamily: "NLP / Patents",
    cadence: "Weekly (Thu 03:00 ET)",
    lastFetch: "2025-06-05 03:12:49",
    nextRun: "2025-06-12 03:00:00",
    status: "healthy",
    robotsPosture: "ALLOWED",
    tosPosture: "allowed",
    licenseMode: "official-api",
    rateLimit: "45 req/min",
    backoffPolicy: "Exp. backoff on 429",
    dedup: "Patent ID + hash",
    archiveGrowthPerDay: "~200 MB (weekly burst)",
    blocked: false,
  },
  {
    source: "GDELT Project",
    signalFamily: "NLP / Global News",
    cadence: "Every 15 min",
    lastFetch: "2025-06-06 09:30:00",
    nextRun: "2025-06-06 09:45:00",
    status: "healthy",
    robotsPosture: "ALLOWED",
    tosPosture: "allowed",
    licenseMode: "public-domain",
    rateLimit: "Polite; no stated limit",
    backoffPolicy: "Exp. backoff on 503",
    dedup: "GDELT event ID + hash",
    archiveGrowthPerDay: "~3.8 GB",
    blocked: false,
  },
  {
    source: "Wikimedia Pageviews",
    signalFamily: "Web / Demand Proxy",
    cadence: "Hourly",
    lastFetch: "2025-06-06 09:00:00",
    nextRun: "2025-06-06 10:00:00",
    status: "healthy",
    robotsPosture: "ALLOWED",
    tosPosture: "allowed",
    licenseMode: "official-api",
    rateLimit: "200 req/s",
    backoffPolicy: "Exp. backoff on 429",
    dedup: "Article + hour hash",
    archiveGrowthPerDay: "~120 MB",
    blocked: false,
  },
  {
    source: "App Store Listings (iTunes RSS)",
    signalFamily: "Web / App Demand",
    cadence: "Daily at 05:00 ET",
    lastFetch: "2025-06-06 05:01:22",
    nextRun: "2025-06-07 05:00:00",
    status: "healthy",
    robotsPosture: "ALLOWED",
    tosPosture: "allowed",
    licenseMode: "official-api",
    rateLimit: "Polite; RSS only",
    backoffPolicy: "Exp. backoff on 503",
    dedup: "App ID + rank snapshot hash",
    archiveGrowthPerDay: "~15 MB",
    blocked: false,
  },
  {
    source: "Common Crawl",
    signalFamily: "NLP / Web Archive",
    cadence: "Monthly (bootstrap / backfill)",
    lastFetch: "2025-06-01 02:00:00",
    nextRun: "2025-07-01 02:00:00",
    status: "healthy",
    robotsPosture: "CONDITIONAL",
    tosPosture: "allowed",
    licenseMode: "public-domain",
    rateLimit: "Best-effort; S3 throttled",
    backoffPolicy: "Retry with jitter",
    dedup: "URL + WARC hash",
    archiveGrowthPerDay: "~8 GB (monthly burst)",
    blocked: false,
  },
  {
    source: "Wayback Machine (Internet Archive)",
    signalFamily: "NLP / Backfill / PIT",
    cadence: "On-demand backfill",
    lastFetch: "2025-05-30 14:22:00",
    nextRun: "On demand",
    status: "healthy",
    robotsPosture: "CONDITIONAL",
    tosPosture: "allowed",
    licenseMode: "official-api",
    rateLimit: "1 req/s (polite)",
    backoffPolicy: "Exp. backoff; respect Retry-After",
    dedup: "URL + timestamp + hash",
    archiveGrowthPerDay: "~40 MB (backfill bursts)",
    blocked: false,
  },
  {
    source: "Quiver Quant API",
    signalFamily: "Disclosure / Congressional + Insider",
    cadence: "Real-time (webhook)",
    lastFetch: "2025-06-06 09:38:44",
    nextRun: "Real-time",
    status: "healthy",
    robotsPosture: "ALLOWED",
    tosPosture: "allowed",
    licenseMode: "freemium-api",
    rateLimit: "500 req/day (Trader tier)",
    backoffPolicy: "Exp. backoff on 429",
    dedup: "Filing ID + hash",
    archiveGrowthPerDay: "~5 MB",
    blocked: false,
  },
  {
    source: "LinkedIn (Hiring / Profiles)",
    signalFamily: "Web / Hiring Intelligence",
    cadence: "N/A — BLOCKED",
    lastFetch: "Never",
    nextRun: "N/A",
    status: "blocked",
    robotsPosture: "BLOCKED",
    tosPosture: "BLOCKED",
    licenseMode: "BLOCKED-ToS",
    rateLimit: "N/A",
    backoffPolicy: "N/A",
    dedup: "N/A",
    archiveGrowthPerDay: "0",
    blocked: true,
    blockedReason: "robots.txt disallows scraping; ToS explicitly prohibits automated data collection. Must LICENSE via LinkedIn Data Partnership API.",
  },
  {
    source: "Glassdoor (Ratings / Reviews)",
    signalFamily: "Web / Hiring Sentiment",
    cadence: "N/A — BLOCKED",
    lastFetch: "Never",
    nextRun: "N/A",
    status: "blocked",
    robotsPosture: "BLOCKED",
    tosPosture: "BLOCKED",
    licenseMode: "BLOCKED-ToS",
    rateLimit: "N/A",
    backoffPolicy: "N/A",
    dedup: "N/A",
    archiveGrowthPerDay: "0",
    blocked: true,
    blockedReason: "robots.txt disallows bots; anti-scraping ToS. Requires official Glassdoor Open API or data license.",
  },
];

export const INGESTION_KPI = {
  activeSources: INGESTION_SOURCES.filter((s) => !s.blocked).length,
  fetches24h: 247_882,
  dedupRate: 18.4,          // % of fetched docs that were duplicates (skipped)
  archiveGrowthGbDay: 14.2,
  blockedSources: INGESTION_SOURCES.filter((s) => s.blocked).length,
};

/* PIT lake artifact schema (illustrative) */
export type PitArtifact = {
  source: string;
  fetchedAt: string;
  asOf: string;
  contentHash: string;
  licenseMode: LicenseMode;
  partition: string;
  sizeKb: number;
  immutable: boolean;
};

export const PIT_ARTIFACTS: PitArtifact[] = [
  { source: "SEC EDGAR",           fetchedAt: "2025-06-06T09:44:02Z", asOf: "2025-06-06", contentHash: "sha256:a1b2c3d4", licenseMode: "public-domain",  partition: "edgar/2025-06-06/", sizeKb: 1_842, immutable: true },
  { source: "GDELT",               fetchedAt: "2025-06-06T09:30:00Z", asOf: "2025-06-06", contentHash: "sha256:b2c3d4e5", licenseMode: "public-domain",  partition: "gdelt/2025-06-06/", sizeKb: 12_488, immutable: true },
  { source: "Wikimedia Pageviews", fetchedAt: "2025-06-06T09:00:00Z", asOf: "2025-06-06", contentHash: "sha256:c3d4e5f6", licenseMode: "official-api",   partition: "wiki/2025-06-06/",  sizeKb: 3_214, immutable: true },
  { source: "USPTO PatentsView",   fetchedAt: "2025-06-05T03:12:49Z", asOf: "2025-06-05", contentHash: "sha256:d4e5f6a7", licenseMode: "official-api",   partition: "uspto/2025-06-05/", sizeKb: 78_200, immutable: true },
  { source: "House/Senate eFD",    fetchedAt: "2025-06-06T06:02:11Z", asOf: "2025-06-06", contentHash: "sha256:e5f6a7b8", licenseMode: "public-domain",  partition: "efd/2025-06-06/",   sizeKb: 88, immutable: true },
  { source: "Quiver Quant API",    fetchedAt: "2025-06-06T09:38:44Z", asOf: "2025-06-06", contentHash: "sha256:f6a7b8c9", licenseMode: "freemium-api",   partition: "quiver/2025-06-06/",sizeKb: 228, immutable: true },
];

/* Backfill sources for survivorship-bias-free history */
export type BackfillSource = {
  name: string;
  purpose: string;
  coverageFrom: string;
  note: string;
};
export const BACKFILL_SOURCES: BackfillSource[] = [
  { name: "Common Crawl",         purpose: "Historical web snapshots — web signals, hiring data, product pages", coverageFrom: "2013", note: "~1 crawl/month; respects robots.txt at crawl time" },
  { name: "Wayback Machine",      purpose: "PIT-accurate company pages, job boards, press releases",              coverageFrom: "1996", note: "1 req/s polite; official CDX API; respects exclusions" },
  { name: "EDGAR Full-Text EFTS", purpose: "All 10-K/10-Q/8-K/Form 4 since 1993 — survivorship-bias-free",      coverageFrom: "1993", note: "Complete history; no survivors-only selection" },
];

/* ═══════════════════════════════════════════════════════════════════════════
   RESEARCH PAGE — Signal Engineering & Alpha Validation
   ═══════════════════════════════════════════════════════════════════════════ */

export type CrowdingLevel = "LOW" | "MED" | "HIGH";

export type SignalLibraryRow = {
  signal: string;
  family: string;
  coverage: number;    // % of universe
  rankIc: number;      // rank information coefficient
  ir: number;          // information ratio
  decileSpread: number;// annualized decile 10 − decile 1 return %
  turnover: number;    // % annual
  capacityM: number;   // estimated capacity $M
  crowding: CrowdingLevel;
  version: string;
  icSpark: number[];   // IC across 10 forward horizons (1d to 60d)
  halfLifeDays: number;
};

const rsl = new Rng("signal-lib");

export const SIGNAL_LIBRARY: SignalLibraryRow[] = [
  {
    signal: "Congressional Trading Cluster", family: "Disclosure", coverage: 82, rankIc: 0.071, ir: 0.94, decileSpread: 9.4, turnover: 18, capacityM: 4_200, crowding: "LOW", version: "v2.3", halfLifeDays: 14, icSpark: priceWalk("sig-ic-congress", 10, 0.065, 0.008, 0.001),
  },
  {
    signal: "Insider Net Buying (Form 4)", family: "Disclosure", coverage: 94, rankIc: 0.064, ir: 0.81, decileSpread: 8.1, turnover: 22, capacityM: 8_100, crowding: "LOW", version: "v3.1", halfLifeDays: 18, icSpark: priceWalk("sig-ic-insider", 10, 0.058, 0.009, 0.002),
  },
  {
    signal: "NLP Event Intensity (z>2)", family: "NLP", coverage: 98, rankIc: 0.058, ir: 0.76, decileSpread: 7.2, turnover: 48, capacityM: 12_400, crowding: "MED", version: "v4.0", halfLifeDays: 9, icSpark: priceWalk("sig-ic-nlp", 10, 0.056, 0.012, -0.003),
  },
  {
    signal: "Patent Velocity Score", family: "NLP", coverage: 76, rankIc: 0.049, ir: 0.62, decileSpread: 5.8, turnover: 12, capacityM: 9_800, crowding: "LOW", version: "v1.8", halfLifeDays: 28, icSpark: priceWalk("sig-ic-patent", 10, 0.046, 0.008, 0.001),
  },
  {
    signal: "Hiring Acceleration", family: "Web", coverage: 88, rankIc: 0.053, ir: 0.69, decileSpread: 6.4, turnover: 26, capacityM: 6_700, crowding: "MED", version: "v2.6", halfLifeDays: 12, icSpark: priceWalk("sig-ic-hire", 10, 0.050, 0.010, -0.001),
  },
  {
    signal: "Web Traffic Trend", family: "Web", coverage: 72, rankIc: 0.044, ir: 0.57, decileSpread: 5.1, turnover: 34, capacityM: 5_200, crowding: "MED", version: "v2.1", halfLifeDays: 10, icSpark: priceWalk("sig-ic-web", 10, 0.042, 0.011, -0.002),
  },
  {
    signal: "App Store Rank Delta", family: "Web", coverage: 58, rankIc: 0.041, ir: 0.54, decileSpread: 4.8, turnover: 38, capacityM: 3_400, crowding: "LOW", version: "v1.5", halfLifeDays: 8, icSpark: priceWalk("sig-ic-app", 10, 0.039, 0.012, -0.003),
  },
  {
    signal: "Foot-Traffic YoY (proxy)", family: "Consumer", coverage: 64, rankIc: 0.052, ir: 0.67, decileSpread: 6.2, turnover: 42, capacityM: 4_800, crowding: "LOW", version: "v2.0", halfLifeDays: 7, icSpark: priceWalk("sig-ic-foot", 10, 0.050, 0.013, -0.002),
  },
  {
    signal: "Search Interest Nowcast", family: "Consumer", coverage: 91, rankIc: 0.038, ir: 0.49, decileSpread: 4.2, turnover: 52, capacityM: 7_100, crowding: "HIGH", version: "v1.9", halfLifeDays: 6, icSpark: priceWalk("sig-ic-search", 10, 0.036, 0.014, -0.004),
  },
  {
    signal: "Contract Award Momentum", family: "Disclosure", coverage: 41, rankIc: 0.062, ir: 0.79, decileSpread: 7.8, turnover: 14, capacityM: 2_900, crowding: "LOW", version: "v2.2", halfLifeDays: 21, icSpark: priceWalk("sig-ic-contract", 10, 0.059, 0.009, 0.002),
  },
  {
    signal: "Lobbying Spend Surge", family: "Disclosure", coverage: 38, rankIc: 0.044, ir: 0.56, decileSpread: 5.0, turnover: 8, capacityM: 2_100, crowding: "LOW", version: "v1.4", halfLifeDays: 42, icSpark: priceWalk("sig-ic-lobby", 10, 0.042, 0.007, 0.001),
  },
  {
    signal: "Sentiment Novelty Composite", family: "NLP", coverage: 99, rankIc: 0.047, ir: 0.60, decileSpread: 5.4, turnover: 60, capacityM: 15_000, crowding: "HIGH", version: "v3.4", halfLifeDays: 7, icSpark: priceWalk("sig-ic-sent-nov", 10, 0.045, 0.015, -0.005),
  },
];

export const RESEARCH_KPI = {
  signalsInLibrary: SIGNAL_LIBRARY.length,
  avgRankIc: +(SIGNAL_LIBRARY.reduce((s, r) => s + r.rankIc, 0) / SIGNAL_LIBRARY.length).toFixed(3),
  avgHalfLifeDays: Math.round(SIGNAL_LIBRARY.reduce((s, r) => s + r.halfLifeDays, 0) / SIGNAL_LIBRARY.length),
  crowdingIndex: 0.31, // 0 = no crowding, 1 = fully crowded
};

/* IC / Decay across horizons (1d, 3d, 5d, 10d, 15d, 20d, 30d, 40d, 50d, 60d) */
export const IC_HORIZONS = ["1d", "3d", "5d", "10d", "15d", "20d", "30d", "40d", "50d", "60d"];
export const IC_BY_HORIZON: Record<string, number[]> = {
  "Congressional Trading Cluster": [0.028, 0.044, 0.058, 0.071, 0.068, 0.062, 0.048, 0.031, 0.019, 0.012],
  "Insider Net Buying (Form 4)":   [0.018, 0.031, 0.046, 0.064, 0.067, 0.063, 0.051, 0.039, 0.028, 0.018],
  "NLP Event Intensity (z>2)":     [0.048, 0.058, 0.054, 0.048, 0.038, 0.030, 0.019, 0.012, 0.007, 0.004],
  "Search Interest Nowcast":       [0.032, 0.038, 0.036, 0.030, 0.024, 0.018, 0.012, 0.007, 0.004, 0.002],
};

/* Decile spread: decile 1 (bottom) to 10 (top) — annualized fwd returns */
export const DECILE_SPREAD_DATA: number[] = [-6.2, -4.1, -2.4, -1.1, 0.3, 1.4, 2.8, 4.2, 6.1, 8.8];

/* Look-ahead bias examples */
export type PitCheckRow = {
  testDate: string;
  signalAsOf: string;
  dataAsOf: string;
  verdict: "PASS" | "BLOCKED";
  reason: string;
};
export const PIT_CHECK_ROWS: PitCheckRow[] = [
  { testDate: "2024-08-15", signalAsOf: "2024-08-15", dataAsOf: "2024-08-14", verdict: "PASS",    reason: "as_of(data) ≤ test_date. Filing dated 2024-08-14, available before market open 2024-08-15." },
  { testDate: "2024-08-15", signalAsOf: "2024-08-17", dataAsOf: "2024-08-17", verdict: "BLOCKED",  reason: "LOOK-AHEAD: data as_of = 2024-08-17 > test_date = 2024-08-15. Backtest runner rejected this row." },
  { testDate: "2024-11-03", signalAsOf: "2024-11-03", dataAsOf: "2024-11-02", verdict: "PASS",    reason: "Q3 10-Q filed 2024-11-02 (post-market). PIT flag confirms availability before test_date open." },
  { testDate: "2025-02-14", signalAsOf: "2025-02-14", dataAsOf: "2025-02-13", verdict: "PASS",    reason: "Form 4 filed 2025-02-13 within STOCK Act 45-day window; captured in daily EDGAR run." },
  { testDate: "2025-01-10", signalAsOf: "2025-01-12", dataAsOf: "2025-01-12", verdict: "BLOCKED",  reason: "LOOK-AHEAD: Earnings restated on 2025-01-12 used in backtest dated 2025-01-10. Rejected." },
];

/* ═══════════════════════════════════════════════════════════════════════════
   GOVERNANCE PAGE — Compliance & Data Governance
   ═══════════════════════════════════════════════════════════════════════════ */

export type PermissionStatus = "ALLOWED" | "BLOCKED";

export type PermissionRegistryRow = {
  source: string;
  robotsTxtStatus: "respects" | "disallows" | "no-file";
  tosPosture: "permissive" | "restricted" | "prohibited";
  allowed: PermissionStatus;
  notes: string;
};

export const PERMISSION_REGISTRY: PermissionRegistryRow[] = [
  { source: "SEC EDGAR",                  robotsTxtStatus: "respects",    tosPosture: "permissive",  allowed: "ALLOWED",  notes: "Official government open-data mandate. robots.txt allows full crawl. No ToS restriction." },
  { source: "House/Senate eFD",           robotsTxtStatus: "respects",    tosPosture: "permissive",  allowed: "ALLOWED",  notes: "STOCK Act mandates public access. Official government portal." },
  { source: "USASpending / SAM.gov",      robotsTxtStatus: "respects",    tosPosture: "permissive",  allowed: "ALLOWED",  notes: "Federal government open-data. Official API with registered key." },
  { source: "Senate LDA",                 robotsTxtStatus: "respects",    tosPosture: "permissive",  allowed: "ALLOWED",  notes: "Public lobby disclosures. Polite crawl within rate limits." },
  { source: "FEC",                        robotsTxtStatus: "respects",    tosPosture: "permissive",  allowed: "ALLOWED",  notes: "FEC open API. All campaign finance data is public record." },
  { source: "USPTO PatentsView",          robotsTxtStatus: "respects",    tosPosture: "permissive",  allowed: "ALLOWED",  notes: "Official USPTO bulk data API. Open government data." },
  { source: "GDELT Project",              robotsTxtStatus: "respects",    tosPosture: "permissive",  allowed: "ALLOWED",  notes: "Openly licensed news event dataset. Full reuse permitted." },
  { source: "Wikimedia Pageviews",        robotsTxtStatus: "respects",    tosPosture: "permissive",  allowed: "ALLOWED",  notes: "Wikimedia REST API. CC-BY license. Rate limit respected." },
  { source: "App Store Listings",         robotsTxtStatus: "respects",    tosPosture: "permissive",  allowed: "ALLOWED",  notes: "Public iTunes RSS feed. No ToS prohibition on aggregate signals." },
  { source: "Common Crawl",               robotsTxtStatus: "respects",    tosPosture: "permissive",  allowed: "ALLOWED",  notes: "Pre-crawled; CC respects robots.txt at crawl time. Open data." },
  { source: "Wayback Machine",            robotsTxtStatus: "respects",    tosPosture: "permissive",  allowed: "ALLOWED",  notes: "Official CDX API. Polite 1 req/s. Exclusion requests honored." },
  { source: "Quiver Quant API",           robotsTxtStatus: "respects",    tosPosture: "permissive",  allowed: "ALLOWED",  notes: "Licensed API (Trader tier). Contractually permitted use." },
  { source: "LinkedIn",                   robotsTxtStatus: "disallows",   tosPosture: "prohibited",  allowed: "BLOCKED",  notes: "robots.txt disallows /jobs, /company, /in. ToS §8.2 prohibits scraping. MUST license via LinkedIn Data Partnership." },
  { source: "Glassdoor",                  robotsTxtStatus: "disallows",   tosPosture: "prohibited",  allowed: "BLOCKED",  notes: "Anti-scraping ToS. robots.txt disallows bots. Requires official Glassdoor Open API license." },
  { source: "Bloomberg Terminal",         robotsTxtStatus: "no-file",     tosPosture: "prohibited",  allowed: "BLOCKED",  notes: "Subscriber-only; extracting data violates license. Must subscribe and use official API/BPIPE." },
  { source: "Paywalled News (WSJ/FT)",    robotsTxtStatus: "disallows",   tosPosture: "prohibited",  allowed: "BLOCKED",  notes: "Paywall circumvention prohibited. ToS prohibits scraping. Must license NewsWire or official API." },
];

export const GOVERNANCE_KPI = {
  sourcesPermitted: PERMISSION_REGISTRY.filter((r) => r.allowed === "ALLOWED").length,
  sourcesBlocked: PERMISSION_REGISTRY.filter((r) => r.allowed === "BLOCKED").length,
  mnpiQuarantined: 2,
  piiFieldsMinimized: 14,
  datasetsLicensed: 1,
};

export type MnpiItem = {
  id: string;
  entity: string;
  eventType: string;
  flaggedAt: string;
  reason: string;
  status: "quarantined" | "cleared" | "escalated";
  auditUser: string;
};

export const MNPI_QUEUE: MnpiItem[] = [
  {
    id: "MNPI-2025-0031",
    entity: "NVDA",
    eventType: "supply-chain",
    flaggedAt: "2025-06-06 09:42:31",
    reason: "Document references unannounced capacity commitment. Flagged by MNPI classifier (conf 0.91). Held pending compliance review.",
    status: "quarantined",
    auditUser: "system:mnpi-classifier",
  },
  {
    id: "MNPI-2025-0028",
    entity: "AMZN",
    eventType: "M&A",
    flaggedAt: "2025-06-05 16:11:04",
    reason: "Third-party rumor referencing deal term not in public filings. Low confidence (0.63) but held per precautionary policy.",
    status: "quarantined",
    auditUser: "system:mnpi-classifier",
  },
  {
    id: "MNPI-2025-0024",
    entity: "LMT",
    eventType: "guidance",
    flaggedAt: "2025-06-04 10:08:22",
    reason: "Revenue guidance cited in source pre-dates earnings release. Cleared after verifying document is publicly filed 8-K.",
    status: "cleared",
    auditUser: "compliance@pantheon",
  },
];

export type PiiField = {
  field: string;
  source: string;
  action: "not-collected" | "anonymized" | "aggregated" | "deleted-after-30d";
  basis: string;
};

export const PII_FIELDS: PiiField[] = [
  { field: "Congressional member name",       source: "STOCK Act eFD",      action: "not-collected",      basis: "Name is PIT-necessary for signal; retained as part of public record. No PII minimization required — this is an official public disclosure." },
  { field: "Individual transaction amounts",  source: "STOCK Act eFD",      action: "aggregated",         basis: "Only aggregate cluster metrics retained; individual amounts in archive with restricted access." },
  { field: "Insider officer PII",            source: "SEC Form 4",         action: "not-collected",       basis: "Name is public record per SEC disclosure rules. No minimization required." },
  { field: "Campaign donor names",            source: "FEC",                action: "aggregated",          basis: "Only aggregate spend by committee retained for signal. Individual donor rows not processed." },
  { field: "IP address / User agents",        source: "Web crawl headers",  action: "not-collected",       basis: "Headers not retained post-parsing. No individual tracking." },
  { field: "Job applicant profiles",          source: "N/A — BLOCKED",      action: "not-collected",       basis: "LinkedIn/Glassdoor blocked at source; no individual applicant data is ever collected." },
  { field: "Consumer transaction records",    source: "YipitData (INACTIVE)", action: "not-collected",     basis: "Panel license not provisioned. No individual transaction data in the lake." },
  { field: "EU/UK resident data",             source: "GDELT (global news)", action: "aggregated",          basis: "Entity-level only; no individual identification. GDPR Art. 6(1)(f) legitimate interest basis applied." },
];

export type LicenseRow = {
  dataset: string;
  licenseMode: string;
  monthlyCostUsd: number;
  dataProvider: string;
  active: boolean;
  notes: string;
};

export const LICENSE_MANAGER: LicenseRow[] = [
  { dataset: "Quiver Quant (Congressional + Insider)", licenseMode: "Freemium API — Trader tier", monthlyCostUsd: 75,    dataProvider: "Quiver Quant",     active: true,  notes: "500 req/day. Upgrade to Institution tier for higher rate limits." },
  { dataset: "Thinknum (Jobs + Web Traffic)",          licenseMode: "1-seat subscription",        monthlyCostUsd: 1_400, dataProvider: "Thinknum",         active: true,  notes: "1 seat. Consider per-ticker API upgrade for higher coverage." },
  { dataset: "YipitData (Card Panel)",                 licenseMode: "Not provisioned",            monthlyCostUsd: 0,     dataProvider: "YipitData",        active: false, notes: "INACTIVE. Est. $8–12K/mo for core panel. Using free demand proxies in the interim." },
  { dataset: "Databento (Equities MBO/L3)",            licenseMode: "Not provisioned",            monthlyCostUsd: 0,     dataProvider: "Databento",        active: false, notes: "INACTIVE. Optional upgrade for L3 equities flow. ~$500/mo entry tier." },
  { dataset: "LinkedIn Data Partnership",              licenseMode: "BLOCKED — requires license", monthlyCostUsd: 0,     dataProvider: "LinkedIn / MSFT",  active: false, notes: "BLOCKED until licensed. Do not attempt to scrape. Contact LinkedIn Sales." },
  { dataset: "All free/public sources",                licenseMode: "Public domain / official API",monthlyCostUsd: 0,    dataProvider: "Various govts",    active: true,  notes: "EDGAR, FRED, GDELT, USPTO, FEC, LDA, USASpending, Wikimedia, App Store, Wayback, Common Crawl." },
];
