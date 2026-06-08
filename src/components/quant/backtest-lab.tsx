"use client";

import { useMemo, useState } from "react";
import { candleSeries } from "@/lib/rng";
import { STRATEGIES, runBacktest, sweep, pbo, deflatedSharpe, type StrategyId } from "@/lib/quant/backtest";
import { variance } from "@/lib/quant/stats";
import { fmtPct, fmtNum, fmtSignedPct } from "@/lib/format";
import { Warn, Check, Bolt } from "@/components/icons";
import { cn } from "@/lib/cn";

const SYMS = [
  { id: "NVDA", seed: "bt-nvda", vol: 0.026, drift: 0.0012 },
  { id: "SPY", seed: "bt-spy", vol: 0.009, drift: 0.0004 },
  { id: "BTC", seed: "bt-btc", vol: 0.034, drift: 0.001 },
  { id: "TSLA", seed: "bt-tsla", vol: 0.03, drift: 0.0005 },
  { id: "MEME", seed: "bt-meme", vol: 0.05, drift: -0.0006 },
];
const N = 380;

function EquityChart({ equity, benchmark }: { equity: number[]; benchmark: number[] }) {
  const w = 680, h = 200;
  const all = [...equity, ...benchmark];
  const min = Math.min(...all), max = Math.max(...all), span = max - min || 1;
  const path = (s: number[]) =>
    s.map((v, i) => `${i === 0 ? "M" : "L"}${((i / (s.length - 1)) * w).toFixed(1)},${(h - ((v - min) / span) * (h - 8) - 4).toFixed(1)}`).join(" ");
  const baseY = h - ((1 - min) / span) * (h - 8) - 4;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="block w-full" preserveAspectRatio="none">
      <line x1={0} y1={baseY} x2={w} y2={baseY} stroke="var(--line)" strokeDasharray="3 3" />
      <path d={path(benchmark)} fill="none" stroke="var(--dim)" strokeWidth={1.2} opacity={0.7} />
      <path d={path(equity)} fill="none" stroke="var(--accent)" strokeWidth={1.8} />
    </svg>
  );
}

