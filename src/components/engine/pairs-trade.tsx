"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Panel, PanelHeader, Chip, Stat } from "@/components/ui/kit";
import { fmtNum } from "@/lib/format";
import { cn } from "@/lib/cn";
import { analyzePair, type PairSignal } from "@/lib/engine/pairs";
import { candleSeries } from "@/lib/rng";

type Status = "loading" | "live" | "demo";

type PairData = {
  source: string;
  asOf: string;
  symA: string;
  symB: string;
  hedgeRatio: number;
  correlation: number;
  zLast: number;
  halfLife: number | null;
  signal: PairSignal;
  rationale: string;
  entryZ: number;
  exitZ: number;
  spread: number[];
  zscore: number[];
};

type EngineResponse =
  | ({ live: true } & PairData)
  | { live: false; error?: string };

const SYM_RE = /^[A-Z0-9.^-]{1,10}$/;

const PRESETS: ReadonlyArray<readonly [string, string]> = [
  ["KO", "PEP"],
  ["V", "MA"],
  ["XOM", "CVX"],
  ["GOOGL", "META"],
  ["HD", "LOW"],
  ["MSFT", "AAPL"],
];

const WINDOWS = [60, 90, 120] as const;
type Win = (typeof WINDOWS)[number];

/** Compute the report locally from deterministic seeded candles (sandbox demo). */
function demoData(a: string, b: string, window: number): PairData {
  const closesA = candleSeries(a + "-pair", 260, 100, 0.016, 0.0004).map((c) => c.c);
  const closesB = candleSeries(b + "-pair", 260, 90, 0.016, 0.0004).map((c) => c.c);
  const r = analyzePair(a, b, closesA, closesB, window);
  return {
    source: "local",
    asOf: "",
    symA: r.symA,
    symB: r.symB,
    hedgeRatio: r.hedgeRatio,
    correlation: r.correlation,
    zLast: r.zLast,
    halfLife: Number.isFinite(r.halfLife) ? r.halfLife : null,
    signal: r.signal,
    rationale: r.rationale,
    entryZ: r.entryZ,
    exitZ: r.exitZ,
    spread: r.spread,
    zscore: r.zscore,
  };
}

/* ── Signal styling ───────────────────────────────────────────────────────── */

const signalStyle: Record<
  PairSignal,
  { label: string; wrap: string; dot: string; text: string }
> = {
  LONG_SPREAD: {
    label: "LONG SPREAD",
    wrap: "border-pos/40 bg-pos/10",
    dot: "bg-pos",
    text: "text-pos",
  },
  SHORT_SPREAD: {
    label: "SHORT SPREAD",
    wrap: "border-neg/40 bg-neg/10",
    dot: "bg-neg",
    text: "text-neg",
  },
  EXIT: {
    label: "EXIT",
    wrap: "border-line bg-elevated/30",
    dot: "bg-dim",
    text: "text-muted",
  },
  FLAT: {
    label: "FLAT",
    wrap: "border-accent/30 bg-accent/5",
    dot: "bg-accent",
    text: "text-accent",
  },
};

/* ── Z-score SVG chart ────────────────────────────────────────────────────── */

function ZScoreChart({ zscore, entryZ }: { zscore: number[]; entryZ: number }) {
  const W = 720;
  const H = 220;
  const PAD_L = 8;
  const PAD_R = 8;
  const PAD_T = 12;
  const PAD_B = 14;
  const CLAMP = 3.5;

  const { path, last, xOfLast, yOf, yZero, yPos, yNeg } = useMemo(() => {
    const n = zscore.length;
    const clamp = (v: number) => Math.min(CLAMP, Math.max(-CLAMP, v));
    const xAt = (i: number) =>
      PAD_L + (n <= 1 ? 0 : (i / (n - 1)) * (W - PAD_L - PAD_R));
    const yAt = (v: number) =>
      PAD_T + (1 - (clamp(v) + CLAMP) / (2 * CLAMP)) * (H - PAD_T - PAD_B);
    const d = zscore
      .map((v, i) => `${i === 0 ? "M" : "L"}${xAt(i).toFixed(2)},${yAt(v).toFixed(2)}`)
      .join(" ");
    const lastV = n ? zscore[n - 1] : 0;
    return {
      path: d,
      last: lastV,
      xOfLast: xAt(n - 1),
      yOf: yAt,
      yZero: yAt(0),
      yPos: yAt(entryZ),
      yNeg: yAt(-entryZ),
    };
  }, [zscore, entryZ]);

  const lastTone =
    last >= entryZ ? "var(--neg)" : last <= -entryZ ? "var(--pos)" : "var(--accent)";

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height={H}
      preserveAspectRatio="none"
      className="overflow-visible"
    >
      {/* stretched-spread shading (|z| > entryZ) */}
      <rect x={PAD_L} y={PAD_T} width={W - PAD_L - PAD_R} height={Math.max(0, yPos - PAD_T)} fill="var(--warn)" opacity={0.06} />
      <rect x={PAD_L} y={yNeg} width={W - PAD_L - PAD_R} height={Math.max(0, H - PAD_B - yNeg)} fill="var(--warn)" opacity={0.06} />

      {/* entry bands (±entryZ) */}
      <line x1={PAD_L} y1={yPos} x2={W - PAD_R} y2={yPos} stroke="var(--warn)" strokeWidth={1} strokeDasharray="4 3" opacity={0.7} />
      <line x1={PAD_L} y1={yNeg} x2={W - PAD_R} y2={yNeg} stroke="var(--warn)" strokeWidth={1} strokeDasharray="4 3" opacity={0.7} />
      {/* zero reference */}
      <line x1={PAD_L} y1={yZero} x2={W - PAD_R} y2={yZero} stroke="var(--line)" strokeWidth={1} />

      {/* z-score series */}
      <path d={path} fill="none" stroke="var(--accent)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />

      {/* latest-value marker */}
      <circle cx={xOfLast} cy={yOf(last)} r={3.5} fill={lastTone} />

      {/* band labels */}
      <text x={W - PAD_R} y={yPos - 3} textAnchor="end" className="fill-[var(--warn)] font-mono" fontSize={9}>
        +{fmtNum(entryZ, 1)}σ
      </text>
      <text x={W - PAD_R} y={yNeg + 10} textAnchor="end" className="fill-[var(--warn)] font-mono" fontSize={9}>
        −{fmtNum(entryZ, 1)}σ
      </text>
      <text x={PAD_L} y={yZero - 3} className="fill-[var(--faint)] font-mono" fontSize={9}>
        0
      </text>
    </svg>
  );
}

