"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Panel, PanelHeader, Stat, Chip, Th, Td } from "@/components/ui/kit";
import { Ring } from "@/components/ui/viz";
import { fmtNum, fmtPct, fmtBps, fmtSigned, signClass } from "@/lib/format";
import { cn } from "@/lib/cn";
import {
  buildCreditConditions,
  type SpreadInput,
  type CreditConditions as CreditConditionsResult,
  type SpreadGauge,
  type CreditLevel,
  type SpreadTrend,
} from "@/lib/engine/credit-conditions";

/* ── Types matching /api/engine/credit-conditions ──────────────────────────── */

/** The live route spreads `...conditions` plus source/asOf/asOfDate. */
type LiveResponse =
  | ({
      live: true;
      source: string;
      asOf: string;
      asOfDate: string | null;
    } & CreditConditionsResult)
  | { live: false };

/** Local view model shared by live + demo. */
type CreditData = CreditConditionsResult & {
  source?: string;
  asOf?: string;
  asOfDate: string | null;
};

type Status = "loading" | "live" | "demo";

/* ── Demo basket (sandbox returns { live:false }) ───────────────────────────── */

/* Late-cycle credit basket, oldest → newest (60 pts each). Each spread spiked in an
   earlier stress regime (well above today), compressed to a cycle low, base-built
   around today, then gently re-widened into the tip → headline HY ~57th percentile
   and widening, basket momentum mildly positive → "Cautious". Weights mirror the
   live route (HY 2, BBB 1.5, CCC 1.5, IG 1, EM 1). Spreads in PERCENT. */
type DemoSpec = {
  id: string;
  label: string;
  tier: string;
  weight: number;
  series: number[];
};

