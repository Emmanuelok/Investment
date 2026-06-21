"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Panel, PanelHeader, Stat, Chip, Th, Td } from "@/components/ui/kit";
import { fmtNum, fmtPct, fmtBps, fmtSignedPct, signClass } from "@/lib/format";
import { cn } from "@/lib/cn";
import {
  buildRealRates,
  type RateSeries,
  type RealRatesReport,
  type RatePoint,
  type RateKind,
  type RealRateRegime,
  type InflationRegime,
} from "@/lib/engine/real-rates";

/* ── Types matching /api/engine/real-rates ─────────────────────────────────── */

/** The live route spreads `...report` plus source/asOf/asOfDate. */
type LiveResponse =
  | ({
      live: true;
      source: string;
      asOf: string;
      asOfDate: string | null;
    } & RealRatesReport)
  | { live: false };

/** Local view model shared by live + demo. */
type RealRatesData = RealRatesReport & {
  source?: string;
  asOf?: string;
  asOfDate: string | null;
};

type Status = "loading" | "live" | "demo";

/* ── Demo basket (sandbox returns { live:false }) ───────────────────────────── */

/* A late-cycle real-rates basket, oldest → newest (60 pts each, percent). Real
   yields drift gently higher (DFII10 ending ~1.8% > neutral 1.0% → "Restrictive"),
   while breakevens hold near 2.3–2.4% with little net change over the recent
   window → "Anchored". The 5y5y forward sits a touch above 2% — anchored long-run
   inflation expectations. Mirrors the live route's BASKET ids/labels/tenors. */
type DemoSpec = {
  id: string;
  label: string;
  tenor: string;
  kind: RateKind;
  series: number[];
};

