"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Panel, PanelHeader, Stat, Chip, Th, Td } from "@/components/ui/kit";
import { fmtNum, fmtSignedPct, signClass } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Rng } from "@/lib/rng";
import {
  buildStyleRotation,
  type FactorSeries,
  type FactorStyle,
  type FactorRead,
  type StyleRotationReport,
} from "@/lib/engine/style-rotation";

/* ── Types matching /api/engine/style-rotation ─────────────────────────────── */

/** Live payload = the engine report plus run metadata. */
type StyleLive = StyleRotationReport & { source: string; asOf: string };

type StyleResponse = ({ live: true } & StyleLive) | { live: false };

/** What the panel renders — the report plus the meta we display. */
type StyleView = StyleLive;

type Status = "loading" | "live" | "demo";

/* ── Style chip presentation (static class maps — no dynamic `text-${}`) ─────── */

type ChipTone = "default" | "accent" | "pos" | "neg" | "warn" | "ai" | "info";

const STYLE_META: Record<FactorStyle, { short: string; tone: ChipTone }> = {
  value: { short: "Value", tone: "warn" },
  growth: { short: "Growth", tone: "accent" },
  momentum: { short: "Momentum", tone: "ai" },
  quality: { short: "Quality", tone: "info" },
  lowvol: { short: "Low Vol", tone: "pos" },
  smallcap: { short: "Small Cap", tone: "default" },
  size: { short: "Size", tone: "default" },
  other: { short: "Other", tone: "default" },
};

/** Regime headline tone — Value → warn, Growth → accent, else dim. */
function regimeColor(regime: string): string {
  if (regime === "Value leadership") return "text-warn";
  if (regime === "Growth leadership") return "text-accent";
  return "text-dim";
}

/** Risk-tilt chip tone — defensives reassure (pos), cyclicals flag risk-on (warn). */
function riskTiltTone(tilt: StyleRotationReport["riskTilt"]): ChipTone {
  if (tilt === "Defensive") return "info";
  if (tilt === "Cyclical") return "warn";
  return "default";
}

/* ── Demo: seeded factor ETFs + an SPY benchmark, run through the real engine ──
   Each proxy is a geometric walk with a distinct daily drift so one factor
   (Momentum here) clearly leads with believable 1/3/6/12-month spreads. Same
   `buildStyleRotation` math as the live route. */

type DemoFactorSpec = { id: string; label: string; style: FactorStyle; drift: number; vol: number };

const DEMO_FACTORS: DemoFactorSpec[] = [
  { id: "MTUM", label: "Momentum", style: "momentum", drift: 0.00075, vol: 0.011 },
  { id: "VLUE", label: "Value", style: "value", drift: 0.00058, vol: 0.0105 },
  { id: "QUAL", label: "Quality", style: "quality", drift: 0.0005, vol: 0.0092 },
  { id: "SIZE", label: "Size", style: "size", drift: 0.00046, vol: 0.0118 },
  { id: "IWM", label: "Small Cap", style: "smallcap", drift: 0.00042, vol: 0.013 },
  { id: "USMV", label: "Min Volatility", style: "lowvol", drift: 0.00038, vol: 0.0078 },
  { id: "IWF", label: "Growth", style: "growth", drift: 0.0003, vol: 0.0125 },
];

const DEMO_BENCH = "SPY";
const DEMO_N = 260;

/** Geometric walk of `n` closes from a seed, drift and vol. */
function walk(seed: string, n: number, drift: number, vol: number): number[] {
  const r = new Rng(seed);
  const out: number[] = [100];
  for (let i = 1; i < n; i++) {
    const shock = r.gauss(drift, vol);
    out.push(Math.max(0.01, out[i - 1] * (1 + shock)));
  }
  return out;
}

function buildDemo(): StyleView {
  const factors: FactorSeries[] = DEMO_FACTORS.map((f) => ({
    id: f.id,
    label: f.label,
    style: f.style,
    closes: walk(`style-${f.id}`, DEMO_N, f.drift, f.vol),
  }));
  const benchCloses = walk("style-SPY", DEMO_N, 0.0004, 0.0095);
  const report = buildStyleRotation(factors, DEMO_BENCH, benchCloses);
  return { ...report, source: "demo·seeded-walk", asOf: new Date().toISOString() };
}

/* ── Relative-strength bar (one factor's 3m excess; +right/green, −left/red) ── */

