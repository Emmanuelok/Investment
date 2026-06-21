"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Panel, PanelHeader, Stat } from "@/components/ui/kit";
import { Ring } from "@/components/ui/viz";
import { fmtNum, fmtUsdCompact, fmtSignedPct, signClass } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Rng } from "@/lib/rng";
import { analyzeLiquidity, type VBar, type LiquidityReport, type LiquidityGrade } from "@/lib/engine/liquidity";

/* ── Types matching /api/engine/liquidity ──────────────────────────────────── */

type Status = "loading" | "live" | "demo";

/** Live payload = the engine report plus provenance fields. */
type LiquidityLive = LiquidityReport & {
  live: true;
  source: string;
  asOf: string;
  symbol: string;
};
type LiquidityResponse = LiquidityLive | { live: false };

/* ── Presentation maps (static — no dynamic text-${} classes) ──────────────── */

const GRADE_COLOR: Record<LiquidityGrade, string> = {
  "Very liquid": "text-pos",
  Liquid: "text-pos",
  Moderate: "text-warn",
  Thin: "text-neg",
};

const GRADE_RING: Record<LiquidityGrade, string> = {
  "Very liquid": "var(--pos)",
  Liquid: "var(--pos)",
  Moderate: "var(--warn)",
  Thin: "var(--neg)",
};

const GRADE_TONE: Record<LiquidityGrade, "pos" | "warn" | "neg"> = {
  "Very liquid": "pos",
  Liquid: "pos",
  Moderate: "warn",
  Thin: "neg",
};

/** A short qualitative read on tradeability, keyed off the grade. */
const GRADE_DESC: Record<LiquidityGrade, string> = {
  "Very liquid": "deep, easily tradeable",
  Liquid: "ample depth for most clips",
  Moderate: "tradeable but size with care",
  Thin: "shallow — work orders patiently",
};

/** Roll-spread tone: tight spreads are cheap to cross, wide ones are costly. */
function spreadTone(bps: number): "pos" | "warn" | "neg" {
  if (bps <= 5) return "pos";
  if (bps <= 20) return "warn";
  return "neg";
}

/** A coarse clip the book can likely absorb without undue impact (~3% of ADV $). */
function clipFromDollarVolume(dv: number): string {
  return fmtUsdCompact(dv * 0.03);
}

/* ── Demo data (deep large-cap: close ~120, volume ~3e8 → ~$36B/day) ───────── */

function buildDemo(): LiquidityReport {
  const rng = new Rng("LIQ-demo-NVDA");
  const bars: VBar[] = [];
  let c = 120;
  const anchor = 120;
  for (let i = 0; i < 250; i++) {
    // Mild mean-reverting bid/ask bounce so Roll's serial covariance is negative.
    const drift = (anchor - c) * 0.05;
    const bounce = rng.gauss(0, 0.9);
    c = Math.max(1, c + drift + bounce);
    const v = Math.round(3e8 * rng.float(0.7, 1.3));
    bars.push({ c, v });
  }
  return analyzeLiquidity(bars);
}

/* ── Component ─────────────────────────────────────────────────────────────── */

