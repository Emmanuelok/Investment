"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Panel, PanelHeader, Stat, Chip, Th, Td } from "@/components/ui/kit";
import { ProgressBar } from "@/components/ui/viz";
import { fmtNum, fmtBps, fmtSignedPct, signClass } from "@/lib/format";
import { cn } from "@/lib/cn";
import {
  buildYieldMonitor,
  type YieldSeries,
  type YieldMonitorReport,
  type YieldRung,
  type IncomeRegime,
} from "@/lib/engine/yield-monitor";

/* ── Types matching /api/engine/yield-monitor ──────────────────────────────── */

/** The live route spreads `...report` plus source/asOf/asOfDate. */
type LiveResponse =
  | ({
      live: true;
      source: string;
      asOf: string;
      asOfDate: string | null;
    } & YieldMonitorReport)
  | { live: false };

/** Local view model shared by live + demo. */
type YieldData = YieldMonitorReport & {
  source?: string;
  asOf?: string;
  asOfDate: string | null;
};

type Status = "loading" | "live" | "demo";

/* ── Demo basket (sandbox returns { live:false }) ───────────────────────────── */

/* Income ladder, oldest → newest (60 pts each, percent yields). Mirrors the live
   route's BASKET ids/labels/categories. Each series spiked in an earlier regime
   (above today), eased to a cycle low, then base-built and gently re-rose into the
   tip — so today's yield sits mid-to-high in its own range (≈65–80th percentile,
   not the absolute max) → "Attractive carry" with the fattest income up at HY. */
type DemoSpec = {
  id: string;
  label: string;
  category: string;
  series: number[];
};

