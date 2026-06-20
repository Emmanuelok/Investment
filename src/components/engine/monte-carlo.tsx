"use client";

import { useCallback, useMemo, useState } from "react";
import { Panel, PanelHeader, KpiCard, Stat } from "@/components/ui/kit";
import { ProgressBar } from "@/components/ui/viz";
import { Icon } from "@/components/icon-map";
import { simulateGBM, type MCResult } from "@/lib/engine/montecarlo";
import { fmtNum } from "@/lib/format";
import { cn } from "@/lib/cn";

/* ── input model & control config ──────────────────────────────────────────── */

type Inputs = {
  spot: number;
  driftPct: number;
  volPct: number;
  days: number;
  paths: number;
  target: number;
};

const DEFAULTS: Inputs = { spot: 100, driftPct: 8, volPct: 25, days: 126, paths: 2000, target: 120 };
const MAX_PATHS = 5000;
const SYM_RE = /^[A-Z0-9.^-]+$/;

type SliderCfg = {
  key: "spot" | "driftPct" | "volPct" | "days" | "paths";
  label: string;
  min: number;
  max: number;
  step: number;
  dp: number;
  suffix?: string;
};

const SLIDERS: SliderCfg[] = [
  { key: "spot", label: "Spot", min: 1, max: 1000, step: 1, dp: 2 },
  { key: "driftPct", label: "Drift (ann.)", min: -30, max: 40, step: 0.5, dp: 1, suffix: "%" },
  { key: "volPct", label: "Volatility (ann.)", min: 1, max: 120, step: 0.5, dp: 1, suffix: "%" },
  { key: "days", label: "Horizon", min: 5, max: 756, step: 1, dp: 0, suffix: "d" },
  { key: "paths", label: "Paths", min: 100, max: MAX_PATHS, step: 100, dp: 0 },
];

/* ── quote feed (optional symbol seeding) ──────────────────────────────────── */

type QuoteCandle = { o: number; h: number; l: number; c: number; v: number };
type QuoteResponse =
  | { live: true; quote: { price: number }; candles: QuoteCandle[] }
  | { live: false };

/** Annualized drift/vol from log returns of daily closes. */
function seedFromCandles(candles: QuoteCandle[]): { driftPct: number; volPct: number } | null {
  const closes = candles.map((c) => c.c).filter((c) => Number.isFinite(c) && c > 0);
  if (closes.length < 3) return null;
  const rets: number[] = [];
  for (let i = 1; i < closes.length; i++) rets.push(Math.log(closes[i] / closes[i - 1]));
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const variance = rets.reduce((a, b) => a + (b - mean) * (b - mean), 0) / Math.max(1, rets.length - 1);
  return { driftPct: mean * 252 * 100, volPct: Math.sqrt(variance) * Math.sqrt(252) * 100 };
}

/* ── per-step percentile envelope from aligned sample paths ─────────────────── */

type Envelope = { p5: number[]; p25: number[]; p50: number[]; p75: number[]; p95: number[]; steps: number };

const quantile = (sorted: number[], q: number) =>
  sorted[Math.max(0, Math.min(sorted.length - 1, Math.floor(q * sorted.length)))];

/**
 * samplePaths are aligned arrays (same step grid). At each step index compute the
 * cross-path percentiles to approximate the envelope across the horizon.
 */
function buildEnvelope(samplePaths: number[][]): Envelope {
  const steps = samplePaths.reduce((m, p) => Math.min(m, p.length), Infinity);
  const safe = Number.isFinite(steps) ? steps : 0;
  const p5: number[] = [], p25: number[] = [], p50: number[] = [], p75: number[] = [], p95: number[] = [];
  for (let i = 0; i < safe; i++) {
    const col = samplePaths.map((p) => p[i]).filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
    if (!col.length) continue;
    p5.push(quantile(col, 0.05));
    p25.push(quantile(col, 0.25));
    p50.push(quantile(col, 0.5));
    p75.push(quantile(col, 0.75));
    p95.push(quantile(col, 0.95));
  }
  return { p5, p25, p50, p75, p95, steps: p50.length };
}

