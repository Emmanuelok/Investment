/**
 * ATLAS Runtime data — Observability, Resilience, Deployment, and Audit pages.
 * All series deterministically generated via Rng. No Math.random() at module scope.
 */
import { Rng, priceWalk } from "@/lib/rng";

/* ══════════════════════════════════════════════════════════════════════════════
   OBSERVABILITY
   ══════════════════════════════════════════════════════════════════════════════ */

/* ── SLOs ─────────────────────────────────────────────────────────────────── */

export interface SloEntry {
  name: string;
  description: string;
  targetPct: number;
  currentPct: number;
  budgetRemainingPct: number;
  window: string;
  status: "ok" | "warn" | "breach";
}

const sloRng = new Rng("atlas-runtime-slos-v1");

export const OBS_SLOS: SloEntry[] = [
  {
    name: "Data-Feed Freshness",
    description: "Market data bars published within 500 ms of venue close",
    targetPct: 99.5,
    currentPct: 99.78,
    budgetRemainingPct: sloRng.float(72, 84),
    window: "7d",
    status: "ok",
  },
  {
    name: "Order Round-Trip Latency p99 < 30 ms",
    description: "Intent → broker ACK including pre-trade risk",
    targetPct: 99.0,
    currentPct: 98.84,
    budgetRemainingPct: sloRng.float(22, 38),
    window: "24h",
    status: "warn",
  },
  {
    name: "Gateway Uptime",
    description: "ATLAS API gateway serving health probe at /health",
    targetPct: 99.9,
    currentPct: 99.97,
    budgetRemainingPct: sloRng.float(88, 94),
    window: "30d",
    status: "ok",
  },
  {
    name: "Event Bus At-Least-Once Delivery",
    description: "All published events delivered to all consumer groups",
    targetPct: 99.99,
    currentPct: 99.992,
    budgetRemainingPct: sloRng.float(41, 56),
    window: "30d",
    status: "ok",
  },
];

/* ── Metrics mini-charts ─────────────────────────────────────────────────── */

const mRng = new Rng("atlas-runtime-metrics-v2");

export interface MetricChart {
  key: string;
  label: string;
  unit: string;
  current: number;
  data: number[];
  color: string;
  kind: "sparkline" | "bars";
}

export const METRIC_CHARTS: MetricChart[] = [
  {
    key: "gateway-rps",
    label: "Gateway RPS",
    unit: "req/s",
    current: mRng.float(1180, 1340),
    data: priceWalk("gw-rps", 24, 1200, 0.04, 0.001),
    color: "var(--accent)",
    kind: "sparkline",
  },
  {
    key: "bus-throughput",
    label: "Bus Throughput",
    unit: "evt/s",
    current: mRng.float(4600, 5100),
    data: priceWalk("bus-tput", 24, 4800, 0.035, 0.0),
    color: "var(--info)",
    kind: "sparkline",
  },
  {
    key: "db-connections",
    label: "DB Connections",
    unit: "conns",
    current: mRng.int(62, 80),
    data: (() => { const r = new Rng("db-conns"); return Array.from({length: 24}, () => r.float(55, 90)); })(),
    color: "var(--warn)",
    kind: "bars",
  },
  {
    key: "cache-hit",
    label: "Cache Hit Rate",
    unit: "%",
    current: mRng.float(92, 96),
    data: (() => { const r = new Rng("cache-hit"); return Array.from({length: 24}, () => r.float(88, 97)); })(),
    color: "var(--pos)",
    kind: "sparkline",
  },
  {
    key: "ingestion-lag",
    label: "Ingestion Lag",
    unit: "ms",
    current: mRng.float(3.2, 6.8),
    data: (() => { const r = new Rng("ing-lag"); return Array.from({length: 24}, () => r.float(2, 12)); })(),
    color: "var(--accent)",
    kind: "sparkline",
  },
  {
    key: "order-latency",
    label: "Order Latency p99",
    unit: "ms",
    current: mRng.float(22, 31),
    data: (() => { const r = new Rng("ord-lat"); return Array.from({length: 24}, () => r.float(15, 38)); })(),
    color: "var(--warn)",
    kind: "bars",
  },
];

