"use client";

import { useMemo, useState } from "react";
import { Panel, PanelHeader, Chip, Stat, Th, Td } from "@/components/ui/kit";
import { fmtNum, fmtSignedPct, signClass } from "@/lib/format";
import { cn } from "@/lib/cn";
import { analyzeBond, bondPrice, yieldToMaturity, priceChangeForBpShift } from "@/lib/engine/bonds";

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

/* ── Price–yield SVG curve ─────────────────────────────────────────────────── */

function PriceYieldChart({
  face,
  couponRate,
  ytm,
  years,
  freq,
  price,
}: {
  face: number;
  couponRate: number;
  ytm: number;
  years: number;
  freq: number;
  price: number;
}) {
  const W = 560;
  const H = 220;
  const PAD_L = 8;
  const PAD_R = 8;
  const PAD_T = 12;
  const PAD_B = 22;
  const N = 60;
  const Y_LO = 0; // 0%
  const Y_HI = 0.12; // 12%

  const { prices, yMin, yMax } = useMemo(() => {
    const pts: number[] = [];
    for (let i = 0; i < N; i++) {
      const y = Y_LO + ((Y_HI - Y_LO) * i) / (N - 1);
      pts.push(bondPrice({ face, couponRate, ytm: y, years, freq }));
    }
    const allY = [...pts, face, price];
    const loY = Math.min(...allY);
    const hiY = Math.max(...allY);
    const span = hiY - loY || 1;
    return { prices: pts, yMin: loY - span * 0.06, yMax: hiY + span * 0.06 };
  }, [face, couponRate, years, freq, price]);

  const xOf = (y: number) => PAD_L + ((y - Y_LO) / (Y_HI - Y_LO)) * (W - PAD_L - PAD_R);
  const yOf = (v: number) => PAD_T + (1 - (v - yMin) / (yMax - yMin || 1)) * (H - PAD_T - PAD_B);

  const curvePath = prices
    .map((v, i) => {
      const y = Y_LO + ((Y_HI - Y_LO) * i) / (N - 1);
      return `${i === 0 ? "M" : "L"}${xOf(y).toFixed(2)},${yOf(v).toFixed(2)}`;
    })
    .join(" ");

  const clampedYtm = Math.min(Y_HI, Math.max(Y_LO, ytm));
  const ptX = xOf(clampedYtm);
  const ptY = yOf(price);
  const parY = yOf(face);
  const parVisible = parY >= PAD_T && parY <= H - PAD_B;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" className="overflow-visible">
      {/* par price baseline */}
      {parVisible ? (
        <>
          <line x1={PAD_L} y1={parY} x2={W - PAD_R} y2={parY} stroke="var(--line-strong)" strokeWidth={1} strokeDasharray="2 3" />
          <text x={W - PAD_R} y={parY - 4} textAnchor="end" className="fill-[var(--faint)] font-mono" fontSize={9}>
            par {fmtNum(face, 0)}
          </text>
        </>
      ) : null}
      {/* price–yield curve (accent, convex) */}
      <path d={curvePath} fill="none" stroke="var(--accent)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      {/* current point dashed guides */}
      <line x1={ptX} y1={PAD_T} x2={ptX} y2={H - PAD_B} stroke="var(--accent)" strokeWidth={1} strokeDasharray="3 2" opacity={0.55} />
      <line x1={PAD_L} y1={ptY} x2={W - PAD_R} y2={ptY} stroke="var(--accent)" strokeWidth={1} strokeDasharray="3 2" opacity={0.4} />
      <circle cx={ptX} cy={ptY} r={3.5} fill="var(--accent)" />
      {/* x-axis yield labels */}
      <text x={PAD_L} y={H - 6} className="fill-[var(--faint)] font-mono" fontSize={9}>
        {fmtNum(Y_LO * 100, 0)}%
      </text>
      <text x={ptX} y={H - 6} textAnchor="middle" className="fill-[var(--accent)] font-mono" fontSize={9}>
        y {fmtNum(ytm * 100, 2)}%
      </text>
      <text x={W - PAD_R} y={H - 6} textAnchor="end" className="fill-[var(--faint)] font-mono" fontSize={9}>
        {fmtNum(Y_HI * 100, 0)}%
      </text>
    </svg>
  );
}

