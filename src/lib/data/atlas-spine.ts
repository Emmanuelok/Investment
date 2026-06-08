/**
 * ATLAS Platform Spine — shared data for all ATLAS pages.
 * All series are deterministically generated via Rng.
 */
import { Rng, priceWalk } from "@/lib/rng";

/* ── Services ─────────────────────────────────────────────────────────────── */

export type ServiceHealth = "healthy" | "degraded" | "incident";

export interface SpineService {
  id: string;
  name: string;
  tagline: string;
  version: string;
  health: ServiceHealth;
  uptimePct: number;
  reqPerSec: number;
  p99Ms: number;
  p50Ms: number;
  deps: string[];
  depStatus: "ok" | "warn" | "down";
  port: number;
  spark: number[];
}

const svcRng = new Rng("atlas-services-v1");

export const SPINE_SERVICES: SpineService[] = [
  {
    id: "obsidian",
    name: "OBSIDIAN",
    tagline: "Market data, signals & analytics engine",
    version: "2.4.1",
    health: "healthy",
    uptimePct: 99.97,
    reqPerSec: svcRng.float(420, 480),
    p99Ms: svcRng.float(18, 28),
    p50Ms: svcRng.float(4, 7),
    deps: ["ATLAS-bus", "ATLAS-identity", "ATLAS-contracts"],
    depStatus: "ok",
    port: 8001,
    spark: priceWalk("obs-spark", 24, 100, 0.012, 0.001),
  },
  {
    id: "aegis",
    name: "AEGIS",
    tagline: "Execution, risk & compliance gateway",
    version: "3.1.0",
    health: "healthy",
    uptimePct: 99.99,
    reqPerSec: svcRng.float(180, 220),
    p99Ms: svcRng.float(6, 12),
    p50Ms: svcRng.float(2, 4),
    deps: ["ATLAS-bus", "ATLAS-risk-master", "ATLAS-audit"],
    depStatus: "ok",
    port: 8002,
    spark: priceWalk("aeg-spark", 24, 100, 0.008, 0.0005),
  },
  {
    id: "argus",
    name: "ARGUS",
    tagline: "Alternative data & event detection",
    version: "1.9.3",
    health: "healthy",
    uptimePct: 99.91,
    reqPerSec: svcRng.float(90, 130),
    p99Ms: svcRng.float(32, 55),
    p50Ms: svcRng.float(9, 16),
    deps: ["ATLAS-bus", "ATLAS-contracts"],
    depStatus: "ok",
    port: 8003,
    spark: priceWalk("arg-spark", 24, 100, 0.015, 0.0),
  },
  {
    id: "kepler",
    name: "KEPLER",
    tagline: "Quant strategy & portfolio optimizer",
    version: "2.2.0",
    health: "healthy",
    uptimePct: 99.98,
    reqPerSec: svcRng.float(60, 90),
    p99Ms: svcRng.float(22, 40),
    p50Ms: svcRng.float(8, 14),
    deps: ["ATLAS-bus", "ATLAS-contracts", "ATLAS-identity"],
    depStatus: "ok",
    port: 8004,
    spark: priceWalk("kep-spark", 24, 100, 0.009, 0.0008),
  },
  {
    id: "helios",
    name: "HELIOS",
    tagline: "Portfolio analytics & reporting",
    version: "1.5.2",
    health: "healthy",
    uptimePct: 99.94,
    reqPerSec: svcRng.float(40, 65),
    p50Ms: svcRng.float(5, 10),
    p99Ms: svcRng.float(28, 45),
    deps: ["ATLAS-bus", "ATLAS-contracts"],
    depStatus: "ok",
    port: 8005,
    spark: priceWalk("hel-spark", 24, 100, 0.011, 0.0003),
  },
  {
    id: "atlas",
    name: "ATLAS",
    tagline: "Platform spine — bus, gateway, identity, audit",
    version: "4.0.0",
    health: "healthy",
    uptimePct: 99.999,
    reqPerSec: svcRng.float(1100, 1300),
    p99Ms: svcRng.float(3, 6),
    p50Ms: svcRng.float(1, 2),
    deps: ["Redis", "Postgres", "NATS-proxy"],
    depStatus: "ok",
    port: 8000,
    spark: priceWalk("atl-spark", 24, 100, 0.004, 0.001),
  },
];

