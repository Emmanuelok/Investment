"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Panel, PanelHeader, Chip, Stat, Th, Td } from "@/components/ui/kit";
import { ProgressBar } from "@/components/ui/viz";
import { Icon } from "@/components/icon-map";
import {
  covarianceMatrix,
  portfolioVol,
  riskContributions,
  buildWeights,
  SCHEME_LABELS,
  type Scheme,
} from "@/lib/engine/optimizer";
import { logReturns } from "@/lib/engine/correlation";
import { candleSeries } from "@/lib/rng";
import { fmtNum, fmtPct } from "@/lib/format";
import { cn } from "@/lib/cn";

type Status = "loading" | "live" | "demo";

/** Per-scheme result block, identical shape to the engine route payload. */
type SchemeStats = {
  weights: number[];
  volPct: number;
  retPct: number;
  sharpe: number;
  riskContrib: number[];
};

type SchemeMap = Record<Scheme, SchemeStats>;

type OptResponse =
  | { live: true; source: string; asOf: string; symbols: string[]; schemes: SchemeMap }
  | { live: false; error?: string };

/** The data the panel renders, plus the request context it resolved. */
type OptView = {
  symbols: string[];
  schemes: SchemeMap;
};

const DEFAULT_UNIVERSE = ["SPY", "QQQ", "TLT", "GLD", "XLE", "XLF", "IWM", "EFA"];
const SCHEMES: Scheme[] = ["equal", "inverseVol", "riskParity", "minVariance"];
const SYM_INPUT_RE = /^[A-Z0-9.^,-]+$/;
const MIN_SYMS = 2;
const MAX_SYMS = 10;

const mean = (xs: number[]): number => (xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : 0);

/**
 * Compute the {symbols, schemes} view locally with the identical engine code —
 * the sandbox route always answers {live:false}, so this is what renders.
 */
function demoView(symbols: string[]): OptView {
  // Deterministic closes -> log returns per symbol, aligned to the shortest run.
  const rets = symbols.map((sym) => logReturns(candleSeries(`${sym}-opt`, 252, 100, 0.016, 0.0003).map((c) => c.c)));
  const T = Math.min(...rets.map((r) => r.length));
  const aligned = rets.map((r) => r.slice(-T));
  const cov = covarianceMatrix(aligned);
  const mu = aligned.map((r) => mean(r) * 252);

  const schemes = Object.fromEntries(
    SCHEMES.map((scheme) => {
      const w = buildWeights(scheme, cov);
      const vol = portfolioVol(w, cov);
      const volPct = vol * 100;
      const retPct = w.reduce((a, wi, i) => a + wi * mu[i], 0) * 100;
      const sharpe = vol > 0 ? retPct / 100 / (volPct / 100) : 0;
      const riskContrib = riskContributions(w, cov);
      return [scheme, { weights: w, volPct, retPct, sharpe, riskContrib }];
    }),
  ) as SchemeMap;

  return { symbols, schemes };
}

