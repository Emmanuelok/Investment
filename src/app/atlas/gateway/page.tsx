import {
  PageHeader, Panel, PanelHeader, Chip, KpiCard, StatusDot,
  Th, Td,
} from "@/components/ui/kit";
import { Sparkline, ProgressBar } from "@/components/ui/viz";
import { Icon } from "@/components/icon-map";
import { Lock, Activity, Check, Warn } from "@/components/icons";
import {
  GATEWAY_ROUTES,
  RBAC_MATRIX,
  RBAC_PERMS,
  RATE_TIERS,
  WS_CHANNELS,
  SPINE_SERVICES,
  ATLAS_KPIS,
} from "@/lib/data/atlas-spine";
import { Rng, priceWalk } from "@/lib/rng";
import { fmtNum, fmtInt, fmtCompact } from "@/lib/format";

export const metadata = { title: "API Gateway & Service Mesh · ATLAS Platform" };

// Deterministic KPI series
const gkRng = new Rng("gw-kpi-page");
const GW_KPI = {
  reqPerSec:       gkRng.float(340, 420),
  p50Ms:           gkRng.float(3.1, 5.2),
  p99Ms:           ATLAS_KPIS.gatewayP99Ms,
  rate5xx:         gkRng.float(0.008, 0.02),
  activeWsConns:   gkRng.int(180, 260),
};

const gwReqSpark  = priceWalk("gw-req-spark",  24, 380, 0.04, 0.001);
const gwP99Spark  = priceWalk("gw-p99-spark",  24, 8.5, 0.06, 0.0);
const gw5xxSpark  = priceWalk("gw-5xx-spark",  24, 0.012, 0.08, -0.001);

const CB_TONE: Record<string, "pos" | "warn" | "neg"> = {
  closed:    "pos",
  "half-open": "warn",
  open:      "neg",
};

const CB_LABEL: Record<string, string> = {
  closed:    "CLOSED",
  "half-open": "HALF-OPEN",
  open:      "OPEN",
};

const PERM_TONE: Record<string, string> = {
  "market.read":  "text-accent",
  "signals.read": "text-pos",
  "orders.write": "text-warn",
  "risk.read":    "text-info",
  "audit.read":   "text-ai",
  "admin.cfg":    "text-neg",
  "kill-switch":  "text-neg",
};

