/**
 * ATLAS Platform & Ops — data for secmaster, identity/vault, and orchestration pages.
 * All series are deterministically generated via Rng (no Math.random() at render scope).
 */
import { Rng, priceWalk } from "@/lib/rng";

/* ════════════════════════════════════════════════════════════════
   SECURITY MASTER / REFERENCE DATA
   ════════════════════════════════════════════════════════════════ */

const smRng = new Rng("secmaster-v1");

export const SECMASTER_KPIS = {
  instruments: 487_312,
  issuers: 84_621,
  identifiersMapped: 2_914_008,
  exchanges: 48,
  calendars: 61,
  lastFullRefresh: "2026-06-08 04:00 UTC",
  pitSnapshotsStored: 1_840,
  corpActionsThisMonth: smRng.int(140, 180),
};

/* ── Instrument resolution result ──────────────────────────────── */

export interface InstrumentId {
  type: string;
  value: string;
  source: string;
}

export interface ResolvedInstrument {
  canonicalId: string;
  name: string;
  status: "active" | "delisted" | "suspended";
  assetClass: string;
  sector: string;
  country: string;
  currency: string;
  exchange: string;
  exchangeLocal: string;
  identifiers: InstrumentId[];
  marketCap: number;
  listDate: string;
  firstTradeDate: string;
}

export const NVDA_RESOLVED: ResolvedInstrument = {
  canonicalId: "INST-US-0001030990",
  name: "NVIDIA Corporation",
  status: "active",
  assetClass: "Equity",
  sector: "Semiconductors",
  country: "US",
  currency: "USD",
  exchange: "NASDAQ",
  exchangeLocal: "XNAS",
  marketCap: 2_740_000_000_000,
  listDate: "1999-01-22",
  firstTradeDate: "1999-01-22",
  identifiers: [
    { type: "Ticker",        value: "NVDA",         source: "NASDAQ" },
    { type: "CUSIP",         value: "67066G104",    source: "DTCC" },
    { type: "ISIN",          value: "US67066G1040", source: "CUSIP Global" },
    { type: "FIGI",          value: "BBG000BBJQV0", source: "OpenFIGI" },
    { type: "Sedol",         value: "2379504",      source: "London SE" },
    { type: "Exchange-Local",value: "NVDA:XNAS",    source: "MIC Registry" },
    { type: "LEI",           value: "5493007UN3ED03M7T9Z1", source: "GLEIF" },
    { type: "CIK",           value: "0001045810",   source: "SEC EDGAR" },
    { type: "PermID",        value: "4295907552",   source: "Refinitiv" },
  ],
};

/* ── PIT Universe & History ─────────────────────────────────────── */

export interface PitEvent {
  canonicalId: string;
  sym: string;
  event: string;
  description: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  prevValue: string;
  newValue: string;
  type: "ticker-change" | "merger" | "split" | "delisting" | "redomicile" | "spin-off";
}

export const PIT_EVENTS: PitEvent[] = [
  {
    canonicalId: "INST-US-1326801",
    sym: "META",
    event: "Ticker Change",
    description: "Facebook Inc. renamed Meta Platforms, Inc.; ticker changed",
    effectiveFrom: "2021-10-28",
    effectiveTo: null,
    prevValue: "FB",
    newValue: "META",
    type: "ticker-change",
  },
  {
    canonicalId: "INST-US-0001045810",
    sym: "NVDA",
    event: "Forward Split 10:1",
    description: "NVIDIA 10-for-1 stock split; all historical prices adjusted",
    effectiveFrom: "2024-06-10",
    effectiveTo: null,
    prevValue: "1 share",
    newValue: "10 shares",
    type: "split",
  },
  {
    canonicalId: "INST-US-0001652044",
    sym: "GOOGL",
    event: "Forward Split 20:1",
    description: "Alphabet 20-for-1 stock split",
    effectiveFrom: "2022-07-18",
    effectiveTo: null,
    prevValue: "1 share",
    newValue: "20 shares",
    type: "split",
  },
  {
    canonicalId: "INST-US-0000019617",
    sym: "JPM",
    event: "Merger Absorption",
    description: "Bear Stearns merged into JPMorgan Chase",
    effectiveFrom: "2008-05-30",
    effectiveTo: null,
    prevValue: "BSC (INST-US-0000014272)",
    newValue: "JPM (INST-US-0000019617)",
    type: "merger",
  },
  {
    canonicalId: "INST-US-0001579982",
    sym: "—",
    event: "Delisting",
    description: "Bed Bath & Beyond delisted after Chapter 11 bankruptcy filing",
    effectiveFrom: "2023-04-26",
    effectiveTo: null,
    prevValue: "BBBY (active)",
    newValue: "BBBYQ (OTC, delisted)",
    type: "delisting",
  },
  {
    canonicalId: "INST-US-0000724606",
    sym: "GE",
    event: "Ticker Re-use / Reallocation",
    description: "GE Vernova spun off; original GE renamed GE Aerospace",
    effectiveFrom: "2024-04-02",
    effectiveTo: null,
    prevValue: "GE → General Electric",
    newValue: "GE → GE Aerospace / GEV → GE Vernova",
    type: "spin-off",
  },
  {
    canonicalId: "INST-US-0000202058",
    sym: "WBA",
    event: "Ticker Change",
    description: "Walgreens Boots Alliance changed ticker from WBA to WBA (same) but redomiciled after going private",
    effectiveFrom: "2024-12-16",
    effectiveTo: null,
    prevValue: "WBA (NASDAQ public)",
    newValue: "WBA (delisted — private)",
    type: "delisting",
  },
  {
    canonicalId: "INST-US-0000093410",
    sym: "CI",
    event: "Spin-off",
    description: "Cigna spun off Evernorth Health Services segment",
    effectiveFrom: "2022-01-01",
    effectiveTo: null,
    prevValue: "CI (Cigna)",
    newValue: "CI + EVH (Evernorth stub)",
    type: "spin-off",
  },
];

