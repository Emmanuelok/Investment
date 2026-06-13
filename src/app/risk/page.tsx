import { PageHeader, Panel, PanelHeader, Chip, KpiCard, Th, Td, Ticker, Stat, StatusDot } from "@/components/ui/kit";
import { LiveDot } from "@/components/live/live-stat";
import { CorrelationMatrix } from "@/components/engine/correlation-matrix";
import { Sparkline, DeltaBars, ProgressBar, Ring } from "@/components/ui/viz";
import { Icon } from "@/components/icon-map";
import {
  SNAPSHOT_ID, EWMA_LAMBDA, MC_SEED, MC_PATHS, VAR_LOOKBACK_DAYS, RISK_PARAM_VERSION,
  VAR_METRICS, FACTOR_EXPOSURES, COMPONENT_VAR, STRESS_TESTS,
} from "@/lib/data/aegis-risk";
import { fmtNum, fmtPct, fmtBps, signClass, fmtUsdCompact } from "@/lib/format";
import { cn } from "@/lib/cn";

export const metadata = { title: "Risk Engine — AEGIS" };

/* ── helpers ─────────────────────────────────────────────────────────────── */
function VarMethodRow({
  label, val, prev, limit, chip
}: { label: string; val: number; prev: number; limit: number; chip?: string }) {
  const utilization = (val / limit) * 100;
  const chg = val - prev;
  return (
    <div className="flex items-center gap-4 border-b border-line/60 px-4 py-3 last:border-0">
      <div className="w-52 shrink-0">
        <div className="text-xs text-muted">{label}</div>
        {chip && <Chip tone="info" className="mt-1">{chip}</Chip>}
      </div>
      <div className="w-24 shrink-0">
        <span className="font-mono text-lg font-semibold tabular-nums text-neg">${fmtNum(val)}M</span>
      </div>
      <div className={cn("w-20 shrink-0 font-mono text-xs tabular-nums", chg > 0 ? "text-neg" : "text-pos")}>
        {chg > 0 ? "▲" : "▼"} {fmtNum(Math.abs(chg))}M
      </div>
      <div className="flex flex-1 items-center gap-2">
        <ProgressBar
          value={utilization}
          max={100}
          color={utilization > 80 ? "var(--neg)" : utilization > 65 ? "var(--warn)" : "var(--pos)"}
          height={5}
          className="flex-1"
        />
        <span className={cn("w-14 shrink-0 text-right font-mono text-xs tabular-nums",
          utilization > 80 ? "text-neg" : utilization > 65 ? "text-warn" : "text-pos")}>
          {fmtPct(utilization, 0)} used
        </span>
      </div>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────────── */
export default function RiskPage() {
  const { histVar99_1d, parametricVar99_1d, mcVar99_1d, es99_1d, varPrevDay, varLimit, varUtilization, varSeries, factorRisk, idioRisk } = VAR_METRICS;

  // Factor delta series for DeltaBars — exposures as array
  const factorDeltaData = FACTOR_EXPOSURES.slice(0, 8).map((f) => f.exposure);
  const factorReturnData = FACTOR_EXPOSURES.slice(0, 8).map((f) => f.returnAttr / 100);

  return (
    <div className="space-y-5">
      {/* Header */}
      <PageHeader
        module={{ name: "AEGIS · Risk & Execution", tone: "accent" }}
        title="Risk Engine"
        desc="Glass-box factor risk: every number traceable to inputs, factor exposures, and EWMA covariance methodology. Reproducible from snapshot id. Immutable audit on every run."
        right={
          <div className="flex items-center gap-2">
            <LiveDot />
            <div className="flex items-center gap-1.5 rounded border border-accent/30 bg-accent/10 px-2.5 py-1.5 font-mono text-xs text-accent">
              <Icon name="database" width={12} height={12} />
              {SNAPSHOT_ID}
            </div>
            <div className="flex items-center gap-1.5 rounded border border-line px-2 py-1.5 font-mono text-xs text-dim">
              <Icon name="shield" width={12} height={12} />
              {RISK_PARAM_VERSION}
            </div>
            <button className="btn btn-accent">
              <Icon name="bolt" width={14} height={14} />
              Rerun Risk
            </button>
          </div>
        }
      />

      <CorrelationMatrix />

      {/* VaR KPI deck */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          label="Hist VaR 99% 1D"
          value={`$${fmtNum(histVar99_1d)}M`}
          sub={`${fmtPct(varUtilization, 1)} of $${varLimit}M limit`}
          icon={<Icon name="gauge" width={15} height={15} />}
          tone="warn"
        />
        <KpiCard
          label="Parametric VaR (EWMA)"
          value={`$${fmtNum(parametricVar99_1d)}M`}
          sub={`λ=${EWMA_LAMBDA} · ${VAR_LOOKBACK_DAYS}d history`}
          icon={<Icon name="wave" width={15} height={15} />}
          tone="warn"
        />
        <KpiCard
          label="Monte Carlo VaR 99%"
          value={`$${fmtNum(mcVar99_1d)}M`}
          sub={`${(MC_PATHS / 1000).toFixed(0)}K paths · seed ${MC_SEED.slice(-8)}`}
          icon={<Icon name="cpu" width={15} height={15} />}
          tone="warn"
        />
        <KpiCard
          label="Expected Shortfall 99%"
          value={`$${fmtNum(es99_1d)}M`}
          sub="CVaR · avg loss beyond VaR"
          icon={<Icon name="activity" width={15} height={15} />}
          tone="neg"
        />
      </div>

      {/* VaR breakdown panel + timeseries */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Method breakdown */}
        <Panel className="lg:col-span-2">
          <PanelHeader
            title="VaR by Methodology — 99% Confidence, 1-Day Horizon"
            sub={`Limit: $${varLimit}M · prev close: $${fmtNum(varPrevDay)}M · EWMA λ=${EWMA_LAMBDA}`}
            right={
              <div className="flex items-center gap-2">
                <Chip tone="accent">99% CL</Chip>
                <Chip tone="default">1D</Chip>
              </div>
            }
          />
          <VarMethodRow
            label="Historical Simulation (HS)"
            val={histVar99_1d} prev={varPrevDay} limit={varLimit}
            chip={`${VAR_LOOKBACK_DAYS}d lookback`}
          />
          <VarMethodRow
            label="Parametric — EWMA Covariance"
            val={parametricVar99_1d} prev={varPrevDay} limit={varLimit}
            chip={`λ=${EWMA_LAMBDA} decay`}
          />
          <VarMethodRow
            label="Monte Carlo Simulation"
            val={mcVar99_1d} prev={varPrevDay} limit={varLimit}
            chip={`50K paths · seeded`}
          />
          <div className="border-t border-line/60 bg-elevated/20 px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-muted">Expected Shortfall (CVaR) 99%</span>
                <div className="mt-0.5 text-xs text-dim">Average loss conditional on exceeding VaR threshold</div>
              </div>
              <span className="font-mono text-xl font-semibold tabular-nums text-neg">${fmtNum(es99_1d)}M</span>
            </div>
          </div>
        </Panel>

        {/* 30D VaR timeseries + risk decomp */}
        <div className="flex flex-col gap-4">
          <Panel className="flex-1">
            <PanelHeader title="30-Day VaR Trend (99% 1D)" />
            <div className="px-4 py-4">
              <Sparkline data={varSeries} width={280} height={72} color="var(--warn)" />
              <div className="mt-2 flex justify-between font-mono text-2xs text-dim">
                <span>30D ago</span>
                <span className="text-warn">${fmtNum(varSeries[varSeries.length - 1])}M today</span>
              </div>
            </div>
          </Panel>
          <Panel>
            <PanelHeader title="Risk Decomposition" sub="Factor vs Idiosyncratic" />
            <div className="flex items-center gap-4 px-4 py-4">
              <Ring
                value={factorRisk}
                max={100}
                size={80}
                stroke={7}
                color="var(--accent)"
                label={`${fmtPct(factorRisk, 0)}`}
                sub="Factor"
              />
              <div className="flex-1 space-y-2">
                <div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted">Factor Risk</span>
                    <span className="font-mono text-accent">{fmtPct(factorRisk, 1)}</span>
                  </div>
                  <ProgressBar value={factorRisk} max={100} color="var(--accent)" height={5} className="mt-1" />
                </div>
                <div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted">Idiosyncratic</span>
                    <span className="font-mono text-info">{fmtPct(idioRisk, 1)}</span>
                  </div>
                  <ProgressBar value={idioRisk} max={100} color="var(--info)" height={5} className="mt-1" />
                </div>
              </div>
            </div>
          </Panel>
        </div>
      </div>

      {/* Factor exposures chart */}
      <Panel>
        <PanelHeader
          title="Factor Exposures — BARRA-style Decomposition"
          sub="Standardised factor betas vs benchmark · positive = over-weight factor · negative = under-weight"
          right={
            <div className="flex items-center gap-2">
              <Chip tone="info">EWMA Cov</Chip>
              <Chip tone="accent">12 factors</Chip>
            </div>
          }
        />
        <div className="px-4 py-4">
          <div className="mb-4 flex h-24 items-end gap-0">
            {FACTOR_EXPOSURES.map((f) => (
              <div key={f.factor} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className={cn(
                    "w-full max-w-[28px] rounded-[2px]",
                    f.exposure >= 0 ? "bg-pos" : "bg-neg"
                  )}
                  style={{
                    height: `${Math.abs(f.exposure) * 44}px`,
                    opacity: 0.85,
                    marginTop: f.exposure >= 0 ? "auto" : undefined,
                  }}
                />
              </div>
            ))}
          </div>
          <div className="h-px bg-line" />
          <div className="mt-1 flex gap-0">
            {FACTOR_EXPOSURES.map((f) => (
              <div key={f.factor} className="flex-1 text-center">
                <div className="truncate font-mono text-[9px] text-dim">{f.factor.slice(0, 6)}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto border-t border-line">
          <table className="w-full min-w-[900px] border-collapse">
            <thead>
              <tr>
                <Th>Factor</Th>
                <Th right>Exposure β</Th>
                <Th right>Risk Contrib (bps)</Th>
                <Th right>Return Attr (bps)</Th>
                <Th right>Exposure Chart</Th>
              </tr>
            </thead>
            <tbody>
              {FACTOR_EXPOSURES.map((f) => (
                <tr key={f.factor} className="hover:bg-elevated/40 transition-colors">
                  <Td mono={false} className="font-medium text-muted">{f.factor}</Td>
                  <Td right className={f.exposure >= 0 ? "text-pos" : "text-neg"}>
                    {f.exposure >= 0 ? "+" : ""}{fmtNum(f.exposure, 2)}
                  </Td>
                  <Td right className="text-muted">{fmtNum(f.contribution, 1)}</Td>
                  <Td right className={signClass(f.returnAttr)}>
                    {fmtBps(f.returnAttr)}
                  </Td>
                  <Td right>
                    <div className="flex justify-end">
                      <DeltaBars data={[f.exposure]} width={60} height={24} />
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Component VaR by position */}
      <Panel>
        <PanelHeader
          title="Component & Marginal VaR — by Position"
          sub="Component VaR sums to total portfolio VaR · marginal VaR = $ risk per $1M notional"
          right={<Chip tone="warn">HS 99% 1D</Chip>}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse">
            <thead>
              <tr>
                <Th>Position</Th>
                <Th right>Mkt Value ($M)</Th>
                <Th right>Component VaR ($M)</Th>
                <Th right>% of Total VaR</Th>
                <Th right>Marginal VaR</Th>
                <Th right>Beta (VaR)</Th>
                <Th right>Contribution</Th>
              </tr>
            </thead>
            <tbody>
              {COMPONENT_VAR.map((cv) => (
                <tr key={cv.sym} className="hover:bg-elevated/40 transition-colors">
                  <Td mono={false}>
                    <Ticker sym={cv.sym} name={cv.name} />
                  </Td>
                  <Td right className="text-muted">${fmtNum(cv.mktValue, 3)}</Td>
                  <Td right className={cv.componentVaR > 0 ? "text-neg" : "text-pos"}>
                    {cv.componentVaR > 0 ? "" : "+"}{fmtNum(cv.componentVaR, 2)}
                  </Td>
                  <Td right>
                    <div className="flex items-center justify-end gap-2">
                      <ProgressBar
                        value={Math.abs(cv.pctVaR)}
                        max={25}
                        color={cv.pctVaR > 0 ? "var(--neg)" : "var(--pos)"}
                        height={4}
                        className="w-20"
                      />
                      <span className={cn("w-12 text-right font-mono text-xs tabular-nums",
                        cv.pctVaR > 0 ? "text-neg" : "text-pos")}>
                        {cv.pctVaR > 0 ? "" : "+"}{fmtPct(Math.abs(cv.pctVaR), 1)}
                      </span>
                    </div>
                  </Td>
                  <Td right className="text-muted">{fmtNum(cv.marginalVaR, 3)}</Td>
                  <Td right className={signClass(cv.betaVaR)}>{fmtNum(cv.betaVaR, 2)}</Td>
                  <Td right>
                    <div
                      className={cn("inline-block h-2 rounded-sm", cv.pctVaR > 0 ? "bg-neg/70" : "bg-pos/70")}
                      style={{ width: `${Math.min(Math.abs(cv.pctVaR) * 4, 80)}px` }}
                    />
                  </Td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-elevated/30">
                <Td mono={false} className="font-semibold text-muted">Total Portfolio</Td>
                <Td right />
                <Td right className="font-semibold text-neg">${fmtNum(VAR_METRICS.histVar99_1d, 2)}</Td>
                <Td right className="font-semibold text-muted">100.0%</Td>
                <Td right />
                <Td right />
                <Td right />
              </tr>
            </tfoot>
          </table>
        </div>
      </Panel>

      {/* Stress tests */}
      <Panel>
        <PanelHeader
          title="Stress Tests & Scenario Analysis"
          sub="Historical and hypothetical shocks applied to current book"
          right={<Chip tone="neg">7 scenarios</Chip>}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] border-collapse">
            <thead>
              <tr>
                <Th>Scenario</Th>
                <Th>Description</Th>
                <Th right>Equity Shock</Th>
                <Th right>Rates Shock</Th>
                <Th right>FX Shock</Th>
                <Th right>Credit Spread</Th>
                <Th right>P&L Impact ($M)</Th>
                <Th right>VaR Δ</Th>
              </tr>
            </thead>
            <tbody>
              {STRESS_TESTS.map((s) => (
                <tr key={s.scenario} className="hover:bg-elevated/40 transition-colors">
                  <Td mono={false}>
                    <div>
                      <div className="font-medium text-ink">{s.scenario}</div>
                      <div className="text-2xs text-dim">{s.date}</div>
                    </div>
                  </Td>
                  <Td mono={false} className="max-w-[280px] text-xs text-dim">{s.description}</Td>
                  <Td right className={s.equityShock < 0 ? "text-neg" : "text-pos"}>
                    {fmtNum(s.equityShock, 1)}%
                  </Td>
                  <Td right className={s.ratesShock < 0 ? "text-pos" : "text-neg"}>
                    {s.ratesShock > 0 ? "+" : ""}{s.ratesShock}bps
                  </Td>
                  <Td right className={s.fxShock > 0 ? "text-warn" : "text-pos"}>
                    {s.fxShock > 0 ? "+" : ""}{fmtNum(s.fxShock, 1)}%
                  </Td>
                  <Td right className="text-warn">+{s.creditShock}bps</Td>
                  <Td right>
                    <span className={cn("font-mono font-semibold tabular-nums text-base",
                      s.pnlImpact < -100 ? "text-neg" : s.pnlImpact < -20 ? "text-warn" : "text-neg")}>
                      ${fmtNum(s.pnlImpact, 1)}M
                    </span>
                  </Td>
                  <Td right className="text-warn">+{s.varChange}%</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Glass-box VaR move panel */}
      <Panel glow>
        <PanelHeader
          title="Glass-Box: Why Did VaR Move?"
          sub={`Today $${fmtNum(histVar99_1d)}M vs prev $${fmtNum(varPrevDay)}M · +$${fmtNum(histVar99_1d - varPrevDay)}M change attributed below`}
          right={
            <div className="flex items-center gap-2">
              <StatusDot tone="accent" pulse />
              <Chip tone="accent">Traceable · Reproducible</Chip>
            </div>
          }
        />
        <div className="grid gap-4 p-4 md:grid-cols-3">
          <div className="space-y-3">
            <div className="section-label text-[11px] text-muted">Attribution of VaR Change</div>
            {[
              { label: "NVDA position mark-up (+8K sh price move)", delta: +0.48, reason: "Market factor + idio" },
              { label: "BTC mark-to-market +4.2%", delta: +0.31, reason: "Crypto idiosyncratic" },
              { label: "EWMA covariance update (new obs d-500)", delta: +0.18, reason: "λ=0.94 vol decay" },
              { label: "SPY Put hedge offset (vol expansion)", delta: -0.24, reason: "Negative component VaR" },
              { label: "Tech sector concentration increase", delta: +0.08, reason: "Factor risk (tech)" },
            ].map((row) => (
              <div key={row.label} className="flex items-start gap-3">
                <span className={cn("mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded text-[9px] font-bold",
                  row.delta > 0 ? "bg-neg/20 text-neg" : "bg-pos/20 text-pos")}>
                  {row.delta > 0 ? "▲" : "▼"}
                </span>
                <div className="flex-1">
                  <div className="text-xs text-muted">{row.label}</div>
                  <div className="text-2xs text-dim">{row.reason}</div>
                </div>
                <span className={cn("font-mono text-sm tabular-nums", row.delta > 0 ? "text-neg" : "text-pos")}>
                  {row.delta > 0 ? "+" : ""}{fmtNum(row.delta, 2)}M
                </span>
              </div>
            ))}
          </div>
          <div className="space-y-3">
            <div className="section-label text-[11px] text-muted">Methodology Parameters (versioned)</div>
            <div className="space-y-2 font-mono text-xs">
              {[
                ["Param version", RISK_PARAM_VERSION],
                ["EWMA λ", EWMA_LAMBDA.toString()],
                ["HS lookback", `${VAR_LOOKBACK_DAYS} days`],
                ["MC seed", MC_SEED],
                ["MC paths", `${(MC_PATHS/1000).toFixed(0)}K`],
                ["Confidence", "99% / 95%"],
                ["Horizon", "1D (scaling: √T)"],
                ["Covariance", "EWMA (Riskmetrics)"],
                ["Snapshot", SNAPSHOT_ID],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-line/40 pb-1.5">
                  <span className="text-dim">{k}</span>
                  <span className="text-accent">{v}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <div className="section-label text-[11px] text-muted">Audit & Reproducibility</div>
            <div className="rounded border border-accent/20 bg-accent/5 p-3">
              <div className="mb-2 font-mono text-xs text-accent">Immutable Run Record</div>
              <div className="space-y-1.5 font-mono text-xs">
                <div className="text-dim">All inputs, params, and outputs are</div>
                <div className="text-dim">hashed and stored in the AEGIS audit</div>
                <div className="text-dim">ledger. To reproduce this exact run:</div>
              </div>
              <div className="mt-3 rounded border border-line bg-base px-3 py-2 font-mono text-xs text-pos">
                aegis risk replay \<br/>
                &nbsp;&nbsp;--snapshot {SNAPSHOT_ID} \<br/>
                &nbsp;&nbsp;--params {RISK_PARAM_VERSION}
              </div>
            </div>
            <div className="rounded border border-line bg-elevated/30 p-3 text-xs text-dim">
              <span className="font-medium text-muted">ATHENA link: </span>
              Ask ATHENA "why did portfolio VaR increase today?" and it will cite this exact
              decomposition with methodology footnotes.
            </div>
            <div className="text-xs text-dim">
              DEMO DATA — representative risk snapshot. Live risk recalculates on every
              position change and EWMA covariance update.
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}
