"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Panel, PanelHeader, Chip, Stat } from "@/components/ui/kit";
import { runBacktest, STRATEGY_LABELS, type StrategyId, type BacktestParams } from "@/lib/engine/backtest";
import { candleSeries } from "@/lib/rng";
import { fmtNum, fmtSignedPct, signClass } from "@/lib/format";
import { cn } from "@/lib/cn";

type Status = "loading" | "live" | "demo";

type Metrics = {
  totalReturn: number;
  benchReturn: number;
  cagr: number;
  sharpe: number;
  sortino: number;
  maxDrawdown: number;
  calmar: number;
  volAnnual: number;
  winRate: number;
  trades: number;
  exposure: number;
  profitFactor: number;
};

type BacktestPayload = {
  source: string;
  asOf: string;
  symbol: string;
  bars: number;
  strategy: StrategyId;
  equity: number[];
  benchmark: number[];
  position: number[];
  metrics: Metrics;
};

type EngineResponse =
  | ({ live: true } & BacktestPayload)
  | { live: false; error?: string };

const SYMBOL_RE = /^[A-Z0-9.^-]{1,10}$/;
const STRATEGY_ORDER: StrategyId[] = ["buyhold", "smaCross", "rsiReversion", "macdTrend", "bollingerBreakout", "donchian"];

/** Default parameter set — mirrors the engine route defaults. */
const DEFAULTS = { fast: 20, slow: 50, rsiLow: 30, rsiHigh: 55, lookback: 20, costBps: 5 } as const;

/** Downsample a series to at most `max` points, keeping first/last. */
function downsample(values: number[], max: number): number[] {
  if (values.length <= max) return values;
  const step = (values.length - 1) / (max - 1);
  const out: number[] = [];
  for (let i = 0; i < max; i++) out.push(values[Math.round(i * step)]);
  out[out.length - 1] = values[values.length - 1];
  return out;
}

function EquityCurve({ equity, benchmark }: { equity: number[]; benchmark: number[] }) {
  const w = 760;
  const h = 240;
  const padX = 6;
  const padTop = 12;
  const padBottom = 12;

  const eq = useMemo(() => downsample(equity, 180), [equity]);
  const bm = useMemo(() => downsample(benchmark, 180), [benchmark]);

  const all = [...eq, ...bm, 1];
  const min = Math.min(...all);
  const max = Math.max(...all);
  const span = max - min || 1;
  const n = Math.max(eq.length, bm.length);

  const x = (i: number) => padX + (i / (n - 1 || 1)) * (w - padX * 2);
  const y = (v: number) => padTop + (1 - (v - min) / span) * (h - padTop - padBottom);

  const line = (s: number[]) => s.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");

  // Shaded region where strategy > benchmark (top edge = strategy, bottom edge = benchmark).
  const shade = useMemo(() => {
    const top: string[] = [];
    const bottom: string[] = [];
    for (let i = 0; i < n; i++) {
      const e = eq[i] ?? eq[eq.length - 1];
      const b = bm[i] ?? bm[bm.length - 1];
      if (e > b) {
        top.push(`${top.length === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(e).toFixed(1)}`);
        bottom.unshift(`L${x(i).toFixed(1)},${y(b).toFixed(1)}`);
      } else if (top.length) {
        top.push(`L${x(i).toFixed(1)},${y(b).toFixed(1)}`);
        bottom.unshift(`L${x(i).toFixed(1)},${y(b).toFixed(1)}`);
        top.push(...bottom, "Z");
        bottom.length = 0;
      }
    }
    if (top.length && bottom.length) top.push(...bottom, "Z");
    return top.join(" ");
  }, [eq, bm, n]);

  const baselineY = y(1);
  const eqFinal = equity[equity.length - 1] ?? 1;
  const bmFinal = benchmark[benchmark.length - 1] ?? 1;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="block w-full" preserveAspectRatio="none" role="img" aria-label="Strategy equity curve versus buy and hold benchmark">
      {shade ? <path d={shade} fill="var(--accent)" opacity={0.1} /> : null}
      <line x1={padX} y1={baselineY} x2={w - padX} y2={baselineY} stroke="var(--line)" strokeDasharray="3 4" strokeWidth={1} />
      <path d={line(bm)} fill="none" stroke="var(--dim)" strokeWidth={1.2} opacity={0.75} strokeLinejoin="round" />
      <path d={line(eq)} fill="none" stroke="var(--accent)" strokeWidth={1.8} strokeLinejoin="round" />
      {/* final-multiple labels at the right edge */}
      <g fontFamily="var(--font-mono, monospace)">
        <circle cx={w - padX} cy={y(eqFinal)} r={2.4} fill="var(--accent)" />
        <text x={w - padX - 4} y={y(eqFinal) - 5} textAnchor="end" fontSize={11} fill="var(--accent)">{eqFinal.toFixed(2)}×</text>
        <circle cx={w - padX} cy={y(bmFinal)} r={2.2} fill="var(--dim)" />
        <text x={w - padX - 4} y={y(bmFinal) + 12} textAnchor="end" fontSize={10} fill="var(--dim)">{bmFinal.toFixed(2)}×</text>
      </g>
    </svg>
  );
}