/* ── KPIs ─────────────────────────────────────────────────────────────────── */

const kpiRng = new Rng("atlas-kpis-v1");

export const ATLAS_KPIS = {
  servicesUp: 6,
  servicesTotal: 6,
  eventsPerSec: kpiRng.float(4800, 5200),
  gatewayP99Ms: kpiRng.float(7.2, 9.8),
  errorBudgetPct: kpiRng.float(88, 94),
  auditEventsToday: kpiRng.int(1800, 2200),
  killSwitchArmed: false,
};

/* ── SLOs ─────────────────────────────────────────────────────────────────── */

export interface SloRow {
  name: string;
  target: number;
  current: number;
  budgetUsedPct: number;
  window: string;
  status: "ok" | "warn" | "breach";
}

const sloRng = new Rng("atlas-slos-v1");

export const ATLAS_SLOS: SloRow[] = [
  {
    name: "Gateway Availability",
    target: 99.9,
    current: 99.97,
    budgetUsedPct: sloRng.float(8, 14),
    window: "30d",
    status: "ok",
  },
  {
    name: "p99 Latency < 50 ms (all routes)",
    target: 99.5,
    current: 99.81,
    budgetUsedPct: sloRng.float(22, 35),
    window: "7d",
    status: "ok",
  },
  {
    name: "Event Bus Delivery (at-least-once)",
    target: 99.99,
    current: 99.992,
    budgetUsedPct: sloRng.float(40, 58),
    window: "30d",
    status: "warn",
  },
];

/* ── Event flow ───────────────────────────────────────────────────────────── */

export interface EventFlowEdge {
  from: string;
  to: string;
  topic: string;
  eventsPerSec: number;
  tone: "accent" | "pos" | "warn" | "info";
}

const efRng = new Rng("atlas-eventflow-v1");

export const EVENT_FLOW_EDGES: EventFlowEdge[] = [
  { from: "OBSIDIAN", to: "ATLAS-bus", topic: "market.bar / market.tick", eventsPerSec: efRng.float(1200, 1600), tone: "accent" },
  { from: "ARGUS", to: "ATLAS-bus", topic: "signal.updated / event.detected", eventsPerSec: efRng.float(80, 140), tone: "pos" },
  { from: "KEPLER", to: "ATLAS-bus", topic: "strategy.order_intent", eventsPerSec: efRng.float(20, 45), tone: "info" },
  { from: "AEGIS", to: "ATLAS-bus", topic: "order.accepted / order.filled / risk.breach", eventsPerSec: efRng.float(30, 60), tone: "warn" },
  { from: "HELIOS", to: "ATLAS-bus", topic: "order.intent", eventsPerSec: efRng.float(5, 15), tone: "pos" },
  { from: "ATLAS-bus", to: "OBSIDIAN", topic: "order.filled → position update", eventsPerSec: efRng.float(15, 25), tone: "accent" },
  { from: "ATLAS-bus", to: "AEGIS", topic: "strategy.order_intent → execution", eventsPerSec: efRng.float(20, 40), tone: "warn" },
  { from: "ATLAS-bus", to: "KEPLER", topic: "market.bar → model input", eventsPerSec: efRng.float(300, 500), tone: "info" },
  { from: "ATLAS-bus", to: "HELIOS", topic: "order.filled / position.updated", eventsPerSec: efRng.float(15, 25), tone: "pos" },
  { from: "ATLAS-bus", to: "ARGUS", topic: "market.bar → alt-data enrichment", eventsPerSec: efRng.float(200, 350), tone: "pos" },
];

/* ── Contracts ────────────────────────────────────────────────────────────── */

export interface ContractType {
  name: string;
  version: string;
  fields: number;
  consumers: string[];
  lastChange: string;
  breaking: boolean;
}

