"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Panel, PanelHeader, Stat } from "@/components/ui/kit";
import { Ring } from "@/components/ui/viz";
import { fmtNum, fmtPct } from "@/lib/format";
import { cn } from "@/lib/cn";
import { mertonModel, creditGrade, type MertonResult } from "@/lib/engine/merton";

/* ── Types matching /api/engine/merton ─────────────────────────────────────── */

type Status = "loading" | "live" | "demo";

type MertonInputs = {
  equity: number;
  equityVol: number;
  debt: number;
  barrierBasis: string;
  rate: number;
  years: number;
  fiscalYear?: number;
  rateSource: string;
};

type Grade = { grade: string; tone: "pos" | "warn" | "neg" };

type MertonLive = {
  live: true;
  source: string;
  asOf: string;
  symbol: string;
  name: string;
  inputs: MertonInputs;
  model: MertonResult;
  grade: Grade;
};
type MertonResponse = MertonLive | { live: false };

type ViewModel = {
  name: string;
  inputs: MertonInputs;
  model: MertonResult;
  grade: Grade;
};

/* ── Presentation helpers ──────────────────────────────────────────────────── */

const GRADE_COLOR: Record<Grade["tone"], string> = {
  pos: "text-pos",
  warn: "text-warn",
  neg: "text-neg",
};

const RING_COLOR: Record<Grade["tone"], string> = {
  pos: "var(--pos)",
  warn: "var(--warn)",
  neg: "var(--neg)",
};

/** Map distance-to-default (σ) to a qualitative one-year solvency verdict. */
function ddVerdict(dd: number): { word: string; risk: string } {
  if (dd >= 6) return { word: "fortress", risk: "negligible one-year default risk" };
  if (dd >= 4) return { word: "very safe", risk: "low one-year default risk" };
  if (dd >= 2.5) return { word: "comfortable", risk: "moderate one-year default risk" };
  if (dd >= 1) return { word: "stretched", risk: "elevated one-year default risk" };
  return { word: "distressed", risk: "high one-year default risk" };
}

