import { LiveStat, LiveDot } from "@/components/live/live-stat";
import { PageHeader, Panel, PanelHeader, Chip, KpiCard, Th, Td, StatusDot } from "@/components/ui/kit";
import { Sparkline, MiniBars, ProgressBar } from "@/components/ui/viz";
import { Icon } from "@/components/icon-map";
import { Activity, Bell, Database, Gauge, Clock, Warn, Check } from "@/components/icons";
import {
  OBS_SLOS,
  METRIC_CHARTS,
  RECENT_LOGS,
  SAMPLE_TRACE,
  ALERTS,
} from "@/lib/data/atlas-runtime";
import { fmtNum, fmtInt, fmtCompact } from "@/lib/format";
import { cn } from "@/lib/cn";

export const metadata = { title: "Observability & Monitoring · ATLAS" };

const SEVERITY_TONE: Record<string, string> = {
  critical: "chip-neg",
  high:     "border-neg/30 bg-neg/10 text-neg",
  medium:   "chip-warn",
  low:      "border-info/30 bg-info/10 text-info",
};

const LOG_LEVEL_STYLE: Record<string, string> = {
  INFO:  "border-info/30 bg-info/10 text-info",
  WARN:  "chip-warn",
  ERROR: "chip-neg",
};

const TRACE_COLORS: Record<string, string> = {
  "atlas-gateway":    "var(--accent)",
  "atlas-identity":   "var(--info)",
  "aegis-execution":  "var(--warn)",
  "aegis-risk":       "var(--warn)",
  "atlas-secmaster":  "var(--info)",
  "postgres-primary": "var(--pos)",
  "redis-cluster":    "var(--pos)",
  "atlas-audit":      "var(--muted, #8899aa)",
  "atlas-bus":        "var(--accent)",
};

const TRACE_TOTAL_MS = 28.4;

