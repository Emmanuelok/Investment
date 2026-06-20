"use client";

import { useEffect, useMemo, useState } from "react";
import { Panel, PanelHeader, Chip, Stat } from "@/components/ui/kit";
import { cn } from "@/lib/cn";
import { candleSeries, type Candle } from "@/lib/rng";
import { classifyRegime, type Regime } from "@/lib/engine/regime";
import { classifyMacroRegime, type MacroReport } from "@/lib/engine/macro";
import { factorScores } from "@/lib/engine/score";
import { detectAnomalies, type Anomaly } from "@/lib/engine/anomaly";
import type { MarketsResponse } from "@/lib/markets/types";

type SectionState = "demo" | "live";
type FactorLeader = { sym: string; composite: number; trend: number; momentum: number };
type AnomHit = Anomaly & { symbol: string };

const UNIVERSE = ["NVDA", "AAPL", "MSFT", "AMZN", "META", "GOOGL", "TSLA", "AMD", "AVGO", "JPM", "XOM", "LLY"];

/* ── deterministic local fallback (real engine math on seeded series) ─────── */
function localBrief() {
  const spy: Candle[] = candleSeries("SPY-brief", 220, 520, 0.011, 0.0005);
  const regime = classifyRegime(spy);
  const macro = classifyMacroRegime({ growthScore: 18, inflationScore: -22, curveSlope: -0.43, unemploymentTrend: 0.3 });
  const sectorMoves = candleSeries("brief-sectors", 11, 0, 0.5, 0).map((c) => c.c - 0); // ~N(0) wiggle
  const advancing = sectorMoves.filter((v) => v > 0).length;
  const leaders: FactorLeader[] = UNIVERSE.map((s) => {
    const f = factorScores(candleSeries(s + "-brief", 252, 100, 0.02, 0.0004));
    return { sym: s, composite: f.composite, trend: f.trend, momentum: f.momentum };
  }).sort((a, b) => b.composite - a.composite).slice(0, 4);
  const anomalies: AnomHit[] = UNIVERSE.slice(0, 8).flatMap((s, i) => {
    const c = candleSeries(s + "-briefan", 90, 100, 0.02, 0.0004);
    if (i % 3 === 0) { const last = c[c.length - 1], prev = c[c.length - 2]; c[c.length - 1] = { ...last, v: last.v * 9, o: prev.c * (i % 2 ? 1.05 : 0.95) }; }
    return detectAnomalies(c).map((a) => ({ ...a, symbol: s }));
  }).sort((a, b) => b.severity - a.severity).slice(0, 4);
  return { regime, macro, advancing, leaders, anomalies };
}

function posture(regime: Regime, recessionRisk: number, advancing: number): number {
  let p = 50;
  p += regime.trend === "UPTREND" ? Math.min(22, regime.trendStrength * 0.25) : regime.trend === "DOWNTREND" ? -Math.min(22, regime.trendStrength * 0.25) : 0;
  p += (advancing - 5.5) * 2.2;
  p -= recessionRisk * 0.28;
  p -= regime.volRegime === "EXTREME" ? 14 : regime.volRegime === "ELEVATED" ? 6 : 0;
  return Math.max(2, Math.min(98, Math.round(p)));
}

