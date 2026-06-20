"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Panel, PanelHeader, Stat, Th, Td } from "@/components/ui/kit";
import { ProgressBar } from "@/components/ui/viz";
import { fmtNum, fmtSigned, signClass } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Rng } from "@/lib/rng";
import { analyzeEfficiency, type EfficiencyResult } from "@/lib/engine/efficiency";

/* ── Types matching /api/engine/efficiency ─────────────────────────────────── */

type Status = "loading" | "live" | "demo";

/** Live response carries every EfficiencyResult field plus the wrapper meta. */
type LiveResponse =
  | ({
      live: true;
      source: string;
      asOf: string;
      symbol: string;
      bars: number;
    } & EfficiencyResult)
  | { live: false };

/** Rendered shape — the computed engine result plus a bar count + provenance. */
type EfficiencyData = EfficiencyResult & {
  bars: number;
  source: string;
  asOf: string;
};

/* ── Classification presentation ───────────────────────────────────────────── */

const CLASS_META: Record<
  EfficiencyResult["classification"],
  { color: string; meaning: string }
> = {
  Trending: { color: "text-pos", meaning: "momentum strategies favored — moves persist" },
  "Mean-reverting": { color: "text-warn", meaning: "fade extremes — moves revert" },
  "Random walk": { color: "text-dim", meaning: "no exploitable serial structure" },
};

/* ── Hurst scale (0..1 with a 0.5 random-walk reference mark) ──────────────── */

function HurstScale({ hurst }: { hurst: number }) {
  const clamped = Math.max(0, Math.min(1, hurst));
  // > 0.5 trending (pos), < 0.5 mean-reverting (warn), ≈ 0.5 random walk (accent).
  const color = hurst > 0.53 ? "var(--pos)" : hurst < 0.47 ? "var(--warn)" : "var(--accent)";
  return (
    <div className="space-y-1.5" aria-label={`Hurst exponent ${hurst.toFixed(3)} on a 0 to 1 scale; 0.5 is the random-walk midpoint`}>
      <div className="relative">
        <ProgressBar value={clamped} max={1} color={color} height={8} />
        {/* 0.5 random-walk reference tick */}
        <span className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-line-strong" />
        {/* value marker */}
        <span
          className="pointer-events-none absolute top-1/2 h-2.5 w-0.5 -translate-y-1/2 rounded-full bg-ink"
          style={{ left: `${clamped * 100}%` }}
        />
      </div>
      <div className="relative h-3 font-mono text-[9px] text-faint">
        <span className="absolute left-0">0.0 revert</span>
        <span className="absolute left-1/2 -translate-x-1/2 text-dim">0.5 random</span>
        <span className="absolute right-0">trend 1.0</span>
      </div>
    </div>
  );
}

/* ── Per-metric tone helpers (small deadbands, matching the engine vote eps) ── */

const hurstTone = (h: number): "pos" | "warn" | "muted" => (h > 0.53 ? "pos" : h < 0.47 ? "warn" : "muted");
const hurstTextClass = (h: number): string => (h > 0.53 ? "text-pos" : h < 0.47 ? "text-warn" : "text-muted");
const vrTone = (vr: number): "pos" | "warn" | "muted" => (vr > 1.05 ? "pos" : vr < 0.95 ? "warn" : "muted");

/** Variance-ratio vs-random-walk read for the term-structure table. */
function vrRead(vr: number): { label: string; cls: string } {
  if (vr > 1.05) return { label: "trending", cls: "text-pos" };
  if (vr < 0.95) return { label: "mean-reverting", cls: "text-warn" };
  return { label: "efficient", cls: "text-dim" };
}

/** Qualitative signal strength from the −3..+3 vote score. */
function signalLabel(votes: number): { word: string; cls: string } {
  const mag = Math.abs(votes);
  const word = mag >= 3 ? "strong" : mag === 2 ? "moderate" : mag === 1 ? "weak" : "neutral";
  const cls = votes > 0 ? "text-pos" : votes < 0 ? "text-warn" : "text-muted";
  return { word, cls };
}

/* ── Demo data ─────────────────────────────────────────────────────────────── */

