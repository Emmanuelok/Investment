"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Panel, PanelHeader, Stat, Th, Td } from "@/components/ui/kit";
import { fmtSignedPct, signClass } from "@/lib/format";
import { cn } from "@/lib/cn";
import {
  buildSeasonalityCalendar,
  type DatedBar,
  type SeasonalityCalendarReport,
  type AssetSeasonality,
  type MonthStat,
} from "@/lib/engine/seasonality-calendar";

/* ── Types matching /api/engine/seasonality-calendar ───────────────────────── */

type LiveReport = SeasonalityCalendarReport & { source: string; asOf: string };

type LiveResponse =
  | ({
      live: true;
      source: string;
      asOf: string;
    } & SeasonalityCalendarReport)
  | { live: false };

type Status = "loading" | "live" | "demo";

/* ── Month name helpers (1..12) ────────────────────────────────────────────── */

const MONTH_FULL = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

const monthFull = (m: number): string => MONTH_FULL[m - 1] ?? "—";
const monthAbbr = (m: number): string => MONTH_ABBR[m - 1] ?? "—";

/* ── Demo data: ~6y of month-end bars with distinct seasonal patterns ──────── */

/**
 * Per-asset average monthly return (%) for each calendar month, Jan..Dec. These
 * shapes encode well-known calendar effects: equities strong Nov–Jan, gold firm
 * Jan/Aug, oil strong in spring, long bonds bid in the risk-off shoulder months.
 * The demo path runs the SAME engine math (buildSeasonalityCalendar) over bars
 * synthesized from these means — computed, not curve-fit into the report shape.
 */
const DEMO_PROFILES: { id: string; label: string; monthly: number[] }[] = [
  { id: "SPY", label: "S&P 500", monthly: [1.6, -0.3, 1.2, 1.5, 0.4, 0.1, 1.3, -0.4, -0.7, 1.0, 2.1, 1.8] },
  { id: "QQQ", label: "Nasdaq 100", monthly: [2.0, 0.2, 1.0, 1.8, 0.6, 0.4, 1.6, -0.2, -0.9, 1.3, 2.6, 1.5] },
  { id: "GLD", label: "Gold", monthly: [2.4, 0.6, -0.4, 0.8, 0.2, -0.6, 0.5, 2.0, 0.9, -0.3, 0.7, 1.1] },
  { id: "USO", label: "Crude Oil", monthly: [-0.8, 1.4, 2.6, 3.1, 1.9, 0.3, -0.5, -1.2, 0.4, -1.6, -0.9, 0.6] },
  { id: "TLT", label: "Long Treasuries", monthly: [0.6, -0.5, 0.3, -0.4, 1.2, 0.4, 1.1, 1.5, 0.8, -0.6, -0.3, 0.7] },
  { id: "DBC", label: "Commodities", monthly: [0.4, 0.9, 1.8, 2.0, 1.1, -0.2, -0.4, -0.8, 0.2, -1.0, -0.5, 0.5] },
];

/** Small deterministic pseudo-random in [-1, 1) from two integer seeds. */
function jitter(a: number, b: number): number {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1;
}

/**
 * Build ~6 years of month-end closes for one asset by compounding the chosen
 * per-month average return plus a tiny deterministic wiggle, so each calendar
 * month carries a stable but non-degenerate sample. Returns DatedBar[].
 */
function demoBars(profileIdx: number, monthly: number[]): DatedBar[] {
  const YEARS = 6;
  const START_YEAR = 2019;
  const bars: DatedBar[] = [];
  let close = 100;
  // Seed an initial bar at the end of the month before the window so the first
  // tracked month already has a prior close to diff against.
  bars.push({ t: Date.UTC(START_YEAR - 1, 11, 31) / 1000, c: close });
  for (let y = 0; y < YEARS; y++) {
    for (let m = 0; m < 12; m++) {
      const base = monthly[m] / 100;
      const wiggle = jitter(profileIdx * 13 + m, y) * 0.012; // ±1.2% noise
      close = close * (1 + base + wiggle);
      // Month-end timestamp (day 28 is safe across all months, incl. February).
      const t = Date.UTC(START_YEAR + y, m, 28) / 1000;
      bars.push({ t, c: close });
    }
  }
  return bars;
}

function buildDemo(): LiveReport {
  const currentMonth = new Date().getUTCMonth() + 1; // 6 = June on 2026-06-21
  const inputs = DEMO_PROFILES.map((p, i) => ({ id: p.id, label: p.label, bars: demoBars(i, p.monthly) }));
  const report = buildSeasonalityCalendar(inputs, currentMonth);
  return { ...report, source: "engine·demo", asOf: new Date().toISOString() };
}

/* ── Heatmap cell coloring (green for +, red for −; opacity ∝ magnitude) ───── */