/* ── fan chart ─────────────────────────────────────────────────────────────── */

const ACCENT = "var(--accent)";

function FanChart({ result }: { result: MCResult }) {
  const w = 760, h = 280, padL = 8, padR = 8, padT = 12, padB = 18;
  const innerW = w - padL - padR, innerH = h - padT - padB;
  const env = useMemo(() => buildEnvelope(result.samplePaths), [result.samplePaths]);

  // Y range spans all sample paths plus spot & target so nothing clips.
  const { yMin, yMax } = useMemo(() => {
    let lo = result.spot, hi = result.spot;
    for (const path of result.samplePaths) for (const v of path) { if (v < lo) lo = v; if (v > hi) hi = v; }
    if (result.target != null) { lo = Math.min(lo, result.target); hi = Math.max(hi, result.target); }
    const span = hi - lo || 1;
    return { yMin: lo - span * 0.04, yMax: hi + span * 0.04 };
  }, [result.samplePaths, result.spot, result.target]);

  const ySpan = yMax - yMin || 1;
  const nSteps = env.steps;
  const xAt = (i: number) => padL + (nSteps > 1 ? (i / (nSteps - 1)) * innerW : innerW / 2);
  const yAt = (v: number) => padT + (1 - (v - yMin) / ySpan) * innerH;

  // Band polygon between two per-step series (upper traced forward, lower back).
  const band = (upper: number[], lower: number[]) => {
    if (!upper.length) return "";
    const top = upper.map((v, i) => `${i === 0 ? "M" : "L"}${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`).join(" ");
    const bottom = lower.map((v, i) => `L${xAt(lower.length - 1 - i).toFixed(1)},${yAt(lower[lower.length - 1 - i]).toFixed(1)}`).join(" ");
    return `${top} ${bottom} Z`;
  };

  const line = (series: number[]) =>
    series.map((v, i) => `${i === 0 ? "M" : "L"}${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`).join(" ");

  // Sample paths resampled onto the same step grid for faint trajectories.
  const sampleLines = useMemo(
    () =>
      result.samplePaths.map((path) =>
        path
          .slice(0, nSteps)
          .map((v, i) => `${i === 0 ? "M" : "L"}${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`)
          .join(" "),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [result.samplePaths, nSteps, yMin, yMax],
  );

  const spotY = yAt(result.spot);
  const targetY = result.target != null ? yAt(result.target) : null;
  const ticks = [yMax, (yMax + yMin) / 2, yMin];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" className="block" role="img" aria-label="Monte-Carlo fan chart">
      {/* horizontal gridlines + price ticks */}
      {ticks.map((t, i) => {
        const y = yAt(t);
        return (
          <g key={`t-${i}`}>
            <line x1={padL} y1={y} x2={w - padR} y2={y} stroke="var(--line)" strokeWidth={1} strokeDasharray="2 4" opacity={0.5} />
            <text x={w - padR} y={y - 2} textAnchor="end" className="fill-dim font-mono" fontSize={9}>
              {fmtNum(t, 0)}
            </text>
          </g>
        );
      })}

      {/* percentile bands: p5–p95 (faint) then p25–p75 (stronger) */}
      {env.p95.length ? <path d={band(env.p95, env.p5)} fill={ACCENT} opacity={0.08} /> : null}
      {env.p75.length ? <path d={band(env.p75, env.p25)} fill={ACCENT} opacity={0.18} /> : null}

      {/* faint sample trajectories */}
      {sampleLines.map((d, i) => (
        <path key={`s-${i}`} d={d} fill="none" stroke={ACCENT} strokeWidth={0.7} opacity={0.06} />
      ))}

      {/* median line */}
      {env.p50.length ? <path d={line(env.p50)} fill="none" stroke={ACCENT} strokeWidth={1.6} opacity={0.95} /> : null}

      {/* starting spot marker */}
      <line x1={padL} y1={spotY} x2={w - padR} y2={spotY} stroke="var(--line-strong)" strokeWidth={1} opacity={0.6} />
      <circle cx={padL} cy={spotY} r={3} fill={ACCENT} />
      <text x={padL + 6} y={spotY - 4} className="fill-dim font-mono" fontSize={9}>
        spot {fmtNum(result.spot, 0)}
      </text>

      {/* target dashed line */}
      {targetY != null ? (
        <>
          <line x1={padL} y1={targetY} x2={w - padR} y2={targetY} stroke="var(--warn)" strokeWidth={1} strokeDasharray="4 3" opacity={0.85} />
          <text x={padL + 6} y={targetY - 4} className="fill-warn font-mono" fontSize={9}>
            target {fmtNum(result.target ?? 0, 0)}
          </text>
        </>
      ) : null}
    </svg>
  );
}

