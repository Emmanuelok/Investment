"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Panel, PanelHeader, Stat, Chip, Th, Td } from "@/components/ui/kit";
import { Ring } from "@/components/ui/viz";
import { fmtNum, fmtSigned, signClass } from "@/lib/format";
import { cn } from "@/lib/cn";
import {
  buildNowcast,
  type NowcastInput,
  type NowcastResult,
  type NowcastGroup,
  type Regime,
} from "@/lib/engine/nowcast";

/* ── Types matching /api/engine/nowcast ────────────────────────────────────── */

type Transform = "yoy" | "mom" | "level";

/** The fetched indicator shape carries asOf + transform beyond the engine's NowcastIndicator. */
type LiveIndicator = {
  id: string;
  label: string;
  group: NowcastGroup;
  latest: number;
  z: number;
  trend: number;
  weight: number;
  asOf: string | null;
  transform: Transform;
};

type Composite = { group: NowcastGroup; z: number; momentum: number; n: number };

type NowcastData = {
  source?: string;
  asOf?: string;
  seriesUsed: number;
  indicators: LiveIndicator[];
  composites: Composite[];
  growthZ: number;
  inflationZ: number;
  laborZ: number;
  momentum: number;
  regime: Regime;
  score: number;
};

type LiveResponse =
  | {
      live: true;
      source: string;
      asOf: string;
      seriesUsed: number;
      indicators: LiveIndicator[];
      composites: Composite[];
      growthZ: number;
      inflationZ: number;
      laborZ: number;
      momentum: number;
      regime: Regime;
      score: number;
    }
  | { live: false };

type Status = "loading" | "live" | "demo";

/* ── Unified view type the table renders ───────────────────────────────────── */

type IndicatorView = {
  id: string;
  label: string;
  group: NowcastGroup;
  latest: number;
  z: number;
  trend: number;
  transform: Transform;
  asOf: string | null;
};

/* ── Regime → cycle-quadrant presentation ──────────────────────────────────── */

const REGIME_META: Record<Regime, { color: string; desc: string }> = {
  Expansion: { color: "text-pos", desc: "above-trend growth, still accelerating" },
  Slowdown: { color: "text-warn", desc: "above-trend growth, but decelerating" },
  Contraction: { color: "text-neg", desc: "below-trend growth, still deteriorating" },
  Recovery: { color: "text-accent", desc: "below-trend growth, but reaccelerating" },
};

const REGIME_RING: Record<Regime, string> = {
  Expansion: "var(--pos)",
  Slowdown: "var(--warn)",
  Contraction: "var(--neg)",
  Recovery: "var(--accent)",
};

/* ── Demo fallback (sandbox returns { live:false }) ─────────────────────────── */

/* Late-cycle basket, oldest → newest (24 pts each): growth above-trend but rolling
   over, labor tight but cooling, inflation sticky-but-easing → produces "Slowdown". */
type DemoSpec = {
  id: string;
  label: string;
  group: NowcastGroup;
  transform: Transform;
  series: number[];
  sign?: 1 | -1;
  weight?: number;
};

