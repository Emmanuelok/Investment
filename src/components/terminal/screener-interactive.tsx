"use client";

import { useMemo, useState } from "react";
import { securities, type Security } from "@/lib/data";
import { useAppState } from "@/components/providers/app-state";
import { fmtCompact, fmtNum } from "@/lib/format";
import { Search, Sparkle } from "@/components/icons";
import { cn } from "@/lib/cn";

type SortKey = keyof Pick<Security, "mktcap" | "pe" | "revGrowth" | "fcfYield" | "beta" | "rsi" | "momentum" | "short">;
const COLS: { key: SortKey; label: string; fmt: (s: Security) => string }[] = [
  { key: "mktcap", label: "Mkt Cap", fmt: (s) => "$" + fmtCompact(s.mktcap * 1e9) },
  { key: "pe", label: "P/E", fmt: (s) => fmtNum(s.pe, 1) },
  { key: "revGrowth", label: "Rev Gr%", fmt: (s) => fmtNum(s.revGrowth, 1) },
  { key: "fcfYield", label: "FCF Yld%", fmt: (s) => fmtNum(s.fcfYield, 1) },
  { key: "beta", label: "Beta", fmt: (s) => fmtNum(s.beta, 2) },
  { key: "rsi", label: "RSI", fmt: (s) => String(s.rsi) },
  { key: "momentum", label: "Mom%", fmt: (s) => fmtNum(s.momentum, 1) },
  { key: "short", label: "Short%", fmt: (s) => fmtNum(s.short, 1) },
];

type Filters = { maxPe: number; minRev: number; minFcf: number; maxBeta: number; minRsi: number; maxRsi: number; sectors: Set<string> };
const FULL: Filters = { maxPe: 70, minRev: -20, minFcf: -10, maxBeta: 2, minRsi: 0, maxRsi: 100, sectors: new Set() };

const PRESETS: { label: string; apply: () => Partial<Filters> }[] = [
  { label: "Cheap fast growers", apply: () => ({ maxPe: 25, minRev: 20, minFcf: 0 }) },
  { label: "Low-beta quality", apply: () => ({ maxBeta: 0.9, minFcf: 3 }) },
  { label: "Momentum leaders", apply: () => ({ minRsi: 55, minRev: 10 }) },
  { label: "Oversold value", apply: () => ({ maxRsi: 40, maxPe: 20 }) },
];

