"use client";

import { useMemo, useState } from "react";
import { Panel, PanelHeader, Stat } from "@/components/ui/kit";
import { ProgressBar } from "@/components/ui/viz";
import { fmtNum } from "@/lib/format";
import { cn } from "@/lib/cn";
import { blackScholes, impliedVol, probITM, type OptionInput } from "@/lib/engine/options";

type OptType = "call" | "put";

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

/* ── Payoff / theoretical-value SVG curve ──────────────────────────────────── */

function PayoffChart({
  strike,
  spot,
  t,
  vol,
  rate,
  div,
  type,
}: {
  strike: number;
  spot: number;
  t: number;
  vol: number;
  rate: number;
  div: number;
  type: OptType;
}) {
  const W = 560;
  const H = 220;
  const PAD_L = 8;
  const PAD_R = 8;
  const PAD_T = 12;
  const PAD_B = 22;
  const N = 80;

  const { sLo, sHi, value, intrinsic, yMin, yMax } = useMemo(() => {
    const lo = strike * 0.6;
    const hi = strike * 1.4;
    const valuePts: number[] = [];
    const intrinsicPts: number[] = [];
    for (let i = 0; i < N; i++) {
      const s = lo + ((hi - lo) * i) / (N - 1);
      valuePts.push(blackScholes({ spot: s, strike, t, vol, rate, div, type }).price);
      intrinsicPts.push(Math.max(type === "call" ? s - strike : strike - s, 0));
    }
    const allY = [...valuePts, ...intrinsicPts, 0];
    const loY = Math.min(...allY);
    const hiY = Math.max(...allY);
    const span = hiY - loY || 1;
    return {
      sLo: lo,
      sHi: hi,
      value: valuePts,
      intrinsic: intrinsicPts,
      yMin: loY - span * 0.06,
      yMax: hiY + span * 0.06,
    };
  }, [strike, t, vol, rate, div, type]);

  const xOf = (s: number) => PAD_L + ((s - sLo) / (sHi - sLo)) * (W - PAD_L - PAD_R);
  const yOf = (v: number) => PAD_T + (1 - (v - yMin) / (yMax - yMin || 1)) * (H - PAD_T - PAD_B);

  const toPath = (pts: number[]) =>
    pts
      .map((v, i) => {
        const s = sLo + ((sHi - sLo) * i) / (N - 1);
        return `${i === 0 ? "M" : "L"}${xOf(s).toFixed(2)},${yOf(v).toFixed(2)}`;
      })
      .join(" ");

  const zeroY = yOf(0);
  const spotX = xOf(Math.min(sHi, Math.max(sLo, spot)));
  const strikeX = xOf(strike);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" className="overflow-visible">
      {/* zero baseline */}
      <line x1={PAD_L} y1={zeroY} x2={W - PAD_R} y2={zeroY} stroke="var(--line)" strokeWidth={1} />
      {/* strike marker */}
      <line x1={strikeX} y1={PAD_T} x2={strikeX} y2={H - PAD_B} stroke="var(--line)" strokeWidth={1} strokeDasharray="2 3" />
      {/* dashed intrinsic (hockey-stick) payoff at expiry */}
      <path d={toPath(intrinsic)} fill="none" stroke="var(--dim)" strokeWidth={1.3} strokeDasharray="4 3" />
      {/* theoretical value curve (accent) */}
      <path d={toPath(value)} fill="none" stroke="var(--accent)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      {/* current-spot marker */}
      <line x1={spotX} y1={PAD_T} x2={spotX} y2={H - PAD_B} stroke="var(--accent)" strokeWidth={1} strokeDasharray="3 2" opacity={0.55} />
      <circle cx={spotX} cy={yOf(blackScholes({ spot, strike, t, vol, rate, div, type }).price)} r={3} fill="var(--accent)" />
      {/* x-axis spot labels */}
      <text x={PAD_L} y={H - 6} className="fill-[var(--faint)] font-mono" fontSize={9}>
        {fmtNum(sLo, 0)}
      </text>
      <text x={spotX} y={H - 6} textAnchor="middle" className="fill-[var(--accent)] font-mono" fontSize={9}>
        S {fmtNum(spot, 0)}
      </text>
      <text x={W - PAD_R} y={H - 6} textAnchor="end" className="fill-[var(--faint)] font-mono" fontSize={9}>
        {fmtNum(sHi, 0)}
      </text>
    </svg>
  );
}

/* ── Implied-vol mini tool ─────────────────────────────────────────────────── */

function ImpliedVolTool({ base }: { base: Omit<OptionInput, "vol"> }) {
  const [marketPrice, setMarketPrice] = useState<string>("");

  const iv = useMemo(() => {
    const px = Number(marketPrice);
    if (marketPrice.trim() === "" || Number.isNaN(px) || px < 0) return null;
    return impliedVol(px, base);
  }, [marketPrice, base]);

  return (
    <div className="rounded border border-line bg-elevated/20 p-3">
      <div className="section-label mb-2">Implied Volatility Solver</div>
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="kpi-label" htmlFor="iv-market-price">
            Market Price
          </label>
          <input
            id="iv-market-price"
            type="number"
            inputMode="decimal"
            placeholder="0.00"
            value={marketPrice}
            min={0}
            step={0.01}
            onChange={(e) => setMarketPrice(e.target.value)}
            className="mt-1 w-full rounded border border-line bg-base px-2 py-1.5 font-mono text-sm tabular-nums text-ink outline-none focus:border-accent/60"
          />
        </div>
        <div className="text-right">
          <div className="kpi-label">Solved IV</div>
          <div className="mt-1 font-mono text-2xl leading-none tabular-nums text-accent">
            {iv === null ? <span className="text-dim">—</span> : `${fmtNum(iv * 100, 1)}%`}
          </div>
        </div>
      </div>
      <p className="mt-2 font-mono text-2xs text-faint">Bisection on Black-Scholes price · no solution shown as “—”.</p>
    </div>
  );
}