/* ── Implied-yield mini tool ───────────────────────────────────────────────── */

function ImpliedYieldTool({
  face,
  couponRate,
  years,
  freq,
}: {
  face: number;
  couponRate: number;
  years: number;
  freq: number;
}) {
  const [marketPrice, setMarketPrice] = useState<string>("");

  const ytm = useMemo(() => {
    const px = Number(marketPrice);
    if (marketPrice.trim() === "" || Number.isNaN(px) || px <= 0) return null;
    return yieldToMaturity(face, couponRate, px, years, freq);
  }, [marketPrice, face, couponRate, years, freq]);

  return (
    <div className="rounded border border-line bg-elevated/20 p-3">
      <div className="section-label mb-2">Implied-Yield Solver</div>
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="kpi-label" htmlFor="bond-market-price">
            Market Price
          </label>
          <input
            id="bond-market-price"
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
          <div className="kpi-label">Solved YTM</div>
          <div className="mt-1 font-mono text-2xl leading-none tabular-nums text-accent">
            {ytm === null ? <span className="text-dim">—</span> : `${fmtNum(ytm * 100, 3)}%`}
          </div>
        </div>
      </div>
      <p className="mt-2 font-mono text-2xs text-faint">Bisection on the bond price · no solution shown as &ldquo;&mdash;&rdquo;.</p>
    </div>
  );
}

/* ── Rate-shock ladder ─────────────────────────────────────────────────────── */

const SHOCKS = [-100, -50, -25, 25, 50, 100] as const;

/* ── Main analytics ────────────────────────────────────────────────────────── */

