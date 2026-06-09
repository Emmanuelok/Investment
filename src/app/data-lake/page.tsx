import { PageHeader, Panel, PanelHeader, Chip, KpiCard, Th, Td } from "@/components/ui/kit";
import { LiveStat } from "@/components/live/live-stat";
import { Sparkline, ProgressBar } from "@/components/ui/viz";
import { DATASETS, SNAPSHOTS, STORAGE_GROWTH } from "@/lib/data/core";
import { Icon } from "@/components/icon-map";
import { Database, Shield, Route, Clock } from "@/components/icons";

export const metadata = { title: "PIT Data Lake · PANTHEON Infrastructure" };

const LINEAGE_NODES = [
  { level: 0, id: "signal", label: "ARGUS Signal", value: "z=+2.41 (LMT)", color: "border-accent/40 bg-accent/5 text-accent" },
  { level: 1, id: "score", label: "Composite Score", value: "weighted mean 4 families", color: "border-accent/20 bg-elevated text-muted" },
  { level: 2, id: "disclosure", label: "Disclosure Signal", value: "z=+1.8 · Quiver", color: "border-line bg-base/60 text-dim" },
  { level: 2, id: "nlp", label: "NLP Event Signal", value: "novelty 0.74 · Finnhub+RSS", color: "border-line bg-base/60 text-dim" },
  { level: 2, id: "fundamentals", label: "Fundamental Rank", value: "FCF yield 6.2% · EDGAR", color: "border-line bg-base/60 text-dim" },
  { level: 3, id: "edgarSource", label: "EDGAR XBRL", value: "as_of=2026-06-08 filed_at", color: "border-line bg-base/40 text-faint" },
  { level: 3, id: "quiverSource", label: "Quiver Quant", value: "as_of=2026-06-08 disclosed_at", color: "border-line bg-base/40 text-faint" },
  { level: 3, id: "finnhubSource", label: "Finnhub + GDELT", value: "as_of=2026-06-08 published_at", color: "border-line bg-base/40 text-faint" },
];

