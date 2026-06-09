import Link from "next/link";
import {
  PageHeader, Panel, PanelHeader, Chip, KpiCard, StatusDot,
  Th, Td,
} from "@/components/ui/kit";
import { Sparkline, ProgressBar, Ring } from "@/components/ui/viz";
import { Icon } from "@/components/icon-map";
import { Shield, Lock, Database, Activity, Check, Warn } from "@/components/icons";
import {
  SPINE_SERVICES,
  ATLAS_KPIS,
  ATLAS_SLOS,
  EVENT_FLOW_EDGES,
} from "@/lib/data/atlas-spine";
import { fmtNum, fmtInt, fmtCompact } from "@/lib/format";

export const metadata = { title: "ATLAS Suite Console · PANTHEON Platform" };

const HEALTH_TONE: Record<string, "pos" | "warn" | "neg"> = {
  healthy: "pos",
  degraded: "warn",
  incident: "neg",
};

const WHAT_ATLAS_PROVIDES = [
  {
    icon: "book",
    title: "Shared Contracts",
    desc: "17 canonical Pydantic types — auto-generated to TypeScript. One source, two languages. The five services import; they never redefine.",
    href: "/atlas/contracts",
    tone: "accent",
  },
  {
    icon: "radio",
    title: "Event Bus",
    desc: "Redis Streams (NATS JetStream / Kafka swappable). Typed events. At-least-once delivery with consumer-group lag monitoring and DLQ replay.",
    href: "/atlas/event-bus",
    tone: "info",
  },
  {
    icon: "shield",
    title: "Security Master",
    desc: "Canonical identifier mapping across FIGI, SEDOL, CUSIP, ISIN, and ticker. Point-in-time lookups for every corporate action.",
    href: "/atlas/secmaster",
    tone: "pos",
  },
  {
    icon: "cpu",
    title: "Service SDK",
    desc: "Python + TypeScript libraries that wrap the event bus, contracts, circuit breakers, health reporting, and distributed tracing.",
    href: "/atlas/gateway",
    tone: "accent",
  },
  {
    icon: "lock",
    title: "Identity & Secrets",
    desc: "JWT issuance, RBAC enforcement, API key management, and Vault-backed secret distribution — single auth plane for all 6 services.",
    href: "/atlas/identity",
    tone: "warn",
  },
  {
    icon: "pulse",
    title: "Observability",
    desc: "OpenTelemetry traces, Prometheus metrics, and structured logs aggregated into a unified ops console with p50/p99 dashboards.",
    href: "/atlas/gateway",
    tone: "pos",
  },
  {
    icon: "database",
    title: "Audit Backbone",
    desc: "Append-only, hash-chained audit log for every action across all services. SEC 17a-4 compatible, full reproducibility from any seq#.",
    href: "/audit",
    tone: "accent",
  },
  {
    icon: "route",
    title: "API Gateway",
    desc: "Single ingress — routing, rate limiting (token buckets per tier), RBAC enforcement, circuit breakers, and request-id propagation.",
    href: "/atlas/gateway",
    tone: "info",
  },
];

const TONE_CLASS: Record<string, string> = {
  accent: "border-accent/20 bg-accent/5 text-accent",
  info:   "border-info/20 bg-info/5 text-info",
  pos:    "border-pos/20 bg-pos/5 text-pos",
  warn:   "border-warn/20 bg-warn/5 text-warn",
};