export function BondAnalytics() {
  const [face, setFace] = useState(1000);
  const [couponPct, setCouponPct] = useState(5);
  const [ytmPct, setYtmPct] = useState(4.5);
  const [years, setYears] = useState(10);
  const [freq, setFreq] = useState(2);

  const couponRate = couponPct / 100;
  const ytm = ytmPct / 100;

  const analytics = useMemo(
    () => analyzeBond({ face, couponRate, ytm, years, freq }),
    [face, couponRate, ytm, years, freq],
  );

  // premium / par / discount classification (par within ~0.1% of face)
  const parTol = face * 1e-3;
  const status: "premium" | "par" | "discount" =
    analytics.price > face + parTol ? "premium" : analytics.price < face - parTol ? "discount" : "par";
  const statusChip =
    status === "premium"
      ? { tone: "warn" as const, label: "Premium" }
      : status === "discount"
        ? { tone: "pos" as const, label: "Discount" }
        : { tone: "default" as const, label: "Par" };

  return (
    <Panel className="animate-rise">
      <PanelHeader
        title="Fixed-Income Analytics — Bond"
        sub="Price, yield, duration, convexity & DV01 · self-contained, no market feed needed"
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
          {/* Face value numeric input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="kpi-label">Face Value</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={face}
                  min={1}
                  step={50}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (!Number.isNaN(n) && n >= 1) setFace(n);
                  }}
                  aria-label="Face Value"
                  className="w-24 rounded border border-line bg-elevated/40 px-1.5 py-0.5 text-right font-mono text-xs tabular-nums text-ink outline-none focus:border-accent/60"
                />
                <span className="w-3 font-mono text-2xs text-dim">$</span>
              </div>
            </div>
          </div>

          {/* Coupon frequency select */}
          <div className="space-y-1.5">
            <span className="kpi-label">Coupon Frequency</span>
            <select
              value={freq}
              onChange={(e) => setFreq(Number(e.target.value))}
              aria-label="Coupon Frequency"
              className="w-full rounded border border-line bg-elevated/40 px-2 py-1.5 font-mono text-xs text-ink outline-none focus:border-accent/60"
            >
              <option value={1}>Annual (1)</option>
              <option value={2}>Semi-annual (2)</option>
              <option value={4}>Quarterly (4)</option>
            </select>
          </div>

          <SliderRow label="Coupon Rate" unit="%" value={couponPct} min={0} max={15} step={0.05} onChange={setCouponPct} />
          <SliderRow label="Yield to Maturity" unit="%" value={ytmPct} min={0.05} max={15} step={0.05} onChange={setYtmPct} />
          <SliderRow label="Years to Maturity" unit="y" value={years} min={0.5} max={30} step={0.5} dp={1} onChange={setYears} />

          <div className="font-mono text-2xs text-faint">
            periods = {Math.max(1, Math.round(years * freq))} · coupon/pmt = {fmtNum((face * couponRate) / freq, 2)}
          </div>
        </div>

        {/* ── Results column ── */}
        <div className="space-y-4 bg-base p-4">
          {/* Price readout */}
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="kpi-label">Price</div>
              <div className="mt-1 font-mono text-5xl leading-none tracking-tight tabular-nums text-ink">
                {fmtNum(analytics.price, 2)}
              </div>
              <div className="mt-2 flex items-center gap-3">
                <Chip tone={statusChip.tone}>{statusChip.label}</Chip>
                <span className="font-mono text-xs tabular-nums text-dim">
                  Current Yield <span className="text-accent">{fmtNum(analytics.currentYield, 2)}%</span>
                </span>
              </div>
            </div>
          </div>

          {/* Analytics deck */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat label="Clean Price" value={fmtNum(analytics.price, 2)} />
            <Stat label="Macaulay Dur (yrs)" value={fmtNum(analytics.macaulayDuration, 2)} />
            <Stat label="Modified Dur (yrs)" value={fmtNum(analytics.modifiedDuration, 2)} tone="accent" />
            <Stat label="Convexity" value={fmtNum(analytics.convexity, 2)} />
            <Stat label="DV01 ($/1bp)" value={fmtNum(analytics.dv01, 4)} tone="warn" />
            <Stat label="Current Yield %" value={`${fmtNum(analytics.currentYield, 2)}%`} />
          </div>

          {/* Price–yield curve */}
          <div className="rounded border border-line bg-elevated/10 p-3">
            <div className="mb-1 flex items-center justify-between">
              <span className="section-label">Price vs Yield</span>
              <div className="flex items-center gap-3 font-mono text-2xs text-dim">
                <span className="flex items-center gap-1">
                  <span className="inline-block h-0.5 w-4 rounded" style={{ background: "var(--accent)" }} /> Price
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-px w-4" style={{ background: "var(--line-strong)" }} /> Par
                </span>
              </div>
            </div>
            <PriceYieldChart
              face={face}
              couponRate={couponRate}
              ytm={ytm}
              years={years}
              freq={freq}
              price={analytics.price}
            />
          </div>

          {/* Rate-shock ladder */}
          <div className="rounded border border-line bg-elevated/10 p-3">
            <div className="section-label mb-2">Rate-Shock Ladder</div>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <Th>Yield Shift</Th>
                  <Th right>Est. Price Δ%</Th>
                  <Th right>Resulting Price</Th>
                </tr>
              </thead>
              <tbody>
                {SHOCKS.map((bps) => {
                  const chgPct = priceChangeForBpShift(analytics, bps);
                  const resulting = analytics.price * (1 + chgPct / 100);
                  return (
                    <tr key={bps} className="hover:bg-elevated/40">
                      <Td className="text-dim">
                        {bps > 0 ? "+" : ""}
                        {bps} bps
                      </Td>
                      <Td right className={signClass(chgPct)}>
                        {fmtSignedPct(chgPct, 3)}
                      </Td>
                      <Td right className="text-ink">
                        {fmtNum(resulting, 2)}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Implied-yield mini tool */}
          <ImpliedYieldTool face={face} couponRate={couponRate} years={years} freq={freq} />
        </div>
      </div>

      <div className="border-t border-line px-4 py-2.5 font-mono text-2xs text-faint">
        Priced on a coupon date (no accrued interest). Duration &amp; convexity are the first- and second-order rate
        sensitivities; DV01 is the dollar value of a 1bp move.
      </div>
    </Panel>
  );
}
