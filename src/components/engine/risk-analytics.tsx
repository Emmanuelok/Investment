"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Panel, PanelHeader, Chip, Stat, Th, Td } from "@/components/ui/kit";
import { Icon } from "@/components/icon-map";
import { rollingMetrics, drawdownAnalytics } from "@/lib/engine/riskmetrics";
import { candleSeries } from "@/lib/rng";
import { fmtNum, fmtSignedPct, signClass } from "@/lib/format";
import { cn } from "@/lib/cn";

type Status = "loading" | "live" | "demo";

type Episode = {
  startIdx: number;
  troughIdx: number;
  endIdx: number | null;
  depthPct: number;
  lengthBars: number;
  recovered: boolean;
};

type RiskPayload = {
  live: true;
  source: string;
  asOf: string;
  symbol: string;
  benchmark: string;
  window: number;
  rolling: { sharpe: number[]; vol: number[]; beta: number[] | null };
  underwater: number[];
  maxDrawdownPct: number;
  currentDrawdownPct: number;
  ulcerIndex: number;
  inDrawdown: boolean;
  longestBars: number;
  episodes: Episode[];
};
type RiskResponse = RiskPayload | { live: false };

/** The slice of the payload the UI actually renders. */
type RiskView = {
  symbol: string;
  benchmark: string;
  window: number;
  rolling: { sharpe: number[]; vol: number[]; beta: number[] | null };
  underwater: number[];
  maxDrawdownPct: number;
  currentDrawdownPct: number;
  ulcerIndex: number;
  inDrawdown: boolean;
  longestBars: number;
  episodes: Episode[];
};

const SYM_RE = /^[A-Z0-9.^-]{1,10}$/;
const WINDOWS = [21, 63, 126] as const;
type WindowDays = (typeof WINDOWS)[number];
type MetricKey = "sharpe" | "vol" | "beta";

/** Build the full risk view locally from deterministic candle series. */
function demoView(symbol: string, benchmark: string, window: number): RiskView {
  const closes = candleSeries(symbol + "-rm", 500, 100, 0.018, 0.0004).map((c) => c.c);
  const hasBench = benchmark !== symbol;
  const benchCloses = hasBench ? candleSeries(benchmark + "-rm", 500, 100, 0.014, 0.0004).map((c) => c.c) : undefined;
  const rm = rollingMetrics(closes, window, benchCloses);
  const dd = drawdownAnalytics(closes);
  return {
    symbol,
    benchmark,
    window,
    rolling: {
      sharpe: rm.map((p) => p.sharpe),
      vol: rm.map((p) => p.vol),
      beta: hasBench ? rm.map((p) => p.beta ?? 0) : null,
    },
    underwater: dd.underwater,
    maxDrawdownPct: dd.maxDrawdownPct,
    currentDrawdownPct: dd.currentDrawdownPct,
    ulcerIndex: dd.ulcerIndex,
    inDrawdown: dd.inDrawdown,
    longestBars: dd.longestBars,
    episodes: dd.episodes,
  };
}

/* ── Rolling-metric chart (one series at a time, auto-scaled) ───────────────── */
const ROLL_W = 720;
const ROLL_H = 200;
const R_PADX = 8;
const R_PADY = 14;

const METRIC_META: Record<MetricKey, { label: string; color: string; zeroLine: boolean }> = {
  sharpe: { label: "Rolling Sharpe", color: "var(--accent)", zeroLine: true },
  vol: { label: "Rolling Vol (ann %)", color: "var(--accent)", zeroLine: false },
  beta: { label: "Rolling Beta", color: "var(--accent)", zeroLine: true },
};

