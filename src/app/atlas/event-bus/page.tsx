import {
  PageHeader, Panel, PanelHeader, Chip, KpiCard, StatusDot,
  Th, Td,
} from "@/components/ui/kit";
import { Sparkline, ProgressBar } from "@/components/ui/viz";
import { Icon } from "@/components/icon-map";
import { Activity, Database, Play, Check } from "@/components/icons";
import {
  BUS_STREAMS,
  CONSUMER_GROUPS,
  ATLAS_KPIS,
} from "@/lib/data/atlas-spine";
import { IntegrationFlow } from "@/components/atlas/spine/IntegrationFlow";
import { Rng, priceWalk } from "@/lib/rng";
import { fmtNum, fmtInt, fmtCompact } from "@/lib/format";

export const metadata = { title: "Event Bus · ATLAS Platform" };

// Deterministic KPI series
const ebKpiRng = new Rng("eb-kpi-page-v1");
const EB_KPI = {
  eventsPerSec:    ATLAS_KPIS.eventsPerSec,
  streams:         BUS_STREAMS.length,
  consumerGroups:  CONSUMER_GROUPS.length,
  dlqDepth:        BUS_STREAMS.reduce((s, b) => s + b.dlqDepth, 0),
  maxLagMs:        Math.max(...BUS_STREAMS.map((b) => b.lag)),
};

const ebSparkReq = priceWalk("eb-ev-spark", 24, EB_KPI.eventsPerSec, 0.04, 0.001);
const ebSparkLag = priceWalk("eb-lag-spark", 24, 8, 0.06, -0.001);

const DLQ_REPLAYS = [
  { id: "dlq-r-221", stream: "signal.updated", trigger: "consumer restart", fromSeq: "sig-00014821", toSeq: "sig-00014958", events: 137, ts: "2025-12-07 11:42 UTC", status: "complete" as const },
  { id: "dlq-r-220", stream: "event.detected", trigger: "manual — QA audit", fromSeq: "evt-00008210", toSeq: "evt-00008219", events: 9,   ts: "2025-12-06 17:10 UTC", status: "complete" as const },
  { id: "dlq-r-219", stream: "risk.breach",    trigger: "consumer crash",   fromSeq: "rsk-00000881", toSeq: "rsk-00000881", events: 1,   ts: "2025-12-05 09:03 UTC", status: "complete" as const },
];

const STREAM_COLOR: Record<string, string> = {
  OBSIDIAN: "text-accent",
  ARGUS:    "text-pos",
  KEPLER:   "text-info",
  AEGIS:    "text-warn",
  HELIOS:   "text-ai",
};

function lagColor(ms: number): string {
  if (ms < 5)  return "var(--pos)";
  if (ms < 15) return "var(--warn)";
  return "var(--neg)";
}