/**
 * Build a deterministic, clearly-TRENDING close series (~500 points) from an
 * AR(1) process on returns (φ≈0.42, positive drift) using a seeded LCG, then run
 * the real efficiency engine over it. Positive serial correlation pushes Hurst,
 * VR(q) and lag-1 autocorrelation all to the trending side — same math as live,
 * only the price source differs.
 */
function buildDemo(symbol: string): EfficiencyData {
  const rng = new Rng(`${symbol}-efficiency`);
  const N = 500;
  const phi = 0.42; // AR(1) coefficient on returns → persistence
  const drift = 0.0004;
  const sigma = 0.009;
  const closes: number[] = [100];
  let r = 0; // previous return
  for (let i = 1; i < N; i++) {
    r = drift + phi * (r - drift) + rng.gauss(0, sigma);
    closes.push(Math.max(0.01, closes[i - 1] * (1 + r)));
  }
  const result = analyzeEfficiency(closes);
  return { ...result, bars: N, source: "demo·AR(1)", asOf: new Date().toISOString() };
}

/* ── Component ─────────────────────────────────────────────────────────────── */

export function EfficiencyPanel({ symbol }: { symbol: string }) {
  const [status, setStatus] = useState<Status>("loading");
  const [live, setLive] = useState<EfficiencyData | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await fetch(`/api/engine/efficiency?symbol=${encodeURIComponent(symbol)}`, { cache: "no-store" });
      const j = (await res.json()) as LiveResponse;
      if (j.live) {
        setLive({
          hurst: j.hurst,
          vr2: j.vr2,
          vr5: j.vr5,
          vr10: j.vr10,
          ac1: j.ac1,
          classification: j.classification,
          votes: j.votes,
          nObs: j.nObs,
          bars: j.bars,
          source: j.source,
          asOf: j.asOf,
        });
        setStatus("live");
      } else {
        setStatus("demo");
      }
    } catch {
      setStatus("demo");
    }
  }, [symbol]);

  useEffect(() => {
    load();
  }, [load]);

  // Deterministic demo fallback — the analytics are real math over the series.
  const demo = useMemo(() => buildDemo(symbol), [symbol]);
  const data = status === "live" && live ? live : demo;

  const asOf = useMemo(() => {
    if (status !== "live" || !live?.asOf) return "";
    return new Date(live.asOf).toLocaleTimeString("en-US", { hour12: false });
  }, [status, live]);

  const meta = CLASS_META[data.classification];
  const signal = signalLabel(data.votes);
  const vrRows: { q: number; vr: number }[] = [
    { q: 2, vr: data.vr2 },
    { q: 5, vr: data.vr5 },
    { q: 10, vr: data.vr10 },
  ];

  return (
    <Panel className="animate-rise">
      <PanelHeader
        title={`Market Efficiency Engine — ${symbol}`}
        sub="Hurst, variance ratios & autocorrelation vote on trend vs mean-reversion — computed, not curve-fit"
        right={
          <div className="flex items-center gap-2">
            {status === "loading" ? (
              <span className="flex items-center gap-1.5 font-mono text-2xs uppercase tracking-wider text-dim">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-dim" /> computing…
              </span>
            ) : status === "live" ? (
              <span className="flex items-center gap-1.5 rounded border border-pos/40 bg-pos/10 px-2 py-1 font-mono text-2xs uppercase tracking-wider text-pos">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pos opacity-60" />
                  <span className="relative h-1.5 w-1.5 rounded-full bg-pos" />
                </span>
                ENGINE · LIVE · {data.source}
                {asOf ? <span className="text-pos/70">· {asOf}</span> : null}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 rounded border border-warn/40 bg-warn/10 px-2 py-1 font-mono text-2xs uppercase tracking-wider text-warn">
                <span className="h-1.5 w-1.5 rounded-full bg-warn" /> ENGINE · DEMO DATA
              </span>
            )}
            <button
              onClick={load}
              disabled={status === "loading"}
              className="grid h-7 w-7 place-items-center rounded border border-line font-mono text-sm text-dim hover:border-line-strong hover:text-ink disabled:opacity-40"
              aria-label="Refresh market efficiency"
            >
              ↻
            </button>
          </div>
        }
      />

      {status === "loading" ? (
        <div className="grid h-64 place-items-center font-mono text-2xs uppercase tracking-wider text-dim">computing…</div>
      ) : (
        <>
          {/* 1 ── Hero: classification + Hurst scale */}
          <div className="grid grid-cols-1 gap-px border-b border-line bg-line lg:grid-cols-[minmax(0,1fr)_minmax(0,300px)]">
            <div className="flex flex-col justify-center gap-2 bg-base px-4 py-5">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className={cn("font-mono text-3xl font-semibold leading-none tracking-tight", meta.color)}>
                  {data.classification}
                </span>
                <span className="text-sm text-dim">{meta.meaning}</span>
              </div>
              <div className="mt-1 flex items-center gap-2 font-mono text-2xs text-faint">
                <span>
                  3-way vote{" "}
                  <span className={signal.cls}>
                    {fmtSigned(data.votes, 0)} · {signal.word}
                  </span>
                </span>
                <span>·</span>
                <span>n={data.nObs} returns</span>
              </div>
            </div>

            <div className="flex flex-col justify-center gap-2 bg-base px-4 py-5">
              <div className="flex items-baseline justify-between">
                <span className="kpi-label">HURST EXPONENT (R/S)</span>
                <span className={cn("font-mono text-xl tabular-nums", hurstTextClass(data.hurst))}>
                  {fmtNum(data.hurst, 3)}
                </span>
              </div>
              <HurstScale hurst={data.hurst} />
            </div>
          </div>

          {/* 2 ── Metrics deck */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 border-b border-line px-4 py-4 sm:grid-cols-4">
            <Stat label="HURST (H)" tone={hurstTone(data.hurst)} value={fmtNum(data.hurst, 3)} />
            <Stat
              label="VARIANCE RATIO · VR(10)"
              tone={vrTone(data.vr10)}
              value={
                <span className="flex items-baseline gap-1.5">
                  <span>{fmtNum(data.vr10, 2)}</span>
                  <span className="text-2xs text-faint">vs 1.0</span>
                </span>
              }
            />
            <Stat
              label="LAG-1 AUTOCORRELATION"
              value={<span className={signClass(data.ac1)}>{fmtSigned(data.ac1, 3)}</span>}
            />
            <Stat
              label="SIGNAL STRENGTH"
              value={
                <span className="flex items-baseline gap-1.5">
                  <span className={signal.cls}>{fmtSigned(data.votes, 0)}</span>
                  <span className={cn("text-2xs uppercase tracking-wider", signal.cls)}>{signal.word}</span>
                </span>
              }
            />
          </div>

          {/* 3 ── Variance-ratio term structure */}
          <div className="px-4 py-4">
            <div className="mb-2 kpi-label">VARIANCE-RATIO TERM STRUCTURE</div>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <Th>Horizon q</Th>
                  <Th right>VR(q)</Th>
                  <Th right>vs random walk</Th>
                </tr>
              </thead>
              <tbody>
                {vrRows.map(({ q, vr }) => {
                  const read = vrRead(vr);
                  return (
                    <tr key={q} className="hover:bg-elevated/40">
                      <Td className="text-muted">q = {q}</Td>
                      <Td right className={cn("text-ink", vr > 1.05 ? "text-pos" : vr < 0.95 ? "text-warn" : "text-ink")}>
                        {fmtNum(vr, 3)}
                      </Td>
                      <Td right className={read.cls}>
                        {read.label}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* 4 ── Footer */}
      <div className="border-t border-line px-4 py-2.5 font-mono text-2xs text-faint">
        Hurst R/S, Lo-MacKinlay variance ratios and lag-1 autocorrelation each test for serial structure in returns; a
        3-way vote sets the regime. H&gt;0.5 / VR&gt;1 ⇒ trending (momentum), H&lt;0.5 / VR&lt;1 ⇒ mean-reverting (fade).
        Source: Stooq daily closes.
      </div>
    </Panel>
  );
}