const DEMO_SPECS: DemoSpec[] = [
  // Growth — positive level, decelerating
  { id: "INDPRO", label: "Industrial production", group: "Growth", transform: "yoy",
    series: [1.6, 1.5, 1.7, 1.6, 1.8, 1.7, 1.9, 2.0, 2.2, 2.5, 2.9, 3.4, 3.9, 4.4, 4.8, 5.1, 5.3, 5.45, 5.5, 5.45, 5.3, 5.1, 4.85, 4.6] },
  { id: "RSAFS", label: "Retail sales", group: "Growth", transform: "yoy",
    series: [2.8, 2.6, 2.9, 2.7, 3.0, 2.9, 3.2, 3.4, 3.7, 4.1, 4.6, 5.1, 5.6, 6.0, 6.35, 6.6, 6.78, 6.9, 6.95, 6.9, 6.78, 6.6, 6.4, 6.2] },
  { id: "HOUST", label: "Housing starts", group: "Growth", transform: "yoy",
    series: [0.5, 0.0, 0.8, -0.5, 0.6, 0.2, 1.0, 1.6, 2.4, 3.4, 4.6, 5.8, 6.9, 7.8, 8.5, 9.0, 9.3, 9.45, 9.5, 9.4, 9.1, 8.7, 8.2, 7.7] },
  { id: "DGORDER", label: "Durable-goods orders", group: "Growth", transform: "yoy",
    series: [1.2, 1.0, 1.4, 1.1, 1.5, 1.3, 1.7, 2.0, 2.5, 3.1, 3.8, 4.5, 5.1, 5.6, 6.0, 6.3, 6.5, 6.6, 6.62, 6.55, 6.4, 6.2, 5.95, 5.7] },
  { id: "UMCSENT", label: "Consumer sentiment", group: "Growth", transform: "level",
    series: [68, 67, 69, 66.5, 68, 67, 69, 70, 71.5, 73, 74.8, 76.5, 78, 79.2, 80, 80.5, 80.8, 81, 81, 80.7, 80.1, 79.3, 78.4, 77.5] },
  // Labor — solid, only mild cooling at the tip
  { id: "PAYEMS", label: "Nonfarm payrolls (Δ)", group: "Labor", transform: "mom", weight: 1.5,
    series: [180, 170, 185, 175, 190, 182, 198, 210, 228, 250, 272, 290, 305, 316, 324, 329, 332, 334, 335, 333, 329, 324, 318, 312] },
  { id: "UNRATE", label: "Unemployment rate", group: "Labor", transform: "level", sign: -1,
    series: [4.1, 4.2, 4.0, 4.15, 4.05, 4.1, 4.0, 3.9, 3.8, 3.7, 3.6, 3.55, 3.5, 3.46, 3.43, 3.41, 3.4, 3.39, 3.39, 3.4, 3.42, 3.45, 3.48, 3.52] },
  { id: "ICSA", label: "Initial jobless claims", group: "Labor", transform: "level", sign: -1,
    series: [235, 240, 232, 238, 234, 236, 230, 224, 216, 208, 202, 197, 193, 190, 188, 187, 186, 185, 185, 186, 188, 191, 195, 199] },
  { id: "AWHMAN", label: "Avg weekly hours (mfg)", group: "Labor", transform: "level",
    series: [40.6, 40.5, 40.7, 40.55, 40.65, 40.6, 40.7, 40.8, 40.95, 41.1, 41.25, 41.38, 41.48, 41.55, 41.6, 41.63, 41.65, 41.66, 41.66, 41.64, 41.6, 41.55, 41.49, 41.43] },
  // Inflation — sticky but easing off its peak
  { id: "CPIAUCSL", label: "CPI", group: "Inflation", transform: "yoy",
    series: [2.4, 2.6, 2.9, 3.4, 4.0, 4.7, 5.4, 6.0, 6.5, 6.9, 7.2, 7.4, 7.45, 7.4, 7.2, 6.9, 6.5, 6.1, 5.7, 5.3, 5.0, 4.75, 4.55, 4.4] },
  { id: "PCEPILFE", label: "Core PCE", group: "Inflation", transform: "yoy", weight: 1.5,
    series: [2.5, 2.6, 2.8, 3.1, 3.5, 3.9, 4.3, 4.6, 4.85, 5.0, 5.1, 5.15, 5.15, 5.1, 5.0, 4.85, 4.65, 4.45, 4.25, 4.05, 3.9, 3.78, 3.68, 3.6] },
  { id: "T10YIE", label: "10y breakeven", group: "Inflation", transform: "level",
    series: [2.0, 2.05, 2.1, 2.18, 2.27, 2.36, 2.45, 2.52, 2.58, 2.62, 2.65, 2.67, 2.67, 2.65, 2.62, 2.58, 2.53, 2.48, 2.44, 2.4, 2.37, 2.35, 2.33, 2.32] },
  { id: "PPIACO", label: "PPI commodities", group: "Inflation", transform: "yoy",
    series: [1.0, 1.3, 1.8, 2.6, 3.6, 4.8, 6.0, 7.0, 7.8, 8.4, 8.8, 9.0, 9.0, 8.8, 8.4, 7.9, 7.3, 6.7, 6.1, 5.6, 5.2, 4.9, 4.7, 4.55] },
];

const DEMO_ASOF = "2026-05-01";

function buildDemo(): NowcastData {
  const inputs: NowcastInput[] = DEMO_SPECS.map((s) => ({
    id: s.id,
    label: s.label,
    group: s.group,
    series: s.series,
    sign: s.sign,
    weight: s.weight,
  }));
  const result: NowcastResult = buildNowcast(inputs);
  const transformById = new Map<string, Transform>(DEMO_SPECS.map((s) => [s.id, s.transform]));
  const indicators: LiveIndicator[] = result.indicators.map((ind) => ({
    ...ind,
    asOf: DEMO_ASOF,
    transform: transformById.get(ind.id) ?? "level",
  }));
  return {
    seriesUsed: inputs.length,
    indicators,
    composites: result.composites,
    growthZ: result.growthZ,
    inflationZ: result.inflationZ,
    laborZ: result.laborZ,
    momentum: result.momentum,
    regime: result.regime,
    score: result.score,
  };
}

