import {
  PageHeader, Panel, PanelHeader, Chip, KpiCard, Stat,
  Th, Td, Ticker,
} from "@/components/ui/kit";
import { LiveDot } from "@/components/live/live-stat";
import { ProgressBar } from "@/components/ui/viz";
import { Icon } from "@/components/icon-map";
import { Bolt, Scale } from "@/components/icons";
import {
  efficientFrontier, PROPOSED_TRADES, CONSTRAINTS, WHATIF_IMPACTS, OPT_KPIS,
  type OptObjective,
} from "@/lib/data/aegis-exec";
import { fmtNum, fmtUsdCompact, signClass } from "@/lib/format";
import { OptimizerLab } from "@/components/quant/optimizer-lab";
import { OptimizerEngine } from "@/components/engine/optimizer-engine";
import { TangencyFrontier } from "@/components/engine/tangency-frontier";
import { cn } from "@/lib/cn";

export const metadata = { title: "Optimizer & Construction — AEGIS" };

/* ── Efficient Frontier SVG ───────────────────────────────────────────────── */

function EfficientFrontierViz() {
  const pts = efficientFrontier();
  const W = 480;
  const H = 260;
  const PAD = { l: 44, r: 20, t: 16, b: 32 };

  const riskMin = 3;
  const riskMax = 28;
  const retMin = 0;
  const retMax = 40;

  const toX = (r: number) => PAD.l + ((r - riskMin) / (riskMax - riskMin)) * (W - PAD.l - PAD.r);
  const toY = (r: number) => H - PAD.b - ((r - retMin) / (retMax - retMin)) * (H - PAD.t - PAD.b);

  // Build frontier curve: sort by risk, filter to upper frontier
  const sortedByRisk = [...pts]
    .filter((p) => !p.isOptimal && !p.isCurrent)
    .sort((a, b) => a.risk - b.risk);

  // Frontier envelope — max return at each risk level
  const frontierPts: { risk: number; ret: number }[] = [];
  const riskBuckets = 24;
  for (let i = 0; i <= riskBuckets; i++) {
    const riskBand = riskMin + (i / riskBuckets) * (riskMax - riskMin);
    const bandwidth = (riskMax - riskMin) / riskBuckets;
    const inBand = sortedByRisk.filter(
      (p) => Math.abs(p.risk - riskBand) < bandwidth,
    );
    if (inBand.length > 0) {
      const maxRet = Math.max(...inBand.map((p) => p.ret));
      frontierPts.push({ risk: riskBand, ret: maxRet });
    }
  }

  const frontierPath = frontierPts
    .map((p, i) => `${i === 0 ? "M" : "L"}${toX(p.risk).toFixed(1)},${toY(p.ret).toFixed(1)}`)
    .join(" ");

  const optimal = pts.find((p) => p.isOptimal)!;
  const current = pts.find((p) => p.isCurrent)!;

  // Axis ticks
  const riskTicks = [5, 10, 15, 20, 25];
  const retTicks = [5, 10, 15, 20, 25, 30, 35];

  return (
    <div className="overflow-x-auto px-4 py-3">
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full max-w-[480px] overflow-visible"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Grid */}
        {riskTicks.map((t) => (
          <line
            key={`rx${t}`}
            x1={toX(t)}
            y1={PAD.t}
            x2={toX(t)}
            y2={H - PAD.b}
            stroke="var(--line)"
            strokeWidth={0.5}
            strokeDasharray="3,3"
          />
        ))}
        {retTicks.map((t) => (
          <line
            key={`ry${t}`}
            x1={PAD.l}
            y1={toY(t)}
            x2={W - PAD.r}
            y2={toY(t)}
            stroke="var(--line)"
            strokeWidth={0.5}
            strokeDasharray="3,3"
          />
        ))}

        {/* Axis labels */}
        {riskTicks.map((t) => (
          <text
            key={`xt${t}`}
            x={toX(t)}
            y={H - PAD.b + 14}
            textAnchor="middle"
            fontSize={9}
            fill="var(--dim)"
            fontFamily="monospace"
          >
            {t}%
          </text>
        ))}
        {retTicks.map((t) => (
          <text
            key={`yt${t}`}
            x={PAD.l - 6}
            y={toY(t) + 3}
            textAnchor="end"
            fontSize={9}
            fill="var(--dim)"
            fontFamily="monospace"
          >
            {t}%
          </text>
        ))}

        {/* X/Y axis labels */}
        <text
          x={(PAD.l + W - PAD.r) / 2}
          y={H}
          textAnchor="middle"
          fontSize={9}
          fill="var(--muted)"
          fontFamily="monospace"
        >
          Annualised Vol (Risk)
        </text>
        <text
          x={10}
          y={(PAD.t + H - PAD.b) / 2}
          textAnchor="middle"
          fontSize={9}
          fill="var(--muted)"
          fontFamily="monospace"
          transform={`rotate(-90, 10, ${(PAD.t + H - PAD.b) / 2})`}
        >
          Return
        </text>

        {/* Scatter cloud */}
        {pts
          .filter((p) => !p.isOptimal && !p.isCurrent)
          .map((p, i) => (
            <circle
              key={i}
              cx={toX(p.risk)}
              cy={toY(p.ret)}
              r={2}
              fill="var(--accent)"
              opacity={0.18 + 0.15 * Math.min(1, p.sharpe / 1.5)}
            />
          ))}

        {/* Frontier curve */}
        <path
          d={frontierPath}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.8}
        />

        {/* Capital Market Line hint */}
        <line
          x1={PAD.l}
          y1={toY(4.5)}
          x2={toX(optimal.risk + 6)}
          y2={toY(optimal.ret + 6 * optimal.sharpe)}
          stroke="var(--accent)"
          strokeWidth={0.8}
          strokeDasharray="4,3"
          opacity={0.35}
        />

        {/* Optimal portfolio */}
        <circle
          cx={toX(optimal.risk)}
          cy={toY(optimal.ret)}
          r={7}
          fill="var(--accent)"
          opacity={0.2}
        />
        <circle
          cx={toX(optimal.risk)}
          cy={toY(optimal.ret)}
          r={4}
          fill="var(--accent)"
        />
        <text
          x={toX(optimal.risk) + 8}
          y={toY(optimal.ret) - 4}
          fontSize={8.5}
          fill="var(--accent)"
          fontFamily="monospace"
          fontWeight="bold"
        >
          OPTIMAL
        </text>
        <text
          x={toX(optimal.risk) + 8}
          y={toY(optimal.ret) + 6}
          fontSize={8}
          fill="var(--dim)"
          fontFamily="monospace"
        >
          SR {optimal.sharpe.toFixed(2)} · vol {optimal.risk}% · ret {optimal.ret}%
        </text>

        {/* Current portfolio */}
        <circle
          cx={toX(current.risk)}
          cy={toY(current.ret)}
          r={7}
          fill="var(--warn)"
          opacity={0.2}
        />
        <circle
          cx={toX(current.risk)}
          cy={toY(current.ret)}
          r={4}
          fill="var(--warn)"
        />
        <text
          x={toX(current.risk) + 8}
          y={toY(current.ret) - 4}
          fontSize={8.5}
          fill="var(--warn)"
          fontFamily="monospace"
          fontWeight="bold"
        >
          CURRENT
        </text>
        <text
          x={toX(current.risk) + 8}
          y={toY(current.ret) + 6}
          fontSize={8}
          fill="var(--dim)"
          fontFamily="monospace"
        >
          SR {current.sharpe.toFixed(2)} · vol {current.risk}% · ret {current.ret}%
        </text>
      </svg>

      <div className="mt-2 flex flex-wrap gap-4 text-xs text-dim">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-accent" /> Optimal (max Sharpe)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-warn" /> Current portfolio
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-4 border-t border-dashed border-accent opacity-60" /> Capital market line
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-accent opacity-30" /> Monte Carlo sample (320 portfolios)
        </span>
      </div>
    </div>
  );
}