/* ── Structured logs ─────────────────────────────────────────────────────── */

export type LogLevel = "INFO" | "WARN" | "ERROR";

export interface LogLine {
  ts: string;
  level: LogLevel;
  service: string;
  trace_id: string;
  msg: string;
  fields: string;
}

export const RECENT_LOGS: LogLine[] = [
  {
    ts: "2026-06-08T17:59:01.421Z",
    level: "INFO",
    service: "atlas-gateway",
    trace_id: "4f9a2b3c",
    msg: "request_completed",
    fields: `method=GET path=/api/market/AAPL dur_ms=9.4 status=200`,
  },
  {
    ts: "2026-06-08T17:59:00.882Z",
    level: "WARN",
    service: "aegis-execution",
    trace_id: "7d1e5f0a",
    msg: "order_latency_elevated",
    fields: `ord_id=ORD-4822 dur_ms=34.1 threshold_ms=30 broker=IBKR`,
  },
  {
    ts: "2026-06-08T17:58:58.113Z",
    level: "INFO",
    service: "obsidian-ingest",
    trace_id: "c3b8a912",
    msg: "bar_published",
    fields: `sym=NVDA interval=1m close=121.34 vol=2847200 lag_ms=4.1`,
  },
  {
    ts: "2026-06-08T17:58:55.744Z",
    level: "INFO",
    service: "kepler-strategy",
    trace_id: "a0d7c641",
    msg: "signal_scored",
    fields: `strategy=ts-momentum-64 sym=PLTR score=0.812 conviction=HIGH`,
  },
  {
    ts: "2026-06-08T17:58:52.009Z",
    level: "ERROR",
    service: "argus-scraper",
    trace_id: "e5f2b840",
    msg: "source_timeout",
    fields: `source=thinknum-api attempt=3/3 timeout_ms=5000 action=circuit_open`,
  },
  {
    ts: "2026-06-08T17:58:49.337Z",
    level: "INFO",
    service: "atlas-bus",
    trace_id: "b2c9e014",
    msg: "consumer_group_ack",
    fields: `stream=order.filled group=helios-fills offset=84221 lag=0`,
  },
  {
    ts: "2026-06-08T17:58:46.891Z",
    level: "WARN",
    service: "atlas-gateway",
    trace_id: "f1a4d372",
    msg: "rate_limit_approaching",
    fields: `client=pm-desk-1 path=/api/market/** usage=1840/2000 window=60s`,
  },
  {
    ts: "2026-06-08T17:58:43.120Z",
    level: "INFO",
    service: "helios-analytics",
    trace_id: "9e3c1b57",
    msg: "portfolio_nav_updated",
    fields: `fund=FUND-II nav_usd=148420000 positions=47 as_of=2026-06-08T17:58Z`,
  },
];

/* ── Distributed traces ──────────────────────────────────────────────────── */

export interface TraceSpan {
  name: string;
  service: string;
  startMs: number;
  durationMs: number;
  depth: number;
  status: "ok" | "warn" | "error";
}

