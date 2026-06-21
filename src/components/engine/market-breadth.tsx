"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Panel, PanelHeader, Stat, Chip, Th, Td } from "@/components/ui/kit";
import { Ring, ProgressBar, Sparkline } from "@/components/ui/viz";
import { fmtNum, fmtSignedPct, signClass } from "@/lib/format";
import { cn } from "@/lib/cn";
import { priceWalk } from "@/lib/rng";
import {
  computeBreadth,
  type Member,
  type BreadthReport,
  type MemberRead,
  type BreadthRegime,
} from "@/lib/engine/breadth";

/* ── Types matching /api/engine/breadth ────────────────────────────────────── */

/** Live payload = the full BreadthReport plus the response envelope fields. */
type BreadthData = BreadthReport & { source: string; asOf: string; universe: number };

type LiveResponse = ({ live: true } & BreadthData) | { live: false };

type Status = "loading" | "live" | "demo";

/* ── Regime presentation (static class maps — no dynamic Tailwind) ──────────── */

const REGIME_META: Record<BreadthRegime, { color: string; ringColor: string }> = {
  "Risk-on": { color: "text-pos", ringColor: "var(--pos)" },
  Neutral: { color: "text-dim", ringColor: "var(--accent)" },
  "Risk-off": { color: "text-neg", ringColor: "var(--neg)" },
};

/** Score / gauge colour by level — leaders pos, mid accent, weak neg. */
const levelColor = (v: number): string => (v >= 60 ? "var(--pos)" : v >= 40 ? "var(--accent)" : "var(--neg)");

/* ── Demo basket ───────────────────────────────────────────────────────────── */

/**
 * 24 believable large-cap tickers paired with a per-name drift. MOST trend up
 * (positive drift → above their 50/200-DMA, near 52-week highs) with a few
 * laggards, so the demo reads constructively. Run through the SAME engine math
 * (computeBreadth) the live route uses.
 */
const DEMO_BASKET: ReadonlyArray<readonly [string, number]> = [
  ["AAPL", 0.0011],
  ["MSFT", 0.0012],
  ["NVDA", 0.0018],
  ["AMZN", 0.001],
  ["GOOGL", 0.0009],
  ["META", 0.0013],
  ["AVGO", 0.0015],
  ["JPM", 0.0008],
  ["V", 0.0009],
  ["UNH", 0.0007],
  ["XOM", 0.0006],
  ["WMT", 0.0008],
  ["MA", 0.0009],
  ["HD", 0.0007],
  ["COST", 0.001],
  ["ORCL", 0.0011],
  ["KO", 0.0005],
  ["PEP", 0.0004],
  ["CRM", 0.0009],
  ["NFLX", 0.0012],
  ["AMD", 0.0007],
  ["INTC", -0.0009], // laggard
  ["DIS", -0.0006], // laggard
  ["MRK", -0.0004], // laggard
];

function buildDemoMembers(): Member[] {
  return DEMO_BASKET.map(([symbol, drift]) => ({
    symbol,
    // ~260 sessions of deterministic closes; modest vol so trends read clean.
    closes: priceWalk(`${symbol}-breadth`, 260, 100, 0.013, drift),
  }));
}

function buildDemo(): BreadthData {
  const report = computeBreadth(buildDemoMembers());
  return { ...report, source: "engine·demo", asOf: new Date().toISOString(), universe: report.members };
}

/* ── DMA dot (static colour classes) ───────────────────────────────────────── */

function DmaDot({ above, title }: { above: boolean; title: string }) {
  return (
    <span
      title={title}
      className={cn("inline-block h-1.5 w-1.5 rounded-full", above ? "bg-pos" : "bg-neg/70")}
    />
  );
}

/* ── Main panel ────────────────────────────────────────────────────────────── */