export function ScreenerInteractive() {
  const universe = useMemo(() => securities(48), []);
  const sectors = useMemo(() => Array.from(new Set(universe.map((s) => s.sector))).sort(), [universe]);
  const [f, setF] = useState<Filters>({ ...FULL, sectors: new Set() });
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "mktcap", dir: -1 });
  const { isWatched, toggleWatch } = useAppState();

  const results = useMemo(() => {
    let r = universe.filter(
      (s) =>
        s.pe <= f.maxPe && s.revGrowth >= f.minRev && s.fcfYield >= f.minFcf && s.beta <= f.maxBeta && s.rsi >= f.minRsi && s.rsi <= f.maxRsi &&
        (f.sectors.size === 0 || f.sectors.has(s.sector)) &&
        (q.trim() === "" || s.sym.toLowerCase().includes(q.toLowerCase()) || s.sector.toLowerCase().includes(q.toLowerCase())),
    );
    r = r.slice().sort((a, b) => (a[sort.key] < b[sort.key] ? -1 : 1) * sort.dir);
    return r;
  }, [universe, f, q, sort]);

  const num = (k: keyof Filters, label: string, min: number, max: number, step: number, suffix = "") => (
    <label className="block">
      <div className="mb-1 flex justify-between font-mono text-2xs">
        <span className="text-muted">{label}</span>
        <span className="text-accent">{f[k] as number}{suffix}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={f[k] as number} onChange={(e) => setF((p) => ({ ...p, [k]: parseFloat(e.target.value) }))} className="w-full accent-[var(--accent)]" />
    </label>
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
      <div className="space-y-4 rounded-md border border-line bg-panel/60 p-3">
        <div className="flex items-center gap-2 rounded border border-ai/30 bg-ai/5 px-2.5 py-2">
          <Sparkle width={14} height={14} className="text-ai" />
          <span className="text-2xs text-muted">Ask ATHENA in plain English — or use a preset:</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {PRESETS.map((p) => (
            <button key={p.label} onClick={() => setF((prev) => ({ ...FULL, sectors: prev.sectors, ...p.apply() }))} className="rounded border border-line px-2 py-1 text-2xs text-muted transition-colors hover:border-ai/40 hover:text-ink">
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 rounded border border-line bg-base/50 px-2.5 py-1.5">
          <Search width={14} height={14} className="text-dim" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ticker or sector…" className="w-full bg-transparent text-xs text-ink outline-none placeholder:text-dim" />
        </div>
        <div className="space-y-3">
          {num("maxPe", "Max P/E", 5, 70, 1)}
          {num("minRev", "Min Rev Growth", -20, 60, 1, "%")}
          {num("minFcf", "Min FCF Yield", -10, 12, 0.5, "%")}
          {num("maxBeta", "Max Beta", 0.4, 2, 0.05)}
          {num("minRsi", "Min RSI", 0, 100, 1)}
          {num("maxRsi", "Max RSI", 0, 100, 1)}
        </div>
        <div>
          <div className="section-label mb-1.5">Sectors</div>
          <div className="flex flex-wrap gap-1">
            {sectors.map((sec) => (
              <button
                key={sec}
                onClick={() => setF((p) => { const n = new Set(p.sectors); n.has(sec) ? n.delete(sec) : n.add(sec); return { ...p, sectors: n }; })}
                className={cn("rounded border px-1.5 py-0.5 text-[10px] transition-colors", f.sectors.has(sec) ? "border-accent/40 bg-accent/10 text-accent" : "border-line text-dim hover:text-muted")}
              >
                {sec}
              </button>
            ))}
          </div>
        </div>
        <button onClick={() => { setF({ ...FULL, sectors: new Set() }); setQ(""); }} className="w-full rounded border border-line py-1.5 text-2xs text-dim hover:text-ink">
          Reset filters
        </button>
      </div>

      <div className="overflow-hidden rounded-md border border-line">
        <div className="flex items-center justify-between border-b border-line px-3 py-2">
          <span className="section-label">Results</span>
          <span className="font-mono text-xs text-accent">{results.length} <span className="text-dim">/ {universe.length} match</span></span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr>
                <th className="border-b border-line px-3 py-2 text-left font-mono text-2xs uppercase tracking-widest text-dim">Ticker</th>
                {COLS.map((c) => (
                  <th key={c.key} onClick={() => setSort((s) => ({ key: c.key, dir: s.key === c.key ? (s.dir === 1 ? -1 : 1) : -1 }))} className="cursor-pointer select-none border-b border-line px-3 py-2 text-right font-mono text-2xs uppercase tracking-widest text-dim hover:text-muted">
                    {c.label}{sort.key === c.key ? (sort.dir === 1 ? " ↑" : " ↓") : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.map((s) => (
                <tr key={s.sym} className="border-b border-line/50 transition-colors hover:bg-elevated/40">
                  <td className="px-3 py-1.5">
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleWatch(s.sym)} className={cn("text-sm leading-none", isWatched(s.sym) ? "text-accent" : "text-faint hover:text-dim")} title="watchlist">★</button>
                      <span className="font-mono text-xs font-medium text-ink">{s.sym}</span>
                      <span className="truncate text-2xs text-dim">{s.sector}</span>
                    </div>
                  </td>
                  {COLS.map((c) => (
                    <td key={c.key} className={cn("px-3 py-1.5 text-right font-mono text-xs tabular-nums", c.key === "momentum" ? (s.momentum >= 0 ? "text-pos" : "text-neg") : "text-muted")}>
                      {c.fmt(s)}
                    </td>
                  ))}
                </tr>
              ))}
              {results.length === 0 ? <tr><td colSpan={COLS.length + 1} className="px-3 py-8 text-center text-sm text-dim">No matches — loosen the filters.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
