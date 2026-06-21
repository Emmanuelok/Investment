"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Panel, PanelHeader, Chip, Stat, Th, Td } from "@/components/ui/kit";
import { ProgressBar } from "@/components/ui/viz";
import { fmtNum } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Rng } from "@/lib/rng";
import {
  screenPairs,
  type PriceSeries,
  type PairCandidate,
  type PairScreenReport,
} from "@/lib/engine/pairs-screener";
import type { PairSignal } from "@/lib/engine/pairs";

/* ── Types matching /api/engine/pairs-screener ─────────────────────────────────
   The wire serializes Infinity → null, so the fetched half-life is number | null.
   `score` becomes 0..100; everything else mirrors PairCandidate.                */

type WirePair = Omit<PairCandidate, "halfLife"> & { halfLife: number | null };

type LiveResponse =
  | (Omit<PairScreenReport, "pairs"> & {
      live: true;
      source: string;
      asOf: string;
      universe: number;
      pairs: WirePair[];
    })
  | { live: false };

/* Display row — half-life normalized to number | null (null/Infinity → "∞"). */
type Row = Omit<PairCandidate, "halfLife"> & { halfLife: number | null };

type ScreenData = {
  source: string;
  asOf: string;
  universe: number;
  scanned: number;
  tradeableCount: number;
  pairs: Row[];
};

type Status = "loading" | "live" | "demo";

/* ── Signal → presentation (Chip tone + label) ─────────────────────────────────
   LONG_SPREAD → pos · SHORT_SPREAD → neg · EXIT → warn · FLAT → dim/default.    */

const SIGNAL_TONE: Record<PairSignal, "pos" | "neg" | "warn" | "default"> = {
  LONG_SPREAD: "pos",
  SHORT_SPREAD: "neg",
  EXIT: "warn",
  FLAT: "default",
};

const SIGNAL_LABEL: Record<PairSignal, string> = {
  LONG_SPREAD: "LONG SPREAD",
  SHORT_SPREAD: "SHORT SPREAD",
  EXIT: "EXIT",
  FLAT: "FLAT",
};

/* ── Tone helpers (static class maps — no dynamic Tailwind) ─────────────────── */

/** Correlation strength → colour (stronger relationship reads greener). */
function corrClass(c: number): string {
  const a = Math.abs(c);
  if (a >= 0.8) return "text-pos";
  if (a >= 0.5) return "text-warn";
  return "text-dim";
}

/** Half-life tone — shorter = faster mean reversion = better (pos). */
function halfLifeClass(hl: number | null): string {
  if (hl === null || !Number.isFinite(hl)) return "text-faint";
  if (hl < 10) return "text-pos";
  if (hl < 30) return "text-warn";
  return "text-muted";
}

/** Z-score tone — |z| ≥ 2 is the entry trigger (warn), beyond 3 is stretched. */
function zClass(z: number): string {
  const a = Math.abs(z);
  if (a >= 3) return "text-neg";
  if (a >= 2) return "text-warn";
  return "text-muted";
}

const fmtZ = (z: number) => `${z >= 0 ? "+" : ""}${fmtNum(z, 2)}σ`;
const fmtHalfLife = (hl: number | null) =>
  hl === null || !Number.isFinite(hl) ? "∞" : `${fmtNum(hl, 0)} bars`;

/* ── Demo universe ─────────────────────────────────────────────────────────────
   ~6 seeded PriceSeries. KO & PEP are CONSTRUCTED to cointegrate: they share a
   dominant common random-walk log-price trend (vol ~0.02) plus a small,
   persistent idiosyncratic AR(1) spread (scale ~0.006, φ ~0.92). That makes
   return-correlation high AND the spread mean-reverts with a short half-life.
   The remaining names are unrelated GBM walks. Run through the real engine.    */

const DEMO_N = 260;

/** Common log-price trend shared by the cointegrating pair (the dominant term). */
function commonTrend(seed: string, n: number, startLog: number): number[] {
  const r = new Rng(seed);
  const out: number[] = [startLog];
  for (let i = 1; i < n; i++) out.push(out[i - 1] + r.gauss(0.0003, 0.02));
  return out;
}

/** Small persistent AR(1) spread: x_t = φ·x_{t-1} + ε. */
function ar1(seed: string, n: number, phi: number, scale: number): number[] {
  const r = new Rng(seed);
  const out: number[] = [0];
  for (let i = 1; i < n; i++) out.push(phi * out[i - 1] + r.gauss(0, scale));
  return out;
}

