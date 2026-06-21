"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Panel, PanelHeader, Stat, Chip, Th, Td } from "@/components/ui/kit";
import { Ring, ProgressBar } from "@/components/ui/viz";
import { fmtNum, fmtSignedPct, signClass } from "@/lib/format";
import { cn } from "@/lib/cn";
import { priceWalk } from "@/lib/rng";
import {
  buildDollarRegime,
  type FxSeries,
  type FxRead,
  type DollarReport,
  type DollarRegime as DollarRegimeT,
} from "@/lib/engine/dollar-regime";

/* ── Types matching /api/engine/dollar-regime ───────────────────────────────── */

/** The live route spreads `...report` plus source/asOf/dollarSymbol. */
type LiveResponse =
  | ({
      live: true;
      source: string;
      asOf: string;
      dollarSymbol: string;
    } & DollarReport)
  | { live: false };

/** Rendered shape — the computed engine report plus provenance. */
type DollarData = DollarReport & {
  source?: string;
  asOf?: string;
  dollarSymbol?: string;
};

type Status = "loading" | "live" | "demo";

/* ── Regime presentation (static maps; no dynamic Tailwind) ─────────────────── */

/* A strong, rising dollar is a tightening / risk-off signal (neg); a weak dollar
   eases conditions (pos); neutral is muted. */
const REGIME_META: Record<DollarRegimeT, { color: string; desc: string }> = {
  Strong: { color: "text-neg", desc: "rising vs its trend — tightening global conditions (risk-off)" },
  Neutral: { color: "text-dim", desc: "no decisive trend — mixed cross-asset impulse" },
  Weak: { color: "text-pos", desc: "falling vs its trend — easing global conditions (risk-on)" },
};

/** Ring color tracks the same risk read as the headline. */
const REGIME_RING: Record<DollarRegimeT, string> = {
  Strong: "var(--neg)",
  Neutral: "var(--dim)",
  Weak: "var(--pos)",
};

/* ── Trend chip tone (Up → strengthening vs USD, i.e. dollar weakening) ─────── */

const TREND_TONE: Record<FxRead["trend"], "pos" | "neg" | "default"> = {
  Up: "pos",
  Flat: "default",
  Down: "neg",
};

/* ── Demo fallback (sandbox returns { live:false }) ─────────────────────────── */

/**
 * Seeded series that drive the SAME engine math (buildDollarRegime) to a
 * believable "Strong" dollar read: the dollar proxy walks up with positive
 * drift (so it ends above its 200-DMA with a positive 3m return → Strong), while
 * the currency basket mostly drifts DOWN versus the dollar (a strong dollar
 * weakens them) with the franc and yen a touch firmer. ~260 closes each ≈ 1y of
 * trading days. Labels mirror the live currency ETFs (FXE/FXY/FXB/FXF/FXC/FXA).
 */
type DemoSpec = { id: string; label: string; drift: number; vol: number };

const DEMO_DOLLAR: DemoSpec = { id: "uup", label: "US Dollar Index", drift: 0.0011, vol: 0.004 };

const DEMO_CURRENCIES: ReadonlyArray<DemoSpec> = [
  { id: "chf", label: "Swiss Franc", drift: 0.0004, vol: 0.004 }, // firmest (safe haven holds up)
  { id: "jpy", label: "Japanese Yen", drift: -0.0006, vol: 0.005 },
  { id: "eur", label: "Euro", drift: -0.0012, vol: 0.004 },
  { id: "gbp", label: "British Pound", drift: -0.0015, vol: 0.005 },
  { id: "cad", label: "Canadian Dollar", drift: -0.0018, vol: 0.004 },
  { id: "aud", label: "Australian Dollar", drift: -0.0022, vol: 0.006 }, // weakest (high-beta to USD)
];

