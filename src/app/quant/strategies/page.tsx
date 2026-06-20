import { PageHeader, Panel, PanelHeader, Chip, Th, Td, KpiCard, StatusDot } from "@/components/ui/kit";
import { Sparkline, ProgressBar } from "@/components/ui/viz";
import { Icon } from "@/components/icon-map";
import { Bolt, Shield, Warn, ChevronRight, Play } from "@/components/icons";
import {
  STRATEGIES,
  liveEquitySeries,
  btEquitySeries,
} from "@/lib/data/kepler";
import { fmtNum, fmtPct, fmtSignedPct, fmtUsdCompact, signClass } from "@/lib/format";
import { cn } from "@/lib/cn";
import { OptionsPricer } from "@/components/engine/options-pricer";
import { PairsTrade } from "@/components/engine/pairs-trade";
import { OptionsStrategy } from "@/components/engine/options-strategy";
import type { StrategyStatus } from "@/lib/data/kepler";

export const metadata = { title: "KEPLER — Strategies" };

const statusTone: Record<StrategyStatus, "pos" | "accent" | "warn" | "info" | "neg" | "default"> = {
  live: "pos",
  paper: "accent",
  backtest: "warn",
  research: "info",
  paused: "neg",
};

const statusOrder: StrategyStatus[] = ["research", "backtest", "paper", "live"];

const typeIcons: Record<string, string> = {
  "Equity CS Factor": "bars",
  "Time-Series Momentum": "wave",
  "Statistical Arbitrage": "scale",
  "Event / Catalyst": "radio",
  "Options / Volatility": "candle",
  "Risk Parity / Allocation": "layers",
};

