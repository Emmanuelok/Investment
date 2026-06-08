import Link from "next/link";
import { Panel, PanelHeader, Chip, Ticker, Th, Td } from "@/components/ui/kit";
import { Sparkline, ProgressBar } from "@/components/ui/viz";
import { Icon } from "@/components/icon-map";
import { Bolt, External, Sparkle, ChevronRight, Route } from "@/components/icons";
import { OVERVIEW_KPIS, CANDIDATES, ANOMALIES, FAMILY_COVERAGE } from "@/lib/data";
import { fmtSigned } from "@/lib/format";
import { cn } from "@/lib/cn";

export default function OverviewPage() {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Command Overview</h1>
          <p className="mt-1 text-sm text-dim">Cross-signal candidates fused across every family, point-in-time</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn">
            <External width={15} height={15} />
            Publish to OBSIDIAN / AEGIS
          </button>
          <button className="btn btn-accent">
            <Bolt width={15} height={15} />
            New signal
          </button>
        </div>
      </div>

      {/* KPI deck */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {OVERVIEW_KPIS.map((k) => (
          <Panel key={k.label} hover className="scanline px-4 py-3.5">
            <div className="flex items-center justify-between">
              <span className="kpi-label">{k.label}</span>
              <Icon name={k.icon} width={15} height={15} className="text-dim" />
            </div>
            <div className={cn("mt-2.5 font-mono text-2xl leading-none tracking-tight", k.tone === "pos" ? "text-pos" : k.tone === "warn" ? "text-warn" : "text-ink")}>
              {k.value}
            </div>
            <div className="mt-2 text-xs text-dim">{k.sub}</div>
          </Panel>
        ))}
      </div>

      {/* Candidates table */}
      <Panel>
        <PanelHeader
          title="Top Cross-Signal Candidates — Today"
          right={<Chip tone="accent">One fused model · entity × as_of</Chip>}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse">
            <thead>
              <tr>
                <Th>Entity</Th>
                <Th>Composite thesis (glass-box)</Th>
                <Th right>Z</Th>
                <Th right>IC 60D</Th>
                <Th right>Decay</Th>
                <Th right>Crowding</Th>
                <Th right>30D</Th>
                <Th right>Trace</Th>
              </tr>
            </thead>
            <tbody>
              {CANDIDATES.map((c) => {
                const crowdTone = c.crowding === "LOW" ? "pos" : c.crowding === "MED" ? "warn" : "neg";
                return (
                  <tr key={c.sym} className="group transition-colors hover:bg-elevated/40">
                    <Td mono={false}>
                      <Ticker sym={c.sym} name={c.name} />
                    </Td>
                    <Td mono={false} className="max-w-[420px] text-muted">
                      <span className="text-sm">{c.thesis}</span>
                    </Td>
                    <Td right className={c.z >= 0 ? "text-pos" : "text-neg"}>
                      {fmtSigned(c.z)}
                    </Td>
                    <Td right className="text-muted">{c.ic.toFixed(3)}</Td>
                    <Td right className="text-muted">{c.decay}d</Td>
                    <Td right>
                      <Chip tone={crowdTone as "pos" | "warn" | "neg"}>{c.crowding}</Chip>
                    </Td>
                    <Td right>
                      <div className="flex justify-end">
                        <Sparkline data={c.spark} width={92} height={26} />
                      </div>
                    </Td>
                    <Td right>
                      <Link href="/data-lake" className="inline-flex items-center gap-1 font-mono text-xs text-accent hover:underline">
                        <Route width={13} height={13} /> lineage
                      </Link>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Bottom row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="Anomaly & Event Alerts" right={<Chip tone="ai"><Sparkle width={11} height={11} /> AI Copilot</Chip>} />
          <ul className="divide-y divide-line">
            {ANOMALIES.map((a, i) => (
              <li key={i} className="flex gap-3 px-4 py-3.5">
                <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", a.tone === "pos" ? "bg-pos" : a.tone === "warn" ? "bg-warn" : "bg-neg")} />
                <p className="text-sm text-muted">
                  <span className="font-medium text-ink">{a.head}</span> {a.body}{" "}
                  <Link href={a.href} className="font-mono text-xs text-accent hover:underline">
                    {a.cta}
                  </Link>
                </p>
              </li>
            ))}
          </ul>
          <div className="border-t border-line px-4 py-2.5">
            <Link href="/copilot" className="flex items-center justify-between text-xs text-dim hover:text-muted">
              <span>ATHENA explains every alert with cited evidence</span>
              <ChevronRight width={14} height={14} />
            </Link>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Signal-Family Coverage" />
          <div className="space-y-3.5 px-4 py-4">
            {FAMILY_COVERAGE.map((f) => (
              <div key={f.label} className="flex items-center gap-3">
                <span className="w-32 shrink-0 text-sm text-muted">{f.label}</span>
                <ProgressBar value={f.pct} color={f.color} className="flex-1" height={7} />
                <span className="w-10 shrink-0 text-right font-mono text-xs text-muted">{f.pct}%</span>
              </div>
            ))}
          </div>
          <div className="flex items-start gap-2 border-t border-line px-4 py-3 text-xs text-dim">
            <Icon name="lock" width={14} height={14} className="mt-0.5 shrink-0 text-faint" />
            <span>Panel family inactive — runs on free demand proxies until a transaction license is provisioned.</span>
          </div>
        </Panel>
      </div>
    </div>
  );
}
