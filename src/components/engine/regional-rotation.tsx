"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Panel, PanelHeader, Stat, Chip, Th, Td } from "@/components/ui/kit";
import { ProgressBar } from "@/components/ui/viz";
import { fmtNum, fmtPct, fmtSignedPct, signClass } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Rng } from "@/lib/rng";
import {
  buildRegionalRotation,
  type RegionSeries,
  type RegionBucket,
  type RegionRead,
  type RegionalReport,
  type RegionalRisk,
  type RegionalTilt,
} from "@/lib/engine/regional-rotation";

/* ── Types matching /api/engine/regional-rotation ──────────────────────────── */

/** Live payload = the engine report plus run metadata. */
type RegionalLive = RegionalReport & { source: string; asOf: string };

type RegionalResponse = ({ live: true } & RegionalLive) | { live: false };

/** What the panel renders — the report plus the meta we display. */
type RegionalView = RegionalLive;

type Status = "loading" | "live" | "demo";

/* ── Presentation maps (static class maps — no dynamic `text-${}`) ──────────── */

type ChipTone = "default" | "accent" | "pos" | "neg" | "warn" | "ai" | "info";

/** Bucket chip tone — US → accent, DM → info, EM → warn. */
const BUCKET_META: Record<RegionBucket, { label: string; tone: ChipTone }> = {
  US: { label: "US", tone: "accent" },
  DM: { label: "DM", tone: "info" },
  EM: { label: "EM", tone: "warn" },
};

/** Tilt headline tone — US → accent, International → warn, Balanced → dim. */
function tiltColor(tilt: RegionalTilt): string {
  if (tilt === "US") return "text-accent";
  if (tilt === "International") return "text-warn";
  return "text-dim";
}

const TILT_HEADLINE: Record<RegionalTilt, string> = {
  US: "US Leadership",
  International: "International Leadership",
  Balanced: "Balanced",
};

/** Risk-appetite chip tone — Risk-on → pos, Risk-off → neg, Neutral → dim. */
function riskTone(risk: RegionalRisk): ChipTone {
  if (risk === "Risk-on") return "pos";
  if (risk === "Risk-off") return "neg";
  return "default";
}

/* ── Demo: seeded regional ETFs + an ACWI benchmark, run through the real engine ──
   Each region is a geometric walk with a distinct daily drift so the rotation is
   believable: the US leads the world, EM edges ahead of DM (risk-on) on the back
   of strong China/India, and breadth is broad. Same `buildRegionalRotation` math
   as the live route. */

type DemoRegionSpec = { id: string; label: string; bucket: RegionBucket; drift: number; vol: number };

const DEMO_REGIONS: DemoRegionSpec[] = [
  { id: "SPY", label: "United States", bucket: "US", drift: 0.00082, vol: 0.0095 },
  { id: "INDA", label: "India", bucket: "EM", drift: 0.00066, vol: 0.0124 },
  { id: "FXI", label: "China", bucket: "EM", drift: 0.0006, vol: 0.0142 },
  { id: "VGK", label: "Europe", bucket: "DM", drift: 0.00052, vol: 0.0105 },
  { id: "EWJ", label: "Japan", bucket: "DM", drift: 0.00046, vol: 0.0112 },
  { id: "EWU", label: "United Kingdom", bucket: "DM", drift: 0.00036, vol: 0.0108 },
  { id: "EEM", label: "Emerging Markets", bucket: "EM", drift: 0.00044, vol: 0.013 },
];

const DEMO_BENCH = "ACWI";
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

function buildDemo(): RegionalView {
  const regions: RegionSeries[] = DEMO_REGIONS.map((g) => ({
    id: g.id,
    label: g.label,
    bucket: g.bucket,
    closes: walk(`region-${g.id}`, DEMO_N, g.drift, g.vol),
  }));
  const benchCloses = walk("region-ACWI", DEMO_N, 0.00048, 0.0092);
  const report = buildRegionalRotation(regions, DEMO_BENCH, benchCloses);
  return { ...report, source: "demo·seeded-walk", asOf: new Date().toISOString() };
}

