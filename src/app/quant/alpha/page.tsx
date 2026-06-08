import { PageHeader, Panel, PanelHeader, Chip, Th, Td, KpiCard } from "@/components/ui/kit";
import { LiveStat, LiveDot } from "@/components/live/live-stat";
import { Sparkline, HeatRow, ProgressBar } from "@/components/ui/viz";
import { AlphaLab } from "@/components/quant/alpha-lab";
import { Icon } from "@/components/icon-map";
import { Sparkle, Bolt, Flask } from "@/components/icons";
import {
  ALPHA_POOL,
  ROBUSTNESS_GRID,
  DSL_OPERATORS,
} from "@/lib/data/kepler";
import { fmtNum, fmtPct, fmtSignedPct } from "@/lib/format";
import { priceWalk, Rng } from "@/lib/rng";
import { cn } from "@/lib/cn";

export const metadata = { title: "KEPLER — Alpha Factory" };

const statusTone = {
  active: "pos",
  shadow: "warn",
  retired: "neg",
} as const;

const categoryColors: Record<string, string> = {
  "cross-section": "text-accent",
  "time-series": "text-info",
};

// Generate per-alpha OOS sparklines deterministically
function alphaSparkline(id: string): number[] {
  return priceWalk(id + "-oos", 32, 1.0, 0.04, 0.003);
}

// Composite portfolio equity
const compositeEquity = priceWalk("kepler-alpha-composite-001", 126, 100, 0.008, 0.0011);
// Correlation matrix (lower-triangle values for pool)
const r = new Rng("kepler-alpha-corr");
const corrMatrix = Array.from({ length: 7 }, (_, i) =>
  Array.from({ length: 7 }, (_, j) => {
    if (i === j) return 1.0;
    if (j > i) return 0;
    return Math.round(r.float(0.05, 0.62) * 100) / 100;
  }),
);

