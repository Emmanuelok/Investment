"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Panel, PanelHeader, Chip, Th, Td } from "@/components/ui/kit";
import { ProgressBar } from "@/components/ui/viz";
import { Icon } from "@/components/icon-map";
import { analyzePortfolio, type Holding, type Contribution } from "@/lib/engine/portfolio";
import { candleSeries } from "@/lib/rng";
import { fmtNum, fmtSignedPct, signClass } from "@/lib/format";
import { cn } from "@/lib/cn";

type Status = "loading" | "live" | "demo";

/** One editable holding row — weights are entered as percent. */
type Row = { sym: string; weight: number };

/** Engine report enriched with the request context the route echoes back. */
type PortfolioView = {
  source: string;
  asOf: string;
  benchmark: string;
  symbols: string[];
  equity: number[];
  annReturn: number;
  annVol: number;
  sharpe: number;
  sortino: number;
  maxDrawdown: number;
  var95: number;
  es95: number;
  beta: number | null;
  diversification: number;
  contributions: Contribution[];
};

type EngineResponse =
  | ({ live: true; source: string; asOf: string; benchmark: string } & PortfolioView)
  | { live: false; error?: string };

const SYMBOL_RE = /^[A-Z0-9.^-]{1,10}$/;
const MAX_HOLDINGS = 10;
const DEFAULT_ROWS: Row[] = [
  { sym: "SPY", weight: 40 },
  { sym: "QQQ", weight: 25 },
  { sym: "TLT", weight: 20 },
  { sym: "GLD", weight: 15 },
];
const DEFAULT_BENCH = "SPY";

/** Deterministic local closes for a symbol — identical recipe across renders. */
const demoCloses = (sym: string): number[] =>
  candleSeries(`${sym}-pf`, 260, 100, 0.018, 0.0004).map((c) => c.c);

/** Compute the report locally with the identical engine code (sandbox fallback). */
function demoView(rows: Row[], benchmark: string): PortfolioView {
  const holdings: Holding[] = rows.map((r) => ({
    sym: r.sym,
    weight: r.weight / 100,
    closes: demoCloses(r.sym),
  }));
  const report = analyzePortfolio(holdings, demoCloses(benchmark));
  return { source: "demo", asOf: new Date().toISOString(), benchmark, ...report };
}

