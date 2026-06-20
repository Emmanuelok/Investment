"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Panel, PanelHeader, Th, Td } from "@/components/ui/kit";
import { computeRRG, type Quadrant, type RRGResult } from "@/lib/engine/rrg";
import { candleSeries } from "@/lib/rng";
import { cn } from "@/lib/cn";

/* ── Types ─────────────────────────────────────────────────────────────────── */

type Status = "loading" | "live" | "demo";

type RRGRow = RRGResult & { sym: string; name: string };

interface RRGApiResponse {
  live: boolean;
  source?: string;
  asOf?: string;
  benchmark?: string;
  window?: number;
  rows?: RRGRow[];
}

/* ── Sector universe (mirrors the route default) ───────────────────────────── */

const SECTORS: ReadonlyArray<readonly [string, string]> = [
  ["XLK", "Technology"],
  ["XLF", "Financials"],
  ["XLE", "Energy"],
  ["XLV", "Healthcare"],
  ["XLI", "Industrials"],
  ["XLY", "Consumer Discr"],
  ["XLP", "Consumer Stapl"],
  ["XLU", "Utilities"],
  ["XLB", "Materials"],
  ["XLRE", "Real Estate"],
  ["XLC", "Communication"],
];

const BENCHMARK = "SPY";
const WINDOW = 12;

/* ── Quadrant presentation ─────────────────────────────────────────────────── */

const QUADRANTS: ReadonlyArray<Quadrant> = ["Leading", "Improving", "Weakening", "Lagging"];

type QuadStyle = { color: string; chip: string; label: string; ringTone: string };

// Leading → top-right (pos), Improving → top-left (accent), Weakening → bottom-right (warn),
// Lagging → bottom-left (neg). Colors keyed to the design tokens.
const QUAD: Record<Quadrant, QuadStyle> = {
  Leading: { color: "var(--pos)", chip: "chip-pos", label: "LEADING", ringTone: "text-pos" },
  Improving: { color: "var(--accent)", chip: "chip-accent", label: "IMPROVING", ringTone: "text-accent" },
  Weakening: { color: "var(--warn)", chip: "chip-warn", label: "WEAKENING", ringTone: "text-warn" },
  Lagging: { color: "var(--neg)", chip: "chip-neg", label: "LAGGING", ringTone: "text-neg" },
};

// Table sort priority: Leading → Improving → Weakening → Lagging.
const QUAD_ORDER: Record<Quadrant, number> = { Leading: 0, Improving: 1, Weakening: 2, Lagging: 3 };

/* ── Demo data ─────────────────────────────────────────────────────────────── */

/**
 * Deterministic local RRG — the same engine math the live route runs, only the
 * price source differs. Varied per-sector drift spreads the points across all
 * four rotation quadrants.
 */
function demoRows(): RRGRow[] {
  const benchCloses = candleSeries("SPY-rrg", 260, 100, 0.012, 0.0003).map((c) => c.c);
  const out: RRGRow[] = [];
  SECTORS.forEach(([sym, name], i) => {
    const drift = ((i % 5) - 2) * 0.0007 + 0.0002;
    const closes = candleSeries(`${sym}-rrg`, 260, 100, 0.016, drift).map((c) => c.c);
    const rrg = computeRRG(closes, benchCloses, WINDOW);
    if (rrg) out.push({ ...rrg, sym, name });
  });
  return out;
}

/* ── RRG scatter (inline SVG) ──────────────────────────────────────────────── */

