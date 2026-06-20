"use client";

import { useState, type ReactNode } from "react";
import {
  kellyFraction,
  expectancy,
  riskOfRuin,
  positionSize,
  suggestedRiskPct,
} from "@/lib/engine/sizing";
import { Panel, PanelHeader, Chip, Stat, KpiCard, StatusDot } from "@/components/ui/kit";
import { ProgressBar } from "@/components/ui/viz";
import { fmtNum, fmtUsd } from "@/lib/format";
import { cn } from "@/lib/cn";

/* ── small field primitives (no shared input kit) ─────────────────────────── */

function NumberField({
  label,
  value,
  onChange,
  step = 1,
  min,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step?: number;
  min?: number;
  suffix?: string;
}) {
  return (
    <label className="block">
      <span className="kpi-label">{label}</span>
      <div className="mt-1 flex items-center gap-2 rounded border border-line bg-elevated/40 px-2.5 py-1.5 focus-within:border-line-strong">
        <input
          type="number"
          value={Number.isFinite(value) ? value : ""}
          step={step}
          min={min}
          onChange={(e) => onChange(e.target.valueAsNumber)}
          className="w-full bg-transparent font-mono text-sm tabular-nums text-ink outline-none"
        />
        {suffix ? <span className="shrink-0 font-mono text-2xs text-dim">{suffix}</span> : null}
      </div>
    </label>
  );
}

function SliderField({
  label,
  value,
  onChange,
  min,
  max,
  step,
  display,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  step: number;
  display: ReactNode;
}) {
  return (
    <label className="block">
      <div className="flex items-center justify-between">
        <span className="kpi-label">{label}</span>
        <span className="font-mono text-xs tabular-nums text-muted">{display}</span>
      </div>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(e.target.valueAsNumber)}
        className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-line accent-[var(--accent)]"
      />
    </label>
  );
}

/* ── component ────────────────────────────────────────────────────────────── */