export function LiquidityPanel({ symbol }: { symbol: string }) {
  const [status, setStatus] = useState<Status>("loading");
  const [report, setReport] = useState<LiquidityReport | null>(null);
  const [source, setSource] = useState("");
  const [asOf, setAsOf] = useState("");

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const r = await fetch(`/api/engine/liquidity?symbol=${encodeURIComponent(symbol)}`, { cache: "no-store" });
      const j = (await r.json()) as LiquidityResponse;
      if (j.live) {
        const { live: _live, source: src, asOf: ts, symbol: _sym, ...rest } = j;
        setReport(rest);
        setSource(src);
        setAsOf(new Date(ts).toLocaleTimeString("en-US", { hour12: false }));
        setStatus("live");
      } else {
        setReport(buildDemo());
        setSource("engine·Stooq");
        setStatus("demo");
      }
    } catch {
      setReport(buildDemo());
      setSource("engine·Stooq");
      setStatus("demo");
    }
  }, [symbol]);

  useEffect(() => {
    load();
  }, [load]);

  const rep = report ?? buildDemo();
  const grade = rep.grade;
  const gradeColor = GRADE_COLOR[grade];
  const dvClip = useMemo(() => clipFromDollarVolume(rep.avgDollarVolume), [rep.avgDollarVolume]);
  const rollTone = spreadTone(rep.rollSpreadBps);

  return (
    <Panel className="animate-rise" aria-label={`Liquidity profile for ${symbol}`}>
      <PanelHeader
        title={`Liquidity — ${symbol}`}
        sub="Microstructure engine · dollar volume, Amihud price impact & Roll implied spread"
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
                ENGINE · LIVE · {source}
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
              aria-label="Refresh liquidity"
            >
              ↻
            </button>
          </div>
        }
      />

      {!report && status === "loading" ? (
        <div className="grid h-64 place-items-center font-mono text-2xs uppercase tracking-wider text-dim">computing…</div>
      ) : (
        <>
          {/* 1 ── Hero: grade + score ring + headline read */}
          <div className="flex flex-col gap-4 border-b border-line px-4 py-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-5">
              <div className="flex flex-col">
                <span className="kpi-label">Liquidity grade</span>
                <span className={cn("font-mono text-4xl font-semibold leading-none tracking-tight", gradeColor)}>{grade}</span>
                <span className="mt-1.5 font-mono text-2xs text-faint">{rep.bars} sessions</span>
              </div>
              <Ring
                value={rep.liquidityScore}
                max={100}
                size={84}
                stroke={8}
                color={GRADE_RING[grade]}
                label={fmtNum(rep.liquidityScore, 0)}
                sub="SCORE"
              />
            </div>

            <div className="min-w-0 flex-1 space-y-1.5 sm:border-l sm:border-line sm:pl-5">
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <span>
                  <span className="kpi-label">Score</span>{" "}
                  <span className={cn("font-mono text-lg font-medium", gradeColor)}>{fmtNum(rep.liquidityScore, 0)}</span>
                  <span className="text-dim">/100</span>
                </span>
                <span>
                  <span className="kpi-label">Implied spread</span>{" "}
                  <span className={cn("font-mono text-lg font-medium", gradeColor)}>{fmtNum(rep.rollSpreadBps, 1)} bps</span>
                </span>
              </div>
              <p className="text-sm text-dim">
                <span className={gradeColor}>{GRADE_DESC[grade]}</span> — ~{fmtUsdCompact(rep.avgDollarVolume)}/day at a{" "}
                <span className="text-muted">{fmtNum(rep.rollSpreadBps, 1)} bp</span> implied spread.
              </p>
            </div>
          </div>

          {/* 2 ── Metrics deck */}
          <div className="grid grid-cols-2 gap-px border-b border-line bg-line sm:grid-cols-4">
            <div className="bg-panel px-4 py-3">
              <Stat label="Avg dollar volume" value={fmtUsdCompact(rep.avgDollarVolume)} tone={GRADE_TONE[grade]} />
            </div>
            <div className="bg-panel px-4 py-3">
              <Stat label="Implied spread (Roll)" value={`${fmtNum(rep.rollSpreadBps, 1)} bps`} tone={rollTone} />
            </div>
            <div className="bg-panel px-4 py-3">
              <Stat label="Amihud (per $1M)" value={fmtNum(rep.amihud, 6)} tone={rep.amihud <= 0.01 ? "pos" : rep.amihud <= 0.1 ? "warn" : "neg"} />
            </div>
            <div className="bg-panel px-4 py-3">
              <Stat label="Volume trend" value={fmtSignedPct(rep.volumeTrend * 100, 1)} tone={rep.volumeTrend >= 0 ? "pos" : "neg"} />
            </div>
          </div>

          {/* 3 ── Interpretation for an execution desk */}
          <div className="px-4 py-3">
            <div className="kpi-label mb-2 flex items-center gap-1.5 text-faint">
              <span className="h-1.5 w-1.5 rounded-full bg-dim" /> Execution read
            </div>
            <ul className="space-y-1.5 text-sm text-dim">
              <li>
                <span className="text-muted">{fmtUsdCompact(rep.avgDollarVolume)}/day</span> traded — the book can typically
                absorb a <span className="text-muted">~{dvClip}</span> clip without leaning on price.
              </li>
              <li>
                A <span className={signClass(rep.rollSpreadBps === 0 ? 0 : -rep.rollSpreadBps)}>{fmtNum(rep.rollSpreadBps, 1)} bp</span>{" "}
                Roll spread is the round-trip cost of crossing; Amihud of{" "}
                <span className="text-muted">{fmtNum(rep.amihud, 6)}</span> sets the price impact per $1M of flow.
              </li>
              <li>
                Participation is{" "}
                <span className={rep.volumeTrend >= 0 ? "text-pos" : "text-neg"}>
                  {rep.volumeTrend >= 0 ? "rising" : "falling"} {fmtSignedPct(rep.volumeTrend * 100, 1)}
                </span>{" "}
                versus its baseline — {rep.volumeTrend >= 0 ? "more cover for size" : "thinner cover, scale back clip size"}.
              </li>
            </ul>
          </div>
        </>
      )}

      {/* Footer */}
      <div className="border-t border-line px-4 py-2.5 font-mono text-2xs text-faint">
        Dollar volume is the first-order liquidity measure; Amihud (2002) gauges price impact per dollar traded; Roll (1984)
        infers the effective spread from the negative serial covariance of returns. Source: Stooq daily price × volume.
      </div>
    </Panel>
  );
}