const DEMO_SPECS: DemoSpec[] = [
  {
    id: "DGS2",
    label: "2Y Nominal",
    tenor: "2Y",
    kind: "Nominal",
    series: [
      4.95, 4.98, 5.02, 4.99, 4.94, 4.9, 4.86, 4.82, 4.85, 4.88,
      4.84, 4.8, 4.76, 4.79, 4.82, 4.78, 4.74, 4.7, 4.73, 4.76,
      4.72, 4.68, 4.71, 4.74, 4.7, 4.66, 4.69, 4.72, 4.68, 4.64,
      4.67, 4.7, 4.66, 4.62, 4.65, 4.68, 4.64, 4.6, 4.63, 4.66,
      4.62, 4.58, 4.61, 4.64, 4.6, 4.57, 4.6, 4.63, 4.59, 4.56,
      4.59, 4.62, 4.58, 4.55, 4.58, 4.61, 4.57, 4.58, 4.6, 4.6,
    ],
  },
  {
    id: "DGS5",
    label: "5Y Nominal",
    tenor: "5Y",
    kind: "Nominal",
    series: [
      4.0, 4.04, 4.08, 4.05, 4.02, 4.06, 4.1, 4.07, 4.04, 4.08,
      4.12, 4.09, 4.06, 4.1, 4.14, 4.11, 4.08, 4.12, 4.16, 4.13,
      4.1, 4.14, 4.18, 4.15, 4.12, 4.16, 4.2, 4.17, 4.14, 4.18,
      4.22, 4.19, 4.16, 4.2, 4.24, 4.21, 4.18, 4.22, 4.26, 4.23,
      4.2, 4.24, 4.28, 4.25, 4.22, 4.26, 4.3, 4.27, 4.24, 4.28,
      4.32, 4.29, 4.26, 4.29, 4.31, 4.28, 4.27, 4.29, 4.3, 4.3,
    ],
  },
  {
    id: "DFII5",
    label: "5Y Real (TIPS)",
    tenor: "5Y",
    kind: "Real",
    series: [
      1.5, 1.52, 1.55, 1.53, 1.51, 1.54, 1.57, 1.55, 1.53, 1.56,
      1.59, 1.57, 1.55, 1.58, 1.61, 1.59, 1.57, 1.6, 1.63, 1.61,
      1.59, 1.62, 1.65, 1.63, 1.61, 1.64, 1.67, 1.65, 1.63, 1.66,
      1.69, 1.67, 1.65, 1.68, 1.71, 1.69, 1.67, 1.7, 1.73, 1.71,
      1.69, 1.72, 1.75, 1.73, 1.71, 1.74, 1.77, 1.75, 1.73, 1.76,
      1.79, 1.81, 1.83, 1.85, 1.86, 1.87, 1.88, 1.89, 1.9, 1.9,
    ],
  },
  {
    id: "T5YIE",
    label: "5Y Breakeven",
    tenor: "5Y",
    kind: "Breakeven",
    series: [
      2.3, 2.32, 2.34, 2.33, 2.31, 2.33, 2.35, 2.34, 2.32, 2.34,
      2.36, 2.35, 2.33, 2.35, 2.37, 2.36, 2.34, 2.36, 2.38, 2.37,
      2.35, 2.37, 2.39, 2.38, 2.36, 2.38, 2.4, 2.39, 2.37, 2.39,
      2.41, 2.4, 2.42, 2.41, 2.43, 2.42, 2.4, 2.42, 2.44, 2.43,
      2.41, 2.43, 2.42, 2.4, 2.42, 2.43, 2.41, 2.42, 2.43, 2.41,
      2.42, 2.43, 2.41, 2.42, 2.4, 2.41, 2.42, 2.4, 2.41, 2.4,
    ],
  },
  {
    id: "DGS10",
    label: "10Y Nominal",
    tenor: "10Y",
    kind: "Nominal",
    series: [
      3.95, 3.98, 4.02, 3.99, 3.97, 4.0, 4.03, 4.01, 3.99, 4.02,
      4.05, 4.03, 4.01, 4.04, 4.07, 4.05, 4.03, 4.06, 4.09, 4.07,
      4.05, 4.08, 4.11, 4.09, 4.07, 4.1, 4.13, 4.11, 4.09, 4.12,
      4.15, 4.13, 4.11, 4.14, 4.17, 4.15, 4.13, 4.16, 4.19, 4.17,
      4.15, 4.18, 4.21, 4.19, 4.17, 4.2, 4.23, 4.21, 4.19, 4.21,
      4.23, 4.22, 4.2, 4.21, 4.22, 4.21, 4.2, 4.21, 4.22, 4.21,
    ],
  },
  {
    id: "DFII10",
    label: "10Y Real (TIPS)",
    tenor: "10Y",
    kind: "Real",
    series: [
      1.42, 1.44, 1.47, 1.45, 1.43, 1.46, 1.49, 1.47, 1.45, 1.48,
      1.51, 1.49, 1.47, 1.5, 1.53, 1.51, 1.49, 1.52, 1.55, 1.53,
      1.51, 1.54, 1.57, 1.55, 1.53, 1.56, 1.59, 1.57, 1.55, 1.58,
      1.61, 1.59, 1.57, 1.6, 1.63, 1.61, 1.59, 1.62, 1.65, 1.63,
      1.61, 1.64, 1.67, 1.69, 1.71, 1.72, 1.74, 1.75, 1.76, 1.77,
      1.78, 1.79, 1.8, 1.81, 1.81, 1.8, 1.79, 1.8, 1.81, 1.81,
    ],
  },
  {
    id: "T10YIE",
    label: "10Y Breakeven",
    tenor: "10Y",
    kind: "Breakeven",
    series: [
      2.28, 2.3, 2.32, 2.31, 2.29, 2.31, 2.33, 2.32, 2.3, 2.32,
      2.34, 2.33, 2.31, 2.33, 2.35, 2.34, 2.32, 2.34, 2.36, 2.35,
      2.33, 2.35, 2.37, 2.36, 2.34, 2.36, 2.38, 2.37, 2.35, 2.37,
      2.39, 2.38, 2.4, 2.39, 2.41, 2.4, 2.38, 2.4, 2.42, 2.41,
      2.39, 2.41, 2.4, 2.42, 2.41, 2.4, 2.42, 2.41, 2.4, 2.42,
      2.41, 2.4, 2.42, 2.41, 2.4, 2.41, 2.4, 2.41, 2.4, 2.4,
    ],
  },
  {
    id: "T5YIFR",
    label: "5y5y Forward Inflation",
    tenor: "5y5y",
    kind: "Forward",
    series: [
      2.18, 2.2, 2.22, 2.21, 2.19, 2.21, 2.23, 2.22, 2.2, 2.22,
      2.24, 2.23, 2.21, 2.23, 2.25, 2.24, 2.22, 2.24, 2.26, 2.25,
      2.23, 2.25, 2.27, 2.26, 2.24, 2.26, 2.28, 2.27, 2.25, 2.27,
      2.29, 2.28, 2.3, 2.29, 2.31, 2.3, 2.28, 2.3, 2.32, 2.31,
      2.29, 2.31, 2.3, 2.32, 2.31, 2.3, 2.32, 2.31, 2.3, 2.31,
      2.32, 2.31, 2.3, 2.31, 2.3, 2.31, 2.32, 2.31, 2.3, 2.3,
    ],
  },
];