function RollingChart({ series, metric }: { series: number[]; metric: MetricKey }) {
  const meta = METRIC_META[metric];
  const n = series.length;
  const { min, max } = useMemo(() => {
    if (!n) return { min: 0, max: 1 };
    let lo = Math.min(...series);
    let hi = Math.max(...series);
    if (meta.zeroLine) {
      lo = Math.min(lo, 0);
      hi = Math.max(hi, 0);
    }
    if (lo === hi) {
      lo -= 1;
      hi += 1;
    }
    const pad = (hi - lo) * 0.08;
    return { min: lo - pad, max: hi + pad };
  }, [series, n, meta.zeroLine]);

  const x = (i: number) => R_PADX + (n <= 1 ? 0 : (i / (n - 1)) * (ROLL_W - 2 * R_PADX));
  const y = (v: number) => R_PADY + (1 - (v - min) / (max - min)) * (ROLL_H - 2 * R_PADY);
  const line = series.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const zeroY = y(0);
  const showZero = meta.zeroLine && 0 >= min && 0 <= max;

  return (
    <svg viewBox={`0 0 ${ROLL_W} ${ROLL_H}`} className="block w-full" preserveAspectRatio="none" role="img" aria-label={`${meta.label} over time`}>
      {/* top / bottom scale guides */}
      <line x1={R_PADX} y1={R_PADY} x2={ROLL_W - R_PADX} y2={R_PADY} stroke="var(--line)" strokeWidth={1} strokeDasharray="2 4" opacity={0.4} />
      <line x1={R_PADX} y1={ROLL_H - R_PADY} x2={ROLL_W - R_PADX} y2={ROLL_H - R_PADY} stroke="var(--line)" strokeWidth={1} strokeDasharray="2 4" opacity={0.4} />
      {/* zero reference (Sharpe / Beta) */}
      {showZero ? (
        <g fontFamily="var(--font-mono, monospace)">
          <line x1={R_PADX} y1={zeroY} x2={ROLL_W - R_PADX} y2={zeroY} stroke="var(--line-strong)" strokeWidth={1} strokeDasharray="3 4" opacity={0.7} />
          <text x={R_PADX + 3} y={zeroY - 3} className="fill-dim font-mono" fontSize={9}>0</text>
        </g>
      ) : null}
      {/* the series */}
      {n > 1 ? <path d={line} fill="none" stroke={meta.color} strokeWidth={1.7} strokeLinejoin="round" /> : null}
      {/* min / max value labels */}
      <g fontFamily="var(--font-mono, monospace)">
        <text x={ROLL_W - R_PADX} y={R_PADY + 9} textAnchor="end" className="fill-dim font-mono" fontSize={9}>{fmtNum(max, 2)}</text>
        <text x={ROLL_W - R_PADX} y={ROLL_H - R_PADY - 3} textAnchor="end" className="fill-dim font-mono" fontSize={9}>{fmtNum(min, 2)}</text>
      </g>
    </svg>
  );
}

/* ── Underwater (drawdown) chart — signature visual ─────────────────────────── */
const UW_W = 720;
const UW_H = 220;
const U_PADX = 8;
const U_PADY = 16;