export default function EventBusPage() {
  const totalThroughput = BUS_STREAMS.reduce((s, b) => s + b.throughput, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        module={{ name: "ATLAS · Platform & Ops", tone: "info" }}
        title="Event Bus — Message Backbone"
        desc="Redis Streams message backbone shared by all six services. Typed events from the contracts package. At-least-once delivery with consumer-group lag monitoring, DLQ, and point-in-time replay."
        right={
          <div className="flex items-center gap-2">
            <Chip tone="pos" dot>All streams healthy</Chip>
            <Chip tone="accent">Redis Streams</Chip>
          </div>
        }
      />

      {/* KPI deck */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <KpiCard
          label="EVENTS / SEC"
          value={fmtCompact(EB_KPI.eventsPerSec)}
          sub={<Sparkline data={ebSparkReq} width={80} height={18} />}
          tone="accent"
          icon={<Activity width={15} height={15} />}
        />
        <KpiCard
          label="STREAMS"
          value={EB_KPI.streams.toString()}
          sub="Named topic partitions"
          icon={<Icon name="layers" width={15} height={15} />}
        />
        <KpiCard
          label="CONSUMER GROUPS"
          value={EB_KPI.consumerGroups.toString()}
          sub="Independent lag pointers per group"
          icon={<Icon name="grid" width={15} height={15} />}
        />
        <KpiCard
          label="DLQ DEPTH"
          value={EB_KPI.dlqDepth.toString()}
          sub="Dead-letter events awaiting replay"
          tone={EB_KPI.dlqDepth > 0 ? "warn" : "pos"}
          icon={<Database width={15} height={15} />}
        />
        <KpiCard
          label="MAX REPLAY LAG"
          value={`${fmtNum(EB_KPI.maxLagMs, 1)} ms`}
          sub={<Sparkline data={ebSparkLag} width={80} height={18} />}
          tone={EB_KPI.maxLagMs > 15 ? "warn" : "pos"}
          icon={<Icon name="gauge" width={15} height={15} />}
        />
      </div>

      {/* Streams table */}
      <Panel>
        <PanelHeader
          title="Stream Catalog"
          sub="One stream per logical event domain — retention, throughput, and consumer registry"
          right={
            <div className="flex items-center gap-2">
              <Chip tone="default">{fmtCompact(totalThroughput)} ev/s total</Chip>
              <Chip tone="pos">{BUS_STREAMS.length} streams</Chip>
            </div>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse">
            <thead>
              <tr>
                <Th>Stream</Th>
                <Th>Producer</Th>
                <Th>Consumers</Th>
                <Th right>Throughput (ev/s)</Th>
                <Th right>Lag (ms)</Th>
                <Th>Retention</Th>
                <Th right>DLQ</Th>
              </tr>
            </thead>
            <tbody>
              {BUS_STREAMS.map((s) => {
                const consumerRng = new Rng(`stream-spark-${s.stream}`);
                const thrSpark = priceWalk(`thr-${s.stream}`, 16, s.throughput, 0.05, 0.0);
                return (
                  <tr key={s.stream} className="group transition-colors hover:bg-elevated/40">
                    <Td mono className="text-xs text-accent">{s.stream}</Td>
                    <Td mono={false}>
                      <span className={`font-mono text-xs font-semibold ${STREAM_COLOR[s.producer] ?? "text-muted"}`}>
                        {s.producer}
                      </span>
                    </Td>
                    <Td mono={false}>
                      <div className="flex flex-wrap gap-1">
                        {s.consumers.map((c) => (
                          <span key={c} className={`chip text-[9px] ${STREAM_COLOR[c] ?? "text-dim"}`}>{c}</span>
                        ))}
                      </div>
                    </Td>
                    <Td right>
                      <div className="flex items-center justify-end gap-2">
                        <Sparkline data={thrSpark} width={48} height={16} />
                        <span className="text-muted">{fmtNum(s.throughput, 0)}</span>
                      </div>
                    </Td>
                    <Td right>
                      <span style={{ color: lagColor(s.lag) }} className="font-mono text-xs">
                        {fmtNum(s.lag, 1)}
                      </span>
                    </Td>
                    <Td mono className="text-xs text-muted">{s.retention}</Td>
                    <Td right>
                      {s.dlqDepth > 0 ? (
                        <Chip tone="warn" className="text-[9px]">{s.dlqDepth}</Chip>
                      ) : (
                        <Check width={13} height={13} className="ml-auto text-pos" />
                      )}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="border-t border-line px-4 py-2.5 text-xs text-dim">
          Events are typed via the contracts package — consumers get compile-time safety.
          Retention is stream-level. MAXLEN auto-trimming keeps hot streams bounded.
        </div>
      </Panel>

      {/* Integration Flow diagram */}
      <Panel>
        <PanelHeader
          title="Integration Flow — Producer → Consumer Map"
          sub="Full 6-service event contract — solid = producer, dashed = consumer downstream"
          right={<Chip tone="info">ATLAS BUS topology</Chip>}
        />
        <div className="p-4">
          <IntegrationFlow />
        </div>
        <div className="border-t border-line px-4 py-3">
          <div className="grid gap-2 text-[11px] sm:grid-cols-2 md:grid-cols-3">
            {[
              { node: "OBSIDIAN → BUS",  desc: "market.bar, market.tick (1.2K–2.2K ev/s)" },
              { node: "ARGUS → BUS",     desc: "signal.updated, event.detected (40–80 ev/s)" },
              { node: "KEPLER → BUS",    desc: "strategy.order_intent (8–18 ev/s)" },
              { node: "BUS → AEGIS",     desc: "order_intent → execution decisions" },
              { node: "AEGIS → BUS",     desc: "order.filled, risk.breach, position.updated" },
              { node: "BUS → HELIOS",    desc: "position.updated, order.filled → analytics" },
            ].map((e) => (
              <div key={e.node} className="flex items-start gap-1.5">
                <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                <span>
                  <span className="font-mono text-accent">{e.node}</span>
                  <span className="ml-1 text-dim">{e.desc}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      {/* Consumer groups + DLQ */}
      <div className="grid gap-4 xl:grid-cols-2">
        {/* Consumer groups */}
        <Panel>
          <PanelHeader
            title="Consumer Groups — Lag Monitor"
            sub="Each group tracks its own offset pointer — lag = messages behind producer head"
            right={<Chip tone="default">{CONSUMER_GROUPS.length} groups</Chip>}
          />
          <div className="divide-y divide-line">
            {CONSUMER_GROUPS.map((cg) => {
              const maxLag = 20;
              const lagPct = Math.min(100, (cg.lag / maxLag) * 100);
              const lagTone =
                cg.lag === 0   ? "var(--pos)"  :
                cg.lag < 8     ? "var(--warn)" : "var(--neg)";
              return (
                <div key={cg.group} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <StatusDot tone={cg.lag === 0 ? "pos" : cg.lag < 8 ? "warn" : "neg"} />
                        <span className="font-mono text-xs text-ink">{cg.group}</span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-1 text-[10px] text-dim">
                        <span className="text-muted">{cg.service}</span>
                        <span>·</span>
                        <span className="text-accent">{cg.stream}</span>
                        <span>·</span>
                        <span>{cg.assigned} partitions</span>
                        <span>·</span>
                        <span>{cg.pending} pending ACK</span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="font-mono text-xs" style={{ color: lagTone }}>
                        lag: {cg.lag}
                      </span>
                    </div>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <ProgressBar
                      value={lagPct}
                      color={lagTone}
                      height={4}
                      className="flex-1"
                      track="var(--elevated)"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        {/* DLQ + Replay */}
        <div className="space-y-4">
          <Panel>
            <PanelHeader
              title="Dead-Letter Queue"
              sub="Events that failed all delivery retries — manual inspection and replay required"
              right={
                <Chip tone={EB_KPI.dlqDepth > 0 ? "warn" : "pos"}>
                  {EB_KPI.dlqDepth} events
                </Chip>
              }
            />
            <div className="p-4 space-y-3">
              {BUS_STREAMS.filter((s) => s.dlqDepth > 0).map((s) => (
                <div key={s.stream} className="flex items-center justify-between rounded border border-warn/20 bg-warn/5 px-3 py-2.5">
                  <div>
                    <div className="font-mono text-xs font-semibold text-warn">{s.stream}</div>
                    <div className="text-[10px] text-dim mt-0.5">
                      {s.dlqDepth} event{s.dlqDepth !== 1 ? "s" : ""} · producer: {s.producer}
                    </div>
                  </div>
                  <Chip tone="warn" className="text-[9px]">{s.dlqDepth} DLQ</Chip>
                </div>
              ))}
              {EB_KPI.dlqDepth === 0 && (
                <div className="flex items-center gap-2 text-xs text-pos">
                  <Check width={13} height={13} />
                  All streams clear — no events in dead-letter queue
                </div>
              )}
            </div>
            <div className="border-t border-line px-4 py-2.5 text-xs text-dim">
              Events are retried 5× with exponential backoff (1s, 2s, 4s, 8s, 16s) before DLQ.
              DLQ events are retained for 90 days. Manual replay required to reprocess.
            </div>
          </Panel>

          {/* Replay panel */}
          <Panel>
            <PanelHeader
              title="Replay — From Point-in-Time"
              sub="Re-deliver any stream slice from a seq# or timestamp — for recovery or audits"
              right={<Chip tone="accent">PIT replay</Chip>}
            />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] border-collapse">
                <thead>
                  <tr>
                    <Th>ID</Th>
                    <Th>Stream</Th>
                    <Th>Trigger</Th>
                    <Th right>Events</Th>
                    <Th>Timestamp</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {DLQ_REPLAYS.map((r) => (
                    <tr key={r.id} className="group transition-colors hover:bg-elevated/40">
                      <Td mono className="text-xs text-accent">{r.id}</Td>
                      <Td mono className="text-xs text-muted">{r.stream}</Td>
                      <Td mono={false} className="text-xs text-dim">{r.trigger}</Td>
                      <Td right className="text-muted">{r.events}</Td>
                      <Td mono className="text-xs text-dim whitespace-nowrap">{r.ts}</Td>
                      <Td mono={false}>
                        <Chip tone="pos" className="text-[9px]">{r.status.toUpperCase()}</Chip>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-start gap-2 border-t border-line px-4 py-3 text-xs text-dim">
              <Play width={12} height={12} className="mt-0.5 shrink-0 text-accent" />
              <span>
                Replay is idempotent — consumers must handle duplicate delivery (at-least-once guarantee).
                Replay range can be specified by seq# range or UTC timestamp window.
              </span>
            </div>
          </Panel>

          {/* Backend note */}
          <Panel className="border-accent/20">
            <PanelHeader
              title="Backend Architecture Note"
              right={<Chip tone="accent">SDK abstraction</Chip>}
            />
            <div className="space-y-3 p-4 text-xs">
              {[
                {
                  icon: "database",
                  text: "Redis Streams is the current backend — used for its consumer group semantics, O(1) XADD, and MAXLEN auto-trim. Production-ready for up to ~50K ev/s.",
                  tone: "text-accent",
                },
                {
                  icon: "layers",
                  text: "NATS JetStream can be swapped in behind the EventBus SDK with no changes to producer or consumer code. Target when >100K ev/s or cross-datacenter replication is needed.",
                  tone: "text-info",
                },
                {
                  icon: "database",
                  text: "Apache Kafka is the highest-scale option for durable event replay at petabyte scale. The EventBus SDK supports Kafka as a third backend via the same producer/consumer interface.",
                  tone: "text-pos",
                },
                {
                  icon: "shield",
                  text: "All events are typed via the contracts package. Producers serialize to JSON with a schema version header. Consumers validate on deserialization — malformed events are rejected to DLQ.",
                  tone: "text-warn",
                },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <Icon name={item.icon} width={13} height={13} className={`mt-0.5 shrink-0 ${item.tone}`} />
                  <p className="text-muted">{item.text}</p>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