export default function AlphaFactoryPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        module={{ name: "KEPLER · Quant Lab", tone: "ai" }}
        title="Alpha Factory"
        desc="Expression-based alpha library with IC analytics, decorrelation, and sub-universe robustness grids. Inspired by WorldQuant BRAIN / Quantopian architecture."
        right={
          <div className="flex items-center gap-2">
            <LiveDot />
            <button className="btn">
              <Flask width={14} height={14} />
              New Alpha
            </button>
            <button className="btn btn-accent">
              <Bolt width={14} height={14} />
              Compose Pool
            </button>
          </div>
        }
      />

      <div className="panel p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="chip chip-ai">Interactive · evaluates live, point-in-time</span>
          <span className="section-label">Alpha factory — write an expression, see its IC, decile spread &amp; turnover</span>
        </div>
        <AlphaLab />
      </div>

      {/* KPI Deck */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          label="ACTIVE ALPHAS"
          value={<LiveStat value={4} decimals={0} vol={0.01} />}
          sub="3 shadow, 1 retired"
          tone="pos"
          icon={<Icon name="flask" width={14} height={14} />}
        />
        <KpiCard
          label="POOL SHARPE"
          value={<LiveStat value={1.81} decimals={2} vol={0.004} />}
          sub="decorrelated composite"
          tone="accent"
          icon={<Icon name="gauge" width={14} height={14} />}
        />
        <KpiCard
          label="MAX POOL CORR"
          value={<LiveStat value={0.59} decimals={2} vol={0.02} />}
          sub="A-031 to pool (retired)"
          tone="warn"
          icon={<Icon name="wave" width={14} height={14} />}
        />
        <KpiCard
          label="MEAN OOS DECAY"
          value="−31%"
          sub="IS → OOS Sharpe, active set"
          tone="warn"
          icon={<Icon name="activity" width={14} height={14} />}
        />
      </div>

      {/* Alpha Pool Table */}
      <Panel>
        <PanelHeader
          title="Alpha Pool — Expression Library"
          sub="IS Sharpe alone is insufficient — OOS Sharpe, fitness, correlation, and drawdown gate promotion"
          right={
            <div className="flex items-center gap-2">
              <Chip tone="warn">IS Sharpe is a WARNING signal</Chip>
              <Chip tone="ai"><Sparkle width={11} height={11} />AI copilot</Chip>
            </div>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1060px] border-collapse">
            <thead>
              <tr>
                <Th>ID</Th>
                <Th>Expression</Th>
                <Th right>IS Sharpe</Th>
                <Th right>OOS Sharpe</Th>
                <Th right>Fitness</Th>
                <Th right>Turnover</Th>
                <Th right>Max DD</Th>
                <Th right>Corr to Pool</Th>
                <Th>OOS Curve</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {ALPHA_POOL.map((a) => {
                const spark = alphaSparkline(a.id);
                const oosWorse = a.sharpeOOS < a.sharpeIS * 0.7;
                return (
                  <tr key={a.id} className={cn("group transition-colors hover:bg-elevated/40", a.status === "retired" ? "opacity-50" : "")}>
                    <Td className="text-xs text-dim font-mono">{a.id}</Td>
                    <Td mono className="text-xs max-w-[320px]">
                      <code className="text-accent text-xs whitespace-nowrap">{a.expression}</code>
                    </Td>
                    <Td right className={a.sharpeIS > 2.0 ? "text-warn font-semibold" : "text-ink"}>
                      {fmtNum(a.sharpeIS)}
                      {a.sharpeIS > 2.0 && <span className="ml-1 text-warn text-xs">⚠</span>}
                    </Td>
                    <Td right className={a.sharpeOOS < 0.8 ? "text-neg font-semibold" : a.sharpeOOS < 1.2 ? "text-warn" : "text-pos"}>
                      {fmtNum(a.sharpeOOS)}
                    </Td>
                    <Td right>
                      <div className="flex items-center justify-end gap-2">
                        <ProgressBar
                          value={a.fitness * 100}
                          max={100}
                          color={a.fitness > 0.75 ? "var(--pos)" : a.fitness > 0.5 ? "var(--warn)" : "var(--neg)"}
                          height={5}
                          className="w-14"
                        />
                        <span className={cn("font-mono text-xs tabular-nums w-8 text-right", a.fitness > 0.75 ? "text-pos" : a.fitness > 0.5 ? "text-warn" : "text-neg")}>
                          {fmtNum(a.fitness, 2)}
                        </span>
                      </div>
                    </Td>
                    <Td right className="text-muted">{fmtPct(a.turnover, 0)}</Td>
                    <Td right className="text-neg">{fmtSignedPct(a.maxDD, 1)}</Td>
                    <Td right className={a.corrToPool > 0.4 ? "text-neg font-semibold" : a.corrToPool > 0.2 ? "text-warn" : "text-pos"}>
                      {fmtNum(a.corrToPool, 2)}
                    </Td>
                    <Td>
                      <Sparkline data={spark} width={80} height={22} strokeWidth={1.2} />
                    </Td>
                    <Td>
                      <Chip tone={statusTone[a.status]}>{a.status.toUpperCase()}</Chip>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="border-t border-line px-4 py-3 text-xs text-dim">
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-3">
            <span>Fitness = IC × ICIR × (1 − corr_to_pool) / max_dd_penalty</span>
            <span className="text-warn">IS Sharpe &gt; 2.0 → overfitting review required</span>
            <span className="text-neg">Corr to pool &gt; 0.4 → marginal diversification benefit — excluded from composite</span>
          </div>
        </div>
      </Panel>

      {/* Decorrelated Composite Panel + Correlation Heatmap */}
      <div className="grid gap-4 lg:grid-cols-5">
        <Panel className="lg:col-span-3">
          <PanelHeader
            title="Decorrelated Composite Portfolio"
            sub="Active alphas weighted by inverse-variance with max-correlation constraint ≤ 0.35"
            right={<Chip tone="pos">Sharpe 1.81</Chip>}
          />
          <div className="px-4 pt-4">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-dim">Composite equity (126 days OOS)</span>
              <span className="font-mono text-pos">+{fmtPct((compositeEquity[compositeEquity.length - 1] / compositeEquity[0] - 1) * 100, 1)}</span>
            </div>
            <Sparkline data={compositeEquity} width={600} height={100} className="w-full" />
          </div>
          <div className="grid grid-cols-4 gap-px border-t border-line">
            {[
              { alpha: "A-037", weight: 32, sharpe: 1.54 },
              { alpha: "A-039", weight: 28, sharpe: 1.22 },
              { alpha: "A-028", weight: 26, sharpe: 1.38 },
              { alpha: "A-035", weight: 14, sharpe: 1.11 },
            ].map((c) => (
              <div key={c.alpha} className="flex flex-col gap-1 p-3">
                <span className="kpi-label">{c.alpha}</span>
                <span className="font-mono text-lg text-ink tabular-nums">{c.weight}%</span>
                <ProgressBar value={c.weight} max={100} height={4} color="var(--accent)" />
                <span className="font-mono text-xs text-muted">SR {fmtNum(c.sharpe)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-line px-4 py-3 text-xs text-dim">
            A-031 and A-041 excluded: A-031 retired (corr 0.59 &gt; 0.4 threshold), A-041 shadow (PBO 42% &gt; 25% gate).
          </div>
        </Panel>

        <Panel className="lg:col-span-2">
          <PanelHeader title="Pairwise Correlation Matrix (Active Pool)" sub="Lower-triangle; diagonal = 1.00" />
          <div className="p-4">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="px-1 py-1 text-left font-mono text-2xs text-dim w-12" />
                    {ALPHA_POOL.map((a) => (
                      <th key={a.id} className="px-1 py-1 text-center font-mono text-2xs text-dim">{a.id.replace("A-", "")}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ALPHA_POOL.map((rowAlpha, i) => (
                    <tr key={rowAlpha.id}>
                      <td className="px-1 py-1 font-mono text-2xs text-dim">{rowAlpha.id.replace("A-", "")}</td>
                      {ALPHA_POOL.map((colAlpha, j) => {
                        const val = i === j ? 1.0 : j > i ? null : corrMatrix[i][j];
                        return (
                          <td key={colAlpha.id} className="px-0.5 py-0.5">
                            {val !== null ? (
                              <div
                                className="h-7 w-7 flex items-center justify-center rounded text-2xs font-mono tabular-nums"
                                style={{
                                  background: val >= 0.8 ? "rgba(255,93,99,0.6)" : val >= 0.5 ? "rgba(242,180,61,0.45)" : val >= 0.3 ? "rgba(31,229,192,0.2)" : "rgba(31,229,192,0.08)",
                                  color: val >= 0.5 ? "var(--ink)" : "var(--muted)",
                                }}
                              >
                                {i === j ? "1.0" : val.toFixed(2)}
                              </div>
                            ) : (
                              <div className="h-7 w-7 rounded bg-elevated/30" />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex items-center gap-3 text-2xs text-dim">
              <div className="flex items-center gap-1">
                <div className="h-3 w-4 rounded" style={{ background: "rgba(31,229,192,0.15)" }} />
                <span>&lt;0.3 decorrelated</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-3 w-4 rounded" style={{ background: "rgba(242,180,61,0.45)" }} />
                <span>0.5–0.8 caution</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-3 w-4 rounded" style={{ background: "rgba(255,93,99,0.6)" }} />
                <span>&gt;0.8 redundant</span>
              </div>
            </div>
          </div>
        </Panel>
      </div>

      {/* Sub-universe Robustness Grid */}
      <Panel>
        <PanelHeader
          title="Sub-Universe Robustness Grid"
          sub="Composite portfolio Sharpe across market-cap, liquidity, time, and sector buckets"
          right={<Chip tone="accent">4 dimensions · 16 cells</Chip>}
        />
        <div className="divide-y divide-line">
          {ROBUSTNESS_GRID.map((grp) => (
            <div key={grp.bucket} className="flex items-center gap-4 px-4 py-3">
              <span className="w-32 shrink-0 text-xs font-medium text-muted">{grp.bucket}</span>
              <div className="flex flex-1 flex-wrap gap-3">
                {grp.cells.map((cell) => (
                  <div key={cell.label} className="flex-1 min-w-[120px]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-dim truncate">{cell.label}</span>
                      <span className={cn("font-mono text-xs tabular-nums ml-2", cell.sharpe >= 1.4 ? "text-pos" : cell.sharpe >= 1.0 ? "text-warn" : "text-neg")}>
                        {fmtNum(cell.sharpe)}
                      </span>
                    </div>
                    <HeatRow values={[cell.heat]} cellH={12} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-line px-4 py-3 text-xs text-dim">
          Heat intensity: teal (low Sharpe) → amber → red (high Sharpe). Robustness requires consistent performance across all 16 cells, not just top buckets.
        </div>
      </Panel>

      {/* DSL Operator Reference */}
      <Panel>
        <PanelHeader
          title="Alpha Expression Operators — Reference"
          sub="Full vectorized DSL; every operator is PIT-safe and cross-sectionally normalized by default"
          right={<Chip tone="ai"><Sparkle width={11} height={11} />10 operators</Chip>}
        />
        <div className="grid grid-cols-1 gap-px bg-line sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {DSL_OPERATORS.map((op) => (
            <div key={op.name} className="bg-base p-3">
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className="font-mono text-sm font-semibold text-accent">{op.name}</code>
                    <Chip tone={op.category === "cross-section" ? "accent" : "info"} className="text-2xs">
                      {op.category}
                    </Chip>
                  </div>
                  <code className="mt-1 block font-mono text-xs text-muted">{op.sig}</code>
                  <p className="mt-1.5 text-xs text-dim leading-relaxed">{op.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-line px-4 py-3 text-xs text-dim">
          All operators are vectorized over universe × time. Results are cross-sectionally z-scored before downstream composition.
          PIT field resolution is automatic — no as_of parameter needed in expressions.
        </div>
      </Panel>
    </div>
  );
}
