"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Panel, PanelHeader, Stat, Chip, Th, Td } from "@/components/ui/kit";
import { fmtNum } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Rng } from "@/lib/rng";
import { analyzeVolatility, type OHLC, type VolReport, type VolConePoint } from "@/lib/engine/volatility";

/* ── Types matching /api/engine/volatility ─────────────────────────────────── */

/** Live response = VolReport + provenance fields (or { live: false }). */
type Fetched = (VolReport & { source: string; asOf: string; symbol: string; live: true }) | { live: false };

/** Local view model — the computed report plus its presentation provenance. */
type VolData = VolReport & { source: string; asOf: string; symbol: string };

type Status = "loading" | "live" | "demo";

/* ── Percentile / level toning (static class maps — no dynamic Tailwind) ───── */

type Level = "calm" | "elevated" | "stressed";

const levelOf = (pctile: number): Level => (pctile < 30 ? "calm" : pctile > 70 ? "stressed" : "elevated");

const LEVEL_META: Record<Level, { tone: "pos" | "warn" | "neg"; text: string; word: string }> = {
  calm: { tone: "pos", text: "text-pos", word: "calm" },
  elevated: { tone: "warn", text: "text-warn", word: "elevated" },
  stressed: { tone: "neg", text: "text-neg", word: "stressed" },
};

/** Percent helper for annualized decimals (0.18 → "18.0%"). */
const pct = (v: number, dp = 1): string => `${fmtNum(v * 100, dp)}%`;
const tenor = (w: number): string => `${w}d`;
const ordinal = (n: number): string => {
  const r = Math.round(n);
  const v = r % 100;
  if (v >= 11 && v <= 13) return `${r}th`;
  switch (r % 10) {
    case 1:
      return `${r}st`;
    case 2:
      return `${r}nd`;
    case 3:
      return `${r}rd`;
    default:
      return `${r}th`;
  }
};

/* ── Demo: deterministic OHLC walk → identical engine math ─────────────────── */

/** ~400 seeded bars; realistic intraday ranges with h ≥ max(o,c), l ≤ min(o,c). */
function buildDemo(symbol: string): VolData {
  const r = new Rng(`vol-lab-${symbol}`);
  const bars: OHLC[] = [];
  let prevClose = 100;
  for (let i = 0; i < 400; i++) {
    const o = prevClose;
    // Drifting vol regime so the cone has a spread to render.
    const regime = 0.011 + 0.009 * (0.5 + 0.5 * Math.sin(i / 47));
    const move = r.gauss(0.0003, regime);
    const c = Math.max(0.5, o * (1 + move));
    const wick = Math.abs(r.gauss(0, regime * 0.9));
    const h = Math.max(o, c) * (1 + wick);
    const l = Math.min(o, c) * (1 - wick);
    bars.push({ o, h, l, c });
    prevClose = c;
  }
  const report = analyzeVolatility(bars);
  return { ...report, source: "demo", asOf: "", symbol, bars: bars.length };
}

/* ── The volatility cone (signature SVG, modeled on CurveChart) ─────────────── */