/* ── Corporate Actions Reference ───────────────────────────────── */

export interface CorpAction {
  id: string;
  sym: string;
  name: string;
  actionType: "split" | "dividend" | "merger" | "spin-off" | "rights";
  exDate: string;
  payDate: string | null;
  ratio: string;
  adjFactor: number;
  status: "confirmed" | "pending" | "cancelled";
}

const caRng = new Rng("corp-actions-v1");

export const CORP_ACTIONS: CorpAction[] = [
  { id: "CA-2024-8841", sym: "NVDA",  name: "NVIDIA Corporation",        actionType: "split",     exDate: "2024-06-10", payDate: "2024-06-12", ratio: "10:1",      adjFactor: 0.1000, status: "confirmed" },
  { id: "CA-2022-7722", sym: "GOOGL", name: "Alphabet Inc.",              actionType: "split",     exDate: "2022-07-18", payDate: "2022-07-20", ratio: "20:1",      adjFactor: 0.0500, status: "confirmed" },
  { id: "CA-2026-9901", sym: "AAPL",  name: "Apple Inc.",                 actionType: "dividend",  exDate: "2026-05-09", payDate: "2026-05-15", ratio: "$0.25/shr", adjFactor: 1.0000, status: "confirmed" },
  { id: "CA-2026-9902", sym: "MSFT",  name: "Microsoft Corporation",      actionType: "dividend",  exDate: "2026-05-15", payDate: "2026-06-12", ratio: "$0.75/shr", adjFactor: 1.0000, status: "confirmed" },
  { id: "CA-2026-9912", sym: "JPM",   name: "JPMorgan Chase & Co.",       actionType: "dividend",  exDate: "2026-07-03", payDate: "2026-07-31", ratio: "$1.35/shr", adjFactor: 1.0000, status: "pending"   },
  { id: "CA-2024-7100", sym: "GE",    name: "GE Vernova Inc.",            actionType: "spin-off",  exDate: "2024-04-02", payDate: "2024-04-02", ratio: "1 GEV:4 GE", adjFactor: 0.7200, status: "confirmed" },
  { id: "CA-2026-9930", sym: "AMZN",  name: "Amazon.com Inc.",            actionType: "dividend",  exDate: "2026-06-20", payDate: "2026-06-26", ratio: "$0.10/shr", adjFactor: 1.0000, status: "pending"   },
  { id: "CA-2025-8810", sym: "TSM",   name: "Taiwan Semiconductor Mfg",  actionType: "rights",    exDate: "2025-11-14", payDate: "2025-11-28", ratio: "1:10 @ TWD 10", adjFactor: 0.9900, status: "confirmed" },
  { id: "CA-2026-9940", sym: "MRK",   name: "Merck & Co., Inc.",         actionType: "dividend",  exDate: "2026-09-12", payDate: "2026-10-07", ratio: "$0.77/shr", adjFactor: 1.0000, status: "pending"   },
];

/* ── Trading Calendars & Market Hours ──────────────────────────── */

