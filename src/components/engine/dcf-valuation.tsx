"use client";

import { useMemo, useState } from "react";
import { Panel, PanelHeader, KpiCard, Th, Td, Chip } from "@/components/ui/kit";
import { fmtNum } from "@/lib/format";
import { cn } from "@/lib/cn";
import { dcf, dcfSensitivity, type DCFInput } from "@/lib/engine/dcf";

/* ── Slider with paired numeric readout ───────────────────────────────────── */

function SliderRow({
  label,
  unit,
  value,
  min,
  max,
  step,
  dp = 2,
  onChange,
}: {
  label: string;
  unit?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  dp?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <span className="kpi-label">{label}</span>
        <span className="font-mono text-xs tabular-nums text-ink">
          {fmtNum(value, dp)}
          {unit ? <span className="text-dim">{unit}</span> : null}
        </span>
      </div>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className="h-1 w-full cursor-pointer appearance-none rounded-full bg-line accent-[var(--accent)]"
      />
      <div className="flex justify-between font-mono text-2xs text-faint">
        <span>{fmtNum(min, dp)}</span>
        <span>{fmtNum(max, dp)}</span>
      </div>
    </div>
  );
}

/* ── Numeric input row ─────────────────────────────────────────────────────── */

function NumberRow({
  label,
  value,
  step,
  onChange,
}: {
  label: string;
  value: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <span className="kpi-label">{label}</span>
      <input
        type="number"
        value={value}
        step={step}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (!Number.isNaN(n)) onChange(n);
        }}
        aria-label={label}
        className="w-full rounded border border-line bg-base px-2 py-1 text-right font-mono text-xs tabular-nums text-ink outline-none focus:border-accent/60"
      />
    </div>
  );
}

/* ── Cash-flow bar chart: projected FCF (faint) vs PV of FCF (solid) ────────── */