export default function GatewayPage() {
  const totalReqPerMin = GATEWAY_ROUTES.reduce((s, r) => s + r.reqPerMin, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        module={{ name: "ATLAS · Platform & Ops", tone: "info" }}
        title="API Gateway & Service Mesh"
        desc="Single ingress for all six services — routing, authentication, rate limiting, RBAC enforcement, circuit breakers, and request-id propagation."
        right={
          <div className="flex items-center gap-2">
            <Chip tone="pos" dot>All routes nominal</Chip>
            <Chip tone="default">DEMO</Chip>
          </div>
        }
      />

      {/* KPI deck */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <KpiCard
          label="REQ / SEC"
          value={fmtCompact(GW_KPI.reqPerSec)}
          sub={<Sparkline data={gwReqSpark} width={80} height={18} />}
          tone="accent"
          icon={<Activity width={15} height={15} />}
        />
        <KpiCard
          label="P50 LATENCY"
          value={`${fmtNum(GW_KPI.p50Ms, 1)} ms`}
          sub="Median across all routes"
          icon={<Icon name="gauge" width={15} height={15} />}
        />
        <KpiCard
          label="P99 LATENCY"
          value={`${fmtNum(GW_KPI.p99Ms, 1)} ms`}
          sub={<Sparkline data={gwP99Spark} width={80} height={18} />}
          icon={<Icon name="gauge" width={15} height={15} />}
        />
        <KpiCard
          label="5xx RATE"
          value={`${(GW_KPI.rate5xx * 100).toFixed(3)}%`}
          sub={<Sparkline data={gw5xxSpark} width={80} height={18} />}
          tone={GW_KPI.rate5xx > 0.01 ? "warn" : "pos"}
          icon={<Warn width={15} height={15} />}
        />
        <KpiCard
          label="ACTIVE WS CONNS"
          value={GW_KPI.activeWsConns.toString()}
          sub="Across all WebSocket channels"
          icon={<Icon name="radio" width={15} height={15} />}
        />
      </div>

      {/* Routing Table */}
      <Panel>
        <PanelHeader
          title="Route Table"
          sub="All routes proxied through ATLAS gateway — auth enforced, rate-limited, circuit-broken"
          right={
            <div className="flex items-center gap-2">
              <Chip tone="default">{fmtInt(totalReqPerMin)} req/min total</Chip>
              <Chip tone="pos">{GATEWAY_ROUTES.length} routes</Chip>
            </div>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse">
            <thead>
              <tr>
                <Th>Route Prefix</Th>
                <Th>Target Service</Th>
                <Th>Auth</Th>
                <Th>Rate Limit</Th>
                <Th>Circuit Breaker</Th>
                <Th right>P99</Th>
                <Th right>Req/min</Th>
              </tr>
            </thead>
            <tbody>
              {GATEWAY_ROUTES.map((r) => {
                const cbTone = CB_TONE[r.cbState];
                return (
                  <tr key={r.prefix} className="group transition-colors hover:bg-elevated/40">
                    <Td mono className="text-xs text-accent">{r.prefix}</Td>
                    <Td mono className="text-xs text-muted">{r.target}</Td>
                    <Td mono={false}>
                      {r.auth ? (
                        <div className="flex items-center gap-1 text-xs text-pos">
                          <Lock width={11} height={11} /> JWT
                        </div>
                      ) : (
                        <span className="text-xs text-dim">Public</span>
                      )}
                    </Td>
                    <Td mono className="text-xs text-muted">{r.rateLimit}</Td>
                    <Td mono={false}>
                      <Chip tone={cbTone} className="text-[9px]">
                        {CB_LABEL[r.cbState]}
                      </Chip>
                    </Td>
                    <Td right className="text-muted">{fmtNum(r.p99Ms, 1)} ms</Td>
                    <Td right className="text-muted">{fmtInt(r.reqPerMin)}</Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="border-t border-line px-4 py-2.5 text-xs text-dim">
          Circuit breaker states: CLOSED = healthy, HALF-OPEN = recovering, OPEN = failing fast.
          Tripping threshold: 50% error rate over 10s window. Recovery probe interval: 30s.
        </div>
      </Panel>

      {/* RBAC matrix + Rate tiers */}
      <div className="grid gap-4 xl:grid-cols-2">
        {/* RBAC matrix */}
        <Panel>
          <PanelHeader
            title="RBAC Role × Permission Matrix"
            sub="Enforced at gateway ingress — never in individual services"
            right={<Chip tone="accent">7 roles · 7 perms</Chip>}
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse">
              <thead>
                <tr>
                  <Th>Role</Th>
                  {RBAC_PERMS.map((p) => (
                    <Th key={p} className="text-center">
                      <span className={`${PERM_TONE[p] ?? "text-dim"} text-[9px]`}>{p}</span>
                    </Th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {RBAC_MATRIX.map((row) => (
                  <tr key={row.role} className="group transition-colors hover:bg-elevated/40">
                    <Td mono={false} className="font-mono text-xs font-semibold text-ink">
                      {row.role}
                    </Td>
                    {RBAC_PERMS.map((p) => (
                      <Td key={p} mono={false} className="text-center">
                        {row.perms[p] ? (
                          <Check width={13} height={13} className="mx-auto text-pos" />
                        ) : (
                          <span className="text-[10px] text-line">—</span>
                        )}
                      </Td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-line px-4 py-2.5 text-xs text-dim">
            JWT claims include role and service scope. Gateway rejects requests that don&apos;t match the
            route&apos;s required permission. RBAC changes are audited and require Admin approval.
          </div>
        </Panel>

        {/* Rate limiter tiers */}
        <Panel>
          <PanelHeader
            title="Rate Limiter — Token Buckets per Client Tier"
            sub="Token bucket algorithm — per API key, per minute, with burst allowance"
            right={<Chip tone="info">5 tiers</Chip>}
          />
          <div className="divide-y divide-line">
            {RATE_TIERS.map((tier) => {
              const fillPct = Math.min(100, (tier.reqPerMin / 100000) * 100);
              return (
                <div key={tier.tier} className="px-4 py-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-semibold text-ink">{tier.tier}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted">
                        {fmtInt(tier.reqPerMin)} req/min
                      </span>
                      <span className="chip text-[9px]">×{tier.burstMultiplier} burst</span>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <ProgressBar
                      value={fillPct}
                      color="var(--accent)"
                      height={5}
                      className="flex-1"
                    />
                    <div className="flex shrink-0 items-center gap-2 text-[10px] text-dim">
                      <span>WS: {tier.wsConnections}</span>
                      <span>clients: {tier.clients}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="border-t border-line px-4 py-2.5 text-xs text-dim">
            Exceeding the rate limit returns HTTP 429 with Retry-After header. Burst multiplier applies for ≤5s.
            System tier (service-to-service) is exempt from user-facing limits.
          </div>
        </Panel>
      </div>

      {/* WebSocket hub + Circuit breaker health */}
      <div className="grid gap-4 xl:grid-cols-2">
        {/* WS Hub */}
        <Panel>
          <PanelHeader
            title="WebSocket Hub — Active Channels"
            sub="Pub/sub multiplexer — one WS connection, many topic subscriptions"
            right={<Chip tone="accent">{WS_CHANNELS.length} channels</Chip>}
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[440px] border-collapse">
              <thead>
                <tr>
                  <Th>Channel</Th>
                  <Th>Producer</Th>
                  <Th right>Subscribers</Th>
                  <Th right>Msg/s</Th>
                </tr>
              </thead>
              <tbody>
                {WS_CHANNELS.map((ch) => (
                  <tr key={ch.channel} className="group transition-colors hover:bg-elevated/40">
                    <Td mono className="text-xs text-accent">{ch.channel}</Td>
                    <Td mono={false} className="text-xs text-muted">{ch.producer}</Td>
                    <Td right className="text-muted">{ch.subscribers}</Td>
                    <Td right className="text-muted">{fmtNum(ch.msgPerSec, 0)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-line px-4 py-2.5 text-xs text-dim">
            Clients subscribe to channels via{" "}
            <span className="font-mono text-accent">SUBSCRIBE channel [filters]</span> after WS handshake.
            Auth is enforced at connection establishment — RBAC checked per subscription.
          </div>
        </Panel>

        {/* Circuit breaker health aggregation */}
        <Panel>
          <PanelHeader
            title="Circuit Breaker Status — Downstream Services"
            sub="Health-aggregation across all six services from the gateway's perspective"
            right={<Chip tone="pos">6 / 6 closed</Chip>}
          />
          <div className="divide-y divide-line">
            {SPINE_SERVICES.map((svc) => {
              const rng2 = new Rng(`cb-${svc.id}`);
              const errorRate   = rng2.float(0.001, 0.015);
              const timeout     = rng2.float(0.0, 0.003);
              const successRate = 1 - errorRate;
              return (
                <div key={svc.id} className="flex items-center gap-3 px-4 py-3">
                  <StatusDot tone="pos" pulse />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-semibold text-ink">{svc.name}</span>
                      <Chip tone="pos" className="text-[9px]">CLOSED</Chip>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <ProgressBar
                        value={successRate * 100}
                        max={100}
                        color="var(--pos)"
                        height={4}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-mono text-xs text-pos">{(successRate * 100).toFixed(2)}%</div>
                    <div className="text-[10px] text-dim">success</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="border-t border-line px-4 py-3">
            <div className="grid grid-cols-3 gap-3 text-xs">
              {[
                { label: "TRIP THRESHOLD", value: "50% errors / 10s" },
                { label: "PROBE INTERVAL", value: "30 seconds" },
                { label: "HALF-OPEN LIMIT", value: "5 req before decision" },
              ].map((n) => (
                <div key={n.label}>
                  <div className="kpi-label text-[9px]">{n.label}</div>
                  <div className="mt-0.5 font-mono text-xs text-muted">{n.value}</div>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>

      {/* Request tracing note */}
      <Panel>
        <PanelHeader
          title="Request Tracing — ID Propagation"
          right={<Chip tone="info">OpenTelemetry</Chip>}
        />
        <div className="grid gap-px bg-line md:grid-cols-3">
          {[
            {
              step: "01",
              title: "Gateway assigns request-id",
              body: "Every inbound request is assigned a UUID v4 request-id injected as X-Request-Id header. If the client already provided one, it is validated and used as-is.",
              tone: "border-accent/20 text-accent",
            },
            {
              step: "02",
              title: "Propagated across the bus",
              body: "Service calls and events emitted to the ATLAS event bus carry the same request-id in event metadata. Consumer services re-inject it into their outbound calls.",
              tone: "border-info/20 text-info",
            },
            {
              step: "03",
              title: "Written to audit log",
              body: "The audit backbone captures the request-id on every auditable action. This allows reconstruction of the full causal chain from a single ID across all services.",
              tone: "border-pos/20 text-pos",
            },
          ].map((s) => (
            <div key={s.step} className="bg-panel p-4">
              <div className="flex items-start gap-2.5">
                <span className={`font-mono text-lg font-bold ${s.tone.split(" ")[1]} opacity-60`}>{s.step}</span>
                <div>
                  <div className="font-mono text-xs font-semibold text-ink">{s.title}</div>
                  <p className="mt-1 text-xs leading-relaxed text-muted">{s.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-line px-4 py-2.5 text-xs text-dim">
          Traces exported to OTLP endpoint → Jaeger / Tempo. Sampling rate: 10% of healthy traffic, 100% on errors.
          Spans include gateway → service → bus → consumer chain.
        </div>
      </Panel>
    </div>
  );
}