export const SAMPLE_TRACE: TraceSpan[] = [
  { name: "POST /api/orders/submit", service: "atlas-gateway",    startMs: 0,    durationMs: 28.4, depth: 0, status: "ok"   },
  { name: "jwt_verify",              service: "atlas-identity",   startMs: 0.4,  durationMs: 1.2,  depth: 1, status: "ok"   },
  { name: "rate_limit_check",        service: "atlas-gateway",    startMs: 1.8,  durationMs: 0.6,  depth: 1, status: "ok"   },
  { name: "order.submit RPC",        service: "aegis-execution",  startMs: 2.6,  durationMs: 24.8, depth: 1, status: "warn" },
  { name: "pre_trade_risk_check",    service: "aegis-risk",       startMs: 2.9,  durationMs: 8.1,  depth: 2, status: "ok"   },
  { name: "secmaster.lookup",        service: "atlas-secmaster",  startMs: 3.1,  durationMs: 2.4,  depth: 3, status: "ok"   },
  { name: "postgres.query",          service: "postgres-primary", startMs: 3.4,  durationMs: 1.8,  depth: 4, status: "ok"   },
  { name: "redis.get position",      service: "redis-cluster",    startMs: 5.7,  durationMs: 0.9,  depth: 3, status: "ok"   },
  { name: "broker_ack IBKR",         service: "aegis-execution",  startMs: 12.4, durationMs: 14.2, depth: 2, status: "warn" },
  { name: "audit_write",             service: "atlas-audit",      startMs: 27.1, durationMs: 1.1,  depth: 2, status: "ok"   },
  { name: "bus.publish order.filled",service: "atlas-bus",        startMs: 27.8, durationMs: 0.6,  depth: 2, status: "ok"   },
];

/* ── Alerts ──────────────────────────────────────────────────────────────── */

export type AlertSeverity = "critical" | "high" | "medium" | "low";
export type AlertStatus = "firing" | "resolved";

export interface AlertRow {
  id: string;
  alert: string;
  severity: AlertSeverity;
  service: string;
  status: AlertStatus;
  since: string;
  value: string;
}

export const ALERTS: AlertRow[] = [
  { id: "A-0891", alert: "Order latency p99 > 30 ms",       severity: "high",     service: "AEGIS",       status: "firing",   since: "17:58:52",  value: "34.1 ms" },
  { id: "A-0890", alert: "Argus scraper circuit open",       severity: "medium",   service: "ARGUS",       status: "firing",   since: "17:58:52",  value: "thinknum-api" },
  { id: "A-0889", alert: "Rate limit approaching (pm-desk)", severity: "low",      service: "ATLAS-GW",    status: "firing",   since: "17:58:47",  value: "92%" },
  { id: "A-0888", alert: "SLO order latency budget < 40%",   severity: "medium",   service: "ATLAS-SLO",   status: "firing",   since: "17:44:10",  value: "35% remain" },
  { id: "A-0887", alert: "Redis memory > 80%",               severity: "high",     service: "REDIS",       status: "resolved", since: "16:12:04",  value: "resolved 16:38" },
  { id: "A-0886", alert: "DB connection pool > 90%",         severity: "critical", service: "POSTGRES",    status: "resolved", since: "09:41:21",  value: "resolved 09:52" },
  { id: "A-0885", alert: "Ingestion lag spike (EDGAR ingest)",severity: "low",     service: "OBSIDIAN",    status: "resolved", since: "08:07:55",  value: "resolved 08:19" },
];

/* ══════════════════════════════════════════════════════════════════════════════
   RESILIENCE
   ══════════════════════════════════════════════════════════════════════════════ */

/* ── Service health / degradation ───────────────────────────────────────── */

export type HealthStatus = "healthy" | "degraded" | "down";

export interface ServiceHealthRow {
  id: string;
  name: string;
  health: HealthStatus;
  readiness: HealthStatus;
  degradationMode: string;
  uptime: number;
  replicas: number;
  replicasReady: number;
}

