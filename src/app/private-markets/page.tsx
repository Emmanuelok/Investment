import {
  PageHeader, Panel, PanelHeader, Chip, KpiCard, Stat,
  Th, Td, StatusDot,
} from "@/components/ui/kit";
import { ProgressBar, Sparkline } from "@/components/ui/viz";
import { Icon } from "@/components/icon-map";
import { Database } from "@/components/icons";
import {
  privateFunds, unifiedExposure, PRIVATE_KPIS,
  type PrivateFund, type FundType,
} from "@/lib/data/aegis-exec";
import { fmtNum, fmtPct, signClass } from "@/lib/format";
import { cn } from "@/lib/cn";

export const metadata = { title: "Private Markets & Alternatives — AEGIS" };

/* ── helpers ──────────────────────────────────────────────────────────────── */

const FUND_TYPE_TONE: Record<FundType, "pos" | "accent" | "info" | "warn" | "neg" | "default"> = {
  PE:     "pos",
  VC:     "accent",
  HEDGE:  "warn",
  INFRA:  "info",
  RE:     "warn",
  CREDIT: "default",
};

const FUND_TYPE_LABEL: Record<FundType, string> = {
  PE:     "Private Equity",
  VC:     "Venture Capital",
  HEDGE:  "Hedge Fund",
  INFRA:  "Infrastructure",
  RE:     "Real Estate",
  CREDIT: "Private Credit",
};

/* ── J-Curve SVG ─────────────────────────────────────────────────────────── */

function JCurveSparkline({ data, width = 96, height = 36 }: { data: number[]; width?: number; height?: number }) {
  const pad = 2;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const dx = (width - pad * 2) / (data.length - 1 || 1);
  const zero = max <= 0 ? height - pad : min >= 0 ? pad : pad + (height - pad * 2) * (max / span);

  const linePts = data.map((v, i) => {
    const x = pad + i * dx;
    const y = pad + (height - pad * 2) * (1 - (v - min) / span);
    return { x, y };
  });

  const pathD = linePts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  const areaPath =
    pathD +
    ` L${linePts[linePts.length - 1].x.toFixed(1)},${zero.toFixed(1)} L${linePts[0].x.toFixed(1)},${zero.toFixed(1)} Z`;

  const isPos = data[data.length - 1] >= 0;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      {/* Zero line */}
      <line x1={pad} y1={zero} x2={width - pad} y2={zero} stroke="var(--line)" strokeWidth={0.8} />
      {/* Fill area */}
      <path d={areaPath} fill={isPos ? "var(--pos)" : "var(--neg)"} opacity={0.12} />
      {/* Line */}
      <path d={pathD} fill="none" stroke={isPos ? "var(--pos)" : "var(--neg)"} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── Aggregate J-Curve (larger) ─────────────────────────────────────────── */

function AggJCurveViz({ funds }: { funds: PrivateFund[] }) {
  const W = 420;
  const H = 160;
  const PAD = { l: 48, r: 16, t: 12, b: 30 };
  const quarters = 16;
  const labels = ["Q1'22", "Q3'22", "Q1'23", "Q3'23", "Q1'24", "Q3'24", "Q1'25", "Q3'25"];

  // Aggregate across all funds
  const aggCurve: number[] = [];
  for (let q = 0; q < quarters; q++) {
    const total = funds.reduce((s, f) => s + (f.jCurve[q] ?? 0), 0);
    aggCurve.push(Math.round(total * 10) / 10);
  }

  const min = Math.min(...aggCurve);
  const max = Math.max(...aggCurve);
  const span = max - min || 1;
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  const zero = PAD.t + innerH * (max / span);

  const toX = (i: number) => PAD.l + (i / (quarters - 1)) * innerW;
  const toY = (v: number) => PAD.t + innerH * (1 - (v - min) / span);

  const pts = aggCurve.map((v, i) => ({ x: toX(i), y: toY(v) }));
  const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaD = pathD + ` L${pts[pts.length - 1].x.toFixed(1)},${zero.toFixed(1)} L${pts[0].x.toFixed(1)},${zero.toFixed(1)} Z`;

  const yTicks = [min, min / 2, 0, max / 2, max];

  return (
    <div className="px-4 py-3">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[420px] overflow-visible">
        {/* Grid */}
        {yTicks.map((t, i) => (
          <line
            key={i}
            x1={PAD.l}
            y1={toY(t)}
            x2={W - PAD.r}
            y2={toY(t)}
            stroke="var(--line)"
            strokeWidth={0.5}
            strokeDasharray="3,3"
          />
        ))}

        {/* Y-axis tick labels */}
        {yTicks.map((t, i) => (
          <text
            key={i}
            x={PAD.l - 5}
            y={toY(t) + 3}
            textAnchor="end"
            fontSize={8.5}
            fill="var(--dim)"
            fontFamily="monospace"
          >
            {t >= 0 ? `+$${Math.abs(t).toFixed(0)}M` : `-$${Math.abs(t).toFixed(0)}M`}
          </text>
        ))}

        {/* Quarter labels */}
        {labels.map((l, i) => (
          <text
            key={l}
            x={toX(i * 2)}
            y={H - PAD.b + 14}
            textAnchor="middle"
            fontSize={8.5}
            fill="var(--dim)"
            fontFamily="monospace"
          >
            {l}
          </text>
        ))}

        {/* Zero line */}
        <line x1={PAD.l} y1={zero} x2={W - PAD.r} y2={zero} stroke="var(--line-strong)" strokeWidth={1} />

        {/* Area fill — split above/below zero */}
        <path d={areaD} fill="var(--pos)" opacity={0.1} />

        {/* Negative portion shaded differently */}
        <defs>
          <linearGradient id="jcurve-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--pos)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--pos)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Curve line */}
        <path
          d={pathD}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Inflection annotation */}
        {(() => {
          const inflectIdx = aggCurve.findIndex((v, i) => i > 2 && v > (aggCurve[i - 1] ?? -Infinity));
          if (inflectIdx < 0) return null;
          return (
            <g>
              <circle cx={toX(inflectIdx)} cy={toY(aggCurve[inflectIdx])} r={3.5} fill="var(--warn)" />
              <text x={toX(inflectIdx) + 6} y={toY(aggCurve[inflectIdx]) - 4} fontSize={8} fill="var(--warn)" fontFamily="monospace">
                inflection
              </text>
            </g>
          );
        })()}

        {/* Current NAV endpoint */}
        <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r={4} fill="var(--pos)" />
        <text
          x={pts[pts.length - 1].x - 6}
          y={pts[pts.length - 1].y - 7}
          fontSize={8.5}
          fill="var(--pos)"
          fontFamily="monospace"
          textAnchor="end"
        >
          NAV +${aggCurve[aggCurve.length - 1].toFixed(0)}M
        </text>
      </svg>
      <div className="mt-1.5 text-xs text-dim">
        Aggregate J-curve across all 8 funds · quarterly cumulative net cash-flow ($M) · negative = capital drawn, positive = distributions + NAV
      </div>
    </div>
  );
}