function CashFlowChart({ projectedFcf, pvFcf }: { projectedFcf: number[]; pvFcf: number[] }) {
  const W = 760;
  const H = 220;
  const PAD_L = 8;
  const PAD_R = 8;
  const PAD_T = 12;
  const PAD_B = 22;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;
  const n = projectedFcf.length;

  const max = Math.max(...projectedFcf, ...pvFcf, 1e-9);
  const slot = innerW / Math.max(1, n);
  // two side-by-side bars per year inside each slot
  const barW = (slot * 0.72) / 2;
  const yAt = (v: number) => PAD_T + innerH - (v / max) * innerH;
  const baseY = PAD_T + innerH;

  // x-axis year labels: thin out when the horizon is long to avoid overlap
  const labelStride = n > 14 ? 2 : 1;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="block" role="img" aria-label="Projected vs discounted free cash flow by year">
      {/* baseline */}
      <line x1={PAD_L} y1={baseY} x2={W - PAD_R} y2={baseY} stroke="var(--line)" strokeWidth={1} />
      {projectedFcf.map((proj, i) => {
        const slotX = PAD_L + i * slot + slot * 0.14;
        const pvX = slotX + barW;
        const projH = baseY - yAt(proj);
        const pvH = baseY - yAt(pvFcf[i]);
        const showLabel = i === 0 || i === n - 1 || (i + 1) % labelStride === 0;
        return (
          <g key={i}>
            {/* projected (faint) */}
            <rect x={slotX} y={yAt(proj)} width={barW} height={Math.max(0.6, projH)} rx={0.6} fill="var(--accent)" opacity={0.22} />
            {/* present value (solid, discounted) */}
            <rect x={pvX} y={yAt(pvFcf[i])} width={barW} height={Math.max(0.6, pvH)} rx={0.6} fill="var(--accent)" opacity={0.9} />
            {showLabel ? (
              <text x={slotX + barW} y={H - 6} textAnchor="middle" className="fill-dim font-mono" fontSize={9}>
                Y{i + 1}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

/* ── main component ────────────────────────────────────────────────────────── */

export function DcfValuation() {
  const [fcf0, setFcf0] = useState(60);
  const [growthPct, setGrowthPct] = useState(12);
  const [years, setYears] = useState(10);
  const [terminalPct, setTerminalPct] = useState(2.5);
  const [discountPct, setDiscountPct] = useState(9);
  const [netDebt, setNetDebt] = useState(-40);
  const [shares, setShares] = useState(24.6);
  const [currentPrice, setCurrentPrice] = useState(125);

  // Engine base input (decimals). All $ values in billions consistently.
  const base = useMemo<DCFInput>(
    () => ({
      fcf0,
      growthRate: growthPct / 100,
      years,
      terminalGrowth: terminalPct / 100,
      discountRate: discountPct / 100,
      netDebt,
      shares,
      currentPrice,
    }),
    [fcf0, growthPct, years, terminalPct, discountPct, netDebt, shares, currentPrice],
  );

  const result = useMemo(() => dcf(base), [base]);

  // Sensitivity grid: discount rate (rows) × terminal growth (cols), as decimals.
  const discountRates = useMemo(
    () => [-2, -1, 0, 1, 2].map((d) => (discountPct + d) / 100),
    [discountPct],
  );
  const terminalGrowths = useMemo(
    () => [-1, -0.5, 0, 0.5, 1].map((d) => (terminalPct + d) / 100),
    [terminalPct],
  );
  const grid = useMemo(
    () => dcfSensitivity(base, discountRates, terminalGrowths),
    [base, discountRates, terminalGrowths],
  );

  const intrinsic = result.intrinsicPerShare;
  const upside = result.upsidePct;
  const terminalPctVal = result.terminalPctOfValue * 100;
  const terminalHeavy = terminalPctVal > 75;
  const impliedPrice = intrinsic; // intrinsic per share IS the model's implied current price

  // Verdict from upside thresholds.
  const verdict =
    upside == null
      ? null
      : upside > 15
        ? { tone: "pos" as const, label: "Undervalued" }
        : upside < -15
          ? { tone: "neg" as const, label: "Overvalued" }
          : { tone: "warn" as const, label: "Fairly valued" };

  const upsideTone = upside == null ? "default" : upside >= 0 ? "pos" : "neg";

  // Cell coloring: tint by upside vs current price (green above, red below).
  const cellStyle = (perShare: number | null) => {
    if (perShare == null || !currentPrice) return { color: "var(--dim)" };
    const up = perShare / currentPrice - 1;
    const t = Math.max(-1, Math.min(1, up / 0.5)); // saturate at ±50%
    const mag = Math.abs(t);
    if (t >= 0) {
      return {
        background: `rgba(52, 210, 127, ${(0.1 + 0.45 * mag).toFixed(3)})`,
        color: "var(--ink)",
      };
    }
    return {
      background: `rgba(255, 93, 99, ${(0.1 + 0.45 * mag).toFixed(3)})`,
      color: "var(--ink)",
    };
  };

  return (
    <Panel className="animate-rise">
      <PanelHeader
        title="DCF Valuation Engine"
        sub="Two-stage FCF model + Gordon terminal value · intrinsic value & sensitivity"
        right={
          <span className="flex items-center gap-1.5 rounded border border-pos/40 bg-pos/10 px-2 py-1 font-mono text-2xs uppercase tracking-wider text-pos">
            <span className="h-1.5 w-1.5 rounded-full bg-pos" />
            ENGINE · LIVE
          </span>
        }
      />

      <div className="grid grid-cols-1 gap-px bg-line lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        {/* ── Inputs column ── */}
        <div className="space-y-4 bg-base p-4">
          <NumberRow label="Base FCF ($B)" value={fcf0} step={1} onChange={setFcf0} />
          <SliderRow label="FCF Growth" unit="%" value={growthPct} min={0} max={30} step={0.5} dp={1} onChange={setGrowthPct} />
          <SliderRow label="Forecast Years" value={years} min={3} max={15} step={1} dp={0} onChange={(v) => setYears(Math.round(v))} />
          <SliderRow label="Terminal Growth" unit="%" value={terminalPct} min={0} max={5} step={0.1} dp={1} onChange={setTerminalPct} />
          <SliderRow label="Discount Rate (WACC)" unit="%" value={discountPct} min={4} max={20} step={0.1} dp={1} onChange={setDiscountPct} />
          <NumberRow label="Net Debt ($B, − = net cash)" value={netDebt} step={1} onChange={setNetDebt} />
          <NumberRow label="Shares (B)" value={shares} step={0.1} onChange={setShares} />
          <NumberRow label="Current Price ($)" value={currentPrice} step={1} onChange={setCurrentPrice} />

          <div className="font-mono text-2xs text-faint">
            All $ in billions · per-share = equity value ($B) / shares (B)
          </div>
        </div>

        {/* ── Results column ── */}
        <div className="space-y-5 bg-base p-4">
          {/* 1) Headline */}
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="kpi-label">Intrinsic Value / Share</div>
              <div className="mt-1 font-mono text-5xl leading-none tracking-tight tabular-nums text-ink">
                {intrinsic == null ? <span className="text-dim">—</span> : `$${fmtNum(intrinsic, 2)}`}
              </div>
              <div className="mt-2 font-mono text-2xs text-dim">
                vs current ${fmtNum(currentPrice, 2)}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {upside != null ? (
                <Chip tone={upsideTone}>
                  {`${upside >= 0 ? "+" : ""}${fmtNum(upside, 1)}% ${upside >= 0 ? "upside" : "downside"}`}
                </Chip>
              ) : null}
              {verdict ? <Chip tone={verdict.tone} dot>{verdict.label}</Chip> : null}
            </div>
          </div>

          {/* 2) KPI deck */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <KpiCard label="Enterprise Value ($B)" value={<span className="tabular-nums">{fmtNum(result.enterpriseValue, 1)}</span>} />
            <KpiCard label="Equity Value ($B)" value={<span className="tabular-nums">{fmtNum(result.equityValue, 1)}</span>} />
            <KpiCard label="PV of Explicit FCF ($B)" value={<span className="tabular-nums">{fmtNum(result.sumPvExplicit, 1)}</span>} tone="accent" />
            <KpiCard label="PV of Terminal Value ($B)" value={<span className="tabular-nums">{fmtNum(result.pvTerminalValue, 1)}</span>} tone="accent" />
            <KpiCard
              label="Terminal % of Value"
              value={<span className="tabular-nums">{`${fmtNum(terminalPctVal, 1)}%`}</span>}
              tone={terminalHeavy ? "warn" : undefined}
              sub={terminalHeavy ? <span className="text-warn">terminal-heavy</span> : undefined}
            />
            <KpiCard
              label="Implied Current Price"
              value={<span className="tabular-nums">{impliedPrice == null ? "—" : `$${fmtNum(impliedPrice, 2)}`}</span>}
            />
          </div>

          {/* 3) Cash-flow chart */}
          <div className="rounded border border-line bg-elevated/10 p-3">
            <div className="mb-1 flex items-center justify-between">
              <span className="section-label">Forecast FCF — nominal vs present value</span>
              <div className="flex items-center gap-3 font-mono text-2xs text-dim">
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2.5 rounded-[1px]" style={{ background: "var(--accent)", opacity: 0.22 }} /> Projected
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2.5 rounded-[1px]" style={{ background: "var(--accent)" }} /> Discounted (PV)
                </span>
              </div>
            </div>
            <CashFlowChart projectedFcf={result.projectedFcf} pvFcf={result.pvFcf} />
          </div>

          {/* 4) Sensitivity heat-grid */}
          <div className="rounded border border-line bg-elevated/10 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="section-label">Sensitivity — intrinsic / share</span>
              <span className="font-mono text-2xs text-dim">rows: WACC · cols: terminal growth · color: vs ${fmtNum(currentPrice, 0)}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse">
                <thead>
                  <tr>
                    <Th className="text-right">WACC ＼ g</Th>
                    {terminalGrowths.map((gt, j) => (
                      <Th key={j} right>{`${fmtNum(gt * 100, 1)}%`}</Th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {grid.map((row, i) => {
                    const isCenterRow = i === 2;
                    return (
                      <tr key={i}>
                        <Td right className="text-dim">{`${fmtNum(discountRates[i] * 100, 1)}%`}</Td>
                        {row.map((perShare, j) => {
                          const isCenter = isCenterRow && j === 2;
                          return (
                            <Td
                              key={j}
                              right
                              className={cn(isCenter && "outline outline-1 -outline-offset-1 outline-accent")}
                            >
                              <span
                                className="flex h-full items-center justify-end rounded-[2px] px-1.5 py-0.5"
                                style={cellStyle(perShare)}
                              >
                                {perShare == null ? "—" : `$${fmtNum(perShare, 0)}`}
                              </span>
                            </Td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-line px-4 py-2.5 text-2xs text-dim">
        Intrinsic value is highly sensitive to the discount rate and terminal growth — read the grid, not a single number. A
        terminal value &gt; ~75% of EV means most of the value rests on perpetuity assumptions.
      </div>
    </Panel>
  );
}
