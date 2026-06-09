"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Panel, PanelHeader, Chip, Th, Td, Stat } from "@/components/ui/kit";
import { ProgressBar } from "@/components/ui/viz";
import { Icon } from "@/components/icon-map";
import { fmtSigned, fmtSignedPct, signClass } from "@/lib/format";
import { cn } from "@/lib/cn";
import { classifyRegime, type Trend, type VolRegime } from "@/lib/engine/regime";
import { deriveInsights, type Insight } from "@/lib/engine/insights";
import { MARKET_INDICES, SPY_CANDLES, SECTORS } from "@/lib/data/obsidian";
import type { MarketsLive, MarketsResponse } from "@/lib/markets/types";

type Status = "loading" | "live" | "demo";
type ChipTone = "default" | "accent" | "pos" | "neg" | "warn";

const TREND_TONE: Record<Trend, ChipTone> = { UPTREND: "pos", DOWNTREND: "neg", RANGE: "default" };
const TREND_BAR: Record<Trend, string> = { UPTREND: "var(--pos)", DOWNTREND: "var(--neg)", RANGE: "var(--dim)" };
const VOL_TONE: Record<VolRegime, ChipTone> = { LOW: "pos", NORMAL: "default", ELEVATED: "warn", EXTREME: "neg" };
const DOT: Record<Insight["tone"], string> = { pos: "bg-pos", neg: "bg-neg", warn: "bg-warn", info: "bg-info" };

