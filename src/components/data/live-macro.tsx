"use client";

import { useEffect, useState } from "react";
import { Panel, PanelHeader, Chip } from "@/components/ui/kit";
import { cn } from "@/lib/cn";
import { fmtNum, fmtSignedPct, signClass } from "@/lib/format";
import type { FredResponse, FredError, SeriesData } from "@/app/api/fred/route";

// ─── Demo snapshot (used when live fetch fails) ────────────────────────────

const DEMO_SERIES: Record<string, SeriesData> = {
  FEDFUNDS: { latest: 5.33, prev: 5.33, points: [{ date: "2024-01-01", value: 5.33 }] },
  DGS3MO: { latest: 5.25, prev: 5.27, points: [{ date: "2024-01-01", value: 5.25 }] },
  DGS6MO: { latest: 5.22, prev: 5.24, points: [{ date: "2024-01-01", value: 5.22 }] },
  DGS1MO: { latest: 5.29, prev: 5.31, points: [{ date: "2024-01-01", value: 5.29 }] },
  DGS1: { latest: 5.08, prev: 5.10, points: [{ date: "2024-01-01", value: 5.08 }] },
  DGS2: { latest: 4.87, prev: 4.91, points: [{ date: "2024-01-01", value: 4.87 }] },
  DGS5: { latest: 4.65, prev: 4.68, points: [{ date: "2024-01-01", value: 4.65 }] },
  DGS10: { latest: 4.62, prev: 4.65, points: [{ date: "2024-01-01", value: 4.62 }] },
  DGS30: { latest: 4.74, prev: 4.77, points: [{ date: "2024-01-01", value: 4.74 }] },
  T10Y2Y: { latest: -0.25, prev: -0.26, points: [{ date: "2024-01-01", value: -0.25 }] },
  CPIAUCSL: { latest: 314.2, prev: 313.8, points: Array.from({ length: 13 }, (_, i) => ({ date: `2023-0${(i % 12) + 1}-01`, value: 310 + i * 0.35 })) },
  UNRATE: { latest: 3.9, prev: 3.8, points: [{ date: "2024-01-01", value: 3.9 }] },
  GDPC1: { latest: 22384.5, prev: 22118.2, points: [{ date: "2024-01-01", value: 22384.5 }] },
};
const DEMO_CPI_YOY = 3.4;

// ─── Yield curve tenors (in order short → long) ────────────────────────────

const CURVE_TENORS: { id: string; label: string; months: number }[] = [
  { id: "DGS1MO", label: "1M", months: 1 },
  { id: "DGS3MO", label: "3M", months: 3 },
  { id: "DGS6MO", label: "6M", months: 6 },
  { id: "DGS1", label: "1Y", months: 12 },
  { id: "DGS2", label: "2Y", months: 24 },
  { id: "DGS5", label: "5Y", months: 60 },
  { id: "DGS10", label: "10Y", months: 120 },
  { id: "DGS30", label: "30Y", months: 360 },
];

// ─── Feed status badge ─────────────────────────────────────────────────────

type FeedState = "live" | "connecting" | "demo";

function FeedBadge({ status, source }: { status: FeedState; source: string }) {
  const map = {
    live: { dot: "bg-pos", text: "text-pos", label: `LIVE · ${source}` },
    connecting: { dot: "bg-warn animate-pulse-soft", text: "text-warn", label: "CONNECTING…" },
    demo: { dot: "bg-warn", text: "text-warn", label: "DEMO · source unreachable" },
  }[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded border border-line px-1.5 py-0.5 font-mono text-2xs uppercase tracking-wider", map.text)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", map.dot, status === "live" && "animate-pulse-soft")} />
      {map.label}
    </span>
  );
}

// ─── Inline SVG yield curve ────────────────────────────────────────────────