export function PositionSizer() {
  // Trade sizer inputs
  const [equity, setEquity] = useState(100000);
  const [riskPct, setRiskPct] = useState(1);
  const [entry, setEntry] = useState(100);
  const [stop, setStop] = useState(95);

  // Edge / Kelly inputs
  const [winProb, setWinProb] = useState(55);
  const [payoff, setPayoff] = useState(1.5);

  /* engine — trade sizer */
  const sizing = positionSize({ equity, riskPct, entry, stop });
  const isLong = entry >= stop;

  /* engine — edge / kelly */
  const p = winProb / 100;
  const kelly = kellyFraction(p, payoff); // fraction (e.g. 0.13)
  const kellyPct = kelly * 100;
  const halfKelly = suggestedRiskPct(p, payoff, 0.5); // % clamped 0..5
  const edge = expectancy(p, payoff, 1); // avgWin = b R, avgLoss = 1 R
  const ror = riskOfRuin(p, 20); // % for 20-unit account

  const noEdge = kelly <= 0;
  const negExpectancy = edge.rMultiple <= 0;
  const rorTone: "pos" | "warn" | "neg" = ror >= 25 ? "neg" : ror >= 5 ? "warn" : "pos";

  const applyHalfKelly = () => {
    // clamp into the slider's domain so the control stays consistent
    const next = Math.max(0.25, Math.min(5, halfKelly));
    setRiskPct(Number(next.toFixed(2)));
  };

  return (
    <Panel className="animate-rise">
      <PanelHeader
        title="Position Sizing & Money Management"
        sub="Stop-based sizing, Kelly edge, expectancy & risk-of-ruin · self-contained"
        right={
          <div className="flex items-center gap-1.5">
            <StatusDot tone="pos" />
            <span className="font-mono text-xs text-pos">ENGINE · LIVE</span>
          </div>
        }
      />

      <div className="grid gap-0 lg:grid-cols-2">
        {/* ── A) TRADE SIZER ──────────────────────────────────────────────── */}
        <section className="border-b border-line p-4 lg:border-b-0 lg:border-r">
          <div className="mb-3 flex items-center justify-between">
            <span className="section-label">Trade Sizer</span>
            <Chip tone={isLong ? "pos" : "neg"} className="text-[10px]">
              {isLong ? "LONG" : "SHORT"}
            </Chip>
          </div>

          {/* inputs */}
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Equity" value={equity} onChange={setEquity} step={1000} min={0} suffix="USD" />
            <div className="col-span-2 sm:col-span-1">
              <SliderField
                label="Risk per Trade"
                value={riskPct}
                onChange={setRiskPct}
                min={0.25}
                max={5}
                step={0.05}
                display={`${fmtNum(riskPct)}%`}
              />
            </div>
            <NumberField label="Entry" value={entry} onChange={setEntry} step={0.5} min={0} suffix="USD" />
            <NumberField label="Stop" value={stop} onChange={setStop} step={0.5} min={0} suffix="USD" />
          </div>

          {/* headline: shares */}
          <div className="mt-4">
            <KpiCard
              label="Shares"
              value={sizing.riskPerShare > 0 ? fmtNum(sizing.shares, 0) : "—"}
              sub={
                sizing.riskPerShare > 0
                  ? `${isLong ? "Buy" : "Sell"} at ${fmtUsd(entry)} · stop ${fmtUsd(stop)}`
                  : "Entry and stop must differ"
              }
              tone="accent"
            />
          </div>

          {/* stats grid */}
          <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3">
            <Stat label="Risk $" value={fmtUsd(sizing.riskAmount)} tone="neg" />
            <Stat label="Risk / Share" value={fmtUsd(sizing.riskPerShare)} tone="muted" />
            <Stat label="Position Value" value={fmtUsd(sizing.positionValue)} />
            <Stat label="2R Target" value={fmtUsd(sizing.rTarget2)} tone="pos" />
            <Stat label="3R Target" value={fmtUsd(sizing.rTarget3)} tone="pos" />
          </div>

          {/* position % of equity */}
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <span className="kpi-label">Position % of Equity</span>
              <span className="font-mono text-xs tabular-nums text-muted">{fmtNum(sizing.positionPct)}%</span>
            </div>
            <ProgressBar
              value={sizing.positionPct}
              max={100}
              height={6}
              className="mt-2"
              color={sizing.positionPct > 100 ? "var(--warn)" : "var(--accent)"}
              showGlow
            />
          </div>
        </section>

        {/* ── B) EDGE / KELLY ─────────────────────────────────────────────── */}
        <section className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="section-label">Edge / Kelly</span>
            <button
              type="button"
              onClick={applyHalfKelly}
              disabled={noEdge}
              className="btn px-2.5 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-40"
              title={noEdge ? "No edge — nothing to apply" : "Set sizer risk to half-Kelly"}
            >
              Apply ½-Kelly to sizer
            </button>
          </div>

          {/* inputs */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SliderField
              label="Win Probability"
              value={winProb}
              onChange={setWinProb}
              min={5}
              max={95}
              step={1}
              display={`${fmtNum(winProb, 0)}%`}
            />
            <SliderField
              label="Payoff Ratio (b)"
              value={payoff}
              onChange={setPayoff}
              min={0.25}
              max={5}
              step={0.05}
              display={`${fmtNum(payoff)}×`}
            />
          </div>

          {/* kelly headline */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <KpiCard
              label="Kelly Fraction"
              value={`${fmtNum(kellyPct)}%`}
              sub={noEdge ? "No edge — don't trade" : "Full-Kelly bet size"}
              tone={noEdge ? "neg" : "accent"}
            />
            <KpiCard
              label="½-Kelly (suggested)"
              value={`${fmtNum(halfKelly)}%`}
              sub="Half-Kelly, clamped ≤ 5%"
              tone={halfKelly > 0 ? "pos" : "neg"}
            />
          </div>

          {/* stats grid */}
          <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3">
            <Stat
              label="Expectancy (R / trade)"
              value={`${edge.rMultiple >= 0 ? "+" : ""}${fmtNum(edge.rMultiple)}R`}
              tone={negExpectancy ? "neg" : "pos"}
            />
            <Stat label="Risk of Ruin (20u)" value={`${fmtNum(ror)}%`} tone={rorTone} />
          </div>

          {/* negative-expectancy callout */}
          {negExpectancy ? (
            <div className="mt-4 rounded border border-neg/30 bg-neg/10 px-3 py-2 text-xs text-neg">
              <span className="font-medium">Negative expectancy</span> — no position size is safe.
            </div>
          ) : null}
        </section>
      </div>

      {/* footer */}
      <div className="border-t border-line px-4 py-2.5 text-xs text-dim">
        Kelly maximizes long-run growth but is volatile; most desks use ¼–½ Kelly. Risk-of-ruin assumes
        fixed-fractional bets and the stated edge.
      </div>
    </Panel>
  );
}