export const SERVICE_HEALTH: ServiceHealthRow[] = [
  { id: "obsidian", name: "OBSIDIAN",       health: "healthy",  readiness: "healthy",  degradationMode: "Serve stale bars (60s TTL) if NATS partitioned",                 uptime: 99.97,  replicas: 3, replicasReady: 3 },
  { id: "aegis",    name: "AEGIS",          health: "healthy",  readiness: "healthy",  degradationMode: "Block new orders; keep risk monitors live on broker disconnect",   uptime: 99.99,  replicas: 4, replicasReady: 4 },
  { id: "argus",    name: "ARGUS",          health: "degraded", readiness: "healthy",  degradationMode: "Thinknum circuit open → fall back to GDELT + RSS; no silent stall",uptime: 99.91,  replicas: 2, replicasReady: 2 },
  { id: "kepler",   name: "KEPLER",         health: "healthy",  readiness: "healthy",  degradationMode: "Pause live signals; continue backtests from snapshot if bus down",  uptime: 99.98,  replicas: 2, replicasReady: 2 },
  { id: "helios",   name: "HELIOS",         health: "healthy",  readiness: "healthy",  degradationMode: "Serve last-known NAV + T+0 snapshot; degrade analytics gracefully", uptime: 99.94,  replicas: 2, replicasReady: 2 },
  { id: "atlas",    name: "ATLAS",          health: "healthy",  readiness: "healthy",  degradationMode: "N+1 gateway replicas; DB failover auto-promotes replica in 30s",    uptime: 99.999, replicas: 4, replicasReady: 4 },
];

/* ── Backups ─────────────────────────────────────────────────────────────── */

export interface BackupRow {
  store: string;
  technology: string;
  lastBackup: string;
  sizeMb: string;
  lastRestoreTest: string;
  restoreResult: "PASS" | "FAIL" | "PENDING";
  rpoTarget: string;
  rtoTarget: string;
}

export const BACKUPS: BackupRow[] = [
  { store: "Postgres (primary)",     technology: "PostgreSQL 16 / WAL-G",     lastBackup: "2026-06-08 17:00 UTC", sizeMb: "48,240",  lastRestoreTest: "2026-05-28",  restoreResult: "PASS",    rpoTarget: "5 min",  rtoTarget: "15 min" },
  { store: "TimescaleDB (time-series)",technology: "Timescale / pg_dump",     lastBackup: "2026-06-08 16:00 UTC", sizeMb: "312,108", lastRestoreTest: "2026-05-21",  restoreResult: "PASS",    rpoTarget: "15 min", rtoTarget: "30 min" },
  { store: "Redis (hot cache)",        technology: "Redis AOF + RDB snapshot", lastBackup: "2026-06-08 17:45 UTC", sizeMb: "2,841",   lastRestoreTest: "2026-06-02",  restoreResult: "PASS",    rpoTarget: "1 min",  rtoTarget: "5 min"  },
  { store: "DuckDB / Parquet lake",    technology: "Parquet → S3 multi-AZ",   lastBackup: "2026-06-08 18:00 UTC", sizeMb: "38,400M", lastRestoreTest: "2026-05-14",  restoreResult: "PASS",    rpoTarget: "0 min",  rtoTarget: "20 min" },
  { store: "pgvector (embeddings)",    technology: "pg_dump / WAL-G",         lastBackup: "2026-06-08 14:00 UTC", sizeMb: "9,120",   lastRestoreTest: "2026-04-30",  restoreResult: "PASS",    rpoTarget: "60 min", rtoTarget: "60 min" },
];

/* ── Runbooks ────────────────────────────────────────────────────────────── */

export interface RunbookEntry {
  id: string;
  title: string;
  trigger: string;
  severity: "P0" | "P1" | "P2";
  steps: number;
  lastDrill: string;
  owner: string;
}