export const CANONICAL_TYPES: ContractType[] = [
  { name: "Security", version: "1.4.0", fields: 22, consumers: ["OBSIDIAN","AEGIS","ARGUS","KEPLER","HELIOS"], lastChange: "2025-11-14", breaking: false },
  { name: "Instrument", version: "1.3.2", fields: 18, consumers: ["OBSIDIAN","AEGIS","KEPLER","HELIOS"], lastChange: "2025-10-02", breaking: false },
  { name: "Identifier", version: "1.2.0", fields: 9, consumers: ["OBSIDIAN","AEGIS","ARGUS","KEPLER","HELIOS"], lastChange: "2025-09-18", breaking: false },
  { name: "Quote", version: "2.1.0", fields: 14, consumers: ["OBSIDIAN","AEGIS","KEPLER"], lastChange: "2025-12-01", breaking: false },
  { name: "OHLCVBar", version: "1.5.1", fields: 11, consumers: ["OBSIDIAN","KEPLER","HELIOS","ARGUS"], lastChange: "2025-11-29", breaking: false },
  { name: "OrderBook", version: "1.1.0", fields: 8, consumers: ["OBSIDIAN","AEGIS"], lastChange: "2025-08-11", breaking: false },
  { name: "Trade", version: "2.0.0", fields: 16, consumers: ["AEGIS","HELIOS","KEPLER"], lastChange: "2025-12-05", breaking: true },
  { name: "Order", version: "3.2.1", fields: 28, consumers: ["AEGIS","KEPLER","HELIOS"], lastChange: "2025-12-08", breaking: false },
  { name: "Fill", version: "2.1.0", fields: 19, consumers: ["AEGIS","HELIOS","OBSIDIAN"], lastChange: "2025-11-22", breaking: false },
  { name: "Position", version: "2.3.0", fields: 21, consumers: ["AEGIS","KEPLER","HELIOS"], lastChange: "2025-12-01", breaking: false },
  { name: "Portfolio", version: "1.8.0", fields: 17, consumers: ["KEPLER","HELIOS","AEGIS"], lastChange: "2025-11-10", breaking: false },
  { name: "Signal", version: "1.6.2", fields: 15, consumers: ["OBSIDIAN","KEPLER","ARGUS"], lastChange: "2025-10-28", breaking: false },
  { name: "Event", version: "1.4.0", fields: 12, consumers: ["ARGUS","OBSIDIAN","KEPLER"], lastChange: "2025-10-15", breaking: false },
  { name: "RiskMetric", version: "2.0.1", fields: 24, consumers: ["AEGIS","KEPLER","HELIOS"], lastChange: "2025-12-03", breaking: false },
  { name: "Backtest", version: "1.3.0", fields: 31, consumers: ["KEPLER","HELIOS"], lastChange: "2025-11-05", breaking: false },
  { name: "CorporateAction", version: "1.2.1", fields: 13, consumers: ["OBSIDIAN","AEGIS","HELIOS"], lastChange: "2025-09-22", breaking: false },
  { name: "TradingCalendar", version: "1.1.0", fields: 7, consumers: ["OBSIDIAN","AEGIS","KEPLER"], lastChange: "2025-08-30", breaking: false },
];

export const CONTRACT_CI_CHECKS = [
  { id: "c-1012", ref: "feat/trade-v2-semver-bump", type: "Trade", change: "Add settlement_currency field", status: "pass" as const, ts: "2025-12-08 14:22 UTC", actor: "ci-bot" },
  { id: "c-1011", ref: "feat/order-risk-enrich", type: "Order", change: "Add pre_trade_risk_id field (optional)", status: "pass" as const, ts: "2025-12-07 09:11 UTC", actor: "ci-bot" },
  { id: "c-1010", ref: "fix/position-sign-flip", type: "Position", change: "Rename net_qty → net_quantity (breaking)", status: "fail" as const, ts: "2025-12-06 17:45 UTC", actor: "ci-bot" },
  { id: "c-1009", ref: "fix/position-sign-flip-v2", type: "Position", change: "Rename net_qty with version bump to 2.3.0", status: "pass" as const, ts: "2025-12-06 18:02 UTC", actor: "ci-bot" },
  { id: "c-1008", ref: "feat/risk-metric-expand", type: "RiskMetric", change: "Add component VaR fields (non-breaking)", status: "pass" as const, ts: "2025-12-03 11:55 UTC", actor: "ci-bot" },
];