export function MarketIntel() {
  const [status, setStatus] = useState<Status>("loading");
  const [data, setData] = useState<MarketsLive | null>(null);
  const [updated, setUpdated] = useState<string>("");

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/markets", { cache: "no-store" });
      const j = (await r.json()) as MarketsResponse;
      if (j.live) { setData(j); setStatus("live"); setUpdated(new Date(j.asOf).toLocaleTimeString("en-US", { hour12: false })); }
      else setStatus("demo");
    } catch { setStatus("demo"); }
  }, []);

  useEffect(() => { load(); const id = setInterval(load, 60_000); return () => clearInterval(id); }, [load]);

  // live data when present, else the demo arrays (clearly badged)
  const spyCandles = data?.spy.candles?.length ? data.spy.candles : SPY_CANDLES;
  const sectors = data?.sectors?.length ? data.sectors : SECTORS;
  const indices = data?.indices?.length ? data.indices : MARKET_INDICES;

  // (a) market regime — real classifier on the loaded SPY series
  const regime = useMemo(() => classifyRegime(spyCandles), [spyCandles]);

  // (b) real breadth from the sector array
  const breadth = useMemo(() => {
    const advancing = sectors.filter((s) => s.chgPct > 0).length;
    const declining = sectors.length - advancing;
    const avgMove = sectors.reduce((sum, s) => sum + s.chgPct, 0) / (sectors.length || 1);
    const best = sectors.reduce((acc, s) => (s.chgPct > acc.chgPct ? s : acc), sectors[0]);
    const worst = sectors.reduce((acc, s) => (s.chgPct < acc.chgPct ? s : acc), sectors[0]);
    return { advancing, declining, avgMove, best, worst };
  }, [sectors]);

  // (c) top-4 ranked, evidence-backed insights
  const insights = useMemo(() => deriveInsights("SPY", spyCandles).insights.slice(0, 4), [spyCandles]);

  // (d) cross-asset table from the loaded indices — 1D chg + YTD
  const assets = useMemo(
    () => indices.map((i) => ({ sym: i.sym, name: i.name, last: i.last, chg: i.chg, chgPct: i.chgPct, ytd: i.ytd })),
    [indices],
  );

  return (
    <Panel>
      <PanelHeader
        title="Market Intelligence Engine"
        sub="Regime, sector breadth & ranked insights — computed from the loaded market state"
        right={
          status === "loading" ? (
            <span className="flex items-center gap-1.5 font-mono text-2xs uppercase tracking-wider text-dim"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-dim" /> computing…</span>
          ) : status === "live" ? (
            <>
              <span className="flex items-center gap-1.5 font-mono text-2xs uppercase tracking-wider text-pos">
                <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pos opacity-60" /><span className="relative h-1.5 w-1.5 rounded-full bg-pos" /></span>
                ENGINE · LIVE · {data?.source}
              </span>
              <span className="hidden font-mono text-2xs text-dim sm:inline">as of {updated}</span>
            </>
          ) : (
            <span className="flex items-center gap-1.5 rounded border border-warn/40 bg-warn/10 px-2 py-1 font-mono text-2xs uppercase tracking-wider text-warn"><Icon name="warn" width={12} height={12} /> ENGINE · DEMO DATA</span>
          )
        }
      />

      {/* Row 1 — regime read */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-4 border-b border-line px-4 py-3 sm:grid-cols-3 lg:grid-cols-5">
        <div>
          <div className="kpi-label">Trend</div>
          <div className="mt-1.5"><Chip tone={TREND_TONE[regime.trend]}>{regime.trend}</Chip></div>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1"><ProgressBar value={regime.trendStrength} color={TREND_BAR[regime.trend]} height={4} /></div>
            <span className="font-mono text-2xs tabular-nums text-dim">{regime.trendStrength}</span>
          </div>
        </div>
        <div>
          <div className="kpi-label">Vol Regime</div>
          <div className="mt-1.5"><Chip tone={VOL_TONE[regime.volRegime]}>{regime.volRegime}</Chip></div>
          <div className="mt-2 font-mono text-2xs text-dim">σ₂₀ {regime.realizedVol20.toFixed(1)}% · {regime.volPercentile}th pct</div>
        </div>
        <div>
          <div className="kpi-label">Momentum</div>
          <div className="mt-1.5"><Chip>{regime.momentum}</Chip></div>
        </div>
        <div>
          <div className="kpi-label">RSI-14</div>
          <div className={cn("mt-1.5 font-mono text-lg leading-none tabular-nums", regime.rsi14 >= 70 ? "text-warn" : regime.rsi14 <= 30 ? "text-pos" : "text-ink")}>{regime.rsi14.toFixed(1)}</div>
        </div>
        <div>
          <div className="kpi-label">Confidence</div>
          <div className="mt-1.5 font-mono text-lg leading-none tabular-nums text-accent">{regime.confidence}%</div>
          <div className="mt-2"><ProgressBar value={regime.confidence} color="var(--accent)" height={4} /></div>
        </div>
      </div>

      {/* Row 2 — sector breadth */}
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3 border-b border-line px-4 py-3">
        <div className="min-w-[240px] flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <div className="kpi-label">Sector Breadth</div>
            <span className="font-mono text-xs text-ink">{breadth.advancing} <span className="text-dim">of {sectors.length} sectors advancing</span></span>
          </div>
          <div className="mt-2"><ProgressBar value={breadth.advancing} max={sectors.length} color="var(--pos)" track="rgb(var(--c-neg) / 0.35)" height={8} /></div>
          <div className="mt-1.5 flex justify-between font-mono text-2xs"><span className="text-pos">{breadth.advancing} advancing</span><span className="text-neg">{breadth.declining} declining</span></div>
        </div>
        <Stat label="Avg Move" value={fmtSignedPct(breadth.avgMove)} tone={breadth.avgMove > 0 ? "pos" : breadth.avgMove < 0 ? "neg" : "muted"} />
        <div>
          <div className="kpi-label">Leader</div>
          <div className="mt-1"><Chip tone="pos">{breadth.best.name} {fmtSignedPct(breadth.best.chgPct)}</Chip></div>
        </div>
        <div>
          <div className="kpi-label">Laggard</div>
          <div className="mt-1"><Chip tone="neg">{breadth.worst.name} {fmtSignedPct(breadth.worst.chgPct)}</Chip></div>
        </div>
      </div>

      {/* Row 3 — ranked insights */}
      <div className="border-b border-line">
        <div className="px-4 pt-3"><div className="kpi-label">Ranked Insights — SPY</div></div>
        <ul className="divide-y divide-line/60">
          {insights.map((ins) => (
            <li key={ins.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2.5">
              <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", DOT[ins.tone])} />
              <span className="text-sm font-medium text-ink">{ins.title}</span>
              <span className="flex flex-wrap gap-1.5 sm:ml-auto">
                {ins.evidence.map((ev) => (
                  <span key={ev} className="rounded border border-line bg-elevated/70 px-1.5 py-0.5 font-mono text-2xs text-muted">{ev}</span>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Row 4 — cross-asset read */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse">
          <thead><tr><Th>Cross-Asset</Th><Th right>Last</Th><Th right>1D Δ</Th><Th right>1D %</Th><Th right>YTD</Th></tr></thead>
          <tbody>
            {assets.map((a) => (
              <tr key={a.sym} className="hover:bg-elevated/40">
                <Td mono={false}>
                  <span className="font-mono text-xs font-medium text-ink">{a.sym}</span>
                  <span className="ml-2 text-2xs text-dim">{a.name}</span>
                </Td>
                <Td right>{a.last.toLocaleString("en-US", { maximumFractionDigits: a.last > 1000 ? 1 : 2 })}</Td>
                <Td right className={signClass(a.chg)}>{fmtSigned(a.chg)}</Td>
                <Td right className={signClass(a.chgPct)}>{fmtSignedPct(a.chgPct)}</Td>
                <Td right className={signClass(a.ytd)}>{fmtSignedPct(a.ytd)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