function ConeChart({ cone }: { cone: VolConePoint[] }) {
  const W = 640;
  const H = 280;
  const PAD_L = 40;
  const PAD_R = 16;
  const PAD_T = 22;
  const PAD_B = 30;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;

  const n = cone.length;

  // Y range across every series so nothing clips; padded headroom.
  const vals = cone.flatMap((p) => [p.min, p.max, p.current]);
  const rawMin = Math.min(...vals);
  const rawMax = Math.max(...vals);
  const padY = Math.max(0.01, (rawMax - rawMin) * 0.18);
  const yMin = Math.max(0, rawMin - padY);
  const yMax = rawMax + padY;
  const spanY = yMax - yMin || 1;

  // Evenly-spaced ordinal x — one slot per look-back window.
  const xOf = (i: number) => (n <= 1 ? PAD_L + plotW / 2 : PAD_L + (i / (n - 1)) * plotW);
  const yOf = (v: number) => PAD_T + plotH - ((v - yMin) / spanY) * plotH;

  // Nice Y gridlines (~5 ticks).
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

  // Band between two per-window series: upper traced forward, lower traced back.
  const band = (upper: (p: VolConePoint) => number, lower: (p: VolConePoint) => number) => {
    const top = cone.map((p, i) => `${i === 0 ? "M" : "L"}${xOf(i).toFixed(1)},${yOf(upper(p)).toFixed(1)}`).join(" ");
    const bottom = cone
      .map((p, i) => {
        const j = n - 1 - i;
        return `L${xOf(j).toFixed(1)},${yOf(lower(cone[j])).toFixed(1)}`;
      })
      .join(" ");
    return `${top} ${bottom} Z`;
  };

  const line = (sel: (p: VolConePoint) => number) =>
    cone.map((p, i) => `${i === 0 ? "M" : "L"}${xOf(i).toFixed(1)},${yOf(sel(p)).toFixed(1)}`).join(" ");

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      className="block overflow-visible"
      role="img"
      aria-label="Realized volatility cone by look-back window against its historical envelope"
    >
      {/* Y gridlines + % tick labels */}
      {ticks.map((t) => {
        const yp = yOf(t);
        if (yp < PAD_T - 0.5 || yp > PAD_T + plotH + 0.5) return null;
        return (
          <g key={`g-${t}`}>
            <line x1={PAD_L} y1={yp} x2={PAD_L + plotW} y2={yp} stroke="var(--line)" strokeWidth={0.6} />
            <text x={PAD_L - 6} y={yp + 3} textAnchor="end" fontSize={9} fontFamily="var(--font-mono)" fill="var(--dim)">
              {(t * 100).toFixed(0)}%
            </text>
          </g>
        );
      })}

      {/* min → max envelope (light) */}
      <path d={band((p) => p.max, (p) => p.min)} fill="var(--accent)" opacity={0.08} />
      {/* p25 → p75 envelope (darker) */}
      <path d={band((p) => p.p75, (p) => p.p25)} fill="var(--accent)" opacity={0.18} />

      {/* median line (muted) */}
      <path d={line((p) => p.median)} fill="none" stroke="var(--muted)" strokeWidth={1.4} strokeDasharray="4 3" opacity={0.8} />

      {/* current realized-vol line (accent) */}
      <path d={line((p) => p.current)} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

      {/* current dots + per-window vol labels */}
      {cone.map((p, i) => {
        const cx = xOf(i);
        const cy = yOf(p.current);
        const down = p.current <= yMin + spanY * 0.16; // label above unless near the floor
        const tone = p.current >= p.p75 ? "var(--neg)" : p.current <= p.p25 ? "var(--pos)" : "var(--accent)";
        return (
          <g key={`pt-${p.window}`}>
            <circle cx={cx} cy={cy} r={3} fill={tone} />
            <text x={cx} y={down ? cy + 13 : cy - 7} textAnchor="middle" fontSize={9} fontFamily="var(--font-mono)" fill="var(--muted)">
              {(p.current * 100).toFixed(0)}
            </text>
          </g>
        );
      })}

      {/* X-axis tenor labels */}
      {cone.map((p, i) => (
        <text
          key={`x-${p.window}`}
          x={xOf(i)}
          y={PAD_T + plotH + 16}
          textAnchor="middle"
          fontSize={9}
          fontFamily="var(--font-mono)"
          fill="var(--dim)"
        >
          {tenor(p.window)}
        </text>
      ))}
    </svg>
  );
}

/* ── Estimator deck meta ───────────────────────────────────────────────────── */

const ESTIMATORS: { key: keyof Pick<VolReport, "closeToClose" | "parkinson" | "garmanKlass" | "rogersSatchell" | "yangZhang">; label: string }[] = [
  { key: "closeToClose", label: "Close-to-Close" },
  { key: "parkinson", label: "Parkinson" },
  { key: "garmanKlass", label: "Garman-Klass" },
  { key: "rogersSatchell", label: "Rogers-Satchell" },
  { key: "yangZhang", label: "Yang-Zhang" },
];

/* ── Main panel ────────────────────────────────────────────────────────────── */

