"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Panel, PanelHeader, Stat, Chip, Th, Td } from "@/components/ui/kit";
import { Ring, ProgressBar } from "@/components/ui/viz";
import { fmtNum, fmtPct, fmtSignedPct, signClass } from "@/lib/format";
import { cn } from "@/lib/cn";
import {
  buildRecession,
  type RecessionInput,
  type RecessionReport,
  type RecessionSignal,
  type RecessionLevel,
} from "@/lib/engine/recession";

/* ── Types matching /api/engine/recession ──────────────────────────────────── */

/** The live route spreads `...report` plus source/asOf/asOfDate. */
type LiveResponse =
  | ({
      live: true;
      source: string;
      asOf: string;
      asOfDate: string | null;
    } & RecessionReport)
  | { live: false };

/** Local view model shared by live + demo. */
type RecessionData = RecessionReport & {
  source?: string;
  asOf?: string;
  asOfDate: string | null;
};

type Status = "loading" | "live" | "demo";

/* ── Demo input (sandbox returns { live:false }) ────────────────────────────── */

/* A realistic mid/late-cycle read: the 10y−3m term spread is slightly positive
   (+0.3pp — re-steepened off inversion), unemployment is stable near 3.9% so the
   Sahm rule stays untriggered, and high-yield OAS holds near 4.0% (benign). The
   engine blends these to a "Low" composite with a low-20s headline probit. */
const DEMO_TERM_SPREAD = 0.3;

/* 24 monthly unemployment points, oldest → newest, hovering ~3.9% (Sahm gap < 0.5). */
const DEMO_UNRATE: number[] = [
  3.8, 3.8, 3.7, 3.8, 3.9, 3.9, 3.8, 3.9, 4.0, 3.9, 3.9, 3.8,
  3.9, 3.9, 4.0, 3.9, 3.8, 3.9, 3.9, 4.0, 3.9, 3.9, 3.9, 3.9,
];

/* High-yield OAS history (percent), oldest → newest, ending ~4.0% (benign). */
const DEMO_HY_OAS: number[] = [
  5.1, 4.95, 4.8, 4.65, 4.55, 4.48, 4.4, 4.32, 4.25, 4.18, 4.12, 4.08,
  4.05, 4.0, 3.98, 4.02, 4.05, 4.0, 3.96, 4.02, 4.08, 4.04, 4.0, 4.0,
];

const DEMO_ASOF = "2026-05-31";

function buildDemo(): RecessionData {
  const input: RecessionInput = {
    termSpread: DEMO_TERM_SPREAD,
    unrate: DEMO_UNRATE,
    hyOas: DEMO_HY_OAS,
  };
  const report = buildRecession(input);
  return { ...report, asOfDate: DEMO_ASOF };
}

/* ── Level → presentation (static maps; no dynamic Tailwind) ───────────────── */

const LEVEL_META: Record<RecessionLevel, { color: string; desc: string }> = {
  Low: { color: "text-pos", desc: "leading indicators benign — expansion intact" },
  Moderate: { color: "text-warn", desc: "some late-cycle signals firming — watch the curve & jobs" },
  Elevated: { color: "text-neg", desc: "multiple signals flashing — slowdown risk building" },
  High: { color: "text-neg", desc: "broad signal cluster — recession onset likely near" },
};

/** Composite is "bad-up": higher = more risk, so the ring color escalates. */
const LEVEL_RING: Record<RecessionLevel, string> = {
  Low: "var(--pos)",
  Moderate: "var(--warn)",
  Elevated: "var(--neg)",
  High: "var(--neg)",
};

/* ── Risk (0..1) → bar color (low = pos, high = neg) ────────────────────────── */

function riskColor(risk: number): string {
  if (risk >= 0.66) return "var(--neg)";
  if (risk >= 0.33) return "var(--warn)";
  return "var(--pos)";
}

/* ── Signal reading formatter (per indicator id) ───────────────────────────── */

function formatReading(s: RecessionSignal): string {
  switch (s.id) {
    case "yieldCurve":
      return `${fmtSignedPct(s.value, 2).replace("%", "pp")}`;
    case "sahm":
      return `${fmtSignedPct(s.value, 2).replace("%", "pp")}`;
    case "credit":
      return fmtPct(s.value, 2);
    case "lei":
      return fmtSignedPct(s.value, 2);
    default:
      return fmtNum(s.value, 2);
  }
}

