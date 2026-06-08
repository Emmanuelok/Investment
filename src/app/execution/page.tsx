import {
  PageHeader, Panel, PanelHeader, Chip, KpiCard, Stat,
  Th, Td, Ticker, StatusDot,
} from "@/components/ui/kit";
import { ProgressBar, Sparkline, DeltaBars } from "@/components/ui/viz";
import { Icon } from "@/components/icon-map";
import { Shield, Wave } from "@/components/icons";
import {
  execAlgos, sorVenues, FIX_SESSIONS, TCA_METRICS, TCA_DECOMP,
  TCA_SERIES, TCA_VWAP_SERIES, EMS_KPIS,
  type AlgoStatus, type FixStatus,
} from "@/lib/data/aegis-exec";
import { fmtNum, fmtInt, fmtBps, fmtUsdCompact, signClass } from "@/lib/format";
import { cn } from "@/lib/cn";

export const metadata = { title: "EMS Execution — AEGIS" };

/* ── helpers ──────────────────────────────────────────────────────────────── */

const ALGO_STATUS_TONE: Record<AlgoStatus, "pos" | "warn" | "accent" | "default"> = {
  RUNNING:  "accent",
  COMPLETE: "pos",
  PAUSED:   "warn",
  IDLE:     "default",
};

const FIX_STATUS_TONE: Record<FixStatus, "pos" | "warn" | "neg" | "default"> = {
  ACTIVE:       "pos",
  LOGON:        "warn",
  LOGOUT:       "warn",
  DISCONNECTED: "neg",
  RESET:        "warn",
};

/* ── page ─────────────────────────────────────────────────────────────────── */

