"use client";

import { useMemo, useState } from "react";
import { Panel, PanelHeader, Stat, KpiCard, Th, Td } from "@/components/ui/kit";
import { fmtNum } from "@/lib/format";
import { cn } from "@/lib/cn";
import {
  analyzeStrategy,
  presetLegs,
  PRESET_LABELS,
  type Leg,
  type OptType,
  type Side,
  type PresetId,
} from "@/lib/engine/options-strategy";

const PRESET_ORDER: PresetId[] = [
  "longCall",
  "longPut",
  "shortPut",
  "bullCallSpread",
  "bearPutSpread",
  "longStraddle",
  "longStrangle",
  "ironCondor",
  "callButterfly",
];

const MAX_LEGS = 6;

/* ── Slider with paired numeric readout (matches OptionsPricer) ────────────── */

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
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="kpi-label">{label}</span>
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (!Number.isNaN(n)) onChange(clamp(n));
            }}
            className="w-20 rounded border border-line bg-elevated/40 px-1.5 py-0.5 text-right font-mono text-xs tabular-nums text-ink outline-none focus:border-accent/60"
          />
          {unit ? <span className="w-3 font-mono text-2xs text-dim">{unit}</span> : null}
        </div>
      </div>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className="h-1 w-full cursor-pointer appearance-none rounded-full bg-line accent-accent"
      />
      <div className="flex justify-between font-mono text-2xs text-faint">
        <span>{fmtNum(min, dp)}</span>
        <span>{fmtNum(max, dp)}</span>
      </div>
    </div>
  );
}

/* ── Combined payoff / value SVG diagram ───────────────────────────────────── */

type Curve = { S: number; payoff: number; value: number }[];

