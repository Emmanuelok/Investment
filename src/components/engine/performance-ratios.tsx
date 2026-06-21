"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Panel, PanelHeader, Stat, Chip, Th, Td } from "@/components/ui/kit";
import { Ring, ProgressBar } from "@/components/ui/viz";
import { fmtNum, fmtPct, fmtSignedPct, signClass } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Rng } from "@/lib/rng";
import { performanceRatios, type PerfRatios } from "@/lib/engine/performance";

/* ── Types matching /api/engine/performance ────────────────────────────────── */

/** The live payload = the engine's PerfRatios plus run metadata. */
type PerfLive = PerfRatios & {
  source: string;
  asOf: string;
  symbol: string;
  rf: number;
  rfSource: string;
};

type PerfResponse = ({ live: true } & PerfLive) | { live: false };

/** What the panel renders — PerfRatios + the meta we display. */
type PerfView = PerfLive;

type Status = "loading" | "live" | "demo";

/* ── Null-safe ratio formatting ─────────────────────────────────────────────
   A vanishing denominator (no downside, no drawdown, …) returns null from the
   engine; render that honestly rather than as a bogus number. */
function fmtRatio(n: number | null, dp = 2): string {
  if (n === null) return "∞";
  return fmtNum(n, dp);
}

/* ── Tone maps (static classes only — no dynamic `text-${}`) ────────────────── */

type Tone = "pos" | "neg" | "warn" | "accent" | "muted";

/** Sharpe-style ratios: ≥1 strong, 0–1 modest, <0 negative. null ⇒ "∞" ⇒ strong. */
function ratioTone(n: number | null): Tone {
  if (n === null) return "pos";
  if (n >= 1) return "pos";
  if (n >= 0) return "warn";
  return "neg";
}

const RATIO_TEXT: Record<Tone, string> = {
  pos: "text-pos",
  neg: "text-neg",
  warn: "text-warn",
  accent: "text-accent",
  muted: "text-muted",
};

/** A one-word verdict for the Sharpe headline read. */
function sharpeVerdict(s: number): string {
  if (s >= 1) return "strong";
  if (s >= 0.5) return "adequate";
  if (s >= 0) return "weak";
  return "poor";
}

/** Skew: positive = right-tailed (good), negative = left-tailed (bad). */
function skewTone(s: number): Tone {
  if (s > 0.05) return "pos";
  if (s < -0.05) return "neg";
  return "muted";
}

/** Excess kurtosis: high ⇒ fat tails (warn). */
function kurtTone(k: number): Tone {
  return k > 1 ? "warn" : "muted";
}

/** Tail ratio: >1 favorable, <1 unfavorable. null ⇒ "—". */
function tailTone(t: number | null): Tone {
  if (t === null) return "muted";
  if (t > 1.02) return "pos";
  if (t < 0.98) return "neg";
  return "muted";
}

/* ── Demo: a seeded ~600-day close walk with drift + an injected drawdown ────
   The drawdown guarantees Calmar/Sortino are non-null, exercising the null
   paths' happy case while still showing real numbers. Same engine math as live. */
const DEMO_RF = 0.045;

function buildDemo(symbol: string): PerfView {
  const r = new Rng(`${symbol}-perf`);
  const N = 600;
  const closes: number[] = [100];
  for (let i = 1; i < N; i++) {
    // mild positive drift (~+0.05%/day), realistic ~1%/day vol …
    let drift = 0.0005;
    // … with a sustained ~60-day slide so there is a real drawdown to recover from.
    if (i >= 260 && i < 320) drift = -0.004;
    const shock = r.gauss(drift, 0.01);
    closes.push(Math.max(0.01, closes[i - 1] * (1 + shock)));
  }
  const ratios = performanceRatios(closes, { rf: DEMO_RF, periodsPerYear: 252 });
  return {
    ...ratios,
    source: "demo·seeded-walk",
    asOf: new Date().toISOString(),
    symbol,
    rf: DEMO_RF,
    rfSource: "demo",
  };
}

/* ── Panel ──────────────────────────────────────────────────────────────────── */