export function MarketBreadth() {
  const [status, setStatus] = useState<Status>("loading");
  const [data, setData] = useState<BreadthData | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const r = await fetch("/api/engine/breadth", { cache: "no-store" });
      const j = (await r.json()) as LiveResponse;
      if (j.live) {
        // j is { live: true } & BreadthData — assignable to BreadthData (extra `live` ok).
        setData(j);
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

  // Top gainers / laggards split (sort by 1-day return), capped for the table.
  const ranked = useMemo<MemberRead[]>(() => {
    if (!data) return [];
    return [...data.reads].sort((a, b) => b.ret1d - a.ret1d);
  }, [data]);

  const TABLE_CAP = 24;
  const tableRows = ranked.slice(0, TABLE_CAP);
  const moreCount = Math.max(0, ranked.length - TABLE_CAP);

  const regimeMeta = data ? REGIME_META[data.regime] : null;

  return (
    <Panel className="animate-rise">
      <PanelHeader
        title="Market Breadth & Internals"
        sub="Participation under the index — % above 50/200-DMA, advancers, 52w highs/lows, A/D line & McClellan — from Stooq"
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
              aria-label="Refresh market breadth"
            >
              ↻
            </button>
          </div>
        }
      />

      {!data || !regimeMeta ? (
        <div className="grid h-64 place-items-center font-mono text-2xs uppercase tracking-wider text-dim">
          computing…
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-px bg-line lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
          {/* ── Left column: hero + gauges + internals ── */}
          <div className="space-y-4 bg-base p-4">
            {/* Hero: regime + breadth-score ring + one-line read */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
              <Ring
                value={data.breadthScore}
                color={regimeMeta.ringColor}
                size={84}
                stroke={8}
                label={String(data.breadthScore)}
                sub="score"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className={cn("font-mono text-3xl font-semibold leading-none tracking-tight", regimeMeta.color)}>
                    {data.regime}
                  </span>
                  {data.thrust ? (
                    <Chip tone="pos" dot>
                      ⚡ Breadth thrust
                    </Chip>
                  ) : null}
                </div>
                <p className="mt-2 text-sm text-dim">
                  <span className="text-muted">{fmtNum(data.pctAboveSMA200, 0)}%</span> of the{" "}
                  <span className="text-muted">{data.universe}</span>-name universe is above its 200-day average —{" "}
                  {data.pctAboveSMA200 >= 60 ? "broad" : "narrow"} participation
                </p>
              </div>
            </div>

            {/* Participation gauges */}
            <div className="space-y-3 rounded border border-line bg-elevated/10 p-3">
              <div className="section-label">Participation</div>
              <div className="space-y-2.5">
                <div className="flex items-center gap-3">
                  <span className="w-28 shrink-0 text-xs text-muted">% above 50-DMA</span>
                  <ProgressBar
                    value={data.pctAboveSMA50}
                    color={levelColor(data.pctAboveSMA50)}
                    className="flex-1"
                    height={7}
                  />
                  <span className="w-10 shrink-0 text-right font-mono text-xs tabular-nums text-ink">
                    {fmtNum(data.pctAboveSMA50, 0)}%
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-28 shrink-0 text-xs text-muted">% above 200-DMA</span>
                  <ProgressBar
                    value={data.pctAboveSMA200}
                    color={levelColor(data.pctAboveSMA200)}
                    className="flex-1"
                    height={7}
                  />
                  <span className="w-10 shrink-0 text-right font-mono text-xs tabular-nums text-ink">
                    {fmtNum(data.pctAboveSMA200, 0)}%
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-28 shrink-0 text-xs text-muted">High-Low index</span>
                  <ProgressBar
                    value={data.highLowIndex}
                    color={levelColor(data.highLowIndex)}
                    className="flex-1"
                    height={7}
                  />
                  <span className="w-10 shrink-0 text-right font-mono text-xs tabular-nums text-ink">
                    {fmtNum(data.highLowIndex, 0)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Advancers / highs / McClellan deck */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Stat
                label="Advancers / Decliners"
                value={
                  <span>
                    <span className="text-pos">A {data.advancers}</span>
                    <span className="text-faint"> · </span>
                    <span className="text-neg">D {data.decliners}</span>
                  </span>
                }
              />
              <Stat
                label="New Highs / Lows"
                value={
                  <span>
                    <span className="text-pos">NH {data.newHighs}</span>
                    <span className="text-faint"> · </span>
                    <span className="text-neg">NL {data.newLows}</span>
                  </span>
                }
              />
              <Stat
                label="McClellan Osc."
                value={fmtNum(data.mcClellan, 0)}
                tone={data.mcClellan >= 0 ? "pos" : "neg"}
              />
            </div>
          </div>

          {/* ── Right column: A/D line + McClellan note ── */}
          <div className="space-y-3 bg-base p-4">
            <div>
              <div className="section-label">Cumulative A/D Line</div>
              <p className="mt-1 text-2xs text-dim">Running sum of daily net advancers across the basket.</p>
            </div>
            <div
              className="rounded border border-line bg-elevated/10 p-3"
              role="img"
              aria-label="Cumulative advance-decline line"
            >
              {data.adLine.length > 1 ? (
                <Sparkline data={data.adLine} width={300} height={72} className="w-full" />
              ) : (
                <div className="grid h-[72px] place-items-center font-mono text-2xs text-faint">
                  insufficient history
                </div>
              )}
            </div>

            <div className="rounded border border-line bg-elevated/10 p-3">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="section-label">McClellan Oscillator</span>
                <span
                  className={cn("font-mono text-lg font-semibold tabular-nums", signClass(data.mcClellan))}
                  aria-label={`McClellan oscillator ${fmtNum(data.mcClellan, 0)}`}
                >
                  {fmtNum(data.mcClellan, 0)}
                </span>
              </div>
              <p className="text-2xs leading-relaxed text-dim">
                EMA19 − EMA39 of ratio-adjusted net advances.{" "}
                <span className={data.mcClellan >= 0 ? "text-pos" : "text-neg"}>
                  {data.mcClellan >= 0 ? "Positive → breadth improving." : "Negative → breadth deteriorating."}
                </span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Members table ── */}
      {data && tableRows.length ? (
        <div className="overflow-x-auto border-t border-line">
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr>
                <Th>Symbol</Th>
                <Th right>Last</Th>
                <Th right>% from 52w high</Th>
                <Th>50/200-DMA</Th>
                <Th right>1D%</Th>
                <Th right>NH/NL</Th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((r) => (
                <tr key={r.symbol} className="hover:bg-elevated/40">
                  <Td mono={false}>
                    <span className="inline-flex items-center rounded border border-line bg-elevated/70 px-1.5 py-0.5 font-mono text-xs font-medium text-ink">
                      {r.symbol}
                    </span>
                  </Td>
                  <Td right className="text-ink">
                    {fmtNum(r.last)}
                  </Td>
                  <Td right className={r.pctFrom52wHigh >= -0.5 ? "text-pos" : "text-muted"}>
                    {fmtSignedPct(r.pctFrom52wHigh)}
                  </Td>
                  <Td mono={false}>
                    <div className="flex items-center gap-2">
                      <DmaDot above={r.aboveSMA50} title={r.aboveSMA50 ? "above 50-DMA" : "below 50-DMA"} />
                      <DmaDot above={r.aboveSMA200} title={r.aboveSMA200 ? "above 200-DMA" : "below 200-DMA"} />
                    </div>
                  </Td>
                  <Td right className={signClass(r.ret1d)}>
                    {fmtSignedPct(r.ret1d)}
                  </Td>
                  <Td right>
                    {r.newHigh52w ? (
                      <span className="font-mono text-2xs text-pos">NH</span>
                    ) : r.newLow52w ? (
                      <span className="font-mono text-2xs text-neg">NL</span>
                    ) : (
                      <span className="text-faint">—</span>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
          {moreCount > 0 ? (
            <div className="px-4 py-2 font-mono text-2xs text-faint">+{moreCount} more members in the universe</div>
          ) : null}
        </div>
      ) : null}

      {/* ── Footer ── */}
      <div className="border-t border-line px-4 py-2.5 font-mono text-2xs text-faint">
        Breadth measures participation under the index: % of members above their 50/200-day averages, net advancers,
        52-week highs/lows, the cumulative A/D line and the McClellan oscillator (EMA19−EMA39 of ratio-adjusted net
        advances). Source: Stooq (36-name large-cap basket).
      </div>
    </Panel>
  );
}