export interface ExchangeCalendar {
  mic: string;
  name: string;
  city: string;
  tz: string;
  open: string;       // local HH:MM
  close: string;      // local HH:MM
  openUtc: string;
  closeUtc: string;
  todayStatus: "open" | "closed" | "half-day" | "pre-open";
  nextHoliday: string;
  nextHolidayDate: string;
  assetClasses: string[];
}

export const EXCHANGE_CALENDARS: ExchangeCalendar[] = [
  {
    mic: "XNYS", name: "NYSE",         city: "New York",  tz: "America/New_York",
    open: "09:30", close: "16:00", openUtc: "13:30", closeUtc: "20:00",
    todayStatus: "closed", nextHoliday: "Independence Day",    nextHolidayDate: "2026-07-04",
    assetClasses: ["Equity", "ETF"],
  },
  {
    mic: "XNAS", name: "NASDAQ",       city: "New York",  tz: "America/New_York",
    open: "09:30", close: "16:00", openUtc: "13:30", closeUtc: "20:00",
    todayStatus: "closed", nextHoliday: "Independence Day",    nextHolidayDate: "2026-07-04",
    assetClasses: ["Equity", "ETF", "Options"],
  },
  {
    mic: "XCME", name: "CME",          city: "Chicago",   tz: "America/Chicago",
    open: "17:00", close: "16:00", openUtc: "22:00", closeUtc: "21:00",
    todayStatus: "open", nextHoliday: "Independence Day",      nextHolidayDate: "2026-07-04",
    assetClasses: ["Futures", "Options", "FX"],
  },
  {
    mic: "XCBO", name: "CBOE",         city: "Chicago",   tz: "America/Chicago",
    open: "08:30", close: "15:15", openUtc: "13:30", closeUtc: "20:15",
    todayStatus: "closed", nextHoliday: "Independence Day",    nextHolidayDate: "2026-07-04",
    assetClasses: ["Options", "VIX"],
  },
  {
    mic: "XLON", name: "LSE",          city: "London",    tz: "Europe/London",
    open: "08:00", close: "16:30", openUtc: "07:00", closeUtc: "15:30",
    todayStatus: "closed", nextHoliday: "Summer Bank Holiday", nextHolidayDate: "2026-08-31",
    assetClasses: ["Equity", "ETF", "Bonds"],
  },
  {
    mic: "XETR", name: "XETRA",        city: "Frankfurt", tz: "Europe/Berlin",
    open: "09:00", close: "17:30", openUtc: "07:00", closeUtc: "15:30",
    todayStatus: "closed", nextHoliday: "German Unity Day",    nextHolidayDate: "2026-10-03",
    assetClasses: ["Equity", "ETF"],
  },
  {
    mic: "XTKS", name: "TSE (Prime)",  city: "Tokyo",     tz: "Asia/Tokyo",
    open: "09:00", close: "15:30", openUtc: "00:00", closeUtc: "06:30",
    todayStatus: "closed", nextHoliday: "Marine Day",          nextHolidayDate: "2026-07-20",
    assetClasses: ["Equity", "ETF"],
  },
  {
    mic: "CRYPTO", name: "Crypto 24/7", city: "Global",   tz: "UTC",
    open: "00:00", close: "23:59", openUtc: "00:00", closeUtc: "23:59",
    todayStatus: "open", nextHoliday: "—",                     nextHolidayDate: "—",
    assetClasses: ["Crypto", "Perpetuals", "Spot"],
  },
];

/* ── Entity Resolution API Note ─────────────────────────────────── */
export const ENTITY_RESOLUTION_CONSUMERS = [
  { service: "ARGUS",    usage: "Resolve ticker/ISIN in news events → canonical instrument_id for signal enrichment" },
  { service: "OBSIDIAN", usage: "Map incoming vendor ticks (multiple symbologies) → canonical bars/quotes" },
  { service: "KEPLER",   usage: "Align strategy universe definitions across broker and data symbologies" },
  { service: "HELIOS",   usage: "Attribution, P&L, and reporting require canonical instrument for all positions" },
  { service: "AEGIS",    usage: "Pre-trade checks resolve broker symbols to canonical risk limits" },
];


/* ════════════════════════════════════════════════════════════════
   IDENTITY, AUTH & SECRETS VAULT
   ════════════════════════════════════════════════════════════════ */

const idRng = new Rng("identity-vault-v1");