/* ── terminal distribution histogram ───────────────────────────────────────── */

function Histogram({ result }: { result: MCResult }) {
  const w = 760, h = 150, padL = 8, padR = 8, padT = 10, padB = 22;
  const innerW = w - padL - padR, innerH = h - padT - padB;
  const bins = result.histogram;
  const maxCount = Math.max(1, ...bins.map((b) => b.count));
  const xs = bins.map((b) => b.x);
  const loX = Math.min(...xs, result.spot, result.target ?? result.spot);
  const hiX = Math.max(...xs, result.spot, result.target ?? result.spot);
  const spanX = hiX - loX || 1;
  const xAt = (x: number) => padL + ((x - loX) / spanX) * innerW;
  const barW = bins.length > 1 ? (innerW / bins.length) * 0.86 : innerW * 0.6;

  const spotX = xAt(result.spot);
  const targetX = result.target != null ? xAt(result.target) : null;
  const medX = xAt(result.terminalMedian);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" className="block" role="img" aria-label="Terminal price distribution">
      {/* baseline */}
      <line x1={padL} y1={padT + innerH} x2={w - padR} y2={padT + innerH} stroke="var(--line)" strokeWidth={1} />

      {/* bars */}
      {bins.map((b, i) => {
        const bh = (b.count / maxCount) * innerH;
        const cx = xAt(b.x);
        return (
          <rect
            key={i}
            x={cx - barW / 2}
            y={padT + innerH - bh}
            width={barW}
            height={Math.max(0.5, bh)}
            rx={0.6}
            fill={ACCENT}
            opacity={0.32 + 0.5 * (b.count / maxCount)}
          />
        );
      })}

      {/* spot marker (dim) */}
      <line x1={spotX} y1={padT} x2={spotX} y2={padT + innerH} stroke="var(--line-strong)" strokeWidth={1} opacity={0.7} />

      {/* target marker (dashed warn) */}
      {targetX != null ? (
        <line x1={targetX} y1={padT} x2={targetX} y2={padT + innerH} stroke="var(--warn)" strokeWidth={1} strokeDasharray="4 3" opacity={0.9} />
      ) : null}

      {/* x-axis labels: min · median · max */}
      <text x={padL} y={h - 6} textAnchor="start" className="fill-dim font-mono" fontSize={9}>
        {fmtNum(loX, 0)}
      </text>
      <text x={medX} y={h - 6} textAnchor="middle" className="fill-muted font-mono" fontSize={9}>
        med {fmtNum(result.terminalMedian, 0)}
      </text>
      <text x={w - padR} y={h - 6} textAnchor="end" className="fill-dim font-mono" fontSize={9}>
        {fmtNum(hiX, 0)}
      </text>
    </svg>
  );
}

/* ── slider row ────────────────────────────────────────────────────────────── */