const DEMO_SPECS: DemoSpec[] = [
  {
    id: "BAMLH0A0HYM2",
    label: "US High Yield OAS",
    tier: "HY",
    weight: 2,
    series: [
      5.4, 5.65, 5.9, 6.1, 6.25, 6.15, 5.95, 5.7, 5.45, 5.25,
      5.05, 4.85, 4.7, 4.58, 4.48, 4.4, 4.55, 4.68, 4.6, 4.5,
      4.38, 4.45, 4.55, 4.48, 4.35, 4.22, 4.1, 3.98, 3.9, 3.95,
      4.05, 3.98, 4.06, 4.14, 4.06, 3.98, 4.06, 4.14, 4.05, 4.0,
      4.08, 4.02, 3.96, 4.04, 4.12, 4.06, 4.0, 4.08, 4.15, 4.08,
      4.02, 4.1, 4.16, 4.1, 4.04, 4.12, 4.18, 4.12, 4.16, 4.2,
    ],
  },
  {
    id: "BAMLC0A4CBBB",
    label: "US BBB OAS",
    tier: "BBB",
    weight: 1.5,
    series: [
      2.1, 2.2, 2.3, 2.38, 2.3, 2.18, 2.05, 1.95, 1.86, 1.8,
      1.74, 1.7, 1.74, 1.78, 1.72, 1.66, 1.74, 1.8, 1.74, 1.66,
      1.58, 1.64, 1.7, 1.62, 1.52, 1.44, 1.38, 1.34, 1.4, 1.46,
      1.4, 1.46, 1.52, 1.44, 1.38, 1.44, 1.5, 1.44, 1.4, 1.45,
      1.5, 1.45, 1.4, 1.47, 1.52, 1.46, 1.42, 1.47, 1.51, 1.46,
      1.42, 1.47, 1.52, 1.46, 1.41, 1.47, 1.51, 1.46, 1.49, 1.5,
    ],
  },
  {
    id: "BAMLH0A3HYC",
    label: "US CCC & Lower OAS",
    tier: "CCC",
    weight: 1.5,
    series: [
      12.5, 13.2, 13.9, 14.3, 13.8, 13.0, 12.2, 11.6, 11.1, 10.7,
      10.3, 10.0, 10.4, 10.8, 10.4, 10.0, 10.5, 10.9, 10.4, 9.9,
      9.4, 9.7, 10.0, 9.6, 9.2, 8.85, 8.55, 8.35, 8.55, 8.8,
      8.55, 8.85, 9.1, 8.7, 8.45, 8.75, 9.05, 8.65, 8.45, 8.7,
      9.0, 8.7, 8.45, 8.8, 9.1, 8.75, 8.5, 8.8, 9.05, 8.75,
      8.55, 8.85, 9.05, 8.7, 8.5, 8.8, 9.0, 8.7, 8.85, 9.0,
    ],
  },
  {
    id: "BAMLC0A0CM",
    label: "US Corporate (IG) OAS",
    tier: "IG",
    weight: 1,
    series: [
      1.55, 1.62, 1.7, 1.76, 1.7, 1.6, 1.5, 1.42, 1.36, 1.32,
      1.28, 1.25, 1.28, 1.32, 1.27, 1.22, 1.27, 1.32, 1.26, 1.18,
      1.1, 1.16, 1.22, 1.14, 1.06, 0.99, 0.94, 0.91, 0.95, 1.0,
      0.95, 1.0, 1.05, 0.97, 0.92, 0.98, 1.04, 0.96, 0.92, 0.98,
      1.03, 0.98, 0.93, 1.0, 1.05, 0.99, 0.94, 1.0, 1.04, 0.98,
      0.93, 0.99, 1.04, 0.97, 0.92, 0.98, 1.03, 0.96, 0.98, 1.0,
    ],
  },
  {
    id: "BAMLEMCBPIOAS",
    label: "EM Corporate OAS",
    tier: "EM",
    weight: 1,
    series: [
      4.5, 4.75, 5.0, 5.15, 5.0, 4.75, 4.5, 4.3, 4.12, 3.98,
      3.85, 3.78, 3.85, 3.92, 3.85, 3.78, 3.88, 3.96, 3.86, 3.74,
      3.62, 3.7, 3.78, 3.66, 3.52, 3.38, 3.26, 3.16, 3.1, 2.96,
      2.88, 2.96, 3.04, 2.92, 2.84, 2.92, 3.0, 2.9, 2.85, 2.9,
      2.98, 2.9, 2.82, 2.92, 3.0, 2.92, 2.84, 2.92, 2.99, 2.91,
      2.83, 2.93, 3.0, 2.9, 2.82, 2.92, 2.98, 2.9, 2.96, 3.0,
    ],
  },
];

const DEMO_ASOF = "2026-05-29";

function buildDemo(): CreditData {
  const inputs: SpreadInput[] = DEMO_SPECS.map((s) => ({
    id: s.id,
    label: s.label,
    tier: s.tier,
    series: s.series,
    weight: s.weight,
  }));
  const conditions = buildCreditConditions(inputs);
  return { ...conditions, asOfDate: DEMO_ASOF };
}

/* ── Level → stress presentation (static maps; no dynamic Tailwind) ─────────── */

const LEVEL_META: Record<CreditLevel, { color: string; desc: string }> = {
  Calm: { color: "text-pos", desc: "spreads tight — abundant credit, strong risk appetite" },
  Normal: { color: "text-pos", desc: "spreads contained — credit flowing on normal terms" },
  Cautious: { color: "text-warn", desc: "spreads elevated — risk appetite cooling, watch the tape" },
  Stressed: { color: "text-neg", desc: "spreads wide & widening — credit tightening, default risk rising" },
  Crisis: { color: "text-neg", desc: "spreads blown out — credit frozen, acute default & refinancing risk" },
};

/** Stress score is "bad-up": higher = more stress, so the ring inverts vs a good gauge. */
const LEVEL_RING: Record<CreditLevel, string> = {
  Calm: "var(--pos)",
  Normal: "var(--pos)",
  Cautious: "var(--warn)",
  Stressed: "var(--neg)",
  Crisis: "var(--neg)",
};