/* ── Gateway ──────────────────────────────────────────────────────────────── */

export interface GatewayRoute {
  prefix: string;
  target: string;
  auth: boolean;
  rateLimit: string;
  cbState: "closed" | "open" | "half-open";
  p99Ms: number;
  reqPerMin: number;
}

const gwRng = new Rng("atlas-gateway-v1");

export const GATEWAY_ROUTES: GatewayRoute[] = [
  { prefix: "/api/market/**", target: "OBSIDIAN:8001", auth: true, rateLimit: "2000/min", cbState: "closed", p99Ms: gwRng.float(8, 14), reqPerMin: gwRng.int(18000, 22000) },
  { prefix: "/api/signals/**", target: "OBSIDIAN:8001", auth: true, rateLimit: "500/min", cbState: "closed", p99Ms: gwRng.float(10, 18), reqPerMin: gwRng.int(3000, 4500) },
  { prefix: "/api/orders/**", target: "AEGIS:8002", auth: true, rateLimit: "200/min", cbState: "closed", p99Ms: gwRng.float(4, 8), reqPerMin: gwRng.int(800, 1200) },
  { prefix: "/api/risk/**", target: "AEGIS:8002", auth: true, rateLimit: "300/min", cbState: "closed", p99Ms: gwRng.float(6, 12), reqPerMin: gwRng.int(1200, 1800) },
  { prefix: "/api/events/**", target: "ARGUS:8003", auth: true, rateLimit: "1000/min", cbState: "closed", p99Ms: gwRng.float(20, 40), reqPerMin: gwRng.int(4000, 6000) },
  { prefix: "/api/strategy/**", target: "KEPLER:8004", auth: true, rateLimit: "100/min", cbState: "closed", p99Ms: gwRng.float(15, 30), reqPerMin: gwRng.int(400, 600) },
  { prefix: "/api/portfolio/**", target: "HELIOS:8005", auth: true, rateLimit: "200/min", cbState: "closed", p99Ms: gwRng.float(12, 20), reqPerMin: gwRng.int(800, 1100) },
  { prefix: "/api/audit/**", target: "ATLAS:8000", auth: true, rateLimit: "50/min", cbState: "closed", p99Ms: gwRng.float(3, 6), reqPerMin: gwRng.int(100, 200) },
  { prefix: "/ws/market/**", target: "ATLAS-WS:8010", auth: false, rateLimit: "unlimited", cbState: "closed", p99Ms: gwRng.float(2, 5), reqPerMin: gwRng.int(500, 800) },
  { prefix: "/health/**", target: "ATLAS:8000", auth: false, rateLimit: "unlimited", cbState: "closed", p99Ms: gwRng.float(1, 3), reqPerMin: gwRng.int(600, 900) },
];

export interface RbacRole {
  role: string;
  perms: Record<string, boolean>;
}

export const RBAC_PERMS = ["market.read", "signals.read", "orders.write", "risk.read", "audit.read", "admin.cfg", "kill-switch"];

export const RBAC_MATRIX: RbacRole[] = [
  { role: "Admin",      perms: { "market.read": true, "signals.read": true, "orders.write": true, "risk.read": true, "audit.read": true, "admin.cfg": true,  "kill-switch": true  } },
  { role: "PM",         perms: { "market.read": true, "signals.read": true, "orders.write": true, "risk.read": true, "audit.read": true, "admin.cfg": false, "kill-switch": false } },
  { role: "Trader",     perms: { "market.read": true, "signals.read": true, "orders.write": true, "risk.read": true, "audit.read": false,"admin.cfg": false, "kill-switch": false } },
  { role: "Quant",      perms: { "market.read": true, "signals.read": true, "orders.write": false,"risk.read": true, "audit.read": false,"admin.cfg": false, "kill-switch": false } },
  { role: "Risk",       perms: { "market.read": true, "signals.read": true, "orders.write": false,"risk.read": true, "audit.read": true, "admin.cfg": false, "kill-switch": true  } },
  { role: "Compliance", perms: { "market.read": true, "signals.read": false,"orders.write": false,"risk.read": true, "audit.read": true, "admin.cfg": false, "kill-switch": false } },
  { role: "ReadOnly",   perms: { "market.read": true, "signals.read": true, "orders.write": false,"risk.read": false,"audit.read": false,"admin.cfg": false, "kill-switch": false } },
];