/* ── Formatting helpers (local — no new lib helpers) ───────────────────────── */

const GROUP_ORDER: NowcastGroup[] = ["Growth", "Labor", "Inflation"];
const GROUP_TONE: Record<NowcastGroup, "accent" | "info" | "warn"> = {
  Growth: "accent",
  Labor: "info",
  Inflation: "warn",
};

/** Format an indicator's latest reading by its transform (yoy → %, mom → k, level → plain). */
function fmtLatest(value: number, transform: Transform): string {
  if (transform === "yoy") return `${fmtNum(value, 1)}%`;
  if (transform === "mom") return `${fmtSigned(value, 0)}k`;
  return fmtNum(value, value >= 100 ? 0 : 1);
}

/* ── Status badge (identical idiom to yield-curve.tsx) ─────────────────────── */

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

/* ── Directional arrow ─────────────────────────────────────────────────────── */

function DirArrow({ value, invertColor }: { value: number; invertColor?: boolean }) {
  if (Math.abs(value) < 1e-9) return <span className="text-faint">→</span>;
  const up = value > 0;
  // invertColor: higher = "warn" reading (e.g. inflation accelerating) rather than "good".
  const color = invertColor ? (up ? "text-warn" : "text-pos") : up ? "text-pos" : "text-neg";
  return <span className={color}>{up ? "↑" : "↓"}</span>;
}

/* ── Main panel ────────────────────────────────────────────────────────────── */