export default function ExecutionPage() {
  const algos = execAlgos();
  const venues = sorVenues();
  const fixSessions = FIX_SESSIONS;
  const tcaMetrics = TCA_METRICS;

  return (
    <div className="space-y-5">
      {/* Header */}
      <PageHeader
        module={{ name: "AEGIS · Risk & Execution", tone: "accent" }}
        title="EMS — Execution Management"
        desc="Algo scheduling, smart order routing, FIX session management and transaction cost analytics. Kill-switch and fat-finger guards enforced at every layer."
        right={
          <div className="flex items-center gap-2">
            <button className="btn flex items-center gap-1.5 border-neg/40 text-neg hover:bg-neg/10">
              <Shield width={14} height={14} />
              Kill Switch
            </button>
            <button className="btn btn-accent flex items-center gap-1.5">
              <Wave width={14} height={14} />
              New Algo
            </button>
          </div>
        }
      />

      {/* KPI deck */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {EMS_KPIS.map((k) => (
          <KpiCard
            key={k.label}
            label={k.label}
            value={k.value}
            sub={k.sub}
            icon={<Icon name={k.icon} width={15} height={15} />}
            tone={k.tone}
          />
        ))}
      </div>

      {/* Execution algos */}
      <Panel>
        <PanelHeader
          title="Execution Algorithm Panel"
          sub="TWAP · VWAP · POV · Implementation Shortfall · Iceberg — live scheduling"
          right={
            <div className="flex items-center gap-2">
              <StatusDot tone="pos" pulse />
              <span className="font-mono text-xs text-pos">ENGINE LIVE</span>
              <Chip tone="accent">SIM mode unless venue connected</Chip>
            </div>
          }
        />
        <div className="divide-y divide-line">
          {algos.map((algo) => (
            <div key={algo.name} className="px-4 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Chip tone={ALGO_STATUS_TONE[algo.status]} className="font-mono text-xs font-semibold">{algo.name}</Chip>
                  <span className="text-xs text-dim">{algo.desc}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Chip tone={ALGO_STATUS_TONE[algo.status]}>{algo.status}</Chip>
                  <span className="font-mono text-xs text-dim">{algo.order}</span>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 md:grid-cols-4 lg:grid-cols-6">
                <Stat label="Symbol" value={<Ticker sym={algo.sym} />} mono={false} />
                <Stat label="Total Qty" value={fmtInt(algo.qty)} />
                <Stat label="Elapsed" value={algo.elapsed} tone="muted" />
                <Stat label="Remaining" value={algo.remaining} tone="muted" />
              </div>

              <div className="mt-3 flex items-center gap-3">
                <ProgressBar
                  value={algo.filledPct}
                  max={100}
                  height={8}
                  showGlow={algo.status === "RUNNING"}
                  color={
                    algo.status === "COMPLETE"
                      ? "var(--pos)"
                      : algo.status === "RUNNING"
                      ? "var(--accent)"
                      : "var(--dim)"
                  }
                  className="flex-1"
                />
                <span className={cn(
                  "w-14 shrink-0 text-right font-mono text-sm font-medium",
                  algo.filledPct === 100 ? "text-pos" : algo.status === "RUNNING" ? "text-accent" : "text-dim",
                )}>
                  {algo.filledPct}%
                </span>
              </div>

              <div className="mt-2 flex items-end gap-2">
                <span className="text-xs text-dim">Participation schedule (12 buckets):</span>
                <DeltaBars
                  data={algo.scheduleVols.map((v, i) => {
                    const threshold = Math.floor(algo.scheduleVols.length * algo.filledPct / 100);
                    return i < threshold ? v : -v * 0.15;
                  })}
                  width={200}
                  height={28}
                />
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* SOR + FIX sessions row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Smart Order Router */}
        <Panel className="lg:col-span-2">
          <PanelHeader
            title="Smart Order Router — Venue Table"
            sub="MSFT 50,000 sh TWAP parent · real-time routing decision (DEMO)"
            right={<Chip tone="accent">SOR ENGINE v3.2</Chip>}
          />
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <Th>Venue</Th>
                  <Th>Type</Th>
                  <Th right>% Routed</Th>
                  <Th right>Top of Book</Th>
                  <Th>Liquidity</Th>
                  <Th right>Est Cost</Th>
                  <Th right>Latency</Th>
                  <Th>Enabled</Th>
                </tr>
              </thead>
              <tbody>
                {venues.map((v) => {
                  const liqTone = v.liquidity === "HI" ? "pos" : v.liquidity === "MED" ? "warn" : v.liquidity === "SIM" ? "accent" : "default";
                  return (
                    <tr key={v.venue} className={cn("hover:bg-elevated/40", !v.enabled && "opacity-40")}>
                      <Td mono={false} className="font-medium text-muted">{v.venue}</Td>
                      <Td mono={false} className="text-dim">{v.type}</Td>
                      <Td right>
                        <div className="flex items-center justify-end gap-2">
                          <ProgressBar
                            value={v.routedPct}
                            max={100}
                            height={4}
                            color="var(--accent)"
                            className="w-14"
                          />
                          <span className="w-8 font-mono text-xs text-muted">{v.routedPct}%</span>
                        </div>
                      </Td>
                      <Td right className="text-muted">
                        {v.topOfBook > 0 ? `$${fmtNum(v.topOfBook)}` : "—"}
                      </Td>
                      <Td mono={false}>
                        {v.liquidity !== "N/A" ? (
                          <Chip tone={liqTone as "pos" | "warn" | "accent" | "default"} className="text-[10px]">
                            {v.liquidity}
                          </Chip>
                        ) : (
                          <span className="text-xs text-faint">—</span>
                        )}
                      </Td>
                      <Td right className={v.estCost === 0 ? "text-pos" : v.estCost > 3 ? "text-warn" : "text-muted"}>
                        {fmtBps(v.estCost)}
                      </Td>
                      <Td right className="text-dim">
                        {v.latencyUs > 0 ? `${v.latencyUs}μs` : "—"}
                      </Td>
                      <Td mono={false}>
                        <StatusDot tone={v.enabled ? "pos" : "neg"} />
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-line px-4 py-2.5 text-xs text-dim">
            Venue adapters: <span className="text-pos">IBKR · Alpaca · IEX · Liquidnet</span>
            {" "}active · <span className="text-warn">CCXT/Binance</span> disabled · connect in{" "}
            <span className="font-mono text-accent">Settings › Adapters</span>
          </div>
        </Panel>

        {/* FIX sessions */}
        <Panel>
          <PanelHeader
            title="FIX Session Status"
            right={
              <div className="flex items-center gap-1.5">
                <StatusDot tone="pos" pulse />
                <span className="font-mono text-xs text-pos">4 / 6</span>
              </div>
            }
          />
          <div className="divide-y divide-line">
            {fixSessions.map((s) => (
              <div key={s.senderCompId + s.targetCompId + s.qualifier} className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <StatusDot tone={FIX_STATUS_TONE[s.status]} pulse={s.status === "ACTIVE"} />
                      <span className="truncate font-mono text-xs font-medium text-muted">{s.qualifier}</span>
                    </div>
                    <div className="mt-0.5 font-mono text-[10px] text-dim">
                      {s.senderCompId} → {s.targetCompId}
                    </div>
                  </div>
                  <Chip tone={FIX_STATUS_TONE[s.status]} className="shrink-0 text-[10px]">{s.status}</Chip>
                </div>
                <div className="mt-1.5 flex gap-4 font-mono text-[10px] text-dim">
                  <span>OUT: {fmtInt(s.seqNum)}</span>
                  <span>IN: {fmtInt(s.inSeq)}</span>
                  {s.rejects > 0 ? (
                    <span className="text-warn">{s.rejects} rejects</span>
                  ) : (
                    <span className="text-pos">clean</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-line px-4 py-2.5 text-xs text-dim">
            FIX 4.2 · heartbeat 30s · seq-reset at midnight UTC
          </div>
        </Panel>
      </div>

      {/* TCA panel */}
      <Panel>
        <PanelHeader
          title="Transaction Cost Analysis — TCA"
          sub="Arrival price · IS · VWAP benchmark · market-impact decomposition · DEMO DATA"
          right={<Chip tone="accent">IS model · intraday VWAP</Chip>}
        />
        <div className="grid gap-0 lg:grid-cols-3">
          {/* Metric table */}
          <div className="border-b border-line lg:border-b-0 lg:border-r">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <Th>Metric</Th>
                  <Th right>Value</Th>
                </tr>
              </thead>
              <tbody>
                {tcaMetrics.map((m) => (
                  <tr key={m.label} className="hover:bg-elevated/40">
                    <Td mono={false} className="text-muted">{m.label}</Td>
                    <Td right className={
                      m.tone === "pos" ? "text-pos" : m.tone === "neg" ? "text-neg" : m.tone === "warn" ? "text-warn" : "text-muted"
                    }>
                      {m.value >= 0 ? "+" : ""}{m.value}{m.unit}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* IS series sparkline */}
          <div className="border-b border-line p-4 lg:border-b-0 lg:border-r">
            <div className="section-label mb-3">Implementation Shortfall — Intraday</div>
            <Sparkline
              data={TCA_SERIES}
              width={240}
              height={90}
              color="var(--neg)"
              area
            />
            <div className="mt-2 text-xs text-dim">
              Cumulative IS (bps) vs. arrival price over session horizon.
              Negative = cost incurred. Market impact dominates early fills.
            </div>
            <div className="mt-3 flex gap-4">
              <Stat label="Total IS" value={fmtBps(-5.7)} tone="neg" />
              <Stat label="vs. prior wk" value="−1.2bps improvement" tone="pos" />
            </div>
          </div>

          {/* Cost decomposition */}
          <div className="p-4">
            <div className="section-label mb-3">Cost Decomposition (bps)</div>
            <div className="space-y-3">
              {[
                { label: "Market Impact", value: TCA_DECOMP.marketImpact, color: "var(--neg)" },
                { label: "Timing Cost", value: TCA_DECOMP.timingCost, color: "var(--warn)" },
                { label: "Spread Cost", value: TCA_DECOMP.spreadCost, color: "var(--warn)" },
                { label: "Opportunity Cost", value: TCA_DECOMP.opportunityCost, color: "var(--dim)" },
              ].map((c) => (
                <div key={c.label} className="flex items-center gap-3">
                  <span className="w-32 shrink-0 text-xs text-muted">{c.label}</span>
                  <ProgressBar
                    value={c.value}
                    max={TCA_DECOMP.total}
                    height={6}
                    color={c.color}
                    className="flex-1"
                  />
                  <span className="w-12 shrink-0 text-right font-mono text-xs text-muted">
                    {c.value.toFixed(1)}bps
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 border-t border-line pt-3 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-dim">Total Cost</span>
                <span className="text-neg font-medium">{TCA_DECOMP.total.toFixed(1)}bps</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-dim">VWAP outperformance</span>
                <span className="text-pos">+1.4bps</span>
              </div>
            </div>
            <div className="mt-3 rounded border border-line/60 bg-elevated/30 px-3 py-2 text-xs text-dim">
              <span className="text-warn font-medium">Guard:</span> If IS exceeds −15bps threshold,
              algo auto-pauses and flags for human review. Configurable per strategy.
            </div>
          </div>
        </div>
      </Panel>

      {/* Guards summary */}
      <Panel>
        <PanelHeader
          title="EMS Guards & Controls"
          right={
            <div className="flex items-center gap-2">
              <StatusDot tone="pos" />
              <span className="font-mono text-xs text-pos">ALL ACTIVE</span>
            </div>
          }
        />
        <div className="grid gap-3 px-4 py-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: "shield",
              label: "Kill Switch",
              desc: "Hard-stops all algos + open orders, FIX session logout. Single click. Logged with user + timestamp.",
              tone: "neg" as const,
            },
            {
              icon: "shield",
              label: "Fat-Finger Limit",
              desc: "Max order qty = 3× 5-day ADV. Max notional = $5M. Override requires supervisor auth.",
              tone: "warn" as const,
            },
            {
              icon: "gauge",
              label: "IS Threshold",
              desc: "Auto-pause algo if intraday IS exceeds −15bps. Alert dispatched to OMS & email.",
              tone: "warn" as const,
            },
            {
              icon: "shield",
              label: "Venue Circuit Breaker",
              desc: "If venue error rate > 0.5%, SOR stops routing to that venue and re-allocates to remaining.",
              tone: "warn" as const,
            },
          ].map((g) => (
            <div key={g.label} className="rounded border border-line bg-elevated/20 p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <Icon name={g.icon} width={14} height={14} className={g.tone === "neg" ? "text-neg" : "text-warn"} />
                <span className="text-xs font-medium text-muted">{g.label}</span>
              </div>
              <p className="text-xs text-dim leading-relaxed">{g.desc}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