/** Compact-USD formatter for the large firm-level dollar figures. */
const usdCompact = new Intl.NumberFormat(undefined, {
  notation: "compact",
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

/* ── Demo data (NVDA-like: huge equity, tiny debt → investment grade) ──────── */

function buildDemo(): ViewModel {
  const inputs: MertonInputs = {
    equity: 3.0e12, // market cap
    equityVol: 0.5,
    debt: 1.1e10, // NVDA carries very low debt
    barrierBasis: "current liabilities + ½ long-term debt",
    rate: 0.045,
    years: 1,
    fiscalYear: 2024,
    rateSource: "FRED DGS1",
  };
  const model = mertonModel({
    equity: inputs.equity,
    equityVol: inputs.equityVol,
    debt: inputs.debt,
    rate: inputs.rate,
    years: inputs.years,
  });
  const grade = creditGrade(model.defaultProb);
  return { name: "NVIDIA Corporation", inputs, model, grade };
}

/* ── Component ─────────────────────────────────────────────────────────────── */

export function CreditRisk({ symbol }: { symbol: string }) {
  const [status, setStatus] = useState<Status>("loading");
  const [model, setModel] = useState<ViewModel | null>(null);
  const [source, setSource] = useState("");
  const [asOf, setAsOf] = useState("");

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const r = await fetch(`/api/engine/merton?symbol=${encodeURIComponent(symbol)}`, { cache: "no-store" });
      const j = (await r.json()) as MertonResponse;
      if (j.live) {
        setModel({ name: j.name, inputs: j.inputs, model: j.model, grade: j.grade });
        setSource(j.source);
        setAsOf(new Date(j.asOf).toLocaleTimeString("en-US", { hour12: false }));
        setStatus("live");
      } else {
        setModel(buildDemo());
        setStatus("demo");
      }
    } catch {
      setModel(buildDemo());
      setStatus("demo");
    }
  }, [symbol]);

  useEffect(() => {
    load();
  }, [load]);

  const vm = model ?? buildDemo();
  const { name, inputs, model: m, grade } = vm;

  const dd = m.distanceToDefault;
  const pdPct = m.defaultProb * 100;
  const spreadBps = m.creditSpread * 10000;
  const verdict = useMemo(() => ddVerdict(dd), [dd]);

  // Ring visualizes distance-to-default scaled across a 0..8σ band (safer = fuller).
  const ddRingValue = Math.max(0, Math.min(8, dd));

  return (
    <Panel className="animate-rise" aria-label={`Credit risk for ${name}`}>
      <PanelHeader
        title={`Credit Risk — ${name}`}
        sub="Merton structural model · distance-to-default, 1-yr default probability & implied spread"
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
                ENGINE · LIVE · {source}
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
              aria-label="Refresh credit risk"
            >
              ↻
            </button>
          </div>
        }
      />

      {!model && status === "loading" ? (
        <div className="grid h-64 place-items-center font-mono text-2xs uppercase tracking-wider text-dim">computing…</div>
      ) : (
        <>
          {/* 1 ── Hero: grade + ring + headline interpretation */}
          <div className="flex flex-col gap-4 border-b border-line px-4 py-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-5">
              {/* Agency-style letter grade */}
              <div className="flex flex-col">
                <span className="kpi-label">Implied rating</span>
                <span className={cn("font-mono text-4xl font-semibold leading-none tracking-tight", GRADE_COLOR[grade.tone])}>
                  {grade.grade}
                </span>
              </div>
              {/* DD ring (0..8σ) */}
              <Ring
                value={ddRingValue}
                max={8}
                size={84}
                stroke={8}
                color={RING_COLOR[grade.tone]}
                label={`${fmtNum(dd, 2)}σ`}
                sub="DD"
              />
            </div>

            <div className="min-w-0 flex-1 space-y-1.5 sm:border-l sm:border-line sm:pl-5">
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <span>
                  <span className="kpi-label">Distance to default</span>{" "}
                  <span className={cn("font-mono text-lg font-medium", GRADE_COLOR[grade.tone])}>{fmtNum(dd, 2)}σ</span>
                </span>
                <span>
                  <span className="kpi-label">1-yr default prob</span>{" "}
                  <span className={cn("font-mono text-lg font-medium", GRADE_COLOR[grade.tone])}>
                    {pdPct < 0.01 ? "<0.01%" : fmtPct(pdPct, 2)}
                  </span>
                </span>
              </div>
              <p className="text-sm text-dim">
                A distance-to-default of <span className="text-muted">{fmtNum(dd, 2)}σ</span> implies a{" "}
                <span className={GRADE_COLOR[grade.tone]}>{verdict.word}</span> balance sheet — {verdict.risk}.
              </p>
              {!m.converged ? (
                <p className="font-mono text-2xs text-warn">non-converged solve · figures approximate</p>
              ) : null}
            </div>
          </div>

          {/* 2 ── Outputs deck */}
          <div className="grid grid-cols-2 gap-px border-b border-line bg-line sm:grid-cols-3 lg:grid-cols-6">
            <div className="bg-panel px-4 py-3">
              <Stat label="Distance to default" value={`${fmtNum(dd, 2)}σ`} tone={grade.tone === "neg" ? "neg" : grade.tone === "warn" ? "warn" : "pos"} />
            </div>
            <div className="bg-panel px-4 py-3">
              <Stat label="Default prob (1y)" value={pdPct < 0.01 ? "<0.01%" : fmtPct(pdPct, 2)} tone={grade.tone === "neg" ? "neg" : grade.tone === "warn" ? "warn" : "pos"} />
            </div>
            <div className="bg-panel px-4 py-3">
              <Stat label="Credit spread" value={`${fmtNum(spreadBps, 0)} bps`} tone={spreadBps >= 300 ? "neg" : spreadBps >= 100 ? "warn" : "pos"} />
            </div>
            <div className="bg-panel px-4 py-3">
              <Stat label="Leverage (D·e⁻ʳᵀ/V)" value={fmtPct(m.leverage * 100, 1)} />
            </div>
            <div className="bg-panel px-4 py-3">
              <Stat label="Asset vol" value={fmtPct(m.assetVol * 100, 1)} />
            </div>
            <div className="bg-panel px-4 py-3">
              <Stat label="Asset value" value={usdCompact.format(m.assetValue)} />
            </div>
          </div>

          {/* 3 ── Inputs panel (live model inputs, dim) */}
          <div className="px-4 py-3">
            <div className="kpi-label mb-2 flex items-center gap-1.5 text-faint">
              <span className="h-1.5 w-1.5 rounded-full bg-dim" /> Live model inputs
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
              <div>
                <div className="kpi-label">Market cap (E)</div>
                <div className="mt-1 font-mono text-sm tabular-nums text-muted">{usdCompact.format(inputs.equity)}</div>
              </div>
              <div>
                <div className="kpi-label">Equity vol (σ_E)</div>
                <div className="mt-1 font-mono text-sm tabular-nums text-muted">{fmtPct(inputs.equityVol * 100, 1)}</div>
              </div>
              <div>
                <div className="kpi-label">Default barrier (D)</div>
                <div className="mt-1 font-mono text-sm tabular-nums text-muted">{usdCompact.format(inputs.debt)}</div>
                <div className="mt-0.5 text-2xs text-faint">
                  {inputs.fiscalYear ? `FY${inputs.fiscalYear} · ` : ""}
                  {inputs.barrierBasis || "—"}
                </div>
              </div>
              <div>
                <div className="kpi-label">Risk-free rate (r)</div>
                <div className="mt-1 font-mono text-sm tabular-nums text-muted">{fmtPct(inputs.rate * 100, 2)}</div>
                <div className="mt-0.5 text-2xs text-faint">{inputs.rateSource} · {fmtNum(inputs.years, 0)}y horizon</div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Footer */}
      <div className="border-t border-line px-4 py-2.5 font-mono text-2xs text-faint">
        Merton (1974) structural model: equity is a call option on firm assets struck at the debt barrier; distance-to-default
        counts standard deviations of asset value between today and the barrier over one year. Default probability = N(−DD).
        Inputs: Finnhub market cap, Stooq equity volatility, SEC balance-sheet debt, FRED rate.
      </div>
    </Panel>
  );
}
