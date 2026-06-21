"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Panel, PanelHeader, Stat, Chip } from "@/components/ui/kit";
import { Ring } from "@/components/ui/viz";
import { fmtNum, fmtSigned, fmtSignedPct } from "@/lib/format";
import { cn } from "@/lib/cn";
import {
  analyzeVixTerm,
  type VixInput,
  type VixTermReport,
  type TermStructure,
  type FearRegime,
} from "@/lib/engine/vix-term";

/* ── Types matching /api/engine/vix-term ───────────────────────────────────── */

type HistPoint = { date: string; value: number };

/** Live response = the engine report + provenance + the VIX history tail. */
type Fetched =
  | (VixTermReport & {
      live: true;
      source: string;
      asOf: string;
      asOfDate: string | null;
      vixHistory: HistPoint[];
    })
  | { live: false };

/** Local view model — the computed report plus its presentation provenance. */
type VixData = VixTermReport & {
  source: string;
  asOf: string;
  asOfDate: string | null;
  vixHistory: HistPoint[];
};

type Status = "loading" | "live" | "demo";

/* ── Regime presentation (static class maps — no dynamic Tailwind) ─────────── */

const REGIME_META: Record<FearRegime, { text: string; desc: string }> = {
  Calm: { text: "text-pos", desc: "implied vol depressed — complacent" },
  Normal: { text: "text-pos/80", desc: "implied vol moderate — orderly" },
  Elevated: { text: "text-warn", desc: "implied vol rich — markets nervous" },
  Panic: { text: "text-neg", desc: "implied vol spiking — acute fear" },
};

const STRUCTURE_META: Record<TermStructure, { text: string; tone: "pos" | "warn" | "neg"; word: string }> = {
  Contango: { text: "text-pos", tone: "pos", word: "contango" },
  Flat: { text: "text-warn", tone: "warn", word: "flat" },
  Backwardation: { text: "text-neg", tone: "neg", word: "backwardation" },
};

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

/** Where spot VIX sits → a one-word complacency read. */
const percentileWord = (p: number): string => (p < 33 ? "complacent" : p > 66 ? "fearful" : "normal");

/* ── Demo: realistic late-cycle VIX/VIX3M series → identical engine math ───── */

/** Drifting VIX path around 14–20 ending ~17; VIX3M ending ~19 (contango). */
function buildDemo(): VixData {
  const N = 90;
  const vix: number[] = [];
  const vix3m: number[] = [];
  const vixHistory: HistPoint[] = [];

  // Deterministic, smooth walk — no RNG needed; mild waves around a calm mean.
  const today = new Date("2026-06-21T00:00:00Z");
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    // Spot VIX: mean ramps 16.2 → 17.0 while gentle waves fade into the present,
    // so it settles ~16.6 (below VIX3M ⇒ contango, a calm/normal late-cycle read).
    const fade = 1 - 0.55 * t;
    const wave = (1.5 * Math.sin(i / 9) + 0.9 * Math.sin(i / 5.5) + 0.5 * Math.cos(i / 3.7)) * fade;
    const v = 16.2 + 0.8 * t + wave;
    // VIX3M trades above spot in calm regimes (contango) — flatter, higher base.
    const v3 = 18.9 + 0.7 * Math.sin(i / 15);
    vix.push(v);
    vix3m.push(v3);

    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - (N - 1 - i));
    vixHistory.push({ date: d.toISOString().slice(0, 10), value: Number(v.toFixed(2)) });
  }

  const demoInput: VixInput = { vix, vix3m, realizedVol: 13 };
  const report = analyzeVixTerm(demoInput);
  const asOfDate = vixHistory[vixHistory.length - 1]?.date ?? null;
  return { ...report, source: "demo", asOf: "", asOfDate, vixHistory };
}

/* ── VIX history SVG (line chart modeled on CurveChart) ─────────────────────── */