/* ── Status badge (identical idiom to yield-curve.tsx / real-rates.tsx) ─────── */

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

export function RecessionRisk() {
  const [status, setStatus] = useState<Status>("loading");
  const [data, setData] = useState<RecessionData | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const r = await fetch("/api/engine/recession", { cache: "no-store" });
      const j = (await r.json()) as LiveResponse;
      if (j.live) {
        setData({
          source: j.source,
          asOf: j.asOf,
          asOfDate: j.asOfDate,
          probability: j.probability,
          compositeRisk: j.compositeRisk,
          level: j.level,
          termSpread: j.termSpread,
          sahmGap: j.sahmGap,
          sahmTriggered: j.sahmTriggered,
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

  /* Signal rows sorted by weight desc, then risk desc. */
  const rows = useMemo<RecessionSignal[]>(() => {
    if (!data) return [];
    return [...data.signals].sort((a, b) => {
      if (b.weight !== a.weight) return b.weight - a.weight;
      return b.risk - a.risk;
    });
  }, [data]);

  const meta = data ? LEVEL_META[data.level] : null;

  return (
    <Panel className="animate-rise">
      <PanelHeader
        title="Recession-Risk Engine"
        sub="Yield-curve probit + Sahm rule + credit stress → 12-month recession probability & composite — computed from FRED"
        right={
          <div className="flex items-center gap-2">
            <StatusBadge status={status} source={data?.source} asOf={asOf} />
            <button
              onClick={load}
              disabled={status === "loading"}
              className="grid h-7 w-7 place-items-center rounded border border-line font-mono text-sm text-dim hover:border-line-strong hover:text-ink disabled:opacity-40"
              aria-label="Refresh recession risk"
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
          {/* ── Hero: probability ring + level headline + composite ── */}
          <div className="grid grid-cols-1 gap-px bg-line lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
            {/* Left: headline level + plain-language read */}
            <div className="space-y-4 bg-base p-4">
              {/* Level headline */}
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className={cn("font-mono text-3xl font-semibold leading-none tracking-tight", meta.color)}>
                  {data.level}
                </span>
                <span className="text-sm text-dim">{meta.desc}</span>
              </div>

              {/* One-line read */}
              <div className="rounded border border-line bg-elevated/20 px-3 py-3">
                <div className="mb-2 section-label text-[11px] text-muted">12-MONTH RECESSION READ</div>
                <p className="text-sm leading-relaxed text-muted">
                  The 10y−3m curve implies a{" "}
                  <span className={cn("font-mono font-medium", signClass(data.probability >= 35 ? -1 : 1))}>
                    {fmtNum(data.probability, 1)}%
                  </span>{" "}
                  chance of recession within 12 months; the multi-signal composite is{" "}
                  <span className={cn("font-medium", meta.color)}>{data.level}</span>.
                </p>
                <p className="mt-2 font-mono text-2xs text-dim">
                  term spread{" "}
                  <span className={signClass(data.termSpread)}>
                    {fmtSignedPct(data.termSpread, 2).replace("%", "pp")}
                  </span>{" "}
                  · sahm gap{" "}
                  <span className={data.sahmGap >= 0.5 ? "text-neg" : "text-muted"}>{fmtNum(data.sahmGap, 2)}pp</span>
                  {data.asOfDate ? <span className="text-faint"> · as of {data.asOfDate}</span> : null}
                </p>
              </div>

              {/* Sahm-rule alert */}
              {data.sahmTriggered ? (
                <div className="flex items-center gap-2">
                  <Chip tone="neg" dot>
                    ⚠ Sahm rule triggered
                  </Chip>
                  <span className="text-2xs text-dim">3-month unemployment ≥0.5pp above its yearly low — recession onset</span>
                </div>
              ) : null}

              {/* Composite-risk bar */}
              <div>
                <div className="mb-1.5 flex items-baseline justify-between">
                  <span className="kpi-label">Composite Risk</span>
                  <span className={cn("font-mono text-sm font-semibold tabular-nums", meta.color)}>
                    {data.compositeRisk}
                    <span className="ml-1 text-2xs text-dim">/100</span>
                  </span>
                </div>
                <ProgressBar
                  value={data.compositeRisk}
                  max={100}
                  color={LEVEL_RING[data.level]}
                  height={8}
                  showGlow
                />
                <p className="mt-1.5 font-mono text-2xs text-faint">
                  weighted blend of all leading signals · 0 = expansion · 100 = recession
                </p>
              </div>
            </div>

            {/* Right: the headline probability ring */}
            <div className="flex items-center gap-4 bg-base p-4">
              <Ring
                value={data.probability}
                max={100}
                size={92}
                stroke={9}
                color={LEVEL_RING[data.level]}
                label={`${fmtNum(data.probability, 0)}%`}
                sub="12-MO"
              />
              <div className="min-w-0 flex-1">
                <div className="kpi-label">Recession Probability</div>
                <div className={cn("mt-1 font-mono text-xl font-semibold tabular-nums", signClass(data.probability >= 35 ? -1 : 1))}>
                  {fmtNum(data.probability, 1)}%
                </div>
                <p className="mt-1.5 text-2xs text-dim">
                  NY Fed yield-curve probit (Estrella-Mishkin) on the 10y−3m term spread
                </p>
                <p className="mt-1 font-mono text-2xs text-faint">12-month forward horizon</p>
              </div>
            </div>
          </div>

          {/* ── Signal-contribution table ── */}
          <div className="overflow-x-auto border-t border-line">
            <table className="w-full min-w-[720px] border-collapse">
              <thead>
                <tr>
                  <Th>Indicator</Th>
                  <Th right>Reading</Th>
                  <Th right>Risk</Th>
                  <Th right>Weight</Th>
                  <Th>Note</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => {
                  const riskPct = Math.max(0, Math.min(100, s.risk * 100));
                  return (
                    <tr key={s.id} className="hover:bg-elevated/40">
                      <Td mono={false} className="font-medium text-ink">
                        {s.label}
                      </Td>
                      <Td right className="text-ink">
                        {formatReading(s)}
                      </Td>
                      <Td right>
                        <div className="flex items-center justify-end gap-2">
                          <span className="h-1 w-12 overflow-hidden rounded-full bg-line" aria-hidden>
                            <span
                              className="block h-full rounded-full"
                              style={{ width: `${riskPct}%`, background: riskColor(s.risk) }}
                            />
                          </span>
                          <span className="w-9 text-right" style={{ color: riskColor(s.risk) }}>
                            {fmtNum(riskPct, 0)}%
                          </span>
                        </div>
                      </Td>
                      <Td right className="text-dim">
                        {fmtNum(s.weight * 100, 0)}%
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

          {/* ── Key indicators deck ── */}
          <div className="grid grid-cols-3 gap-x-4 gap-y-3 border-t border-line px-4 py-3">
            <Stat
              label="Term spread (10y−3m)"
              value={
                <span>
                  {fmtSignedPct(data.termSpread, 2).replace("%", "pp")}
                  {data.termSpread < 0 ? <span className="ml-1.5 text-2xs text-neg">inverted</span> : null}
                </span>
              }
              tone={data.termSpread < 0 ? "neg" : "pos"}
            />
            <Stat
              label="Sahm gap"
              value={
                <span>
                  {fmtNum(data.sahmGap, 2)}pp
                  {data.sahmTriggered ? <span className="ml-1.5 text-2xs text-neg">triggered</span> : null}
                </span>
              }
              tone={data.sahmGap >= 0.5 ? "neg" : "pos"}
            />
            <Stat
              label="Recession prob (12M)"
              value={`${fmtNum(data.probability, 1)}%`}
              tone={data.probability >= 35 ? "neg" : data.probability >= 20 ? "warn" : "pos"}
            />
          </div>
          {data.asOfDate ? (
            <div className="border-t border-line px-4 py-2 font-mono text-2xs text-faint">as of {data.asOfDate}</div>
          ) : null}
        </>
      )}

      <div className="border-t border-line px-4 py-2.5 font-mono text-2xs text-faint">
        The yield-curve probit (Estrella-Mishkin / NY Fed) maps the 10y−3m term spread to a 12-month recession
        probability; the Sahm rule flags a real-time recession onset when 3-month unemployment rises ≥0.5pp above its
        yearly low; credit spreads confirm. Source: FRED.
      </div>
    </Panel>
  );
}