const DEMO_SPECS: DemoSpec[] = [
  {
    id: "DGS2",
    label: "2Y Treasury",
    category: "Treasury",
    series: [
      4.9, 4.95, 5.0, 4.96, 4.9, 4.84, 4.8, 4.76, 4.79, 4.82,
      4.78, 4.72, 4.66, 4.69, 4.72, 4.66, 4.6, 4.55, 4.58, 4.62,
      4.55, 4.48, 4.52, 4.56, 4.5, 4.44, 4.48, 4.52, 4.46, 4.4,
      4.44, 4.48, 4.42, 4.36, 4.4, 4.45, 4.4, 4.34, 4.38, 4.42,
      4.38, 4.32, 4.36, 4.4, 4.44, 4.4, 4.46, 4.5, 4.46, 4.52,
      4.55, 4.5, 4.46, 4.52, 4.56, 4.52, 4.57, 4.6, 4.58, 4.6,
    ],
  },
  {
    id: "DGS5",
    label: "5Y Treasury",
    category: "Treasury",
    series: [
      4.55, 4.6, 4.65, 4.6, 4.54, 4.5, 4.46, 4.42, 4.45, 4.48,
      4.44, 4.38, 4.32, 4.35, 4.38, 4.32, 4.26, 4.2, 4.23, 4.27,
      4.2, 4.13, 4.17, 4.21, 4.15, 4.08, 4.12, 4.16, 4.1, 4.04,
      4.08, 4.12, 4.06, 4.0, 4.05, 4.1, 4.04, 3.98, 4.02, 4.07,
      4.02, 3.96, 4.0, 4.05, 4.1, 4.06, 4.12, 4.16, 4.13, 4.2,
      4.24, 4.2, 4.16, 4.22, 4.26, 4.22, 4.27, 4.3, 4.28, 4.3,
    ],
  },
  {
    id: "DGS10",
    label: "10Y Treasury",
    category: "Treasury",
    series: [
      4.4, 4.46, 4.52, 4.47, 4.41, 4.37, 4.33, 4.29, 4.32, 4.35,
      4.31, 4.25, 4.19, 4.22, 4.25, 4.19, 4.13, 4.07, 4.1, 4.14,
      4.07, 4.0, 4.04, 4.08, 4.02, 3.95, 3.99, 4.03, 3.97, 3.91,
      3.95, 3.99, 3.93, 3.87, 3.92, 3.97, 3.91, 3.85, 3.89, 3.94,
      3.89, 3.83, 3.87, 3.92, 3.97, 3.93, 3.99, 4.03, 4.06, 4.1,
      4.13, 4.11, 4.08, 4.13, 4.16, 4.13, 4.18, 4.2, 4.19, 4.2,
    ],
  },
  {
    id: "DGS30",
    label: "30Y Treasury",
    category: "Treasury",
    series: [
      4.6, 4.65, 4.7, 4.65, 4.6, 4.56, 4.52, 4.48, 4.51, 4.54,
      4.5, 4.44, 4.38, 4.41, 4.44, 4.38, 4.32, 4.26, 4.29, 4.33,
      4.26, 4.2, 4.24, 4.28, 4.22, 4.16, 4.2, 4.24, 4.18, 4.12,
      4.16, 4.2, 4.14, 4.08, 4.13, 4.18, 4.12, 4.06, 4.1, 4.15,
      4.1, 4.04, 4.08, 4.13, 4.18, 4.14, 4.2, 4.24, 4.27, 4.32,
      4.35, 4.32, 4.29, 4.34, 4.37, 4.34, 4.38, 4.4, 4.39, 4.4,
    ],
  },
  {
    id: "DFII10",
    label: "10Y TIPS (real)",
    category: "TIPS",
    series: [
      2.0, 2.05, 2.1, 2.06, 2.0, 1.96, 1.92, 1.88, 1.91, 1.94,
      1.9, 1.84, 1.78, 1.81, 1.84, 1.78, 1.72, 1.66, 1.69, 1.73,
      1.66, 1.6, 1.64, 1.68, 1.62, 1.56, 1.6, 1.64, 1.58, 1.52,
      1.56, 1.6, 1.54, 1.48, 1.53, 1.58, 1.52, 1.46, 1.5, 1.55,
      1.5, 1.44, 1.48, 1.53, 1.58, 1.54, 1.6, 1.64, 1.67, 1.71,
      1.74, 1.72, 1.7, 1.74, 1.77, 1.74, 1.78, 1.8, 1.79, 1.8,
    ],
  },
  {
    id: "BAMLC0A0CMEY",
    label: "US IG Corporate",
    category: "IG",
    series: [
      5.7, 5.76, 5.82, 5.77, 5.71, 5.67, 5.63, 5.59, 5.62, 5.65,
      5.61, 5.55, 5.49, 5.52, 5.55, 5.49, 5.43, 5.37, 5.4, 5.44,
      5.37, 5.3, 5.34, 5.38, 5.32, 5.25, 5.29, 5.33, 5.27, 5.21,
      5.25, 5.29, 5.23, 5.17, 5.22, 5.27, 5.21, 5.15, 5.19, 5.24,
      5.19, 5.13, 5.17, 5.22, 5.27, 5.23, 5.29, 5.33, 5.36, 5.4,
      5.43, 5.41, 5.38, 5.43, 5.46, 5.43, 5.38, 5.4, 5.39, 5.4,
    ],
  },
  {
    id: "BAMLH0A0HYM2EY",
    label: "US High Yield",
    category: "HY",
    series: [
      8.4, 8.55, 8.7, 8.6, 8.45, 8.35, 8.25, 8.15, 8.2, 8.28,
      8.2, 8.08, 7.96, 8.0, 8.06, 7.96, 7.86, 7.74, 7.8, 7.88,
      7.76, 7.64, 7.7, 7.78, 7.68, 7.56, 7.62, 7.7, 7.6, 7.5,
      7.56, 7.64, 7.54, 7.44, 7.5, 7.58, 7.5, 7.42, 7.48, 7.56,
      7.48, 7.4, 7.46, 7.54, 7.62, 7.56, 7.64, 7.7, 7.74, 7.8,
      7.84, 7.8, 7.76, 7.82, 7.86, 7.82, 7.76, 7.78, 7.79, 7.8,
    ],
  },
  {
    id: "BAMLEMCBPIEY",
    label: "EM Corporate",
    category: "EM",
    series: [
      7.5, 7.62, 7.74, 7.66, 7.54, 7.46, 7.38, 7.3, 7.34, 7.4,
      7.32, 7.2, 7.08, 7.12, 7.18, 7.08, 6.98, 6.86, 6.92, 7.0,
      6.88, 6.76, 6.82, 6.9, 6.8, 6.68, 6.74, 6.82, 6.72, 6.62,
      6.68, 6.76, 6.66, 6.56, 6.62, 6.7, 6.62, 6.54, 6.6, 6.68,
      6.6, 6.52, 6.58, 6.66, 6.74, 6.68, 6.76, 6.82, 6.86, 6.9,
      6.94, 6.9, 6.86, 6.92, 6.96, 6.92, 6.86, 6.88, 6.89, 6.9,
    ],
  },
];