function SliderRow({ cfg, value, onChange }: { cfg: SliderCfg; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between">
        <label className="kpi-label" htmlFor={`mc-${cfg.key}`}>
          {cfg.label}
        </label>
        <span className="font-mono text-xs tabular-nums text-ink">
          {fmtNum(value, cfg.dp)}
          {cfg.suffix ?? ""}
        </span>
      </div>
      <input
        id={`mc-${cfg.key}`}
        type="range"
        min={cfg.min}
        max={cfg.max}
        step={cfg.step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mc-range w-full accent-[var(--accent)]"
        aria-label={cfg.label}
      />
    </div>
  );
}

/* ── main component ────────────────────────────────────────────────────────── */

export function MonteCarlo() {
  const [inputs, setInputs] = useState<Inputs>(DEFAULTS);
  const [sym, setSym] = useState("");
  const [feedNote, setFeedNote] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // Pure, deterministic recompute keyed on inputs (auto-runs on mount via memo).
  const result = useMemo<MCResult>(
    () =>
      simulateGBM({
        spot: inputs.spot,
        driftPct: inputs.driftPct,
        volPct: inputs.volPct,
        days: inputs.days,
        paths: Math.min(MAX_PATHS, inputs.paths),
        target: inputs.target,
        seed: `mc-ui-${inputs.spot}-${inputs.driftPct}-${inputs.volPct}-${inputs.days}-${inputs.paths}`,
      }),
    [inputs],
  );

  const setField = useCallback(<K extends keyof Inputs>(key: K, value: number) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  }, []);

  const loadFromSymbol = useCallback(async () => {
    const s = sym.toUpperCase().trim();
    if (!SYM_RE.test(s)) {
      setFeedNote("invalid symbol");
      return;
    }
    setLoading(true);
    setFeedNote("");
    try {
      const r = await fetch(`/api/quote?symbol=${encodeURIComponent(s)}&limit=252`, { cache: "no-store" });
      const j = (await r.json()) as QuoteResponse;
      if (j.live && j.quote?.price > 0) {
        const seed = seedFromCandles(j.candles);
        setInputs((prev) => ({
          ...prev,
          spot: Math.round(j.quote.price * 100) / 100,
          driftPct: seed ? Math.round(seed.driftPct * 10) / 10 : prev.driftPct,
          volPct: seed ? Math.round(seed.volPct * 10) / 10 : prev.volPct,
        }));
        setFeedNote("");
      } else {
        setFeedNote("feed unreachable — using manual inputs");
      }
    } catch {
      setFeedNote("feed unreachable — using manual inputs");
    } finally {
      setLoading(false);
    }
  }, [sym]);

  const er = result.expectedReturnPct;
  const probTgt = result.probAboveTarget;

  return (
    <Panel className="animate-rise">
      <PanelHeader
        title="Monte-Carlo Simulator — GBM"
        sub={`${result.paths} simulated paths over ${result.days} trading days · terminal distribution, percentiles & path VaR`}
        right={
          <span className="flex items-center gap-1.5 rounded border border-pos/40 bg-pos/10 px-2 py-1 font-mono text-2xs uppercase tracking-wider text-pos">
            <span className="h-1.5 w-1.5 rounded-full bg-pos" />
            ENGINE · LIVE (simulation)
          </span>
        }
      />

      {/* Controls */}
      <div className="border-b border-line px-4 py-3">
        <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          {SLIDERS.map((cfg) => (
            <SliderRow key={cfg.key} cfg={cfg} value={inputs[cfg.key]} onChange={(v) => setField(cfg.key, v)} />
          ))}
          {/* Target numeric input */}
          <div className="space-y-1">
            <label className="kpi-label" htmlFor="mc-target">
              Price target
            </label>
            <input
              id="mc-target"
              type="number"
              value={inputs.target}
              min={0}
              step={1}
              onChange={(e) => setField("target", Number(e.target.value))}
              className="w-full rounded border border-line bg-base px-2 py-1 font-mono text-xs tabular-nums text-ink outline-none focus:border-line-strong"
              aria-label="Price target"
            />
          </div>
        </div>

        {/* Symbol seeding + Run */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <input
              value={sym}
              onChange={(e) => setSym(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") loadFromSymbol();
              }}
              spellCheck={false}
              placeholder="SYM"
              aria-label="Symbol to seed drift and volatility"
              className="w-24 rounded border border-line bg-base px-2 py-1 font-mono text-xs uppercase text-ink outline-none placeholder:text-dim focus:border-line-strong"
            />
            <button
              onClick={loadFromSymbol}
              disabled={loading}
              className="btn shrink-0 px-2.5 py-1 font-mono text-2xs uppercase tracking-wider disabled:opacity-50"
            >
              <Icon name="plug" width={12} height={12} />
              {loading ? "loading…" : "Load drift/vol from SYM"}
            </button>
          </div>
          {feedNote ? (
            <span className="rounded border border-warn/40 bg-warn/10 px-2 py-1 font-mono text-2xs text-warn">{feedNote}</span>
          ) : null}
          <button
            onClick={() => setInputs((prev) => ({ ...prev }))}
            className="btn btn-accent ml-auto px-3 py-1 font-mono text-2xs uppercase tracking-wider"
            title="Recompute (also runs automatically on input change)"
          >
            <Icon name="bolt" width={12} height={12} />
            Run
          </button>
        </div>
      </div>

      {/* 1) Fan chart */}
      <div className="px-4 pt-4">
        <div className="section-label mb-2 text-[11px] text-muted">Price-path fan · percentile envelope</div>
        <FanChart result={result} />
      </div>

      {/* 2) KPI deck */}
      <div className="grid grid-cols-2 gap-3 px-4 py-4 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          label="Expected Return"
          value={<span className="tabular-nums">{`${er >= 0 ? "+" : ""}${fmtNum(er, 2)}%`}</span>}
          tone={er >= 0 ? "pos" : "neg"}
        />
        <KpiCard label="Median Terminal" value={<span className="tabular-nums">{fmtNum(result.terminalMedian, 2)}</span>} />
        <KpiCard label="P5 (price)" value={<span className="tabular-nums">{fmtNum(result.p5, 2)}</span>} tone="neg" />
        <KpiCard label="P95 (price)" value={<span className="tabular-nums">{fmtNum(result.p95, 2)}</span>} tone="pos" />
        <KpiCard
          label="VaR 95% (horizon)"
          value={<span className="tabular-nums">{`${fmtNum(result.var95Pct, 2)}%`}</span>}
          tone="neg"
        />
        <KpiCard
          label="Prob Up"
          value={<span className="tabular-nums">{`${fmtNum(result.probUp, 1)}%`}</span>}
          tone="accent"
        />
        {/* Prob >= target with ProgressBar (full width on small grids) */}
        <Panel hover className="col-span-2 px-4 py-3 md:col-span-3 xl:col-span-6">
          <div className="flex items-center justify-between">
            <Stat
              label="Prob ≥ Target"
              value={probTgt != null ? `${fmtNum(probTgt, 1)}%` : "—"}
              tone={probTgt != null && probTgt >= 50 ? "pos" : "accent"}
            />
            <span className="font-mono text-2xs text-dim">
              target {fmtNum(result.target ?? 0, 2)}
            </span>
          </div>
          <ProgressBar
            value={probTgt ?? 0}
            max={100}
            color="var(--accent)"
            height={6}
            className="mt-2"
            showGlow={probTgt != null && probTgt >= 50}
          />
        </Panel>
      </div>

      {/* 3) Terminal distribution */}
      <div className="border-t border-line px-4 pb-4 pt-3">
        <div className="section-label mb-2 text-[11px] text-muted">Terminal price distribution</div>
        <Histogram result={result} />
      </div>

      <div className="border-t border-line px-4 py-2.5 text-2xs text-dim">
        Geometric Brownian motion with seeded RNG (reproducible). Assumes constant drift/vol & log-normal returns — a model,
        not a forecast.
      </div>
    </Panel>
  );
}
