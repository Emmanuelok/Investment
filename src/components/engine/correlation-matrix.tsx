"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Panel, PanelHeader, Chip, Stat } from "@/components/ui/kit";
import { Icon } from "@/components/icon-map";
import { correlationMatrix, avgPairwiseCorr } from "@/lib/engine/correlation";
import { candleSeries } from "@/lib/rng";
import { cn } from "@/lib/cn";

type Status = "loading" | "live" | "demo";

type CorrPayload = {
  live: true;
  source: string;
  asOf: string;
  window: number;
  symbols: string[];
  matrix: number[][];
  avgCorr: number;
};
type CorrResponse = CorrPayload | { live: false };

type CorrView = {
  symbols: string[];
  matrix: number[][];
  avgCorr: number;
  window: number;
};

const DEFAULT_SYMS = ["SPY", "QQQ", "NVDA", "AAPL", "XLE", "TLT", "GLD", "BTC-USD"];
const SYM_INPUT_RE = /^[A-Z0-9.^,-]+$/;
const WINDOWS = [30, 90, 180] as const;
type WindowDays = (typeof WINDOWS)[number];

/** Build the correlation view locally from deterministic candle series. */
function demoView(symbols: string[], window: number): CorrView {
  const series: Record<string, number[]> = {};
  for (const sym of symbols) {
    series[sym] = candleSeries(sym + "-corr", 160, 100, 0.02, 0.0003).map((c) => c.c);
  }
  const cm = correlationMatrix(series, window);
  return { ...cm, avgCorr: Math.round(avgPairwiseCorr(cm) * 1000) / 1000, window };
}

/** Interpolate a cell background: positive→green, negative→red, near-zero→transparent. */
function cellBg(v: number): string {
  if (!Number.isFinite(v)) return "transparent";
  const a = Math.min(1, Math.abs(v)) * 0.85;
  if (v > 0) return `rgba(31,229,192,${a})`;
  if (v < 0) return `rgba(255,93,99,${a})`;
  return "transparent";
}

/** Most- and least-correlated off-diagonal pairs from the matrix. */
function extremePairs(symbols: string[], matrix: number[][]) {
  let hi = { a: "", b: "", v: -Infinity };
  let lo = { a: "", b: "", v: Infinity };
  for (let i = 0; i < symbols.length; i++) {
    for (let j = i + 1; j < symbols.length; j++) {
      const v = matrix[i]?.[j];
      if (!Number.isFinite(v)) continue;
      if (v > hi.v) hi = { a: symbols[i], b: symbols[j], v };
      if (v < lo.v) lo = { a: symbols[i], b: symbols[j], v };
    }
  }
  return {
    most: Number.isFinite(hi.v) ? hi : null,
    least: Number.isFinite(lo.v) ? lo : null,
  };
}