export interface RateTier {
  tier: string;
  reqPerMin: number;
  burstMultiplier: number;
  wsConnections: number;
  clients: number;
}

export const RATE_TIERS: RateTier[] = [
  { tier: "System (service-to-service)", reqPerMin: 100000, burstMultiplier: 2.0, wsConnections: 500, clients: 6 },
  { tier: "Admin API key",               reqPerMin: 10000,  burstMultiplier: 1.5, wsConnections: 100, clients: 3 },
  { tier: "PM / Trader",                 reqPerMin: 2000,   burstMultiplier: 1.2, wsConnections: 20,  clients: 12 },
  { tier: "Quant / Risk",                reqPerMin: 5000,   burstMultiplier: 1.3, wsConnections: 10,  clients: 8 },
  { tier: "ReadOnly / External",         reqPerMin: 200,    burstMultiplier: 1.0, wsConnections: 5,   clients: 22 },
];

export interface WsChannel {
  channel: string;
  description: string;
  producer: string;
  subscribers: number;
  msgPerSec: number;
}

const wsRng = new Rng("atlas-ws-v1");

export const WS_CHANNELS: WsChannel[] = [
  { channel: "market.tick.*", description: "Real-time tick data per symbol", producer: "OBSIDIAN", subscribers: wsRng.int(18, 28), msgPerSec: wsRng.float(800, 1200) },
  { channel: "market.bar.*",  description: "OHLCV bar completions (1m, 5m, 1d)", producer: "OBSIDIAN", subscribers: wsRng.int(12, 20), msgPerSec: wsRng.float(40, 80) },
  { channel: "order.live.*",  description: "Live order lifecycle events", producer: "AEGIS", subscribers: wsRng.int(6, 12), msgPerSec: wsRng.float(10, 30) },
  { channel: "signal.live.*", description: "Real-time signal updates", producer: "ARGUS/OBSIDIAN", subscribers: wsRng.int(8, 15), msgPerSec: wsRng.float(20, 50) },
  { channel: "risk.alerts",   description: "Risk breach notifications", producer: "AEGIS", subscribers: wsRng.int(4, 8), msgPerSec: wsRng.float(0.5, 3) },
  { channel: "system.health", description: "Heartbeat / health events", producer: "ATLAS", subscribers: wsRng.int(2, 5), msgPerSec: wsRng.float(1, 2) },
];

/* ── Event Bus ────────────────────────────────────────────────────────────── */

export interface BusStream {
  stream: string;
  producer: string;
  consumers: string[];
  throughput: number; // events/sec
  lag: number;        // ms
  retention: string;
  dlqDepth: number;
}

const busRng = new Rng("atlas-bus-v1");

