"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Panel, PanelHeader, Chip } from "@/components/ui/kit";
import { ProgressBar } from "@/components/ui/viz";
import { composeRead, deriveInsights, type Insight } from "@/lib/engine/insights";
import type { Momentum, Trend, VolRegime } from "@/lib/engine/regime";
import { candleSeries, type Candle } from "@/lib/rng";
import { cn } from "@/lib/cn";

/* ── Types ─────────────────────────────────────────────────────────────────── */

type Status = "loading" | "live" | "demo";

interface QuoteApiResponse {
  live: boolean;
  source?: string;
  asOf?: string;
  candles?: Candle[];
}

/* ── Tone maps ─────────────────────────────────────────────────────────────── */

const TREND_CHIP: Record<Trend, "pos" | "neg" | "default"> = { UPTREND: "pos", DOWNTREND: "neg", RANGE: "default" };
const TREND_BAR: Record<Trend, string> = { UPTREND: "var(--pos)", DOWNTREND: "var(--neg)", RANGE: "var(--dim)" };
const VOL_CHIP: Record<VolRegime, "pos" | "default" | "warn" | "neg"> = { LOW: "pos", NORMAL: "default", ELEVATED: "warn", EXTREME: "neg" };
const MOM_CHIP: Record<Momentum, "accent" | "default" | "warn" | "neg"> = { ACCELERATING: "accent", STEADY: "default", FADING: "warn", REVERSING: "neg" };
const TONE_DOT: Record<Insight["tone"], string> = { pos: "bg-pos", neg: "bg-neg", warn: "bg-warn", info: "bg-accent" };

/* ── Component ─────────────────────────────────────────────────────────────── */