/** Plain geometric walk for the unrelated names. */
function walk(seed: string, n: number, start: number, vol: number, drift: number): number[] {
  const r = new Rng(seed);
  const out: number[] = [start];
  for (let i = 1; i < n; i++) out.push(Math.max(0.5, out[i - 1] * (1 + r.gauss(drift, vol))));
  return out;
}

function buildDemo(): ScreenData {
  const trend = commonTrend("pairscr-trend", DEMO_N, Math.log(60));
  const koSpread = ar1("ko-A", DEMO_N, 0.92, 0.006);
  const pepSpread = ar1("pep-B", DEMO_N, 0.92, 0.006);

  const series: PriceSeries[] = [
    { sym: "KO", closes: trend.map((t, i) => Math.exp(t + koSpread[i])) },
    { sym: "PEP", closes: trend.map((t, i) => Math.exp(t + 0.1 + pepSpread[i])) },
    { sym: "NVDA", closes: walk("pairscr-nvda", DEMO_N, 480, 0.028, 0.0012) },
    { sym: "TLT", closes: walk("pairscr-tlt", DEMO_N, 95, 0.012, -0.0002) },
    { sym: "WMT", closes: walk("pairscr-wmt", DEMO_N, 160, 0.015, 0.0005) },
    { sym: "XLE", closes: walk("pairscr-xle", DEMO_N, 85, 0.02, 0.0003) },
  ];

  const report = screenPairs(series, { window: 90 });
  const pairs: Row[] = report.pairs.map((p) => ({
    ...p,
    halfLife: Number.isFinite(p.halfLife) ? p.halfLife : null,
  }));

  return {
    source: "demo",
    asOf: "",
    universe: series.length,
    scanned: report.scanned,
    tradeableCount: report.tradeableCount,
    pairs,
  };
}

/* ── Status badge (canonical engine badges) ───────────────────────────────────*/