function VixHistoryChart({ history }: { history: HistPoint[] }) {
  const W = 640;
  const H = 240;
  const PAD_L = 38;
  const PAD_R = 16;
  const PAD_T = 22;
  const PAD_B = 24;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;

  const n = history.length;
  const vals = history.map((p) => p.value);
  const rawMin = Math.min(...vals);
  const rawMax = Math.max(...vals);
  const padY = Math.max(1, (rawMax - rawMin) * 0.18);
  const yMin = Math.max(0, rawMin - padY);
  const yMax = rawMax + padY;
  const spanY = yMax - yMin || 1;

  // Evenly-spaced ordinal x — one slot per session, oldest → newest.
  const xOf = (i: number) => (n <= 1 ? PAD_L + plotW / 2 : PAD_L + (i / (n - 1)) * plotW);
  const yOf = (v: number) => PAD_T + plotH - ((v - yMin) / spanY) * plotH;

  // Nice Y gridlines (~5 ticks across the VIX-level range).
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

  // Fear-zone shading: >30 (panic, --neg), 20–30 (elevated, --warn). Clamp to plot.
  const zone = (lo: number, hi: number) => {
    const topY = yOf(Math.min(yMax, hi));
    const botY = yOf(Math.max(yMin, lo));
    const h = Math.max(0, botY - topY);
    return { topY, h };
  };
  const panicZone = zone(30, Infinity);
  const elevatedZone = zone(20, 30);

  const linePath = history.map((p, i) => `${i === 0 ? "M" : "L"}${xOf(i).toFixed(1)},${yOf(p.value).toFixed(1)}`).join(" ");

  const curX = xOf(n - 1);
  const curY = yOf(vals[n - 1]);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      className="block overflow-visible"
      role="img"
      aria-label={`VIX spot history over the last ${n} sessions; current level ${vals[n - 1].toFixed(1)}`}
    >
      {/* fear-zone shading (behind everything) */}
      {elevatedZone.h > 0 ? (
        <rect x={PAD_L} y={elevatedZone.topY} width={plotW} height={elevatedZone.h} fill="var(--warn)" opacity={0.07} />
      ) : null}
      {panicZone.h > 0 ? (
        <rect x={PAD_L} y={panicZone.topY} width={plotW} height={panicZone.h} fill="var(--neg)" opacity={0.08} />
      ) : null}

      {/* Y gridlines + VIX-level tick labels */}
      {ticks.map((t) => {
        const yp = yOf(t);
        if (yp < PAD_T - 0.5 || yp > PAD_T + plotH + 0.5) return null;
        return (
          <g key={`g-${t}`}>
            <line x1={PAD_L} y1={yp} x2={PAD_L + plotW} y2={yp} stroke="var(--line)" strokeWidth={0.6} />
            <text x={PAD_L - 6} y={yp + 3} textAnchor="end" fontSize={9} fontFamily="var(--font-mono)" fill="var(--dim)">
              {t.toFixed(0)}
            </text>
          </g>
        );
      })}

      {/* faint area under the line */}
      <path
        d={`${linePath} L${xOf(n - 1).toFixed(1)},${(PAD_T + plotH).toFixed(1)} L${xOf(0).toFixed(1)},${(PAD_T + plotH).toFixed(1)} Z`}
        fill="var(--accent)"
        opacity={0.07}
      />

      {/* the VIX line */}
      <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

      {/* current / last point marked */}
      <circle cx={curX} cy={curY} r={3.5} fill="var(--accent)" />
      <text x={curX - 6} y={curY - 8} textAnchor="end" fontSize={10} fontFamily="var(--font-mono)" fill="var(--muted)">
        {vals[n - 1].toFixed(1)}
      </text>

      {/* X-axis endpoints (oldest → now) */}
      <text x={PAD_L} y={PAD_T + plotH + 16} textAnchor="start" fontSize={9} fontFamily="var(--font-mono)" fill="var(--dim)">
        {history[0]?.date ?? "older"}
      </text>
      <text x={PAD_L + plotW} y={PAD_T + plotH + 16} textAnchor="end" fontSize={9} fontFamily="var(--font-mono)" fill="var(--dim)">
        now
      </text>
    </svg>
  );
}

/* ── Term-structure two-bar comparison (VIX vs VIX3M) ──────────────────────── */

