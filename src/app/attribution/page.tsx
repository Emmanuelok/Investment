import { PageHeader, Panel, PanelHeader, Chip, KpiCard, Th, Td, Stat, StatusDot } from "@/components/ui/kit";
import { Sparkline, ProgressBar, DeltaBars, Ring } from "@/components/ui/viz";
import { Icon } from "@/components/icon-map";
import {
  SNAPSHOT_ID, RETURN_PERIODS, BRINSON_TABLE, FACTOR_ATTRIBUTION, BENCHMARK_ANALYTICS,
  FIXED_INCOME_ATTRIBUTION, NAV_SERIES, BENCH_SERIES,
} from "@/lib/data/aegis-risk";
import { fmtNum, fmtPct, fmtSignedPct, fmtBps, signClass } from "@/lib/format";
import { cn } from "@/lib/cn";

export const metadata = { title: "Performance & Attribution — AEGIS" };

/* ── helpers ─────────────────────────────────────────────────────────────── */
function ReturnDelta({ val, bench, className }: { val: number; bench: number; className?: string }) {
  const active = val - bench;
  return (
    <div className={cn("flex items-baseline gap-1", className)}>
      <span className={cn("font-mono tabular-nums", val >= 0 ? "text-pos" : "text-neg")}>
        {fmtSignedPct(val, 2)}
      </span>
      <span className="text-dim text-xs">|</span>
      <span className="font-mono text-xs tabular-nums text-dim">{fmtSignedPct(bench, 2)}</span>
      <span className={cn("font-mono text-xs tabular-nums ml-1", signClass(active))}>
        ({active >= 0 ? "+" : ""}{fmtPct(active, 2)})
      </span>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────────── */
export default function AttributionPage() {
  const ytd = RETURN_PERIODS.find(r => r.label === "YTD")!;
  const oneY = RETURN_PERIODS.find(r => r.label === "1Y")!;
  const mtd = RETURN_PERIODS.find(r => r.label === "MTD")!;

  // Total Brinson attribution
  const totalAlloc    = BRINSON_TABLE.reduce((s, r) => s + r.allocation, 0);
  const totalSelect   = BRINSON_TABLE.reduce((s, r) => s + r.selection, 0);
  const totalInteract = BRINSON_TABLE.reduce((s, r) => s + r.interaction, 0);
  const totalBrinson  = BRINSON_TABLE.reduce((s, r) => s + r.total, 0);

  // Total factor attribution
  const totalFactorContrib = FACTOR_ATTRIBUTION.reduce((s, r) => s + r.contribution, 0);

  // FI attribution
  const totalFiContrib = FIXED_INCOME_ATTRIBUTION.reduce((s, r) => s + r.contribution, 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <PageHeader
        module={{ name: "AEGIS · Risk & Execution", tone: "accent" }}
        title="Performance & Attribution"
        desc="GIPS-compliant composite performance · Brinson-Fachler sector attribution · Factor-based decomposition · Benchmark-relative analytics. All attribution is linked to the risk snapshot and reproducible."
        right={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded border border-accent/30 bg-accent/10 px-2.5 py-1.5 font-mono text-xs text-accent">
              <Icon name="database" width={12} height={12} />
              {SNAPSHOT_ID}
            </div>
            <Chip tone="info">GIPS Composite</Chip>
            <button className="btn btn-accent">
              <Icon name="doc" width={14} height={14} />
              Export Report
            </button>
          </div>
        }
      />

      {/* KPI deck */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          label="YTD Return (TWR)"
          value={fmtSignedPct(ytd.twr, 2)}
          sub={`vs benchmark ${fmtSignedPct(ytd.benchmark, 2)}`}
          icon={<Icon name="candle" width={15} height={15} />}
          tone="pos"
        />
        <KpiCard
          label="Active Return (1Y)"
          value={fmtSignedPct(oneY.active, 2)}
          sub={`Portfolio ${fmtSignedPct(oneY.twr, 2)} · Bench ${fmtSignedPct(oneY.benchmark, 2)}`}
          icon={<Icon name="target" width={15} height={15} />}
          tone="pos"
        />
        <KpiCard
          label="Information Ratio"
          value={fmtNum(BENCHMARK_ANALYTICS.informationRatio, 3)}
          sub={`TE ${fmtPct(BENCHMARK_ANALYTICS.trackingError, 2)} ann.`}
          icon={<Icon name="gauge" width={15} height={15} />}
          tone="accent"
        />
        <KpiCard
          label="Sharpe Ratio"
          value={fmtNum(BENCHMARK_ANALYTICS.sharpe, 2)}
          sub={`Sortino ${fmtNum(BENCHMARK_ANALYTICS.sortino, 2)} · Max DD ${fmtPct(BENCHMARK_ANALYTICS.maxDrawdown, 1)}`}
          icon={<Icon name="activity" width={15} height={15} />}
          tone="accent"
        />
      </div>

      {/* Return periods table + NAV chart */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Period performance */}
        <Panel className="lg:col-span-2">
          <PanelHeader
            title="TWR vs MWR — Multi-Period Returns"
            sub="Time-weighted (GIPS) and money-weighted returns vs benchmark · positive active return all periods"
            right={<Chip tone="pos">All periods outperforming</Chip>}
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr>
                  <Th>Period</Th>
                  <Th right>TWR (Port)</Th>
                  <Th right>MWR (Port)</Th>
                  <Th right>Benchmark</Th>
                  <Th right>Active Return</Th>
                  <Th right>TWR vs Bench</Th>
                </tr>
              </thead>
              <tbody>
                {RETURN_PERIODS.map((p) => (
                  <tr key={p.label} className="hover:bg-elevated/40 transition-colors">
                    <Td mono={false} className="font-medium text-muted">{p.label}</Td>
                    <Td right className={p.twr >= 0 ? "text-pos" : "text-neg"}>
                      {fmtSignedPct(p.twr, 2)}
                    </Td>
                    <Td right className={p.mwr >= 0 ? "text-pos" : "text-neg"}>
                      {fmtSignedPct(p.mwr, 2)}
                    </Td>
                    <Td right className="text-muted">
                      {fmtSignedPct(p.benchmark, 2)}
                    </Td>
                    <Td right className={p.active >= 0 ? "text-pos" : "text-neg"}>
                      {fmtSignedPct(p.active, 2)}
                    </Td>
                    <Td right>
                      <div className="flex items-center justify-end gap-2">
                        <div
                          className={cn("h-2 rounded-sm", p.active >= 0 ? "bg-pos/60" : "bg-neg/60")}
                          style={{ width: `${Math.min(Math.abs(p.active) * 16, 80)}px` }}
                        />
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-line px-4 py-2.5 text-xs text-dim">
            <span className="font-medium text-muted">GIPS Note: </span>
            AEGIS Global Macro Fund I composite. TWR calculated per GIPS 2020 §2.A.
            Past performance is not indicative of future results. DEMO DATA.
          </div>
        </Panel>

        {/* NAV sparkline */}
        <Panel>
          <PanelHeader title="NAV Index vs Benchmark (12M)" />
          <div className="px-4 py-4">
            <div className="relative">
              <Sparkline data={NAV_SERIES}  width={280} height={80} color="var(--pos)" area />
              <div className="absolute inset-0 flex items-start pt-0">
                <Sparkline data={BENCH_SERIES} width={280} height={80} color="var(--muted)" area={false} strokeWidth={1} />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-5 rounded-sm bg-pos/60" />
                <span className="text-muted">Portfolio ({fmtSignedPct(oneY.twr, 1)} 1Y)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-px w-5 bg-dim" />
                <span className="text-dim">Benchmark ({fmtSignedPct(oneY.benchmark, 1)} 1Y)</span>
              </div>
            </div>
          </div>
          <div className="border-t border-line px-4 py-3 space-y-2">
            <Stat label="Active Share" value={`${fmtPct(BENCHMARK_ANALYTICS.activeSharePct, 1)}`} tone="accent" />
            <Stat label="Up Capture" value={`${fmtPct(BENCHMARK_ANALYTICS.upCapture, 1)}`} tone="pos" />
            <Stat label="Down Capture" value={`${fmtPct(BENCHMARK_ANALYTICS.downCapture, 1)}`} tone="pos" />
            <Stat label="Hit Rate" value={`${fmtPct(BENCHMARK_ANALYTICS.hitRate, 1)}`} tone="accent" />
          </div>
        </Panel>
      </div>

      {/* Brinson-Fachler attribution */}
      <Panel>
        <PanelHeader
          title="Brinson-Fachler Sector Attribution"
          sub="Allocation + Selection + Interaction decomposition vs benchmark · YTD · bps"
          right={
            <div className="flex items-center gap-2">
              <Chip tone="pos">+{fmtNum(totalBrinson, 0)}bps active</Chip>
              <Chip tone="default">YTD</Chip>
            </div>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse">
            <thead>
              <tr>
                <Th>Sector</Th>
                <Th right>Port Wt %</Th>
                <Th right>Bench Wt %</Th>
                <Th right>Port Ret %</Th>
                <Th right>Bench Ret %</Th>
                <Th right>Allocation (bps)</Th>
                <Th right>Selection (bps)</Th>
                <Th right>Interaction (bps)</Th>
                <Th right>Total (bps)</Th>
              </tr>
            </thead>
            <tbody>
              {BRINSON_TABLE.map((row) => (
                <tr key={row.sector} className="hover:bg-elevated/40 transition-colors">
                  <Td mono={false} className="font-medium text-muted">{row.sector}</Td>
                  <Td right className="text-muted">{fmtPct(row.portWeight, 1)}</Td>
                  <Td right className="text-dim">{fmtPct(row.benchWeight, 1)}</Td>
                  <Td right className={row.portReturn >= 0 ? "text-pos" : "text-neg"}>
                    {fmtSignedPct(row.portReturn, 1)}
                  </Td>
                  <Td right className="text-dim">
                    {fmtSignedPct(row.benchReturn, 1)}
                  </Td>
                  <Td right className={signClass(row.allocation)}>
                    {fmtBps(row.allocation)}
                  </Td>
                  <Td right className={signClass(row.selection)}>
                    {fmtBps(row.selection)}
                  </Td>
                  <Td right className={signClass(row.interaction)}>
                    {fmtBps(row.interaction)}
                  </Td>
                  <Td right className={cn("font-semibold", signClass(row.total))}>
                    {fmtBps(row.total)}
                  </Td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-elevated/30">
                <Td mono={false} className="font-semibold text-muted">Total</Td>
                <Td right />
                <Td right />
                <Td right />
                <Td right />
                <Td right className={cn("font-semibold", signClass(totalAlloc))}>{fmtBps(totalAlloc)}</Td>
                <Td right className={cn("font-semibold", signClass(totalSelect))}>{fmtBps(totalSelect)}</Td>
                <Td right className={cn("font-semibold", signClass(totalInteract))}>{fmtBps(totalInteract)}</Td>
                <Td right className="font-bold text-pos">{fmtBps(totalBrinson)}</Td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Panel>

      {/* Factor attribution + benchmark analytics */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Factor-based attribution */}
        <Panel>
          <PanelHeader
            title="Factor-Based Attribution"
            sub="Return decomposed into factor contributions + specific · YTD"
            right={<Chip tone="accent">+{fmtNum(totalFactorContrib, 0)}bps total</Chip>}
          />
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <Th>Factor</Th>
                  <Th right>Exposure β</Th>
                  <Th right>Factor Ret %</Th>
                  <Th right>Contribution (bps)</Th>
                  <Th right>Bar</Th>
                </tr>
              </thead>
              <tbody>
                {FACTOR_ATTRIBUTION.map((f) => (
                  <tr key={f.factor} className="hover:bg-elevated/40 transition-colors">
                    <Td mono={false} className={cn("font-medium", f.factor === "Specific" ? "text-ai" : "text-muted")}>
                      {f.factor}
                    </Td>
                    <Td right className={f.factor === "Specific" ? "text-dim" : signClass(f.exposure)}>
                      {f.factor === "Specific" ? "—" : `${f.exposure >= 0 ? "+" : ""}${fmtNum(f.exposure, 2)}`}
                    </Td>
                    <Td right className="text-muted">
                      {f.factor === "Specific" ? "—" : fmtSignedPct(f.factorReturn, 2)}
                    </Td>
                    <Td right className={cn("font-semibold", signClass(f.contribution))}>
                      {fmtBps(f.contribution)}
                    </Td>
                    <Td right>
                      <div className="flex justify-end">
                        <div
                          className={cn("h-2 rounded-sm", f.contribution >= 0 ? "bg-pos/60" : "bg-neg/60")}
                          style={{ width: `${Math.min(Math.abs(f.contribution) * 0.6, 80)}px` }}
                        />
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-elevated/30">
                  <Td mono={false} className="font-semibold text-muted" colSpan={3}>Total Attribution</Td>
                  <Td right className="font-bold text-pos">{fmtBps(totalFactorContrib)}</Td>
                  <Td right />
                </tr>
              </tfoot>
            </table>
          </div>
        </Panel>

        {/* Benchmark analytics */}
        <Panel>
          <PanelHeader
            title="Benchmark-Relative Analytics"
            sub="Tracking error, information ratio, capture ratios · 1-year trailing"
          />
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 px-4 py-4">
            {[
              { label: "Active Return (1Y)", value: fmtSignedPct(oneY.active, 2), tone: "pos" as const },
              { label: "Tracking Error (Ann)", value: `${fmtPct(BENCHMARK_ANALYTICS.trackingError, 2)}`, tone: "accent" as const },
              { label: "Information Ratio", value: fmtNum(BENCHMARK_ANALYTICS.informationRatio, 3), tone: "accent" as const },
              { label: "Active Share", value: `${fmtPct(BENCHMARK_ANALYTICS.activeSharePct, 1)}`, tone: "accent" as const },
              { label: "Sharpe Ratio", value: fmtNum(BENCHMARK_ANALYTICS.sharpe, 2), tone: "accent" as const },
              { label: "Sortino Ratio", value: fmtNum(BENCHMARK_ANALYTICS.sortino, 2), tone: "accent" as const },
              { label: "Max Drawdown", value: fmtPct(BENCHMARK_ANALYTICS.maxDrawdown, 1), tone: "neg" as const },
              { label: "Calmar Ratio", value: fmtNum(BENCHMARK_ANALYTICS.calmar, 2), tone: "accent" as const },
              { label: "Up Capture", value: `${fmtPct(BENCHMARK_ANALYTICS.upCapture, 1)}`, tone: "pos" as const },
              { label: "Down Capture", value: `${fmtPct(BENCHMARK_ANALYTICS.downCapture, 1)}`, tone: "pos" as const },
              { label: "Hit Rate", value: `${fmtPct(BENCHMARK_ANALYTICS.hitRate, 1)}`, tone: "pos" as const },
              { label: "Benchmark", value: "MSCI ACWI", tone: "muted" as const },
            ].map((m) => (
              <Stat key={m.label} label={m.label} value={m.value} tone={m.tone} />
            ))}
          </div>

          {/* Capture ratio visual */}
          <div className="border-t border-line px-4 py-3 space-y-2">
            <div className="section-label text-[11px] text-muted mb-2">Up/Down Capture Ratio</div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted">Up Capture</span>
                <span className="font-mono text-pos">{fmtPct(BENCHMARK_ANALYTICS.upCapture, 1)}</span>
              </div>
              <ProgressBar value={BENCHMARK_ANALYTICS.upCapture} max={150} color="var(--pos)" height={5} />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted">Down Capture</span>
                <span className="font-mono text-pos">{fmtPct(BENCHMARK_ANALYTICS.downCapture, 1)}</span>
              </div>
              <ProgressBar value={BENCHMARK_ANALYTICS.downCapture} max={150} color="var(--accent)" height={5} />
            </div>
            <div className="pt-1 text-xs text-dim">
              Up capture &gt; 100% and down capture &lt; 100% indicates skill in up/down environments.
            </div>
          </div>
        </Panel>
      </div>

      {/* Fixed income attribution */}
      <Panel>
        <PanelHeader
          title="Fixed Income Attribution — Fund III"
          sub="Carry · Curve · Spread · Allocation · Selection · Residual decomposition · YTD"
          right={<Chip tone="pos">+{fmtNum(totalFiContrib, 0)}bps total</Chip>}
        />
        <div className="grid gap-4 p-4 md:grid-cols-2">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <Th>Component</Th>
                  <Th right>Contribution (bps)</Th>
                  <Th>Description</Th>
                </tr>
              </thead>
              <tbody>
                {FIXED_INCOME_ATTRIBUTION.map((f) => (
                  <tr key={f.component} className="hover:bg-elevated/40 transition-colors">
                    <Td mono={false} className="font-medium text-muted">{f.component}</Td>
                    <Td right className={cn("font-semibold", signClass(f.contribution))}>
                      {fmtBps(f.contribution)}
                    </Td>
                    <Td mono={false} className="text-xs text-dim">{f.description}</Td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-elevated/30">
                  <Td mono={false} className="font-semibold text-muted">Total</Td>
                  <Td right className="font-bold text-pos">{fmtBps(totalFiContrib)}</Td>
                  <Td />
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="space-y-3">
            <div className="section-label text-[11px] text-muted">Waterfall (bps)</div>
            {FIXED_INCOME_ATTRIBUTION.map((f) => (
              <div key={f.component} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted">{f.component}</span>
                  <span className={cn("font-mono tabular-nums", signClass(f.contribution))}>
                    {fmtBps(f.contribution)}
                  </span>
                </div>
                <ProgressBar
                  value={Math.abs(f.contribution)}
                  max={250}
                  color={f.contribution >= 0 ? "var(--pos)" : "var(--neg)"}
                  height={6}
                />
              </div>
            ))}
            <div className="pt-2 border-t border-line text-xs text-dim">
              Fixed income attribution per Campisi model. Duration contribution from parallel shift;
              curve from non-parallel moves. Spread from IG/HY OAS tightening.
            </div>
          </div>
        </div>
      </Panel>

      {/* GIPS note */}
      <Panel>
        <PanelHeader
          title="GIPS Compliance Notice"
          right={<Chip tone="info">GIPS 2020</Chip>}
        />
        <div className="px-4 py-4 text-xs text-dim leading-relaxed space-y-2">
          <p>
            <span className="font-medium text-muted">AEGIS Capital Management</span> claims compliance with the Global Investment Performance Standards (GIPS®) and has prepared and presented this report in compliance with the GIPS standards.
            AEGIS Capital Management has not been independently verified.
          </p>
          <p>
            The AEGIS Global Macro Composite includes all fully discretionary, fee-paying accounts managed to the Global Macro mandate since the composite inception date.
            Returns are presented gross and net of management fees, denominated in USD.
            The composite creation date is January 1, 2022. The composite inception date is January 1, 2022.
          </p>
          <p>
            Benchmark: MSCI ACWI (net total return). Performance results shown are for the AEGIS Global Macro Fund I composite.
            Policies for valuing investments, calculating performance, and preparing GIPS reports are available upon request.
            A list of composite descriptions is also available upon request.
          </p>
          <p className="font-mono text-dim">
            DEMO DATA — all figures are illustrative. Snapshot: {SNAPSHOT_ID} · as of {new Date("2026-06-08").toDateString()}.
          </p>
        </div>
      </Panel>
    </div>
  );
}