export const IDENTITY_KPIS = {
  totalUsers: 47,
  activeRoles: 7,
  activeSessions: idRng.int(11, 18),
  secretsStored: 84,
  lastRotation: "2026-06-07 02:00 UTC",
  nextRotation: "2026-06-14 02:00 UTC",
  mfaEnrolled: 47,
  ssoProvider: "Okta (SAML 2.0 + OIDC)",
};

/* ── SSO + RBAC Matrix ──────────────────────────────────────────── */

export interface RbacScope {
  id: string;
  label: string;
  description: string;
}

export const RBAC_SCOPES: RbacScope[] = [
  { id: "read:market",   label: "read:market",   description: "Read live/historical market data" },
  { id: "read:signals",  label: "read:signals",  description: "Read signal outputs and factor scores" },
  { id: "write:order",   label: "write:order",   description: "Submit, amend, cancel orders via AEGIS" },
  { id: "read:risk",     label: "read:risk",     description: "Read risk metrics, breach alerts" },
  { id: "read:audit",    label: "read:audit",    description: "Read audit log and access history" },
  { id: "write:config",  label: "write:config",  description: "Modify system config, limits, schedules" },
  { id: "admin:secrets", label: "admin:secrets", description: "Create/rotate Vault secrets" },
  { id: "exec:kill",     label: "exec:kill",     description: "Arm / trigger kill-switch" },
];

export interface RoleMatrix {
  role: string;
  scopes: Record<string, boolean>;
  userCount: number;
  mfa: boolean;
  sso: boolean;
}

export const ROLE_MATRIX: RoleMatrix[] = [
  { role: "Admin",      scopes: { "read:market": true,  "read:signals": true,  "write:order": true,  "read:risk": true,  "read:audit": true,  "write:config": true,  "admin:secrets": true,  "exec:kill": true  }, userCount: 2,  mfa: true,  sso: true  },
  { role: "PM",         scopes: { "read:market": true,  "read:signals": true,  "write:order": true,  "read:risk": true,  "read:audit": true,  "write:config": false, "admin:secrets": false, "exec:kill": false }, userCount: 4,  mfa: true,  sso: true  },
  { role: "Trader",     scopes: { "read:market": true,  "read:signals": true,  "write:order": true,  "read:risk": true,  "read:audit": false, "write:config": false, "admin:secrets": false, "exec:kill": false }, userCount: 8,  mfa: true,  sso: true  },
  { role: "Quant",      scopes: { "read:market": true,  "read:signals": true,  "write:order": false, "read:risk": true,  "read:audit": false, "write:config": false, "admin:secrets": false, "exec:kill": false }, userCount: 11, mfa: true,  sso: true  },
  { role: "Risk",       scopes: { "read:market": true,  "read:signals": true,  "write:order": false, "read:risk": true,  "read:audit": true,  "write:config": false, "admin:secrets": false, "exec:kill": true  }, userCount: 5,  mfa: true,  sso: true  },
  { role: "Compliance", scopes: { "read:market": true,  "read:signals": false, "write:order": false, "read:risk": true,  "read:audit": true,  "write:config": false, "admin:secrets": false, "exec:kill": false }, userCount: 6,  mfa: true,  sso: true  },
  { role: "ReadOnly",   scopes: { "read:market": true,  "read:signals": true,  "write:order": false, "read:risk": false, "read:audit": false, "write:config": false, "admin:secrets": false, "exec:kill": false }, userCount: 11, mfa: false, sso: true  },
];

/* ── Secrets Vault ──────────────────────────────────────────────── */

export interface VaultSecret {
  path: string;
  secretType: "broker-key" | "data-provider-key" | "db-cred" | "signing-key" | "oauth-secret" | "mtls-cert";
  description: string;
  lastRotated: string;
  ttlDays: number;
  status: "active" | "expiring-soon" | "expired" | "rotation-pending";
  consumers: string[];
}

