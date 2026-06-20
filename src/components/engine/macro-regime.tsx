"use client";

import { useEffect, useState, useCallback } from "react";
import { Panel, PanelHeader, Chip, Stat } from "@/components/ui/kit";
import { ProgressBar, Ring } from "@/components/ui/viz";
import { fmtNum, fmtSignedPct } from "@/lib/format";
import { cn } from "@/lib/cn";
import { classifyMacroRegime } from "@/lib/engine/macro";
import type { MacroRegime as Regime, MacroReport } from "@/lib/engine/macro";

/* ── Types mirroring the /api/engine/macro contract ───────────────────────── */

type Indicators = {
  tenYear: number;
  twoYear: number;
  curveSlope: number;
  unemployment: number;
  unemploymentTrend: number;
  cpiYoY: number | null;
  growthScore: number;
  inflationScore: number;
};

type MacroLive = { live: true; source: string; asOf: string; indicators: Indicators } & MacroReport;
type MacroDead = { live: false };
type MacroResponse = MacroLive | MacroDead;

type Status = "loading" | "live" | "demo";

type Signal = MacroReport["signals"][number];

/* ── Demo fallback (sandbox always returns { live:false }) ─────────────────── */

const DEMO_INDICATORS: Indicators = {
  tenYear: 4.28,
  twoYear: 4.71,
  curveSlope: -0.43,
  unemployment: 4.1,
  unemploymentTrend: 0.3,
  cpiYoY: 3.1,
  growthScore: 18,
  inflationScore: -22,
};
const DEMO_REPORT = classifyMacroRegime({ growthScore: 18, inflationScore: -22, curveSlope: -0.43, unemploymentTrend: 0.3 });

/* ── Quadrant model ───────────────────────────────────────────────────────── */

type Cell = { regime: Regime; tag: string; row: 0 | 1; col: 0 | 1 };

// rows: Expanding (top) / Slowing (bottom) · cols: Falling (left) / Rising (right)
const CELLS: Cell[] = [
  { regime: "Goldilocks", tag: "Growth firm · inflation cooling", row: 0, col: 0 },
  { regime: "Reflation", tag: "Growth & inflation rising", row: 0, col: 1 },
  { regime: "Contraction", tag: "Both falling · disinflation", row: 1, col: 0 },
  { regime: "Stagflation", tag: "Growth fading · inflation sticky", row: 1, col: 1 },
];

/* ── Tone helpers ─────────────────────────────────────────────────────────── */

const RISK_COLOR: Record<MacroReport["riskLabel"], string> = {
  Low: "var(--pos)",
  Moderate: "var(--accent)",
  Elevated: "var(--warn)",
  High: "var(--neg)",
};
const RISK_TEXT: Record<MacroReport["riskLabel"], string> = {
  Low: "text-pos",
  Moderate: "text-accent",
  Elevated: "text-warn",
  High: "text-neg",
};

const SIGNAL_DOT: Record<Signal["tone"], string> = {
  pos: "bg-pos",
  neg: "bg-neg",
  warn: "bg-warn",
  info: "bg-accent",
};

/* ── Status badge (mirrors markets-overview status machine) ────────────────── */

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
      <span className="flex items-center gap-1.5 font-mono text-2xs uppercase tracking-wider text-pos">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pos opacity-60" />
          <span className="relative h-1.5 w-1.5 rounded-full bg-pos" />
        </span>
        ENGINE · LIVE · {source}
        {asOf ? <span className="ml-1 hidden text-dim sm:inline">{asOf}</span> : null}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 rounded border border-warn/40 bg-warn/10 px-2 py-1 font-mono text-2xs uppercase tracking-wider text-warn">
      ENGINE · DEMO DATA
    </span>
  );
}

/* ── Main component ────────────────────────────────────────────────────────── */