/* ── Symbol input ─────────────────────────────────────────────────────────── */

function SymbolInput({
  label,
  value,
  onCommit,
}: {
  label: string;
  value: string;
  onCommit: (v: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const valid = SYM_RE.test(draft.toUpperCase());

  const commit = () => {
    const up = draft.toUpperCase();
    if (SYM_RE.test(up)) onCommit(up);
    else setDraft(value);
  };

  return (
    <div className="flex flex-col gap-1">
      <label className="kpi-label" htmlFor={`pair-sym-${label}`}>
        {label}
      </label>
      <input
        id={`pair-sym-${label}`}
        value={draft}
        spellCheck={false}
        autoComplete="off"
        onChange={(e) => setDraft(e.target.value.toUpperCase())}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
        }}
        className={cn(
          "w-24 rounded border bg-elevated/40 px-2 py-1 font-mono text-sm uppercase tabular-nums text-ink outline-none focus:border-accent/60",
          valid ? "border-line" : "border-neg/60",
        )}
      />
    </div>
  );
}

/* ── Status badge ─────────────────────────────────────────────────────────── */

function StatusBadge({ status, source, asOf }: { status: Status; source?: string; asOf?: string }) {
  if (status === "loading") {
    return (
      <span className="flex items-center gap-1.5 font-mono text-2xs uppercase tracking-wider text-dim">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-dim" /> computing…
      </span>
    );
  }
  if (status === "live") {
    return (
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1.5 rounded border border-pos/40 bg-pos/10 px-2 py-1 font-mono text-2xs uppercase tracking-wider text-pos">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pos opacity-60" />
            <span className="relative h-1.5 w-1.5 rounded-full bg-pos" />
          </span>
          ENGINE · LIVE · {source}
        </span>
        {asOf ? (
          <span className="hidden font-mono text-2xs text-dim sm:inline">
            as of {new Date(asOf).toLocaleTimeString("en-US", { hour12: false })}
          </span>
        ) : null}
      </div>
    );
  }
  return (
    <span className="flex items-center gap-1.5 rounded border border-warn/40 bg-warn/10 px-2 py-1 font-mono text-2xs uppercase tracking-wider text-warn">
      <span className="h-1.5 w-1.5 rounded-full bg-warn" /> ENGINE · DEMO DATA
    </span>
  );
}

/* ── Main panel ───────────────────────────────────────────────────────────── */