const W = 460;
const H = 420;
const PAD = { top: 18, right: 18, bottom: 30, left: 38 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

function niceTicks(min: number, max: number): number[] {
  const span = max - min;
  if (span <= 0) return [min];
  const step = span <= 2 ? 0.5 : span <= 5 ? 1 : span <= 12 ? 2 : 5;
  const first = Math.ceil(min / step) * step;
  const ticks: number[] = [];
  for (let v = first; v <= max + 1e-9; v += step) ticks.push(Math.round(v * 100) / 100);
  return ticks;
}

function RRGScatter({ rows }: { rows: RRGRow[] }) {
  const { xMin, xMax, yMin, yMax } = useMemo(() => {
    const xs: number[] = [];
    const ys: number[] = [];
    rows.forEach((r) => {
      xs.push(r.ratio);
      ys.push(r.momentum);
      r.tail.forEach((p) => {
        xs.push(p.ratio);
        ys.push(p.momentum);
      });
    });
    // Always include 100 so the crosshair stays centered-ish; pad ~±1 around the data.
    xs.push(100);
    ys.push(100);
    const rawXMin = Math.min(...xs);
    const rawXMax = Math.max(...xs);
    const rawYMin = Math.min(...ys);
    const rawYMax = Math.max(...ys);
    // Symmetric padding around 100 keeps the quadrant cross visually centered.
    const xHalf = Math.max(rawXMax - 100, 100 - rawXMin) + 1;
    const yHalf = Math.max(rawYMax - 100, 100 - rawYMin) + 1;
    return { xMin: 100 - xHalf, xMax: 100 + xHalf, yMin: 100 - yHalf, yMax: 100 + yHalf };
  }, [rows]);

  const sx = useCallback((v: number) => PAD.left + ((v - xMin) / (xMax - xMin)) * PLOT_W, [xMin, xMax]);
  const sy = useCallback((v: number) => PAD.top + (1 - (v - yMin) / (yMax - yMin)) * PLOT_H, [yMin, yMax]);

  const cx = sx(100);
  const cy = sy(100);
  const xTicks = useMemo(() => niceTicks(xMin, xMax).filter((t) => Math.abs(t - 100) > 1e-6), [xMin, xMax]);
  const yTicks = useMemo(() => niceTicks(yMin, yMax).filter((t) => Math.abs(t - 100) > 1e-6), [yMin, yMax]);

  // Quadrant fill rectangles (faint tint).
  const quadRects: Array<{ x: number; y: number; w: number; h: number; fill: string; label: string; lx: number; ly: number; anchor: "start" | "end" }> = [
    { x: cx, y: PAD.top, w: PAD.left + PLOT_W - cx, h: cy - PAD.top, fill: "var(--pos)", label: "LEADING", lx: PAD.left + PLOT_W - 6, ly: PAD.top + 14, anchor: "end" }, // TR
    { x: PAD.left, y: PAD.top, w: cx - PAD.left, h: cy - PAD.top, fill: "var(--accent)", label: "IMPROVING", lx: PAD.left + 6, ly: PAD.top + 14, anchor: "start" }, // TL
    { x: PAD.left, y: cy, w: cx - PAD.left, h: PAD.top + PLOT_H - cy, fill: "var(--neg)", label: "LAGGING", lx: PAD.left + 6, ly: PAD.top + PLOT_H - 8, anchor: "start" }, // BL
    { x: cx, y: cy, w: PAD.left + PLOT_W - cx, h: PAD.top + PLOT_H - cy, fill: "var(--warn)", label: "WEAKENING", lx: PAD.left + PLOT_W - 6, ly: PAD.top + PLOT_H - 8, anchor: "end" }, // BR
  ];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="max-w-[460px]" role="img" aria-label="Relative Rotation Graph scatter">
      {/* quadrant tints */}
      {quadRects.map((q) => (
        <rect key={q.label} x={q.x} y={q.y} width={q.w} height={q.h} fill={q.fill} opacity={0.06} />
      ))}

      {/* plot border */}
      <rect x={PAD.left} y={PAD.top} width={PLOT_W} height={PLOT_H} fill="none" stroke="var(--line)" strokeWidth={1} />

      {/* gridlines */}
      {xTicks.map((t) => (
        <line key={`gx${t}`} x1={sx(t)} y1={PAD.top} x2={sx(t)} y2={PAD.top + PLOT_H} stroke="var(--line)" strokeWidth={0.5} opacity={0.4} />
      ))}
      {yTicks.map((t) => (
        <line key={`gy${t}`} x1={PAD.left} y1={sy(t)} x2={PAD.left + PLOT_W} y2={sy(t)} stroke="var(--line)" strokeWidth={0.5} opacity={0.4} />
      ))}

      {/* center crosshair at 100 / 100 */}
      <line x1={cx} y1={PAD.top} x2={cx} y2={PAD.top + PLOT_H} stroke="var(--line-strong)" strokeWidth={1} strokeDasharray="4,3" />
      <line x1={PAD.left} y1={cy} x2={PAD.left + PLOT_W} y2={cy} stroke="var(--line-strong)" strokeWidth={1} strokeDasharray="4,3" />

      {/* quadrant labels */}
      {quadRects.map((q) => (
        <text
          key={`l${q.label}`}
          x={q.lx}
          y={q.ly}
          textAnchor={q.anchor}
          fontSize={9}
          fontFamily="var(--font-mono)"
          letterSpacing="0.08em"
          fill={q.fill}
          opacity={0.7}
        >
          {q.label}
        </text>
      ))}

      {/* axis tick labels */}
      {xTicks.map((t) => (
        <text key={`tx${t}`} x={sx(t)} y={PAD.top + PLOT_H + 12} textAnchor="middle" fontSize={8} fontFamily="var(--font-mono)" fill="var(--dim)">
          {t.toFixed(0)}
        </text>
      ))}
      {yTicks.map((t) => (
        <text key={`ty${t}`} x={PAD.left - 6} y={sy(t) + 3} textAnchor="end" fontSize={8} fontFamily="var(--font-mono)" fill="var(--dim)">
          {t.toFixed(0)}
        </text>
      ))}
      <text x={cx} y={PAD.top + PLOT_H + 12} textAnchor="middle" fontSize={8} fontFamily="var(--font-mono)" fill="var(--muted)">
        100
      </text>
      <text x={PAD.left - 6} y={cy + 3} textAnchor="end" fontSize={8} fontFamily="var(--font-mono)" fill="var(--muted)">
        100
      </text>

      {/* axis titles */}
      <text x={PAD.left + PLOT_W / 2} y={H - 4} textAnchor="middle" fontSize={9} fontFamily="var(--font-mono)" letterSpacing="0.08em" fill="var(--dim)">
        RS-RATIO →
      </text>
      <text x={11} y={PAD.top + PLOT_H / 2} textAnchor="middle" fontSize={9} fontFamily="var(--font-mono)" letterSpacing="0.08em" fill="var(--dim)" transform={`rotate(-90 11 ${PAD.top + PLOT_H / 2})`}>
        RS-MOMENTUM →
      </text>

      {/* tails + dots */}
      {rows.map((r) => {
        const color = QUAD[r.quadrant].color;
        const pts = r.tail.length ? r.tail : [{ ratio: r.ratio, momentum: r.momentum }];
        const poly = pts.map((p) => `${sx(p.ratio).toFixed(1)},${sy(p.momentum).toFixed(1)}`).join(" ");
        const lastX = sx(r.ratio);
        const lastY = sy(r.momentum);
        return (
          <g key={r.sym}>
            {pts.length > 1 ? <polyline points={poly} fill="none" stroke={color} strokeWidth={1.25} opacity={0.4} strokeLinejoin="round" strokeLinecap="round" /> : null}
            {/* trail dots (older positions, small + faint) */}
            {pts.slice(0, -1).map((p, idx) => (
              <circle key={idx} cx={sx(p.ratio)} cy={sy(p.momentum)} r={1.4} fill={color} opacity={0.35} />
            ))}
            {/* latest position — larger */}
            <circle cx={lastX} cy={lastY} r={4.5} fill={color} stroke="var(--panel)" strokeWidth={1} />
            <text x={lastX + 6} y={lastY + 3} fontSize={8.5} fontFamily="var(--font-mono)" fontWeight={600} fill="var(--ink)">
              {r.sym}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ── Component ─────────────────────────────────────────────────────────────── */

export function SectorRotation() {
  const [status, setStatus] = useState<Status>("loading");
  const [liveRows, setLiveRows] = useState<RRGRow[] | null>(null);
  const [benchmark, setBenchmark] = useState(BENCHMARK);
  const [source, setSource] = useState("");
  const [updated, setUpdated] = useState("");

  const load = useCallback(async () => {
    try {
      const symbols = SECTORS.map(([s]) => s).join(",");
      const r = await fetch(`/api/engine/rrg?symbols=${encodeURIComponent(symbols)}&benchmark=${BENCHMARK}&window=${WINDOW}`, { cache: "no-store" });
      const j = (await r.json()) as RRGApiResponse;
      if (j.live && j.rows && j.rows.length > 0) {
        setLiveRows(j.rows);
        setBenchmark(j.benchmark ?? BENCHMARK);
        setSource(j.source ?? "live");
        setUpdated(new Date(j.asOf ?? Date.now()).toLocaleTimeString("en-US", { hour12: false }));
        setStatus("live");
      } else {
        setStatus("demo");
      }
    } catch {
      setStatus("demo");
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 300_000); // refresh every 5 min
    return () => clearInterval(id);
  }, [load]);

  // Deterministic demo fallback — real engine math over a fixed price series.
  const demo = useMemo(() => demoRows(), []);
  const rows = status === "live" && liveRows ? liveRows : demo;
  const bench = status === "live" ? benchmark : BENCHMARK;

  const counts = useMemo(() => {
    const c: Record<Quadrant, number> = { Leading: 0, Improving: 0, Weakening: 0, Lagging: 0 };
    rows.forEach((r) => {
      c[r.quadrant] += 1;
    });
    return c;
  }, [rows]);

  const sorted = useMemo(
    () => [...rows].sort((a, b) => QUAD_ORDER[a.quadrant] - QUAD_ORDER[b.quadrant] || b.ratio - a.ratio),
    [rows],
  );

  return (
    <Panel className="animate-rise">
      <PanelHeader
        title="Sector Rotation — RRG"
        sub={`JdK RS-Ratio vs RS-Momentum vs ${bench} — which sectors are leading, weakening, lagging or improving`}
        right={
          status === "loading" ? (
            <span className="flex items-center gap-1.5 font-mono text-2xs uppercase tracking-wider text-dim">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-dim" />
              computing…
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
              <span className="hidden font-mono text-2xs text-dim sm:inline">as of {updated}</span>
            </>
          ) : (
            <span className="flex items-center gap-1.5 rounded border border-warn/40 bg-warn/10 px-2 py-1 font-mono text-2xs uppercase tracking-wider text-warn">
              <span className="h-1.5 w-1.5 rounded-full bg-warn" />
              ENGINE · DEMO DATA
            </span>
          )
        }
      />

      {/* 1 ── The RRG scatter (hero) + quadrant legend/counts */}
      <div className="grid gap-4 border-b border-line px-4 py-5 lg:grid-cols-[auto_1fr]">
        <div className="flex justify-center">
          <RRGScatter rows={rows} />
        </div>

        {/* 2 ── Quadrant legend + counts */}
        <div className="flex flex-col justify-center gap-3">
          <div className="kpi-label">QUADRANTS · {rows.length} SECTORS</div>
          <div className="grid grid-cols-2 gap-2.5">
            {QUADRANTS.map((q) => {
              const s = QUAD[q];
              return (
                <div key={q} className="flex items-center justify-between rounded border border-line bg-elevated/30 px-3 py-2.5">
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                    <span className="font-mono text-2xs uppercase tracking-wider text-muted">{q}</span>
                  </span>
                  <span className={cn("font-mono text-lg font-medium tabular-nums", s.ringTone)}>{counts[q]}</span>
                </div>
              );
            })}
          </div>
          <p className="font-mono text-2xs leading-relaxed text-dim">
            Top-right is strongest (leading); points rotate clockwise through weakening, lagging, then improving back to leading.
          </p>
        </div>
      </div>

      {/* 3 ── Table — sorted by quadrant then RS-Ratio desc */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse">
          <thead>
            <tr>
              <Th>Sector</Th>
              <Th right>RS-Ratio</Th>
              <Th right>RS-Momentum</Th>
              <Th right>Quadrant</Th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.sym} className="group hover:bg-elevated/40">
                <Td mono={false}>
                  <span className="flex items-center gap-2.5">
                    <span className="inline-flex items-center rounded border border-line bg-elevated/70 px-1.5 py-0.5 font-mono text-xs font-medium text-ink">{r.sym}</span>
                    <span className="truncate text-xs text-dim">{r.name}</span>
                  </span>
                </Td>
                <Td right className="text-ink">{r.ratio.toFixed(2)}</Td>
                <Td right className="text-ink">{r.momentum.toFixed(2)}</Td>
                <Td right>
                  <span className={cn("chip", QUAD[r.quadrant].chip)}>{r.quadrant}</span>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 4 ── Footer */}
      <div className="border-t border-line px-4 py-2 font-mono text-2xs text-dim">
        RRG plots relative strength (x) against its momentum (y), centered at 100. Sectors rotate clockwise: Improving → Leading → Weakening → Lagging. Tails show the recent trajectory.
      </div>
    </Panel>
  );
}