export function CorrelationMatrix() {
  const [status, setStatus] = useState<Status>("loading");
  const [view, setView] = useState<CorrView | null>(null);
  const [source, setSource] = useState<string>("");
  const [updated, setUpdated] = useState<string>("");

  // basket + window controls
  const [symbols, setSymbols] = useState<string[]>(DEFAULT_SYMS);
  const [window, setWindow] = useState<WindowDays>(90);
  const [draft, setDraft] = useState<string>(DEFAULT_SYMS.join(","));
  const [inputErr, setInputErr] = useState<string>("");

  const load = useCallback(async () => {
    setStatus("loading");
    const query = `symbols=${encodeURIComponent(symbols.join(","))}&window=${window}`;
    try {
      const r = await fetch(`/api/engine/correlation?${query}`, { cache: "no-store" });
      const j = (await r.json()) as CorrResponse;
      if (j.live && j.symbols.length >= 2) {
        setView({ symbols: j.symbols, matrix: j.matrix, avgCorr: j.avgCorr, window: j.window });
        setSource(j.source);
        setUpdated(new Date(j.asOf).toLocaleTimeString("en-US", { hour12: false }));
        setStatus("live");
      } else {
        setView(demoView(symbols, window));
        setStatus("demo");
      }
    } catch {
      setView(demoView(symbols, window));
      setStatus("demo");
    }
  }, [symbols, window]);

  useEffect(() => {
    load();
  }, [load]);

  const applyBasket = useCallback(() => {
    const raw = draft.toUpperCase().trim();
    if (!SYM_INPUT_RE.test(raw)) {
      setInputErr("Only A–Z, 0–9, . ^ , - allowed");
      return;
    }
    const next = Array.from(
      new Set(raw.split(",").map((s) => s.trim()).filter(Boolean)),
    ).slice(0, 12);
    if (next.length < 2) {
      setInputErr("Need at least 2 symbols");
      return;
    }
    setInputErr("");
    setDraft(next.join(","));
    setSymbols(next);
  }, [draft]);

  const n = view?.symbols.length ?? 0;
  const showValues = n > 0 && n <= 10;

  const pairs = useMemo(
    () => (view ? extremePairs(view.symbols, view.matrix) : { most: null, least: null }),
    [view],
  );

  const avg = view?.avgCorr ?? 0;
  const avgTone: "warn" | "pos" | undefined = avg > 0.6 ? "warn" : avg < 0.3 ? "pos" : undefined;
  const avgRead = avg > 0.6 ? "clustered" : avg < 0.3 ? "diversified" : "moderate";

  return (
    <Panel className="animate-rise">
      <PanelHeader
        title="Correlation Engine"
        sub="Pearson correlation of daily log-returns · diversification read"
        right={
          status === "loading" ? (
            <span className="flex items-center gap-1.5 font-mono text-2xs uppercase tracking-wider text-dim">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-dim" /> computing…
            </span>
          ) : status === "live" ? (
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
          ) : (
            <span className="flex items-center gap-1.5 rounded border border-warn/40 bg-warn/10 px-2 py-1 font-mono text-2xs uppercase tracking-wider text-warn">
              <Icon name="warn" width={12} height={12} /> ENGINE · DEMO DATA
            </span>
          )
        }
      />

      {/* Controls: editable basket + window selector */}
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-2.5">
        <div className="flex min-w-[260px] flex-1 items-center gap-2">
          <label className="kpi-label shrink-0">Basket</label>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyBasket();
            }}
            spellCheck={false}
            aria-label="Symbol basket (comma separated)"
            className="min-w-0 flex-1 rounded border border-line bg-base px-2 py-1 font-mono text-xs text-ink outline-none placeholder:text-dim focus:border-line-strong"
            placeholder="SPY,QQQ,NVDA,…"
          />
          <button
            onClick={applyBasket}
            className="shrink-0 rounded border border-line px-2.5 py-1 font-mono text-2xs uppercase tracking-wider text-dim hover:border-line-strong hover:text-ink"
          >
            Apply
          </button>
        </div>
        <div className="flex items-center gap-1">
          {WINDOWS.map((w) => (
            <button
              key={w}
              onClick={() => setWindow(w)}
              className={cn(
                "rounded border px-2.5 py-1 font-mono text-2xs uppercase tracking-wider transition-colors",
                window === w ? "border-accent/40 bg-accent/10 text-accent" : "border-line text-dim hover:border-line-strong hover:text-ink",
              )}
            >
              {w}d
            </button>
          ))}
        </div>
      </div>
      {inputErr ? (
        <div className="border-b border-line bg-warn/5 px-4 py-1.5 font-mono text-2xs text-warn">{inputErr}</div>
      ) : null}

      {/* Heatmap */}
      <div className="overflow-x-auto p-4">
        {view && n > 0 ? (
          <div
            className="grid w-max gap-px"
            style={{ gridTemplateColumns: `auto repeat(${n}, minmax(${showValues ? "40px" : "20px"}, 1fr))` }}
          >
            {/* top-left corner */}
            <div className="sticky left-0 z-10 bg-panel" />
            {/* column headers */}
            {view.symbols.map((s) => (
              <div key={`col-${s}`} className="px-1 pb-1 text-center font-mono text-2xs text-dim" title={s}>
                {s.replace("-USD", "")}
              </div>
            ))}

            {/* rows */}
            {view.symbols.map((rowSym, i) => (
              <div key={`row-${rowSym}`} className="contents">
                {/* row header */}
                <div
                  className="sticky left-0 z-10 flex items-center justify-end bg-panel pr-2 font-mono text-2xs text-dim"
                  title={rowSym}
                >
                  {rowSym.replace("-USD", "")}
                </div>
                {/* cells */}
                {view.symbols.map((colSym, j) => {
                  const v = view.matrix[i]?.[j] ?? 0;
                  const isDiag = i === j;
                  return (
                    <div
                      key={`${rowSym}-${colSym}`}
                      title={`${rowSym} · ${colSym}: ${v.toFixed(2)}`}
                      className={cn(
                        "grid aspect-square place-items-center rounded-[2px] font-mono text-[10px] tabular-nums",
                        isDiag ? "border border-accent/30 text-accent" : "text-ink/90",
                      )}
                      style={{ background: isDiag ? "transparent" : cellBg(v) }}
                    >
                      {showValues ? v.toFixed(2) : null}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center font-mono text-2xs text-dim">no matrix</div>
        )}
      </div>

      {/* Summary strip */}
      {view ? (
        <div className="grid grid-cols-2 gap-4 border-t border-line px-4 py-3 md:grid-cols-4">
          <Stat
            label="Avg pairwise corr"
            value={
              <span className="flex items-baseline gap-1.5">
                {avg.toFixed(2)}
                <span className="text-2xs uppercase tracking-wider">{avgRead}</span>
              </span>
            }
            tone={avgTone}
          />
          <Stat
            label="Most correlated"
            value={
              pairs.most ? (
                <span className="flex items-baseline gap-1.5">
                  <span className="text-warn">{pairs.most.v.toFixed(2)}</span>
                  <span className="text-2xs text-dim">{pairs.most.a.replace("-USD", "")}·{pairs.most.b.replace("-USD", "")}</span>
                </span>
              ) : (
                "—"
              )
            }
          />
          <Stat
            label="Least correlated"
            value={
              pairs.least ? (
                <span className="flex items-baseline gap-1.5">
                  <span className={pairs.least.v < 0 ? "text-neg" : "text-pos"}>{pairs.least.v.toFixed(2)}</span>
                  <span className="text-2xs text-dim">{pairs.least.a.replace("-USD", "")}·{pairs.least.b.replace("-USD", "")}</span>
                </span>
              ) : (
                "—"
              )
            }
          />
          <Stat label="Window" value={`${view.window}d`} tone="accent" />
        </div>
      ) : null}

      <div className="border-t border-line px-4 py-2.5 text-2xs text-dim">
        Lower average correlation = better diversification. Computed from log returns over the selected window.
        <Chip className="ml-2 align-middle">{n} symbols</Chip>
      </div>
    </Panel>
  );
}
