"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Panel, PanelHeader, Stat, Chip, Th, Td } from "@/components/ui/kit";
import { Ring } from "@/components/ui/viz";
import { fmtNum, fmtPct, fmtSignedPct } from "@/lib/format";
import { cn } from "@/lib/cn";
import {
  buildRiskPosture,
  type PostureSignal,
  type RiskPostureReport,
  type Posture,
} from "@/lib/engine/risk-posture";

/* ── Types matching /api/engine/risk-posture ───────────────────────────────── */

/** The live route spreads `...report` plus source/asOf. */
type LiveResponse =
  | ({
      live: true;
      source: string;
      asOf: string;
    } & RiskPostureReport)
  | { live: false };

/** Local view model shared by live + demo. */
type RiskPostureData = RiskPostureReport & {
  source?: string;
  asOf?: string;
};

type Status = "loading" | "live" | "demo";

/* ── Demo input (sandbox returns { live:false }) ────────────────────────────── */

/* A realistic mixed-but-constructive cross-asset read: the 10y−3m curve has just
   re-steepened off inversion (+0.3pp), high-yield credit is tight (~3.9%), the VIX
   is calm (~14.5), SPY is in a measured uptrend (+6% over 3m), sector breadth is
   broad (8/11 above their 200-DMA) and recession odds are low. The engine blends
   these to a "Risk-on" composite in the low-70s with strong agreement. */
const DEMO_SIGNALS: PostureSignal[] = [
  {
    id: "curve",
    label: "Yield curve (10y−3m)",
    category: "Rates",
    reading: 0.3,
    score: 56,
    weight: 1,
    note: "positively sloped",
  },
  {
    id: "credit",
    label: "High-yield credit spread",
    category: "Credit",
    reading: 3.9,
    score: 89,
    weight: 1,
    note: "contained",
  },
  {
    id: "vol",
    label: "Implied volatility (VIX)",
    category: "Volatility",
    reading: 14.5,
    score: 92,
    weight: 1,
    note: "calm",
  },
  {
    id: "trend",
    label: "Equity trend (SPY 3m)",
    category: "Trend",
    reading: 6.0,
    score: 70,
    weight: 1,
    note: "uptrend",
  },
  {
    id: "breadth",
    label: "Sector breadth (% > 200-DMA)",
    category: "Breadth",
    reading: 72.7,
    score: 73,
    weight: 1,
    note: "8/11 sectors",
  },
  {
    id: "macro",
    label: "Recession risk (composite)",
    category: "Macro",
    reading: 16,
    score: 76,
    weight: 1,
    note: "Low (16% 12m)",
  },
];

function buildDemo(): RiskPostureData {
  // Run the SAME engine math on the demo signals so the composite is genuine.
  return buildRiskPosture(DEMO_SIGNALS.map((s) => ({ ...s })));
}

/* ── Posture → presentation (static maps; no dynamic Tailwind) ──────────────── */

const POSTURE_META: Record<Posture, { color: string; desc: string; word: string }> = {
  "Risk-on": {
    color: "text-pos",
    desc: "cross-asset signals net constructive — appetite intact",
    word: "risk-on",
  },
  Neutral: {
    color: "text-dim",
    desc: "signals are mixed — no decisive cross-asset lean",
    word: "balanced",
  },
  "Risk-off": {
    color: "text-neg",
    desc: "stress is broadening across assets — defense warranted",
    word: "risk-off",
  },
};

/** The composite is "risk-on-up": high = healthy (pos), mid = caution (warn), low = stress (neg). */
function compositeColor(composite: number): string {
  if (composite >= 58) return "var(--pos)";
  if (composite >= 42) return "var(--warn)";
  return "var(--neg)";
}

/* ── Per-signal score (0..100) → bar color ──────────────────────────────────── */

function scoreColor(score: number): string {
  if (score > 55) return "var(--pos)";
  if (score >= 45) return "var(--warn)";
  return "var(--neg)";
}

function scoreTextClass(score: number): string {
  if (score > 55) return "text-pos";
  if (score >= 45) return "text-warn";
  return "text-neg";
}

/* ── Category presentation: ordering, chip tone, reading formatter ──────────── */

const CATEGORY_ORDER = ["Rates", "Credit", "Volatility", "Trend", "Breadth", "Macro"];

const CATEGORY_TONE: Record<string, "accent" | "info" | "warn" | "ai" | "pos"> = {
  Rates: "accent",
  Credit: "info",
  Volatility: "warn",
  Trend: "pos",
  Breadth: "ai",
  Macro: "info",
};