export const RUNBOOKS: RunbookEntry[] = [
  { id: "RB-001", title: "Market data feed disconnect",    trigger: "Ingestion lag > 30s OR feed health=down",           severity: "P0", steps: 8,  lastDrill: "2026-05-12", owner: "ops-oncall" },
  { id: "RB-002", title: "Broker outage / IBKR disconnect",trigger: "AEGIS circuit open > 60s OR ACK timeout",           severity: "P0", steps: 11, lastDrill: "2026-04-28", owner: "ops-oncall" },
  { id: "RB-003", title: "Data corruption detected",        trigger: "Hash-chain break OR PIT-snapshot checksum fail",    severity: "P0", steps: 14, lastDrill: "2026-05-31", owner: "data-eng"   },
  { id: "RB-004", title: "Region failover (AZ outage)",     trigger: "Primary AZ health < 50% OR operator command",      severity: "P1", steps: 16, lastDrill: "2026-03-15", owner: "platform"   },
  { id: "RB-005", title: "Kill-switch activation",          trigger: "Risk limit breach P0 OR manual ARMED toggle",      severity: "P0", steps: 6,  lastDrill: "2026-06-01", owner: "risk-ops"   },
  { id: "RB-006", title: "Postgres primary failover",       trigger: "Primary unreachable > 30s (auto) OR manual",       severity: "P1", steps: 9,  lastDrill: "2026-05-28", owner: "platform"   },
  { id: "RB-007", title: "MNPI quarantine breach response", trigger: "Compliance.rejected event with reason=mnpi",       severity: "P1", steps: 7,  lastDrill: "2026-04-10", owner: "compliance" },
];

/* ══════════════════════════════════════════════════════════════════════════════
   DEPLOYMENT
   ══════════════════════════════════════════════════════════════════════════════ */

/* ── Environments ───────────────────────────────────────────────────────── */

export interface EnvRow {
  name: string;
  version: string;
  status: "live" | "deploying" | "canary" | "frozen";
  replicas: string;
  region: string;
  lastDeploy: string;
  gitSha: string;
  namespace: string;
}

export const ENVIRONMENTS: EnvRow[] = [
  { name: "production", version: "v4.8.2",   status: "live",      replicas: "4–10 (HPA)", region: "us-east-1",    lastDeploy: "2026-06-07 09:14 UTC", gitSha: "a3f9d2e", namespace: "pantheon-prod"    },
  { name: "staging",    version: "v4.9.0-rc1",status: "canary",    replicas: "2–4",         region: "us-east-2",    lastDeploy: "2026-06-08 14:22 UTC", gitSha: "7bc42a9", namespace: "pantheon-staging"  },
  { name: "dev",        version: "v4.9.0-dev",status: "live",      replicas: "1",           region: "us-east-1",    lastDeploy: "2026-06-08 17:41 UTC", gitSha: "f1a4d37", namespace: "pantheon-dev"      },
];

/* ── CI/CD Pipeline ─────────────────────────────────────────────────────── */

export type PipelineStatus = "pass" | "fail" | "running" | "skipped" | "pending";

export interface PipelineStage {
  stage: string;
  status: PipelineStatus;
  durationS: number;
  detail: string;
  runner: string;
}

export const PIPELINE_STAGES: PipelineStage[] = [
  { stage: "lint",           status: "pass",    durationS: 12,  detail: "ESLint + Prettier — 0 errors",                  runner: "gh-actions" },
  { stage: "typecheck",      status: "pass",    durationS: 28,  detail: "tsc --noEmit strict — 0 errors",                runner: "gh-actions" },
  { stage: "test",           status: "pass",    durationS: 94,  detail: "Jest 342 passed, 0 failed",                     runner: "gh-actions" },
  { stage: "contract-check", status: "pass",    durationS: 18,  detail: "Schema diff: no breaking changes (v4.9.0-rc1)", runner: "gh-actions" },
  { stage: "build",          status: "pass",    durationS: 74,  detail: "Docker image pantheon:7bc42a9 pushed to ECR",   runner: "gh-actions" },
  { stage: "canary",         status: "running", durationS: 0,   detail: "5% traffic → staging · health gates pending",   runner: "argocd"     },
  { stage: "promote-prod",   status: "pending", durationS: 0,   detail: "Awaiting canary gates (latency, error rate)",   runner: "argocd"     },
];

/* ── Kubernetes / Helm ───────────────────────────────────────────────────── */