/** Inline equity curve rebased to 1.0 — accent line over a faint baseline. */
function EquityCurve({ equity }: { equity: number[] }) {
  const w = 760;
  const h = 200;
  const padX = 6;
  const padTop = 12;
  const padBottom = 12;

  const series = useMemo(() => {
    if (equity.length <= 200) return equity;
    const step = (equity.length - 1) / 199;
    const out: number[] = [];
    for (let i = 0; i < 200; i++) out.push(equity[Math.round(i * step)]);
    out[out.length - 1] = equity[equity.length - 1];
    return out;
  }, [equity]);

  const all = [...series, 1];
  const min = Math.min(...all);
  const max = Math.max(...all);
  const span = max - min || 1;
  const n = series.length;

  const x = (i: number) => padX + (i / (n - 1 || 1)) * (w - padX * 2);
  const y = (v: number) => padTop + (1 - (v - min) / span) * (h - padTop - padBottom);

  const line = series.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${x(n - 1).toFixed(1)},${(h - padBottom).toFixed(1)} L${x(0).toFixed(1)},${(h - padBottom).toFixed(1)} Z`;
  const baselineY = y(1);
  const final = equity[equity.length - 1] ?? 1;
  const gid = "pf-eq-fill";

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="block w-full" preserveAspectRatio="none" role="img" aria-label="Portfolio equity curve rebased to 1.0">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.16" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <line x1={padX} y1={baselineY} x2={w - padX} y2={baselineY} stroke="var(--line)" strokeDasharray="3 4" strokeWidth={1} />
      <path d={line} fill="none" stroke="var(--accent)" strokeWidth={1.8} strokeLinejoin="round" />
      <g fontFamily="var(--font-mono, monospace)">
        <circle cx={w - padX} cy={y(final)} r={2.6} fill="var(--accent)" />
        <text x={w - padX - 4} y={y(final) - 6} textAnchor="end" fontSize={11} fill="var(--accent)">{final.toFixed(2)}×</text>
      </g>
    </svg>
  );
}

export function PortfolioAnalytics() {
  const [rows, setRows] = useState<Row[]>(DEFAULT_ROWS);
  const [benchmark, setBenchmark] = useState<string>(DEFAULT_BENCH);

  const [status, setStatus] = useState<Status>("loading");
  const [source, setSource] = useState<string>("");
  const [updated, setUpdated] = useState<string>("");
  const [data, setData] = useState<PortfolioView | null>(null);

  const weightSum = rows.reduce((s, r) => s + (Number.isFinite(r.weight) ? r.weight : 0), 0);
  const validRows = rows.filter((r) => SYMBOL_RE.test(r.sym) && r.weight > 0);
  const benchValid = SYMBOL_RE.test(benchmark);
  const canRun = validRows.length >= 1 && benchValid;

  const run = useCallback(async () => {
    const active = rows
      .map((r) => ({ sym: r.sym.toUpperCase(), weight: r.weight }))
      .filter((r) => SYMBOL_RE.test(r.sym) && r.weight > 0);
    if (!active.length) return;
    const bench = (benchValid ? benchmark : DEFAULT_BENCH).toUpperCase();

    setStatus("loading");

    // build `sym:weightFraction` query (engine normalizes anyway)
    const holdingsParam = active.map((r) => `${r.sym}:${(r.weight / 100).toFixed(6)}`).join(",");
    const qs = new URLSearchParams({ holdings: holdingsParam, benchmark: bench });

    try {
      const res = await fetch(`/api/engine/portfolio?${qs.toString()}`, { cache: "no-store" });
      const j = (await res.json()) as EngineResponse;
      if (j.live) {
        // j carries an extra `live` flag; structurally it still satisfies PortfolioView.
        setData(j);
        setSource(j.source);
        setUpdated(new Date(j.asOf).toLocaleTimeString("en-US", { hour12: false }));
        setStatus("live");
        return;
      }
      throw new Error(j.error ?? "engine offline");
    } catch {
      // DEMO: compute locally on deterministic candle-derived closes.
      const view = demoView(active, bench);
      setData(view);
      setSource(view.source);
      setStatus("demo");
    }
  }, [rows, benchmark, benchValid]);

  // run once on mount
  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateRow = (i: number, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const removeRow = (i: number) => setRows((prev) => prev.filter((_, idx) => idx !== i));
  const addRow = () => setRows((prev) => (prev.length >= MAX_HOLDINGS ? prev : [...prev, { sym: "", weight: 0 }]));

  // risk-contribution rows, sorted by share of variance (the headline)
  const contributions = useMemo(
    () => (data ? [...data.contributions].sort((a, b) => b.riskContribPct - a.riskContribPct) : []),
    [data],
  );
  const maxRisk = useMemo(
    () => contributions.reduce((m, c) => Math.max(m, Math.abs(c.riskContribPct)), 0) || 1,
    [contributions],
  );

  const badge =
    status === "live" ? (
      <>
        <span className="flex items-center gap-1.5 font-mono text-2xs uppercase tracking-wider text-pos">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pos opacity-60" />
            <span className="relative h-1.5 w-1.5 rounded-full bg-pos" />
          </span>
          ENGINE · LIVE · {source}
        </span>
        {updated ? <span className="hidden font-mono text-2xs text-dim sm:inline">as of {updated}</span> : null}
      </>
    ) : status === "demo" ? (
      <span className="flex items-center gap-1.5 rounded border border-warn/40 bg-warn/10 px-2 py-1 font-mono text-2xs uppercase tracking-wider text-warn">
        <Icon name="warn" width={12} height={12} /> ENGINE · DEMO DATA
      </span>
    ) : (
      <span className="flex items-center gap-1.5 font-mono text-2xs uppercase tracking-wider text-dim">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-dim" /> analyzing…
      </span>
    );

  // KPI deck cells (Beta only when present)
  const kpis: { l: string; v: string; c: string }[] = data
    ? [
        { l: "Ann. Return", v: fmtSignedPct(data.annReturn), c: signClass(data.annReturn) },
        { l: "Ann. Vol", v: `${fmtNum(data.annVol)}%`, c: "text-ink" },
        { l: "Sharpe", v: fmtNum(data.sharpe), c: data.sharpe >= 1 ? "text-pos" : "text-accent" },
        { l: "Sortino", v: fmtNum(data.sortino), c: data.sortino >= 1 ? "text-pos" : "text-accent" },
        { l: "Max Drawdown", v: fmtSignedPct(data.maxDrawdown), c: "text-neg" },
        { l: "1-Day VaR 95%", v: fmtSignedPct(data.var95), c: "text-neg" },
        ...(data.beta !== null ? [{ l: `Beta vs ${data.benchmark}`, v: fmtNum(data.beta, 2), c: "text-ink" }] : []),
        { l: "Diversification", v: `${fmtNum(data.diversification, 2)}×`, c: "text-accent" },
      ]
    : [];

  return (
    <Panel className="animate-rise">
      <PanelHeader
        title="Portfolio Analytics Engine"
        sub="Risk/return, VaR, per-asset risk contribution & diversification — computed from real returns"
        right={badge}
      />

      {/* Holdings editor */}
      <div className="border-b border-line px-4 py-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="section-label">Holdings · weight %</span>
          <span className={cn("font-mono text-2xs", Math.abs(weightSum - 100) < 0.01 ? "text-dim" : "text-warn")}>
            Σ {fmtNum(weightSum, 1)}%{Math.abs(weightSum - 100) < 0.01 ? "" : " · normalized on run"}
          </span>
        </div>

        <div className="space-y-2">
          {rows.map((r, i) => {
            const symOk = r.sym === "" || SYMBOL_RE.test(r.sym);
            return (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  value={r.sym}
                  onChange={(e) => updateRow(i, { sym: e.target.value.toUpperCase() })}
                  onKeyDown={(e) => { if (e.key === "Enter" && canRun) void run(); }}
                  spellCheck={false}
                  aria-label={`Holding ${i + 1} symbol`}
                  placeholder="SYM"
                  className={cn(
                    "w-28 rounded border bg-base/60 px-2 py-1 font-mono text-sm uppercase tracking-wide text-ink outline-none focus:border-accent/50",
                    symOk ? "border-line" : "border-neg/60",
                  )}
                />
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={Number.isFinite(r.weight) ? r.weight : 0}
                    min={0}
                    max={100}
                    step={1}
                    onChange={(e) => updateRow(i, { weight: Number(e.target.value) })}
                    onKeyDown={(e) => { if (e.key === "Enter" && canRun) void run(); }}
                    aria-label={`Holding ${i + 1} weight percent`}
                    className="w-20 rounded border border-line bg-base/60 px-2 py-1 font-mono text-sm tabular-nums text-ink outline-none focus:border-accent/50"
                  />
                  <span className="font-mono text-2xs text-dim">%</span>
                </div>
                <button
                  onClick={() => removeRow(i)}
                  disabled={rows.length <= 1}
                  aria-label={`Remove holding ${i + 1}`}
                  className="grid h-7 w-7 shrink-0 place-items-center rounded border border-line font-mono text-sm text-dim hover:border-neg/50 hover:text-neg disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            onClick={addRow}
            disabled={rows.length >= MAX_HOLDINGS}
            className="rounded border border-line px-2.5 py-1 font-mono text-2xs uppercase tracking-wider text-dim hover:border-line-strong hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
          >
            + Add holding
          </button>
          <label className="flex items-center gap-2">
            <span className="kpi-label shrink-0">Benchmark</span>
            <input
              type="text"
              value={benchmark}
              onChange={(e) => setBenchmark(e.target.value.toUpperCase())}
              onKeyDown={(e) => { if (e.key === "Enter" && canRun) void run(); }}
              spellCheck={false}
              aria-label="Benchmark symbol"
              className={cn(
                "w-24 rounded border bg-base/60 px-2 py-1 font-mono text-sm uppercase tracking-wide text-ink outline-none focus:border-accent/50",
                benchValid ? "border-line" : "border-neg/60",
              )}
            />
          </label>
          <button
            onClick={() => void run()}
            disabled={!canRun || status === "loading"}
            className="btn btn-accent ml-auto disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status === "loading" ? "Analyzing…" : "Run Analysis"}
          </button>
        </div>
      </div>

      <div className="space-y-4 p-4">
        {/* 1) KPI deck */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(data ? kpis : Array.from({ length: 8 }, () => ({ l: "—", v: "—", c: "text-ink" }))).map((k, i) => (
            <div key={`${k.l}-${i}`} className="rounded-md border border-line bg-panel/60 px-3 py-2.5">
              <div className="kpi-label">{k.l}</div>
              <div className={cn("mt-1.5 font-mono text-lg tabular-nums leading-none", k.c)}>{k.v}</div>
            </div>
          ))}
        </div>

        {/* 2) Equity curve */}
        <div className="rounded-md border border-line bg-panel/60 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="section-label">Equity curve — portfolio (rebased to 1.0)</span>
            <span className="flex items-center gap-1 font-mono text-2xs text-accent">
              <span className="h-0.5 w-3 bg-accent" /> portfolio
            </span>
          </div>
          {data ? <EquityCurve equity={data.equity} /> : <div className="skeleton h-[200px] w-full" />}
        </div>

        {/* 3) Risk contribution table */}
        <div className="overflow-x-auto rounded-md border border-line bg-panel/60">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr>
                <Th>Symbol</Th>
                <Th right>Weight %</Th>
                <Th right>Standalone Vol %</Th>
                <Th>Risk Contribution %</Th>
                <Th right>Return Contribution %</Th>
              </tr>
            </thead>
            <tbody>
              {contributions.length ? (
                contributions.map((c) => {
                  const weightPct = c.weight * 100;
                  const riskHeavy = c.riskContribPct > weightPct * 1.3;
                  return (
                    <tr key={c.sym} className="hover:bg-elevated/40">
                      <Td mono={false}>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center rounded border border-line bg-elevated/70 px-1.5 py-0.5 font-mono text-xs font-medium text-ink">
                            {c.sym}
                          </span>
                          {riskHeavy ? <Chip tone="warn">risk-heavy</Chip> : null}
                        </div>
                      </Td>
                      <Td right className="text-muted">{fmtNum(weightPct, 1)}%</Td>
                      <Td right className="text-muted">{fmtNum(c.vol, 1)}%</Td>
                      <Td>
                        <div className="flex items-center gap-3">
                          <ProgressBar
                            value={Math.max(0, c.riskContribPct)}
                            max={maxRisk}
                            color={riskHeavy ? "var(--warn)" : "var(--accent)"}
                            height={6}
                            className="w-full"
                            showGlow
                          />
                          <span className={cn("w-16 shrink-0 text-right font-mono text-sm tabular-nums", riskHeavy ? "text-warn" : "text-ink")}>
                            {fmtNum(c.riskContribPct, 1)}%
                          </span>
                        </div>
                      </Td>
                      <Td right className={signClass(c.retContribPct)}>{fmtSignedPct(c.retContribPct, 1)}</Td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <Td colSpan={5} className="py-6 text-center text-dim">
                    {status === "loading" ? "analyzing…" : "no holdings"}
                  </Td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="border-t border-line px-4 py-2.5 text-2xs text-dim">
        Risk contribution = each holding&apos;s share of portfolio variance (sums to 100%). VaR is 1-day historical at 95%.
      </div>
    </Panel>
  );
}
