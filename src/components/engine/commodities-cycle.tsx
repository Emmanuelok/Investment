"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Panel, PanelHeader, Stat, Chip, Th, Td } from "@/components/ui/kit";
import { fmtNum, fmtSignedPct, signClass } from "@/lib/format";
import { cn } from "@/lib/cn";
import { priceWalk } from "@/lib/rng";
import {
  buildCommodities,
  type CommoditySeries,
  type CommodityReport,
  type CommodityRead,
  type CycleQuadrant,
} from "@/lib/engine/commodities";

/* ── Types matching /api/engine/commodities ────────────────────────────────── */

/** Live response carries every CommodityReport field plus the wrapper meta. */
type LiveResponse =
  | ({
      live: true;
      source: string;
      asOf: string;
    } & CommodityReport)
  | { live: false };

/** Rendered shape — the computed engine report plus provenance. */
type CommoditiesData = CommodityReport & {
  source?: string;
  asOf?: string;
};

type Status = "loading" | "live" | "demo";

/* ── Cycle quadrant presentation ───────────────────────────────────────────── */

const CYCLE_META: Record<CycleQuadrant, { color: string; desc: string }> = {
  Reflation: {
    color: "text-pos",
    desc: "copper leading gold and commodities rising — reflationary growth",
  },
  Goldilocks: {
    color: "text-pos",
    desc: "growth firming while inflation cools — the soft-landing sweet spot",
  },
  Stagflation: {
    color: "text-neg",
    desc: "inflation rising as growth stalls — the hardest backdrop for risk",
  },
  Deflation: {
    color: "text-neg",
    desc: "growth and inflation both falling — defensive, safe-haven regime",
  },
  Mixed: {
    color: "text-dim",
    desc: "no decisive growth/inflation tilt — a transitional, mixed backdrop",
  },
};

/* growth axis (cols): Deteriorating ← → Improving · inflation axis (rows): Rising ↑ / Falling ↓ */
const QUAD_GRID: ReadonlyArray<ReadonlyArray<CycleQuadrant>> = [
  ["Stagflation", "Reflation"], // top row — inflation Rising
  ["Deflation", "Goldilocks"], // bottom row — inflation Falling
];

const QUAD_DOT: Record<CycleQuadrant, string> = {
  Reflation: "var(--pos)",
  Goldilocks: "var(--accent)",
  Stagflation: "var(--neg)",
  Deflation: "var(--neg)",
  Mixed: "var(--dim)",
};

/* ── Trend chip tone ───────────────────────────────────────────────────────── */

const TREND_TONE: Record<CommodityRead["trend"], "pos" | "neg" | "default"> = {
  Up: "pos",
  Flat: "default",
  Down: "neg",
};

/* ── Demo fallback (sandbox returns { live:false }) ─────────────────────────── */

/**
 * Six seeded commodity proxy series, ~200 closes each. Drifts are chosen so the
 * SAME engine math (buildCommodities) produces a believable "Reflation" read:
 * copper out-drifts gold (copper/gold ratio rising → growth Improving) and the
 * broad basket climbs (3m momentum rising → inflation Rising). The ids match the
 * engine's copper/gold/oil/broad lookups exactly.
 */
type DemoSpec = {
  id: string;
  label: string;
  group: string;
  drift: number;
  vol: number;
};

const DEMO_SPECS: ReadonlyArray<DemoSpec> = [
  { id: "copper", label: "Copper", group: "Industrial Metals", drift: 0.0016, vol: 0.012 },
  { id: "gold", label: "Gold", group: "Precious Metals", drift: 0.0004, vol: 0.009 },
  { id: "oil", label: "Crude Oil", group: "Energy", drift: 0.0011, vol: 0.018 },
  { id: "broad", label: "Broad Commodities", group: "Diversified", drift: 0.0011, vol: 0.01 },
  { id: "silver", label: "Silver", group: "Precious Metals", drift: 0.0009, vol: 0.015 },
  { id: "agriculture", label: "Agriculture", group: "Agriculture", drift: 0.0007, vol: 0.011 },
];

function buildDemo(): CommoditiesData {
  const series: CommoditySeries[] = DEMO_SPECS.map((s) => ({
    id: s.id,
    label: s.label,
    group: s.group,
    closes: priceWalk(`commod-${s.id}`, 200, 100, s.vol, s.drift),
  }));
  return { ...buildCommodities(series), source: "demo", asOf: "2026-05-01" };
}