/* ── Main pricer ──────────────────────────────────────────────────────────── */

export function OptionsPricer() {
  const [spot, setSpot] = useState(100);
  const [strike, setStrike] = useState(100);
  const [days, setDays] = useState(30);
  const [volPct, setVolPct] = useState(25);
  const [ratePct, setRatePct] = useState(4.5);
  const [divPct, setDivPct] = useState(0);
  const [type, setType] = useState<OptType>("call");

  const t = days / 365;
  const vol = volPct / 100;
  const rate = ratePct / 100;
  const div = divPct / 100;

  const greeks = useMemo(
    () => blackScholes({ spot, strike, t, vol, rate, div, type }),
    [spot, strike, t, vol, rate, div, type],
  );
  const pITM = useMemo(() => probITM({ spot, strike, t, vol, rate, div, type }), [spot, strike, t, vol, rate, div, type]);

  const ivBase = useMemo<Omit<OptionInput, "vol">>(
    () => ({ spot, strike, t, rate, div, type }),
    [spot, strike, t, rate, div, type],
  );

  const deltaTone = greeks.delta > 0 ? "pos" : greeks.delta < 0 ? "neg" : "muted";

  return (
    <Panel className="animate-rise">
      <PanelHeader
        title="Options Pricer — Black-Scholes"
        sub="Live theoretical value & Greeks · self-contained, no market feed needed"
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
          {/* Call / Put segmented toggle */}
          <div className="grid grid-cols-2 gap-1 rounded border border-line bg-elevated/30 p-1">
            {(["call", "put"] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setType(opt)}
                className={cn(
                  "rounded px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition-colors",
                  type === opt ? "bg-accent text-base" : "text-dim hover:text-ink",
                )}
              >
                {opt}
              </button>
            ))}
          </div>

          <SliderRow label="Spot" value={spot} min={1} max={Math.max(300, strike * 2)} step={0.5} onChange={setSpot} />
          <SliderRow label="Strike" value={strike} min={1} max={Math.max(300, spot * 2)} step={0.5} onChange={setStrike} />
          <SliderRow label="Days to Expiry" unit="d" value={days} min={1} max={730} step={1} dp={0} onChange={setDays} />
          <SliderRow label="Volatility" unit="%" value={volPct} min={1} max={200} step={0.5} onChange={setVolPct} />
          <SliderRow label="Risk-Free Rate" unit="%" value={ratePct} min={0} max={15} step={0.05} onChange={setRatePct} />
          <SliderRow label="Dividend Yield" unit="%" value={divPct} min={0} max={12} step={0.05} onChange={setDivPct} />

          <div className="font-mono text-2xs text-faint">
            t = {fmtNum(t, 4)}y · d1 = {fmtNum(greeks.d1, 3)} · d2 = {fmtNum(greeks.d2, 3)}
          </div>
        </div>

        {/* ── Results column ── */}
        <div className="space-y-4 bg-base p-4">
          {/* Price readout */}
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="kpi-label">Theoretical Value</div>
              <div className="mt-1 font-mono text-5xl leading-none tracking-tight tabular-nums text-ink">
                {fmtNum(greeks.price, 2)}
              </div>
              <div className="mt-2 flex items-center gap-4 font-mono text-xs tabular-nums">
                <span className="text-dim">
                  Intrinsic <span className="text-muted">{fmtNum(greeks.intrinsic, 2)}</span>
                </span>
                <span className="text-dim">
                  Time Value <span className="text-accent">{fmtNum(greeks.timeValue, 2)}</span>
                </span>
              </div>
            </div>
            <div className="min-w-[150px] flex-1">
              <div className="flex items-center justify-between">
                <span className="kpi-label">Prob ITM</span>
                <span className="font-mono text-sm tabular-nums text-accent">{fmtNum(pITM * 100, 1)}%</span>
              </div>
              <div className="mt-1.5">
                <ProgressBar value={pITM * 100} max={100} color="var(--accent)" height={6} showGlow />
              </div>
            </div>
          </div>

          {/* Greeks grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Stat label="Delta" value={fmtNum(greeks.delta, 3)} tone={deltaTone} />
            <Stat label="Gamma" value={fmtNum(greeks.gamma, 4)} />
            <Stat label="Vega /1%" value={fmtNum(greeks.vega, 3)} tone="accent" />
            <Stat label="Theta /day" value={fmtNum(greeks.theta, 3)} tone={greeks.theta < 0 ? "neg" : "muted"} />
            <Stat label="Rho /1%" value={fmtNum(greeks.rho, 3)} />
          </div>

          {/* Payoff / value curve */}
          <div className="rounded border border-line bg-elevated/10 p-3">
            <div className="mb-1 flex items-center justify-between">
              <span className="section-label">Value vs Spot</span>
              <div className="flex items-center gap-3 font-mono text-2xs text-dim">
                <span className="flex items-center gap-1">
                  <span className="inline-block h-0.5 w-4 rounded" style={{ background: "var(--accent)" }} /> Value
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-px w-4" style={{ background: "var(--dim)" }} /> Intrinsic
                </span>
              </div>
            </div>
            <PayoffChart strike={strike} spot={spot} t={t} vol={vol} rate={rate} div={div} type={type} />
          </div>

          {/* Implied-vol mini tool */}
          <ImpliedVolTool base={ivBase} />
        </div>
      </div>
    </Panel>
  );
}