function PromotionPipeline({ gates }: { gates: { research: boolean; backtest: boolean; paper: boolean; live: boolean } }) {
  const steps: { key: keyof typeof gates; label: string }[] = [
    { key: "research", label: "Research" },
    { key: "backtest", label: "Backtest" },
    { key: "paper", label: "Paper" },
    { key: "live", label: "Live" },
  ];
  return (
    <div className="flex items-center gap-0">
      {steps.map((step, i) => (
        <div key={step.key} className="flex items-center">
          <div className={cn(
            "flex h-5 items-center gap-1 px-2 text-2xs font-mono font-medium",
            "rounded border transition-colors",
            gates[step.key]
              ? "border-pos/40 bg-pos/10 text-pos"
              : "border-line bg-elevated/20 text-dim",
          )}>
            {gates[step.key] && <span className="h-1.5 w-1.5 rounded-full bg-pos" />}
            {step.label}
          </div>
          {i < steps.length - 1 && (
            <ChevronRight width={10} height={10} className={cn("mx-0.5", gates[steps[i + 1].key] ? "text-pos" : "text-dim")} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function StrategiesPage() {
  // Pre-compute sparklines for all strategies
  const stratData = STRATEGIES.map((s) => ({
    ...s,
    liveSeries: liveEquitySeries(s.id),
    btSeries: btEquitySeries(s.id),
  }));

  const liveCount = STRATEGIES.filter((s) => s.status === "live").length;
  const paperCount = STRATEGIES.filter((s) => s.status === "paper").length;
  const maxDivergence = Math.min(...STRATEGIES.filter((s) => s.status === "live" || s.status === "paper").map((s) => s.liveVsBt));

  return (
    <div className="space-y-5">
      <PageHeader
        module={{ name: "KEPLER · Quant Lab", tone: "ai" }}
        title="Strategy Library"
        desc="Six institutional-class strategies across factor, momentum, arbitrage, event-driven, volatility, and risk-parity approaches. Promotion pipeline: research → backtest → paper → live."
        right={
          <div className="flex items-center gap-2">
            <button className="btn">
              <Icon name="filter" width={14} height={14} />
              Filter
            </button>
            <button className="btn btn-accent">
              <Bolt width={14} height={14} />
              New Strategy
            </button>
          </div>
        }
      />

      <OptionsPricer />

      <PairsTrade />

      <OptionsStrategy />

      {/* KPI Deck */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          label="LIVE STRATEGIES"
          value={String(liveCount)}
          sub="paper-trading gate passed"
          tone="pos"
          icon={<StatusDot tone="pos" pulse />}
        />
        <KpiCard
          label="PAPER TRADING"
          value={String(paperCount)}
          sub="backtest gate passed"
          tone="accent"
          icon={<Icon name="play" width={14} height={14} />}
        />
        <KpiCard
          label="MAX LIVE DIVERGENCE"
          value={fmtSignedPct(maxDivergence, 1)}
          sub="worst live vs. backtest"
          tone="warn"
          icon={<Icon name="activity" width={14} height={14} />}
        />
        <KpiCard
          label="KILL-SWITCHES ARMED"
          value="0 / 6"
          sub="all within DD thresholds"
          tone="pos"
          icon={<Shield width={14} height={14} />}
        />
      </div>

      {/* Strategy Cards */}
      <div className="space-y-3">
        {stratData.map((s) => (
          <Panel key={s.id} hover className={cn(s.killSwitch ? "border-neg/60" : undefined)}>
            <div className="flex flex-col gap-0 lg:flex-row">
              {/* Left: identity */}
              <div className="flex flex-col gap-2 border-b border-line p-4 lg:w-[260px] lg:shrink-0 lg:border-b-0 lg:border-r">
                <div className="flex items-center gap-2">
                  <Icon name={typeIcons[s.type] ?? "flask"} width={15} height={15} className="text-accent shrink-0" />
                  <span className="font-medium text-ink text-sm">{s.name}</span>
                </div>
                <div className="text-xs text-dim">{s.type}</div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Chip tone={statusTone[s.status]} dot>{s.status.toUpperCase()}</Chip>
                  {s.killSwitch && <Chip tone="neg">KILL ARMED</Chip>}
                </div>
                <div className="text-xs text-dim">{s.universe}</div>
                <div className="flex items-center gap-1.5 text-xs text-dim">
                  <Icon name="database" width={11} height={11} className="text-faint" />
                  Capacity: <span className="font-mono text-muted">{fmtUsdCompact(s.capacityM * 1e6)}</span>
                </div>
                <div className="font-mono text-2xs text-dim">Last run: {s.lastRun}</div>
                <div className="mt-1 text-xs text-dim">ID: <span className="font-mono">{s.id}</span></div>
              </div>

              {/* Center: metrics */}
              <div className="grid flex-1 grid-cols-2 gap-px bg-line sm:grid-cols-4 lg:grid-cols-5">
                <div className="flex flex-col justify-center gap-0.5 bg-base px-4 py-3">
                  <span className="kpi-label">CAGR</span>
                  <span className="font-mono text-xl text-pos tabular-nums">{fmtPct(s.cagr, 1)}</span>
                </div>
                <div className="flex flex-col justify-center gap-0.5 bg-base px-4 py-3">
                  <span className="kpi-label">SHARPE</span>
                  <span className={cn("font-mono text-xl tabular-nums", s.sharpe >= 1.5 ? "text-pos" : s.sharpe >= 1.0 ? "text-warn" : "text-neg")}>
                    {fmtNum(s.sharpe)}
                  </span>
                </div>
                <div className="flex flex-col justify-center gap-0.5 bg-base px-4 py-3">
                  <span className="kpi-label">MAX DD</span>
                  <span className="font-mono text-xl text-neg tabular-nums">{fmtSignedPct(s.maxDD, 1)}</span>
                </div>
                <div className="flex flex-col justify-center gap-0.5 bg-base px-4 py-3">
                  <span className="kpi-label">PBO</span>
                  <span className={cn("font-mono text-xl tabular-nums", s.pbo > 0.4 ? "text-neg" : s.pbo > 0.25 ? "text-warn" : "text-pos")}>
                    {fmtPct(s.pbo * 100, 0)}
                  </span>
                </div>
                <div className="flex flex-col justify-center gap-0.5 bg-base px-4 py-3 col-span-2 sm:col-span-4 lg:col-span-1">
                  <span className="kpi-label">LIVE vs BT</span>
                  <span className={cn("font-mono text-xl tabular-nums", s.liveVsBt < -5 ? "text-neg" : s.liveVsBt < -2 ? "text-warn" : s.liveVsBt === 0 ? "text-muted" : "text-pos")}>
                    {s.liveVsBt === 0 ? "—" : fmtSignedPct(s.liveVsBt, 1)}
                  </span>
                </div>
              </div>

              {/* Right: sparkline + pipeline */}
              <div className="flex flex-col gap-3 border-t border-line p-4 lg:w-[260px] lg:shrink-0 lg:border-l lg:border-t-0">
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-dim">63-day equity (live vs backtest)</span>
                  </div>
                  <div className="relative">
                    <Sparkline data={s.btSeries} width={220} height={40} color="var(--dim)" strokeWidth={1} area={false} className="w-full" />
                    <div className="absolute inset-0 pointer-events-none">
                      <Sparkline data={s.liveSeries} width={220} height={40} color={s.liveVsBt < -5 ? "var(--neg)" : s.liveVsBt < -2 ? "var(--warn)" : "var(--pos)"} strokeWidth={1.6} area={false} className="w-full" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1 text-2xs text-dim">
                      <span className="inline-block h-px w-5 bg-dim/50" /> Backtest
                    </span>
                    <span className="flex items-center gap-1 text-2xs text-dim">
                      <span className="inline-block h-0.5 w-5 rounded" style={{ background: s.liveVsBt < -5 ? "var(--neg)" : s.liveVsBt < -2 ? "var(--warn)" : "var(--pos)" }} /> Live
                    </span>
                  </div>
                </div>
                <div>
                  <div className="mb-1.5 text-2xs text-dim">Promotion pipeline</div>
                  <PromotionPipeline gates={s.gateStatus} />
                </div>
                {s.killSwitch && (
                  <div className="flex items-center gap-1.5 rounded border border-neg/40 bg-neg/10 px-2 py-1.5 text-xs text-neg">
                    <Warn width={12} height={12} />
                    Kill-switch armed
                  </div>
                )}
              </div>
            </div>
          </Panel>
        ))}
      </div>

      {/* Live vs Backtest Divergence Monitor */}
      <Panel>
        <PanelHeader
          title="Live vs Backtest Divergence Monitor"
          sub="Ongoing monitoring of live strategy performance versus simulated backtest trajectory"
          right={
            <div className="flex items-center gap-2">
              <StatusDot tone="pos" pulse />
              <span className="text-xs text-muted font-mono">Updated 09:30 UTC</span>
              <Chip tone="warn">2 strategies diverging</Chip>
            </div>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] border-collapse">
            <thead>
              <tr>
                <Th>Strategy</Th>
                <Th>Status</Th>
                <Th right>BT Sharpe</Th>
                <Th right>Live Sharpe (63d)</Th>
                <Th right>Divergence</Th>
                <Th>Divergence bar</Th>
                <Th right>PBO</Th>
                <Th>Kill-switch</Th>
              </tr>
            </thead>
            <tbody>
              {STRATEGIES.filter((s) => s.status === "live" || s.status === "paper").map((s) => {
                const absDiv = Math.abs(s.liveVsBt);
                const isAlert = s.liveVsBt < -5;
                const isWarn = s.liveVsBt < -2 && !isAlert;
                return (
                  <tr key={s.id} className={cn("group transition-colors hover:bg-elevated/40", isAlert ? "bg-neg/5" : "")}>
                    <Td mono={false} className="font-medium text-sm text-ink">{s.name}</Td>
                    <Td>
                      <Chip tone={statusTone[s.status]} dot>{s.status.toUpperCase()}</Chip>
                    </Td>
                    <Td right className="text-muted">{fmtNum(s.sharpe)}</Td>
                    <Td right className={isAlert ? "text-neg font-semibold" : isWarn ? "text-warn" : "text-pos"}>
                      {fmtNum(s.sharpe + s.liveVsBt / 100 * s.sharpe)}
                    </Td>
                    <Td right className={cn("font-semibold", isAlert ? "text-neg" : isWarn ? "text-warn" : "text-pos")}>
                      {s.liveVsBt === 0 ? "—" : fmtSignedPct(s.liveVsBt, 1)}
                    </Td>
                    <Td>
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <ProgressBar
                          value={absDiv}
                          max={15}
                          color={isAlert ? "var(--neg)" : isWarn ? "var(--warn)" : "var(--pos)"}
                          height={6}
                          className="flex-1"
                        />
                        {isAlert && <Warn width={12} height={12} className="text-neg shrink-0" />}
                      </div>
                    </Td>
                    <Td right className={s.pbo > 0.4 ? "text-neg" : s.pbo > 0.25 ? "text-warn" : "text-pos"}>
                      {fmtPct(s.pbo * 100, 0)}
                    </Td>
                    <Td>
                      <div className={cn(
                        "inline-flex items-center gap-1.5 rounded border px-2 py-1 text-xs font-mono cursor-pointer transition-colors",
                        s.killSwitch
                          ? "border-neg/60 bg-neg/20 text-neg"
                          : "border-line bg-elevated/30 text-dim hover:border-neg/40 hover:text-neg/70",
                      )}>
                        <span className={cn("h-2 w-2 rounded-full", s.killSwitch ? "bg-neg animate-pulse" : "bg-dim")} />
                        {s.killSwitch ? "ARMED" : "SAFE"}
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="border-t border-line px-4 py-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 text-xs text-dim">
            <div className="flex items-start gap-1.5">
              <Icon name="shield" width={12} height={12} className="mt-0.5 text-neg shrink-0" />
              <span><span className="text-neg font-medium">Divergence &gt; 5%</span> triggers automatic review and optional kill-switch arm. Alert sent to risk desk.</span>
            </div>
            <div className="flex items-start gap-1.5">
              <Icon name="activity" width={12} height={12} className="mt-0.5 text-warn shrink-0" />
              <span>Divergence causes: regime change, execution shortfall, live data feed differences, structural overfitting materialising OOS.</span>
            </div>
            <div className="flex items-start gap-1.5">
              <Warn width={12} height={12} className="mt-0.5 text-warn shrink-0" />
              <span>Kill-switch halts all new order generation for the strategy. Open positions continue to risk-managed close.</span>
            </div>
          </div>
        </div>
      </Panel>

      {/* Strategy Detail — Promotion Gates Expanded */}
      <Panel>
        <PanelHeader
          title="Promotion Pipeline — Gate Requirements"
          sub="Each gate is a hard requirement; no exceptions. Overfitting controls gate backtest → paper."
          right={<Chip tone="ai">4 gates · 3 strategies blocked</Chip>}
        />
        <div className="grid grid-cols-1 gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              stage: "Research",
              icon: "flask",
              color: "text-info",
              borderColor: "border-info/30",
              bgColor: "bg-info/5",
              requirements: [
                "PIT data semantics validated",
                "Alpha expression compiles",
                "IC > 0.02 over 60d rolling",
                "Universe > 100 names",
                "Experiment logged with seed",
              ],
            },
            {
              stage: "Backtest",
              icon: "candle",
              color: "text-accent",
              borderColor: "border-accent/30",
              bgColor: "bg-accent/5",
              requirements: [
                "DSR ≥ 1.0 (Deflated Sharpe)",
                "PBO (CSCV) ≤ 25%",
                "OOS Sharpe decay ≤ 30%",
                "Realistic fills (slip+impact+comm)",
                "Walk-forward OOS: 6 windows",
                "Multiple-testing correction applied",
              ],
            },
            {
              stage: "Paper",
              icon: "play",
              color: "text-warn",
              borderColor: "border-warn/30",
              bgColor: "bg-warn/5",
              requirements: [
                "Min 60d paper trading",
                "Live vs BT divergence ≤ 5%",
                "Execution quality review",
                "Risk limit compliance check",
                "Max DD within tolerance",
              ],
            },
            {
              stage: "Live",
              icon: "bolt",
              color: "text-pos",
              borderColor: "border-pos/30",
              bgColor: "bg-pos/5",
              requirements: [
                "Paper period ≥ 90d",
                "Sharpe live ≥ 0.8 × BT Sharpe",
                "Risk committee sign-off",
                "Capacity stress test passed",
                "Kill-switch configured",
                "Daily PnL attribution active",
              ],
            },
          ].map((gate) => (
            <div key={gate.stage} className={cn("bg-base p-4 border-t-2", gate.borderColor)}>
              <div className="flex items-center gap-2 mb-3">
                <Icon name={gate.icon} width={14} height={14} className={gate.color} />
                <span className={cn("text-sm font-semibold uppercase tracking-wide", gate.color)}>{gate.stage}</span>
              </div>
              <ul className="space-y-1.5">
                {gate.requirements.map((req, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-dim">
                    <span className={cn("mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full", gate.color.replace("text-", "bg-"), "opacity-70")} />
                    {req}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-line px-4 py-3 text-xs text-dim">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-1.5">
              <Icon name="shield" width={12} height={12} className="text-accent" />
              <span>Gates are enforced programmatically — no manual override without risk committee approval.</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Warn width={12} height={12} className="text-warn" />
              <span>Overfitting gate (DSR + PBO + OOS decay) blocks 3 of 6 strategies from live promotion.</span>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}
