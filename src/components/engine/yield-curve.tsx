"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Panel, PanelHeader, Stat, Th, Td } from "@/components/ui/kit";
import { fmtNum, fmtSignedPct, signClass } from "@/lib/format";
import { cn } from "@/lib/cn";
import { analyzeCurve, type CurvePoint, type CurveShape, type Forward } from "@/lib/engine/yield-curve";

/* ── Types matching /api/engine/yield-curve ────────────────────────────────── */

type Point = CurvePoint & { changeBps: number };

type CurveData = {
  points: Point[];
  slope2s10s: number;
  slope3m10s: number;
  curvature: number;
  level: number;
  shape: CurveShape;
  forwards: Forward[];
  invertedSegments: { from: string; to: string; spread: number }[];
  source?: string;
  asOf?: string;
};

type LiveResponse =
  | ({
      live: true;
      source: string;
      asOf: string;
      points: Point[];
    } & Omit<CurveData, "points" | "source" | "asOf">)
  | { live: false };

type Status = "loading" | "live" | "demo";

/* ── Demo curve (realistic current curve, inverted front end) ──────────────── */

const DEMO_RAW: [string, number, number, number][] = [
  ["1M", 1 / 12, 5.35, -1],
  ["3M", 0.25, 5.3, -2],
  ["6M", 0.5, 5.1, -1],
  ["1Y", 1, 4.8, -3],
  ["2Y", 2, 4.55, -2],
  ["3Y", 3, 4.45, -1],
  ["5Y", 5, 4.4, 1],
  ["7Y", 7, 4.45, 1],
  ["10Y", 10, 4.52, 2],
  ["20Y", 20, 4.78, 2],
  ["30Y", 30, 4.68, 1],
];

function buildDemo(): CurveData {
  const points: Point[] = DEMO_RAW.map(([label, tenorYears, y, changeBps]) => ({
    label,
    tenorYears,
    yield: y,
    changeBps,
  }));
  const analysis = analyzeCurve(points.map(({ tenorYears, label, yield: y }) => ({ tenorYears, label, yield: y })));
  return { points, ...analysis };
}

/* ── Shape presentation ────────────────────────────────────────────────────── */

const SHAPE_META: Record<CurveShape, { tone: "pos" | "neg" | "warn"; color: string; desc: string }> = {
  Normal: { tone: "pos", color: "text-pos", desc: "upward-sloping — healthy expansion" },
  Flat: { tone: "warn", color: "text-warn", desc: "little term premium — late cycle" },
  Inverted: { tone: "neg", color: "text-neg", desc: "front end above long end — classic recession signal" },
  Humped: { tone: "warn", color: "text-warn", desc: "belly above both ends" },
};

/* ── The curve SVG (ordinal x-axis so the short end isn't squished) ────────── */

