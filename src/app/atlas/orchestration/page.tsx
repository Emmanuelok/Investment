import {
  PageHeader, Panel, PanelHeader, Chip, KpiCard,
  StatusDot, Th, Td,
} from "@/components/ui/kit";
import { ProgressBar, Ring } from "@/components/ui/viz";
import { Icon } from "@/components/icon-map";
import { Play, Clock, Check, Warn, Activity } from "@/components/icons";
import { fmtInt } from "@/lib/format";
import { DagGraph } from "@/components/atlas/ops/DagGraph";
import {
  ORCH_KPIS,
  DAG_NODES,
  DAG_EDGES,
  SCHEDULES,
  RECENT_RUNS,
  BACKFILLS,
} from "@/lib/data/atlas-ops";

export const metadata = { title: "Orchestration & Scheduling · ATLAS Platform & Ops" };

function fmtDuration(sec: number | null): string {
  if (sec === null) return "—";
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
}

const RUN_STATUS_TONE: Record<string, "pos" | "neg" | "accent"> = {
  success: "pos",
  failed:  "neg",
  running: "accent",
};

const SCH_STATUS_TONE: Record<string, "pos" | "warn"> = {
  active: "pos",
  paused: "warn",
};

const LAST_RUN_TONE: Record<string, "pos" | "neg" | "accent"> = {
  success: "pos",
  failed:  "neg",
  running: "accent",
};

const BACKFILL_TONE: Record<string, "accent" | "pos" | "info"> = {
  running:  "accent",
  complete: "pos",
  queued:   "info",
};