export interface K8sDeployment {
  service: string;
  image: string;
  replicas: number;
  ready: number;
  cpuReq: string;
  memReq: string;
  cpuLim: string;
  memLim: string;
  status: "Running" | "Pending" | "CrashLooping";
}

export const K8S_DEPLOYMENTS: K8sDeployment[] = [
  { service: "atlas-gateway",  image: "pantheon/atlas-gateway:v4.8.2",  replicas: 4, ready: 4, cpuReq: "200m",  memReq: "256Mi",  cpuLim: "1000m", memLim: "512Mi",  status: "Running" },
  { service: "obsidian",       image: "pantheon/obsidian:v2.4.1",       replicas: 3, ready: 3, cpuReq: "500m",  memReq: "1Gi",    cpuLim: "2000m", memLim: "4Gi",    status: "Running" },
  { service: "aegis",          image: "pantheon/aegis:v3.1.0",          replicas: 4, ready: 4, cpuReq: "300m",  memReq: "512Mi",  cpuLim: "1500m", memLim: "2Gi",    status: "Running" },
  { service: "argus",          image: "pantheon/argus:v1.9.3",          replicas: 2, ready: 2, cpuReq: "400m",  memReq: "768Mi",  cpuLim: "2000m", memLim: "3Gi",    status: "Running" },
  { service: "kepler",         image: "pantheon/kepler:v2.2.0",         replicas: 2, ready: 2, cpuReq: "1000m", memReq: "2Gi",    cpuLim: "4000m", memLim: "8Gi",    status: "Running" },
  { service: "helios",         image: "pantheon/helios:v1.5.2",         replicas: 2, ready: 2, cpuReq: "300m",  memReq: "512Mi",  cpuLim: "1500m", memLim: "2Gi",    status: "Running" },
  { service: "atlas-bus",      image: "pantheon/nats-proxy:v2.10.1",    replicas: 3, ready: 3, cpuReq: "100m",  memReq: "128Mi",  cpuLim: "500m",  memLim: "512Mi",  status: "Running" },
  { service: "postgres",       image: "postgres:16-alpine",             replicas: 2, ready: 2, cpuReq: "500m",  memReq: "2Gi",    cpuLim: "4000m", memLim: "16Gi",   status: "Running" },
  { service: "redis",          image: "redis:7-alpine",                 replicas: 3, ready: 3, cpuReq: "200m",  memReq: "1Gi",    cpuLim: "1000m", memLim: "4Gi",    status: "Running" },
];

/* ── Terraform modules ──────────────────────────────────────────────────── */

export type TfState = "applied" | "drifted" | "planned" | "failed";

export interface TfModule {
  module: string;
  description: string;
  resources: number;
  state: TfState;
  lastApply: string;
  version: string;
}

export const TF_MODULES: TfModule[] = [
  { module: "network",       description: "VPC, subnets, security groups, ALB",           resources: 42, state: "applied", lastApply: "2026-06-07 09:10 UTC", version: "v3.4.1" },
  { module: "database",      description: "RDS Postgres multi-AZ, TimescaleDB, pgvector", resources: 28, state: "applied", lastApply: "2026-06-07 09:11 UTC", version: "v2.1.0" },
  { module: "cache",         description: "ElastiCache Redis cluster (3-node)",            resources: 11, state: "applied", lastApply: "2026-06-07 09:12 UTC", version: "v1.8.0" },
  { module: "observability", description: "Prometheus, Grafana, Loki, Jaeger",            resources: 34, state: "drifted", lastApply: "2026-06-06 11:22 UTC", version: "v2.0.3" },
  { module: "secrets",       description: "HashiCorp Vault cluster + AWS KMS integration", resources: 16, state: "applied", lastApply: "2026-06-07 09:13 UTC", version: "v1.5.2" },
  { module: "k8s-cluster",   description: "EKS control plane, node groups, IRSA",          resources: 67, state: "applied", lastApply: "2026-06-07 09:05 UTC", version: "v4.2.0" },
  { module: "s3-lake",       description: "Parquet data lake buckets + lifecycle rules",   resources: 18, state: "applied", lastApply: "2026-05-31 14:00 UTC", version: "v1.2.1" },
];