function buildDemo(): DollarData {
  const dollarCloses = priceWalk(`dollar-${DEMO_DOLLAR.id}`, 260, 100, DEMO_DOLLAR.vol, DEMO_DOLLAR.drift);
  const currencies: FxSeries[] = DEMO_CURRENCIES.map((c) => ({
    id: c.id,
    label: c.label,
    closes: priceWalk(`fx-${c.id}`, 260, 100, c.vol, c.drift),
  }));
  return { ...buildDollarRegime(dollarCloses, currencies), source: "demo", asOf: "2026-05-01", dollarSymbol: "UUP" };
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

export function DollarRegime() {
  const [status, setStatus] = useState<Status>("loading");
  const [data, setData] = useState<DollarData | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const r = await fetch("/api/engine/dollar-regime", { cache: "no-store" });
      const j = (await r.json()) as LiveResponse;
      if (j.live) {
        setData({
          dollarRegime: j.dollarRegime,
          dollarRet1m: j.dollarRet1m,
          dollarRet3m: j.dollarRet3m,
          dollarAboveSMA200: j.dollarAboveSMA200,
          dollarPercentile: j.dollarPercentile,
          currencies: j.currencies,
          strongest: j.strongest,
          weakest: j.weakest,
          riskImplication: j.riskImplication,
          source: j.source,
          asOf: j.asOf,
          dollarSymbol: j.dollarSymbol,
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

  const meta = data ? REGIME_META[data.dollarRegime] : null;
  const isStrong = data?.dollarRegime === "Strong";
  const isWeak = data?.dollarRegime === "Weak";

  /* Callout tone: strong → neg-toned, weak → pos-toned, neutral → muted. */
  const calloutClass = isStrong
    ? "border-neg/30 bg-neg/5"
    : isWeak
      ? "border-pos/30 bg-pos/5"
      : "border-line bg-elevated/20";
  const calloutDot = isStrong ? "bg-neg" : isWeak ? "bg-pos" : "bg-dim";

  return (
    <Panel className="animate-rise">
      <PanelHeader
        title="Dollar-Regime Engine"
        sub="Dollar-index trend, momentum & percentile + a currency basket → Strong/Neutral/Weak regime & risk impulse — from Stooq"
        right={
          <div className="flex items-center gap-2">
            <StatusBadge status={status} source={data?.source} asOf={asOf} />
            <button
              onClick={load}
              disabled={status === "loading"}
              className="grid h-7 w-7 place-items-center rounded border border-line font-mono text-sm text-dim hover:border-line-strong hover:text-ink disabled:opacity-40"
              aria-label="Refresh dollar regime"
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
          {/* ── Hero: regime headline + read + risk callout · percentile ring ── */}
          <div className="grid grid-cols-1 gap-px bg-line lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
            {/* Left: regime headline + plain-language read + risk callout */}
            <div className="space-y-4 bg-base p-4">
              {/* Regime headline */}
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className={cn("font-mono text-3xl font-semibold leading-none tracking-tight", meta.color)}>
                  {data.dollarRegime} Dollar
                </span>
                <span className="text-sm text-dim">{meta.desc}</span>
              </div>

              {/* One-line read */}
              <div className="rounded border border-line bg-elevated/20 px-3 py-3">
                <div className="mb-2 section-label text-[11px] text-muted">DOLLAR READ</div>
                <p className="text-sm leading-relaxed text-muted">
                  The dollar is{" "}
                  <span className={cn("font-medium", meta.color)}>{data.dollarRegime.toLowerCase()}</span> — its 3-month
                  return is{" "}
                  <span className={cn("font-mono font-medium", signClass(data.dollarRet3m))}>
                    {fmtSignedPct(data.dollarRet3m)}
                  </span>{" "}
                  and it sits {data.dollarAboveSMA200 ? "above" : "below"} its 200-day average at the{" "}
                  <span className="font-mono font-medium text-ink">{fmtNum(data.dollarPercentile, 0)}th</span> percentile of
                  its own range.
                </p>
                <p className="mt-2 font-mono text-2xs text-dim">
                  1m{" "}
                  <span className={signClass(data.dollarRet1m)}>{fmtSignedPct(data.dollarRet1m)}</span> · 3m{" "}
                  <span className={signClass(data.dollarRet3m)}>{fmtSignedPct(data.dollarRet3m)}</span> ·{" "}
                  {data.dollarAboveSMA200 ? "above" : "below"} 200-DMA
                  {data.dollarSymbol ? <span className="text-faint"> · {data.dollarSymbol}</span> : null}
                </p>
              </div>

              {/* Percentile bar (high = an expensive / stretched dollar) */}
              <div>
                <div className="mb-1.5 flex items-baseline justify-between">
                  <span className="kpi-label">Dollar Percentile</span>
                  <span className={cn("font-mono text-sm font-semibold tabular-nums", meta.color)}>
                    {fmtNum(data.dollarPercentile, 0)}
                    <span className="ml-1 text-2xs text-dim">/100</span>
                  </span>
                </div>
                <ProgressBar value={data.dollarPercentile} max={100} color={REGIME_RING[data.dollarRegime]} height={8} showGlow />
                <p className="mt-1.5 font-mono text-2xs text-faint">
                  level within its 2-year range · high = an expensive, stretched dollar · low = cheap
                </p>
              </div>

              {/* Risk-implication callout (strong → neg-toned, weak → pos-toned) */}
              <div className={cn("rounded border px-3 py-2.5", calloutClass)}>
                <div className="mb-1.5 flex items-center gap-1.5 font-mono text-2xs uppercase tracking-wider text-muted">
                  <span className={cn("h-1.5 w-1.5 rounded-full", calloutDot)} /> Risk implication
                </div>
                <p className="text-sm leading-relaxed text-muted">{data.riskImplication}</p>
              </div>
            </div>

            {/* Right: percentile ring + strongest / weakest currency */}
            <div className="flex items-center gap-4 bg-base p-4">
              <Ring
                value={data.dollarPercentile}
                max={100}
                size={92}
                stroke={9}
                color={REGIME_RING[data.dollarRegime]}
                label={`${fmtNum(data.dollarPercentile, 0)}%`}
                sub="PCTILE"
              />
              <div className="min-w-0 flex-1">
                <div className="kpi-label">Strongest vs USD</div>
                <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-pos">
                  {data.strongest ?? "—"}
                </div>
                <div className="mt-2 kpi-label">Weakest vs USD</div>
                <div className="mt-0.5 font-mono text-sm font-medium tabular-nums text-neg">
                  {data.weakest ?? "—"}
                </div>
                <p className="mt-2 text-2xs text-dim">
                  strongest currency = where the dollar is losing the most ground
                </p>
              </div>
            </div>
          </div>

          {/* ── Currency leaderboard (sorted strongest-vs-USD first) ── */}
          <div className="overflow-x-auto border-t border-line">
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr>
                  <Th>Currency</Th>
                  <Th right>1M vs USD</Th>
                  <Th right>3M vs USD</Th>
                  <Th right>6M vs USD</Th>
                  <Th right>200-DMA</Th>
                  <Th right>Trend</Th>
                </tr>
              </thead>
              <tbody>
                {data.currencies.map((c) => (
                  <tr key={c.id} className="hover:bg-elevated/40">
                    <Td mono={false} className="font-medium text-ink">
                      {c.label}
                    </Td>
                    <Td right className={signClass(c.ret1m)}>
                      {fmtSignedPct(c.ret1m)}
                    </Td>
                    <Td right className={signClass(c.ret3m)}>
                      {fmtSignedPct(c.ret3m)}
                    </Td>
                    <Td right className={signClass(c.ret6m)}>
                      {fmtSignedPct(c.ret6m)}
                    </Td>
                    <Td right className={c.aboveSMA200 ? "text-pos" : "text-neg"}>
                      {c.aboveSMA200 ? "above" : "below"}
                    </Td>
                    <Td right>
                      <Chip tone={TREND_TONE[c.trend]}>{c.trend}</Chip>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="px-3 py-2 font-mono text-2xs text-faint">
              Returns are each currency vs the US dollar — a rising currency (positive return, Up trend) means a
              weakening dollar against it.
            </p>
          </div>

          {/* ── Key dollar deck ── */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line px-4 py-3 sm:grid-cols-4">
            <Stat
              label="Dollar 3M return"
              value={fmtSignedPct(data.dollarRet3m)}
              tone={data.dollarRet3m > 0 ? "neg" : "pos"}
            />
            <Stat
              label="Dollar 1M return"
              value={fmtSignedPct(data.dollarRet1m)}
              tone={data.dollarRet1m > 0 ? "neg" : "pos"}
            />
            <Stat label="Dollar percentile" value={`${fmtNum(data.dollarPercentile, 0)}th`} tone="accent" />
            <Stat
              label="Above 200-DMA"
              value={<Chip tone={data.dollarAboveSMA200 ? "neg" : "pos"}>{data.dollarAboveSMA200 ? "Yes" : "No"}</Chip>}
              mono={false}
            />
          </div>
        </>
      )}

      <div className="border-t border-line px-4 py-2.5 font-mono text-2xs text-faint">
        The dollar is the world&apos;s risk thermostat: a strong, rising dollar tightens global financial conditions (a
        headwind for EM, commodities and US exporters); a weak dollar eases them. Regime from the dollar index&apos;s
        trend, momentum and historical percentile. Source: Stooq (UUP + currency ETFs).
      </div>
    </Panel>
  );
}