export function MacroNowcast() {
  const [status, setStatus] = useState<Status>("loading");
  const [data, setData] = useState<NowcastData | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const r = await fetch("/api/engine/nowcast", { cache: "no-store" });
      const j = (await r.json()) as LiveResponse;
      if (j.live) {
        setData({
          source: j.source,
          asOf: j.asOf,
          seriesUsed: j.seriesUsed,
          indicators: j.indicators,
          composites: j.composites,
          growthZ: j.growthZ,
          inflationZ: j.inflationZ,
          laborZ: j.laborZ,
          momentum: j.momentum,
          regime: j.regime,
          score: j.score,
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

  const growthComposite = useMemo(
    () => data?.composites.find((c) => c.group === "Growth") ?? null,
    [data],
  );

  const rows = useMemo<IndicatorView[]>(() => {
    if (!data) return [];
    return data.indicators
      .map((i) => ({
        id: i.id,
        label: i.label,
        group: i.group,
        latest: i.latest,
        z: i.z,
        trend: i.trend,
        transform: i.transform,
        asOf: i.asOf,
      }))
      .sort((a, b) => {
        const ga = GROUP_ORDER.indexOf(a.group);
        const gb = GROUP_ORDER.indexOf(b.group);
        if (ga !== gb) return ga - gb;
        return b.z - a.z;
      });
  }, [data]);

  const meta = data ? REGIME_META[data.regime] : null;
  const score = data ? Math.round(data.score) : 0;
  const growthLevelUp = data ? data.growthZ >= 0 : false;
  const momentumUp = data ? data.momentum >= 0 : false;
  const zMax = useMemo(() => Math.max(1, ...rows.map((r) => Math.abs(r.z))), [rows]);

  return (
    <Panel className="animate-rise">
      <PanelHeader
        title="Macro Nowcast Engine"
        sub="Growth × inflation × labor z-scores → business-cycle quadrant — computed from FRED series"
        right={
          <div className="flex items-center gap-2">
            <StatusBadge status={status} source={data?.source} asOf={asOf} />
            <button
              onClick={load}
              disabled={status === "loading"}
              className="grid h-7 w-7 place-items-center rounded border border-line font-mono text-sm text-dim hover:border-line-strong hover:text-ink disabled:opacity-40"
              aria-label="Refresh macro nowcast"
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
          {/* ── Hero: regime headline + quadrant + score ── */}
          <div className="grid grid-cols-1 gap-px bg-line lg:grid-cols-[minmax(0,1fr)_minmax(0,300px)]">
            <div className="space-y-4 bg-base p-4">
              {/* Regime headline */}
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className={cn("font-mono text-3xl font-semibold leading-none tracking-tight", meta.color)}>
                  {data.regime}
                </span>
                <span className="text-sm text-dim">{meta.desc}</span>
              </div>

              {/* Cycle quadrant: level × momentum mapping */}
              <div className="rounded border border-line bg-elevated/20 px-3 py-3">
                <div className="mb-2 section-label text-[11px] text-muted">BUSINESS-CYCLE QUADRANT</div>
                <div className="flex flex-wrap items-center gap-2">
                  <Chip tone={growthLevelUp ? "pos" : "neg"} dot>
                    Growth level {growthLevelUp ? "↑ above-trend" : "↓ below-trend"}
                  </Chip>
                  <span className="font-mono text-xs text-faint">×</span>
                  <Chip tone={momentumUp ? "pos" : "warn"} dot>
                    Momentum {momentumUp ? "↑ accelerating" : "↓ decelerating"}
                  </Chip>
                </div>
                <p className="mt-2 font-mono text-2xs text-dim">
                  level{" "}
                  <span className={signClass(data.growthZ)}>
                    {fmtSigned(data.growthZ, 2)}σ
                  </span>{" "}
                  · momentum{" "}
                  <span className={signClass(data.momentum)}>{fmtSigned(data.momentum, 2)}</span>{" "}
                  → {data.regime}
                </p>
              </div>
            </div>

            {/* Score ring */}
            <div className="flex items-center gap-4 bg-base p-4">
              <Ring
                value={score}
                max={100}
                size={92}
                stroke={9}
                color={REGIME_RING[data.regime]}
                label={`${score}`}
                sub="SCORE"
              />
              <div className="min-w-0 flex-1">
                <div className="kpi-label">Growth Score</div>
                <div className={cn("mt-1 font-mono text-xl font-semibold tabular-nums", meta.color)}>
                  {score}
                  <span className="ml-1 text-sm text-dim">/100</span>
                </div>
                <p className="mt-1.5 text-2xs text-dim">
                  50 = neutral · growth composite z{" "}
                  <span className={signClass(growthComposite?.z ?? data.growthZ)}>
                    {fmtSigned(growthComposite?.z ?? data.growthZ, 2)}σ
                  </span>
                </p>
                <p className="mt-1 font-mono text-2xs text-faint">{data.seriesUsed} series · z vs own history</p>
              </div>
            </div>
          </div>

          {/* ── Composite deck ── */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line px-4 py-3 sm:grid-cols-4">
            <Stat
              label="Growth z"
              value={`${fmtSigned(data.growthZ, 2)}σ`}
              tone={data.growthZ >= 0 ? "pos" : "neg"}
            />
            <Stat
              label="Inflation z"
              value={`${fmtSigned(data.inflationZ, 2)}σ`}
              tone={data.inflationZ > 0 ? "warn" : "pos"}
            />
            <Stat
              label="Labor z"
              value={`${fmtSigned(data.laborZ, 2)}σ`}
              tone={data.laborZ >= 0 ? "pos" : "neg"}
            />
            <Stat
              label="Momentum"
              value={fmtSigned(data.momentum, 2)}
              tone={data.momentum >= 0 ? "pos" : "warn"}
            />
          </div>

          {/* ── Indicator table ── */}
          <div className="overflow-x-auto border-t border-line">
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr>
                  <Th>Indicator</Th>
                  <Th>Group</Th>
                  <Th right>Latest</Th>
                  <Th right>Z-score</Th>
                  <Th right>Trend</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const inflation = r.group === "Inflation";
                  const zPct = Math.min(100, (Math.abs(r.z) / zMax) * 100);
                  return (
                    <tr key={r.id} className="hover:bg-elevated/40">
                      <Td mono={false} className="font-medium text-ink">
                        {r.label}
                        {r.asOf ? <span className="ml-2 font-mono text-2xs text-faint">{r.asOf}</span> : null}
                      </Td>
                      <Td mono={false}>
                        <Chip tone={GROUP_TONE[r.group]}>{r.group}</Chip>
                      </Td>
                      <Td right className="text-ink">
                        {fmtLatest(r.latest, r.transform)}
                      </Td>
                      <Td right>
                        <div className="flex items-center justify-end gap-2">
                          <span className="h-1 w-12 overflow-hidden rounded-full bg-line" aria-hidden>
                            <span
                              className="block h-full rounded-full"
                              style={{
                                width: `${zPct}%`,
                                marginLeft: "auto",
                                background: r.z >= 0 ? "var(--pos)" : "var(--neg)",
                              }}
                            />
                          </span>
                          <span className={cn("w-12 text-right", signClass(r.z))}>{fmtSigned(r.z, 2)}σ</span>
                        </div>
                      </Td>
                      <Td right>
                        <span className="inline-flex items-center justify-end gap-1.5">
                          <span className={signClass(r.trend)}>{fmtSigned(r.trend, 2)}</span>
                          <DirArrow value={r.trend} invertColor={inflation} />
                        </span>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="border-t border-line px-4 py-2.5 font-mono text-2xs text-faint">
        Each indicator is z-scored against its own history and sign-adjusted (unemployment &amp; claims inverted) so + =
        stronger growth / higher inflation / tighter labor. Growth level × momentum sets the business-cycle quadrant.
        Source: FRED.
      </div>
    </Panel>
  );
}