export default function OrchestrationPage() {
  const failedToday = RECENT_RUNS.filter((r) => r.status === "failed").length;
  const runningNow  = RECENT_RUNS.filter((r) => r.status === "running").length;

  return (
    <div className="space-y-5">
      <PageHeader
        module={{ name: "ATLAS · Platform & Ops", tone: "info" }}
        title="Orchestration & Scheduling"
        desc="Dagster-based asset materialization, dependency graphs, and nightly job scheduling across the PANTHEON 6-service suite."
        right={
          <div className="flex items-center gap-2">
            <Chip tone="accent" dot>{runningNow} running</Chip>
            {failedToday > 0 && <Chip tone="neg" dot>{failedToday} failed</Chip>}
            <Chip tone="info">Dagster {ORCH_KPIS.dagsterVersion}</Chip>
          </div>
        }
      />

      {/* KPI deck */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          label="SOFTWARE ASSETS"
          value={ORCH_KPIS.softwareAssets.toString()}
          sub="Registered in asset graph"
          tone="info"
          icon={<Icon name="layers" width={15} height={15} />}
        />
        <KpiCard
          label="SCHEDULED JOBS"
          value={ORCH_KPIS.scheduledJobs.toString()}
          sub="Active cron schedules"
          icon={<Clock width={15} height={15} />}
        />
        <KpiCard
          label="RUNS TODAY"
          value={fmtInt(ORCH_KPIS.runsToday)}
          sub={`${failedToday} failed · ${runningNow} running`}
          tone={failedToday > 0 ? "warn" : "pos"}
          icon={<Play width={15} height={15} />}
        />
        <KpiCard
          label="SUCCESS RATE"
          value={`${ORCH_KPIS.successRate}%`}
          sub="Rolling 7-day window"
          tone="pos"
          icon={<Check width={15} height={15} />}
        />
        <KpiCard
          label="AVG RUNTIME"
          value={fmtDuration(ORCH_KPIS.avgRuntimeSec)}
          sub="Across all job types"
          icon={<Activity width={15} height={15} />}
        />
        <KpiCard
          label="LAST FAILURE"
          value={ORCH_KPIS.lastFailure.split("-").slice(0, 2).join("-")}
          sub={ORCH_KPIS.lastFailureTs}
          tone="neg"
          icon={<Warn width={15} height={15} />}
        />
      </div>

      {/* Asset Lineage / DAG panel */}
      <Panel>
        <PanelHeader
          title="Asset Lineage — Dependency Graph"
          sub="Core nightly pipeline + parallel ingestion / model jobs — arrows show data dependencies"
          right={
            <div className="flex items-center gap-2">
              <Chip tone="pos" dot>{DAG_NODES.filter((n) => n.status === "materialized").length} materialized</Chip>
              {DAG_NODES.filter((n) => n.status === "running").length > 0 && (
                <Chip tone="accent" dot>{DAG_NODES.filter((n) => n.status === "running").length} running</Chip>
              )}
              {DAG_NODES.filter((n) => n.status === "failed").length > 0 && (
                <Chip tone="neg" dot>{DAG_NODES.filter((n) => n.status === "failed").length} failed</Chip>
              )}
            </div>
          }
        />
        <div className="px-4 py-4">
          <DagGraph nodes={DAG_NODES} edges={DAG_EDGES} />
        </div>
        <div className="border-t border-line px-4 py-2.5 text-xs text-dim">
          <span className="font-mono text-faint">secmaster-refresh</span> is the root dependency — all downstream jobs read canonical instrument data. <span className="font-mono text-faint">kepler-model-retrain</span> failure does not block <span className="font-mono text-faint">reconciliation</span> (non-blocking edge, last good model used). DEMO DATA.
        </div>
      </Panel>

      {/* Schedules table */}
      <Panel>
        <PanelHeader
          title="Job Schedules"
          sub="Cron-based triggers — last/next run, SLA, and status"
          right={
            <div className="flex items-center gap-2">
              <Chip tone="pos" dot>{SCHEDULES.filter((s) => s.status === "active").length} active</Chip>
              <Chip tone="warn" dot>{SCHEDULES.filter((s) => s.status === "paused").length} paused</Chip>
            </div>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] border-collapse">
            <thead>
              <tr>
                <Th>Job</Th>
                <Th>Description</Th>
                <Th>Schedule</Th>
                <Th>Last Run</Th>
                <Th>Last Status</Th>
                <Th>Next Run</Th>
                <Th right>SLA</Th>
                <Th right>Last Duration</Th>
                <Th>Owner</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {SCHEDULES.map((s) => {
                const lastTone  = LAST_RUN_TONE[s.lastRunStatus];
                const slaBreached = s.lastDurationSec > 0 && s.lastDurationSec > s.slaMins * 60;
                return (
                  <tr key={s.id} className="group hover:bg-elevated/40 transition-colors">
                    <Td className="text-xs font-semibold text-ink">{s.job}</Td>
                    <Td mono={false} className="text-xs text-dim max-w-[200px]">{s.description}</Td>
                    <Td mono={false} className="text-xs">
                      <div className="font-mono text-[10px] text-muted">{s.cron}</div>
                      <div className="text-[10px] text-dim">{s.cronHuman}</div>
                    </Td>
                    <Td className="text-[10px] text-dim">{s.lastRun}</Td>
                    <Td mono={false}>
                      <div className="flex items-center gap-1.5">
                        <StatusDot tone={lastTone} pulse={s.lastRunStatus === "running"} />
                        <span className={`text-xs font-mono ${lastTone === "pos" ? "text-pos" : lastTone === "neg" ? "text-neg" : "text-accent"}`}>
                          {s.lastRunStatus}
                        </span>
                      </div>
                    </Td>
                    <Td className="text-[10px] text-dim">{s.nextRun}</Td>
                    <Td right className={slaBreached ? "text-neg" : "text-dim"}>
                      {s.slaMins}m
                    </Td>
                    <Td right className={slaBreached ? "text-neg" : s.lastDurationSec === 0 ? "text-dim" : "text-muted"}>
                      {s.lastDurationSec === 0 ? "—" : fmtDuration(s.lastDurationSec)}
                    </Td>
                    <Td mono={false}>
                      <span className="rounded border border-line bg-elevated/60 px-1.5 py-0.5 font-mono text-[9px] text-dim">
                        {s.owner}
                      </span>
                    </Td>
                    <Td mono={false}>
                      <Chip tone={SCH_STATUS_TONE[s.status]} className="text-[9px]">{s.status}</Chip>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="border-t border-line px-4 py-2.5 text-xs text-dim">
          SLA breach triggers PagerDuty P2 alert. All jobs are idempotent — safe to re-run. Failure alerting configured per owner; downstream jobs use last successfully materialized asset version.
        </div>
      </Panel>

      {/* Backfills + Recent Runs side-by-side */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Backfills */}
        <Panel>
          <PanelHeader
            title="Backfills"
            sub="Historical partition re-materialization"
            right={
              <div className="flex items-center gap-2">
                {BACKFILLS.filter((b) => b.status === "running").map((b) => (
                  <Chip key={b.id} tone="accent" dot>running: {b.job}</Chip>
                ))}
              </div>
            }
          />
          <div className="space-y-0 divide-y divide-line">
            {BACKFILLS.map((b) => {
              const tone = BACKFILL_TONE[b.status];
              return (
                <div key={b.id} className="px-4 py-3 space-y-2 hover:bg-elevated/40 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-ink">{b.job}</span>
                        <Chip tone={tone} className="text-[9px]">{b.status}</Chip>
                      </div>
                      <div className="mt-0.5 font-mono text-[10px] text-dim">{b.id}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono text-xs text-ink">{b.donePartitions} / {b.totalPartitions}</div>
                      <div className="text-[10px] text-dim">partitions</div>
                    </div>
                  </div>
                  <div className="text-[11px] text-dim">{b.dateRange}</div>
                  <ProgressBar
                    value={b.progress}
                    max={100}
                    height={5}
                    color={`var(--${tone === "pos" ? "pos" : tone === "accent" ? "accent" : "info"})`}
                    showGlow={b.status === "running"}
                  />
                  <div className="flex justify-between text-[10px] text-faint">
                    <span>by {b.triggeredBy}</span>
                    <span>{b.startedAt}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="border-t border-line px-4 py-2.5 text-xs text-dim">
            Backfills are partition-aware and respect upstream dependencies. Running backfills do not block live schedules.
          </div>
        </Panel>

        {/* Recent Runs */}
        <Panel>
          <PanelHeader
            title="Recent Runs"
            sub="Most recent job executions across all schedules"
            right={
              <div className="flex items-center gap-2">
                <Chip tone="pos" dot>{RECENT_RUNS.filter((r) => r.status === "success").length} ok</Chip>
                <Chip tone="neg" dot>{RECENT_RUNS.filter((r) => r.status === "failed").length} failed</Chip>
              </div>
            }
          />
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <Th>Run ID</Th>
                  <Th>Job</Th>
                  <Th>Status</Th>
                  <Th right>Duration</Th>
                  <Th right>Retries</Th>
                  <Th>Started</Th>
                </tr>
              </thead>
              <tbody>
                {RECENT_RUNS.map((r) => {
                  const tone = RUN_STATUS_TONE[r.status];
                  return (
                    <tr
                      key={r.runId}
                      className={`group hover:bg-elevated/40 transition-colors ${r.status === "failed" ? "bg-neg/5" : ""}`}
                    >
                      <Td className="text-[10px] text-dim">{r.runId}</Td>
                      <Td className="text-xs font-semibold text-ink">{r.job}</Td>
                      <Td mono={false}>
                        <div className="flex items-center gap-1.5">
                          <StatusDot tone={tone} pulse={r.status === "running"} />
                          <span className={`text-xs font-mono ${tone === "pos" ? "text-pos" : tone === "neg" ? "text-neg" : "text-accent"}`}>
                            {r.status}
                          </span>
                        </div>
                      </Td>
                      <Td right className={r.durationSec === null ? "text-dim" : "text-muted"}>
                        {fmtDuration(r.durationSec)}
                      </Td>
                      <Td right className={r.retries > 0 ? "text-warn" : "text-dim"}>
                        {r.retries > 0 ? (
                          <span className="flex items-center justify-end gap-1">
                            <Warn width={10} height={10} className="text-warn" />
                            {r.retries}
                          </span>
                        ) : (
                          <span>0</span>
                        )}
                      </Td>
                      <Td className="text-[10px] text-dim whitespace-nowrap">{r.startedAt}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      {/* Success rate ring + data-asset lineage note */}
      <div className="grid gap-4 md:grid-cols-3">
        <Panel className="flex flex-col items-center justify-center gap-3 py-6">
          <Ring
            value={ORCH_KPIS.successRate}
            max={100}
            size={88}
            stroke={7}
            color="var(--pos)"
            label={`${ORCH_KPIS.successRate}%`}
            sub="7d success"
          />
          <div className="text-center">
            <div className="section-label text-[10px]">Run Success Rate</div>
            <div className="mt-1 text-xs text-dim">Rolling 7-day window</div>
          </div>
        </Panel>

        <Panel className="md:col-span-2">
          <PanelHeader
            title="Failure Alerting & Data-Asset Lineage"
            right={<Chip tone="info">Operational notes</Chip>}
          />
          <div className="space-y-3 p-4 text-xs text-dim leading-relaxed">
            <div className="flex items-start gap-2">
              <StatusDot tone="neg" />
              <p>
                <span className="font-medium text-ink">Failure alerting:</span> Each job owner receives PagerDuty alerts within 2 minutes of failure. SLA breaches (runtime &gt; configured threshold) trigger P2. Repeated failures on the same job trigger P1 escalation after 3 retries.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <StatusDot tone="accent" />
              <p>
                <span className="font-medium text-ink">Data-asset lineage:</span> Dagster tracks every asset materialization with upstream dependencies. Downstream consumers of a stale asset receive a freshness warning. The complete lineage graph is queryable via the Dagster GraphQL API at <span className="font-mono text-faint">/dagster-plus/lineage</span>.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <StatusDot tone="warn" />
              <p>
                <span className="font-medium text-ink">Retry semantics:</span> All jobs are idempotent. Max 3 retries with exponential backoff (30s, 120s, 300s). Failed runs do not cascade — downstream jobs use the last successfully materialized version of each asset.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <StatusDot tone="pos" />
              <p>
                <span className="font-medium text-ink">Partitioned assets:</span> EOD-processing and secmaster-refresh are daily-partitioned. Any single day can be re-materialized independently via backfill without re-running adjacent partitions. Historical backfills run in parallel capped at 8 concurrent partition runs.
              </p>
            </div>
          </div>
          <div className="border-t border-line px-4 py-2.5 text-xs text-dim">
            Dagster {ORCH_KPIS.dagsterVersion} · {ORCH_KPIS.softwareAssets} software assets · {ORCH_KPIS.scheduledJobs} schedules · DEMO DATA
          </div>
        </Panel>
      </div>
    </div>
  );
}