function UnderwaterChart({ underwater, maxDrawdownPct }: { underwater: number[]; maxDrawdownPct: number }) {
  const n = underwater.length;
  // 0 sits at the top; the most negative point anchors the bottom of the plot.
  const floor = Math.min(maxDrawdownPct, ...underwater, -0.0001) * 1.06;
  const x = (i: number) => U_PADX + (n <= 1 ? 0 : (i / (n - 1)) * (UW_W - 2 * U_PADX));
  const y = (v: number) => U_PADY + (v / floor) * (UW_H - 2 * U_PADY);
  const topY = y(0);

  const { area, line } = useMemo(() => {
    if (n === 0) return { area: "", line: "" };
    const pts = underwater.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
    const ln = underwater.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
    const ar = `M${x(0).toFixed(1)},${topY.toFixed(1)} L${pts.join(" L")} L${x(n - 1).toFixed(1)},${topY.toFixed(1)} Z`;
    return { area: ar, line: ln };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [underwater, n, floor]);

  const maxY = y(maxDrawdownPct);

  return (
    <svg viewBox={`0 0 ${UW_W} ${UW_H}`} className="block w-full" preserveAspectRatio="none" role="img" aria-label="Underwater drawdown curve">
      {/* high-water mark (0%) line */}
      <g fontFamily="var(--font-mono, monospace)">
        <line x1={U_PADX} y1={topY} x2={UW_W - U_PADX} y2={topY} stroke="var(--line-strong)" strokeWidth={1} opacity={0.7} />
        <text x={U_PADX + 3} y={topY - 3} className="fill-dim font-mono" fontSize={9}>0% · highs</text>
      </g>
      {/* filled area dropping DOWN from 0 */}
      {area ? <path d={area} fill="var(--neg)" opacity={0.16} /> : null}
      {line ? <path d={line} fill="none" stroke="var(--neg)" strokeWidth={1.5} strokeLinejoin="round" /> : null}
      {/* max-drawdown level marker */}
      <g fontFamily="var(--font-mono, monospace)">
        <line x1={U_PADX} y1={maxY} x2={UW_W - U_PADX} y2={maxY} stroke="var(--neg)" strokeWidth={1} strokeDasharray="4 3" opacity={0.85} />
        <text x={UW_W - U_PADX} y={maxY + (maxY > UW_H - U_PADY - 12 ? -4 : 11)} textAnchor="end" className="fill-neg font-mono" fontSize={10}>
          max DD {fmtNum(maxDrawdownPct, 2)}%
        </text>
      </g>
    </svg>
  );
}

/* ── Component ──────────────────────────────────────────────────────────────── */
export function RiskAnalytics() {
  const [status, setStatus] = useState<Status>("loading");
  const [view, setView] = useState<RiskView | null>(null);
  const [source, setSource] = useState<string>("");
  const [updated, setUpdated] = useState<string>("");

  // controls
  const [symbol, setSymbol] = useState<string>("SPY");
  const [benchmark, setBenchmark] = useState<string>("SPY");
  const [window, setWindow] = useState<WindowDays>(63);
  const [symDraft, setSymDraft] = useState<string>("SPY");
  const [benchDraft, setBenchDraft] = useState<string>("SPY");
  const [inputErr, setInputErr] = useState<string>("");

  // which rolling series is shown
  const [metric, setMetric] = useState<MetricKey>("sharpe");

  const load = useCallback(async () => {
    setStatus("loading");
    const query = `symbol=${encodeURIComponent(symbol)}&benchmark=${encodeURIComponent(benchmark)}&window=${window}`;
    try {
      const r = await fetch(`/api/engine/riskmetrics?${query}`, { cache: "no-store" });
      const j = (await r.json()) as RiskResponse;
      if (j.live && j.rolling.sharpe.length > 0) {
        setView({
          symbol: j.symbol,
          benchmark: j.benchmark,
          window: j.window,
          rolling: j.rolling,
          underwater: j.underwater,
          maxDrawdownPct: j.maxDrawdownPct,
          currentDrawdownPct: j.currentDrawdownPct,
          ulcerIndex: j.ulcerIndex,
          inDrawdown: j.inDrawdown,
          longestBars: j.longestBars,
          episodes: j.episodes,
        });
        setSource(j.source);
        setUpdated(new Date(j.asOf).toLocaleTimeString("en-US", { hour12: false }));
        setStatus("live");
      } else {
        setView(demoView(symbol, benchmark, window));
        setStatus("demo");
      }
    } catch {
      setView(demoView(symbol, benchmark, window));
      setStatus("demo");
    }
  }, [symbol, benchmark, window]);

  useEffect(() => {
    load();
  }, [load]);

  // a metric can become unavailable (e.g. beta when benchmark===symbol) → fall back to Sharpe
  const hasBeta = (view?.rolling.beta?.length ?? 0) > 0;
  useEffect(() => {
    if (metric === "beta" && !hasBeta) setMetric("sharpe");
  }, [metric, hasBeta]);

  const applyInputs = useCallback(() => {
    const s = symDraft.toUpperCase().trim();
    const b = benchDraft.toUpperCase().trim();
    if (!SYM_RE.test(s)) {
      setInputErr("Symbol: 1–10 chars, A–Z 0–9 . ^ - only");
      return;
    }
    if (!SYM_RE.test(b)) {
      setInputErr("Benchmark: 1–10 chars, A–Z 0–9 . ^ - only");
      return;
    }
    setInputErr("");
    setSymDraft(s);
    setBenchDraft(b);
    setSymbol(s);
    setBenchmark(b);
  }, [symDraft, benchDraft]);

  const series = useMemo<number[]>(() => {
    if (!view) return [];
    if (metric === "vol") return view.rolling.vol;
    if (metric === "beta") return view.rolling.beta ?? [];
    return view.rolling.sharpe;
  }, [view, metric]);

  const metricChips: { key: MetricKey; label: string }[] = [
    { key: "sharpe", label: "Sharpe" },
    { key: "vol", label: "Vol" },
    ...(hasBeta ? [{ key: "beta" as const, label: "Beta" }] : []),
  ];

  const curDD = view?.currentDrawdownPct ?? 0;
  const inDD = view?.inDrawdown ?? false;

  return (
    <Panel className="animate-rise">
      <PanelHeader
        title={`Risk Analytics Engine — ${symbol}`}
        sub="Rolling Sharpe / vol / beta & full drawdown profile — computed from real returns"
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

      {/* Controls: symbol + benchmark + window */}
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-2.5">
        <div className="flex items-center gap-2">
          <label className="kpi-label shrink-0">Symbol</label>
          <input
            value={symDraft}
            onChange={(e) => setSymDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyInputs();
            }}
            spellCheck={false}
            aria-label="Symbol"
            className="w-28 rounded border border-line bg-base px-2 py-1 font-mono text-xs text-ink outline-none placeholder:text-dim focus:border-line-strong"
            placeholder="SPY"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="kpi-label shrink-0">Benchmark</label>
          <input
            value={benchDraft}
            onChange={(e) => setBenchDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyInputs();
            }}
            spellCheck={false}
            aria-label="Benchmark"
            className="w-28 rounded border border-line bg-base px-2 py-1 font-mono text-xs text-ink outline-none placeholder:text-dim focus:border-line-strong"
            placeholder="SPY"
          />
        </div>
        <button
          onClick={applyInputs}
          className="shrink-0 rounded border border-line px-2.5 py-1 font-mono text-2xs uppercase tracking-wider text-dim hover:border-line-strong hover:text-ink"
        >
          Apply
        </button>
        <div className="ml-auto flex items-center gap-1">
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
      {inputErr ? <div className="border-b border-line bg-warn/5 px-4 py-1.5 font-mono text-2xs text-warn">{inputErr}</div> : null}

      {/* 1) Rolling metrics chart */}
      <div className="border-b border-line">
        <div className="flex items-center justify-between gap-2 px-4 pt-3">
          <div className="section-label text-[11px] text-muted">Rolling Metrics · {window}-day window</div>
          <div className="flex items-center gap-1">
            {metricChips.map((m) => (
              <button
                key={m.key}
                onClick={() => setMetric(m.key)}
                className={cn(
                  "rounded border px-2 py-0.5 font-mono text-2xs uppercase tracking-wider transition-colors",
                  metric === m.key ? "border-accent/40 bg-accent/10 text-accent" : "border-line text-dim hover:border-line-strong hover:text-ink",
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
        <div className="px-3 py-3">
          {view && series.length > 1 ? (
            <RollingChart series={series} metric={metric} />
          ) : (
            <div className="grid h-[160px] place-items-center font-mono text-2xs text-dim">{view ? "insufficient history" : "computing…"}</div>
          )}
          <div className="mt-1 px-1 font-mono text-2xs text-dim">{METRIC_META[metric].label} · {series.length} points</div>
        </div>
      </div>

      {/* 2) Underwater (drawdown) chart — signature visual */}
      <div className="border-b border-line">
        <div className="flex items-center justify-between gap-2 px-4 pt-3">
          <div className="section-label text-[11px] text-muted">Underwater Curve · drawdown from running peak</div>
          <Chip tone="neg">max {view ? fmtNum(view.maxDrawdownPct, 2) : "—"}%</Chip>
        </div>
        <div className="px-3 py-3">
          {view && view.underwater.length > 1 ? (
            <UnderwaterChart underwater={view.underwater} maxDrawdownPct={view.maxDrawdownPct} />
          ) : (
            <div className="grid h-[180px] place-items-center font-mono text-2xs text-dim">computing…</div>
          )}
        </div>
      </div>

      {/* 3) KPI deck */}
      <div className="grid grid-cols-2 gap-4 border-b border-line px-4 py-3 md:grid-cols-5">
        <Stat label="Max Drawdown" value={view ? `${fmtNum(view.maxDrawdownPct, 2)}%` : "—"} tone="neg" />
        <Stat
          label="Current Drawdown"
          value={view ? (inDD ? `${fmtNum(curDD, 2)}%` : "at highs") : "—"}
          tone={inDD ? "neg" : "pos"}
        />
        <Stat
          label="Ulcer Index"
          value={
            <span className="flex items-baseline gap-1.5">
              {view ? fmtNum(view.ulcerIndex, 2) : "—"}
              <span className="text-2xs uppercase tracking-wider text-dim">higher = worse</span>
            </span>
          }
          tone="warn"
        />
        <Stat label="Longest Drawdown" value={view ? `${view.longestBars} bars` : "—"} tone="accent" />
        <Stat
          label="In Drawdown?"
          value={view ? <Chip tone={inDD ? "warn" : "pos"}>{inDD ? "yes" : "no"}</Chip> : "—"}
          mono={false}
        />
      </div>

      {/* 4) Drawdown episodes (worst first) */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] border-collapse">
          <thead>
            <tr>
              <Th>#</Th>
              <Th right>Depth %</Th>
              <Th right>Length (bars)</Th>
              <Th right>Recovered?</Th>
            </tr>
          </thead>
          <tbody>
            {view && view.episodes.length > 0 ? (
              view.episodes.slice(0, 6).map((e, i) => (
                <tr key={`${e.startIdx}-${e.troughIdx}`} className="hover:bg-elevated/40 transition-colors">
                  <Td className="text-dim">{i + 1}</Td>
                  <Td right className={signClass(e.depthPct)}>{fmtSignedPct(e.depthPct, 2)}</Td>
                  <Td right className="text-muted">{e.lengthBars}</Td>
                  <Td right>
                    <Chip tone={e.recovered ? "pos" : "warn"}>{e.recovered ? "recovered" : "ongoing"}</Chip>
                  </Td>
                </tr>
              ))
            ) : (
              <tr>
                <Td colSpan={4} className="py-6 text-center text-dim">{view ? "no drawdown episodes" : "computing…"}</Td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t border-line px-4 py-2.5 text-2xs text-dim">
        Ulcer index = RMS of the underwater curve (depth × duration of pain). Rolling metrics use a {window}-day window;
        beta is vs the benchmark.
      </div>
    </Panel>
  );
}