/** Crisis gets a bolder, subtly-tinted headline treatment. */
const LEVEL_HERO: Record<CreditLevel, string> = {
  Calm: "",
  Normal: "",
  Cautious: "",
  Stressed: "",
  Crisis: "rounded bg-neg/10 px-2 -mx-2",
};

/** Tier → severity order (HY/CCC lead). Unknown tiers fall to the back. */
const TIER_SEVERITY: Record<string, number> = { CCC: 0, HY: 1, EM: 2, BBB: 3, IG: 4 };
function tierRank(tier: string | undefined): number {
  if (!tier) return 99;
  return TIER_SEVERITY[tier] ?? 50;
}

const TIER_TONE: Record<string, "neg" | "warn" | "info" | "accent" | "default"> = {
  CCC: "neg",
  HY: "warn",
  EM: "info",
  BBB: "accent",
  IG: "default",
};
function tierTone(tier: string | undefined): "neg" | "warn" | "info" | "accent" | "default" {
  if (!tier) return "default";
  return TIER_TONE[tier] ?? "default";
}

/* ── Trend → arrow + tone (widening = neg, tightening = pos, stable = dim) ───── */

const TREND_TONE: Record<SpreadTrend, "neg" | "pos" | "default"> = {
  Widening: "neg",
  Tightening: "pos",
  Stable: "default",
};
const TREND_ARROW: Record<SpreadTrend, string> = {
  Widening: "↑",
  Tightening: "↓",
  Stable: "→",
};

/* ── Percentile bar (0..100; high percentile = wide = stress → neg tone) ────── */

function pctlColor(p: number): string {
  if (p >= 80) return "var(--neg)";
  if (p >= 60) return "var(--warn)";
  if (p >= 40) return "var(--accent)";
  return "var(--pos)";
}

/* ── Status badge (identical idiom to yield-curve.tsx / macro-nowcast.tsx) ──── */

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