export const VAULT_SECRETS: VaultSecret[] = [
  { path: "secret/prod/broker/alpaca/api-key",         secretType: "broker-key",        description: "Alpaca live trading API key",               lastRotated: "2026-05-01", ttlDays: 90,  status: "active",           consumers: ["AEGIS"] },
  { path: "secret/prod/broker/ibkr/client-secret",     secretType: "broker-key",        description: "IBKR TWS gateway credentials",              lastRotated: "2026-04-15", ttlDays: 90,  status: "active",           consumers: ["AEGIS"] },
  { path: "secret/prod/data/polygon/api-key",          secretType: "data-provider-key", description: "Polygon.io REST + WS key",                  lastRotated: "2026-04-01", ttlDays: 90,  status: "expiring-soon",    consumers: ["OBSIDIAN"] },
  { path: "secret/prod/data/refinitiv/app-key",        secretType: "data-provider-key", description: "Refinitiv Eikon application key",           lastRotated: "2026-03-01", ttlDays: 60,  status: "expiring-soon",    consumers: ["OBSIDIAN", "ARGUS"] },
  { path: "secret/prod/data/quiverquant/api-key",      secretType: "data-provider-key", description: "QuiverQuant alternative data key",          lastRotated: "2026-05-10", ttlDays: 365, status: "active",           consumers: ["ARGUS"] },
  { path: "secret/prod/db/postgres/atlas-main",        secretType: "db-cred",           description: "Atlas primary Postgres credentials",        lastRotated: "2026-06-01", ttlDays: 30,  status: "active",           consumers: ["ATLAS", "OBSIDIAN", "AEGIS"] },
  { path: "secret/prod/db/postgres/kepler-strategies", secretType: "db-cred",           description: "Kepler strategy store DB credentials",      lastRotated: "2026-06-01", ttlDays: 30,  status: "active",           consumers: ["KEPLER"] },
  { path: "secret/prod/db/redis/cache",                secretType: "db-cred",           description: "Redis cluster auth token",                  lastRotated: "2026-05-25", ttlDays: 14,  status: "active",           consumers: ["ATLAS", "OBSIDIAN", "KEPLER"] },
  { path: "secret/prod/signing/jwt-private-key",       secretType: "signing-key",       description: "RS256 JWT signing key — service auth",      lastRotated: "2026-05-15", ttlDays: 30,  status: "active",           consumers: ["ATLAS-identity"] },
  { path: "secret/prod/signing/audit-hmac",            secretType: "signing-key",       description: "HMAC key for audit-log tamper detection",   lastRotated: "2026-05-15", ttlDays: 30,  status: "active",           consumers: ["ATLAS-audit"] },
  { path: "secret/prod/sso/okta/client-secret",        secretType: "oauth-secret",      description: "Okta OIDC client secret",                   lastRotated: "2026-01-01", ttlDays: 180, status: "expiring-soon",    consumers: ["ATLAS-identity"] },
  { path: "secret/prod/mtls/aegis-kepler.cert",        secretType: "mtls-cert",         description: "mTLS client cert — KEPLER → AEGIS channel", lastRotated: "2026-05-01", ttlDays: 90,  status: "active",           consumers: ["KEPLER", "AEGIS"] },
  { path: "secret/prod/data/finnhub/api-key",          secretType: "data-provider-key", description: "Finnhub news & events API key",             lastRotated: "2026-05-20", ttlDays: 365, status: "active",           consumers: ["ARGUS"] },
];

/* ── Access Audit Log ───────────────────────────────────────────── */

export interface AuditEntry {
  id: string;
  actor: string;
  role: string;
  secretPath: string;
  action: "read" | "renew" | "rotate" | "create" | "revoke";
  result: "allow" | "deny";
  ts: string;
}

export const ACCESS_AUDIT: AuditEntry[] = [
  { id: "aud-19041", actor: "svc-aegis",       role: "System",     secretPath: "secret/prod/broker/alpaca/api-key",    action: "read",   result: "allow", ts: "2026-06-08 09:14:02 UTC" },
  { id: "aud-19040", actor: "svc-obsidian",    role: "System",     secretPath: "secret/prod/data/polygon/api-key",     action: "read",   result: "allow", ts: "2026-06-08 09:13:58 UTC" },
  { id: "aud-19039", actor: "j.harris",        role: "Admin",      secretPath: "secret/prod/signing/jwt-private-key",  action: "rotate", result: "allow", ts: "2026-06-07 02:00:11 UTC" },
  { id: "aud-19038", actor: "vault-agent",     role: "System",     secretPath: "secret/prod/db/redis/cache",           action: "renew",  result: "allow", ts: "2026-06-06 14:00:00 UTC" },
  { id: "aud-19037", actor: "m.chen",          role: "Compliance", secretPath: "secret/prod/db/postgres/atlas-main",   action: "read",   result: "deny",  ts: "2026-06-05 16:44:33 UTC" },
  { id: "aud-19036", actor: "svc-kepler",      role: "System",     secretPath: "secret/prod/db/postgres/kepler-strategies", action: "read", result: "allow", ts: "2026-06-05 09:02:17 UTC" },
  { id: "aud-19035", actor: "a.patel",         role: "Admin",      secretPath: "secret/prod/sso/okta/client-secret",   action: "rotate", result: "allow", ts: "2026-06-01 03:00:00 UTC" },
  { id: "aud-19034", actor: "svc-atlas-audit", role: "System",     secretPath: "secret/prod/signing/audit-hmac",       action: "renew",  result: "allow", ts: "2026-06-01 00:00:05 UTC" },
];