export function PairsTrade() {
  const [symA, setSymA] = useState("KO");
  const [symB, setSymB] = useState("PEP");
  const [window, setWindow] = useState<Win>(90);

  const [status, setStatus] = useState<Status>("loading");
  const [data, setData] = useState<PairData | null>(null);

  const load = useCallback(async (a: string, b: string, w: number) => {
    setStatus("loading");
    try {
      const r = await fetch(`/api/engine/pairs?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}&window=${w}`, { cache: "no-store" });
      const j = (await r.json()) as EngineResponse;
      if (j.live) {
        const { live: _live, ...rest } = j;
        void _live;
        setData(rest);
        setStatus("live");
      } else {
        setData(demoData(a, b, w));
        setStatus("demo");
      }
    } catch {
      setData(demoData(a, b, w));
      setStatus("demo");
    }
  }, []);

  useEffect(() => {
    load(symA, symB, window);
  }, [load, symA, symB, window]);

  const activePreset = (a: string, b: string) => symA === a && symB === b;

  const sig = data ? signalStyle[data.signal] : null;
  const zLast = data?.zLast ?? 0;
  const zStrong = Math.abs(zLast) > 2;
  const zTone: "pos" | "neg" | "warn" | "muted" =
    zStrong ? (zLast > 0 ? "neg" : "pos") : zLast > 0 ? "warn" : "muted";
  const hlFast = data?.halfLife !== null && data?.halfLife !== undefined && data.halfLife < 30;

  return (
    <Panel className="animate-rise">
      <PanelHeader
        title="Pairs / Stat-Arb Engine"
        sub="OLS hedge ratio, spread z-score & Ornstein-Uhlenbeck half-life — cointegration read"
        right={<StatusBadge status={status} source={data?.source} asOf={data?.asOf} />}
      />

      {/* ── Controls ── */}
      <div className="space-y-3 border-b border-line px-4 py-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {PRESETS.map(([a, b]) => (
            <button
              key={`${a}-${b}`}
              type="button"
              onClick={() => {
                setSymA(a);
                setSymB(b);
              }}
              className={cn(
                "rounded border px-2 py-1 font-mono text-2xs uppercase tracking-wider transition-colors",
                activePreset(a, b)
                  ? "border-accent/60 bg-accent/10 text-accent"
                  : "border-line bg-elevated/30 text-dim hover:border-line-strong hover:text-ink",
              )}
            >
              {a} / {b}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <SymbolInput label="A" value={symA} onCommit={setSymA} />
          <span className="pb-1.5 font-mono text-sm text-dim">vs</span>
          <SymbolInput label="B" value={symB} onCommit={setSymB} />

          <div className="flex flex-col gap-1">
            <span className="kpi-label">Window</span>
            <div className="flex gap-1 rounded border border-line bg-elevated/30 p-0.5">
              {WINDOWS.map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setWindow(w)}
                  className={cn(
                    "rounded px-2.5 py-1 font-mono text-2xs tabular-nums transition-colors",
                    window === w ? "bg-accent text-base" : "text-dim hover:text-ink",
                  )}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4">
        {/* 1) Signal banner */}
        {data && sig ? (
          <div className={cn("flex flex-wrap items-center gap-3 rounded border px-4 py-3", sig.wrap)}>
            <span className="relative flex h-2 w-2">
              {(data.signal === "LONG_SPREAD" || data.signal === "SHORT_SPREAD") && (
                <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-60", sig.dot)} />
              )}
              <span className={cn("relative inline-flex h-2 w-2 rounded-full", sig.dot)} />
            </span>
            <span className={cn("font-mono text-sm font-semibold uppercase tracking-wider", sig.text)}>
              {sig.label}
            </span>
            <span className="h-4 w-px bg-line" />
            <span className="min-w-0 flex-1 text-xs text-muted">{data.rationale}</span>
          </div>
        ) : (
          <div className="h-[52px] animate-pulse rounded border border-line bg-elevated/20" />
        )}

        {/* 2) Z-score chart */}
        <div className="rounded border border-line bg-elevated/10 p-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="section-label">
              Spread Z-Score · {data?.symA ?? symA} / {data?.symB ?? symB}
            </span>
            <div className="flex items-center gap-3 font-mono text-2xs text-dim">
              <span className="flex items-center gap-1">
                <span className="inline-block h-0.5 w-4 rounded" style={{ background: "var(--accent)" }} /> z(t)
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-px w-4 border-t border-dashed border-[var(--warn)]" /> ±entry
              </span>
            </div>
          </div>
          {data && data.zscore.length > 1 ? (
            <ZScoreChart zscore={data.zscore} entryZ={data.entryZ} />
          ) : (
            <div className="h-[220px] animate-pulse rounded bg-elevated/20" />
          )}
        </div>

        {/* 3) Stats row */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Hedge Ratio β" value={data ? fmtNum(data.hedgeRatio, 2) : "—"} tone="accent" />
          <Stat label="Return Correlation" value={data ? fmtNum(data.correlation, 2) : "—"} />
          <Stat
            label="Half-Life"
            value={
              data && data.halfLife !== null ? (
                <span className={cn(hlFast && "text-pos")}>{fmtNum(data.halfLife, 0)} bars</span>
              ) : (
                "—"
              )
            }
          />
          <Stat label="Current Z" value={data ? fmtNum(data.zLast, 2) + "σ" : "—"} tone={data ? zTone : undefined} />
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-line px-4 py-3 text-xs text-dim">
        Spread = log(A) − β·log(B). |z|&gt;2 flags a stretched spread; a short half-life means it tends to revert quickly. Cointegration is assumed, not tested — size accordingly.
      </div>
    </Panel>
  );
}