export function TechPanel({ symbol }: { symbol: string }) {
  const [status, setStatus] = useState<Status>("loading");
  const [liveCandles, setLiveCandles] = useState<Candle[] | null>(null);
  const [source, setSource] = useState("");
  const [updated, setUpdated] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/quote?symbol=${encodeURIComponent(symbol)}&limit=260`, { cache: "no-store" });
      const j = (await r.json()) as QuoteApiResponse;
      if (j.live && j.candles && j.candles.length > 0) {
        setLiveCandles(j.candles);
        setSource(j.source ?? "live");
        setUpdated(new Date(j.asOf ?? Date.now()).toLocaleTimeString("en-US", { hour12: false }));
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
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [load]);

  // Demo series is deterministic — the analytics below are still real math over it.
  const demoCandles = useMemo(() => candleSeries(`${symbol}-engine`, 260, 180, 0.018, 0.0006), [symbol]);
  const candles = status === "live" && liveCandles ? liveCandles : demoCandles;

  const { insights, regime } = useMemo(() => deriveInsights(symbol, candles), [symbol, candles]);
  const read = useMemo(() => composeRead(symbol, candles), [symbol, candles]);

  const rsi = regime.rsi14;
  const rsiColor = rsi < 30 ? "var(--pos)" : rsi > 70 ? "var(--warn)" : "var(--accent)";
  const rsiText = rsi < 30 ? "text-pos" : rsi > 70 ? "text-warn" : "text-accent";

  return (
    <Panel>
      <PanelHeader
        title={`Intelligence Engine — ${symbol}`}
        sub="Regime classification, ranked insights & key levels — computed live from price action"
        right={
          status === "loading" ? (
            <span className="flex items-center gap-1.5 font-mono text-2xs uppercase tracking-wider text-dim">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-dim" />
              computing…
            </span>
          ) : status === "live" ? (
            <>
              <span className="flex items-center gap-1.5 font-mono text-2xs uppercase tracking-wider text-pos">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pos opacity-60" />
                  <span className="relative h-1.5 w-1.5 rounded-full bg-pos" />
                </span>
                ENGINE · LIVE · {source}
              </span>
              <span className="hidden font-mono text-2xs text-dim sm:inline">as of {updated}</span>
            </>
          ) : (
            <span className="flex items-center gap-1.5 rounded border border-warn/40 bg-warn/10 px-2 py-1 font-mono text-2xs uppercase tracking-wider text-warn">
              <span className="h-1.5 w-1.5 rounded-full bg-warn" />
              ENGINE · DEMO DATA
            </span>
          )
        }
      />

      {/* 1 ── Regime strip */}
      <div className="grid gap-x-6 gap-y-4 border-b border-line px-4 py-4 sm:grid-cols-2 xl:grid-cols-5">
        <div>
          <div className="flex items-center justify-between">
            <span className="kpi-label">TREND</span>
            <span className="font-mono text-2xs tabular-nums text-muted">{regime.trendStrength}/100</span>
          </div>
          <div className="mt-1.5">
            <Chip tone={TREND_CHIP[regime.trend]}>{regime.trend}</Chip>
          </div>
          <div className="mt-2">
            <ProgressBar value={regime.trendStrength} max={100} color={TREND_BAR[regime.trend]} height={5} />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <span className="kpi-label">VOL REGIME</span>
            <span className="font-mono text-2xs tabular-nums text-muted">{regime.volPercentile}th pct</span>
          </div>
          <div className="mt-1.5">
            <Chip tone={VOL_CHIP[regime.volRegime]}>{regime.volRegime}</Chip>
          </div>
          <div className="mt-2 font-mono text-2xs tabular-nums text-dim">σ₂₀ {regime.realizedVol20.toFixed(1)}% ann.</div>
        </div>

        <div>
          <div className="kpi-label">MOMENTUM</div>
          <div className="mt-1.5">
            <Chip tone={MOM_CHIP[regime.momentum]}>{regime.momentum}</Chip>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <span className="kpi-label">RSI-14</span>
            <span className={cn("font-mono text-xs tabular-nums", rsiText)}>{rsi.toFixed(1)}</span>
          </div>
          <div className="relative mt-2.5 overflow-hidden rounded-full">
            <ProgressBar value={rsi} max={100} color={rsiColor} height={6} />
            <span className="pointer-events-none absolute inset-y-0 left-0 w-[30%] border-r border-pos/50 bg-pos/10" />
            <span className="pointer-events-none absolute inset-y-0 right-0 w-[30%] border-l border-warn/50 bg-warn/10" />
          </div>
          <div className="relative mt-1 h-3 font-mono text-[9px] text-dim">
            <span className="absolute left-[30%] -translate-x-1/2">30</span>
            <span className="absolute left-[70%] -translate-x-1/2">70</span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <span className="kpi-label">CONFIDENCE</span>
            <span className="font-mono text-xs tabular-nums text-accent">{regime.confidence}%</span>
          </div>
          <div className="mt-2.5">
            <ProgressBar value={regime.confidence} max={100} color="var(--accent)" height={6} />
          </div>
        </div>
      </div>

      {/* 2 ── Computed read */}
      <div className="px-4 pt-4">
        <div className="rounded border border-line bg-elevated/30 px-3 py-2.5 font-mono text-xs leading-relaxed text-muted">
          <span className="mr-2 text-accent">✦</span>
          {read}
        </div>
      </div>

      {/* 3 ── Ranked insights */}
      <div className="mt-4 divide-y divide-line border-t border-line">
        {insights.slice(0, 6).map((ins) => (
          <div key={ins.id} className="flex items-start gap-3 px-4 py-2.5">
            <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", TONE_DOT[ins.tone])} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-ink">{ins.title}</div>
              <p className="mt-0.5 text-2xs text-dim">{ins.detail}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {ins.evidence.map((ev) => (
                  <span key={ev} className="rounded border border-line px-1.5 font-mono text-[10px] text-muted">
                    {ev}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 4 ── Footer */}
      <div className="border-t border-line px-4 py-2 font-mono text-2xs text-dim">
        Deterministic analytics computed in-browser from the loaded series — no fabricated figures.
      </div>
    </Panel>
  );
}