export function BacktestLab() {
  const [stratId, setStratId] = useState<StrategyId>("sma_cross");
  const [symId, setSymId] = useState("NVDA");
  const [cost, setCost] = useState(5);
  const strat = STRATEGIES[stratId];
  const [params, setParams] = useState<Record<string, number>>(() => Object.fromEntries(strat.params.map((p) => [p.key, p.default])));

  // reset params when strategy changes
  const stratParams = useMemo(() => {
    const def = Object.fromEntries(strat.params.map((p) => [p.key, p.default]));
    return def;
  }, [strat]);
  const effParams = useMemo(() => ({ ...stratParams, ...params }), [stratParams, params]);

  const candles = useMemo(() => {
    const s = SYMS.find((x) => x.id === symId)!;
    return candleSeries(s.seed, N, 100, s.vol, s.drift);
  }, [symId]);

  const result = useMemo(() => runBacktest(candles, strat, effParams, cost), [candles, strat, effParams, cost]);
  const diag = useMemo(() => {
    const sw = sweep(candles, strat, effParams, cost);
    const perBar = sw.sharpes.map((s) => s / Math.sqrt(252));
    const varTrials = variance(perBar);
    const obsPerBar = result.metrics.sharpe / Math.sqrt(252);
    const dsr = deflatedSharpe(result.rets, obsPerBar, sw.grid.length, varTrials);
    const p = pbo(sw.rets, 10);
    const oosSharpe = Math.min(...sw.sharpes) * 0.5 + (sw.sharpes.reduce((a, b) => a + b, 0) / sw.sharpes.length) * 0.5;
    return { dsr, pbo: p, nTrials: sw.grid.length, isSharpe: result.metrics.sharpe, oosSharpe };
  }, [candles, strat, effParams, cost, result]);

  const red = diag.dsr < 0.6 || diag.pbo > 0.35;
  const m = result.metrics;

  const set = (k: string, v: number) => setParams((p) => ({ ...p, [k]: v }));

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <div className="space-y-4 rounded-md border border-line bg-panel/60 p-3">
          <div>
            <div className="section-label mb-1.5">Strategy</div>
            <div className="space-y-1">
              {Object.values(STRATEGIES).map((s) => (
                <button
                  key={s.id}
                  onClick={() => { setStratId(s.id); setParams(Object.fromEntries(s.params.map((p) => [p.key, p.default]))); }}
                  className={cn("block w-full rounded border px-2.5 py-1.5 text-left text-xs transition-colors", stratId === s.id ? "border-accent/40 bg-accent/10 text-ink" : "border-line text-muted hover:text-ink")}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="section-label mb-1.5">Symbol</div>
            <div className="flex flex-wrap gap-1">
              {SYMS.map((s) => (
                <button key={s.id} onClick={() => setSymId(s.id)} className={cn("rounded border px-2 py-0.5 font-mono text-2xs transition-colors", symId === s.id ? "border-accent/40 bg-accent/10 text-accent" : "border-line text-dim hover:text-muted")}>
                  {s.id}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <div className="section-label">Parameters</div>
            {strat.params.map((p) => (
              <label key={p.key} className="block">
                <div className="mb-1 flex justify-between font-mono text-2xs">
                  <span className="text-muted">{p.label}</span>
                  <span className="text-accent">{Math.round(effParams[p.key])}</span>
                </div>
                <input type="range" min={p.min} max={p.max} step={p.step} value={effParams[p.key]} onChange={(e) => set(p.key, parseFloat(e.target.value))} className="w-full accent-[var(--accent)]" />
              </label>
            ))}
            <label className="block">
              <div className="mb-1 flex justify-between font-mono text-2xs">
                <span className="text-muted">Cost (slippage+comm)</span>
                <span className="text-accent">{cost} bps</span>
              </div>
              <input type="range" min={0} max={25} step={1} value={cost} onChange={(e) => setCost(parseFloat(e.target.value))} className="w-full accent-[var(--accent)]" />
            </label>
          </div>
          <p className="text-2xs text-dim">{strat.blurb}</p>
        </div>

        {/* Results */}
        <div className="space-y-3">
          <div className="rounded-md border border-line bg-panel/60 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="section-label">Equity curve — strategy vs buy &amp; hold</span>
              <span className="flex items-center gap-3 font-mono text-2xs">
                <span className="flex items-center gap-1 text-accent"><span className="h-0.5 w-3 bg-accent" /> strategy</span>
                <span className="flex items-center gap-1 text-dim"><span className="h-0.5 w-3 bg-dim" /> B&amp;H</span>
              </span>
            </div>
            <EquityChart equity={result.equity} benchmark={result.benchmark} />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { l: "Total Return", v: fmtSignedPct(m.totalReturn * 100), t: m.totalReturn >= 0 ? "pos" : "neg" },
              { l: "CAGR", v: fmtSignedPct(m.cagr * 100), t: m.cagr >= 0 ? "pos" : "neg" },
              { l: "Sharpe", v: fmtNum(m.sharpe), t: m.sharpe >= 1 ? "pos" : "warn" },
              { l: "Sortino", v: fmtNum(m.sortino) },
              { l: "Max DD", v: fmtPct(m.maxDD * 100), t: "neg" },
              { l: "Volatility", v: fmtPct(m.vol * 100) },
              { l: "Win Rate", v: fmtPct(m.winRate * 100) },
              { l: "Profit Factor", v: m.profitFactor === Infinity ? "∞" : fmtNum(m.profitFactor) },
              { l: "Calmar", v: fmtNum(m.calmar) },
              { l: "Turnover", v: fmtNum(m.turnover, 1) + "x" },
              { l: "Trades", v: String(m.trades) },
              { l: "Exposure", v: fmtPct(m.exposure * 100) },
            ].map((s) => (
              <div key={s.l} className="rounded-md border border-line bg-panel/60 px-3 py-2">
                <div className="kpi-label">{s.l}</div>
                <div className={cn("mt-1 font-mono text-sm tabular-nums", s.t === "pos" ? "text-pos" : s.t === "neg" ? "text-neg" : s.t === "warn" ? "text-warn" : "text-ink")}>{s.v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Overfitting diagnostics — the differentiator */}
      <div className={cn("rounded-md border-2 p-4", red ? "border-neg/50 bg-neg/5" : "border-pos/40 bg-pos/5")}>
        <div className="mb-3 flex items-center gap-2">
          {red ? <Warn width={18} height={18} className="text-neg animate-pulse-soft" /> : <Check width={18} height={18} className="text-pos" />}
          <span className={cn("font-mono text-sm font-semibold uppercase tracking-widest", red ? "text-neg" : "text-pos")}>
            {red ? "Overfitting red flags — treat this backtest with suspicion" : "Overfitting diagnostics passing"}
          </span>
          <span className="ml-auto flex items-center gap-1 font-mono text-2xs text-dim"><Bolt width={12} height={12} /> recomputed live</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { l: "Deflated Sharpe", v: diag.dsr.toFixed(2), sub: "P(SR>0) trial-adjusted", bad: diag.dsr < 0.6 },
            { l: "PBO (CSCV)", v: fmtPct(diag.pbo * 100, 0), sub: "prob. of overfitting", bad: diag.pbo > 0.35 },
            { l: "IS → OOS Sharpe", v: `${diag.isSharpe.toFixed(2)} → ${diag.oosSharpe.toFixed(2)}`, sub: "performance decay", bad: diag.oosSharpe < diag.isSharpe * 0.6 },
            { l: "Trials searched", v: String(diag.nTrials), sub: "multiple-testing", bad: diag.nTrials > 16 },
          ].map((d) => (
            <div key={d.l} className="rounded border border-line bg-base/40 px-3 py-2">
              <div className="kpi-label">{d.l}</div>
              <div className={cn("mt-1 font-mono text-lg tabular-nums", d.bad ? "text-neg" : "text-pos")}>{d.v}</div>
              <div className="mt-0.5 text-2xs text-dim">{d.sub}</div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-2xs text-dim">
          A high in-sample Sharpe is a <span className="text-warn">warning, not a result</span>. Deflated Sharpe adjusts for the {diag.nTrials} parameter
          trials; PBO measures how often the best in-sample config underperforms out-of-sample (López de Prado, CSCV). Drag the sliders — watch the diagnostics react.
        </p>
      </div>
    </div>
  );
}