function categoryRank(category: string): number {
  const i = CATEGORY_ORDER.indexOf(category);
  return i === -1 ? CATEGORY_ORDER.length : i;
}

/** Format a signal's raw reading by its category (units vary per the engine). */
function formatReading(s: PostureSignal): string {
  switch (s.category) {
    case "Rates":
      return `${fmtSignedPct(s.reading, 2).replace("%", "pp")}`;
    case "Credit":
      return fmtPct(s.reading, 2);
    case "Volatility":
      return `${fmtNum(s.reading, 1)} pts`;
    case "Trend":
      return fmtSignedPct(s.reading, 1);
    case "Breadth":
      return fmtPct(s.reading, 0);
    default:
      return s.note;
  }
}

/* ── Status badge (identical idiom to yield-curve.tsx / recession-risk.tsx) ──── */

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

export function RiskPosture() {
  const [status, setStatus] = useState<Status>("loading");
  const [data, setData] = useState<RiskPostureData | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const r = await fetch("/api/engine/risk-posture", { cache: "no-store" });
      const j = (await r.json()) as LiveResponse;
      if (j.live) {
        setData({
          source: j.source,
          asOf: j.asOf,
          composite: j.composite,
          posture: j.posture,
          agreement: j.agreement,
          riskOnCount: j.riskOnCount,
          riskOffCount: j.riskOffCount,
          neutralCount: j.neutralCount,
          signals: j.signals,
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

  /* Signal rows ordered by category, then by score desc within a category. */
  const rows = useMemo<PostureSignal[]>(() => {
    if (!data) return [];
    return [...data.signals].sort((a, b) => {
      const ca = categoryRank(a.category);
      const cb = categoryRank(b.category);
      if (ca !== cb) return ca - cb;
      return b.score - a.score;
    });
  }, [data]);

  /* The two strongest risk-on and most-stressed signals power the one-line read. */
  const drivers = useMemo(() => {
    if (!data) return "";
    const byScore = [...data.signals].sort((a, b) => b.score - a.score);
    const top = byScore[0];
    const bottom = byScore[byScore.length - 1];
    if (!top || !bottom) return "";
    if (top.id === bottom.id) return `${top.label.toLowerCase()} leading`;
    return `led by ${top.label.toLowerCase()}, dragged by ${bottom.label.toLowerCase()}`;
  }, [data]);

  const meta = data ? POSTURE_META[data.posture] : null;
  const total = data ? data.signals.length : 0;
  const aligned = total ? Math.round((data?.agreement ?? 0) * total / 100) : 0;

  return (
    <Panel className="animate-rise">
      <PanelHeader
        title="Market Risk Posture"
        sub="Cross-asset synthesis — curve, credit, vol, trend, breadth & recession odds fused to one risk-on/off read"
        right={
          <div className="flex items-center gap-2">
            <StatusBadge status={status} source={data?.source} asOf={asOf} />
            <button
              onClick={load}
              disabled={status === "loading"}
              className="grid h-7 w-7 place-items-center rounded border border-line font-mono text-sm text-dim hover:border-line-strong hover:text-ink disabled:opacity-40"
              aria-label="Refresh market risk posture"
            >
              ↻
            </button>
          </div>
        }
      />

      {!data || !meta ? (
        <div className="grid h-64 place-items-center font-mono text-2xs uppercase tracking-wider text-dim">computing…</div>
      ) : (
        <>
          {/* ── Hero: posture headline + composite ring + alignment read ── */}
          <div className="grid grid-cols-1 gap-px bg-line lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
            {/* Left: the composite ring */}
            <div
              className="flex items-center gap-4 bg-base p-4"
              role="img"
              aria-label={`Composite risk score ${data.composite} of 100 — ${data.posture}`}
            >
              <Ring
                value={data.composite}
                max={100}
                size={104}
                stroke={10}
                color={compositeColor(data.composite)}
                label={`${data.composite}`}
                sub="COMPOSITE"
              />
              <div className="min-w-0 flex-1">
                <div className="kpi-label">Composite Score</div>
                <div className={cn("mt-1 font-mono text-xl font-semibold tabular-nums", meta.color)}>
                  {data.composite}
                  <span className="ml-1 text-sm text-dim">/100</span>
                </div>
                <p className="mt-1.5 text-2xs text-dim">
                  0 = full risk-off · 50 = neutral · 100 = full risk-on
                </p>
                <p className="mt-1 font-mono text-2xs text-faint">{total} cross-asset signals · weight-blended</p>
              </div>
            </div>

            {/* Right: posture headline + alignment + one-line read */}
            <div className="space-y-4 bg-base p-4">
              {/* Posture headline */}
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className={cn("font-mono text-4xl font-semibold leading-none tracking-tight", meta.color)}>
                  {data.posture}
                </span>
                <span className="text-sm text-dim">{meta.desc}</span>
              </div>

              {/* Alignment + counts deck */}
              <div className="flex flex-wrap items-center gap-2">
                <Chip tone={data.agreement >= 67 ? "pos" : data.agreement >= 50 ? "warn" : "neg"} dot>
                  {data.agreement}% aligned
                </Chip>
                <span className="font-mono text-2xs text-dim">
                  {aligned} of {total} signals
                </span>
                <span className="font-mono text-xs text-faint">·</span>
                <span className="font-mono text-2xs">
                  <span className="text-pos">{data.riskOnCount} risk-on</span>
                  <span className="text-faint"> · </span>
                  <span className="text-neg">{data.riskOffCount} risk-off</span>
                  {data.neutralCount > 0 ? (
                    <>
                      <span className="text-faint"> · </span>
                      <span className="text-dim">{data.neutralCount} neutral</span>
                    </>
                  ) : null}
                </span>
              </div>

              {/* One-line read */}
              <div className="rounded border border-line bg-elevated/20 px-3 py-3">
                <div className="mb-2 section-label text-[11px] text-muted">CROSS-ASSET READ</div>
                <p className="text-sm leading-relaxed text-muted">
                  Cross-asset signals are net{" "}
                  <span className={cn("font-medium", meta.color)}>{meta.word}</span> —{" "}
                  <span className="font-mono font-medium text-ink">{data.agreement}%</span> aligned; {drivers}.
                </p>
              </div>
            </div>
          </div>

          {/* ── Signal-score table ── */}
          <div className="overflow-x-auto border-t border-line">
            <table className="w-full min-w-[680px] border-collapse">
              <thead>
                <tr>
                  <Th>Signal</Th>
                  <Th>Category</Th>
                  <Th right>Reading</Th>
                  <Th right>Risk score (0–100)</Th>
                  <Th>Note</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => {
                  const scorePct = Math.max(0, Math.min(100, s.score));
                  return (
                    <tr key={s.id} className="hover:bg-elevated/40">
                      <Td mono={false} className="font-medium text-ink">
                        {s.label}
                      </Td>
                      <Td mono={false}>
                        <Chip tone={CATEGORY_TONE[s.category] ?? "default"}>{s.category}</Chip>
                      </Td>
                      <Td right className="text-ink">
                        {formatReading(s)}
                      </Td>
                      <Td right>
                        <div className="flex items-center justify-end gap-2">
                          <span className="relative h-1.5 w-24 overflow-hidden rounded-full bg-line" aria-hidden>
                            {/* neutral (50) tick so the risk-on/off split reads at a glance */}
                            <span className="absolute inset-y-0 left-1/2 w-px bg-line-strong" />
                            <span
                              className="block h-full rounded-full"
                              style={{ width: `${scorePct}%`, background: scoreColor(s.score) }}
                            />
                          </span>
                          <span className={cn("w-7 text-right tabular-nums", scoreTextClass(s.score))}>
                            {fmtNum(s.score, 0)}
                          </span>
                        </div>
                      </Td>
                      <Td mono={false} className="text-xs text-muted">
                        {s.note}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── Composite deck ── */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line px-4 py-3 sm:grid-cols-4">
            <Stat
              label="Composite"
              value={
                <span>
                  {data.composite}
                  <span className="ml-1 text-2xs text-dim">/100</span>
                </span>
              }
              tone={data.composite >= 58 ? "pos" : data.composite >= 42 ? "warn" : "neg"}
            />
            <Stat
              label="Agreement"
              value={`${data.agreement}%`}
              tone={data.agreement >= 67 ? "pos" : data.agreement >= 50 ? "warn" : "neg"}
            />
            <Stat label="Risk-on signals" value={`${data.riskOnCount} of ${total}`} tone="pos" />
            <Stat
              label="Risk-off signals"
              value={`${data.riskOffCount} of ${total}`}
              tone={data.riskOffCount > 0 ? "neg" : "muted"}
            />
          </div>
        </>
      )}

      <div className="border-t border-line px-4 py-2.5 font-mono text-2xs text-faint">
        A cross-asset synthesis: the yield curve, high-yield credit spreads, implied volatility, equity trend, sector
        breadth and recession odds are each normalized to a 0–100 risk-support score and weight-blended into one market
        posture. Source: FRED + Stooq.
      </div>
    </Panel>
  );
}