export function PerformanceRatios({ symbol }: { symbol: string }) {
  const [status, setStatus] = useState<Status>("loading");
  const [view, setView] = useState<PerfView | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const r = await fetch(`/api/engine/performance?symbol=${encodeURIComponent(symbol)}`, { cache: "no-store" });
      const j = (await r.json()) as PerfResponse;
      if (j.live) {
        setView({
          totalReturn: j.totalReturn,
          cagr: j.cagr,
          annReturn: j.annReturn,
          annVol: j.annVol,
          sharpe: j.sharpe,
          sortino: j.sortino,
          calmar: j.calmar,
          omega: j.omega,
          gainToPain: j.gainToPain,
          tailRatio: j.tailRatio,
          maxDrawdown: j.maxDrawdown,
          winRate: j.winRate,
          bestDay: j.bestDay,
          worstDay: j.worstDay,
          skew: j.skew,
          kurtosis: j.kurtosis,
          observations: j.observations,
          source: j.source,
          asOf: j.asOf,
          symbol: j.symbol,
          rf: j.rf,
          rfSource: j.rfSource,
        });
        setStatus("live");
      } else {
        setView(buildDemo(symbol));
        setStatus("demo");
      }
    } catch {
      setView(buildDemo(symbol));
      setStatus("demo");
    }
  }, [symbol]);

  useEffect(() => {
    load();
  }, [load]);

  const asOf = useMemo(() => {
    if (status !== "live" || !view?.asOf) return "";
    return new Date(view.asOf).toLocaleTimeString("en-US", { hour12: false });
  }, [status, view]);

  // Sharpe normalized into a 0..1 ring fill (cap at 3 so a stellar Sharpe doesn't overflow).
  const sharpeRing = view ? Math.max(0, Math.min(1, view.sharpe / 3)) : 0;
  const sharpeColor = view ? (view.sharpe >= 1 ? "var(--pos)" : view.sharpe >= 0 ? "var(--warn)" : "var(--neg)") : "var(--line)";

  return (
    <Panel className="animate-rise">
      <PanelHeader
        title={`Performance Ratios Engine — ${symbol}`}
        sub="Sharpe / Sortino / Calmar / Omega & return-distribution shape — full-period, from real returns"
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
                ENGINE · LIVE · {view?.source}
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
              aria-label="Refresh performance ratios"
            >
              ↻
            </button>
          </div>
        }
      />

      {!view ? (
        <div className="grid h-64 place-items-center font-mono text-2xs uppercase tracking-wider text-dim">computing…</div>
      ) : (
        <>
          {/* ── Hero: CAGR + vol + Sharpe gauges + one-line read ── */}
          <div className="grid grid-cols-1 gap-px border-b border-line bg-line lg:grid-cols-[minmax(0,1fr)_minmax(0,300px)]">
            <div className="space-y-3 bg-base p-4">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className={cn("font-mono text-4xl font-semibold leading-none tracking-tight", signClass(view.cagr))}>
                  {fmtSignedPct(view.cagr * 100, 1)}
                </span>
                <span className="text-sm text-dim">CAGR</span>
                <span className="ml-1 font-mono text-lg text-muted">{fmtPct(view.annVol * 100, 1)}</span>
                <span className="text-sm text-dim">annualized vol</span>
              </div>

              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="kpi-label">Sharpe</span>
                <span className={cn("font-mono text-2xl font-semibold leading-none", RATIO_TEXT[ratioTone(view.sharpe)])}>
                  {fmtNum(view.sharpe, 2)}
                </span>
                <span className="text-xs text-dim">excess return per unit of total risk</span>
              </div>

              <p className="text-sm text-muted">
                {fmtPct(view.cagr * 100, 1)} CAGR at {fmtPct(view.annVol * 100, 1)} vol — Sharpe{" "}
                <span className={cn("font-mono", RATIO_TEXT[ratioTone(view.sharpe)])}>{fmtNum(view.sharpe, 2)}</span> (
                {sharpeVerdict(view.sharpe)} risk-adjusted return).
              </p>

              {/* Win-rate gauge */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-baseline justify-between">
                  <span className="kpi-label">Win rate · daily</span>
                  <span className="font-mono text-xs text-muted">{fmtPct(view.winRate * 100, 1)}</span>
                </div>
                <ProgressBar
                  value={view.winRate * 100}
                  max={100}
                  color={view.winRate >= 0.5 ? "var(--pos)" : "var(--warn)"}
                  height={6}
                />
              </div>
            </div>

            {/* Sharpe ring */}
            <div className="flex flex-col items-center justify-center gap-2 bg-base p-4">
              <Ring
                value={sharpeRing}
                max={1}
                size={120}
                stroke={9}
                color={sharpeColor}
                label={fmtNum(view.sharpe, 2)}
                sub="Sharpe"
              />
              <span className="font-mono text-2xs uppercase tracking-wider text-dim">0 — 3 scale</span>
            </div>
          </div>

          {/* ── Risk-adjusted ratios deck ── */}
          <div className="border-b border-line px-4 py-3">
            <div className="section-label mb-3 text-[11px] text-muted">Risk-Adjusted Ratios</div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Stat label="Sharpe" value={fmtNum(view.sharpe, 2)} tone={ratioTone(view.sharpe)} />
              <Stat
                label="Sortino"
                value={fmtRatio(view.sortino)}
                tone={view.sortino === null ? "muted" : ratioTone(view.sortino)}
              />
              <Stat
                label="Calmar"
                value={view.calmar === null ? "—" : fmtNum(view.calmar, 2)}
                tone={view.calmar === null ? "muted" : ratioTone(view.calmar)}
              />
              <Stat label="Omega" value={view.omega === null ? "—" : fmtNum(view.omega, 2)} tone="accent" />
            </div>
          </div>

          {/* ── Return / risk deck ── */}
          <div className="border-b border-line px-4 py-3">
            <div className="section-label mb-3 text-[11px] text-muted">Return &amp; Risk</div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
              <Stat label="Total Return" value={fmtSignedPct(view.totalReturn * 100, 1)} tone={view.totalReturn >= 0 ? "pos" : "neg"} />
              <Stat label="CAGR" value={fmtSignedPct(view.cagr * 100, 1)} tone={view.cagr >= 0 ? "pos" : "neg"} />
              <Stat label="Ann. Return" value={fmtSignedPct(view.annReturn * 100, 1)} tone={view.annReturn >= 0 ? "pos" : "neg"} />
              <Stat label="Ann. Vol" value={fmtPct(view.annVol * 100, 1)} tone="accent" />
              <Stat label="Max Drawdown" value={fmtPct(view.maxDrawdown * 100, 1)} tone="neg" />
              <Stat label="Win Rate" value={fmtPct(view.winRate * 100, 1)} tone={view.winRate >= 0.5 ? "pos" : "warn"} />
            </div>
          </div>

          {/* ── Distribution block ── */}
          <div className="px-4 py-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="section-label text-[11px] text-muted">Return Distribution</div>
              <span className="font-mono text-2xs text-dim">{fmtNum(view.observations, 0)} daily returns</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse">
                <thead>
                  <tr>
                    <Th>Metric</Th>
                    <Th right>Value</Th>
                    <Th>Read</Th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="hover:bg-elevated/40 transition-colors">
                    <Td className="text-muted">Skew</Td>
                    <Td right className={RATIO_TEXT[skewTone(view.skew)]}>{fmtNum(view.skew, 2)}</Td>
                    <Td mono={false} className="text-xs text-dim">
                      {view.skew >= 0 ? "right-tailed — upside-biased" : "left-tailed — crash-prone"}
                    </Td>
                  </tr>
                  <tr className="hover:bg-elevated/40 transition-colors">
                    <Td className="text-muted">Excess Kurtosis</Td>
                    <Td right className={RATIO_TEXT[kurtTone(view.kurtosis)]}>{fmtNum(view.kurtosis, 2)}</Td>
                    <Td mono={false} className="text-xs text-dim">
                      {view.kurtosis > 1 ? "fat tails — outlier-prone" : "near-normal tails"}
                    </Td>
                  </tr>
                  <tr className="hover:bg-elevated/40 transition-colors">
                    <Td className="text-muted">Tail Ratio</Td>
                    <Td right className={RATIO_TEXT[tailTone(view.tailRatio)]}>{view.tailRatio === null ? "—" : fmtNum(view.tailRatio, 2)}</Td>
                    <Td mono={false} className="text-xs text-dim">
                      {view.tailRatio === null
                        ? "undefined — no left tail"
                        : view.tailRatio >= 1
                          ? "favorable — gains exceed losses at the extremes"
                          : "unfavorable — losses exceed gains at the extremes"}
                    </Td>
                  </tr>
                  <tr className="hover:bg-elevated/40 transition-colors">
                    <Td className="text-muted">Gain-to-Pain</Td>
                    <Td right className={view.gainToPain === null ? "text-muted" : RATIO_TEXT[ratioTone(view.gainToPain)]}>
                      {view.gainToPain === null ? "∞" : fmtNum(view.gainToPain, 2)}
                    </Td>
                    <Td mono={false} className="text-xs text-dim">sum of gains ÷ sum of losses</Td>
                  </tr>
                  <tr className="hover:bg-elevated/40 transition-colors">
                    <Td className="text-muted">Best / Worst Day</Td>
                    <Td right>
                      <span className={signClass(view.bestDay)}>{fmtSignedPct(view.bestDay * 100, 2)}</span>
                      <span className="text-faint"> / </span>
                      <span className={signClass(view.worstDay)}>{fmtSignedPct(view.worstDay * 100, 2)}</span>
                    </Td>
                    <Td mono={false} className="text-xs text-dim">single-session extremes</Td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Risk-free note — Sharpe & Sortino are measured net of this. */}
            <div className="mt-3 flex items-center gap-2">
              <Chip tone="info">
                risk-free {fmtPct(view.rf * 100, 2)} · {view.rfSource}
              </Chip>
              <span className="text-2xs text-dim">Sharpe &amp; Sortino are computed on excess return over this rate.</span>
            </div>
          </div>

          <div className="border-t border-line px-4 py-2.5 font-mono text-2xs text-faint">
            Sharpe uses excess return over the risk-free rate; Sortino penalizes only downside deviation; Calmar = CAGR ÷
            max drawdown; Omega and tail ratio capture the full return distribution. Full-period stats over ~3y of daily
            returns. Source: Stooq + FRED.
          </div>
        </>
      )}
    </Panel>
  );
}
