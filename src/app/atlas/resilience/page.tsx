import { PageHeader, Panel, PanelHeader, Chip, KpiCard, Th, Td, StatusDot } from "@/components/ui/kit";
import { ProgressBar } from "@/components/ui/viz";
import { Icon } from "@/components/icon-map";
import { Shield, Database, Check, Clock } from "@/components/icons";
import { KillSwitchToggle } from "@/components/atlas/runtime/KillSwitchToggle";
import { SERVICE_HEALTH, BACKUPS, RUNBOOKS } from "@/lib/data/atlas-runtime";
import { fmtNum } from "@/lib/format";

export const metadata = { title: "Resilience · HA / DR · ATLAS" };

const HEALTH_TONE: Record<string, "pos" | "warn" | "neg"> = {
  healthy:  "pos",
  degraded: "warn",
  down:     "neg",
};

const SEVERITY_STYLE: Record<string, string> = {
  P0: "chip-neg",
  P1: "chip-warn",
  P2: "border-info/30 bg-info/10 text-info",
};

const RESTORE_TONE: Record<string, string> = {
  PASS:    "chip-pos",
  FAIL:    "chip-neg",
  PENDING: "chip-warn",
};

export default function ResiliencePage() {
  const healthyCount = SERVICE_HEALTH.filter((s) => s.health === "healthy").length;
  const degradedCount = SERVICE_HEALTH.filter((s) => s.health === "degraded").length;

  return (
    <div className="space-y-5">
      <PageHeader
        module={{ name: "ATLAS · Platform & Ops", tone: "info" }}
        title="HA / DR / Resilience"
        desc="High-availability, disaster recovery, graceful degradation, and the global kill-switch. PANTHEON is designed to never silently stall — every dependency failure has an explicit fallback."
        right={
          <div className="flex items-center gap-2">
            <Chip tone="pos" dot>{healthyCount}/{SERVICE_HEALTH.length} healthy</Chip>
            {degradedCount > 0 && <Chip tone="warn" dot>{degradedCount} degraded</Chip>}
          </div>
        }
      />

      {/* ── GLOBAL KILL-SWITCH ──────────────────────────────────────────────── */}
      <Panel glow>
        <PanelHeader
          title="GLOBAL KILL-SWITCH — Trading Halt Control"
          right={
            <div className="flex items-center gap-2">
              <Chip tone="neg">Admin + Risk roles only</Chip>
              <Chip tone="warn">Audit-logged</Chip>
            </div>
          }
        />
        <div className="p-4">
          <p className="mb-4 max-w-2xl text-sm text-muted">
            When <span className="font-mono text-warn">ARMED</span>, the kill-switch publishes a{" "}
            <span className="font-mono text-accent">halt.all_trading</span> event over the ATLAS bus.
            All downstream order submission in <span className="font-mono text-ink">AEGIS</span>,{" "}
            <span className="font-mono text-ink">KEPLER</span>, and{" "}
            <span className="font-mono text-ink">HELIOS</span> is suspended within 200 ms.
            The event is <strong className="text-ink">audit-logged</strong>, timestamped, and hash-chained.
            Disarming requires a separate confirm action. Open positions are NOT auto-closed.
          </p>
          <KillSwitchToggle initialArmed={false} />
          <div className="mt-4 grid gap-3 text-xs sm:grid-cols-3">
            {[
              { label: "Propagation",  value: "< 200 ms via NATS bus",              icon: "route"    },
              { label: "Audit",        value: "SHA-256 hash-chained, immutable",    icon: "shield"   },
              { label: "Access",       value: "Admin + Risk roles · MFA required",  icon: "lock"     },
            ].map((f) => (
              <div key={f.label} className="flex items-start gap-2 rounded border border-line bg-elevated/40 px-3 py-2.5">
                <Icon name={f.icon} width={13} height={13} className="mt-0.5 shrink-0 text-info" />
                <div>
                  <div className="kpi-label">{f.label}</div>
                  <div className="mt-0.5 font-mono text-xs text-muted">{f.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      {/* KPI deck */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          label="PLATFORM UPTIME"
          value="99.97%"
          sub="trailing 90 days · all 6 services combined"
          tone="pos"
          icon={<Check width={15} height={15} />}
        />
        <KpiCard
          label="RPO TARGET"
          value="≤ 5 min"
          sub="Postgres primary + WAL shipping at 60s"
          icon={<Clock width={15} height={15} />}
        />
        <KpiCard
          label="RTO TARGET"
          value="≤ 15 min"
          sub="Auto-failover to replica; manual region failover 45 min"
          icon={<Database width={15} height={15} />}
        />
        <KpiCard
          label="LAST DR DRILL"
          value="2026-06-01"
          sub="Full region failover · RTO achieved 41 min · PASS"
          tone="pos"
          icon={<Shield width={15} height={15} />}
        />
      </div>

      {/* Service health / degradation */}
      <Panel>
        <PanelHeader
          title="Service Health & Graceful Degradation"
          right={<Chip tone="info">Never silently stall — explicit fallbacks</Chip>}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[840px] border-collapse">
            <thead>
              <tr>
                <Th>Service</Th>
                <Th>Health</Th>
                <Th>Readiness</Th>
                <Th right>Uptime 90d</Th>
                <Th right>Replicas</Th>
                <Th>Degradation mode (dep down)</Th>
              </tr>
            </thead>
            <tbody>
              {SERVICE_HEALTH.map((svc) => {
                const hTone = HEALTH_TONE[svc.health] ?? "warn";
                const rTone = HEALTH_TONE[svc.readiness] ?? "warn";
                return (
                  <tr key={svc.id} className="group transition-colors hover:bg-elevated/40">
                    <Td mono className="font-semibold text-ink">{svc.name}</Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <StatusDot tone={hTone} pulse={svc.health === "healthy"} />
                        <span className={`font-mono text-xs ${hTone === "pos" ? "text-pos" : hTone === "warn" ? "text-warn" : "text-neg"}`}>
                          {svc.health}
                        </span>
                      </div>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <StatusDot tone={rTone} />
                        <span className={`font-mono text-xs ${rTone === "pos" ? "text-pos" : rTone === "warn" ? "text-warn" : "text-neg"}`}>
                          {svc.readiness}
                        </span>
                      </div>
                    </Td>
                    <Td right className={svc.uptime >= 99.9 ? "text-pos" : "text-warn"}>
                      {fmtNum(svc.uptime, 2)}%
                    </Td>
                    <Td right className={svc.replicasReady === svc.replicas ? "text-pos" : "text-warn"}>
                      {svc.replicasReady}/{svc.replicas}
                    </Td>
                    <Td mono={false} className="text-xs text-muted">{svc.degradationMode}</Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="border-t border-line px-4 py-2.5 text-xs text-dim">
          All degradation modes are tested in the monthly chaos drill. No service silently returns stale data without a{" "}
          <span className="font-mono">degraded</span> status update and a log-level WARNING emitted.
        </div>
      </Panel>

      {/* Backups table */}
      <Panel>
        <PanelHeader
          title="Backup & Restore Status"
          right={
            <div className="flex items-center gap-2">
              <Chip tone="pos" dot>All stores PASS</Chip>
              <Chip tone="warn">A backup you&#39;ve never restored doesn&#39;t count</Chip>
            </div>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse">
            <thead>
              <tr>
                <Th>Store</Th>
                <Th>Technology</Th>
                <Th>Last Backup</Th>
                <Th right>Size</Th>
                <Th>Last Restore Test</Th>
                <Th>Result</Th>
                <Th>RPO</Th>
                <Th>RTO</Th>
              </tr>
            </thead>
            <tbody>
              {BACKUPS.map((b) => (
                <tr key={b.store} className="group transition-colors hover:bg-elevated/40">
                  <Td mono={false} className="font-medium text-ink text-xs">{b.store}</Td>
                  <Td mono={false} className="text-xs text-muted">{b.technology}</Td>
                  <Td mono className="text-xs text-dim whitespace-nowrap">{b.lastBackup}</Td>
                  <Td right className="text-xs text-muted">{b.sizeMb}</Td>
                  <Td mono className="text-xs text-dim">{b.lastRestoreTest}</Td>
                  <Td>
                    <span className={`chip text-[9px] ${RESTORE_TONE[b.restoreResult]}`}>
                      {b.restoreResult}
                    </span>
                  </Td>
                  <Td mono className="text-xs text-accent">{b.rpoTarget}</Td>
                  <Td mono className="text-xs text-muted">{b.rtoTarget}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-line px-4 py-2.5 text-xs text-dim">
          Restore tests are scheduled monthly per store. Any FAIL or PENDING &gt; 45 days triggers a P1 incident.
          The Parquet data lake is immutable on S3 Object Lock — restore is a read-only re-mount, tested quarterly.
        </div>
      </Panel>

      {/* RPO/RTO table + Runbooks */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Redundancy design note */}
        <Panel>
          <PanelHeader title="Redundancy & Failover Design" right={<Chip tone="info">Architecture</Chip>} />
          <div className="space-y-0 divide-y divide-line">
            {[
              { area: "API Gateway",        detail: "N+1 pods behind ALB; circuit breakers per route; health probe /health auto-removes unhealthy pods." },
              { area: "Database (Postgres)", detail: "Multi-AZ RDS with synchronous streaming replica. Auto-failover promotes replica in < 30s. WAL shipped to S3 every 60s." },
              { area: "Event Bus (NATS)",   detail: "3-node JetStream cluster, quorum writes. If 1 node fails, cluster remains available. Messages persisted to disk." },
              { area: "Redis Cache",        detail: "3-node ElastiCache cluster with AOF persistence. Cache-miss path falls through to Postgres — no silent stale reads." },
              { area: "Kubernetes",         detail: "EKS across 3 AZs. PodDisruptionBudgets ensure ≥ 1 replica survives any single AZ loss. HPA scales at 70% CPU." },
              { area: "Service mesh",       detail: "Istio sidecar with automatic retry (idempotent GETs, 2 retries), timeout propagation, and mutual TLS between services." },
            ].map((r) => (
              <div key={r.area} className="flex gap-3 px-4 py-3">
                <Check width={13} height={13} className="mt-0.5 shrink-0 text-pos" />
                <div>
                  <div className="font-mono text-xs font-semibold text-ink">{r.area}</div>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted">{r.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        {/* Runbooks */}
        <Panel>
          <PanelHeader title="Incident Runbooks" right={<Chip tone="default">Tested in monthly drills</Chip>} />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[360px] border-collapse">
              <thead>
                <tr>
                  <Th>ID</Th>
                  <Th>Runbook</Th>
                  <Th>Sev</Th>
                  <Th right>Steps</Th>
                  <Th>Last Drill</Th>
                  <Th>Owner</Th>
                </tr>
              </thead>
              <tbody>
                {RUNBOOKS.map((rb) => (
                  <tr key={rb.id} className="group transition-colors hover:bg-elevated/40">
                    <Td mono className="text-[10px] text-dim">{rb.id}</Td>
                    <Td mono={false} className="text-xs">
                      <div>
                        <div className="font-medium text-ink">{rb.title}</div>
                        <div className="text-[10px] text-dim">{rb.trigger}</div>
                      </div>
                    </Td>
                    <Td>
                      <span className={`chip text-[9px] ${SEVERITY_STYLE[rb.severity]}`}>
                        {rb.severity}
                      </span>
                    </Td>
                    <Td right className="text-muted">{rb.steps}</Td>
                    <Td mono className="text-[10px] text-dim">{rb.lastDrill}</Td>
                    <Td mono={false} className="text-[10px] text-muted">{rb.owner}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-line px-4 py-2.5 text-xs text-dim">
            Runbooks are versioned in Git alongside IaC. Drill results feed back into step refinement.
          </div>
        </Panel>
      </div>

      {/* Error-budget burn visualization */}
      <Panel>
        <PanelHeader title="Error-Budget Burn by Service" right={<Chip tone="info">30-day window</Chip>} />
        <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICE_HEALTH.map((svc) => {
            const burnPct =
              svc.name === "AEGIS"     ? 28.4 :
              svc.name === "ARGUS"     ? 62.1 :
              svc.name === "OBSIDIAN"  ? 12.8 :
              svc.name === "KEPLER"    ? 8.3  :
              svc.name === "HELIOS"    ? 11.2 :
              svc.name === "ATLAS"     ? 2.1  : 10;
            const remainPct = Math.max(0, 100 - burnPct);
            const color =
              remainPct > 60 ? "var(--pos)" : remainPct > 30 ? "var(--warn)" : "var(--neg)";
            return (
              <div key={svc.id}>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-ink">{svc.name}</span>
                  <span className="font-mono text-xs" style={{ color }}>{remainPct.toFixed(1)}% budget left</span>
                </div>
                <ProgressBar value={remainPct} color={color} height={7} />
                <div className="mt-1 text-[10px] text-dim">{fmtNum(svc.uptime, 3)}% uptime · {svc.degradationMode.split(";")[0]}</div>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
