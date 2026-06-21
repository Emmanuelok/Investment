"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Panel, PanelHeader, Stat, Chip, Th, Td } from "@/components/ui/kit";
import { ProgressBar } from "@/components/ui/viz";
import { fmtNum, fmtSignedPct, signClass } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Rng } from "@/lib/rng";
import {
  buildSectorScorecard,
  type SectorSeries,
  type SectorScorecard,
  type SectorRead,
  type SectorGroup,
  type SectorTilt,
  type SectorRisk,
} from "@/lib/engine/sector-scorecard";

/* ── Types matching /api/engine/sector-scorecard ───────────────────────────── */

/** Live payload = the engine scorecard plus run metadata. */
type SectorLive = SectorScorecard & { source: string; asOf: string };

type SectorResponse = ({ live: true } & SectorLive) | { live: false };

/** What the panel renders — the scorecard plus the meta we display. */
type SectorView = SectorLive;

type Status = "loading" | "live" | "demo";

/* ── Presentation maps (static class maps — no dynamic `text-${}`) ──────────── */

type ChipTone = "default" | "accent" | "pos" | "neg" | "warn" | "ai" | "info";

/** Group chip tone — Cyclical → warn, Sensitive → accent, Defensive → info. */
const GROUP_META: Record<SectorGroup, { label: string; tone: ChipTone }> = {
  Cyclical: { label: "Cyclical", tone: "warn" },
  Sensitive: { label: "Sensitive", tone: "accent" },
  Defensive: { label: "Defensive", tone: "info" },
};

/** Tilt chip tone — Overweight → pos, Neutral → default, Underweight → neg. */
const TILT_META: Record<SectorTilt, ChipTone> = {
  Overweight: "pos",
  Neutral: "default",
  Underweight: "neg",
};

/** Risk-appetite headline color — Risk-on → pos, Risk-off → neg, Neutral → dim. */
function riskColor(risk: SectorRisk): string {
  if (risk === "Risk-on") return "text-pos";
  if (risk === "Risk-off") return "text-neg";
  return "text-dim";
}

/** Risk-appetite chip tone — Risk-on → pos, Risk-off → neg, Neutral → default. */
function riskTone(risk: SectorRisk): ChipTone {
  if (risk === "Risk-on") return "pos";
  if (risk === "Risk-off") return "neg";
  return "default";
}

/* ── Demo: seeded sector ETFs + an SPY benchmark, run through the real engine ──
   Each sector is a geometric walk with its own drift/vol so the read is
   believable: cyclicals & sensitives (Financials, Industrials, Tech, Energy)
   clearly lead defensives (Utilities, Staples, Health Care), pushing the
   offense-vs-defense spread positive — a risk-on tape. Seeds are pinned so the
   same `buildSectorScorecard` math as the live route yields this story
   deterministically. ~220 closes spans the 6-month/200-DMA windows. */

type DemoSectorSpec = { id: string; label: string; group: SectorGroup; seed: string; drift: number; vol: number };

const DEMO_SECTORS: DemoSectorSpec[] = [
  // Sensitive
  { id: "XLK", label: "Technology", group: "Sensitive", seed: "sector-XLK-31", drift: 0.00082, vol: 0.0125 },
  { id: "XLE", label: "Energy", group: "Sensitive", seed: "sector-XLE-22", drift: 0.00064, vol: 0.015 },
  { id: "XLC", label: "Communication Svcs", group: "Sensitive", seed: "sector-XLC-18", drift: 0.0006, vol: 0.012 },
  // Cyclical
  { id: "XLF", label: "Financials", group: "Cyclical", seed: "sector-XLF-27", drift: 0.00076, vol: 0.0118 },
  { id: "XLI", label: "Industrials", group: "Cyclical", seed: "sector-XLI-24", drift: 0.0007, vol: 0.011 },
  { id: "XLY", label: "Consumer Disc", group: "Cyclical", seed: "sector-XLY-19", drift: 0.00058, vol: 0.0128 },
  { id: "XLB", label: "Materials", group: "Cyclical", seed: "sector-XLB-15", drift: 0.00052, vol: 0.0115 },
  // Defensive
  { id: "XLU", label: "Utilities", group: "Defensive", seed: "sector-XLU-12", drift: 0.0003, vol: 0.0088 },
  { id: "XLP", label: "Consumer Staples", group: "Defensive", seed: "sector-XLP-09", drift: 0.00026, vol: 0.0072 },
  { id: "XLV", label: "Health Care", group: "Defensive", seed: "sector-XLV-14", drift: 0.00022, vol: 0.0085 },
];

const DEMO_BENCH = "SPY";
const DEMO_N = 220;

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