export default function ObservabilityPage() {
  const firingCount = ALERTS.filter((a) => a.status === "firing").length;

  return (
    <div className="space-y-5">
      <PageHeader
        module={{ name: "ATLAS · Platform & Ops", tone: "info" }}
        title="Observability & Monitoring"
        desc="Real-time platform telemetry, SLOs, distributed traces, and structured logs across all 6 PANTHEON services. Markets never stop — neither does the signal."
        right={
          <div className="flex items-center gap-2">
            <LiveDot />
            <Chip tone="neg" dot>{firingCount} alerts firing</Chip>
            <Chip tone="default">Prometheus · Grafana · Loki · Jaeger</Chip>
          </div>
        }
      />

      {/* KPI deck */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <KpiCard
          label="SERVICES MONITORED"
          value="6 / 6"
          sub="OBSIDIAN · AEGIS · ARGUS · KEPLER · HELIOS · ATLAS"
          tone="pos"
          icon={<Activity width={15} height={15} />}
        />
        <KpiCard
          label="METRICS / SEC"
          value={fmtCompact(48_420)}
          sub="Prometheus scrape interval 15s across all targets"
          tone="accent"
          icon={<Gauge width={15} height={15} />}
        />
        <KpiCard
          label="P99 LATENCY"
          value={<LiveStat value={28.4} suffix=" ms" decimals={1} vol={0.05} />}
          sub="gateway → service round-trip · 1-min rolling"
          icon={<Clock width={15} height={15} />}
        />
        <KpiCard
          label="ERROR BUDGET BURN"
          value={<LiveStat value={1.8} suffix="×" decimals={1} vol={0.02} />}
          sub="order latency SLO burning 1.8× normal rate"
          tone="warn"
          icon={<Warn width={15} height={15} />}
        />
        <KpiCard
          label="ACTIVE ALERTS"
          value={firingCount.toString()}
          sub={`${ALERTS.filter((a) => a.status === "resolved").length} resolved in last 24h`}
          tone={firingCount > 2 ? "warn" : "pos"}
          icon={<Bell width={15} height={15} />}
        />
      </div>

      {/* SLOs + Metrics row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* SLO panel */}
        <Panel>
          <PanelHeader
            title="SLO Status — Error Budget"
            right={<Chip tone="info">30-day rolling windows</Chip>}
          />
          <div className="divide-y divide-line">
            {OBS_SLOS.map((slo) => {
              const budgetColor =
                slo.budgetRemainingPct > 60
                  ? "var(--pos)"
                  : slo.budgetRemainingPct > 30
                  ? "var(--warn)"
                  : "var(--neg)";
              const statusTone =
                slo.status === "ok" ? "pos" : slo.status === "warn" ? "warn" : "neg";
              return (
                <div key={slo.name} className="px-4 py-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <StatusDot tone={statusTone} pulse={slo.status === "ok"} />
                        <span className="font-mono text-xs font-medium text-ink">{slo.name}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-dim">{slo.description}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-mono text-sm text-ink">{slo.currentPct.toFixed(3)}%</div>
                      <div className="text-[10px] text-dim">target {slo.targetPct}% · {slo.window}</div>
                    </div>
                  </div>
                  <div className="mt-2.5 flex items-center gap-2">
                    <ProgressBar
                      value={slo.budgetRemainingPct}
                      color={budgetColor}
                      track="var(--line)"
                      height={6}
                      className="flex-1"
                    />
                    <span className="w-16 shrink-0 text-right font-mono text-xs" style={{ color: budgetColor }}>
                      {fmtNum(slo.budgetRemainingPct, 1)}% left
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="border-t border-line px-4 py-2 text-xs text-dim">
            Budget consumed = (1 – current/target) / (1 – target). Alert fires at &lt;50% remaining.
          </div>
        </Panel>

        {/* Alerts table */}
        <Panel>
          <PanelHeader
            title="Active Alerts"
            right={
              <div className="flex items-center gap-1.5">
                <Chip tone="neg" dot>{firingCount} firing</Chip>
                <Chip tone="default">Alertmanager</Chip>
              </div>
            }
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] border-collapse">
              <thead>
                <tr>
                  <Th>Alert</Th>
                  <Th>Sev</Th>
                  <Th>Service</Th>
                  <Th>Status</Th>
                  <Th right>Since</Th>
                </tr>
              </thead>
              <tbody>
                {ALERTS.map((a) => (
                  <tr key={a.id} className={cn("group transition-colors hover:bg-elevated/40", a.status === "resolved" && "opacity-50")}>
                    <Td mono={false} className="text-xs">
                      <div className="flex flex-col">
                        <span className="font-medium text-ink">{a.alert}</span>
                        <span className="text-[10px] text-dim">{a.id} · {a.value}</span>
                      </div>
                    </Td>
                    <Td>
                      <span className={cn("chip text-[9px]", SEVERITY_TONE[a.severity])}>
                        {a.severity.toUpperCase()}
                      </span>
                    </Td>
                    <Td mono className="text-xs text-muted">{a.service}</Td>
                    <Td>
                      <span className={cn("chip text-[9px]", a.status === "firing" ? "chip-neg" : "chip-pos")}>
                        {a.status.toUpperCase()}
                      </span>
                    </Td>
                    <Td right className="text-xs text-dim">{a.since}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-line px-4 py-2 text-xs text-dim">
            Routing via Alertmanager → PagerDuty (P0/P1) · Slack #ops-alerts (P2+)
          </div>
        </Panel>
      </div>

      {/* Metrics dashboard grid */}
      <Panel>
        <PanelHeader
          title="Metrics Dashboard — 24h Rolling"
          right={<Chip tone="default">Prometheus · 15s scrape</Chip>}
        />
        <div className="grid grid-cols-2 gap-px bg-line md:grid-cols-3 xl:grid-cols-6">
          {METRIC_CHARTS.map((m) => (
            <div key={m.key} className="bg-panel px-4 py-3">
              <div className="kpi-label">{m.label}</div>
              <div className="mt-1.5 flex items-end justify-between gap-2">
                <span className="font-mono text-lg font-semibold text-ink">
                  {m.key === "cache-hit"
                    ? `${fmtNum(m.current, 1)}%`
                    : m.key === "ingestion-lag" || m.key === "order-latency"
                    ? `${fmtNum(m.current, 1)} ms`
                    : fmtCompact(m.current)}
                </span>
                <span className="text-[10px] text-dim">{m.unit}</span>
              </div>
              <div className="mt-2">
                {m.kind === "sparkline" ? (
                  <Sparkline data={m.data} width={110} height={28} color={m.color} area />
                ) : (
                  <MiniBars data={m.data} width={110} height={28} color={m.color} />
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-line px-4 py-2 text-xs text-dim">
          DEMO — live dashboards in Grafana. Panels auto-link to runbooks on threshold breach.
        </div>
      </Panel>

      {/* Logs + Trace row */}
      <div className="grid gap-4 xl:grid-cols-2">
        {/* Structured logs */}
        <Panel>
          <PanelHeader
            title="Structured Log Stream — Recent"
            right={<Chip tone="default">Loki · OpenTelemetry</Chip>}
          />
          <div className="divide-y divide-line/60">
            {RECENT_LOGS.map((line, i) => (
              <div key={i} className="flex gap-3 px-4 py-2.5 hover:bg-elevated/40">
                <div className="mt-0.5 shrink-0">
                  <span className={cn("chip text-[9px]", LOG_LEVEL_STYLE[line.level])}>
                    {line.level}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="font-mono text-[10px] text-dim">{line.ts.slice(11, 23)}</span>
                    <span className="font-mono text-[10px] text-accent">{line.service}</span>
                    <span className="font-mono text-xs font-medium text-ink">{line.msg}</span>
                  </div>
                  <p className="mt-0.5 truncate font-mono text-[10px] text-dim">{line.fields}</p>
                </div>
                <span className="shrink-0 font-mono text-[10px] text-faint">{line.trace_id}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-line px-4 py-2 text-xs text-dim">
            Log retention: 30d hot (Loki) · 1 year cold (S3). Structured JSON — full trace correlation via trace_id.
          </div>
        </Panel>

        {/* Distributed trace */}
        <Panel>
          <PanelHeader
            title="Distributed Trace — Sample Order Submit"
            right={
              <div className="flex items-center gap-2">
                <Chip tone="warn">p99 34.1 ms</Chip>
                <Chip tone="default">Jaeger · OTel</Chip>
              </div>
            }
          />
          <div className="px-4 py-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-xs text-dim">trace_id: 7d1e5f0a · POST /api/orders/submit</span>
              <span className="font-mono text-xs text-warn">28.4 ms total</span>
            </div>
            <div className="space-y-1.5">
              {SAMPLE_TRACE.map((span, i) => {
                const leftPct = (span.startMs / TRACE_TOTAL_MS) * 100;
                const widthPct = Math.max(1, (span.durationMs / TRACE_TOTAL_MS) * 100);
                const color = TRACE_COLORS[span.service] ?? "var(--muted)";
                return (
                  <div key={i} className="flex items-center gap-2">
                    {/* Indent */}
                    <div style={{ width: span.depth * 14 }} className="shrink-0" />
                    {/* Label */}
                    <div className="w-44 shrink-0">
                      <span className="font-mono text-[10px] text-muted truncate block">{span.name}</span>
                    </div>
                    {/* Bar track */}
                    <div className="relative flex-1 overflow-hidden rounded-full bg-elevated/60" style={{ height: 10 }}>
                      <div
                        className="absolute top-0 h-full rounded-full"
                        style={{
                          left: `${leftPct}%`,
                          width: `${widthPct}%`,
                          background: span.status === "error" ? "var(--neg)" : span.status === "warn" ? "var(--warn)" : color,
                          opacity: 0.85,
                        }}
                      />
                    </div>
                    <span className="w-14 shrink-0 text-right font-mono text-[10px] text-dim">
                      {span.durationMs.toFixed(1)} ms
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex items-center gap-4 text-[10px] text-dim">
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-4 rounded" style={{ background: "var(--warn)" }} />warn span</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-4 rounded" style={{ background: "var(--neg)" }} />error span</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-4 rounded" style={{ background: "var(--pos)" }} />ok span</span>
            </div>
          </div>
          <div className="border-t border-line px-4 py-2 text-xs text-dim">
            DEMO snapshot. Live traces in Jaeger UI — all spans carry trace_id for log correlation.
          </div>
        </Panel>
      </div>

      {/* Stack note */}
      <Panel>
        <PanelHeader title="Observability Stack" right={<Chip tone="info">Infrastructure</Chip>} />
        <div className="grid gap-px bg-line md:grid-cols-3 lg:grid-cols-6">
          {[
            { name: "Prometheus", role: "Metrics collection & alerting rules", icon: "activity" },
            { name: "Grafana",    role: "Dashboards, panels & on-call runbooks",icon: "gauge"    },
            { name: "Loki",       role: "Structured log aggregation & queries",  icon: "doc"      },
            { name: "OpenTelemetry",role: "SDK tracing & metric instrumentation",icon: "route"    },
            { name: "Jaeger",     role: "Distributed trace storage & UI",        icon: "layers"   },
            { name: "Alertmanager",role: "Alert routing → PagerDuty / Slack",    icon: "bell"     },
          ].map((s) => (
            <div key={s.name} className="bg-panel px-4 py-3.5">
              <div className="flex items-center gap-2">
                <Icon name={s.icon} width={14} height={14} className="text-info" />
                <span className="font-mono text-xs font-semibold text-ink">{s.name}</span>
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-muted">{s.role}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