function TermBars({ vix, vix3m }: { vix: number; vix3m: number }) {
  const max = Math.max(vix, vix3m, 1);
  const bar = (label: string, value: number, tone: string) => (
    <div className="flex items-center gap-2">
      <span className="w-12 shrink-0 font-mono text-2xs uppercase tracking-wider text-dim">{label}</span>
      <span className="relative h-3 flex-1 overflow-hidden rounded-[2px] bg-line/50">
        <span className={cn("absolute inset-y-0 left-0 rounded-[2px]", tone)} style={{ width: `${(value / max) * 100}%` }} />
      </span>
      <span className="w-12 shrink-0 text-right font-mono text-xs tabular-nums text-muted">{fmtNum(value, 1)}</span>
    </div>
  );
  return (
    <div className="space-y-2">
      {bar("VIX", vix, "bg-accent/70")}
      {bar("VIX3M", vix3m, "bg-muted/60")}
    </div>
  );
}

/* ── Main panel ────────────────────────────────────────────────────────────── */

export function VixFear() {
  const [status, setStatus] = useState<Status>("loading");
  const [data, setData] = useState<VixData | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const r = await fetch("/api/engine/vix-term", { cache: "no-store" });
      const j = (await r.json()) as Fetched;
      if (j.live) {
        setData({
          vix: j.vix,
          vix3m: j.vix3m,
          termRatio: j.termRatio,
          termStructure: j.termStructure,
          vixPercentile: j.vixPercentile,
          vixChange: j.vixChange,
          varianceRiskPremium: j.varianceRiskPremium,
          fearScore: j.fearScore,
          regime: j.regime,
          source: j.source,
          asOf: j.asOf,
          asOfDate: j.asOfDate,
          vixHistory: j.vixHistory,
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

  const regimeMeta = data ? REGIME_META[data.regime] : null;
  const structMeta = data ? STRUCTURE_META[data.termStructure] : null;
  const history = data?.vixHistory ?? [];

  // Spot VIX rising = stress (neg). Term ratio coloring: >1.05 inverted (neg), <0.95 contango (pos).
  const vrp = data?.varianceRiskPremium ?? null;
  const inverted = data ? data.termRatio > 1 : false;
  const fearRingColor = data ? (data.fearScore >= 66 ? "var(--neg)" : data.fearScore >= 33 ? "var(--warn)" : "var(--pos)") : "var(--pos)";

  return (
    <Panel className="animate-rise">
      <PanelHeader
        title="VIX Term Structure & Fear"
        sub="Implied-vol term structure (spot vs 3-month) · fear regime, percentile & variance-risk premium — from FRED"
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
              aria-label="Refresh VIX term structure"
            >
              ↻
            </button>
          </div>
        }
      />

      {!data || !regimeMeta || !structMeta ? (
        <div className="grid h-64 place-items-center font-mono text-2xs uppercase tracking-wider text-dim">computing…</div>
      ) : (
        <div className="grid grid-cols-1 gap-px bg-line lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
          {/* ── Left: hero + VIX history chart ── */}
          <div className="space-y-4 bg-base p-4">
            {/* Hero — regime headline + spot VIX + fear ring */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
                <span className={cn("font-mono text-4xl font-semibold leading-none tracking-tight", regimeMeta.text)}>
                  {data.regime}
                </span>
                <span className="flex items-baseline gap-1.5">
                  <span className="font-mono text-2xl font-semibold leading-none tracking-tight text-ink">
                    {fmtNum(data.vix, 1)}
                  </span>
                  <span className={cn("font-mono text-sm", data.vixChange > 0 ? "text-neg" : "text-pos")}>
                    {fmtSigned(data.vixChange, 1)}
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <Ring value={data.fearScore} max={100} size={56} stroke={6} color={fearRingColor} label={`${Math.round(data.fearScore)}`} sub="fear" />
                <div className="text-2xs text-dim">
                  <div className="font-mono uppercase tracking-wider">Fear score</div>
                  <div className="mt-0.5">0 = complacent · 100 = panic</div>
                </div>
              </div>
            </div>
            <p className="text-sm text-dim">
              VIX at <span className="font-mono text-muted">{fmtNum(data.vix, 1)}</span> in the {ordinal(data.vixPercentile)}{" "}
              percentile — <span className={regimeMeta.text}>{percentileWord(data.vixPercentile)}</span>; term structure in{" "}
              <span className={structMeta.text}>{structMeta.word}</span>.
            </p>

            {/* The VIX history chart */}
            <div className="rounded border border-line bg-elevated/10 p-3">
              {history.length ? (
                <VixHistoryChart history={history} />
              ) : (
                <div className="grid h-48 place-items-center font-mono text-2xs uppercase tracking-wider text-dim">
                  insufficient history for chart
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-2xs text-dim">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-px w-3 bg-accent" /> VIX spot
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-3 rounded-sm bg-warn/20" /> elevated (20–30)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-3 rounded-sm bg-neg/20" /> panic (&gt;30)
              </span>
            </div>
          </div>

          {/* ── Right: term-structure callout + stats deck ── */}
          <div className="space-y-3 bg-base p-4">
            <div>
              <div className="section-label">Term Structure</div>
              <p className="mt-1 text-2xs text-dim">Spot vs 3-month — the stress gauge.</p>
            </div>

            {/* The key signal — prominent callout */}
            <div className={cn("rounded border px-3 py-2.5", inverted ? "border-neg/30 bg-neg/5" : "border-pos/30 bg-pos/5")}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className={cn("font-mono text-lg font-semibold tracking-tight", structMeta.text)}>
                  {data.termStructure}
                </span>
                <Chip tone={structMeta.tone}>ratio {fmtNum(data.termRatio, 2)}</Chip>
              </div>
              <TermBars vix={data.vix} vix3m={data.vix3m} />
              <p className="mt-2 font-mono text-2xs text-dim">
                {inverted ? (
                  <span className="text-neg">
                    VIX {fmtNum(data.vix, 1)} &gt; VIX3M {fmtNum(data.vix3m, 1)} — INVERTED, acute fear.
                  </span>
                ) : (
                  <>
                    VIX {fmtNum(data.vix, 1)} below VIX3M {fmtNum(data.vix3m, 1)} — calm regime.
                  </>
                )}
              </p>
            </div>

            {/* Stats deck */}
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Spot VIX" value={fmtNum(data.vix, 1)} tone="accent" />
              <Stat label="VIX3M" value={fmtNum(data.vix3m, 1)} />
              <Stat
                label="Term ratio"
                value={
                  <span>
                    {fmtNum(data.termRatio, 2)}
                    {data.termRatio > 1.05 ? (
                      <span className="ml-1.5 text-2xs text-neg">inverted</span>
                    ) : data.termRatio < 0.95 ? (
                      <span className="ml-1.5 text-2xs text-pos">contango</span>
                    ) : null}
                  </span>
                }
                tone={data.termRatio > 1.05 ? "neg" : data.termRatio < 0.95 ? "pos" : "warn"}
              />
              <Stat label="VIX percentile" value={ordinal(data.vixPercentile)} />
              <Stat
                label="Variance-risk premium"
                value={
                  vrp === null ? (
                    <span className="text-faint">—</span>
                  ) : (
                    <span>{fmtSignedPct(vrp, 1).replace("%", "pp")}</span>
                  )
                }
                tone={vrp === null ? undefined : vrp >= 0 ? "pos" : "neg"}
                className="col-span-2"
              />
            </div>
            {vrp === null ? (
              <p className="text-2xs text-dim">Realized vol was unavailable, so the variance-risk premium could not be computed.</p>
            ) : (
              <p className="text-2xs text-dim">
                Implied {fmtNum(data.vix, 1)} {vrp >= 0 ? "above" : "below"} realized{" "}
                <span className="text-muted">{fmtNum(data.vix - vrp, 1)}</span> — {vrp >= 0 ? "options carry a normal risk premium" : "realized vol is outrunning what options price"}.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="border-t border-line px-4 py-2.5 font-mono text-2xs text-faint">
        The VIX term structure (spot vs 3-month) is a stress gauge: contango (spot below 3-month) is the calm regime;
        backwardation/inversion signals acute fear. The variance-risk premium (implied − realized vol) is normally
        positive; a negative reading means realized vol is outrunning what options price. Source: FRED (VIXCLS, VXVCLS) +
        Stooq.
      </div>
    </Panel>
  );
}