function RelStrengthBar({ rel, scale, label }: { rel: number; scale: number; label: string }) {
  const pct = scale > 0 ? Math.min(100, (Math.abs(rel) / scale) * 100) : 0;
  const positive = rel >= 0;
  return (
    <div
      className="relative h-3 w-full overflow-hidden rounded-sm bg-elevated/30"
      role="img"
      aria-label={`${label} 3-month relative return ${fmtSignedPct(rel, 2)} versus benchmark`}
    >
      {/* center zero baseline */}
      <div className="absolute inset-y-0 left-1/2 w-px bg-line-strong/60" />
      <div
        className={cn("absolute inset-y-0", positive ? "bg-pos/70" : "bg-neg/70")}
        style={{
          width: `${pct / 2}%`,
          left: positive ? "50%" : undefined,
          right: positive ? undefined : "50%",
        }}
      />
    </div>
  );
}

/* ── Inline mini bar for a relative-return cell in the leaderboard table ─────── */

function CellBar({ rel, scale }: { rel: number; scale: number }) {
  const pct = scale > 0 ? Math.min(100, (Math.abs(rel) / scale) * 100) : 0;
  return (
    <div className="ml-auto mt-1 h-0.5 w-full max-w-[44px] overflow-hidden rounded-full bg-elevated/40">
      <div
        className={cn("h-full rounded-full", rel >= 0 ? "bg-pos/70" : "bg-neg/70")}
        style={{ width: `${Math.max(4, pct)}%` }}
      />
    </div>
  );
}

/* ── Panel ──────────────────────────────────────────────────────────────────── */