function CurveChart({ points }: { points: Point[] }) {
  const W = 640;
  const H = 260;
  const PAD_L = 38;
  const PAD_R = 16;
  const PAD_T = 22;
  const PAD_B = 30;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;

  const n = points.length;
  const ys = points.map((p) => p.yield);
  const rawMin = Math.min(...ys);
  const rawMax = Math.max(...ys);
  const pad = Math.max(0.15, (rawMax - rawMin) * 0.18);
  const yMin = rawMin - pad;
  const yMax = rawMax + pad;
  const spanY = yMax - yMin || 1;

  // Evenly-spaced ordinal x: one slot per tenor regardless of years.
  const xOf = (i: number) => (n <= 1 ? PAD_L + plotW / 2 : PAD_L + (i / (n - 1)) * plotW);
  const yOf = (v: number) => PAD_T + plotH - ((v - yMin) / spanY) * plotH;

  // Nice Y gridlines (~5 ticks across the data range).
  const ticks = useMemo(() => {
    const target = 5;
    const rough = spanY / target;
    const mag = Math.pow(10, Math.floor(Math.log10(rough)));
    const norm = rough / mag;
    const step = (norm >= 5 ? 5 : norm >= 2 ? 2 : 1) * mag;
    const start = Math.ceil(yMin / step) * step;
    const out: number[] = [];
    for (let v = start; v <= yMax + 1e-9; v += step) out.push(Number(v.toFixed(6)));
    return out;
  }, [spanY, yMin, yMax]);

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${xOf(i).toFixed(1)},${yOf(p.yield).toFixed(1)}`).join(" ");

  // Inverted segments → red shaded band between adjacent points where yield falls.
  const invBands = points.slice(1).map((p, idx) => {
    const i = idx + 1;
    const inverted = p.yield < points[i - 1].yield;
    return { i, inverted, x0: xOf(i - 1), x1: xOf(i) };
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="xMidYMid meet" className="block overflow-visible" role="img" aria-label="US Treasury yield curve">
      {/* inverted-segment shading (behind everything) */}
      {invBands
        .filter((b) => b.inverted)
        .map((b) => (
          <rect key={`inv-${b.i}`} x={b.x0} y={PAD_T} width={b.x1 - b.x0} height={plotH} fill="var(--neg)" opacity={0.1} />
        ))}

      {/* Y gridlines + tick labels */}
      {ticks.map((t) => {
        const yp = yOf(t);
        if (yp < PAD_T - 0.5 || yp > PAD_T + plotH + 0.5) return null;
        return (
          <g key={`g-${t}`}>
            <line x1={PAD_L} y1={yp} x2={PAD_L + plotW} y2={yp} stroke="var(--line)" strokeWidth={0.6} />
            <text x={PAD_L - 6} y={yp + 3} textAnchor="end" fontSize={9} fontFamily="var(--font-mono)" fill="var(--dim)">
              {t.toFixed(2)}%
            </text>
          </g>
        );
      })}

      {/* faint area under the curve */}
      <path
        d={`${linePath} L${xOf(n - 1).toFixed(1)},${(PAD_T + plotH).toFixed(1)} L${xOf(0).toFixed(1)},${(PAD_T + plotH).toFixed(1)} Z`}
        fill="var(--accent)"
        opacity={0.07}
      />

      {/* the curve line */}
      <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

      {/* dots + per-tenor yield labels */}
      {points.map((p, i) => {
        const cx = xOf(i);
        const cy = yOf(p.yield);
        const down = p.yield <= yMin + spanY * 0.16; // label above unless near the floor
        return (
          <g key={`pt-${p.label}`}>
            <circle cx={cx} cy={cy} r={3} fill="var(--accent)" />
            <text
              x={cx}
              y={down ? cy + 13 : cy - 7}
              textAnchor="middle"
              fontSize={9}
              fontFamily="var(--font-mono)"
              fill="var(--muted)"
            >
              {p.yield.toFixed(2)}
            </text>
          </g>
        );
      })}

      {/* X-axis tenor labels */}
      {points.map((p, i) => (
        <text
          key={`x-${p.label}`}
          x={xOf(i)}
          y={PAD_T + plotH + 16}
          textAnchor="middle"
          fontSize={9}
          fontFamily="var(--font-mono)"
          fill="var(--dim)"
        >
          {p.label}
        </text>
      ))}
    </svg>
  );
}

/* ── Main panel ────────────────────────────────────────────────────────────── */

export function YieldCurve() {
  const [status, setStatus] = useState<Status>("loading");
  const [data, setData] = useState<CurveData | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const r = await fetch("/api/engine/yield-curve", { cache: "no-store" });
      const j = (await r.json()) as LiveResponse;
      if (j.live) {
        setData({
          points: j.points,
          slope2s10s: j.slope2s10s,
          slope3m10s: j.slope3m10s,
          curvature: j.curvature,
          level: j.level,
          shape: j.shape,
          forwards: j.forwards,
          invertedSegments: j.invertedSegments,
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

  const shapeMeta = data ? SHAPE_META[data.shape] : null;
  // Show the most informative ~7 forwards (longer end first carries the macro signal).
  const forwards = (data?.forwards ?? []).slice(-7);
  const spotByLabel = useMemo(() => {
    const m = new Map<string, number>();
    (data?.points ?? []).forEach((p) => m.set(p.label, p.yield));
    return m;
  }, [data]);

  return (
    <Panel className="animate-rise">
      <PanelHeader
        title="Treasury Yield Curve"
        sub="US constant-maturity curve · slope, curvature, implied forwards & shape — from FRED"
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
              aria-label="Refresh yield curve"
            >
              ↻
            </button>
          </div>
        }
      />

      {!data ? (
        <div className="grid h-64 place-items-center font-mono text-2xs uppercase tracking-wider text-dim">computing…</div>
      ) : (
        <div className="grid grid-cols-1 gap-px bg-line lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
          {/* ── Left: hero curve + shape ── */}
          <div className="space-y-4 bg-base p-4">
            <div className="rounded border border-line bg-elevated/10 p-3">
              <CurveChart points={data.points} />
            </div>

            {/* Shape headline */}
            {shapeMeta ? (
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className={cn("font-mono text-3xl font-semibold leading-none tracking-tight", shapeMeta.color)}>
                  {data.shape}
                </span>
                <span className="text-sm text-dim">{shapeMeta.desc}</span>
              </div>
            ) : null}

            {/* Key spreads deck */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat
                label="2s10s"
                value={
                  <span>
                    {fmtNum(data.slope2s10s, 2)}pp
                    {data.slope2s10s < 0 ? <span className="ml-1.5 text-2xs text-neg">inverted</span> : null}
                  </span>
                }
                tone={data.slope2s10s < 0 ? "neg" : "pos"}
              />
              <Stat
                label="3m10s"
                value={
                  <span>
                    {fmtNum(data.slope3m10s, 2)}pp
                    {data.slope3m10s < 0 ? <span className="ml-1.5 text-2xs text-neg">inverted</span> : null}
                  </span>
                }
                tone={data.slope3m10s < 0 ? "neg" : "pos"}
              />
              <Stat label="Curvature" value={`${fmtNum(data.curvature, 2)}pp`} tone="accent" />
              <Stat label="Level (10Y)" value={`${fmtNum(data.level, 2)}%`} />
            </div>

            {/* Inverted-segment warn callout */}
            {data.invertedSegments.length > 0 ? (
              <div className="rounded border border-neg/30 bg-neg/5 px-3 py-2.5">
                <div className="mb-1.5 flex items-center gap-1.5 font-mono text-2xs uppercase tracking-wider text-neg">
                  <span className="h-1.5 w-1.5 rounded-full bg-neg" /> Inverted segments
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-xs text-muted">
                  {data.invertedSegments.map((s) => (
                    <span key={`${s.from}-${s.to}`} className="whitespace-nowrap">
                      {s.from}→{s.to} <span className="text-neg">{fmtNum(s.spread, 2)}pp</span>
                    </span>
                  ))}
                </div>
                <p className="mt-1.5 text-2xs text-dim">
                  A negatively-sloped segment means the market prices lower short rates ahead — a recession signal.
                </p>
              </div>
            ) : null}
          </div>

          {/* ── Right: implied forwards ── */}
          <div className="space-y-3 bg-base p-4">
            <div>
              <div className="section-label">Implied Forwards</div>
              <p className="mt-1 text-2xs text-dim">Where the market prices future short rates.</p>
            </div>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <Th>Forward</Th>
                  <Th right>Rate</Th>
                  <Th right>vs spot</Th>
                </tr>
              </thead>
              <tbody>
                {forwards.map((f) => {
                  const spot = spotByLabel.get(f.to);
                  const diff = spot === undefined ? null : f.rate - spot;
                  return (
                    <tr key={`${f.from}-${f.to}`} className="hover:bg-elevated/40">
                      <Td className="text-muted">
                        {f.from}
                        <span className="text-faint">→</span>
                        {f.to}
                      </Td>
                      <Td right className="text-ink">
                        {fmtNum(f.rate, 2)}%
                      </Td>
                      <Td right className={diff === null ? "text-faint" : signClass(diff)}>
                        {diff === null ? "—" : `${fmtSignedPct(diff, 2).replace("%", "pp")}`}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="border-t border-line px-4 py-2.5 font-mono text-2xs text-faint">
        Forwards are implied from the spot curve assuming annual compounding (par-yield approximation). An inverted
        2s10s/3m10s has preceded most US recessions.
      </div>
    </Panel>
  );
}