/* ── page ─────────────────────────────────────────────────────────────────── */

export default function PrivateMarketsPage() {
  const funds = privateFunds();
  const exposure = unifiedExposure();

  // Aggregate stats
  const totalNav = funds.reduce((s, f) => s + f.nav, 0);
  const totalCommitment = funds.reduce((s, f) => s + f.commitment, 0);
  const totalCalled = funds.reduce((s, f) => s + f.called, 0);
  const totalDistributions = funds.reduce((s, f) => s + f.distributions, 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <PageHeader
        module={{ name: "AEGIS · Risk & Execution", tone: "accent" }}
        title="Private Markets & Alternatives"
        desc="PE · VC · Real Estate · Infrastructure · Private Credit — commitments, J-curve, IRR/MOIC/TVPI and unified book alongside public/crypto."
        right={
          <div className="flex items-center gap-2">
            <Chip tone="info">eFront / Preqin connector</Chip>
            <Chip tone="default">DEMO DATA</Chip>
          </div>
        }
      />

      {/* KPI deck */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {PRIVATE_KPIS.map((k) => (
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

      {/* Commitments / calls / distributions table */}
      <Panel>
        <PanelHeader
          title="Fund Commitments · Calls · Distributions"
          sub="eFront/Preqin data source · DEMO — connect eFront API for live cash-flow events"
          right={<Chip tone="accent">8 funds · 4 vintage years</Chip>}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse">
            <thead>
              <tr>
                <Th>Fund</Th>
                <Th>Manager</Th>
                <Th>Type</Th>
                <Th right>Vintage</Th>
                <Th right>Commitment</Th>
                <Th right>Called</Th>
                <Th right>Called %</Th>
                <Th right>Distributions</Th>
                <Th right>NAV</Th>
                <Th>Status</Th>
                <Th>J-Curve</Th>
              </tr>
            </thead>
            <tbody>
              {funds.map((f) => {
                const calledPct = f.called / f.commitment * 100;
                return (
                  <tr key={f.id} className="hover:bg-elevated/40">
                    <Td mono={false}>
                      <div className="font-medium text-ink text-xs">{f.name}</div>
                      <div className="font-mono text-2xs text-dim mt-0.5">{f.id}</div>
                    </Td>
                    <Td mono={false} className="text-dim text-xs">{f.manager}</Td>
                    <Td mono={false}>
                      <Chip tone={FUND_TYPE_TONE[f.type]} className="text-[10px]">
                        {f.type}
                      </Chip>
                    </Td>
                    <Td right className="text-dim">{f.vintage}</Td>
                    <Td right className="text-muted">${f.commitment}M</Td>
                    <Td right className="text-muted">${f.called}M</Td>
                    <Td right>
                      <div className="flex items-center justify-end gap-2">
                        <ProgressBar
                          value={calledPct}
                          max={100}
                          height={4}
                          color="var(--accent)"
                          className="w-14"
                        />
                        <span className="w-9 font-mono text-xs text-muted">{calledPct.toFixed(0)}%</span>
                      </div>
                    </Td>
                    <Td right className="text-pos">${f.distributions.toFixed(1)}M</Td>
                    <Td right className="text-ink font-medium">${f.nav.toFixed(1)}M</Td>
                    <Td mono={false}>
                      <Chip tone={f.status === "ACTIVE" ? "pos" : f.status === "HARVESTING" ? "warn" : "default"}
                        className="text-[10px]">
                        {f.status}
                      </Chip>
                    </Td>
                    <Td mono={false}>
                      <JCurveSparkline data={f.jCurve} width={88} height={32} />
                    </Td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-line-strong">
                <Td mono={false} className="font-medium text-ink" colSpan={4}>PORTFOLIO TOTAL</Td>
                <Td right className="font-medium text-ink">${totalCommitment}M</Td>
                <Td right className="font-medium text-ink">${totalCalled}M</Td>
                <Td right className="font-medium text-muted">
                  {(totalCalled / totalCommitment * 100).toFixed(0)}%
                </Td>
                <Td right className="font-medium text-pos">${totalDistributions.toFixed(1)}M</Td>
                <Td right className="font-medium text-accent">${totalNav.toFixed(1)}M</Td>
                <Td mono={false} colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      </Panel>

      {/* J-Curve aggregate + Performance metrics */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* J-Curve */}
        <Panel className="lg:col-span-3">
          <PanelHeader
            title="Aggregate J-Curve — Cumulative Cash Flow"
            sub="Capital calls (negative) → inflection → distributions + NAV (positive)"
            right={<Chip tone="pos">In value-creation phase</Chip>}
          />
          <AggJCurveViz funds={funds} />
        </Panel>

        {/* Performance metrics grid */}
        <Panel className="lg:col-span-2">
          <PanelHeader
            title="Performance Metrics"
            right={<Chip tone="accent">Weighted avg · DEMO</Chip>}
          />
          <div className="divide-y divide-line">
            {funds.map((f) => (
              <div key={f.id} className="px-4 py-3">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Chip tone={FUND_TYPE_TONE[f.type]} className="text-[10px]">{f.type}</Chip>
                    <span className="font-mono text-xs text-muted">{f.manager}</span>
                  </div>
                  <span className="font-mono text-xs text-dim">{f.vintage}</span>
                </div>
                <div className="grid grid-cols-5 gap-x-3 gap-y-0.5">
                  <div className="text-center">
                    <div className="kpi-label text-[9px]">IRR</div>
                    <div className={cn("font-mono text-xs font-medium", signClass(f.irr))}>
                      {f.irr > 0 ? "+" : ""}{f.irr}%
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="kpi-label text-[9px]">MOIC</div>
                    <div className="font-mono text-xs font-medium text-ink">{f.moic.toFixed(2)}×</div>
                  </div>
                  <div className="text-center">
                    <div className="kpi-label text-[9px]">TVPI</div>
                    <div className="font-mono text-xs font-medium text-ink">{f.tvpi.toFixed(2)}×</div>
                  </div>
                  <div className="text-center">
                    <div className="kpi-label text-[9px]">DPI</div>
                    <div className={cn("font-mono text-xs font-medium", f.dpi >= 1 ? "text-pos" : "text-muted")}>
                      {f.dpi.toFixed(2)}×
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="kpi-label text-[9px]">PME</div>
                    <div className={cn("font-mono text-xs font-medium", f.pme >= 1 ? "text-pos" : "text-warn")}>
                      {f.pme.toFixed(2)}×
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-line px-4 py-2.5 text-xs text-dim">
            IRR = Internal Rate of Return · MOIC = Multiple on Invested Capital ·
            TVPI = Total Value / Paid-In · DPI = Distributions / Paid-In ·
            PME = Public Market Equivalent (KS-PME vs. S&amp;P 500)
          </div>
        </Panel>
      </div>

      {/* NAV tracking + unified exposure */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* NAV tracking by fund */}
        <Panel>
          <PanelHeader
            title="NAV Tracking — Current Fair Value"
            right={<Chip tone="default">Quarterly marks · Q1 2026</Chip>}
          />
          <div className="space-y-3 px-4 py-4">
            {funds.map((f) => {
              const navPct = (f.nav / totalNav) * 100;
              const moicColor = f.moic >= 1.5 ? "var(--pos)" : f.moic >= 1.1 ? "var(--accent)" : "var(--warn)";
              return (
                <div key={f.id} className="flex items-center gap-3">
                  <div className="w-36 shrink-0">
                    <div className="text-xs font-medium text-muted truncate">{f.name}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Chip tone={FUND_TYPE_TONE[f.type]} className="text-[9px]">{f.type}</Chip>
                    </div>
                  </div>
                  <ProgressBar
                    value={navPct}
                    max={100}
                    height={6}
                    color={moicColor}
                    className="flex-1"
                  />
                  <span className="w-16 shrink-0 text-right font-mono text-xs text-muted">
                    ${f.nav.toFixed(1)}M
                  </span>
                  <span className={cn("w-14 shrink-0 text-right font-mono text-xs", f.moic >= 1.5 ? "text-pos" : "text-accent")}>
                    {f.moic.toFixed(2)}×
                  </span>
                </div>
              );
            })}
          </div>
          <div className="border-t border-line px-4 py-2.5 text-xs text-dim">
            Total unrealised NAV: <span className="font-mono text-ink font-medium">${totalNav.toFixed(1)}M</span>
            {" "}· Fair value sourced from GP quarterly reports
          </div>
        </Panel>

        {/* Unified exposure panel */}
        <Panel>
          <PanelHeader
            title="Unified Exposure — Full Book"
            sub="Public equity + fixed income + private markets + crypto in one view"
            right={<Chip tone="accent">One book · all assets</Chip>}
          />
          <div className="space-y-2.5 px-4 py-4">
            {exposure.map((e, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-32 shrink-0">
                  <div className="text-xs font-medium text-muted truncate">{e.bucket}</div>
                  <div className="text-[10px] text-dim truncate">{e.subtype}</div>
                </div>
                <ProgressBar
                  value={e.pct}
                  max={35}
                  height={6}
                  color={e.color}
                  className="flex-1"
                />
                <span className="w-10 shrink-0 text-right font-mono text-xs text-muted">
                  {e.pct.toFixed(1)}%
                </span>
                <span className="w-14 shrink-0 text-right font-mono text-xs text-dim">
                  ${e.nav.toFixed(0)}M
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-line px-4 py-2.5">
            <div className="grid grid-cols-3 gap-3">
              <Stat
                label="Total AUM"
                value={`$${exposure.reduce((s, e) => s + e.nav, 0).toFixed(0)}M`}
                tone="accent"
              />
              <Stat
                label="Private Illiquid"
                value={`${(
                  exposure
                    .filter((e) => ["Private Equity", "Real Assets", "Credit"].includes(e.bucket))
                    .reduce((s, e) => s + e.pct, 0)
                ).toFixed(1)}%`}
                tone="warn"
              />
              <Stat
                label="Liquid / Public"
                value={`${(
                  exposure
                    .filter((e) => ["Public Equity", "Fixed Income"].includes(e.bucket))
                    .reduce((s, e) => s + e.pct, 0)
                ).toFixed(1)}%`}
                tone="pos"
              />
            </div>
          </div>
          <div className="flex items-start gap-2 border-t border-line px-4 py-2.5 text-xs text-dim">
            <Icon name="database" width={13} height={13} className="mt-0.5 shrink-0 text-faint" />
            <span>
              Private holdings marked at GP quarterly NAV. Public positions marked real-time via market feed.
              Unified risk runs nightly via AEGIS factor model.
            </span>
          </div>
        </Panel>
      </div>
    </div>
  );
}