export function StyleRotation() {
  const [status, setStatus] = useState<Status>("loading");
  const [view, setView] = useState<StyleView | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const r = await fetch("/api/engine/style-rotation", { cache: "no-store" });
      const j = (await r.json()) as StyleResponse;
      if (j.live) {
        setView({
          benchmark: j.benchmark,
          factors: j.factors,
          leader: j.leader,
          laggard: j.laggard,
          valueGrowthSpread: j.valueGrowthSpread,
          sizeSpread: j.sizeSpread,
          regime: j.regime,
          riskTilt: j.riskTilt,
          source: j.source,
          asOf: j.asOf,
        });
        setStatus("live");
      } else {
        setView(buildDemo());
        setStatus("demo");
      }
    } catch {
      setView(buildDemo());
      setStatus("demo");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const asOf = useMemo(() => {
    if (status !== "live" || !view?.asOf) return "";
    return new Date(view.asOf).toLocaleTimeString("en-US", { hour12: false });
  }, [status, view]);

  // Largest absolute 3m excess return across factors → shared bar scale.
  const relScale = useMemo(() => {
    if (!view) return 1;
    return Math.max(1, ...view.factors.map((f) => Math.abs(f.rel3m)));
  }, [view]);

  // The leader read (rank 1) — for the hero's 3m excess number.
  const leaderRead: FactorRead | null = useMemo(() => {
    if (!view) return null;
    return view.factors.find((f) => f.label === view.leader) ?? null;
  }, [view]);

  const rotationWord = view
    ? view.regime === "Value leadership"
      ? "value"
      : view.regime === "Growth leadership"
        ? "growth"
        : "balanced"
    : "";
  const tiltWord = view
    ? view.riskTilt === "Defensive"
      ? "defensive"
      : view.riskTilt === "Cyclical"
        ? "cyclical"
        : "neutral"
    : "";

  return (
    <Panel className="animate-rise">
      <PanelHeader
        title="Style Rotation Engine"
        sub="Which equity factor is leading — trailing excess returns, value-vs-growth & size spreads, risk tilt — from Stooq factor ETFs"
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
                ENGINE · LIVE · {view?.source}
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
              aria-label="Refresh style rotation"
            >
              ↻
            </button>
          </div>
        }
      />

      {!view ? (
        <div className="grid h-64 place-items-center font-mono text-2xs uppercase tracking-wider text-dim">computing…</div>
      ) : (
        <>
          {/* ── Hero: regime + leader + risk tilt + spreads ── */}
          <div className="grid grid-cols-1 gap-px border-b border-line bg-line lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
            <div className="space-y-3 bg-base p-4">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className={cn("font-mono text-3xl font-semibold leading-none tracking-tight", regimeColor(view.regime))}>
                  {view.regime}
                </span>
                <Chip tone={riskTiltTone(view.riskTilt)}>{view.riskTilt} tilt</Chip>
              </div>

              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="kpi-label">Leader</span>
                <span className="font-mono text-2xl font-semibold leading-none text-ink">
                  {view.leader ?? "—"}
                </span>
                {leaderRead ? (
                  <span className={cn("font-mono text-lg", signClass(leaderRead.rel3m))}>
                    {fmtSignedPct(leaderRead.rel3m, 2)}
                  </span>
                ) : null}
                <span className="text-xs text-dim">3m excess over {view.benchmark}</span>
              </div>

              <p className="text-sm text-muted">
                {view.leader ? (
                  <>
                    <span className="font-medium text-ink">{view.leader}</span> is leading the market — {rotationWord}{" "}
                    rotation, {tiltWord} tilt.
                    {view.laggard ? (
                      <>
                        {" "}
                        <span className="text-dim">{view.laggard}</span> lags.
                      </>
                    ) : null}
                  </>
                ) : (
                  "No factor leadership signal — insufficient series."
                )}
              </p>

              {/* Headline rotation spreads */}
              <div className="grid grid-cols-2 gap-4 pt-1">
                <Stat
                  label="Value − Growth (3m)"
                  value={view.valueGrowthSpread === null ? "—" : fmtSignedPct(view.valueGrowthSpread, 2)}
                  tone={
                    view.valueGrowthSpread === null ? "muted" : view.valueGrowthSpread >= 0 ? "warn" : "accent"
                  }
                />
                <Stat
                  label="Small − Large (3m)"
                  value={view.sizeSpread === null ? "—" : fmtSignedPct(view.sizeSpread, 2)}
                  tone={view.sizeSpread === null ? "muted" : view.sizeSpread >= 0 ? "pos" : "neg"}
                />
              </div>
            </div>

            {/* Relative-strength ranked bars (3m excess) */}
            <div className="space-y-2.5 bg-base p-4">
              <div className="section-label text-[11px] text-muted">Relative Strength · 3m excess vs {view.benchmark}</div>
              <div className="space-y-2">
                {view.factors.map((f) => (
                  <div key={f.id} className="flex items-center gap-2">
                    <span className="w-16 shrink-0 truncate font-mono text-2xs text-dim">{f.label}</span>
                    <RelStrengthBar rel={f.rel3m} scale={relScale} label={f.label} />
                    <span className={cn("w-14 shrink-0 text-right font-mono text-2xs tabular-nums", signClass(f.rel3m))}>
                      {fmtSignedPct(f.rel3m, 1)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Factor leaderboard ── */}
          <div className="px-4 py-3">
            <div className="section-label mb-3 text-[11px] text-muted">Factor Leadership · excess over {view.benchmark}</div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse">
                <thead>
                  <tr>
                    <Th>Rank</Th>
                    <Th>Factor</Th>
                    <Th right>1M</Th>
                    <Th right>3M</Th>
                    <Th right>6M</Th>
                    <Th right>12M</Th>
                    <Th right>Score</Th>
                  </tr>
                </thead>
                <tbody>
                  {view.factors.map((f) => {
                    const isLeader = f.rank === 1;
                    const sm = STYLE_META[f.style];
                    return (
                      <tr
                        key={f.id}
                        className={cn("transition-colors hover:bg-elevated/40", isLeader && "bg-accent/5")}
                      >
                        <Td className={cn(isLeader ? "text-accent" : "text-dim")}>{f.rank}</Td>
                        <Td mono={false}>
                          <div className="flex items-center gap-2">
                            <span className={cn("font-medium", isLeader ? "text-ink" : "text-muted")}>{f.label}</span>
                            <Chip tone={sm.tone}>{sm.short}</Chip>
                          </div>
                        </Td>
                        <Td right className={signClass(f.rel1m)}>{fmtSignedPct(f.rel1m, 1)}</Td>
                        <Td right>
                          <span className={signClass(f.rel3m)}>{fmtSignedPct(f.rel3m, 1)}</span>
                          <CellBar rel={f.rel3m} scale={relScale} />
                        </Td>
                        <Td right className={signClass(f.rel6m)}>{fmtSignedPct(f.rel6m, 1)}</Td>
                        <Td right className={signClass(f.rel12m)}>{fmtSignedPct(f.rel12m, 1)}</Td>
                        <Td right className={cn("font-semibold", signClass(f.score))}>{fmtNum(f.score, 2)}</Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="border-t border-line px-4 py-2.5 font-mono text-2xs text-faint">
            Factor leadership ranks each style proxy by its excess return over {view.benchmark}, weighted toward the
            3–6-month horizon. Value-vs-growth and small-vs-large spreads capture the dominant rotation; the risk tilt
            flags whether defensives (low-vol/quality) or cyclicals (value/size/momentum) lead. Source: Stooq factor
            ETFs.
          </div>
        </>
      )}
    </Panel>
  );
}