export default function AtlasConsolePage() {
  const k = ATLAS_KPIS;

  return (
    <div className="space-y-5">
      <PageHeader
        module={{ name: "ATLAS · Platform & Ops", tone: "info" }}
        title="Suite Console"
        desc="Global health and integration map for the full PANTHEON 6-service platform — OBSIDIAN · AEGIS · ARGUS · KEPLER · HELIOS · ATLAS."
        right={
          <div className="flex items-center gap-2">
            <Chip tone={k.killSwitchArmed ? "neg" : "pos"} dot>
              KILL-SWITCH {k.killSwitchArmed ? "ARMED" : "SAFE"}
            </Chip>
            <Link href="/atlas/resilience" className="btn">
              <Shield width={14} height={14} />
              Resilience
            </Link>
          </div>
        }
      />

      {/* KPI deck */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          label="SERVICES UP"
          value={`${k.servicesUp} / ${k.servicesTotal}`}
          sub="All six healthy — no incidents"
          tone="pos"
          icon={<Activity width={15} height={15} />}
        />
        <KpiCard
          label="EVENTS / SEC"
          value={fmtCompact(k.eventsPerSec)}
          sub="Across all bus streams"
          tone="accent"
          icon={<Icon name="radio" width={15} height={15} />}
        />
        <KpiCard
          label="GATEWAY P99"
          value={`${fmtNum(k.gatewayP99Ms, 1)} ms`}
          sub="All routes · last 5 min"
          icon={<Icon name="gauge" width={15} height={15} />}
        />
        <KpiCard
          label="ERROR BUDGET"
          value={`${fmtNum(k.errorBudgetPct, 1)}%`}
          sub="30-day window · SLO 99.9%"
          tone={k.errorBudgetPct > 50 ? "pos" : "warn"}
          icon={<Icon name="target" width={15} height={15} />}
        />
        <KpiCard
          label="AUDIT EVENTS"
          value={fmtInt(k.auditEventsToday)}
          sub="Today since 00:00 UTC"
          icon={<Database width={15} height={15} />}
        />
        <KpiCard
          label="KILL-SWITCH"
          value={k.killSwitchArmed ? "ARMED" : "SAFE"}
          sub={k.killSwitchArmed ? "All orders halted" : "Normal operations"}
          tone={k.killSwitchArmed ? "neg" : "pos"}
          icon={<Lock width={15} height={15} />}
        />
      </div>

      {/* Service Mesh grid */}
      <Panel>
        <PanelHeader
          title="Service Mesh — 6 / 6 Healthy"
          right={
            <div className="flex items-center gap-2">
              <Chip tone="pos" dot>All services nominal</Chip>
              <Chip tone="default">DEMO</Chip>
            </div>
          }
        />
        <div className="grid gap-px bg-line sm:grid-cols-2 xl:grid-cols-3">
          {SPINE_SERVICES.map((svc) => {
            const tone = HEALTH_TONE[svc.health] ?? "warn";
            return (
              <div key={svc.id} className="bg-panel p-4 transition-colors hover:bg-elevated/40">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <StatusDot tone={tone} pulse={svc.health === "healthy"} />
                    <span className="font-mono text-sm font-semibold text-ink">{svc.name}</span>
                    <span className="chip text-[9px]">v{svc.version}</span>
                  </div>
                  <Chip tone={tone} className="text-[9px]">{svc.health.toUpperCase()}</Chip>
                </div>
                <p className="mt-1.5 text-xs text-dim">{svc.tagline}</p>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div>
                    <div className="kpi-label text-[9px]">UPTIME</div>
                    <div className="font-mono text-xs text-pos">{svc.uptimePct.toFixed(2)}%</div>
                  </div>
                  <div>
                    <div className="kpi-label text-[9px]">REQ/S</div>
                    <div className="font-mono text-xs text-ink">{fmtCompact(svc.reqPerSec)}</div>
                  </div>
                  <div>
                    <div className="kpi-label text-[9px]">P99</div>
                    <div className="font-mono text-xs text-ink">{fmtNum(svc.p99Ms, 1)} ms</div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="kpi-label text-[9px]">DEPENDENCIES</div>
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {svc.deps.map((d) => (
                        <span key={d} className="chip text-[8px]">{d}</span>
                      ))}
                    </div>
                  </div>
                  <div className="shrink-0">
                    <Sparkline data={svc.spark} width={72} height={22} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* Bottom row: What ATLAS provides + Event Flow */}
      <div className="grid gap-4 xl:grid-cols-2">
        {/* What ATLAS provides */}
        <Panel>
          <PanelHeader
            title="What ATLAS Provides"
            sub="Shared platform spine — the five services depend on all of these"
            right={<Chip tone="info">8 capabilities</Chip>}
          />
          <div className="grid gap-px bg-line sm:grid-cols-2">
            {WHAT_ATLAS_PROVIDES.map((item) => (
              <Link key={item.title} href={item.href} className="group bg-panel p-3.5 transition-colors hover:bg-elevated/40">
                <div className="flex items-start gap-2.5">
                  <div className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded border ${TONE_CLASS[item.tone]}`}>
                    <Icon name={item.icon} width={13} height={13} />
                  </div>
                  <div>
                    <div className="font-mono text-xs font-semibold text-ink group-hover:text-accent">
                      {item.title}
                    </div>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-dim">{item.desc}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Panel>

        {/* Event Flow + SLOs stacked */}
        <div className="space-y-4">
          {/* Live Event Flow Strip */}
          <Panel>
            <PanelHeader
              title="Live Event-Flow — Integration Contract"
              right={<Chip tone="accent">Bus topology</Chip>}
            />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse">
                <thead>
                  <tr>
                    <Th>Producer</Th>
                    <Th>Stream / Topic</Th>
                    <Th>Consumer(s)</Th>
                    <Th right>ev/s</Th>
                  </tr>
                </thead>
                <tbody>
                  {EVENT_FLOW_EDGES.map((e, i) => {
                    const toneClass =
                      e.tone === "accent" ? "text-accent" :
                      e.tone === "pos"    ? "text-pos"    :
                      e.tone === "warn"   ? "text-warn"   : "text-info";
                    return (
                      <tr key={i} className="group transition-colors hover:bg-elevated/40">
                        <Td mono={false}>
                          <span className={`font-mono text-xs font-semibold ${toneClass}`}>
                            {e.from}
                          </span>
                        </Td>
                        <Td mono className="text-dim text-xs">{e.topic}</Td>
                        <Td mono={false}>
                          <span className={`font-mono text-xs ${toneClass}`}>{e.to}</span>
                        </Td>
                        <Td right className="text-muted">{fmtCompact(e.eventsPerSec)}</Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="border-t border-line px-4 py-2.5 text-xs text-dim">
              At-least-once delivery · typed events from contracts package · Redis Streams backend (NATS JetStream / Kafka swappable)
            </div>
          </Panel>

          {/* SLO Summary */}
          <Panel>
            <PanelHeader
              title="SLO Summary"
              right={<Chip tone="pos">3 / 3 within budget</Chip>}
            />
            <div className="divide-y divide-line">
              {ATLAS_SLOS.map((slo) => {
                const pct = 100 - slo.budgetUsedPct;
                const barColor =
                  slo.status === "ok"     ? "var(--pos)"  :
                  slo.status === "warn"   ? "var(--warn)" : "var(--neg)";
                return (
                  <div key={slo.name} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {slo.status === "ok"
                          ? <Check width={12} height={12} className="shrink-0 text-pos" />
                          : <Warn  width={12} height={12} className="shrink-0 text-warn" />}
                        <span className="truncate text-xs text-muted">{slo.name}</span>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="font-mono text-xs text-ink">{slo.current.toFixed(3)}%</span>
                        <span className="text-xs text-dim">tgt {slo.target}%</span>
                        <span className="chip text-[9px]">{slo.window}</span>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[10px] text-dim w-20 shrink-0">Budget left</span>
                      <ProgressBar
                        value={pct}
                        color={barColor}
                        height={5}
                        className="flex-1"
                      />
                      <span className="w-10 text-right font-mono text-[10px] text-muted">
                        {pct.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>

          {/* Kill-switch panel */}
          <Panel className={k.killSwitchArmed ? "border-neg/30" : "border-pos/20"}>
            <PanelHeader
              title="Global Kill-Switch"
              right={
                <Chip tone={k.killSwitchArmed ? "neg" : "pos"}>
                  {k.killSwitchArmed ? "ARMED — ALL ORDERS HALTED" : "SAFE — NORMAL OPERATIONS"}
                </Chip>
              }
            />
            <div className="flex items-center gap-4 p-4">
              <Ring
                value={k.killSwitchArmed ? 100 : 0}
                size={56}
                stroke={6}
                color={k.killSwitchArmed ? "var(--neg)" : "var(--pos)"}
                label={k.killSwitchArmed ? "OFF" : "ON"}
                sub="status"
              />
              <div className="space-y-1.5 text-xs">
                <p className="text-muted">
                  The global kill-switch instantly halts all new order submission across every execution venue.
                  Circuit breakers are separate per-route (see Gateway console). Kill-switch is audited.
                </p>
                <p className="text-dim">
                  Roles permitted to arm: <span className="font-mono text-accent">Admin</span>,{" "}
                  <span className="font-mono text-accent">Risk</span>.
                  Requires 2-factor confirmation and is written to the audit log.
                </p>
                <Link href="/atlas/resilience" className="inline-flex items-center gap-1 font-mono text-xs text-accent hover:underline">
                  <Shield width={11} height={11} />
                  Open Resilience Console →
                </Link>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
