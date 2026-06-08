"use client";

import { useMemo, useState } from "react";
import { buildAssets, randomPortfolios, envelope, minVariance, maxSharpe, selectByRiskAversion, diversification, type Portfolio } from "@/lib/quant/portfolio";
import { fmtPct, fmtNum } from "@/lib/format";
import { cn } from "@/lib/cn";

type Objective = "mv" | "minvar" | "maxsharpe";

export function OptimizerLab() {
  const { assets, cov } = useMemo(() => buildAssets(), []);
  const cloud = useMemo(() => randomPortfolios(assets, cov, 1400), [assets, cov]);
  const front = useMemo(() => envelope(cloud), [cloud]);
  const mv = useMemo(() => minVariance(cloud), [cloud]);
  const ms = useMemo(() => maxSharpe(cloud), [cloud]);
  const [lambda, setLambda] = useState(8);
  const [obj, setObj] = useState<Objective>("mv");

  const selected: Portfolio = obj === "minvar" ? mv : obj === "maxsharpe" ? ms : selectByRiskAversion(cloud, lambda);
  const divRatio = diversification(selected, assets);

  // scatter scaling
  const W = 560, H = 320, pad = 34;
  const vols = cloud.map((p) => p.vol), rets = cloud.map((p) => p.ret);
  const vMin = Math.min(...vols), vMax = Math.max(...vols), rMin = Math.min(...rets), rMax = Math.max(...rets);
  const sx = (v: number) => pad + ((v - vMin) / (vMax - vMin || 1)) * (W - pad * 1.4);
  const sy = (r: number) => H - pad - ((r - rMin) / (rMax - rMin || 1)) * (H - pad * 1.7);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      <div className="panel p-3">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="section-label">Efficient Frontier — {cloud.length} simulated long-only portfolios</span>
          <div className="ml-auto flex gap-1">
            {([["mv", "Mean-Variance"], ["minvar", "Min-Variance"], ["maxsharpe", "Max-Sharpe"]] as [Objective, string][]).map(([k, l]) => (
              <button key={k} onClick={() => setObj(k)} className={cn("rounded border px-2 py-0.5 font-mono text-2xs uppercase tracking-wider transition-colors", obj === k ? "border-accent/40 bg-accent/10 text-accent" : "border-line text-dim hover:text-muted")}>{l}</button>
            ))}
          </div>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
          {/* axes */}
          <line x1={pad} y1={H - pad} x2={W - 8} y2={H - pad} stroke="var(--line)" />
          <line x1={pad} y1={8} x2={pad} y2={H - pad} stroke="var(--line)" />
          <text x={W - 8} y={H - pad + 16} fontSize={9} fontFamily="var(--font-mono)" fill="var(--dim)" textAnchor="end">volatility →</text>
          <text x={pad - 6} y={14} fontSize={9} fontFamily="var(--font-mono)" fill="var(--dim)" textAnchor="start">↑ expected return</text>
          {/* cloud */}
          {cloud.filter((_, i) => i % 2 === 0).map((p, i) => (
            <circle key={i} cx={sx(p.vol)} cy={sy(p.ret)} r={1.3} fill="var(--dim)" opacity={0.4} />
          ))}
          {/* frontier */}
          <path d={front.map((p, i) => `${i === 0 ? "M" : "L"}${sx(p.vol).toFixed(1)},${sy(p.ret).toFixed(1)}`).join(" ")} fill="none" stroke="var(--accent)" strokeWidth={1.6} />
          {/* special points */}
          <circle cx={sx(mv.vol)} cy={sy(mv.ret)} r={4} fill="var(--info)" />
          <circle cx={sx(ms.vol)} cy={sy(ms.ret)} r={4} fill="var(--accent)" />
          {/* selected */}
          <circle cx={sx(selected.vol)} cy={sy(selected.ret)} r={6} fill="none" stroke="var(--ink)" strokeWidth={2} />
          <circle cx={sx(selected.vol)} cy={sy(selected.ret)} r={2.5} fill="var(--ink)" />
        </svg>
        <div className="mt-1 flex flex-wrap items-center gap-3 font-mono text-2xs text-dim">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-info" /> min-variance</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-accent" /> max-Sharpe (tangency)</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full border-2 border-ink" /> your portfolio</span>
        </div>
      </div>

      <div className="space-y-3">
        <div className="panel p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="section-label">Risk aversion λ</span>
            <span className="font-mono text-sm text-accent">{lambda}</span>
          </div>
          <input type="range" min={1} max={40} step={1} value={lambda} onChange={(e) => { setLambda(parseFloat(e.target.value)); setObj("mv"); }} className="w-full accent-[var(--accent)]" />
          <div className="mt-1 flex justify-between font-mono text-2xs text-dim"><span>aggressive</span><span>conservative</span></div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { l: "Exp. Return", v: fmtPct(selected.ret * 100, 1), t: "pos" },
            { l: "Volatility", v: fmtPct(selected.vol * 100, 1) },
            { l: "Sharpe", v: fmtNum(selected.sharpe, 2), t: "accent" },
          ].map((s) => (
            <div key={s.l} className="panel px-2.5 py-2">
              <div className="kpi-label">{s.l}</div>
              <div className={cn("mt-1 font-mono text-sm tabular-nums", s.t === "pos" ? "text-pos" : s.t === "accent" ? "text-accent" : "text-ink")}>{s.v}</div>
            </div>
          ))}
        </div>
        <div className="panel p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="section-label">Optimal weights</span>
            <span className="font-mono text-2xs text-dim">div ratio {fmtNum(divRatio, 2)}</span>
          </div>
          <div className="space-y-1.5">
            {assets.map((a, i) => (
              <div key={a.sym} className="flex items-center gap-2">
                <span className="w-12 font-mono text-2xs text-muted">{a.sym}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-line">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, selected.w[i] * 100)}%` }} />
                </div>
                <span className="w-10 text-right font-mono text-2xs tabular-nums text-ink">{fmtPct(selected.w[i] * 100, 1)}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-2xs text-dim">Long-only, fully-invested. Covariance from a one-factor model (PSD). Drag λ to traverse the frontier; weights re-solve live.</p>
        </div>
      </div>
    </div>
  );
}