export function IntelBriefing() {
  const base = useMemo(localBrief, []);
  const [regime, setRegime] = useState<Regime>(base.regime);
  const [macro, setMacro] = useState<MacroReport>(base.macro);
  const [advancing, setAdvancing] = useState(base.advancing);
  const [leaders, setLeaders] = useState<FactorLeader[]>(base.leaders);
  const [anomalies, setAnomalies] = useState<AnomHit[]>(base.anomalies);
  const [src, setSrc] = useState<Record<string, SectionState>>({ market: "demo", macro: "demo", factor: "demo", anomaly: "demo" });
  const [updated, setUpdated] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [mk, mc, sc, an] = await Promise.allSettled([
        fetch("/api/markets", { cache: "no-store" }).then((r) => r.json() as Promise<MarketsResponse>),
        fetch("/api/engine/macro", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/engine/scan?symbols=" + UNIVERSE.join(","), { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/engine/anomaly?symbols=" + UNIVERSE.join(","), { cache: "no-store" }).then((r) => r.json()),
      ]);
      if (cancelled) return;
      const next: Record<string, SectionState> = { market: "demo", macro: "demo", factor: "demo", anomaly: "demo" };
      if (mk.status === "fulfilled" && mk.value.live) {
        setRegime(classifyRegime(mk.value.spy.candles as Candle[]));
        setAdvancing((mk.value.sectors ?? []).filter((s) => s.chgPct > 0).length);
        next.market = "live";
      }
      if (mc.status === "fulfilled" && mc.value.live) { setMacro(mc.value as MacroReport); next.macro = "live"; }
      if (sc.status === "fulfilled" && sc.value.live && Array.isArray(sc.value.rows)) {
        setLeaders(sc.value.rows.slice(0, 4).map((r: { sym: string; composite: number; trend: number; momentum: number }) => ({ sym: r.sym, composite: r.composite, trend: r.trend, momentum: r.momentum })));
        next.factor = "live";
      }
      if (an.status === "fulfilled" && an.value.live && Array.isArray(an.value.anomalies)) { setAnomalies(an.value.anomalies.slice(0, 4)); next.anomaly = "live"; }
      setSrc(next);
      setUpdated(new Date().toLocaleTimeString("en-US", { hour12: false }));
    })();
    return () => { cancelled = true; };
  }, []);

  const anyLive = Object.values(src).some((s) => s === "live");
  const score = posture(regime, macro.recessionRisk, advancing);
  const postureLabel = score >= 65 ? "RISK-ON" : score >= 45 ? "NEUTRAL" : "RISK-OFF";
  const postureTone = score >= 65 ? "text-pos" : score >= 45 ? "text-warn" : "text-neg";
  const trendTone = regime.trend === "UPTREND" ? "pos" : regime.trend === "DOWNTREND" ? "neg" : "default";

  return (
    <Panel className="animate-rise">
      <PanelHeader
        title="Intelligence Briefing"
        sub="Cross-engine market read — regime, macro, factor leaders & anomalies, fused live"
        right={
          anyLive ? (
            <span className="flex items-center gap-1.5 font-mono text-2xs uppercase tracking-wider text-pos"><span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pos opacity-60" /><span className="relative h-1.5 w-1.5 rounded-full bg-pos" /></span>LIVE · {updated}</span>
          ) : (
            <span className="flex items-center gap-1.5 rounded border border-warn/40 bg-warn/10 px-2 py-1 font-mono text-2xs uppercase tracking-wider text-warn">ENGINE · DEMO DATA</span>
          )
        }
      />

      {/* Posture gauge */}
      <div className="border-b border-line px-4 py-4">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="kpi-label">Composite Risk Posture</span>
          <span className={cn("font-mono text-lg font-semibold", postureTone)}>{postureLabel} · {score}</span>
        </div>
        <div className="relative h-2.5 w-full overflow-hidden rounded-full" style={{ background: "linear-gradient(90deg, var(--neg), var(--warn) 50%, var(--pos))" }}>
          <div className="absolute top-1/2 h-4 w-1 -translate-y-1/2 rounded-full bg-ink shadow" style={{ left: `calc(${score}% - 2px)` }} />
        </div>
        <div className="mt-1 flex justify-between font-mono text-2xs text-dim"><span>risk-off</span><span>neutral</span><span>risk-on</span></div>
      </div>

      <div className="grid gap-px bg-line md:grid-cols-2 xl:grid-cols-4">
        {/* Market regime */}
        <div className="bg-panel p-4">
          <div className="mb-2 flex items-center justify-between"><span className="section-label">Market Regime</span>{src.market === "live" ? <span className="h-1.5 w-1.5 rounded-full bg-pos" /> : null}</div>
          <Chip tone={trendTone}>{regime.trend}</Chip>
          <div className="mt-2 space-y-1 font-mono text-2xs text-muted">
            <div className="flex justify-between"><span className="text-dim">strength</span><span>{regime.trendStrength}/100</span></div>
            <div className="flex justify-between"><span className="text-dim">vol regime</span><span>{regime.volRegime} ({regime.volPercentile}%)</span></div>
            <div className="flex justify-between"><span className="text-dim">momentum</span><span>{regime.momentum}</span></div>
            <div className="flex justify-between"><span className="text-dim">RSI-14</span><span>{regime.rsi14.toFixed(0)}</span></div>
            <div className="flex justify-between"><span className="text-dim">breadth</span><span>{advancing}/11 sectors up</span></div>
          </div>
        </div>

        {/* Macro */}
        <div className="bg-panel p-4">
          <div className="mb-2 flex items-center justify-between"><span className="section-label">Macro Regime</span>{src.macro === "live" ? <span className="h-1.5 w-1.5 rounded-full bg-pos" /> : null}</div>
          <Chip tone={macro.regime === "Goldilocks" ? "pos" : macro.regime === "Stagflation" ? "neg" : macro.regime === "Reflation" ? "warn" : "default"}>{macro.regime}</Chip>
          <div className="mt-2 space-y-1 font-mono text-2xs text-muted">
            <div className="flex justify-between"><span className="text-dim">growth</span><span>{macro.growthDir}</span></div>
            <div className="flex justify-between"><span className="text-dim">inflation</span><span>{macro.inflationDir}</span></div>
            <div className="flex justify-between"><span className="text-dim">recession risk</span><span className={macro.recessionRisk > 60 ? "text-neg" : macro.recessionRisk > 35 ? "text-warn" : "text-pos"}>{macro.recessionRisk} · {macro.riskLabel}</span></div>
          </div>
        </div>

        {/* Factor leaders */}
        <div className="bg-panel p-4">
          <div className="mb-2 flex items-center justify-between"><span className="section-label">Factor Leaders</span>{src.factor === "live" ? <span className="h-1.5 w-1.5 rounded-full bg-pos" /> : null}</div>
          <div className="space-y-1.5">
            {leaders.map((l) => (
              <div key={l.sym} className="flex items-center gap-2">
                <span className="w-12 font-mono text-2xs font-medium text-ink">{l.sym}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-accent" style={{ width: `${l.composite}%` }} /></div>
                <span className="w-7 text-right font-mono text-2xs tabular-nums text-accent">{l.composite}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Anomalies */}
        <div className="bg-panel p-4">
          <div className="mb-2 flex items-center justify-between"><span className="section-label">Anomaly Watch</span>{src.anomaly === "live" ? <span className="h-1.5 w-1.5 rounded-full bg-pos" /> : null}</div>
          <div className="space-y-1.5">
            {anomalies.length === 0 ? <span className="font-mono text-2xs text-dim">none flagged</span> : anomalies.map((a, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <span className={cn("mt-1 h-1.5 w-1.5 shrink-0 rounded-full", a.tone === "pos" ? "bg-pos" : a.tone === "neg" ? "bg-neg" : "bg-warn")} />
                <div className="min-w-0 flex-1">
                  <span className="font-mono text-2xs font-medium text-ink">{a.symbol}</span>
                  <span className="ml-1 font-mono text-2xs text-dim">{a.type.replace(/_/g, " ").toLowerCase()}</span>
                </div>
                <span className="font-mono text-2xs tabular-nums text-muted">{a.severity}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-line px-4 py-2 text-2xs text-dim">
        <span>Composite posture blends trend, sector breadth, vol regime &amp; recession risk — computed by the engine stack.</span>
        {!anyLive ? <Stat label="" value="set FINNHUB_API_KEY to go live" mono={false} /> : null}
      </div>
    </Panel>
  );
}