export function CreditConditions() {
  const [status, setStatus] = useState<Status>("loading");
  const [data, setData] = useState<CreditData | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const r = await fetch("/api/engine/credit-conditions", { cache: "no-store" });
      const j = (await r.json()) as LiveResponse;
      if (j.live) {
        setData({
          source: j.source,
          asOf: j.asOf,
          asOfDate: j.asOfDate,
          gauges: j.gauges,
          stressScore: j.stressScore,
          level: j.level,
          momentum: j.momentum,
          n: j.n,
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

  /* Headline HY gauge powers the one-line read + interpretation. */
  const headline = useMemo<SpreadGauge | null>(() => {
    if (!data) return null;
    return data.gauges.find((g) => g.tier === "HY") ?? data.gauges[0] ?? null;
  }, [data]);

  /* Rows sorted by tier severity (HY/CCC first), then percentile desc. */
  const rows = useMemo<SpreadGauge[]>(() => {
    if (!data) return [];
    return [...data.gauges].sort((a, b) => {
      const ra = tierRank(a.tier);
      const rb = tierRank(b.tier);
      if (ra !== rb) return ra - rb;
      return b.percentile - a.percentile;
    });
  }, [data]);

  const meta = data ? LEVEL_META[data.level] : null;
  const score = data ? Math.round(data.stressScore) : 0;
  const wideningMomentum = data ? data.momentum > 0 : false;
  const momentumTone = data ? (data.momentum > 0 ? "neg" : data.momentum < 0 ? "pos" : "muted") : "muted";
  const headlinePct = headline ? Math.round(headline.percentile) : 0;

  /* Plain-language read for the hero. */
  const read = useMemo(() => {
    if (!headline) return null;
    const widening = headline.trend === "Widening";
    const tightening = headline.trend === "Tightening";
    const dir = widening ? "widening" : tightening ? "tightening" : "holding steady";
    const appetite =
      headlinePct >= 70 ? "deteriorating" : headlinePct >= 45 ? "mixed" : "benign";
    return { dir, appetite };
  }, [headline, headlinePct]);

  return (
    <Panel className="animate-rise">
      <PanelHeader
        title="Credit Conditions Engine"
        sub="ICE BofA OAS basket → percentile-ranked spread stress & default-risk regime — computed from FRED"
        right={
          <div className="flex items-center gap-2">
            <StatusBadge status={status} source={data?.source} asOf={asOf} />
            <button
              onClick={load}
              disabled={status === "loading"}
              className="grid h-7 w-7 place-items-center rounded border border-line font-mono text-sm text-dim hover:border-line-strong hover:text-ink disabled:opacity-40"
              aria-label="Refresh credit conditions"
            >
              ↻
            </button>
          </div>
        }
      />

      {!data || !meta || !headline || !read ? (
        <div className="grid h-64 place-items-center font-mono text-2xs uppercase tracking-wider text-dim">computing…</div>
      ) : (
        <>
          {/* ── Hero: stress regime headline + score ring ── */}
          <div className="grid grid-cols-1 gap-px bg-line lg:grid-cols-[minmax(0,1fr)_minmax(0,300px)]">
            <div className="space-y-4 bg-base p-4">
              {/* Regime headline */}
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span
                  className={cn(
                    "font-mono text-3xl font-semibold leading-none tracking-tight",
                    meta.color,
                    LEVEL_HERO[data.level],
                  )}
                >
                  {data.level}
                </span>
                <span className="text-sm text-dim">{meta.desc}</span>
              </div>

              {/* One-line read */}
              <div className="rounded border border-line bg-elevated/20 px-3 py-3">
                <div className="mb-2 section-label text-[11px] text-muted">CREDIT RISK APPETITE</div>
                <p className="text-sm leading-relaxed text-muted">
                  Credit spreads sit in the{" "}
                  <span className={cn("font-mono font-medium", signClass(headlinePct >= 50 ? -1 : 1))}>
                    {headlinePct}
                    <sup>th</sup>
                  </span>{" "}
                  percentile and are{" "}
                  <span className={cn("font-medium", headline.trend === "Widening" ? "text-neg" : headline.trend === "Tightening" ? "text-pos" : "text-dim")}>
                    {read.dir}
                  </span>{" "}
                  — investment-grade and high-yield risk appetite is{" "}
                  <span className={cn("font-medium", read.appetite === "deteriorating" ? "text-neg" : read.appetite === "mixed" ? "text-warn" : "text-pos")}>
                    {read.appetite}
                  </span>
                  .
                </p>
                <p className="mt-2 font-mono text-2xs text-dim">
                  basket momentum{" "}
                  <span className={cn(momentumTone === "neg" ? "text-neg" : momentumTone === "pos" ? "text-pos" : "text-muted")}>
                    {fmtBps(data.momentum)}
                  </span>{" "}
                  {wideningMomentum ? "widening" : data.momentum < 0 ? "tightening" : "flat"} · {data.n} spreads
                  {data.asOfDate ? <span className="text-faint"> · as of {data.asOfDate}</span> : null}
                </p>
              </div>
            </div>

            {/* Stress score ring (higher = more stress → color inverts) */}
            <div className="flex items-center gap-4 bg-base p-4">
              <Ring
                value={score}
                max={100}
                size={92}
                stroke={9}
                color={LEVEL_RING[data.level]}
                label={`${score}`}
                sub="STRESS"
              />
              <div className="min-w-0 flex-1">
                <div className="kpi-label">Stress Score</div>
                <div className={cn("mt-1 font-mono text-xl font-semibold tabular-nums", meta.color)}>
                  {score}
                  <span className="ml-1 text-sm text-dim">/100</span>
                </div>
                <p className="mt-1.5 text-2xs text-dim">
                  0 = calm · 100 = crisis · headline HY{" "}
                  <span className={signClass(headlinePct >= 50 ? -1 : 1)}>{headlinePct}ᵗʰ pctl</span>
                </p>
                <p className="mt-1 font-mono text-2xs text-faint">weighted percentile + momentum tilt</p>
              </div>
            </div>
          </div>

          {/* ── Spread gauges table ── */}
          <div className="overflow-x-auto border-t border-line">
            <table className="w-full min-w-[680px] border-collapse">
              <thead>
                <tr>
                  <Th>Spread</Th>
                  <Th right>Level</Th>
                  <Th right>Percentile</Th>
                  <Th right>Z-score</Th>
                  <Th right>Δ recent</Th>
                  <Th right>Trend</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((g) => {
                  const pct = Math.max(0, Math.min(100, g.percentile));
                  return (
                    <tr key={g.id} className="hover:bg-elevated/40">
                      <Td mono={false} className="font-medium text-ink">
                        <span className="inline-flex items-center gap-2">
                          {g.tier ? <Chip tone={tierTone(g.tier)}>{g.tier}</Chip> : null}
                          <span>{g.label}</span>
                        </span>
                      </Td>
                      <Td right className="text-ink">
                        {Math.round(g.latest * 100)}
                        <span className="text-faint">bps</span>
                        <span className="ml-1.5 text-2xs text-dim">{fmtPct(g.latest, 2)}</span>
                      </Td>
                      <Td right>
                        <div className="flex items-center justify-end gap-2">
                          <span className="h-1 w-12 overflow-hidden rounded-full bg-line" aria-hidden>
                            <span
                              className="block h-full rounded-full"
                              style={{ width: `${pct}%`, background: pctlColor(g.percentile) }}
                            />
                          </span>
                          <span className="w-10 text-right" style={{ color: pctlColor(g.percentile) }}>
                            {fmtNum(g.percentile, 0)}
                          </span>
                        </div>
                      </Td>
                      <Td right className={signClass(g.z)}>
                        {fmtSigned(g.z, 2)}σ
                      </Td>
                      <Td right className={g.changeBps > 0 ? "text-neg" : g.changeBps < 0 ? "text-pos" : "text-muted"}>
                        {fmtBps(g.changeBps)}
                      </Td>
                      <Td right>
                        <span className="inline-flex items-center justify-end gap-1.5">
                          <Chip tone={TREND_TONE[g.trend]}>{g.trend}</Chip>
                          <span className={g.trend === "Widening" ? "text-neg" : g.trend === "Tightening" ? "text-pos" : "text-faint"}>
                            {TREND_ARROW[g.trend]}
                          </span>
                        </span>
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
              The basket reads <span className={cn("font-medium", meta.color)}>{data.level}</span>: headline US high-yield OAS at{" "}
              <span className="font-mono text-ink">{Math.round(headline.latest * 100)}bps</span> ({fmtPct(headline.latest, 2)}) sits in
              its <span className={cn("font-mono", signClass(headlinePct >= 50 ? -1 : 1))}>{headlinePct}ᵗʰ</span> percentile and is{" "}
              <span className={cn("font-medium", headline.trend === "Widening" ? "text-neg" : headline.trend === "Tightening" ? "text-pos" : "text-dim")}>
                {read.dir}
              </span>
              , with the weighted blend{" "}
              <span className={cn("font-mono", momentumTone === "neg" ? "text-neg" : momentumTone === "pos" ? "text-pos" : "text-muted")}>
                {fmtBps(data.momentum)}
              </span>{" "}
              over the recent window.
            </p>
            <p className="text-dim">
              {headlinePct >= 70 || wideningMomentum
                ? "Wider, widening HY and CCC spreads tighten refinancing conditions for leveraged borrowers and lift forward default expectations — the classic late-cycle credit-risk channel into a slowdown."
                : "Contained spreads keep refinancing windows open and default expectations subdued; risk appetite is intact, but watch the lowest-rated tiers (CCC) for the first signs of stress."}
            </p>
          </div>
        </>
      )}

      <div className="border-t border-line px-4 py-2.5 font-mono text-2xs text-faint">
        Each ICE BofA option-adjusted spread is ranked within its own history (percentile + z-score) and checked for recent
        widening; the blend — tilted by momentum — sets the stress regime. Wide, widening spreads signal tightening credit and
        rising default risk. Source: FRED (ICE BofA OAS).
      </div>
    </Panel>
  );
}