function StatusBadge({ status, source, asOf }: { status: Status; source?: string; asOf?: string }) {
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

/* ── Main panel ───────────────────────────────────────────────────────────────*/

export function PairsScreener() {
  const [status, setStatus] = useState<Status>("loading");
  const [data, setData] = useState<ScreenData | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const r = await fetch("/api/engine/pairs-screener", { cache: "no-store" });
      const j = (await r.json()) as LiveResponse;
      if (j.live) {
        setData({
          source: j.source,
          asOf: j.asOf,
          universe: j.universe,
          scanned: j.scanned,
          tradeableCount: j.tradeableCount,
          pairs: j.pairs.map((p) => ({
            ...p,
            halfLife: p.halfLife !== null && Number.isFinite(p.halfLife) ? p.halfLife : null,
          })),
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

  const top = data?.pairs[0] ?? null;
  const topTone = top ? SIGNAL_TONE[top.signal] : "default";

  return (
    <Panel className="animate-rise">
      <PanelHeader
        title="Pairs / Stat-Arb Screener"
        sub="Universe-wide cointegration scan · ranks every pair by correlation, OU half-life & spread z — from Stooq"
        right={
          <div className="flex items-center gap-2">
            <StatusBadge status={status} source={data?.source} asOf={asOf} />
            <button
              onClick={load}
              disabled={status === "loading"}
              className="grid h-7 w-7 place-items-center rounded border border-line font-mono text-sm text-dim hover:border-line-strong hover:text-ink disabled:opacity-40"
              aria-label="Refresh pairs screener"
            >
              ↻
            </button>
          </div>
        }
      />

      {!data ? (
        <div className="grid h-64 place-items-center font-mono text-2xs uppercase tracking-wider text-dim">computing…</div>
      ) : (
        <>
          {/* ── Hero: headline + top opportunity ── */}
          <div className="space-y-4 border-b border-line p-4">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-mono text-3xl font-semibold leading-none tracking-tight text-ink">Pairs Screener</span>
              <span className="text-sm text-dim">
                <span className={cn(data.tradeableCount > 0 ? "text-pos" : "text-dim")}>
                  {data.tradeableCount} tradeable
                </span>{" "}
                of {data.scanned} scanned across {data.universe} names
              </span>
            </div>

            {top ? (
              <div className="rounded border border-line bg-elevated/10 p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xl font-semibold tracking-tight text-ink">
                      {top.a} <span className="text-faint">↔</span> {top.b}
                    </span>
                    {top.tradeable ? <Chip tone="pos" dot>TRADEABLE</Chip> : <Chip tone="default">NO EDGE</Chip>}
                  </div>
                  <Chip tone={topTone} dot={topTone === "pos" || topTone === "neg"}>
                    {top.action}
                  </Chip>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Stat label="Score" value={`${top.score} / 100`} tone="accent" />
                  <Stat label="Correlation" value={fmtNum(top.correlation, 2)} tone={Math.abs(top.correlation) >= 0.8 ? "pos" : undefined} />
                  <Stat
                    label="Half-Life"
                    value={<span className={halfLifeClass(top.halfLife)}>{fmtHalfLife(top.halfLife)}</span>}
                  />
                  <Stat
                    label="Current Z"
                    value={fmtZ(top.zLast)}
                    tone={Math.abs(top.zLast) >= 2 ? (top.zLast > 0 ? "neg" : "pos") : "muted"}
                  />
                </div>

                <p className="mt-3 text-xs text-muted">
                  {top.tradeable ? (
                    <>
                      Best relationship: <span className="text-ink">{top.a}/{top.b}</span> tracks at{" "}
                      <span className={corrClass(top.correlation)}>{fmtNum(top.correlation, 2)}</span> correlation and mean-reverts with a{" "}
                      <span className={halfLifeClass(top.halfLife)}>{fmtHalfLife(top.halfLife)}</span> half-life.{" "}
                      {Math.abs(top.zLast) >= 2 ? (
                        <>
                          The spread is stretched to <span className={zClass(top.zLast)}>{fmtZ(top.zLast)}</span> — past the ±2σ trigger.{" "}
                          <span className="text-ink">{top.action}</span> and ride it back to the mean.
                        </>
                      ) : (
                        <>
                          The spread sits at <span className={zClass(top.zLast)}>{fmtZ(top.zLast)}</span> — inside the ±2σ band, so wait for an extreme.
                        </>
                      )}
                    </>
                  ) : (
                    <>No pair clears the tradeability bar (corr &gt; 0.5 with a finite, short half-life) right now — the screener stays flat.</>
                  )}
                </p>
              </div>
            ) : (
              <div className="rounded border border-line bg-elevated/10 p-3 text-xs text-dim">No pairs returned.</div>
            )}
          </div>

          {/* ── Ranked pairs table ── */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse">
              <thead>
                <tr>
                  <Th>Pair</Th>
                  <Th right>Correlation</Th>
                  <Th right>Half-Life</Th>
                  <Th right>Z-Score</Th>
                  <Th right>Hedge β</Th>
                  <Th>Signal</Th>
                  <Th>Trade</Th>
                  <Th right>Score</Th>
                </tr>
              </thead>
              <tbody>
                {data.pairs.map((p) => (
                  <tr
                    key={`${p.a}-${p.b}`}
                    className={cn("transition-colors hover:bg-elevated/40", p.tradeable ? "bg-pos/5" : undefined)}
                  >
                    <Td className="text-ink">
                      {p.a} <span className="text-faint">↔</span> {p.b}
                    </Td>
                    <Td right className={corrClass(p.correlation)}>
                      {fmtNum(p.correlation, 2)}
                    </Td>
                    <Td right className={halfLifeClass(p.halfLife)}>
                      {fmtHalfLife(p.halfLife)}
                    </Td>
                    <Td right className={zClass(p.zLast)}>
                      {fmtZ(p.zLast)}
                    </Td>
                    <Td right className="text-muted">
                      {fmtNum(p.hedgeRatio, 2)}
                    </Td>
                    <Td>
                      <Chip tone={SIGNAL_TONE[p.signal]} dot={p.signal === "LONG_SPREAD" || p.signal === "SHORT_SPREAD"}>
                        {SIGNAL_LABEL[p.signal]}
                      </Chip>
                    </Td>
                    <Td className={p.tradeable ? "text-pos" : "text-faint"}>{p.tradeable ? "✓" : "—"}</Td>
                    <Td right>
                      <div className="flex items-center justify-end gap-2">
                        <span className={cn("tabular-nums", p.tradeable ? "text-ink" : "text-muted")}>{p.score}</span>
                        <ProgressBar
                          value={p.score}
                          max={100}
                          color={p.tradeable ? "var(--pos)" : "var(--dim)"}
                          height={5}
                          className="w-16"
                        />
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="border-t border-line px-4 py-2.5 font-mono text-2xs text-faint">
        Every pair is run through cointegration / OU half-life / z-score analysis and ranked by tradeability — return
        correlation, mean-reversion speed (half-life) and how stretched the spread is now (|z|). |z| ≥ 2 is the entry
        trigger; trade the spread back to its mean. Source: Stooq.
      </div>
    </Panel>
  );
}