export function OptimizerEngine() {
  const [status, setStatus] = useState<Status>("loading");
  const [view, setView] = useState<OptView | null>(null);
  const [source, setSource] = useState<string>("");
  const [updated, setUpdated] = useState<string>("");

  // editable universe + the active allocation scheme
  const [universe, setUniverse] = useState<string[]>(DEFAULT_UNIVERSE);
  const [draft, setDraft] = useState<string>(DEFAULT_UNIVERSE.join(","));
  const [inputErr, setInputErr] = useState<string>("");
  const [active, setActive] = useState<Scheme>("riskParity");

  const load = useCallback(async () => {
    setStatus("loading");
    const query = `symbols=${encodeURIComponent(universe.join(","))}`;
    try {
      const res = await fetch(`/api/engine/optimizer?${query}`, { cache: "no-store" });
      const j = (await res.json()) as OptResponse;
      if (j.live && j.symbols.length >= MIN_SYMS) {
        setView({ symbols: j.symbols, schemes: j.schemes });
        setSource(j.source);
        setUpdated(new Date(j.asOf).toLocaleTimeString("en-US", { hour12: false }));
        setStatus("live");
        return;
      }
      throw new Error(j.live ? "too few symbols" : (j.error ?? "engine offline"));
    } catch {
      // DEMO: compute locally on deterministic candle-derived closes.
      setView(demoView(universe));
      setSource("");
      setStatus("demo");
    }
  }, [universe]);

  // fetch on mount + whenever the universe changes
  useEffect(() => {
    void load();
  }, [load]);

  const applyUniverse = useCallback(() => {
    const raw = draft.toUpperCase().trim();
    if (!SYM_INPUT_RE.test(raw)) {
      setInputErr("Only A–Z, 0–9, . ^ , - allowed");
      return;
    }
    const next = Array.from(new Set(raw.split(",").map((s) => s.trim()).filter(Boolean)));
    if (next.length < MIN_SYMS) {
      setInputErr(`Need at least ${MIN_SYMS} symbols`);
      return;
    }
    if (next.length > MAX_SYMS) {
      setInputErr(`At most ${MAX_SYMS} symbols`);
      return;
    }
    setInputErr("");
    setDraft(next.join(","));
    setUniverse(next);
  }, [draft]);

  const activeStats = view?.schemes[active] ?? null;

  // allocation rows for the active scheme, sorted by target weight desc
  const allocation = useMemo(() => {
    if (!view || !activeStats) return [];
    return view.symbols
      .map((sym, i) => {
        const weight = activeStats.weights[i] ?? 0;
        const weightPct = weight * 100;
        const riskContrib = activeStats.riskContrib[i] ?? 0;
        return { sym, weightPct, riskContrib, riskHeavy: riskContrib > weightPct * 1.3 };
      })
      .sort((a, b) => b.weightPct - a.weightPct);
  }, [view, activeStats]);

  const maxWeight = useMemo(
    () => allocation.reduce((m, r) => Math.max(m, r.weightPct), 0) || 1,
    [allocation],
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
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-dim" /> optimizing…
      </span>
    );

  return (
    <Panel className="animate-rise">
      <PanelHeader
        title="Portfolio Construction Engine"
        sub="Equal-weight · inverse-vol · risk-parity · min-variance — real covariance optimization"
        right={badge}
      />

      {/* Controls: editable universe + scheme selector */}
      <div className="border-b border-line px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex min-w-[260px] flex-1 items-center gap-2">
            <label className="kpi-label shrink-0">Universe</label>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyUniverse();
              }}
              spellCheck={false}
              aria-label="Symbol universe (comma separated)"
              className="min-w-0 flex-1 rounded border border-line bg-base px-2 py-1 font-mono text-xs uppercase tracking-wide text-ink outline-none placeholder:text-dim focus:border-accent/50"
              placeholder="SPY,QQQ,TLT,GLD,…"
            />
            <button
              onClick={applyUniverse}
              className="shrink-0 rounded border border-line px-2.5 py-1 font-mono text-2xs uppercase tracking-wider text-dim hover:border-line-strong hover:text-ink"
            >
              Apply
            </button>
          </div>
        </div>
        {inputErr ? (
          <div className="mt-2 font-mono text-2xs text-warn">{inputErr}</div>
        ) : null}

        {/* Scheme selector — segmented chips */}
        <div className="mt-3 flex flex-wrap items-center gap-1">
          {SCHEMES.map((s) => (
            <button
              key={s}
              onClick={() => setActive(s)}
              aria-pressed={active === s}
              className={cn(
                "rounded border px-2.5 py-1 font-mono text-2xs uppercase tracking-wider transition-colors",
                active === s
                  ? "border-accent/40 bg-accent/10 text-accent"
                  : "border-line text-dim hover:border-line-strong hover:text-ink",
              )}
            >
              {SCHEME_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4 p-4">
        {/* 1) Scheme comparison — all four at a glance, fixed order */}
        <div className="overflow-x-auto rounded-md border border-line bg-panel/60">
          <table className="w-full min-w-[520px] border-collapse">
            <thead>
              <tr>
                <Th>Scheme</Th>
                <Th right>Ann. Return %</Th>
                <Th right>Ann. Vol %</Th>
                <Th right>Sharpe</Th>
              </tr>
            </thead>
            <tbody>
              {view ? (
                SCHEMES.map((s) => {
                  const st = view.schemes[s];
                  const isActive = s === active;
                  return (
                    <tr
                      key={s}
                      onClick={() => setActive(s)}
                      className={cn("cursor-pointer hover:bg-elevated/40", isActive && "bg-accent/5")}
                    >
                      <Td mono={false}>
                        <div className="flex items-center gap-2">
                          <span className={cn("text-sm", isActive ? "font-medium text-accent" : "text-ink")}>
                            {SCHEME_LABELS[s]}
                          </span>
                          {isActive ? <Chip tone="accent" className="text-[10px]">ACTIVE</Chip> : null}
                        </div>
                      </Td>
                      <Td right className={st.retPct >= 0 ? "text-pos" : "text-neg"}>{fmtPct(st.retPct, 2)}</Td>
                      <Td right className="text-muted">{fmtNum(st.volPct, 2)}%</Td>
                      <Td right className={cn("font-medium", st.sharpe >= 1 ? "text-pos" : "text-accent")}>
                        {fmtNum(st.sharpe, 2)}
                      </Td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <Td colSpan={4} className="py-6 text-center text-dim">
                    {status === "loading" ? "optimizing…" : "no schemes"}
                  </Td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 3) Active-scheme summary stats */}
        {activeStats ? (
          <div className="grid grid-cols-3 gap-2">
            <Stat
              label={`${SCHEME_LABELS[active]} · Ann. Vol`}
              value={`${fmtNum(activeStats.volPct, 2)}%`}
              tone="accent"
              className="rounded-md border border-line bg-panel/60 px-3 py-2.5"
            />
            <Stat
              label="Ann. Return"
              value={fmtPct(activeStats.retPct, 2)}
              tone={activeStats.retPct >= 0 ? "pos" : "neg"}
              className="rounded-md border border-line bg-panel/60 px-3 py-2.5"
            />
            <Stat
              label="Sharpe"
              value={fmtNum(activeStats.sharpe, 2)}
              tone={activeStats.sharpe >= 1 ? "pos" : "accent"}
              className="rounded-md border border-line bg-panel/60 px-3 py-2.5"
            />
          </div>
        ) : null}

        {/* 2) Active-scheme allocation — weight + risk contribution per symbol */}
        <div className="overflow-x-auto rounded-md border border-line bg-panel/60">
          <table className="w-full min-w-[560px] border-collapse">
            <thead>
              <tr>
                <Th>Symbol</Th>
                <Th>Target Weight %</Th>
                <Th right>Risk Contribution %</Th>
              </tr>
            </thead>
            <tbody>
              {allocation.length ? (
                allocation.map((r) => (
                  <tr key={r.sym} className="hover:bg-elevated/40">
                    <Td mono={false}>
                      <span className="inline-flex items-center rounded border border-line bg-elevated/70 px-1.5 py-0.5 font-mono text-xs font-medium text-ink">
                        {r.sym}
                      </span>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-3">
                        <ProgressBar
                          value={Math.max(0, r.weightPct)}
                          max={maxWeight}
                          color="var(--accent)"
                          height={6}
                          className="w-full"
                          showGlow
                        />
                        <span className="w-16 shrink-0 text-right font-mono text-sm tabular-nums text-ink">
                          {fmtNum(r.weightPct, 1)}%
                        </span>
                      </div>
                    </Td>
                    <Td right>
                      <div className="flex items-center justify-end gap-2">
                        {r.riskHeavy ? <Chip tone="warn">risk-heavy</Chip> : null}
                        <span className={cn("font-mono tabular-nums", r.riskHeavy ? "text-warn" : "text-ink")}>
                          {fmtNum(r.riskContrib, 1)}%
                        </span>
                      </div>
                    </Td>
                  </tr>
                ))
              ) : (
                <tr>
                  <Td colSpan={3} className="py-6 text-center text-dim">
                    {status === "loading" ? "optimizing…" : "no allocation"}
                  </Td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="border-t border-line px-4 py-2.5 text-2xs text-dim">
        Weights from each scheme&apos;s objective over the realized covariance. Risk parity equalizes each holding&apos;s
        risk contribution; min-variance minimizes portfolio vol. Long-only, fully invested.
        <Chip className="ml-2 align-middle">{view?.symbols.length ?? universe.length} symbols</Chip>
      </div>
    </Panel>
  );
}