const DEMO_ASOF = "2026-06-12";

function buildDemo(): YieldData {
  const inputs: YieldSeries[] = DEMO_SPECS.map((s) => ({
    id: s.id,
    label: s.label,
    category: s.category,
    series: s.series,
  }));
  const report = buildYieldMonitor(inputs);
  return { ...report, asOfDate: DEMO_ASOF };
}

/* ── Regime → presentation (static maps; no dynamic Tailwind) ──────────────── */

const REGIME_META: Record<IncomeRegime, { color: string; word: string; desc: string }> = {
  "Attractive carry": {
    color: "text-pos",
    word: "attractive",
    desc: "yields high in their range — carry well-compensated",
  },
  Fair: { color: "text-dim", word: "fair", desc: "yields mid-range — carry fairly priced" },
  Expensive: { color: "text-warn", word: "expensive", desc: "yields low in their range — carry poorly compensated" },
};

/* Category → chip tone (static map; Treasury dim, TIPS info, IG accent, HY/EM warn-side). */
const CATEGORY_TONE: Record<string, "default" | "info" | "accent" | "warn" | "neg"> = {
  Treasury: "default",
  TIPS: "info",
  IG: "accent",
  HY: "warn",
  EM: "neg",
};
function categoryTone(category: string): "default" | "info" | "accent" | "warn" | "neg" {
  return CATEGORY_TONE[category] ?? "default";
}

/* Percentile bar color (high percentile = cheap = more income → pos tone). */
function pctlColor(p: number): string {
  if (p >= 80) return "var(--pos)";
  if (p >= 60) return "var(--accent)";
  if (p >= 40) return "var(--info)";
  return "var(--warn)";
}

/* ── Status badge (identical idiom to yield-curve.tsx / real-rates.tsx) ─────── */

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

/* ── Main panel ────────────────────────────────────────────────────────────── */