function cellStyle(stat: MonthStat | undefined, maxAbs: number): React.CSSProperties {
  if (!stat) return { background: "var(--elevated)", opacity: 0.25 }; // missing month → neutral
  const mag = Math.min(1, Math.abs(stat.avgReturn) / maxAbs);
  const alpha = 0.08 + 0.6 * mag;
  return {
    background: stat.avgReturn >= 0 ? "var(--pos)" : "var(--neg)",
    opacity: alpha,
  };
}

/* ── Main panel ────────────────────────────────────────────────────────────── */

export function SeasonalityCalendar() {
  const [status, setStatus] = useState<Status>("loading");
  const [data, setData] = useState<LiveReport | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const r = await fetch("/api/engine/seasonality-calendar", { cache: "no-store" });
      const j = (await r.json()) as LiveResponse;
      if (j.live) {
        setData({
          assets: j.assets,
          currentMonth: j.currentMonth,
          tailwinds: j.tailwinds,
          headwinds: j.headwinds,
          source: j.source,
          asOf: j.asOf,
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

  // Symmetric color scale across every asset/month cell, so tone is comparable.
  const maxAbs = useMemo(() => {
    if (!data) return 1;
    let mx = 1e-6;
    for (const a of data.assets) for (const m of a.months) mx = Math.max(mx, Math.abs(m.avgReturn));
    return mx;
  }, [data]);

  const currentMonth = data?.currentMonth ?? new Date().getUTCMonth() + 1;
  const topAsset: AssetSeasonality | undefined = data?.assets[0];
  const tailwindCount = data?.tailwinds.length ?? 0;
  const totalAssets = data?.assets.length ?? 0;

  return (
    <Panel className="animate-rise">
      <PanelHeader
        title="Seasonality Calendar"
        sub="Month-of-year return & win-rate map across global assets — this month's tailwinds vs headwinds, from Stooq"
        right={
          <div className="flex items-center gap-2">
            {status === "loading" ? (
              <span className="flex items-center gap-1.5 font-mono text-2xs uppercase tracking-wider text-dim">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-dim" /> computing…
              </span>
            ) : status === "live" ? (
              <span className="flex items-center gap-1.5 rounded border border-pos/40 bg-pos/10 px-2 py-1 font-mono text-2xs uppercase tracking-wider text-pos">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pos opacity-60" />
                  <span className="relative h-1.5 w-1.5 rounded-full bg-pos" />
                </span>
                ENGINE · LIVE · {data?.source}
                {asOf ? <span className="text-pos/70">· {asOf}</span> : null}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 rounded border border-warn/40 bg-warn/10 px-2 py-1 font-mono text-2xs uppercase tracking-wider text-warn">
                <span className="h-1.5 w-1.5 rounded-full bg-warn" /> ENGINE · DEMO DATA
              </span>
            )}
            <button
              onClick={load}
              disabled={status === "loading"}
              className="grid h-7 w-7 place-items-center rounded border border-line font-mono text-sm text-dim hover:border-line-strong hover:text-ink disabled:opacity-40"
              aria-label="Refresh seasonality calendar"
            >
              ↻
            </button>
          </div>
        }
      />

      {!data ? (
        <div className="grid h-64 place-items-center font-mono text-2xs uppercase tracking-wider text-dim">computing…</div>
      ) : (
        <>
          {/* ── Hero: this month's seasonal read ── */}
          <div className="border-b border-line px-4 py-4">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-mono text-3xl font-semibold leading-none tracking-tight text-ink">
                {monthFull(currentMonth)}
              </span>
              <span className="font-mono text-2xs uppercase tracking-wider text-dim">seasonal map · current month</span>
            </div>
            <p className="mt-2 max-w-3xl text-sm text-muted">
              In {monthFull(currentMonth)},{" "}
              <span className="text-pos">{tailwindCount}</span> of {totalAssets} assets have a historical tailwind
              {topAsset ? (
                <>
                  ;{" "}
                  <span className="text-ink">{topAsset.label}</span> is strongest at{" "}
                  <span className={signClass(topAsset.currentMonthEdge)}>{fmtSignedPct(topAsset.currentMonthEdge)}</span>{" "}
                  <span className="text-dim">({topAsset.currentMonthWinRate.toFixed(0)}% win rate)</span>
                </>
              ) : null}
              .
            </p>
            <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
              <Stat label="THIS MONTH" value={<span className="text-ink">{monthFull(currentMonth)}</span>} />
              <Stat label="TAILWINDS" tone="pos" value={`${tailwindCount} / ${totalAssets}`} />
              <Stat label="HEADWINDS" tone="neg" value={`${data.headwinds.length} / ${totalAssets}`} />
              <Stat
                label="STRONGEST TAILWIND"
                tone={topAsset && topAsset.currentMonthEdge >= 0 ? "pos" : "neg"}
                value={
                  topAsset ? (
                    <span className="flex items-baseline gap-1.5">
                      <span className="text-ink">{topAsset.label}</span>
                      <span className="text-xs">{fmtSignedPct(topAsset.currentMonthEdge)}</span>
                    </span>
                  ) : (
                    "—"
                  )
                }
              />
            </div>
          </div>

          {/* ── Heatmap: asset rows × calendar-month columns ── */}
          <div className="border-b border-line px-4 py-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="section-label">Month-of-year average return — {monthFull(currentMonth)} highlighted</span>
              <span className="font-mono text-2xs text-dim">scale ±{maxAbs.toFixed(2)}%</span>
            </div>
            <div className="overflow-x-auto">
              <table
                className="w-full min-w-[640px] border-separate border-spacing-0.5"
                aria-label={`Seasonality heatmap: average monthly return for ${totalAssets} assets across the calendar year, January to December, with ${monthFull(
                  currentMonth,
                )} highlighted as the current month`}
              >
                <thead>
                  <tr>
                    <th className="px-2 py-1 text-left font-mono text-2xs font-normal uppercase tracking-widest text-dim">
                      Asset
                    </th>
                    {MONTH_ABBR.map((abbr, i) => {
                      const m = i + 1;
                      const isCurrent = m === currentMonth;
                      return (
                        <th
                          key={abbr}
                          className={cn(
                            "px-1 py-1 text-center font-mono text-2xs font-normal uppercase tracking-wider",
                            isCurrent ? "text-accent" : "text-dim",
                          )}
                        >
                          {abbr}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {data.assets.map((a) => {
                    const byMonth = new Map<number, MonthStat>();
                    for (const m of a.months) byMonth.set(m.month, m);
                    return (
                      <tr key={a.id}>
                        <td className="whitespace-nowrap px-2 py-1 font-mono text-2xs text-muted">{a.label}</td>
                        {MONTH_ABBR.map((_, i) => {
                          const m = i + 1;
                          const stat = byMonth.get(m);
                          const isCurrent = m === currentMonth;
                          return (
                            <td key={m} className="p-0">
                              <div
                                className={cn(
                                  "flex h-7 items-center justify-center rounded-[2px] font-mono text-[9px] tabular-nums leading-none",
                                  isCurrent && "ring-1 ring-accent ring-inset",
                                  stat ? "text-ink/90" : "text-faint",
                                )}
                                style={cellStyle(stat, maxAbs)}
                                title={
                                  stat
                                    ? `${a.label} · ${monthAbbr(m)} — avg ${fmtSignedPct(stat.avgReturn)} · ${stat.winRate.toFixed(
                                        0,
                                      )}% up · n=${stat.count}`
                                    : `${a.label} · ${monthAbbr(m)} — no data`
                                }
                              >
                                {stat ? stat.avgReturn.toFixed(1) : "·"}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex items-center gap-4 font-mono text-2xs text-dim">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-[1px]" style={{ background: "var(--pos)", opacity: 0.6 }} />
                positive
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-[1px]" style={{ background: "var(--neg)", opacity: 0.6 }} />
                negative
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-[1px] ring-1 ring-accent ring-inset" />
                current month
              </span>
            </div>
          </div>

          {/* ── Current-month detail table (sorted by edge, as returned) ── */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr>
                  <Th>Asset</Th>
                  <Th right>{monthAbbr(currentMonth)} Edge</Th>
                  <Th right>Win Rate</Th>
                  <Th right>Best Month</Th>
                  <Th right>Worst Month</Th>
                  <Th right>Sample Yrs</Th>
                </tr>
              </thead>
              <tbody>
                {data.assets.map((a) => {
                  const tail = a.currentMonthEdge > 0;
                  const head = a.currentMonthEdge < 0;
                  return (
                    <tr
                      key={a.id}
                      className={cn(
                        "hover:bg-elevated/40",
                        tail && "bg-pos/5",
                        head && "bg-neg/5",
                      )}
                    >
                      <Td mono={false} className="font-medium text-ink">
                        {a.label}
                      </Td>
                      <Td right className={signClass(a.currentMonthEdge)}>
                        {fmtSignedPct(a.currentMonthEdge)}
                      </Td>
                      <Td right className="text-muted">
                        {a.currentMonthWinRate.toFixed(0)}%
                      </Td>
                      <Td right className="text-pos">
                        {monthAbbr(a.bestMonth)}
                      </Td>
                      <Td right className="text-neg">
                        {monthAbbr(a.worstMonth)}
                      </Td>
                      <Td right className="text-dim">
                        {a.sampleYears}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="border-t border-line px-4 py-2.5 font-mono text-2xs text-faint">
        Month-of-year seasonality: each asset&apos;s average return and win rate by calendar month across all years of
        history, with the current month&apos;s tailwind/headwind highlighted. Calendar effects are weak but real at the
        margin. Source: Stooq.
      </div>
    </Panel>
  );
}