function YieldCurveSvg({
  points,
}: {
  points: { label: string; value: number }[];
}) {
  if (points.length < 2) return null;
  const W = 320;
  const H = 80;
  const padL = 4;
  const padR = 4;
  const padT = 6;
  const padB = 18;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const values = points.map((p) => p.value);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const spanV = maxV - minV || 0.01;

  const xOf = (i: number) => padL + (i / (points.length - 1)) * plotW;
  const yOf = (v: number) => padT + plotH - ((v - minV) / spanV) * plotH;

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${xOf(i).toFixed(1)},${yOf(p.value).toFixed(1)}`)
    .join(" ");

  const areaD = `${pathD} L${xOf(points.length - 1).toFixed(1)},${(padT + plotH).toFixed(1)} L${xOf(0).toFixed(1)},${(padT + plotH).toFixed(1)} Z`;

  // Inverted if 10Y < 2Y (T10Y2Y < 0 tells us, but also check directly)
  const twoY = points.find((p) => p.label === "2Y")?.value ?? 0;
  const tenY = points.find((p) => p.label === "10Y")?.value ?? 0;
  const inverted = tenY < twoY;

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="block overflow-visible"
    >
      <defs>
        <linearGradient id="yc-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={inverted ? "var(--warn)" : "var(--accent)"} stopOpacity="0.3" />
          <stop offset="100%" stopColor={inverted ? "var(--warn)" : "var(--accent)"} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Area fill */}
      <path d={areaD} fill="url(#yc-grad)" />
      {/* Line */}
      <path
        d={pathD}
        fill="none"
        stroke={inverted ? "var(--warn)" : "var(--accent)"}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Data points */}
      {points.map((p, i) => (
        <circle
          key={p.label}
          cx={xOf(i)}
          cy={yOf(p.value)}
          r={2.5}
          fill={inverted ? "var(--warn)" : "var(--accent)"}
          opacity={0.9}
        />
      ))}
      {/* X labels */}
      {points.map((p, i) => (
        <text
          key={p.label}
          x={xOf(i)}
          y={H - 2}
          fontSize={8}
          fontFamily="var(--font-mono)"
          fill="var(--dim)"
          textAnchor="middle"
        >
          {p.label}
        </text>
      ))}
    </svg>
  );
}

// ─── Main component ────────────────────────────────────────────────────────

type ApiResult = FredResponse | FredError;

export function LiveMacro() {
  const [state, setState] = useState<FeedState>("connecting");
  const [data, setData] = useState<FredResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/fred")
      .then((r) => r.json() as Promise<ApiResult>)
      .then((json) => {
        if (cancelled) return;
        if (json.live) {
          setData(json as FredResponse);
          setState("live");
        } else {
          setState("demo");
        }
      })
      .catch(() => {
        if (!cancelled) setState("demo");
      });
    return () => { cancelled = true; };
  }, []);

  const series = state === "live" && data ? data.series : DEMO_SERIES;
  const cpiYoY = state === "live" && data ? data.cpiYoY : DEMO_CPI_YOY;

  // KPI helpers
  const val = (id: string) => (series as Record<string, { latest?: number | null } | undefined>)[id]?.latest ?? null;
  const fmt2 = (v: number | null) => (v !== null ? fmtNum(v, 2) + "%" : "—");
  const fmtPctRaw = (v: number | null, suffix = "%") => (v !== null ? fmtNum(v, 2) + suffix : "—");

  const fedFunds = val("FEDFUNDS");
  const dgs10 = val("DGS10");
  const dgs2 = val("DGS2");
  const t10y2y = val("T10Y2Y");
  const unrate = val("UNRATE");

  // T10Y2Y might not be in series; compute from DGS10 - DGS2 as fallback
  const spread = t10y2y !== null ? t10y2y : (dgs10 !== null && dgs2 !== null ? dgs10 - dgs2 : null);

  const cpiDisplay = cpiYoY !== null ? `${cpiYoY.toFixed(2)}%` : "—";
  const spreadDisplay = spread !== null ? `${spread >= 0 ? "+" : ""}${spread.toFixed(0)}bps` : "—";

  // Yield curve points for mini SVG
  const curvePoints = CURVE_TENORS
    .map((t) => {
      const v = val(t.id);
      return v !== null ? { label: t.label, value: v } : null;
    })
    .filter((p): p is { label: string; value: number } => p !== null);

  const inverted = spread !== null && spread < 0;

  const kpis: { label: string; value: string; tone: string; sub: string }[] = [
    {
      label: "FED FUNDS",
      value: fmt2(fedFunds),
      tone: "text-warn",
      sub: "Effective rate",
    },
    {
      label: "10Y TREASURY",
      value: fmtPctRaw(dgs10),
      tone: "text-accent",
      sub: "US benchmark",
    },
    {
      label: "2Y TREASURY",
      value: fmtPctRaw(dgs2),
      tone: "text-accent",
      sub: "Short-end rate",
    },
    {
      label: "CPI YoY",
      value: cpiDisplay,
      tone: cpiYoY !== null && cpiYoY > 4 ? "text-neg" : cpiYoY !== null && cpiYoY > 3 ? "text-warn" : "text-pos",
      sub: "Headline inflation",
    },
    {
      label: "UNEMPLOYMENT",
      value: fmtPctRaw(unrate),
      tone: "text-ink",
      sub: "U-3 rate",
    },
    {
      label: "10Y–2Y SPREAD",
      value: spreadDisplay,
      tone: inverted ? "text-neg" : "text-pos",
      sub: inverted ? "⚠ INVERTED" : "Slope",
    },
  ];

  return (
    <Panel glow={state === "live"}>
      <PanelHeader
        title="Macro Pulse — Live FRED Data"
        sub="Federal Reserve Economic Data · FRED API · revalidates hourly"
        right={
          <div className="flex items-center gap-2">
            {state === "connecting" ? (
              <span className="font-mono text-2xs text-dim animate-pulse-soft">fetching…</span>
            ) : (
              <FeedBadge status={state} source="FRED" />
            )}
          </div>
        }
      />

      {/* Loading skeleton */}
      {state === "connecting" && (
        <div className="flex items-center justify-center py-8">
          <span className="font-mono text-xs text-dim animate-pulse-soft">Loading FRED series…</span>
        </div>
      )}

      {/* Content — KPI row + yield curve */}
      {state !== "connecting" && (
        <div className="px-4 py-3 space-y-4">
          {/* KPI deck */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-6">
            {kpis.map((k) => (
              <div key={k.label}>
                <div className="kpi-label">{k.label}</div>
                <div className={cn("mt-1 font-mono tabular-nums text-lg font-semibold leading-none", k.tone)}>
                  {k.value}
                </div>
                <div className="mt-0.5 text-2xs text-dim">{k.sub}</div>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="h-px w-full bg-line" />

          {/* Yield curve mini chart */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="section-label text-[11px] text-muted">YIELD CURVE — SHORT END → LONG END</span>
              <div className="flex items-center gap-2">
                {inverted ? (
                  <Chip tone="neg" dot>INVERTED</Chip>
                ) : (
                  <Chip tone="pos" dot>NORMAL</Chip>
                )}
                {spread !== null && (
                  <span className={cn("font-mono text-xs tabular-nums", signClass(spread))}>
                    10Y–2Y: {spread >= 0 ? "+" : ""}{(spread * 100).toFixed(0)}bps
                  </span>
                )}
              </div>
            </div>
            {curvePoints.length >= 2 ? (
              <YieldCurveSvg points={curvePoints} />
            ) : (
              <div className="flex h-16 items-center justify-center text-xs text-dim">
                Yield curve data unavailable
              </div>
            )}
          </div>

          {/* Tenor value strip */}
          {curvePoints.length > 0 && (
            <div className="flex gap-3 overflow-x-auto pb-0.5">
              {curvePoints.map((p) => (
                <div key={p.label} className="shrink-0 text-center">
                  <div className="font-mono text-[11px] text-dim">{p.label}</div>
                  <div className="font-mono tabular-nums text-xs font-medium text-ink">{p.value.toFixed(2)}%</div>
                </div>
              ))}
            </div>
          )}

          {/* GDPC1 note */}
          {series["GDPC1"] && (
            <div className="flex items-center gap-3 rounded border border-line/40 bg-elevated/40 px-3 py-2">
              <span className="section-label text-[11px] text-muted">REAL GDP (GDPC1)</span>
              <span className="font-mono tabular-nums text-xs text-ink">
                {series["GDPC1"].latest.toLocaleString("en-US", { maximumFractionDigits: 0 })}B chained 2017$
              </span>
              {(() => {
                const g = series["GDPC1"];
                if (!g) return null;
                const qoq = ((g.latest - g.prev) / g.prev) * 100 * 4; // annualised
                return (
                  <span className={cn("font-mono tabular-nums text-xs", signClass(qoq))}>
                    {fmtSignedPct(qoq)} SAAR
                  </span>
                );
              })()}
              <span className="ml-auto text-2xs text-dim">Quarterly · chained 2017$</span>
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}