/* ── Service-to-service auth note ───────────────────────────────── */
export const S2S_AUTH_NOTES = [
  { from: "KEPLER",   to: "AEGIS",     method: "mTLS",          note: "Client cert from Vault; rotated every 90d" },
  { from: "KEPLER",   to: "OBSIDIAN",  method: "JWT (short-lived)", note: "1-hour token; issued by ATLAS-identity" },
  { from: "ARGUS",    to: "OBSIDIAN",  method: "JWT (short-lived)", note: "Pulled at startup; auto-renewed" },
  { from: "HELIOS",   to: "AEGIS",     method: "mTLS",          note: "Dedicated leaf cert per service pair" },
  { from: "OBSIDIAN", to: "ATLAS-bus", method: "NATS creds",    note: "NKey seed from Vault; TTL 24h" },
  { from: "All",      to: "ATLAS-audit", method: "HMAC",        note: "Shared audit HMAC key; read-only emission" },
];


/* ════════════════════════════════════════════════════════════════
   ORCHESTRATION & SCHEDULING (Dagster)
   ════════════════════════════════════════════════════════════════ */

const orchRng = new Rng("orchestration-v1");

export const ORCH_KPIS = {
  softwareAssets: 142,
  scheduledJobs: 24,
  runsToday: orchRng.int(38, 52),
  successRate: 97.8,
  avgRuntimeSec: 184,
  lastFailure: "kepler-model-retrain",
  lastFailureTs: "2026-06-07 22:41 UTC",
  dagsterVersion: "1.9.2",
};

/* ── DAG Nodes ──────────────────────────────────────────────────── */

export type DagNodeStatus = "materialized" | "running" | "failed" | "pending" | "skipped";

export interface DagNode {
  id: string;
  label: string;
  sub: string;
  status: DagNodeStatus;
  lastRunDuration: string;
  lastRunAt: string;
  owner: string;
  group: string;
  x: number;  // percentage-based layout coords
  y: number;
}

export interface DagEdge {
  from: string;
  to: string;
}

export const DAG_NODES: DagNode[] = [
  { id: "secmaster-refresh",    label: "secmaster-refresh",    sub: "ATLAS / SecMaster",      status: "materialized", lastRunDuration: "4m 12s", lastRunAt: "2026-06-08 04:04 UTC", owner: "atlas",    group: "platform",   x: 5,  y: 40 },
  { id: "argus-ingest-sweep",   label: "argus-ingest-sweep",   sub: "ARGUS / Alt-data",       status: "materialized", lastRunDuration: "7m 38s", lastRunAt: "2026-06-08 04:08 UTC", owner: "argus",    group: "ingestion",  x: 5,  y: 70 },
  { id: "eod-processing",       label: "eod-processing",       sub: "OBSIDIAN / Market data", status: "materialized", lastRunDuration: "18m 02s", lastRunAt: "2026-06-08 04:22 UTC", owner: "obsidian", group: "processing", x: 32, y: 25 },
  { id: "kepler-model-retrain", label: "kepler-model-retrain", sub: "KEPLER / Models",        status: "failed",       lastRunDuration: "2m 11s",  lastRunAt: "2026-06-07 22:41 UTC", owner: "kepler",   group: "ml",         x: 32, y: 60 },
  { id: "nightly-backups",      label: "nightly-backups",      sub: "ATLAS / Infra",          status: "materialized", lastRunDuration: "11m 44s", lastRunAt: "2026-06-08 03:45 UTC", owner: "atlas",    group: "platform",   x: 32, y: 82 },
  { id: "reconciliation",       label: "reconciliation",       sub: "AEGIS / Positions",      status: "materialized", lastRunDuration: "6m 55s",  lastRunAt: "2026-06-08 04:41 UTC", owner: "aegis",    group: "processing", x: 60, y: 25 },
  { id: "report-gen",           label: "report-gen",           sub: "HELIOS / Reports",       status: "running",      lastRunDuration: "—",       lastRunAt: "2026-06-08 09:02 UTC", owner: "helios",   group: "reporting",  x: 85, y: 40 },
];