export default function DataLakePage() {
  // Build mini chart data (last 20 points for display)
  const growthSeries = STORAGE_GROWTH.slice(-20);

  return (
    <div className="space-y-5">
      <PageHeader
        module={{ name: "PANTHEON · Infrastructure", tone: "accent" }}
        title="PIT Data Lake"
        desc="Append-only archive of every observation, point-in-time. Every backtest, signal, and risk run queries this lake at a specific as_of date — look-ahead bias is structurally impossible."
        right={<Chip tone="accent" dot>Append-only · immutable</Chip>}
      />

      {/* KPI deck */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          label="TOTAL ARCHIVE"
          value={<LiveStat value={38.4} suffix=" TB" decimals={1} vol={0.002} />}
          sub="+84 GB ingested today"
          tone="accent"
          icon={<Database width={15} height={15} />}
        />
        <KpiCard
          label="OBSERVATIONS"
          value={<LiveStat value={312884} decimals={0} vol={0.01} />}
          sub="events classified today"
          tone="accent"
          icon={<Icon name="activity" width={15} height={15} />}
        />
        <KpiCard
          label="TOTAL ROWS"
          value={<LiveStat value={358.9} suffix="B" decimals={1} vol={0.003} />}
          sub="across 9 Parquet datasets"
          icon={<Icon name="layers" width={15} height={15} />}
        />
        <KpiCard
          label="SNAPSHOTS"
          value={SNAPSHOTS.length.toString()}
          sub="recent PIT checkpoints shown"
          tone="pos"
          icon={<Clock width={15} height={15} />}
        />
      </div>

      {/* Datasets table + Storage growth */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel>
            <PanelHeader
              title="Parquet / DuckDB Datasets"
              right={<Chip tone="accent">PIT-enforced · as_of per table</Chip>}
            />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] border-collapse">
                <thead>
                  <tr>
                    <Th>Dataset</Th>
                    <Th>Format</Th>
                    <Th right>Rows</Th>
                    <Th>Partitions</Th>
                    <Th>PIT Semantic</Th>
                    <Th right>Size GB</Th>
                  </tr>
                </thead>
                <tbody>
                  {DATASETS.map((d) => (
                    <tr key={d.name} className="group transition-colors hover:bg-elevated/40">
                      <Td mono className="text-accent">{d.name}</Td>
                      <Td mono={false} className="text-muted">{d.format}</Td>
                      <Td right className="text-ink">{d.rows}</Td>
                      <Td mono className="text-dim text-xs">{d.partitions}</Td>
                      <Td mono className="text-dim text-xs">{d.pitSemantic}</Td>
                      <Td right className="text-muted">{d.sizeGb.toFixed(1)}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-line px-4 py-2.5 text-xs text-dim">
              All datasets are append-only. Corrections create new rows with a later as_of — originals are never mutated.
            </div>
          </Panel>
        </div>

        {/* Storage growth chart */}
        <div className="space-y-4">
          <Panel>
            <PanelHeader title="Storage Growth — 30 Days" right={<Chip tone="pos">+84 GB today</Chip>} />
            <div className="px-4 py-4">
              <div className="flex items-end justify-between">
                <span className="font-mono text-2xl font-bold text-ink">38.4 TB</span>
                <span className="font-mono text-xs text-pos">+0.22% today</span>
              </div>
              <div className="mt-3">
                <Sparkline
                  data={growthSeries}
                  width={280}
                  height={72}
                  color="var(--accent)"
                  strokeWidth={1.8}
                />
              </div>
              <div className="mt-2 flex justify-between font-mono text-[10px] text-faint">
                <span>30 days ago</span>
                <span>today</span>
              </div>
            </div>
            <div className="space-y-2.5 border-t border-line px-4 py-3">
              {[
                { label: "Order Flow (L2/L3)", pct: 68, note: "26.0 TB" },
                { label: "Crypto Full Book", pct: 29, note: "11.3 TB" },
                { label: "Equity OHLCV", pct: 11, note: "4.2 TB" },
                { label: "NLP Events", pct: 8, note: "3.1 TB" },
                { label: "Other datasets", pct: 10, note: "1.8 TB" },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-2">
                  <span className="w-32 shrink-0 text-xs text-dim">{s.label}</span>
                  <ProgressBar value={s.pct} color="var(--accent)" height={5} className="flex-1" />
                  <span className="w-12 shrink-0 text-right font-mono text-[10px] text-muted">{s.note}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      {/* Data lineage viewer */}
      <Panel>
        <PanelHeader
          title="Data Lineage — ARGUS z=+2.41 (LMT)"
          right={
            <div className="flex items-center gap-2">
              <Chip tone="accent">One number, full provenance</Chip>
              <Chip tone="default">as_of 2026-06-08</Chip>
            </div>
          }
        />
        <div className="overflow-x-auto px-4 py-4">
          <div className="min-w-[600px] space-y-3">
            {/* Level 0 - Output signal */}
            <div className="flex justify-center">
              <div className={`rounded border px-4 py-2.5 ${LINEAGE_NODES[0].color}`}>
                <div className="font-mono text-xs font-semibold">{LINEAGE_NODES[0].label}</div>
                <div className="font-mono text-[10px]">{LINEAGE_NODES[0].value}</div>
              </div>
            </div>
            {/* Arrow */}
            <div className="flex justify-center">
              <div className="h-5 w-px bg-accent/30" />
            </div>
            {/* Level 1 */}
            <div className="flex justify-center">
              <div className={`rounded border px-4 py-2.5 ${LINEAGE_NODES[1].color}`}>
                <div className="font-mono text-xs font-medium">{LINEAGE_NODES[1].label}</div>
                <div className="font-mono text-[10px]">{LINEAGE_NODES[1].value}</div>
              </div>
            </div>
            {/* Arrow fan */}
            <div className="relative flex h-6 items-end justify-center">
              <svg width="480" height="24" className="overflow-visible">
                <line x1="240" y1="0" x2="80" y2="24" stroke="var(--line)" strokeWidth="1" />
                <line x1="240" y1="0" x2="240" y2="24" stroke="var(--line)" strokeWidth="1" />
                <line x1="240" y1="0" x2="400" y2="24" stroke="var(--line)" strokeWidth="1" />
              </svg>
            </div>
            {/* Level 2 */}
            <div className="flex justify-around">
              {LINEAGE_NODES.slice(2, 5).map((n) => (
                <div key={n.id} className={`rounded border px-3 py-2 ${n.color}`}>
                  <div className="font-mono text-xs font-medium">{n.label}</div>
                  <div className="font-mono text-[10px]">{n.value}</div>
                </div>
              ))}
            </div>
            {/* Arrow fan level 3 */}
            <div className="relative flex h-6 items-end justify-center">
              <svg width="480" height="24" className="overflow-visible">
                <line x1="80" y1="0" x2="80" y2="24" stroke="var(--line)" strokeWidth="1" />
                <line x1="240" y1="0" x2="240" y2="24" stroke="var(--line)" strokeWidth="1" />
                <line x1="400" y1="0" x2="400" y2="24" stroke="var(--line)" strokeWidth="1" />
              </svg>
            </div>
            {/* Level 3 */}
            <div className="flex justify-around">
              {LINEAGE_NODES.slice(5, 8).map((n) => (
                <div key={n.id} className={`rounded border px-3 py-2 ${n.color}`}>
                  <div className="font-mono text-[11px] font-medium">{n.label}</div>
                  <div className="font-mono text-[9px]">{n.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="border-t border-line px-4 py-2.5 text-xs text-dim">
          Every number in PANTHEON carries a lineage chain — you can trace any output back to the raw source observation and its as_of timestamp.
        </div>
      </Panel>

      {/* Snapshots */}
      <Panel>
        <PanelHeader
          title="Recent PIT Snapshots"
          right={
            <div className="flex items-center gap-2">
              <Chip tone="pos" dot>Hash-chained</Chip>
              <Chip tone="accent">Append-only</Chip>
            </div>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <Th>Snapshot ID</Th>
                <Th>Timestamp (UTC)</Th>
                <Th right>Observations</Th>
                <Th right>Size (MB)</Th>
                <Th>Hash (truncated)</Th>
              </tr>
            </thead>
            <tbody>
              {SNAPSHOTS.map((s, i) => (
                <tr key={s.id} className="group transition-colors hover:bg-elevated/40">
                  <Td mono className={i === 0 ? "text-accent" : "text-muted"}>{s.id}</Td>
                  <Td mono className="text-dim">{s.ts}</Td>
                  <Td right className="text-ink">{s.obs}</Td>
                  <Td right className="text-muted">{s.sizeMb}</Td>
                  <Td mono className="text-dim text-xs">
                    <span className="font-mono text-xs text-dim">sha256:{s.hash}…</span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid grid-cols-3 divide-x divide-line border-t border-line">
          {[
            { label: "RETENTION POLICY", value: "Indefinite" },
            { label: "MUTATION POLICY", value: "Append-only" },
            { label: "HASH ALGORITHM", value: "SHA-256 chain" },
          ].map((s) => (
            <div key={s.label} className="px-4 py-3">
              <div className="kpi-label">{s.label}</div>
              <div className="mt-1 font-mono text-sm text-ink">{s.value}</div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