/* ── Impulse / signal chip tones ───────────────────────────────────────────── */

const INFLATION_TONE: Record<CommodityReport["inflationImpulse"], "warn" | "default" | "pos"> = {
  Rising: "warn",
  Neutral: "default",
  Falling: "pos",
};

const GROWTH_TONE: Record<CommodityReport["growthSignal"], "pos" | "default" | "neg"> = {
  Improving: "pos",
  Neutral: "default",
  Deteriorating: "neg",
};

/* ── Cycle quadrant visual (2×2 growth × inflation grid) ───────────────────── */

function CycleQuadrantViz({ cycle }: { cycle: CycleQuadrant }) {
  return (
    <div
      className="rounded border border-line bg-elevated/20 p-3"
      role="img"
      aria-label={`Macro cycle quadrant: current regime ${cycle}`}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="section-label text-[11px] text-muted">MACRO CYCLE QUADRANT</span>
        <span className="font-mono text-2xs text-faint">growth × inflation</span>
      </div>
      <div className="flex gap-2">
        {/* inflation axis label */}
        <div className="flex flex-col items-center justify-between py-1 font-mono text-2xs text-faint">
          <span aria-hidden>↑</span>
          <span className="[writing-mode:vertical-rl] rotate-180 tracking-wider">INFLATION</span>
          <span aria-hidden>↓</span>
        </div>
        <div className="flex-1">
          <div className="grid grid-cols-2 gap-1">
            {QUAD_GRID.flat().map((q) => {
              const active = q === cycle;
              return (
                <div
                  key={q}
                  className={cn(
                    "flex items-center gap-1.5 rounded border px-2 py-2.5 transition-colors",
                    active ? "border-line-strong bg-elevated/60" : "border-line/60 bg-base",
                  )}
                  aria-current={active ? "true" : undefined}
                >
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: QUAD_DOT[q], opacity: active ? 1 : 0.35 }}
                  />
                  <span
                    className={cn(
                      "font-mono text-2xs uppercase tracking-wider",
                      active ? CYCLE_META[q].color : "text-dim",
                    )}
                  >
                    {q}
                  </span>
                </div>
              );
            })}
          </div>
          {/* growth axis label */}
          <div className="mt-1 flex items-center justify-between font-mono text-2xs text-faint">
            <span>← deteriorating</span>
            <span className="tracking-wider">GROWTH</span>
            <span>improving →</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── 3M momentum bar (inline, centered at zero) ────────────────────────────── */