export const DAG_EDGES: DagEdge[] = [
  { from: "secmaster-refresh",    to: "eod-processing" },
  { from: "secmaster-refresh",    to: "kepler-model-retrain" },
  { from: "argus-ingest-sweep",   to: "eod-processing" },
  { from: "eod-processing",       to: "reconciliation" },
  { from: "kepler-model-retrain", to: "reconciliation" },
  { from: "reconciliation",       to: "report-gen" },
  { from: "eod-processing",       to: "report-gen" },
];

/* ── Schedules ──────────────────────────────────────────────────── */

export interface ScheduleRow {
  id: string;
  job: string;
  description: string;
  cron: string;
  cronHuman: string;
  lastRun: string;
  lastRunStatus: "success" | "failed" | "running";
  nextRun: string;
  slaMins: number;
  lastDurationSec: number;
  owner: string;
  status: "active" | "paused";
}

export const SCHEDULES: ScheduleRow[] = [
  { id: "sch-01", job: "secmaster-refresh",       description: "Refresh reference data from all providers",  cron: "0 4 * * *",    cronHuman: "Daily 04:00 UTC", lastRun: "2026-06-08 04:00", lastRunStatus: "success", nextRun: "2026-06-09 04:00", slaMins: 20,  lastDurationSec: 252, owner: "atlas",    status: "active" },
  { id: "sch-02", job: "argus-ingest-sweep",      description: "Full alt-data ingestion sweep (NLP + web)",  cron: "0 4 * * *",    cronHuman: "Daily 04:00 UTC", lastRun: "2026-06-08 04:00", lastRunStatus: "success", nextRun: "2026-06-09 04:00", slaMins: 30,  lastDurationSec: 458, owner: "argus",    status: "active" },
  { id: "sch-03", job: "eod-processing",          description: "EOD bar generation, corp-action adjustments", cron: "30 4 * * *",   cronHuman: "Daily 04:30 UTC", lastRun: "2026-06-08 04:30", lastRunStatus: "success", nextRun: "2026-06-09 04:30", slaMins: 60,  lastDurationSec: 1082, owner: "obsidian", status: "active" },
  { id: "sch-04", job: "reconciliation",          description: "Position & cash reconciliation vs. prime",   cron: "0 5 * * *",    cronHuman: "Daily 05:00 UTC", lastRun: "2026-06-08 05:00", lastRunStatus: "success", nextRun: "2026-06-09 05:00", slaMins: 30,  lastDurationSec: 415, owner: "aegis",    status: "active" },
  { id: "sch-05", job: "report-gen",              description: "NAV, attribution, compliance reports",       cron: "0 9 * * 1-5",  cronHuman: "Weekdays 09:00 UTC", lastRun: "2026-06-08 09:02", lastRunStatus: "running", nextRun: "2026-06-09 09:00", slaMins: 45,  lastDurationSec: 0,   owner: "helios",   status: "active" },
  { id: "sch-06", job: "kepler-model-retrain",    description: "Nightly alpha model refit on EOD factors",   cron: "30 22 * * 1-5", cronHuman: "Weekdays 22:30 UTC", lastRun: "2026-06-07 22:30", lastRunStatus: "failed",  nextRun: "2026-06-08 22:30", slaMins: 90,  lastDurationSec: 131, owner: "kepler",   status: "active" },
  { id: "sch-07", job: "nightly-backups",         description: "DB + blob-store snapshot to S3",            cron: "45 3 * * *",   cronHuman: "Daily 03:45 UTC", lastRun: "2026-06-08 03:45", lastRunStatus: "success", nextRun: "2026-06-09 03:45", slaMins: 30,  lastDurationSec: 704, owner: "atlas",    status: "active" },
  { id: "sch-08", job: "vault-secret-rotation",   description: "Auto-rotate expiring Vault secrets",         cron: "0 2 * * 0",    cronHuman: "Sundays 02:00 UTC", lastRun: "2026-06-01 02:00", lastRunStatus: "success", nextRun: "2026-06-15 02:00", slaMins: 10,  lastDurationSec: 62,  owner: "atlas",    status: "active" },
  { id: "sch-09", job: "data-quality-checks",     description: "Cross-source OHLCV sanity checks",           cron: "0 6 * * *",    cronHuman: "Daily 06:00 UTC", lastRun: "2026-06-08 06:00", lastRunStatus: "success", nextRun: "2026-06-09 06:00", slaMins: 15,  lastDurationSec: 189, owner: "obsidian", status: "active" },
  { id: "sch-10", job: "audit-log-archive",        description: "Archive audit events older than 90d to S3", cron: "0 1 * * 0",    cronHuman: "Sundays 01:00 UTC", lastRun: "2026-06-01 01:00", lastRunStatus: "success", nextRun: "2026-06-15 01:00", slaMins: 20,  lastDurationSec: 234, owner: "atlas",    status: "active" },
];