/* ── Canary state ───────────────────────────────────────────────────────── */

const canaryRng = new Rng("atlas-canary-v1");

export const CANARY = {
  version: "v4.9.0-rc1",
  trafficPct: 5,
  healthGates: [
    { gate: "Error rate < 0.1%",    value: canaryRng.float(0.01, 0.04), passingThreshold: 0.1,  pass: true  },
    { gate: "p99 latency < 40 ms",  value: canaryRng.float(22, 34),     passingThreshold: 40,   pass: true  },
    { gate: "p50 latency < 15 ms",  value: canaryRng.float(8, 13),      passingThreshold: 15,   pass: true  },
    { gate: "No panic / OOM kills", value: 0,                            passingThreshold: 0,    pass: true  },
    { gate: "CPU delta < +25%",     value: canaryRng.float(2, 8),        passingThreshold: 25,   pass: true  },
  ],
};

/* ══════════════════════════════════════════════════════════════════════════════
   AUDIT (ATLAS cross-service backbone)
   ══════════════════════════════════════════════════════════════════════════════ */

/* ── Cross-service audit stream ─────────────────────────────────────────── */

export type AuditPlatform =
  | "OBSIDIAN"
  | "ARGUS"
  | "KEPLER"
  | "AEGIS"
  | "HELIOS"
  | "ATLAS";

export interface CrossAuditEntry {
  seq: number;
  ts: string;
  platform: AuditPlatform;
  actor: string;
  action: string;
  object: string;
  hash: string;
  prevHash: string;
}