export const BUS_STREAMS: BusStream[] = [
  {
    stream: "market.bar",
    producer: "OBSIDIAN",
    consumers: ["KEPLER", "HELIOS", "ARGUS"],
    throughput: busRng.float(600, 900),
    lag: busRng.float(2, 6),
    retention: "7d",
    dlqDepth: 0,
  },
  {
    stream: "market.tick",
    producer: "OBSIDIAN",
    consumers: ["AEGIS", "KEPLER"],
    throughput: busRng.float(1500, 2200),
    lag: busRng.float(1, 3),
    retention: "24h",
    dlqDepth: 0,
  },
  {
    stream: "signal.updated",
    producer: "ARGUS",
    consumers: ["KEPLER", "OBSIDIAN"],
    throughput: busRng.float(40, 80),
    lag: busRng.float(5, 15),
    retention: "30d",
    dlqDepth: busRng.int(0, 2),
  },
  {
    stream: "event.detected",
    producer: "ARGUS",
    consumers: ["OBSIDIAN", "KEPLER"],
    throughput: busRng.float(20, 50),
    lag: busRng.float(8, 20),
    retention: "90d",
    dlqDepth: busRng.int(0, 3),
  },
  {
    stream: "strategy.order_intent",
    producer: "KEPLER",
    consumers: ["AEGIS"],
    throughput: busRng.float(8, 18),
    lag: busRng.float(3, 8),
    retention: "7d",
    dlqDepth: 0,
  },
  {
    stream: "order.accepted",
    producer: "AEGIS",
    consumers: ["KEPLER", "HELIOS"],
    throughput: busRng.float(5, 15),
    lag: busRng.float(2, 5),
    retention: "365d",
    dlqDepth: 0,
  },
  {
    stream: "order.filled",
    producer: "AEGIS",
    consumers: ["OBSIDIAN", "KEPLER", "HELIOS"],
    throughput: busRng.float(3, 10),
    lag: busRng.float(2, 5),
    retention: "365d",
    dlqDepth: 0,
  },
  {
    stream: "position.updated",
    producer: "AEGIS",
    consumers: ["KEPLER", "HELIOS"],
    throughput: busRng.float(4, 12),
    lag: busRng.float(2, 6),
    retention: "365d",
    dlqDepth: 0,
  },
  {
    stream: "risk.breach",
    producer: "AEGIS",
    consumers: ["KEPLER", "HELIOS", "ATLAS-audit"],
    throughput: busRng.float(0.1, 1),
    lag: busRng.float(1, 3),
    retention: "365d",
    dlqDepth: busRng.int(0, 1),
  },
];

export interface ConsumerGroup {
  group: string;
  stream: string;
  service: string;
  lag: number; // messages behind
  assigned: number;
  pending: number;
}

const cgRng = new Rng("atlas-cg-v1");

export const CONSUMER_GROUPS: ConsumerGroup[] = [
  { group: "kepler-strategy-bars",   stream: "market.bar",             service: "KEPLER",      lag: cgRng.int(0, 3),    assigned: 4, pending: cgRng.int(0, 2) },
  { group: "helios-analytics-bars",  stream: "market.bar",             service: "HELIOS",      lag: cgRng.int(0, 5),    assigned: 2, pending: cgRng.int(0, 1) },
  { group: "argus-enrichment-bars",  stream: "market.bar",             service: "ARGUS",       lag: cgRng.int(0, 8),    assigned: 3, pending: cgRng.int(0, 3) },
  { group: "aegis-tick-risk",        stream: "market.tick",            service: "AEGIS",       lag: cgRng.int(0, 2),    assigned: 8, pending: cgRng.int(0, 1) },
  { group: "kepler-tick-input",      stream: "market.tick",            service: "KEPLER",      lag: cgRng.int(0, 4),    assigned: 4, pending: cgRng.int(0, 2) },
  { group: "kepler-signals",         stream: "signal.updated",         service: "KEPLER",      lag: cgRng.int(0, 12),   assigned: 2, pending: cgRng.int(0, 5) },
  { group: "obsidian-signals",       stream: "signal.updated",         service: "OBSIDIAN",    lag: cgRng.int(0, 6),    assigned: 2, pending: cgRng.int(0, 2) },
  { group: "aegis-order-exec",       stream: "strategy.order_intent",  service: "AEGIS",       lag: cgRng.int(0, 1),    assigned: 4, pending: cgRng.int(0, 1) },
  { group: "helios-fills",           stream: "order.filled",           service: "HELIOS",      lag: cgRng.int(0, 3),    assigned: 2, pending: cgRng.int(0, 1) },
  { group: "atlas-audit-risk",       stream: "risk.breach",            service: "ATLAS-audit", lag: cgRng.int(0, 0),    assigned: 1, pending: 0 },
];