/* ── Recent Runs ────────────────────────────────────────────────── */

export interface RunRow {
  runId: string;
  job: string;
  status: "success" | "failed" | "running";
  startedAt: string;
  durationSec: number | null;
  retries: number;
  triggeredBy: string;
}

export const RECENT_RUNS: RunRow[] = [
  { runId: "run-a0f3e", job: "report-gen",           status: "running", startedAt: "2026-06-08 09:02:14", durationSec: null, retries: 0, triggeredBy: "schedule:sch-05" },
  { runId: "run-b8d21", job: "data-quality-checks",  status: "success", startedAt: "2026-06-08 06:00:02", durationSec: 189,  retries: 0, triggeredBy: "schedule:sch-09" },
  { runId: "run-c2911", job: "eod-processing",        status: "success", startedAt: "2026-06-08 04:30:00", durationSec: 1082, retries: 0, triggeredBy: "schedule:sch-03" },
  { runId: "run-d7a44", job: "reconciliation",        status: "success", startedAt: "2026-06-08 05:00:01", durationSec: 415,  retries: 0, triggeredBy: "schedule:sch-04" },
  { runId: "run-e1f80", job: "secmaster-refresh",     status: "success", startedAt: "2026-06-08 04:00:00", durationSec: 252,  retries: 0, triggeredBy: "schedule:sch-01" },
  { runId: "run-f9c33", job: "argus-ingest-sweep",    status: "success", startedAt: "2026-06-08 04:00:00", durationSec: 458,  retries: 0, triggeredBy: "schedule:sch-02" },
  { runId: "run-g3b17", job: "nightly-backups",       status: "success", startedAt: "2026-06-08 03:45:00", durationSec: 704,  retries: 0, triggeredBy: "schedule:sch-07" },
  { runId: "run-h5e92", job: "kepler-model-retrain",  status: "failed",  startedAt: "2026-06-07 22:30:00", durationSec: 131,  retries: 2, triggeredBy: "schedule:sch-06" },
  { runId: "run-i2d56", job: "eod-processing",        status: "success", startedAt: "2026-06-07 04:30:00", durationSec: 1101, retries: 0, triggeredBy: "schedule:sch-03" },
  { runId: "run-j7a01", job: "reconciliation",        status: "success", startedAt: "2026-06-07 05:00:00", durationSec: 409,  retries: 0, triggeredBy: "schedule:sch-04" },
  { runId: "run-k4f28", job: "kepler-model-retrain",  status: "success", startedAt: "2026-06-06 22:30:00", durationSec: 3842, retries: 0, triggeredBy: "schedule:sch-06" },
  { runId: "run-l8b93", job: "data-quality-checks",   status: "success", startedAt: "2026-06-07 06:00:01", durationSec: 201,  retries: 0, triggeredBy: "schedule:sch-09" },
];

/* ── Backfills ──────────────────────────────────────────────────── */

export interface BackfillRow {
  id: string;
  job: string;
  dateRange: string;
  status: "running" | "complete" | "queued";
  progress: number;
  totalPartitions: number;
  donePartitions: number;
  triggeredBy: string;
  startedAt: string;
}

export const BACKFILLS: BackfillRow[] = [
  { id: "bf-0041", job: "eod-processing",       dateRange: "2025-01-01 → 2025-12-31", status: "complete", progress: 100, totalPartitions: 250, donePartitions: 250, triggeredBy: "a.patel",   startedAt: "2026-05-15 10:00 UTC" },
  { id: "bf-0042", job: "secmaster-refresh",    dateRange: "2025-06-01 → 2025-12-31", status: "complete", progress: 100, totalPartitions: 214, donePartitions: 214, triggeredBy: "j.harris",  startedAt: "2026-05-22 08:00 UTC" },
  { id: "bf-0043", job: "kepler-model-retrain", dateRange: "2026-01-01 → 2026-05-31", status: "running",  progress: 78,  totalPartitions: 109, donePartitions: 85,  triggeredBy: "ci-deploy", startedAt: "2026-06-07 18:00 UTC" },
];

/* ── Success rate sparkline ─────────────────────────────────────── */
export const ORCH_SUCCESS_SPARK = priceWalk("orch-success-v1", 30, 98, 0.005, 0.0002);