export function MacroRegime() {
  const [status, setStatus] = useState<Status>("loading");
  const [indicators, setIndicators] = useState<Indicators>(DEMO_INDICATORS);
  const [report, setReport] = useState<MacroReport>(DEMO_REPORT);
  const [source, setSource] = useState<string>("");
  const [asOf, setAsOf] = useState<string>("");

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const r = await fetch("/api/engine/macro", { cache: "no-store" });
      const j = (await r.json()) as MacroResponse;
      if (j.live) {
        const { live: _live, source: src, asOf: at, indicators: ind, ...rest } = j;
        void _live;
        setIndicators(ind);
        setReport(rest);
        setSource(src);
        setAsOf(new Date(at).toLocaleTimeString("en-US", { hour12: false }));
        setStatus("live");
      } else {
        setIndicators(DEMO_INDICATORS);
        setReport(DEMO_REPORT);
        setStatus("demo");
      }
    } catch {
      setIndicators(DEMO_INDICATORS);
      setReport(DEMO_REPORT);
      setStatus("demo");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const { regime, regimeDetail, growthDir, inflationDir, recessionRisk, riskLabel, signals } = report;
  const curveInverted = indicators.curveSlope < 0;

  return (
    <Panel className="animate-rise">
      <PanelHeader
        title="Macro Regime Engine"
        sub="Growth × inflation quadrant + recession-risk nowcast — computed from FRED series"
        right={
          <div className="flex items-center gap-2">
            <StatusBadge status={status} source={source} asOf={asOf} />
            <button
              onClick={load}
              disabled={status === "loading"}
              className="grid h-7 w-7 place-items-center rounded border border-line font-mono text-sm text-dim hover:border-line-strong hover:text-ink disabled:opacity-40"
              aria-label="Refresh"
            >
              ↻
            </button>
          </div>
        }
      />

      <div className="grid gap-4 p-4 lg:grid-cols-2">
        {/* 1) Quadrant visual */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="section-label text-[11px] text-muted">GROWTH × INFLATION QUADRANT</span>
            <span className="font-mono text-2xs text-dim">INFLATION →</span>
          </div>
          <div className="flex gap-1.5">
            <div className="flex w-3 items-center justify-center">
              <span className="font-mono text-2xs uppercase tracking-wider text-dim" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
                GROWTH →
              </span>
            </div>
            <div className="grid flex-1 grid-cols-2 gap-1.5">
              {CELLS.map((c) => {
                const active = c.regime === regime;
                return (
                  <div
                    key={c.regime}
                    className={cn(
                      "min-h-[78px] rounded border px-2.5 py-2 transition-colors",
                      active ? "border-accent bg-accent/10" : "border-line bg-elevated/30 opacity-55",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className={cn("font-mono text-xs", active ? "font-semibold text-accent" : "font-medium text-muted")}>
                        {c.regime}
                      </span>
                      {active ? <span className="h-1.5 w-1.5 rounded-full bg-accent" /> : null}
                    </div>
                    <div className={cn("mt-1 text-2xs leading-snug", active ? "text-dim" : "text-faint")}>{c.tag}</div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mt-1.5 flex justify-between pl-4 font-mono text-2xs text-faint">
            <span>← Inflation Falling</span>
            <span>Inflation Rising →</span>
          </div>
        </div>

        {/* 2) Regime readout + 3) recession risk */}
        <div className="flex flex-col justify-between gap-4 rounded border border-line bg-elevated/30 p-4">
          <div>
            <div className="kpi-label">Current Regime</div>
            <div className="mt-1 text-2xl font-semibold tracking-tight text-accent">{regime}</div>
            <p className="mt-1.5 text-sm text-dim">{regimeDetail}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Chip tone={growthDir === "Expanding" ? "pos" : "warn"} dot>
                Growth {growthDir}
              </Chip>
              <Chip tone={inflationDir === "Rising" ? "warn" : "pos"} dot>
                Inflation {inflationDir}
              </Chip>
            </div>
          </div>

          {/* Recession risk gauge */}
          <div className="flex items-center gap-4 border-t border-line pt-4">
            <Ring
              value={recessionRisk}
              max={100}
              size={78}
              stroke={8}
              color={RISK_COLOR[riskLabel]}
              label={`${recessionRisk}%`}
              sub="RISK"
            />
            <div className="min-w-0 flex-1">
              <div className="kpi-label">Recession Risk — Nowcast</div>
              <div className={cn("mt-1 flex items-baseline gap-2 font-mono", RISK_TEXT[riskLabel])}>
                <span className="text-xl font-semibold tabular-nums">{recessionRisk}%</span>
                <span className="text-sm font-medium uppercase tracking-wide">{riskLabel}</span>
              </div>
              <div className="mt-2">
                <ProgressBar value={recessionRisk} max={100} color={RISK_COLOR[riskLabel]} height={8} showGlow />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4) Indicator strip */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line px-4 py-3 sm:grid-cols-4 lg:grid-cols-7">
        <Stat label="10Y" value={`${fmtNum(indicators.tenYear, 2)}%`} tone="accent" />
        <Stat label="2Y" value={`${fmtNum(indicators.twoYear, 2)}%`} tone="accent" />
        <Stat
          label="Curve 10Y−2Y"
          value={`${indicators.curveSlope >= 0 ? "+" : ""}${fmtNum(indicators.curveSlope, 2)}pp`}
          tone={curveInverted ? "neg" : "pos"}
        />
        <Stat
          label="Unemployment"
          value={
            <span>
              {fmtNum(indicators.unemployment, 1)}%
              <span className={cn("ml-1.5 text-xs", indicators.unemploymentTrend > 0 ? "text-warn" : "text-pos")}>
                {indicators.unemploymentTrend >= 0 ? "+" : ""}
                {fmtNum(indicators.unemploymentTrend, 1)}pp
              </span>
            </span>
          }
        />
        <Stat
          label="CPI YoY"
          value={indicators.cpiYoY !== null ? `${fmtNum(indicators.cpiYoY, 1)}%` : "—"}
          tone={indicators.cpiYoY !== null && indicators.cpiYoY > 4 ? "neg" : indicators.cpiYoY !== null && indicators.cpiYoY > 3 ? "warn" : "pos"}
        />
        <Stat label="Growth Momentum" value={fmtNum(indicators.growthScore, 0)} tone={indicators.growthScore >= 0 ? "pos" : "neg"} />
        <Stat label="Inflation Momentum" value={fmtNum(indicators.inflationScore, 0)} tone={indicators.inflationScore >= 0 ? "warn" : "pos"} />
      </div>

      {/* 5) Signals */}
      <div className="border-t border-line px-4 py-3">
        <div className="mb-2 section-label text-[11px] text-muted">ENGINE SIGNALS</div>
        <ul className="space-y-1.5">
          {signals.map((s, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-muted">
              <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", SIGNAL_DOT[s.tone])} />
              <span>{s.text}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Footer */}
      <div className="border-t border-line px-4 py-2.5 text-2xs text-dim">
        Quadrant from growth &amp; inflation momentum; recession risk blends curve inversion, unemployment trend (Sahm-style) and activity. Indicators via FRED.
      </div>
    </Panel>
  );
}