export const CROSS_AUDIT: CrossAuditEntry[] = [
  {
    seq: 101842,
    ts: "2026-06-08T17:59:01Z",
    platform: "ATLAS",
    actor: "atlas-admin/eo.kingsford",
    action: "config.updated",
    object: "kill-switch.state=SAFE; prev=ARMED; reason=drill-end",
    hash: "9f3c2a1e4b7d",
    prevHash: "7bc42a9e3d1f",
  },
  {
    seq: 101841,
    ts: "2026-06-08T17:58:55Z",
    platform: "AEGIS",
    actor: "aegis-compliance",
    action: "compliance.rejected",
    object: "ORD-4823 NVDA 2000sh; reason=position_limit_breach; limit=$2M actual=$2.4M",
    hash: "7bc42a9e3d1f",
    prevHash: "a3f9d2e1b7c0",
  },
  {
    seq: 101840,
    ts: "2026-06-08T17:58:42Z",
    platform: "AEGIS",
    actor: "aegis-execution/ibkr-bridge",
    action: "order.filled",
    object: "ORD-4821 LMT 200sh AAPL avg=$189.44 slippage=+0.2bps broker=IBKR",
    hash: "a3f9d2e1b7c0",
    prevHash: "e1d8b3a0c5f2",
  },
  {
    seq: 101839,
    ts: "2026-06-08T17:58:33Z",
    platform: "HELIOS",
    actor: "helios/order-router",
    action: "order.intent",
    object: "strat=ts-momentum-64 sym=AAPL qty=200 dir=BUY urgency=normal",
    hash: "e1d8b3a0c5f2",
    prevHash: "c4b2a1e8d6f9",
  },
  {
    seq: 101838,
    ts: "2026-06-08T17:57:11Z",
    platform: "AEGIS",
    actor: "aegis-risk-engine",
    action: "risk.breach",
    object: "FUND-II tech-conc=31.4% > limit=30%; action=soft-breach; trading continues",
    hash: "c4b2a1e8d6f9",
    prevHash: "f2e0c7d4b9a3",
  },
  {
    seq: 101837,
    ts: "2026-06-08T17:55:44Z",
    platform: "KEPLER",
    actor: "kepler-backtester/svc",
    action: "backtest.run",
    object: "strat=ts-momentum-64 IS-Sharpe=2.41 OOS-Sharpe=1.88 PBO=0.42 pit=2026-06-08T17:54Z",
    hash: "f2e0c7d4b9a3",
    prevHash: "b9a31856d6f9",
  },
  {
    seq: 101836,
    ts: "2026-06-08T17:54:22Z",
    platform: "ARGUS",
    actor: "argus-scraper/edgar",
    action: "source.collected",
    object: "EDGAR 8-K LMT $1.2B defense contract; 312 events ingested; NLP-tagged=M&A",
    hash: "b9a31856d6f9",
    prevHash: "d6f93750c4b2",
  },
  {
    seq: 101835,
    ts: "2026-06-08T17:52:01Z",
    platform: "OBSIDIAN",
    actor: "obsidian-ingest/market",
    action: "data.access",
    object: "sym=NVDA interval=1m bars=390 source=yfinance pit=2026-06-08T17:52Z",
    hash: "d6f93750c4b2",
    prevHash: "a1e8d6f93750",
  },
  {
    seq: 101834,
    ts: "2026-06-08T17:48:03Z",
    platform: "ARGUS",
    actor: "argus/mnpi-filter",
    action: "compliance.flagged",
    object: "Event-7714 NVDA supply-chain memo; action=QUARANTINE; pending compliance review",
    hash: "a1e8d6f93750",
    prevHash: "3750c4b2a1e8",
  },
  {
    seq: 101833,
    ts: "2026-06-08T17:45:18Z",
    platform: "AEGIS",
    actor: "aegis-execution/ibkr-bridge",
    action: "order.filled",
    object: "ORD-4820 PLTR 1500sh avg=$28.72 slippage=+0.4bps market-impact=LOW",
    hash: "3750c4b2a1e8",
    prevHash: "c5f29471e1d8",
  },
  {
    seq: 101832,
    ts: "2026-06-08T17:41:07Z",
    platform: "ATLAS",
    actor: "atlas-admin/eo.kingsford",
    action: "permission.changed",
    object: "role=Risk granted kill-switch=true; prev=false; reason=DR-drill-prep",
    hash: "c5f29471e1d8",
    prevHash: "b7c048f29f3c",
  },
  {
    seq: 101831,
    ts: "2026-06-08T17:38:55Z",
    platform: "OBSIDIAN",
    actor: "obsidian-secmaster",
    action: "data.access",
    object: "instrument_lookup PLTR cusip=72919P2L3 exchange=NASDAQ — cache-miss, db-fetch",
    hash: "b7c048f29f3c",
    prevHash: "2a1e4b7d9f3c",
  },
];

/* ── Hash-chain verification ────────────────────────────────────────────── */

export const HASH_CHAIN_STATUS = {
  verified: true,
  lastCheck: "2026-06-08T17:59:05Z",
  chainLength: 101842,
  algorithm: "SHA-256",
  integrityNote: "All 101,842 entries verified — chain unbroken since genesis seq#1 (2025-06-01).",
};

/* ── Retention / export ──────────────────────────────────────────────────── */

export const RETENTION_CONFIG = {
  hotStore: { name: "Postgres (audit schema)", window: "90 days", sizeGb: 12.4 },
  coldStore: { name: "S3 Parquet (compressed)", window: "7 years", sizeGb: 142.8 },
  exportFormats: ["Parquet", "JSONL", "CSV", "SEC-17a-4 compliant zip"],
  regulatoryNotes: [
    "SEC Rule 17a-4 — WORM-compliant retention on S3 Object Lock",
    "FINRA 4370 — BCP records retained ≥ 3 years, accessible within 4 hours",
    "MiFID II Art.25 — transaction records retained 5 years",
    "Audit exports are signed (Ed25519) and timestamped by Atlas before delivery",
  ],
};