function PayoffDiagram({
  curve,
  spot,
  breakevens,
}: {
  curve: Curve;
  spot: number;
  breakevens: number[];
}) {
  const W = 720;
  const H = 280;
  const PAD_L = 8;
  const PAD_R = 8;
  const PAD_T = 14;
  const PAD_B = 24;

  const sLo = curve[0].S;
  const sHi = curve[curve.length - 1].S;

  const { yMin, yMax } = useMemo(() => {
    const ys = [0];
    for (const p of curve) {
      ys.push(p.payoff, p.value);
    }
    const loY = Math.min(...ys);
    const hiY = Math.max(...ys);
    const span = hiY - loY || 1;
    return { yMin: loY - span * 0.08, yMax: hiY + span * 0.08 };
  }, [curve]);

  const xOf = (s: number) => PAD_L + ((s - sLo) / (sHi - sLo || 1)) * (W - PAD_L - PAD_R);
  const yOf = (v: number) => PAD_T + (1 - (v - yMin) / (yMax - yMin || 1)) * (H - PAD_T - PAD_B);

  const zeroY = yOf(0);
  const spotClamped = Math.min(sHi, Math.max(sLo, spot));
  const spotX = xOf(spotClamped);

  // Payoff polyline path
  const payoffPath = curve
    .map((p, i) => `${i === 0 ? "M" : "L"}${xOf(p.S).toFixed(2)},${yOf(p.payoff).toFixed(2)}`)
    .join(" ");

  // Current theoretical value (dashed accent) path
  const valuePath = curve
    .map((p, i) => `${i === 0 ? "M" : "L"}${xOf(p.S).toFixed(2)},${yOf(p.value).toFixed(2)}`)
    .join(" ");

  // Two-tone fill between payoff and the zero line. We build segments split at
  // sign changes so each polygon is purely above (green) or below (red) zero.
  type Pt = { x: number; y: number; payoff: number };
  const pts: Pt[] = curve.map((p) => ({ x: xOf(p.S), y: yOf(p.payoff), payoff: p.payoff }));

  const posAreas: string[] = [];
  const negAreas: string[] = [];
  {
    let seg: Pt[] = [];
    let segSign = 0; // +1 above zero, -1 below
    const flush = () => {
      if (seg.length < 2) {
        seg = [];
        return;
      }
      const d =
        `M${seg[0].x.toFixed(2)},${zeroY.toFixed(2)} ` +
        seg.map((p) => `L${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ") +
        ` L${seg[seg.length - 1].x.toFixed(2)},${zeroY.toFixed(2)} Z`;
      if (segSign >= 0) posAreas.push(d);
      else negAreas.push(d);
      seg = [];
    };
    for (let i = 0; i < pts.length; i++) {
      const cur = pts[i];
      const curSign = cur.payoff >= 0 ? 1 : -1;
      if (i === 0) {
        seg = [cur];
        segSign = curSign;
        continue;
      }
      const prev = pts[i - 1];
      const prevSign = prev.payoff >= 0 ? 1 : -1;
      if (curSign !== prevSign) {
        // interpolate the zero crossing on the payoff line
        const denom = prev.payoff - cur.payoff || 1e-9;
        const f = prev.payoff / denom;
        const xc = prev.x + (cur.x - prev.x) * f;
        const cross: Pt = { x: xc, y: zeroY, payoff: 0 };
        seg.push(cross);
        flush();
        seg = [cross, cur];
        segSign = curSign;
      } else {
        seg.push(cur);
      }
    }
    flush();
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height={H}
      preserveAspectRatio="none"
      className="overflow-visible"
    >
      {/* two-tone profit / loss fills */}
      {posAreas.map((d, i) => (
        <path key={`pos-${i}`} d={d} fill="var(--pos)" opacity={0.14} />
      ))}
      {negAreas.map((d, i) => (
        <path key={`neg-${i}`} d={d} fill="var(--neg)" opacity={0.14} />
      ))}

      {/* zero baseline (dim) */}
      <line x1={PAD_L} y1={zeroY} x2={W - PAD_R} y2={zeroY} stroke="var(--line)" strokeWidth={1} />

      {/* current-spot vertical marker */}
      <line
        x1={spotX}
        y1={PAD_T}
        x2={spotX}
        y2={H - PAD_B}
        stroke="var(--accent)"
        strokeWidth={1}
        strokeDasharray="3 2"
        opacity={0.55}
      />

      {/* current theoretical value (dashed accent overlay) */}
      <path
        d={valuePath}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={1.5}
        strokeDasharray="5 3"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.9}
      />

      {/* expiry payoff line — drawn green above 0, red below 0 */}
      {(() => {
        // split payoff polyline into pos/neg colored sub-paths
        const segs: { sign: number; d: string }[] = [];
        let d = "";
        let segSign = 0;
        let started = false;
        for (let i = 0; i < pts.length; i++) {
          const cur = pts[i];
          const curSign = cur.payoff >= 0 ? 1 : -1;
          if (!started) {
            d = `M${cur.x.toFixed(2)},${cur.y.toFixed(2)}`;
            segSign = curSign;
            started = true;
            continue;
          }
          const prev = pts[i - 1];
          const prevSign = prev.payoff >= 0 ? 1 : -1;
          if (curSign !== prevSign) {
            const denom = prev.payoff - cur.payoff || 1e-9;
            const f = prev.payoff / denom;
            const xc = prev.x + (cur.x - prev.x) * f;
            d += ` L${xc.toFixed(2)},${zeroY.toFixed(2)}`;
            segs.push({ sign: segSign, d });
            d = `M${xc.toFixed(2)},${zeroY.toFixed(2)} L${cur.x.toFixed(2)},${cur.y.toFixed(2)}`;
            segSign = curSign;
          } else {
            d += ` L${cur.x.toFixed(2)},${cur.y.toFixed(2)}`;
          }
        }
        if (d) segs.push({ sign: segSign, d });
        return segs.map((s, i) => (
          <path
            key={`pl-${i}`}
            d={s.d}
            fill="none"
            stroke={s.sign >= 0 ? "var(--pos)" : "var(--neg)"}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ));
      })()}

      {/* break-even markers */}
      {breakevens.map((be, i) => {
        const x = xOf(be);
        return (
          <g key={`be-${i}`}>
            <circle cx={x} cy={zeroY} r={3.2} fill="var(--warn)" stroke="var(--base)" strokeWidth={1} />
            <text
              x={x}
              y={zeroY - 7}
              textAnchor="middle"
              className="fill-[var(--warn)] font-mono"
              fontSize={9}
            >
              {fmtNum(be, 2)}
            </text>
          </g>
        );
      })}

      {/* x-axis labels */}
      <text x={PAD_L} y={H - 7} className="fill-[var(--faint)] font-mono" fontSize={9}>
        {fmtNum(sLo, 0)}
      </text>
      <text x={spotX} y={H - 7} textAnchor="middle" className="fill-[var(--accent)] font-mono" fontSize={9}>
        S {fmtNum(spot, 0)}
      </text>
      <text x={W - PAD_R} y={H - 7} textAnchor="end" className="fill-[var(--faint)] font-mono" fontSize={9}>
        {fmtNum(sHi, 0)}
      </text>
    </svg>
  );
}

/* ── Segmented two-option toggle ───────────────────────────────────────────── */

function MiniToggle<T extends string>({
  value,
  options,
  onChange,
  toneFor,
}: {
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
  toneFor?: (v: T) => "pos" | "neg" | "accent" | null;
}) {
  return (
    <div className="inline-flex rounded border border-line bg-elevated/30 p-0.5">
      {options.map((opt) => {
        const active = opt === value;
        const tone = toneFor?.(opt) ?? null;
        const activeClass =
          tone === "pos"
            ? "bg-pos/20 text-pos"
            : tone === "neg"
              ? "bg-neg/20 text-neg"
              : "bg-accent text-base";
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={cn(
              "rounded px-2 py-0.5 font-mono text-2xs uppercase tracking-wider transition-colors",
              active ? activeClass : "text-dim hover:text-ink",
            )}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

/* ── Main builder ──────────────────────────────────────────────────────────── */

export function OptionsStrategy() {
  const [spot, setSpot] = useState(100);
  const [volPct, setVolPct] = useState(25);
  const [ratePct, setRatePct] = useState(4);
  const [days, setDays] = useState(60);
  const [legs, setLegs] = useState<Leg[]>(() => presetLegs("bullCallSpread", 100));
  const [activePreset, setActivePreset] = useState<PresetId | null>("bullCallSpread");

  const vol = volPct / 100;
  const rate = ratePct / 100;

  const analysis = useMemo(
    () => analyzeStrategy({ spot, vol, rate, days, legs }),
    [spot, vol, rate, days, legs],
  );

  const applyPreset = (id: PresetId) => {
    setLegs(presetLegs(id, Math.round(spot)));
    setActivePreset(id);
  };

  const updateLeg = (idx: number, patch: Partial<Leg>) => {
    setLegs((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
    setActivePreset(null);
  };

  const removeLeg = (idx: number) => {
    setLegs((prev) => prev.filter((_, i) => i !== idx));
    setActivePreset(null);
  };

  const addLeg = () => {
    setLegs((prev) =>
      prev.length >= MAX_LEGS
        ? prev
        : [...prev, { type: "call", side: "long", strike: Math.round(spot), qty: 1 }],
    );
    setActivePreset(null);
  };

  const { netDebit, maxProfit, maxLoss, profitUnlimited, lossUnlimited, breakevens, netGreeks } =
    analysis;

  const debitTone = netDebit > 0 ? "neg" : netDebit < 0 ? "pos" : undefined;
  const debitLabel =
    netDebit > 0
      ? `$${fmtNum(netDebit, 2)} debit`
      : netDebit < 0
        ? `$${fmtNum(Math.abs(netDebit), 2)} credit`
        : "$0.00 flat";

  const breakevenLabel =
    breakevens.length === 0 ? "—" : breakevens.map((b) => fmtNum(b, 2)).join("  ·  ");

  return (
    <Panel className="animate-rise">
      <PanelHeader
        title="Options Strategy Builder"
        sub="Multi-leg payoff & Greeks · Black-Scholes, no market feed needed"
        right={
          <span className="flex items-center gap-1.5 rounded border border-pos/40 bg-pos/10 px-2 py-1 font-mono text-2xs uppercase tracking-wider text-pos">
            <span className="h-1.5 w-1.5 rounded-full bg-pos" />
            ENGINE · LIVE
          </span>
        }
      />

      {/* Preset selector */}
      <div className="flex flex-wrap gap-1.5 border-b border-line px-4 py-3">
        {PRESET_ORDER.map((id) => {
          const active = activePreset === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => applyPreset(id)}
              className={cn(
                "rounded border px-2.5 py-1 font-mono text-2xs uppercase tracking-wider transition-colors",
                active
                  ? "border-accent/60 bg-accent/15 text-accent"
                  : "border-line bg-elevated/20 text-dim hover:border-accent/40 hover:text-ink",
              )}
            >
              {PRESET_LABELS[id]}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-px bg-line lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        {/* ── Inputs + leg editor ── */}
        <div className="space-y-4 bg-base p-4">
          <SliderRow label="Spot" value={spot} min={1} max={Math.max(300, spot * 2)} step={0.5} onChange={setSpot} />
          <SliderRow label="Volatility" unit="%" value={volPct} min={1} max={200} step={0.5} onChange={setVolPct} />
          <SliderRow label="Risk-Free Rate" unit="%" value={ratePct} min={0} max={15} step={0.05} onChange={setRatePct} />
          <SliderRow label="Days to Expiry" unit="d" value={days} min={1} max={730} step={1} dp={0} onChange={setDays} />

          {/* Leg editor */}
          <div className="rounded border border-line bg-elevated/10 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="section-label">Legs</span>
              <button
                type="button"
                onClick={addLeg}
                disabled={legs.length >= MAX_LEGS}
                className={cn(
                  "rounded border px-2 py-0.5 font-mono text-2xs uppercase tracking-wider transition-colors",
                  legs.length >= MAX_LEGS
                    ? "cursor-not-allowed border-line text-faint"
                    : "border-accent/40 text-accent hover:bg-accent/10",
                )}
              >
                + Add leg
              </button>
            </div>
            <div className="space-y-2">
              {legs.map((leg, idx) => (
                <div
                  key={idx}
                  className="flex flex-wrap items-center gap-2 rounded border border-line/60 bg-base px-2 py-1.5"
                >
                  <MiniToggle<Side>
                    value={leg.side}
                    options={["long", "short"] as const}
                    onChange={(v) => updateLeg(idx, { side: v })}
                    toneFor={(v) => (v === "long" ? "pos" : "neg")}
                  />
                  <MiniToggle<OptType>
                    value={leg.type}
                    options={["call", "put"] as const}
                    onChange={(v) => updateLeg(idx, { type: v })}
                  />
                  <label className="flex items-center gap-1">
                    <span className="font-mono text-2xs text-dim">K</span>
                    <input
                      type="number"
                      value={leg.strike}
                      min={1}
                      step={1}
                      onChange={(e) => {
                        const n = Number(e.target.value);
                        if (!Number.isNaN(n)) updateLeg(idx, { strike: n });
                      }}
                      className="w-16 rounded border border-line bg-elevated/40 px-1.5 py-0.5 text-right font-mono text-xs tabular-nums text-ink outline-none focus:border-accent/60"
                    />
                  </label>
                  <label className="flex items-center gap-1">
                    <span className="font-mono text-2xs text-dim">×</span>
                    <input
                      type="number"
                      value={leg.qty}
                      min={1}
                      step={1}
                      onChange={(e) => {
                        const n = Number(e.target.value);
                        if (!Number.isNaN(n)) updateLeg(idx, { qty: Math.max(1, Math.round(n)) });
                      }}
                      className="w-12 rounded border border-line bg-elevated/40 px-1.5 py-0.5 text-right font-mono text-xs tabular-nums text-ink outline-none focus:border-accent/60"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => removeLeg(idx)}
                    aria-label="Remove leg"
                    className="ml-auto rounded px-1.5 py-0.5 font-mono text-sm leading-none text-dim transition-colors hover:bg-neg/10 hover:text-neg"
                  >
                    ×
                  </button>
                </div>
              ))}
              {legs.length === 0 ? (
                <div className="rounded border border-dashed border-line px-2 py-3 text-center font-mono text-2xs text-faint">
                  No legs — add one or pick a preset.
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* ── Results ── */}
        <div className="space-y-4 bg-base p-4">
          {/* Payoff diagram hero */}
          <div className="rounded border border-line bg-elevated/10 p-3">
            <div className="mb-1 flex items-center justify-between">
              <span className="section-label">Payoff Diagram</span>
              <div className="flex flex-wrap items-center gap-3 font-mono text-2xs text-dim">
                <span className="flex items-center gap-1">
                  <span className="inline-block h-0.5 w-4 rounded" style={{ background: "var(--pos)" }} /> Profit
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-0.5 w-4 rounded" style={{ background: "var(--neg)" }} /> Loss
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-0 w-4 border-t border-dashed" style={{ borderColor: "var(--accent)" }} /> Value
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full" style={{ background: "var(--warn)" }} /> Break-even
                </span>
              </div>
            </div>
            {legs.length === 0 ? (
              <div className="flex h-[280px] items-center justify-center font-mono text-xs text-faint">
                Add a leg to see the payoff.
              </div>
            ) : (
              <PayoffDiagram curve={analysis.curve} spot={spot} breakevens={breakevens} />
            )}
          </div>

          {/* Metrics deck */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard label="NET DEBIT / CREDIT" value={debitLabel} tone={debitTone} />
            <KpiCard
              label="MAX PROFIT"
              value={profitUnlimited ? "Unlimited" : `$${fmtNum(maxProfit, 2)}`}
              tone="pos"
            />
            <KpiCard
              label="MAX LOSS"
              value={lossUnlimited ? "Unlimited" : `-$${fmtNum(Math.abs(maxLoss), 2)}`}
              tone="neg"
            />
            <KpiCard label="BREAK-EVEN(S)" value={breakevenLabel} tone="warn" />
          </div>

          {/* Net Greeks */}
          <div className="rounded border border-line bg-elevated/10 p-3">
            <div className="section-label mb-2">Net Greeks</div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <Stat
                label="Delta"
                value={fmtNum(netGreeks.delta, 3)}
                tone={netGreeks.delta > 0 ? "pos" : netGreeks.delta < 0 ? "neg" : "muted"}
              />
              <Stat label="Gamma" value={fmtNum(netGreeks.gamma, 4)} />
              <Stat label="Vega /1%" value={fmtNum(netGreeks.vega, 3)} tone="accent" />
              <Stat
                label="Theta /day"
                value={fmtNum(netGreeks.theta, 3)}
                tone={netGreeks.theta < 0 ? "neg" : netGreeks.theta > 0 ? "pos" : "muted"}
              />
              <Stat label="Rho /1%" value={fmtNum(netGreeks.rho, 3)} />
            </div>
          </div>

          {/* Legs table */}
          <div className="overflow-x-auto rounded border border-line">
            <table className="w-full min-w-[440px] border-collapse">
              <thead>
                <tr>
                  <Th>Side</Th>
                  <Th>Type</Th>
                  <Th right>Strike</Th>
                  <Th right>Qty</Th>
                  <Th right>Premium</Th>
                </tr>
              </thead>
              <tbody>
                {analysis.legs.map((leg, idx) => (
                  <tr key={idx} className="transition-colors hover:bg-elevated/40">
                    <Td>
                      <span
                        className={cn(
                          "inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-2xs uppercase tracking-wider",
                          leg.side === "long"
                            ? "border-pos/40 bg-pos/10 text-pos"
                            : "border-neg/40 bg-neg/10 text-neg",
                        )}
                      >
                        {leg.side === "long" ? "+" : "−"} {leg.side}
                      </span>
                    </Td>
                    <Td className="uppercase text-muted">{leg.type}</Td>
                    <Td right>{fmtNum(leg.strike, 2)}</Td>
                    <Td right>{leg.qty}</Td>
                    <Td right className="text-accent">${fmtNum(leg.premium, 2)}</Td>
                  </tr>
                ))}
                {analysis.legs.length === 0 ? (
                  <tr>
                    <Td colSpan={5} mono={false} className="text-center text-dim">
                      No legs in this strategy.
                    </Td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <p className="font-mono text-2xs text-faint">
            Premiums are Black-Scholes theoretical at the current inputs. Payoff is P&L at expiry; the
            dashed line is today&apos;s mark-to-model value across spot.
          </p>
        </div>
      </div>
    </Panel>
  );
}
