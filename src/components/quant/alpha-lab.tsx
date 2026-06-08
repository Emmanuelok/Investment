"use client";

import { useMemo, useState } from "react";
import { buildPanel, evaluateAlpha, ALPHA_PRESETS, DSL_FUNCS } from "@/lib/quant/alpha-dsl";
import { Sparkline } from "@/components/ui/viz";
import { fmtNum, fmtPct } from "@/lib/format";
import { cn } from "@/lib/cn";

export function AlphaLab() {
  const panel = useMemo(() => buildPanel(140), []);
  const [expr, setExpr] = useState(ALPHA_PRESETS[0].expr);
  const res = useMemo(() => evaluateAlpha(expr, panel), [expr, panel]);

  const maxDecile = res.ok ? Math.max(...res.decileReturns.map((v) => Math.abs(v)), 1e-9) : 1;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="space-y-3">
        <div className="panel p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="section-label">Alpha expression</span>
            <span className="font-mono text-2xs text-dim">{panel.E} entities × {panel.T} days · point-in-time</span>
          </div>
          <textarea
            value={expr}
            onChange={(e) => setExpr(e.target.value)}
            spellCheck={false}
            rows={2}
            className="w-full resize-none rounded border border-line bg-base/60 px-3 py-2 font-mono text-sm text-accent outline-none focus:border-accent/40"
          />
          <div className="mt-2 flex flex-wrap gap-1">
            {ALPHA_PRESETS.map((p) => (
              <button key={p.label} onClick={() => setExpr(p.expr)} className="rounded border border-line px-2 py-0.5 text-2xs text-dim transition-colors hover:border-ai/40 hover:text-ink">
                {p.label}
              </button>
            ))}
          </div>
          {!res.ok ? <div className="mt-2 rounded border border-neg/40 bg-neg/10 px-3 py-2 font-mono text-2xs text-neg">⚠ {res.error}</div> : null}
        </div>

        {res.ok ? (
          <div className="panel p-3">
            <div className="mb-2 section-label">Forward return by signal decile (annualized) — monotonic = predictive</div>
            <svg viewBox="0 0 520 150" className="w-full">
              <line x1={0} y1={75} x2={520} y2={75} stroke="var(--line)" />
              {res.decileReturns.map((v, i) => {
                const h = (Math.abs(v) / maxDecile) * 64;
                const x = i * 52 + 6;
                return (
                  <g key={i}>
                    <rect x={x} y={v >= 0 ? 75 - h : 75} width={40} height={Math.max(1, h)} fill={v >= 0 ? "var(--pos)" : "var(--neg)"} opacity={0.5 + 0.5 * (Math.abs(v) / maxDecile)} />
                    <text x={x + 20} y={145} fontSize={8} fontFamily="var(--font-mono)" fill="var(--dim)" textAnchor="middle">D{i + 1}</text>
                  </g>
                );
              })}
            </svg>
          </div>
        ) : null}
      </div>

      <div className="space-y-3">
        {res.ok ? (
          <>
            <div className="grid grid-cols-2 gap-2">
              {[
                { l: "Information Coeff", v: fmtNum(res.ic, 3), t: Math.abs(res.ic) > 0.03 ? (res.ic > 0 ? "pos" : "neg") : "muted" },
                { l: "Fitness", v: fmtNum(res.fitness, 2), t: res.fitness > 0.5 ? "accent" : "muted" },
                { l: "Turnover", v: fmtNum(res.turnover, 2), t: "muted" },
                { l: "Coverage", v: fmtPct(res.coverage * 100, 0), t: "muted" },
              ].map((s) => (
                <div key={s.l} className="panel px-3 py-2">
                  <div className="kpi-label">{s.l}</div>
                  <div className={cn("mt-1 font-mono text-base tabular-nums", s.t === "pos" ? "text-pos" : s.t === "neg" ? "text-neg" : s.t === "accent" ? "text-accent" : "text-ink")}>{s.v}</div>
                </div>
              ))}
            </div>
            <div className="panel p-3">
              <div className="mb-1 section-label">IC over time</div>
              {res.icByTime.length > 3 ? <Sparkline data={res.icByTime} width={290} height={36} color={res.ic >= 0 ? "var(--pos)" : "var(--neg)"} className="w-full" /> : null}
              <p className="mt-2 text-2xs text-dim">A stable, sizable |IC| with low turnover is the goal. This evaluates strictly point-in-time — the signal at <span className="font-mono">t</span> is scored against the return from <span className="font-mono">t→t+1</span>.</p>
            </div>
          </>
        ) : null}
        <div className="panel p-3">
          <div className="mb-1.5 section-label">Operators</div>
          <div className="flex flex-wrap gap-1">
            {DSL_FUNCS.map((f) => (
              <button key={f} onClick={() => setExpr((e) => `${f}(${e})`)} className="rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-dim hover:border-accent/40 hover:text-accent">{f}</button>
            ))}
          </div>
          <div className="mt-2 mb-1 section-label">Fields</div>
          <div className="flex flex-wrap gap-1">
            {["close", "open", "high", "low", "volume", "vwap", "returns"].map((f) => (
              <span key={f} className="rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-muted">{f}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