export function BacktestLab() {
  const [symbol, setSymbol] = useState("SPY");
  const [strategy, setStrategy] = useState<StrategyId>("smaCross");
  const [fast, setFast] = useState<number>(DEFAULTS.fast);
  const [slow, setSlow] = useState<number>(DEFAULTS.slow);
  const [rsiLow, setRsiLow] = useState<number>(DEFAULTS.rsiLow);
  const [rsiHigh, setRsiHigh] = useState<number>(DEFAULTS.rsiHigh);
  const [lookback, setLookback] = useState<number>(DEFAULTS.lookback);
  const [costBps, setCostBps] = useState<number>(DEFAULTS.costBps);
  const [allowShort, setAllowShort] = useState(false);

  const [status, setStatus] = useState<Status>("loading");
  const [source, setSource] = useState("");
  const [updated, setUpdated] = useState("");
  const [data, setData] = useState<BacktestPayload | null>(null);
  // last-applied bps drives the footnote so it tracks the actual run, not the live input
  const [appliedCost, setAppliedCost] = useState<number>(DEFAULTS.costBps);

  const symbolValid = SYMBOL_RE.test(symbol);

  const run = useCallback(async () => {
    const sym = symbol.toUpperCase();
    const params: BacktestParams = { fast, slow, rsiLow, rsiHigh, lookback, costBps, allowShort };
    setStatus("loading");
    setAppliedCost(costBps);

    const qs = new URLSearchParams({
      symbol: sym,
      strategy,
      fast: String(fast),
      slow: String(slow),
      rsiLow: String(rsiLow),
      rsiHigh: String(rsiHigh),
      lookback: String(lookback),
      costBps: String(costBps),
      short: allowShort ? "1" : "0",
    });

    try {
      const r = await fetch(`/api/engine/backtest?${qs.toString()}`, { cache: "no-store" });
      const j = (await r.json()) as EngineResponse;
      if (j.live) {
        setData(j);
        setSource(j.source);
        setUpdated(new Date(j.asOf).toLocaleTimeString("en-US", { hour12: false }));
        setStatus("live");
        return;
      }
      throw new Error(j.error ?? "engine offline");
    } catch {
      // DEMO: compute locally with the identical engine code on deterministic candles.
      const candles = candleSeries(`${sym}-bt`, 600, 100, 0.018, 0.0004);
      const result = runBacktest(strategy, candles, params);
      setData({ source: "demo", asOf: new Date().toISOString(), symbol: sym, bars: candles.length, ...result });
      setStatus("demo");
    }
  }, [symbol, strategy, fast, slow, rsiLow, rsiHigh, lookback, costBps, allowShort]);

  // run once on mount
  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const m = data?.metrics;
  const vsBench = m ? m.totalReturn - m.benchReturn : 0;
  const pf = m ? (Number.isFinite(m.profitFactor) ? fmtNum(m.profitFactor) : "∞") : "—";

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
        <span className="hidden font-mono text-2xs text-dim sm:inline">as of {updated}</span>
      </>
    ) : status === "demo" ? (
      <span className="flex items-center gap-1.5 rounded border border-warn/40 bg-warn/10 px-2 py-1 font-mono text-2xs uppercase tracking-wider text-warn">
        <span className="h-1.5 w-1.5 rounded-full bg-warn" /> ENGINE · DEMO DATA
      </span>
    ) : (
      <span className="flex items-center gap-1.5 font-mono text-2xs uppercase tracking-wider text-dim">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-dim" /> running…
      </span>
    );

  const numberField = (label: string, value: number, set: (n: number) => void, opts: { min: number; max: number; step?: number }) => (
    <label className="block">
      <span className="kpi-label">{label}</span>
      <input
        type="number"
        value={value}
        min={opts.min}
        max={opts.max}
        step={opts.step ?? 1}
        onChange={(e) => set(Number(e.target.value))}
        className="mt-1 w-full rounded border border-line bg-base/60 px-2 py-1 font-mono text-sm tabular-nums text-ink outline-none focus:border-accent/50"
      />
    </label>
  );

  return (
    <Panel className="animate-rise" glow>
      <PanelHeader
        title="Strategy Backtest Engine"
        sub="Vectorized backtest on real daily candles — Sharpe, drawdown, win-rate, turnover-costed"
        right={badge}
      />

      <div className="grid gap-4 p-4 lg:grid-cols-[280px_1fr]">
        {/* Controls */}
        <div className="space-y-3 rounded-md border border-line bg-panel/60 p-3">
          <label className="block">
            <span className="kpi-label">Symbol</span>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              spellCheck={false}
              className={cn(
                "mt-1 w-full rounded border bg-base/60 px-2 py-1 font-mono text-sm uppercase tracking-wide text-ink outline-none focus:border-accent/50",
                symbolValid ? "border-line" : "border-neg/60",
              )}
            />
            {!symbolValid ? <span className="mt-1 block font-mono text-2xs text-neg">1–10 of A–Z 0–9 . ^ -</span> : null}
          </label>

          <label className="block">
            <span className="kpi-label">Strategy</span>
            <select
              value={strategy}
              onChange={(e) => setStrategy(e.target.value as StrategyId)}
              className="mt-1 w-full rounded border border-line bg-base/60 px-2 py-1 font-mono text-sm text-ink outline-none focus:border-accent/50"
            >
              {STRATEGY_ORDER.map((id) => (
                <option key={id} value={id}>{STRATEGY_LABELS[id]}</option>
              ))}
            </select>
          </label>

          {/* Conditional parameters */}
          {strategy === "smaCross" ? (
            <div className="grid grid-cols-2 gap-2">
              {numberField("Fast MA", fast, setFast, { min: 2, max: 100 })}
              {numberField("Slow MA", slow, setSlow, { min: 5, max: 250 })}
            </div>
          ) : null}
          {strategy === "rsiReversion" ? (
            <div className="grid grid-cols-2 gap-2">
              {numberField("RSI Low", rsiLow, setRsiLow, { min: 5, max: 50 })}
              {numberField("RSI High", rsiHigh, setRsiHigh, { min: 50, max: 95 })}
            </div>
          ) : null}
          {strategy === "bollingerBreakout" || strategy === "donchian" ? (
            <div className="grid grid-cols-2 gap-2">{numberField("Lookback", lookback, setLookback, { min: 5, max: 120 })}</div>
          ) : null}

          <div className="grid grid-cols-2 items-end gap-2">
            {numberField("Cost (bps)", costBps, setCostBps, { min: 0, max: 100 })}
            <label className="flex cursor-pointer items-center gap-2 rounded border border-line bg-base/60 px-2 py-1.5">
              <input type="checkbox" checked={allowShort} onChange={(e) => setAllowShort(e.target.checked)} className="accent-[var(--accent)]" />
              <span className="font-mono text-2xs uppercase tracking-wider text-muted">Allow Short</span>
            </label>
          </div>

          <button
            onClick={() => void run()}
            disabled={!symbolValid || status === "loading"}
            className="btn btn-accent w-full disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status === "loading" ? "Running…" : "Run Backtest"}
          </button>
        </div>

        {/* Results */}
        <div className="space-y-4">
          {/* 1) Equity curve */}
          <div className="rounded-md border border-line bg-panel/60 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="section-label">Equity curve — strategy vs buy &amp; hold (normalized to 1.0)</span>
              <span className="flex items-center gap-3 font-mono text-2xs">
                <span className="flex items-center gap-1 text-accent"><span className="h-0.5 w-3 bg-accent" /> strategy</span>
                <span className="flex items-center gap-1 text-dim"><span className="h-0.5 w-3 bg-dim" /> buy &amp; hold</span>
              </span>
            </div>
            {data ? <EquityCurve equity={data.equity} benchmark={data.benchmark} /> : <div className="skeleton h-[240px] w-full" />}
          </div>

          {/* 2) Metric KPI deck */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { l: "Total Return", v: m ? fmtSignedPct(m.totalReturn) : "—", c: m ? signClass(m.totalReturn) : "text-ink" },
              { l: "vs Buy & Hold", v: m ? fmtSignedPct(vsBench) : "—", c: m ? signClass(vsBench) : "text-ink" },
              { l: "CAGR", v: m ? fmtSignedPct(m.cagr) : "—", c: m ? signClass(m.cagr) : "text-ink" },
              { l: "Sharpe", v: m ? fmtNum(m.sharpe) : "—", c: m ? (m.sharpe >= 1 ? "text-pos" : "text-accent") : "text-ink" },
              { l: "Sortino", v: m ? fmtNum(m.sortino) : "—", c: m ? (m.sortino >= 1 ? "text-pos" : "text-accent") : "text-ink" },
              { l: "Max Drawdown", v: m ? fmtSignedPct(m.maxDrawdown) : "—", c: "text-neg" },
              { l: "Win Rate", v: m ? `${fmtNum(m.winRate, 1)}%` : "—", c: "text-ink" },
              { l: "Calmar", v: m ? fmtNum(m.calmar) : "—", c: m ? signClass(m.calmar) : "text-ink" },
            ].map((k) => (
              <div key={k.l} className="rounded-md border border-line bg-panel/60 px-3 py-2.5">
                <div className="kpi-label">{k.l}</div>
                <div className={cn("mt-1.5 font-mono text-lg tabular-nums leading-none", k.c)}>{k.v}</div>
              </div>
            ))}
          </div>

          {/* 3) Stats strip */}
          <div className="grid grid-cols-2 gap-3 rounded-md border border-line bg-panel/40 px-4 py-3 sm:grid-cols-4">
            <Stat label="Trades" value={m ? String(m.trades) : "—"} />
            <Stat label="Exposure" value={m ? `${fmtNum(m.exposure, 1)}%` : "—"} tone="accent" />
            <Stat label="Ann. Vol" value={m ? `${fmtNum(m.volAnnual, 1)}%` : "—"} />
            <Stat label="Profit Factor" value={pf} tone={m && m.profitFactor >= 1 ? "pos" : undefined} />
          </div>
        </div>
      </div>

      <div className="border-t border-line px-4 py-2.5 text-2xs text-dim">
        Past performance of a rule is not predictive; costs {appliedCost}bps applied on every position change.
      </div>
    </Panel>
  );
}