export function YieldMonitor() {
  const [status, setStatus] = useState<Status>("loading");
  const [data, setData] = useState<YieldData | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const r = await fetch("/api/engine/yield-monitor", { cache: "no-store" });
      const j = (await r.json()) as LiveResponse;
      if (j.live) {
        setData({
          source: j.source,
          asOf: j.asOf,
          asOfDate: j.asOfDate,
          rungs: j.rungs,
          best: j.best,
          treasury10y: j.treasury10y,
          steepness2s30s: j.steepness2s30s,
          creditPickupHyIg: j.creditPickupHyIg,
          avgPercentile: j.avgPercentile,
          incomeRegime: j.incomeRegime,
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

  /* Highest-yielding rung (already sorted by yield desc → rungs[0]). */
  const top = useMemo<YieldRung | null>(() => {
    if (!data) return null;
    return data.rungs[0] ?? null;
  }, [data]);

  const meta = data ? REGIME_META[data.incomeRegime] : null;
  const avgPct = data ? Math.round(data.avgPercentile) : 0;

  return (
    <Panel className="animate-rise">
      <PanelHeader
        title="Yield & Carry Monitor"
        sub="Fixed-income income ladder → absolute yield, own-history percentile & pickup over the 10Y — computed from FRED"
        right={
          <div className="flex items-center gap-2">
            <StatusBadge status={status} source={data?.source} asOf={asOf} />
            <button
              onClick={load}
              disabled={status === "loading"}
              className="grid h-7 w-7 place-items-center rounded border border-line font-mono text-sm text-dim hover:border-line-strong hover:text-ink disabled:opacity-40"
              aria-label="Refresh yield monitor"
            >
              ↻
            </button>
          </div>
        }
      />

      {!data || !meta ? (
        <div className="grid h-64 place-items-center font-mono text-2xs uppercase tracking-wider text-dim">computing…</div>
      ) : (
        <>
          {/* ── Hero: income regime + carry levers ── */}
          <div className="grid grid-cols-1 gap-px bg-line lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
            {/* Left: regime headline + one-line read + percentile bar */}
            <div className="space-y-4 bg-base p-4">
              {/* Regime headline */}
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className={cn("font-mono text-3xl font-semibold leading-none tracking-tight", meta.color)}>
                  {data.incomeRegime}
                </span>
                <span className="text-sm text-dim">{meta.desc}</span>
              </div>

              {/* One-line read */}
              <div className="rounded border border-line bg-elevated/20 px-3 py-3">
                <div className="mb-2 section-label text-[11px] text-muted">INCOME READ</div>
                <p className="text-sm leading-relaxed text-muted">
                  Yields sit in the{" "}
                  <span className={cn("font-mono font-medium", avgPct >= 50 ? "text-pos" : "text-warn")}>
                    {avgPct}
                    <sup>th</sup>
                  </span>{" "}
                  percentile of their range — carry is{" "}
                  <span className={cn("font-medium", meta.color)}>{meta.word}</span>; the fattest income is{" "}
                  {top ? (
                    <>
                      <span className="font-medium text-ink">{top.label}</span> at{" "}
                      <span className="font-mono text-pos">{fmtNum(top.latest, 2)}%</span>
                    </>
                  ) : (
                    <span className="text-dim">unavailable</span>
                  )}
                  .
                </p>
                {/* avgPercentile bar — how cheap yields are vs history */}
                <div className="mt-3 flex items-center gap-2">
                  <span className="w-20 shrink-0 font-mono text-2xs text-dim">avg pctl</span>
                  <ProgressBar
                    value={avgPct}
                    max={100}
                    color={pctlColor(avgPct)}
                    className="flex-1"
                    aria-label={`Average yield percentile ${avgPct} of 100 — how cheap yields are versus their own history`}
                  />
                  <span className="w-9 shrink-0 text-right font-mono text-2xs" style={{ color: pctlColor(avgPct) }}>
                    {avgPct}
                  </span>
                </div>
                <p className="mt-1.5 font-mono text-2xs text-faint">
                  high = cheap = more income
                  {data.asOfDate ? <span> · as of {data.asOfDate}</span> : null}
                </p>
              </div>
            </div>

            {/* Right: the two carry levers + best rung */}
            <div className="space-y-3 bg-base p-4">
              <div className="grid grid-cols-2 gap-3">
                <Stat
                  label="Term steepness"
                  value={
                    <span>
                      {fmtSignedPct(data.steepness2s30s, 2).replace("%", "pp")}
                      {data.steepness2s30s < 0 ? <span className="ml-1.5 text-2xs text-neg">inverted</span> : null}
                    </span>
                  }
                  tone={data.steepness2s30s < 0 ? "neg" : "pos"}
                />
                <Stat
                  label="Credit pickup"
                  value={`${fmtSignedPct(data.creditPickupHyIg, 2).replace("%", "pp")}`}
                  tone={data.creditPickupHyIg >= 0 ? "pos" : "neg"}
                />
              </div>
              <p className="font-mono text-2xs text-dim">
                term carry = 30y − 2y · credit carry = HY − IG
              </p>

              {/* Best-rung callout */}
              <div className="rounded border border-pos/30 bg-pos/5 px-3 py-3">
                <div className="mb-1.5 flex items-center gap-1.5 font-mono text-2xs uppercase tracking-wider text-pos">
                  <span className="h-1.5 w-1.5 rounded-full bg-pos" /> Fattest income
                </div>
                {top ? (
                  <div className="flex flex-wrap items-baseline gap-x-3">
                    <span className="font-mono text-2xl font-semibold leading-none text-ink">
                      {fmtNum(top.latest, 2)}%
                    </span>
                    <span className="inline-flex items-center gap-2 text-sm text-dim">
                      <Chip tone={categoryTone(top.category)}>{top.category}</Chip>
                      {top.label}
                    </span>
                  </div>
                ) : (
                  <span className="font-mono text-sm text-dim">—</span>
                )}
                <p className="mt-1.5 text-2xs text-dim">
                  10Y Treasury anchor{" "}
                  <span className="font-mono text-muted">
                    {data.treasury10y === null ? "—" : `${fmtNum(data.treasury10y, 2)}%`}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* ── Income-ladder table ── */}
          <div className="overflow-x-auto border-t border-line">
            <table className="w-full min-w-[680px] border-collapse">
              <thead>
                <tr>
                  <Th>Segment</Th>
                  <Th right>Yield</Th>
                  <Th right>Percentile</Th>
                  <Th right>Δ recent</Th>
                  <Th right>Spread / 10Y</Th>
                </tr>
              </thead>
              <tbody>
                {data.rungs.map((r, i) => {
                  const pct = Math.max(0, Math.min(100, r.percentile));
                  const isTop = i === 0;
                  return (
                    <tr key={r.id} className={cn("hover:bg-elevated/40", isTop && "bg-pos/5")}>
                      <Td mono={false} className="font-medium text-ink">
                        <span className="inline-flex items-center gap-2">
                          <Chip tone={categoryTone(r.category)}>{r.category}</Chip>
                          <span>{r.label}</span>
                        </span>
                      </Td>
                      <Td right className={cn("font-semibold", isTop ? "text-pos" : "text-ink")}>
                        {fmtNum(r.latest, 2)}%
                      </Td>
                      <Td right>
                        <div className="flex items-center justify-end gap-2">
                          <span className="h-1 w-12 overflow-hidden rounded-full bg-line" aria-hidden>
                            <span
                              className="block h-full rounded-full"
                              style={{ width: `${pct}%`, background: pctlColor(r.percentile) }}
                            />
                          </span>
                          <span className="w-10 text-right" style={{ color: pctlColor(r.percentile) }}>
                            {fmtNum(r.percentile, 0)}
                          </span>
                        </div>
                      </Td>
                      {/* Rising yields = falling bond prices → up is "neg" for the holder. */}
                      <Td right className={r.changeBps > 0 ? "text-neg" : r.changeBps < 0 ? "text-pos" : "text-muted"}>
                        {fmtBps(r.changeBps)}
                      </Td>
                      <Td right className={Math.abs(r.spreadOver10y) < 1 ? "text-faint" : signClass(r.spreadOver10y)}>
                        {fmtBps(r.spreadOver10y)}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── Interpretation ── */}
          <div className="space-y-1.5 border-t border-line bg-elevated/10 px-4 py-3 text-sm leading-relaxed text-muted">
            <p>
              The ladder reads <span className={cn("font-medium", meta.color)}>{data.incomeRegime}</span>: yields sit in
              their <span className={cn("font-mono", avgPct >= 50 ? "text-pos" : "text-warn")}>{avgPct}ᵗʰ</span> percentile
              {top ? (
                <>
                  {" "}and the fattest income is <span className="font-mono text-ink">{top.label}</span> at{" "}
                  <span className="font-mono text-pos">{fmtNum(top.latest, 2)}%</span>
                </>
              ) : null}
              , with term carry{" "}
              <span className={cn("font-mono", signClass(data.steepness2s30s))}>
                {fmtSignedPct(data.steepness2s30s, 2).replace("%", "pp")}
              </span>{" "}
              and credit carry{" "}
              <span className={cn("font-mono", signClass(data.creditPickupHyIg))}>
                {fmtSignedPct(data.creditPickupHyIg, 2).replace("%", "pp")}
              </span>
              .
            </p>
            <p className="text-dim">
              {data.steepness2s30s < 0
                ? "An inverted term structure (30y below 2y) means little reward for duration — the front end carries best, while credit spreads supply the extra income further out the risk ladder."
                : "A positively-sloped term structure rewards duration, and the credit pickup over Treasuries stacks additional income — but remember rising yields mark bond prices down for existing holders."}
            </p>
          </div>
        </>
      )}

      <div className="border-t border-line px-4 py-2.5 font-mono text-2xs text-faint">
        The income ladder ranks fixed-income segments by absolute yield, each shown against its own history (percentile —
        high = cheap), with the pickup over the 10-year Treasury. Term carry (30y−2y) and credit carry (HY−IG) are the two
        levers. Source: FRED (Treasury / TIPS / ICE BofA effective yields).
      </div>
    </Panel>
  );
}