const DEMO_ASOF = "2026-06-12";

function buildDemo(): RealRatesData {
  const inputs: RateSeries[] = DEMO_SPECS.map((s) => ({
    id: s.id,
    label: s.label,
    tenor: s.tenor,
    kind: s.kind,
    series: s.series,
  }));
  const report = buildRealRates(inputs);
  return { ...report, asOfDate: DEMO_ASOF };
}

/* ── Regime → presentation (static maps; no dynamic Tailwind) ──────────────── */

const REAL_META: Record<RealRateRegime, { color: string; desc: string }> = {
  Restrictive: { color: "text-neg", desc: "real yields above neutral — policy is tight" },
  Neutral: { color: "text-dim", desc: "real yields near neutral — policy roughly balanced" },
  Accommodative: { color: "text-pos", desc: "real yields below neutral — policy is easy" },
};

const INFLATION_META: Record<InflationRegime, { color: string; desc: string }> = {
  Rising: { color: "text-neg", desc: "breakevens climbing — inflation premium building" },
  Anchored: { color: "text-pos", desc: "breakevens stable — inflation expectations well-anchored" },
  Falling: { color: "text-warn", desc: "breakevens easing — inflation premium fading" },
};

/* ── Rate kind → chip tone (static map) ────────────────────────────────────── */

const KIND_TONE: Record<RateKind, "accent" | "info" | "warn" | "ai"> = {
  Nominal: "accent",
  Real: "info",
  Breakeven: "warn",
  Forward: "ai",
};

/* Tenor ordering for the table (2Y, 5Y, 10Y, 5y5y), then kind within a tenor. */
const TENOR_ORDER: Record<string, number> = { "2Y": 0, "5Y": 1, "10Y": 2, "5y5y": 3 };
const KIND_ORDER: Record<RateKind, number> = { Nominal: 0, Real: 1, Breakeven: 2, Forward: 3 };
function tenorRank(tenor: string): number {
  return TENOR_ORDER[tenor] ?? 99;
}

/* Percentile bar color (mid-range = accent, extremes flagged). */
function pctlColor(p: number): string {
  if (p >= 80) return "var(--warn)";
  if (p >= 60) return "var(--accent)";
  if (p >= 40) return "var(--info)";
  return "var(--pos)";
}

/* ── Status badge (identical idiom to yield-curve.tsx / credit-conditions.tsx) ─ */