/* ── Relative-strength bar (one region's 3m excess; +right/green, −left/red) ── */

function RelStrengthBar({ rel, scale, label }: { rel: number; scale: number; label: string }) {
  const pct = scale > 0 ? Math.min(100, (Math.abs(rel) / scale) * 100) : 0;
  const positive = rel >= 0;
  return (
    <div
      className="relative h-3 w-full overflow-hidden rounded-sm bg-elevated/30"
      role="img"
      aria-label={`${label} 3-month excess return ${fmtSignedPct(rel, 2)} versus benchmark`}
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

export function RegionalRotation() {
  const [status, setStatus] = useState<Status>("loading");
  const [view, setView] = useState<RegionalView | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const r = await fetch("/api/engine/regional-rotation", { cache: "no-store" });
      const j = (await r.json()) as RegionalResponse;
      if (j.live) {
        setView({
          benchmark: j.benchmark,
          regions: j.regions,
          leader: j.leader,
          laggard: j.laggard,
          usVsWorld: j.usVsWorld,
          emVsDm: j.emVsDm,
          globalBreadth: j.globalBreadth,
          riskAppetite: j.riskAppetite,
          tilt: j.tilt,
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

  // Largest absolute 3m excess return across regions → shared bar scale.
  const relScale = useMemo(() => {
    if (!view) return 1;
    return Math.max(1, ...view.regions.map((r) => Math.abs(r.rel3m)));
  }, [view]);

  // The leader read (rank 1) — for the hero's 3m excess number.
  const leaderRead: RegionRead | null = useMemo(() => {
    if (!view) return null;
    return view.regions.find((r) => r.rank === 1) ?? null;
  }, [view]);

  const emWord = view ? (view.emVsDm >= 0 ? "leading" : "lagging") : "";
  const riskWord = view
    ? view.riskAppetite === "Risk-on"
      ? "risk-on"
      : view.riskAppetite === "Risk-off"
        ? "risk-off"
        : "neutral"
    : "";

  return (
    <Panel className="animate-rise">
      <PanelHeader
        title="Regional Rotation Engine"
        sub="Where world equity leadership sits — US-vs-world & EM-vs-DM spreads, global breadth, risk appetite — from Stooq regional ETFs"
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
              aria-label="Refresh regional rotation"
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
          {/* ── Hero: tilt + leader + risk appetite + spreads ── */}
          <div className="grid grid-cols-1 gap-px border-b border-line bg-line lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
            <div className="space-y-3 bg-base p-4">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className={cn("font-mono text-3xl font-semibold leading-none tracking-tight", tiltColor(view.tilt))}>
                  {TILT_HEADLINE[view.tilt]}
                </span>
                <Chip tone={riskTone(view.riskAppetite)}>{view.riskAppetite}</Chip>
              </div>

              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="kpi-label">Leader</span>
                <span className="font-mono text-2xl font-semibold leading-none text-ink">{view.leader ?? "—"}</span>
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
                    US is {view.usVsWorld >= 0 ? "leading" : "lagging"} the world by{" "}
                    <span className={cn("font-medium", signClass(view.usVsWorld))}>{fmtPct(Math.abs(view.usVsWorld), 1)}</span>{" "}
                    over 3 months; EM is <span className="text-ink">{emWord}</span> DM — global risk appetite is{" "}
                    <span className="font-medium text-ink">{riskWord}</span>.
                    {view.laggard ? (
                      <>
                        {" "}
                        <span className="text-dim">{view.laggard}</span> lags.
                      </>
                    ) : null}
                  </>
                ) : (
                  "No regional leadership signal — insufficient series."
                )}
              </p>

              {/* Headline allocation spreads */}
              <div className="grid grid-cols-2 gap-4 pt-1">
                <Stat
                  label="US vs World (3m)"
                  value={fmtSignedPct(view.usVsWorld, 2)}
                  tone={view.usVsWorld >= 0 ? "accent" : "warn"}
                />
                <Stat
                  label="EM vs DM (3m)"
                  value={fmtSignedPct(view.emVsDm, 2)}
                  tone={view.emVsDm >= 0 ? "pos" : "neg"}
                />
              </div>

              {/* Global breadth */}
              <div className="pt-1">
                <div className="mb-1 flex items-baseline justify-between">
                  <span className="kpi-label">Global Breadth · above 200-DMA</span>
                  <span className="font-mono text-xs tabular-nums text-muted">{fmtPct(view.globalBreadth, 0)}</span>
                </div>
                <ProgressBar
                  value={view.globalBreadth}
                  max={100}
                  color={view.globalBreadth >= 50 ? "var(--pos)" : view.globalBreadth < 30 ? "var(--neg)" : "var(--warn)"}
                  height={6}
                />
              </div>
            </div>

            {/* Relative-strength ranked bars (3m excess) */}
            <div className="space-y-2.5 bg-base p-4">
              <div className="section-label text-[11px] text-muted">Relative Strength · 3m excess vs {view.benchmark}</div>
              <div className="space-y-2">
                {view.regions.map((r) => (
                  <div key={r.id} className="flex items-center gap-2">
                    <span className="w-20 shrink-0 truncate font-mono text-2xs text-dim">{r.label}</span>
                    <RelStrengthBar rel={r.rel3m} scale={relScale} label={r.label} />
                    <span className={cn("w-14 shrink-0 text-right font-mono text-2xs tabular-nums", signClass(r.rel3m))}>
                      {fmtSignedPct(r.rel3m, 1)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Region leaderboard ── */}
          <div className="px-4 py-3">
            <div className="section-label mb-3 text-[11px] text-muted">Regional Leadership · excess over {view.benchmark}</div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] border-collapse">
                <thead>
                  <tr>
                    <Th>Rank</Th>
                    <Th>Region</Th>
                    <Th right>1M</Th>
                    <Th right>3M</Th>
                    <Th right>6M</Th>
                    <Th right>12M</Th>
                    <Th right>Rel 3M</Th>
                    <Th right>200-DMA</Th>
                  </tr>
                </thead>
                <tbody>
                  {view.regions.map((r) => {
                    const isLeader = r.rank === 1;
                    const bm = BUCKET_META[r.bucket];
                    return (
                      <tr key={r.id} className={cn("transition-colors hover:bg-elevated/40", isLeader && "bg-accent/5")}>
                        <Td className={cn(isLeader ? "text-accent" : "text-dim")}>{r.rank}</Td>
                        <Td mono={false}>
                          <div className="flex items-center gap-2">
                            <span className={cn("font-medium", isLeader ? "text-ink" : "text-muted")}>{r.label}</span>
                            <Chip tone={bm.tone}>{bm.label}</Chip>
                          </div>
                        </Td>
                        <Td right className={signClass(r.ret1m)}>{fmtSignedPct(r.ret1m, 1)}</Td>
                        <Td right className={signClass(r.ret3m)}>{fmtSignedPct(r.ret3m, 1)}</Td>
                        <Td right className={signClass(r.ret6m)}>{fmtSignedPct(r.ret6m, 1)}</Td>
                        <Td right className={signClass(r.ret12m)}>{fmtSignedPct(r.ret12m, 1)}</Td>
                        <Td right>
                          <span className={signClass(r.rel3m)}>{fmtSignedPct(r.rel3m, 1)}</span>
                          <CellBar rel={r.rel3m} scale={relScale} />
                        </Td>
                        <Td right className={r.aboveSMA200 ? "text-pos" : "text-neg"}>
                          {r.aboveSMA200 ? "✓" : "✗"}
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="border-t border-line px-4 py-2.5 font-mono text-2xs text-faint">
            Regions ranked by excess return over {view.benchmark}. US-vs-world leadership and the EM-vs-DM spread are the
            core allocation tells (EM leads when global risk appetite expands); global breadth is the share of regions
            above their 200-day average. Source: Stooq regional ETFs.
          </div>
        </>
      )}
    </Panel>
  );
}