/* ── page ─────────────────────────────────────────────────────────────────── */

export default function OptimizerPage() {
  const OBJECTIVES: OptObjective[] = [
    "Mean-Variance",
    "Risk-Parity",
    "Max-Diversification",
    "Black-Litterman",
    "CVaR",
  ];
  const activeObj: OptObjective = "Mean-Variance";

  return (
    <div className="space-y-5">
      {/* Header */}
      <PageHeader
        module={{ name: "AEGIS · Risk & Execution", tone: "accent" }}
        title="Portfolio Optimizer & Construction"
        desc="Efficient frontier, objective selection, constraint enforcement, proposed-trade generation and pre-trade what-if analysis."
        right={
          <div className="flex items-center gap-2">
            <LiveDot />
            <button className="btn flex items-center gap-1.5">
              <Scale width={14} height={14} />
              Run Optimizer
            </button>
            <button className="btn btn-accent flex items-center gap-1.5">
              <Bolt width={14} height={14} />
              Emit to OMS
            </button>
          </div>
        }
      />

      <OptimizerEngine />

      <TangencyFrontier />

      <div className="panel p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="chip chip-accent">Interactive · solves live</span>
          <span className="section-label">Efficient frontier — drag risk aversion to re-solve the optimal long-only portfolio</span>
        </div>
        <OptimizerLab />
      </div>

      {/* KPI deck */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {OPT_KPIS.map((k) => (
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

      {/* Objective selector + frontier */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <PanelHeader
            title="Efficient Frontier"
            sub="300+ Monte Carlo portfolios · frontier curve · current vs. optimal"
            right={<Chip tone="accent">Mean-Variance · DEMO</Chip>}
          />
          <EfficientFrontierViz />
        </Panel>

        <Panel>
          <PanelHeader title="Objective Function" />
          <div className="space-y-2 px-4 py-4">
            {OBJECTIVES.map((obj) => (
              <div
                key={obj}
                className={cn(
                  "flex cursor-default items-center justify-between rounded border px-3 py-2.5 transition-colors",
                  obj === activeObj
                    ? "border-accent/50 bg-accent/10"
                    : "border-line bg-elevated/20 hover:bg-elevated/40",
                )}
              >
                <span className={cn(
                  "text-sm",
                  obj === activeObj ? "font-medium text-accent" : "text-muted",
                )}>
                  {obj}
                </span>
                {obj === activeObj && (
                  <Chip tone="accent" className="text-[10px]">ACTIVE</Chip>
                )}
              </div>
            ))}
          </div>
          <div className="border-t border-line px-4 py-3 space-y-2">
            <div className="section-label">Active Config</div>
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Risk Horizon" value="1 Year" />
              <Stat label="Cov Estimator" value="Ledoit-Wolf" />
              <Stat label="Views Loaded" value="4 BL views" tone="accent" />
              <Stat label="Universe" value="248 assets" />
            </div>
          </div>
        </Panel>
      </div>

      {/* Constraints + Proposed Trades */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Constraints */}
        <Panel>
          <PanelHeader
            title="Constraint Panel"
            right={
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-pos" />
                <span className="font-mono text-xs text-pos">7 / 8 within bounds</span>
              </div>
            }
          />
          <div className="divide-y divide-line">
            {CONSTRAINTS.map((c) => {
              const pct = Math.min(100, (c.current / c.limit) * 100);
              const barColor = c.tone === "pos" ? "var(--pos)" : c.tone === "warn" ? "var(--warn)" : "var(--neg)";
              return (
                <div key={c.label} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="w-44 shrink-0 text-xs text-muted">{c.label}</span>
                  <div className="flex flex-1 items-center gap-2">
                    <ProgressBar
                      value={pct}
                      max={100}
                      height={5}
                      color={barColor}
                      className="flex-1"
                    />
                    <span className={cn(
                      "w-24 shrink-0 text-right font-mono text-xs",
                      c.tone === "pos" ? "text-pos" : c.tone === "warn" ? "text-warn" : "text-neg",
                    )}>
                      {c.current}{c.unit} / {c.limit}{c.unit}
                    </span>
                  </div>
                  <Chip tone={c.tone} className="w-12 justify-center text-[10px]">
                    {c.tone === "pos" ? "OK" : c.tone === "warn" ? "NEAR" : "BREACH"}
                  </Chip>
                </div>
              );
            })}
          </div>
          <div className="border-t border-line px-4 py-2.5 text-xs text-dim">
            Constraints enforced at solve time via quadratic programming (CVXPY). Breaches block emit-to-OMS.
          </div>
        </Panel>

        {/* What-if pre-trade panel */}
        <Panel>
          <PanelHeader
            title="What-If Pre-Trade Impact"
            sub="Effect of proposed rebalance on risk / exposure / compliance"
            right={<Chip tone="accent">6 trades staged</Chip>}
          />
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <Th>Metric</Th>
                  <Th right>Before</Th>
                  <Th right>After</Th>
                  <Th right>Δ</Th>
                </tr>
              </thead>
              <tbody>
                {WHATIF_IMPACTS.map((w) => (
                  <tr key={w.metric} className="hover:bg-elevated/40">
                    <Td mono={false} className="text-muted">{w.metric}</Td>
                    <Td right className="text-dim">{fmtNum(w.before)}{w.unit}</Td>
                    <Td right className="text-ink">{fmtNum(w.after)}{w.unit}</Td>
                    <Td right className={w.delta > 0 ? "text-pos" : w.delta < 0 ? "text-neg" : "text-dim"}>
                      {w.delta > 0 ? "+" : ""}{fmtNum(w.delta)}{w.unit}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-start gap-2 border-t border-line px-4 py-3 text-xs text-dim">
            <Icon name="shield" width={13} height={13} className="mt-0.5 shrink-0 text-pos" />
            <span>Compliance pre-check: all proposed trades within constraint bounds. Emit-to-OMS available.</span>
          </div>
        </Panel>
      </div>

      {/* Proposed trades table */}
      <Panel>
        <PanelHeader
          title="Proposed Trades — Rebalance to Optimal"
          sub="Emit to OMS generates individual TWAP/IS orders per account sleeve"
          right={
            <div className="flex items-center gap-2">
              <Chip tone="accent">$3.1M notional</Chip>
              <button className="btn btn-accent flex items-center gap-1.5 text-xs">
                <Bolt width={12} height={12} />
                Emit to OMS
              </button>
            </div>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr>
                <Th>Symbol</Th>
                <Th right>Current Wt</Th>
                <Th right>Target Wt</Th>
                <Th right>Δ Weight</Th>
                <Th right>Qty</Th>
                <Th right>Notional</Th>
                <Th>Rationale</Th>
              </tr>
            </thead>
            <tbody>
              {PROPOSED_TRADES.map((t) => (
                <tr key={t.sym} className="hover:bg-elevated/40">
                  <Td mono={false}>
                    <Ticker sym={t.sym} />
                  </Td>
                  <Td right className="text-dim">{fmtNum(t.currentWt)}%</Td>
                  <Td right className="text-muted">{fmtNum(t.targetWt)}%</Td>
                  <Td right className={signClass(t.delta)}>
                    {t.delta > 0 ? "+" : ""}{fmtNum(t.delta)}%
                  </Td>
                  <Td right className={signClass(t.qty)}>
                    {t.qty > 0 ? "+" : ""}{t.qty.toLocaleString()}
                  </Td>
                  <Td right className={signClass(t.notional)}>
                    {fmtUsdCompact(t.notional)}
                  </Td>
                  <Td mono={false} className="max-w-[260px] text-xs text-dim">
                    {t.reason}
                  </Td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-line">
                <Td mono={false} className="font-medium text-ink" colSpan={4}>
                  TOTAL REBALANCE COST (one-way)
                </Td>
                <Td right className="font-medium text-ink">
                  {PROPOSED_TRADES.reduce((s, t) => s + Math.abs(t.qty), 0).toLocaleString()} sh
                </Td>
                <Td right className="font-medium text-accent">
                  {fmtUsdCompact(PROPOSED_TRADES.reduce((s, t) => s + Math.abs(t.notional), 0))}
                </Td>
                <Td mono={false} className="text-xs text-dim">
                  Est. TC: 0.12% AUM · turnover 4.2% (limit 8%)
                </Td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Panel>
    </div>
  );
}