function StatusBadge({ status, source, asOf }: { status: Status; source?: string; asOf: string }) {
  if (status === "loading") {
    return (
      <span className="flex items-center gap-1.5 font-mono text-2xs uppercase tracking-wider text-dim">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-dim" /> computing…
      </span>
    );
  }
  if (status === "live") {
    return (
      <span className="flex items-center gap-1.5 rounded border border-pos/40 bg-pos/10 px-2 py-1 font-mono text-2xs uppercase tracking-wider text-pos">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pos opacity-60" />
          <span className="relative h-1.5 w-1.5 rounded-full bg-pos" />
        </span>
        ENGINE · LIVE · {source}
        {asOf ? <span className="text-pos/70">· {asOf}</span> : null}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 rounded border border-warn/40 bg-warn/10 px-2 py-1 font-mono text-2xs uppercase tracking-wider text-warn">
      <span className="h-1.5 w-1.5 rounded-full bg-warn" /> ENGINE · DEMO DATA
    </span>
  );
}

/* ── 10Y decomposition bar (nominal = real + breakeven) ────────────────────── */

function DecompositionBar({
  nominal,
  real,
  breakeven,
}: {
  nominal: number | null;
  real: number | null;
  breakeven: number | null;
}) {
  // Need both components to render the stacked split; fall back gracefully.
  const haveBoth = real !== null && breakeven !== null;
  const sum = haveBoth ? real + breakeven : null;
  // Proportional widths from the two components (sum, not nominal, to fill the bar).
  const realPct = haveBoth && sum && sum > 0 ? (real / sum) * 100 : 0;
  const bePct = haveBoth && sum && sum > 0 ? (breakeven / sum) * 100 : 0;

  const ariaLabel =
    nominal !== null && haveBoth
      ? `10-year nominal yield ${nominal.toFixed(2)} percent equals real yield ${real.toFixed(2)} percent plus breakeven inflation ${breakeven.toFixed(2)} percent`
      : "10-year yield decomposition";

  return (
    <div className="rounded border border-line bg-elevated/20 px-3 py-3">
      <div className="mb-2 section-label text-[11px] text-muted">10Y YIELD DECOMPOSITION</div>

      {/* Equation headline */}
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 font-mono text-sm">
        <span className="text-dim">Nominal</span>
        <span className="text-lg font-semibold text-ink">{nominal === null ? "—" : `${fmtNum(nominal, 2)}%`}</span>
        <span className="text-faint">=</span>
        <span className="text-dim">Real</span>
        <span className="font-semibold text-info">{real === null ? "—" : `${fmtNum(real, 2)}%`}</span>
        <span className="text-faint">+</span>
        <span className="text-dim">Inflation</span>
        <span className="font-semibold text-warn">{breakeven === null ? "—" : `${fmtNum(breakeven, 2)}%`}</span>
      </div>

      {/* Stacked, proportional bar */}
      {haveBoth ? (
        <div
          className="mt-3 flex h-7 w-full overflow-hidden rounded"
          role="img"
          aria-label={ariaLabel}
        >
          <div
            className="flex items-center justify-center"
            style={{ width: `${realPct}%`, background: "var(--info)" }}
          >
            <span className="px-1 font-mono text-2xs font-medium text-base">real {fmtNum(real, 2)}</span>
          </div>
          <div
            className="flex items-center justify-center"
            style={{ width: `${bePct}%`, background: "var(--warn)" }}
          >
            <span className="px-1 font-mono text-2xs font-medium text-base">infl {fmtNum(breakeven, 2)}</span>
          </div>
        </div>
      ) : (
        <div className="mt-3 font-mono text-2xs text-dim" role="img" aria-label={ariaLabel}>
          decomposition unavailable — missing a component series
        </div>
      )}

      {/* Legend */}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-2xs text-dim">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm" style={{ background: "var(--info)" }} /> Real yield (TIPS) — policy stance
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm" style={{ background: "var(--warn)" }} /> Breakeven — inflation expectations
        </span>
      </div>
    </div>
  );
}

/* ── Main panel ────────────────────────────────────────────────────────────── */

export function RealRates() {
  const [status, setStatus] = useState<Status>("loading");
  const [data, setData] = useState<RealRatesData | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const r = await fetch("/api/engine/real-rates", { cache: "no-store" });
      const j = (await r.json()) as LiveResponse;
      if (j.live) {
        setData({
          source: j.source,
          asOf: j.asOf,
          asOfDate: j.asOfDate,
          points: j.points,
          nominal10y: j.nominal10y,
          real10y: j.real10y,
          breakeven10y: j.breakeven10y,
          fwd5y5y: j.fwd5y5y,
          decompositionGap: j.decompositionGap,
          realRegime: j.realRegime,
          inflationRegime: j.inflationRegime,
          realChangeBps: j.realChangeBps,
          breakevenChangeBps: j.breakevenChangeBps,
        });
        setStatus("live");
      } else {
        setData(buildDemo());
        setStatus("demo");
      }
    } catch {
      setData(buildDemo());
      setStatus("demo");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const asOf = useMemo(() => {
    if (status !== "live" || !data?.asOf) return "";
    return new Date(data.asOf).toLocaleTimeString("en-US", { hour12: false });
  }, [status, data]);

  /* Rows sorted by tenor (2Y → 5Y → 10Y → 5y5y), then kind. */
  const rows = useMemo<RatePoint[]>(() => {
    if (!data) return [];
    return [...data.points].sort((a, b) => {
      const ta = tenorRank(a.tenor);
      const tb = tenorRank(b.tenor);
      if (ta !== tb) return ta - tb;
      return KIND_ORDER[a.kind] - KIND_ORDER[b.kind];
    });
  }, [data]);

  const realMeta = data ? REAL_META[data.realRegime] : null;
  const inflMeta = data ? INFLATION_META[data.inflationRegime] : null;

  return (
    <Panel className="animate-rise">
      <PanelHeader
        title="Real Rates & Inflation Expectations"
        sub="Nominal Treasury yields decomposed into real yields (TIPS) + breakeven inflation — computed from FRED"
        right={
          <div className="flex items-center gap-2">
            <StatusBadge status={status} source={data?.source} asOf={asOf} />
            <button
              onClick={load}
              disabled={status === "loading"}
              className="grid h-7 w-7 place-items-center rounded border border-line font-mono text-sm text-dim hover:border-line-strong hover:text-ink disabled:opacity-40"
              aria-label="Refresh real rates"
            >
              ↻
            </button>
          </div>
        }
      />

      {!data || !realMeta || !inflMeta ? (
        <div className="grid h-64 place-items-center font-mono text-2xs uppercase tracking-wider text-dim">computing…</div>
      ) : (
        <>
          {/* ── Hero: 10Y decomposition + regime headlines ── */}
          <div className="grid grid-cols-1 gap-px bg-line lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
            {/* Left: the signature decomposition visual */}
            <div className="space-y-4 bg-base p-4">
              <DecompositionBar
                nominal={data.nominal10y}
                real={data.real10y}
                breakeven={data.breakeven10y}
              />

              {/* 5y5y forward callout */}
              <div className="rounded border border-ai/30 bg-ai/5 px-3 py-3">
                <div className="mb-1.5 flex items-center gap-1.5 font-mono text-2xs uppercase tracking-wider text-ai">
                  <span className="h-1.5 w-1.5 rounded-full bg-ai" /> 5y5y Forward Inflation
                </div>
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <span className="font-mono text-2xl font-semibold leading-none text-ink">
                    {data.fwd5y5y === null ? "—" : `${fmtNum(data.fwd5y5y, 2)}%`}
                  </span>
                  <span className="text-sm text-dim">
                    the Fed&apos;s preferred long-run inflation-expectations gauge (~2% = anchored)
                  </span>
                </div>
              </div>
            </div>

            {/* Right: the two regime headlines */}
            <div className="space-y-3 bg-base p-4">
              {/* Real-rate regime */}
              <div className="rounded border border-line bg-elevated/20 px-3 py-3">
                <div className="mb-1.5 section-label text-[11px] text-muted">REAL-RATE REGIME</div>
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className={cn("font-mono text-xl font-semibold leading-none tracking-tight", realMeta.color)}>
                    {data.realRegime}
                  </span>
                  <span className="font-mono text-sm text-dim">
                    {data.real10y === null ? "—" : `real 10Y ${fmtNum(data.real10y, 2)}%`}
                  </span>
                  <span className={cn("font-mono text-2xs", signClass(data.realChangeBps))}>
                    {fmtBps(data.realChangeBps)}
                  </span>
                </div>
                <p className="mt-1.5 text-2xs text-dim">{realMeta.desc}</p>
              </div>

              {/* Inflation-expectations regime */}
              <div className="rounded border border-line bg-elevated/20 px-3 py-3">
                <div className="mb-1.5 section-label text-[11px] text-muted">INFLATION-EXPECTATIONS REGIME</div>
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className={cn("font-mono text-xl font-semibold leading-none tracking-tight", inflMeta.color)}>
                    {data.inflationRegime}
                  </span>
                  <span className="font-mono text-sm text-dim">
                    {data.breakeven10y === null ? "—" : `breakeven 10Y ${fmtNum(data.breakeven10y, 2)}%`}
                  </span>
                  <span className={cn("font-mono text-2xs", signClass(data.breakevenChangeBps))}>
                    {fmtBps(data.breakevenChangeBps)}
                  </span>
                </div>
                <p className="mt-1.5 text-2xs text-dim">{inflMeta.desc}</p>
              </div>
            </div>
          </div>

          {/* ── Rates table ── */}
          <div className="overflow-x-auto border-t border-line">
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr>
                  <Th>Series</Th>
                  <Th>Tenor</Th>
                  <Th right>Level</Th>
                  <Th right>Δ recent</Th>
                  <Th right>Percentile</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const pct = Math.max(0, Math.min(100, p.percentile));
                  return (
                    <tr key={p.id} className="hover:bg-elevated/40">
                      <Td mono={false} className="font-medium text-ink">
                        <span className="inline-flex items-center gap-2">
                          <Chip tone={KIND_TONE[p.kind]}>{p.kind}</Chip>
                          <span>{p.label}</span>
                        </span>
                      </Td>
                      <Td mono={false}>
                        <span className="font-mono text-xs text-dim">{p.tenor}</span>
                      </Td>
                      <Td right className="text-ink">
                        {fmtPct(p.latest, 2)}
                      </Td>
                      <Td right className={signClass(p.changeBps)}>
                        {fmtBps(p.changeBps)}
                      </Td>
                      <Td right>
                        <div className="flex items-center justify-end gap-2">
                          <span className="h-1 w-12 overflow-hidden rounded-full bg-line" aria-hidden>
                            <span
                              className="block h-full rounded-full"
                              style={{ width: `${pct}%`, background: pctlColor(p.percentile) }}
                            />
                          </span>
                          <span className="w-10 text-right" style={{ color: pctlColor(p.percentile) }}>
                            {fmtNum(p.percentile, 0)}
                          </span>
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── Decomposition-gap sanity check + summary deck ── */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line px-4 py-3 sm:grid-cols-4">
            <Stat
              label="10Y Nominal"
              value={data.nominal10y === null ? "—" : `${fmtNum(data.nominal10y, 2)}%`}
            />
            <Stat
              label="10Y Real"
              value={data.real10y === null ? "—" : `${fmtNum(data.real10y, 2)}%`}
              tone="accent"
            />
            <Stat
              label="10Y Breakeven"
              value={data.breakeven10y === null ? "—" : `${fmtNum(data.breakeven10y, 2)}%`}
              tone="warn"
            />
            <Stat
              label="5y5y Forward"
              value={data.fwd5y5y === null ? "—" : `${fmtNum(data.fwd5y5y, 2)}%`}
            />
          </div>

          <div className="border-t border-line px-4 py-2 font-mono text-2xs text-faint">
            decomposition check · nominal − (real + breakeven) ={" "}
            <span className="text-dim">
              {data.decompositionGap === null ? "—" : `${fmtSignedPct(data.decompositionGap, 2)}`}
            </span>{" "}
            — should be ≈0 by no-arbitrage
          </div>
        </>
      )}

      <div className="border-t border-line px-4 py-2.5 font-mono text-2xs text-faint">
        Nominal Treasury yields decompose into a real yield (TIPS) plus breakeven inflation. Real yields gauge how
        restrictive policy is; breakevens and the 5y5y forward gauge inflation expectations. Source: FRED (DGS / DFII /
        breakevens).
      </div>
    </Panel>
  );
}