function MomentumBar({ value, max }: { value: number; max: number }) {
  const span = max || 1;
  const pct = Math.min(100, (Math.abs(value) / span) * 100);
  return (
    <span className="ml-2 inline-flex h-1 w-12 overflow-hidden rounded-full bg-line align-middle" aria-hidden>
      <span
        className="block h-full rounded-full"
        style={{
          width: `${pct}%`,
          marginLeft: value >= 0 ? 0 : "auto",
          background: value >= 0 ? "var(--pos)" : "var(--neg)",
        }}
      />
    </span>
  );
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

/* ── Main panel ────────────────────────────────────────────────────────────── */

export function CommoditiesCycle() {
  const [status, setStatus] = useState<Status>("loading");
  const [data, setData] = useState<CommoditiesData | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const r = await fetch("/api/engine/commodities", { cache: "no-store" });
      const j = (await r.json()) as LiveResponse;
      if (j.live) {
        setData({
          reads: j.reads,
          copperGoldRatio: j.copperGoldRatio,
          copperGoldChange3m: j.copperGoldChange3m,
          goldOilRatio: j.goldOilRatio,
          broadMomentum: j.broadMomentum,
          inflationImpulse: j.inflationImpulse,
          growthSignal: j.growthSignal,
          cycle: j.cycle,
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

  const rows = useMemo<CommodityRead[]>(() => {
    if (!data) return [];
    return [...data.reads].sort((a, b) => b.ret3m - a.ret3m);
  }, [data]);

  const maxAbs3m = useMemo(() => Math.max(1, ...rows.map((r) => Math.abs(r.ret3m))), [rows]);

  const meta = data ? CYCLE_META[data.cycle] : null;

  return (
    <Panel className="animate-rise">
      <PanelHeader
        title="Commodities & Inflation Cycle"
        sub="Copper/gold growth barometer × broad-commodity inflation impulse → macro cycle quadrant — from Stooq"
        right={
          <div className="flex items-center gap-2">
            <StatusBadge status={status} source={data?.source} asOf={asOf} />
            <button
              onClick={load}
              disabled={status === "loading"}
              className="grid h-7 w-7 place-items-center rounded border border-line font-mono text-sm text-dim hover:border-line-strong hover:text-ink disabled:opacity-40"
              aria-label="Refresh commodities cycle"
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
          {/* ── Hero: cycle headline + quadrant + growth/inflation chips ── */}
          <div className="grid grid-cols-1 gap-px bg-line lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
            <div className="space-y-4 bg-base p-4">
              {/* Cycle headline */}
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className={cn("font-mono text-3xl font-semibold leading-none tracking-tight", meta.color)}>
                  {data.cycle}
                </span>
                <span className="text-sm text-dim">{meta.desc}</span>
              </div>

              {/* Growth × inflation read */}
              <div className="flex flex-wrap items-center gap-2">
                <Chip tone={GROWTH_TONE[data.growthSignal]} dot>
                  Growth {data.growthSignal}
                </Chip>
                <span className="font-mono text-xs text-faint">×</span>
                <Chip tone={INFLATION_TONE[data.inflationImpulse]} dot>
                  Inflation {data.inflationImpulse}
                </Chip>
              </div>
              <p className="font-mono text-2xs text-dim">
                copper/gold 3m{" "}
                <span className={signClass(data.copperGoldChange3m)}>{fmtSignedPct(data.copperGoldChange3m)}</span>{" "}
                → growth {data.growthSignal} · broad 3m{" "}
                <span className={signClass(data.broadMomentum)}>{fmtSignedPct(data.broadMomentum)}</span> → inflation{" "}
                {data.inflationImpulse} → {data.cycle}
              </p>
            </div>

            {/* Quadrant visual */}
            <div className="bg-base p-4">
              <CycleQuadrantViz cycle={data.cycle} />
            </div>
          </div>

          {/* ── Key macro-ratio deck ── */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line px-4 py-3 sm:grid-cols-3">
            <Stat
              label="Copper / Gold"
              value={
                <span>
                  {data.copperGoldRatio === null ? "—" : fmtNum(data.copperGoldRatio, 3)}
                  <span className={cn("ml-1.5 text-2xs", signClass(data.copperGoldChange3m))}>
                    {fmtSignedPct(data.copperGoldChange3m)} 3m
                  </span>
                </span>
              }
              tone={data.copperGoldChange3m >= 0 ? "pos" : "neg"}
            />
            <Stat
              label="Gold / Oil"
              value={data.goldOilRatio === null ? "—" : fmtNum(data.goldOilRatio, 2)}
              tone="accent"
            />
            <Stat
              label="Broad 3m momentum"
              value={fmtSignedPct(data.broadMomentum)}
              tone={data.broadMomentum > 0 ? "warn" : "pos"}
            />
          </div>

          {/* ── Commodity leaderboard table (sorted by 3m return desc) ── */}
          <div className="overflow-x-auto border-t border-line">
            <table className="w-full min-w-[560px] border-collapse">
              <thead>
                <tr>
                  <Th>Commodity</Th>
                  <Th right>1M</Th>
                  <Th right>3M</Th>
                  <Th right>6M</Th>
                  <Th right>Trend</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-elevated/40">
                    <Td mono={false}>
                      <span className="flex items-center gap-2.5">
                        <span className="font-medium text-ink">{r.label}</span>
                        <Chip tone="default">{r.group}</Chip>
                      </span>
                    </Td>
                    <Td right className={signClass(r.ret1m)}>
                      {fmtSignedPct(r.ret1m)}
                    </Td>
                    <Td right>
                      <span className="inline-flex items-center justify-end">
                        <span className={signClass(r.ret3m)}>{fmtSignedPct(r.ret3m)}</span>
                        <MomentumBar value={r.ret3m} max={maxAbs3m} />
                      </span>
                    </Td>
                    <Td right className={signClass(r.ret6m)}>
                      {fmtSignedPct(r.ret6m)}
                    </Td>
                    <Td right>
                      <Chip tone={TREND_TONE[r.trend]}>{r.trend}</Chip>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="border-t border-line px-4 py-2.5 font-mono text-2xs text-faint">
        The copper/gold ratio is a growth-and-rates barometer (industrial demand vs safe haven); broad-commodity momentum
        is a real-time inflation impulse. Together they place the macro backdrop in the Reflation / Goldilocks /
        Stagflation / Deflation quadrant. Source: Stooq commodity ETFs.
      </div>
    </Panel>
  );
}