export function VolatilityLab({ symbol }: { symbol: string }) {
  const [status, setStatus] = useState<Status>("loading");
  const [data, setData] = useState<VolData | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const r = await fetch(`/api/engine/volatility?symbol=${encodeURIComponent(symbol)}`, { cache: "no-store" });
      const j = (await r.json()) as Fetched;
      if (j.live) {
        setData({
          closeToClose: j.closeToClose,
          parkinson: j.parkinson,
          garmanKlass: j.garmanKlass,
          rogersSatchell: j.rogersSatchell,
          yangZhang: j.yangZhang,
          cone: j.cone,
          current: j.current,
          percentile: j.percentile,
          bars: j.bars,
          source: j.source,
          asOf: j.asOf,
          symbol: j.symbol,
        });
        setStatus("live");
      } else {
        setData(buildDemo(symbol));
        setStatus("demo");
      }
    } catch {
      setData(buildDemo(symbol));
      setStatus("demo");
    }
  }, [symbol]);

  useEffect(() => {
    load();
  }, [load]);

  const asOf = useMemo(() => {
    if (status !== "live" || !data?.asOf) return "";
    return new Date(data.asOf).toLocaleTimeString("en-US", { hour12: false });
  }, [status, data]);

  const level = data ? levelOf(data.percentile) : null;
  const levelMeta = level ? LEVEL_META[level] : null;
  const cone = data?.cone ?? [];

  // How much tighter is Parkinson vs close-to-close? (positive = tighter)
  const tighterPct = useMemo(() => {
    if (!data || data.closeToClose <= 0) return null;
    return ((data.closeToClose - data.parkinson) / data.closeToClose) * 100;
  }, [data]);

  return (
    <Panel className="animate-rise">
      <PanelHeader
        title="Volatility Lab"
        sub={`${symbol} · range-based estimators & realized-vol cone — annualized, from daily OHLC`}
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
              aria-label="Refresh volatility analysis"
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
          {/* ── Left: hero + cone ── */}
          <div className="space-y-4 bg-base p-4">
            {/* Hero — headline annualized vol (Yang-Zhang) */}
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
              <span className={cn("font-mono text-4xl font-semibold leading-none tracking-tight", levelMeta?.text)}>
                {pct(data.current)}
              </span>
              {levelMeta ? (
                <Chip tone={levelMeta.tone}>{ordinal(data.percentile)} pctile</Chip>
              ) : null}
            </div>
            {levelMeta ? (
              <p className="text-sm text-dim">
                Realized vol (Yang-Zhang) in the {ordinal(data.percentile)} percentile of its 1-year range —{" "}
                <span className={levelMeta.text}>{levelMeta.word}</span>.
              </p>
            ) : null}

            {/* The cone */}
            <div className="rounded border border-line bg-elevated/10 p-3">
              {cone.length ? (
                <ConeChart cone={cone} />
              ) : (
                <div className="grid h-48 place-items-center font-mono text-2xs uppercase tracking-wider text-dim">
                  insufficient history for cone
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-2xs text-dim">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-3 rounded-sm bg-accent/20" /> min–max
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-3 rounded-sm bg-accent/40" /> p25–p75
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-px w-3 bg-muted" /> median
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-px w-3 bg-accent" /> current
              </span>
            </div>
          </div>

          {/* ── Right: estimator deck ── */}
          <div className="space-y-3 bg-base p-4">
            <div>
              <div className="section-label">Volatility Estimators</div>
              <p className="mt-1 text-2xs text-dim">Annualized, last ~30 sessions.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {ESTIMATORS.map((e) => (
                <Stat
                  key={e.key}
                  label={e.label}
                  value={pct(data[e.key])}
                  tone={e.key === "yangZhang" ? "accent" : undefined}
                />
              ))}
            </div>
            <p className="text-2xs text-dim">
              Range-based estimators (Parkinson, Garman-Klass, Rogers-Satchell, Yang-Zhang) use the full OHLC bar and are
              far more efficient than close-to-close.
              {tighterPct != null && tighterPct > 0 ? (
                <>
                  {" "}
                  Here Parkinson reads <span className="text-muted">{fmtNum(tighterPct, 0)}%</span> tighter than
                  close-to-close.
                </>
              ) : null}
            </p>
          </div>
        </div>
      )}

      {/* ── Cone table ── */}
      {data && cone.length ? (
        <div className="overflow-x-auto border-t border-line">
          <table className="w-full min-w-[560px] border-collapse">
            <thead>
              <tr>
                <Th>Window</Th>
                <Th right>Current</Th>
                <Th right>Min</Th>
                <Th right>Median</Th>
                <Th right>Max</Th>
                <Th right>Percentile</Th>
              </tr>
            </thead>
            <tbody>
              {cone.map((p) => {
                const lv = LEVEL_META[levelOf(p.percentile)];
                const aboveMedian = p.current >= p.median;
                return (
                  <tr key={p.window} className="hover:bg-elevated/40">
                    <Td className="font-medium text-ink">{tenor(p.window)}</Td>
                    <Td right className={aboveMedian ? "text-warn" : "text-muted"}>
                      {pct(p.current)}
                    </Td>
                    <Td right className="text-dim">{pct(p.min)}</Td>
                    <Td right className="text-muted">{pct(p.median)}</Td>
                    <Td right className="text-dim">{pct(p.max)}</Td>
                    <Td right>
                      <div className="flex items-center justify-end gap-2">
                        <span className="relative hidden h-1.5 w-16 overflow-hidden rounded-[2px] bg-line/50 sm:inline-block">
                          <span
                            className={cn(
                              "absolute inset-y-0 left-0 rounded-[2px]",
                              lv.tone === "pos" ? "bg-pos/70" : lv.tone === "warn" ? "bg-warn/70" : "bg-neg/70",
                            )}
                            style={{ width: `${Math.max(2, Math.min(100, p.percentile))}%` }}
                          />
                        </span>
                        <span className={cn("w-12 text-right tabular-nums", lv.text)}>{ordinal(p.percentile)}</span>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="border-t border-line px-4 py-2.5 font-mono text-2xs text-faint">
        Range-based estimators (Parkinson, Garman-Klass, Rogers-Satchell, Yang-Zhang) use the full OHLC bar and are far
        more efficient than close-to-close. The cone shows realized vol by look-back window against its historical
        envelope; the percentile is a realized-vol analogue of IV rank. Source: Stooq daily OHLC.
      </div>
    </Panel>
  );
}