function buildDemo(): SectorView {
  const sectors: SectorSeries[] = DEMO_SECTORS.map((s) => ({
    id: s.id,
    label: s.label,
    group: s.group,
    closes: walk(s.seed, DEMO_N, s.drift, s.vol),
  }));
  const benchCloses = walk("sector-SPY", DEMO_N, 0.00046, 0.0094);
  const report = buildSectorScorecard(sectors, DEMO_BENCH, benchCloses);
  return { ...report, source: "demo·seeded-walk", asOf: new Date().toISOString() };
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

/* ── Offense-vs-defense comparison bar (two scores share a 0–100 track) ──────── */

function OffenseDefenseBar({ offense, defense }: { offense: number; defense: number }) {
  const off = Math.max(0, Math.min(100, offense));
  const def = Math.max(0, Math.min(100, defense));
  return (
    <div
      className="relative h-2.5 w-full overflow-hidden rounded-full bg-elevated/40"
      role="img"
      aria-label={`Offense score ${Math.round(off)} versus defense score ${Math.round(def)} out of 100`}
    >
      {/* defense fill (behind), offense fill (front) — offense leads when wider */}
      <div className="absolute inset-y-0 left-0 rounded-full bg-info/45" style={{ width: `${def}%` }} />
      <div className="absolute inset-y-0 left-0 rounded-full bg-pos/70" style={{ width: `${off}%` }} />
    </div>
  );
}

/* ── Panel ──────────────────────────────────────────────────────────────────── */

export function SectorScorecard() {
  const [status, setStatus] = useState<Status>("loading");
  const [view, setView] = useState<SectorView | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const r = await fetch("/api/engine/sector-scorecard", { cache: "no-store" });
      const j = (await r.json()) as SectorResponse;
      if (j.live) {
        setView({
          benchmark: j.benchmark,
          sectors: j.sectors,
          leader: j.leader,
          laggard: j.laggard,
          offenseScore: j.offenseScore,
          defenseScore: j.defenseScore,
          offenseDefenseSpread: j.offenseDefenseSpread,
          riskAppetite: j.riskAppetite,
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

  // Largest absolute 3m excess return across sectors → shared bar scale.
  const relScale = useMemo(() => {
    if (!view) return 1;
    return Math.max(1, ...view.sectors.map((s) => Math.abs(s.rel3m)));
  }, [view]);

  // The leader read (rank 1) — for the hero's score & tilt.
  const leaderRead: SectorRead | null = useMemo(() => {
    if (!view) return null;
    return view.sectors.find((s) => s.rank === 1) ?? null;
  }, [view]);

  const spread = view?.offenseDefenseSpread ?? 0;
  const spreadAbs = Math.abs(spread);
  const offenseLeads = spread >= 0;

  return (
    <Panel className="animate-rise">
      <PanelHeader
        title="Sector Scorecard"
        sub="Cyclical-vs-defensive equity internals — sectors ranked on relative strength & trend, with the offense-vs-defense risk-appetite read — from Stooq sector ETFs"
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
              aria-label="Refresh sector scorecard"
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
          {/* ── Hero: offense/defense read (centerpiece) ── */}
          <div className="grid grid-cols-1 gap-px border-b border-line bg-line lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
            <div className="space-y-3 bg-base p-4">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className={cn("font-mono text-3xl font-semibold leading-none tracking-tight", riskColor(view.riskAppetite))}>
                  {view.riskAppetite}
                </span>
                <Chip tone={riskTone(view.riskAppetite)}>{offenseLeads ? "offense leads" : "defense leads"}</Chip>
              </div>

              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="kpi-label">Leader</span>
                <span className="font-mono text-2xl font-semibold leading-none text-ink">{view.leader ?? "—"}</span>
                {leaderRead ? (
                  <>
                    <span className="font-mono text-lg text-accent">{leaderRead.score}</span>
                    <Chip tone={TILT_META[leaderRead.tilt]}>{leaderRead.tilt}</Chip>
                  </>
                ) : null}
              </div>

              <p className="text-sm text-muted">
                {view.leader ? (
                  offenseLeads ? (
                    <>
                      Cyclicals are leading defensives by{" "}
                      <span className="font-medium text-pos">{fmtNum(spreadAbs, 0)}</span> points — equity internals are
                      risk-on; overweight <span className="font-medium text-ink">{view.leader}</span>.
                      {view.laggard ? (
                        <>
                          {" "}
                          <span className="text-dim">{view.laggard}</span> lags.
                        </>
                      ) : null}
                    </>
                  ) : (
                    <>
                      Defensives are leading cyclicals by{" "}
                      <span className="font-medium text-neg">{fmtNum(spreadAbs, 0)}</span> points — equity internals are
                      risk-off; favor defensives, lead is <span className="font-medium text-ink">{view.leader}</span>.
                      {view.laggard ? (
                        <>
                          {" "}
                          <span className="text-dim">{view.laggard}</span> lags.
                        </>
                      ) : null}
                    </>
                  )
                ) : (
                  "No sector leadership signal — insufficient series."
                )}
              </p>

              {/* Offense / Defense scores + spread */}
              <div className="grid grid-cols-3 gap-4 pt-1">
                <Stat label="Offense" value={fmtNum(view.offenseScore, 0)} tone="pos" />
                <Stat label="Defense" value={fmtNum(view.defenseScore, 0)} tone="accent" />
                <Stat
                  label="Off − Def spread"
                  value={fmtSignedPct(view.offenseDefenseSpread, 0).replace("%", "pts")}
                  tone={offenseLeads ? "pos" : "neg"}
                />
              </div>

              {/* Offense-vs-defense comparison bar */}
              <div className="pt-1">
                <div className="mb-1 flex items-baseline justify-between">
                  <span className="kpi-label">Offense vs Defense · avg score</span>
                  <span className="font-mono text-2xs tabular-nums text-dim">
                    <span className="text-pos">{fmtNum(view.offenseScore, 0)}</span>
                    <span className="text-faint"> · </span>
                    <span className="text-info">{fmtNum(view.defenseScore, 0)}</span>
                  </span>
                </div>
                <OffenseDefenseBar offense={view.offenseScore} defense={view.defenseScore} />
              </div>
            </div>

            {/* Relative-strength ranked bars (3m excess) */}
            <div className="space-y-2.5 bg-base p-4">
              <div className="section-label text-[11px] text-muted">Relative Strength · 3m excess vs {view.benchmark}</div>
              <div className="space-y-2">
                {view.sectors.map((s) => {
                  const pct = relScale > 0 ? Math.min(100, (Math.abs(s.rel3m) / relScale) * 100) : 0;
                  const positive = s.rel3m >= 0;
                  return (
                    <div key={s.id} className="flex items-center gap-2">
                      <span className="w-24 shrink-0 truncate font-mono text-2xs text-dim">{s.label}</span>
                      <div
                        className="relative h-3 w-full overflow-hidden rounded-sm bg-elevated/30"
                        role="img"
                        aria-label={`${s.label} 3-month excess return ${fmtSignedPct(s.rel3m, 2)} versus ${view.benchmark}`}
                      >
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
                      <span className={cn("w-14 shrink-0 text-right font-mono text-2xs tabular-nums", signClass(s.rel3m))}>
                        {fmtSignedPct(s.rel3m, 1)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Sector leaderboard ── */}
          <div className="px-4 py-3">
            <div className="section-label mb-3 text-[11px] text-muted">Sector Leadership · scored on relative strength & trend vs {view.benchmark}</div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] border-collapse">
                <thead>
                  <tr>
                    <Th>Rank</Th>
                    <Th>Sector</Th>
                    <Th right>1M</Th>
                    <Th right>3M</Th>
                    <Th right>6M</Th>
                    <Th right>Rel 3M</Th>
                    <Th right>50-DMA</Th>
                    <Th right>200-DMA</Th>
                    <Th right>Score</Th>
                    <Th right>Tilt</Th>
                  </tr>
                </thead>
                <tbody>
                  {view.sectors.map((s) => {
                    const isLeader = s.rank === 1;
                    const gm = GROUP_META[s.group];
                    return (
                      <tr key={s.id} className={cn("transition-colors hover:bg-elevated/40", isLeader && "bg-accent/5")}>
                        <Td className={cn(isLeader ? "text-accent" : "text-dim")}>{s.rank}</Td>
                        <Td mono={false}>
                          <div className="flex items-center gap-2">
                            <span className={cn("font-medium", isLeader ? "text-ink" : "text-muted")}>{s.label}</span>
                            <Chip tone={gm.tone}>{gm.label}</Chip>
                          </div>
                        </Td>
                        <Td right className={signClass(s.ret1m)}>{fmtSignedPct(s.ret1m, 1)}</Td>
                        <Td right className={signClass(s.ret3m)}>{fmtSignedPct(s.ret3m, 1)}</Td>
                        <Td right className={signClass(s.ret6m)}>{fmtSignedPct(s.ret6m, 1)}</Td>
                        <Td right>
                          <span className={signClass(s.rel3m)}>{fmtSignedPct(s.rel3m, 1)}</span>
                          <CellBar rel={s.rel3m} scale={relScale} />
                        </Td>
                        <Td right className={s.aboveSMA50 ? "text-pos" : "text-neg"}>
                          {s.aboveSMA50 ? "✓" : "✗"}
                        </Td>
                        <Td right className={s.aboveSMA200 ? "text-pos" : "text-neg"}>
                          {s.aboveSMA200 ? "✓" : "✗"}
                        </Td>
                        <Td right>
                          <div className="flex items-center justify-end gap-2">
                            <ProgressBar
                              value={s.score}
                              max={100}
                              color={s.score >= 65 ? "var(--pos)" : s.score <= 35 ? "var(--neg)" : "var(--accent)"}
                              height={4}
                              className="w-14"
                            />
                            <span className={cn("w-7 text-right font-semibold", isLeader ? "text-ink" : "text-muted")}>
                              {s.score}
                            </span>
                          </div>
                        </Td>
                        <Td right mono={false}>
                          <Chip tone={TILT_META[s.tilt]}>{s.tilt}</Chip>
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="border-t border-line px-4 py-2.5 font-mono text-2xs text-faint">
            Sectors scored on relative strength vs {view.benchmark} (1/3/6-month excess returns) plus trend (50/200-DMA).
            The offense-vs-defense spread — cyclical/sensitive sectors versus defensives — is a clean equity-internal
            risk-appetite signal. Source: Stooq sector ETFs.
          </div>
        </>
      )}
    </Panel>
  );
}
