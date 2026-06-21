"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Panel, PanelHeader, Stat, Chip, Th, Td } from "@/components/ui/kit";
import { fmtNum, fmtSignedPct, signClass } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Rng } from "@/lib/rng";
import {
  buildTrendFollowing,
  type TsAsset,
  type TrendReport,
  type TsSignal,
  type TsDirection,
  type TrendRegime,
} from "@/lib/engine/trend-following";

/* ── Types matching /api/engine/trend-following ─────────────────────────────── */

/** Live payload = the full TrendReport plus the response envelope fields. */
type TrendData = TrendReport & { source: string; asOf: string; universe: number };

type LiveResponse = ({ live: true } & TrendData) | { live: false };

type Status = "loading" | "live" | "demo";

/* ── Regime presentation (static class maps — no dynamic `text-${}`) ─────────── */

const REGIME_META: Record<TrendRegime, { color: string; word: string }> = {
  "Strong trends": { color: "text-pos", word: "strong" },
  Mixed: { color: "text-warn", word: "mixed" },
  Choppy: { color: "text-dim", word: "choppy" },
};

const SIGNAL_META: Record<TsDirection, { tone: "pos" | "neg" | "default"; color: string }> = {
  Long: { tone: "pos", color: "text-pos" },
  Short: { tone: "neg", color: "text-neg" },
  Flat: { tone: "default", color: "text-dim" },
};

/* ── Demo: seeded multi-asset book run through the real engine ───────────────────
   Each asset is a geometric walk of ~260 closes with a per-name drift + vol so
   SOME assets trend clearly up (Long) and some down (Short) with realistic
   asset-class vols. Same `buildTrendFollowing` math as the live route, so the
   demo book reproduces a believable net-long "Strong trends" read. */

type DemoSpec = { id: string; label: string; assetClass: string; drift: number; vol: number };

const DEMO_SPECS: DemoSpec[] = [
  { id: "SPY", label: "US Equities", assetClass: "Equity", drift: 0.00088, vol: 0.0108 },
  { id: "QQQ", label: "US Tech", assetClass: "Equity", drift: 0.00112, vol: 0.0132 },
  { id: "IWM", label: "US Small Cap", assetClass: "Equity", drift: 0.00021, vol: 0.0138 },
  { id: "EEM", label: "Emerging Markets", assetClass: "Equity", drift: -0.00056, vol: 0.0125 },
  { id: "TLT", label: "Long Treasuries", assetClass: "Rates", drift: -0.00062, vol: 0.0072 },
  { id: "IEF", label: "7-10y Treasuries", assetClass: "Rates", drift: -0.00026, vol: 0.0041 },
  { id: "LQD", label: "IG Credit", assetClass: "Credit", drift: 0.0002, vol: 0.0038 },
  { id: "GLD", label: "Gold", assetClass: "Commodity", drift: 0.00096, vol: 0.0091 },
  { id: "DBC", label: "Broad Commodities", assetClass: "Commodity", drift: 0.0005, vol: 0.0104 },
  { id: "USO", label: "Crude Oil", assetClass: "Commodity", drift: -0.0008, vol: 0.0188 },
  { id: "UUP", label: "US Dollar", assetClass: "FX", drift: 0.00038, vol: 0.0046 },
  { id: "VNQ", label: "Real Estate", assetClass: "Real Estate", drift: -0.00048, vol: 0.0121 },
];

const DEMO_N = 260;

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

function buildDemo(): TrendData {
  const assets: TsAsset[] = DEMO_SPECS.map((s) => ({
    id: s.id,
    label: s.label,
    assetClass: s.assetClass,
    closes: walk(`trend-${s.id}`, DEMO_N, s.drift, s.vol),
  }));
  const report = buildTrendFollowing(assets);
  return { ...report, source: "demo·seeded-walk", asOf: new Date().toISOString(), universe: assets.length };
}

/* ── Inline diverging weight bar (long → right/green, short → left/red) ──────── */

function WeightBar({ weight, scale, label }: { weight: number; scale: number; label: string }) {
  const pct = scale > 0 ? Math.min(100, (Math.abs(weight) / scale) * 100) : 0;
  const positive = weight >= 0;
  return (
    <div
      className="relative ml-auto mt-1 h-1 w-full max-w-[64px] overflow-hidden rounded-full bg-elevated/40"
      role="img"
      aria-label={`${label} portfolio weight ${fmtSignedPct(weight, 1)} of gross`}
    >
      {/* center zero baseline */}
      <div className="absolute inset-y-0 left-1/2 w-px bg-line-strong/60" />
      <div
        className={cn("absolute inset-y-0", positive ? "bg-pos/75" : "bg-neg/75")}
        style={{
          width: `${pct / 2}%`,
          left: positive ? "50%" : undefined,
          right: positive ? undefined : "50%",
        }}
      />
    </div>
  );
}

/* ── Net/gross exposure bar (signed; long fills right/green, short left/red) ─── */

function ExposureBar({ net }: { net: number }) {
  const pct = Math.min(100, Math.abs(net));
  const positive = net >= 0;
  return (
    <div
      className="relative h-3 w-full overflow-hidden rounded-sm bg-elevated/30"
      role="img"
      aria-label={`Net exposure ${fmtSignedPct(net, 0)} — book is net ${positive ? "long" : "short"}`}
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
  );
}

/* ── Panel ──────────────────────────────────────────────────────────────────── */

export function TrendFollowing() {
  const [status, setStatus] = useState<Status>("loading");
  const [data, setData] = useState<TrendData | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const r = await fetch("/api/engine/trend-following", { cache: "no-store" });
      const j = (await r.json()) as LiveResponse;
      if (j.live) {
        // j is { live: true } & TrendData — assignable to TrendData (extra `live` ok).
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

  // Largest |weight| across the book → shared scale for the diverging weight bars.
  const weightScale = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, ...data.signals.map((s) => Math.abs(s.weight)));
  }, [data]);

  const regimeMeta = data ? REGIME_META[data.regime] : null;
  const netLong = data ? data.netExposure >= 0 : true;

  return (
    <Panel className="animate-rise">
      <PanelHeader
        title="Trend Following · Managed Futures"
        sub="Time-series momentum across asset classes — each asset judged against its own 12m return, volatility-targeted into a net/gross book — from Stooq"
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
              aria-label="Refresh trend following"
            >
              ↻
            </button>
          </div>
        }
      />

      {!data || !regimeMeta ? (
        <div className="grid h-64 place-items-center font-mono text-2xs uppercase tracking-wider text-dim">computing…</div>
      ) : (
        <>
          {/* ── Hero: regime + net exposure + gross / trend strength ── */}
          <div className="grid grid-cols-1 gap-px border-b border-line bg-line lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
            <div className="space-y-3 bg-base p-4">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className={cn("font-mono text-3xl font-semibold leading-none tracking-tight", regimeMeta.color)}>
                  {data.regime}
                </span>
                <span className="text-sm text-dim">across {data.universe} markets</span>
              </div>

              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="kpi-label">Net exposure</span>
                <span className={cn("font-mono text-2xl font-semibold leading-none", signClass(data.netExposure))}>
                  {fmtSignedPct(data.netExposure, 0)}
                </span>
                <span className="font-mono text-xs text-dim">
                  <span className="text-pos">{data.longCount} long</span>
                  <span className="text-faint"> · </span>
                  <span className="text-neg">{data.shortCount} short</span>
                  <span className="text-faint"> · </span>
                  <span className="text-dim">{data.flatCount} flat</span>
                </span>
              </div>

              <p className="text-sm text-muted">
                Trends are <span className="font-medium text-ink">{regimeMeta.word}</span> — the book is net{" "}
                <span className={signClass(data.netExposure)}>
                  {netLong ? "long" : "short"} {fmtNum(Math.abs(data.netExposure), 0)}%
                </span>{" "}
                with <span className="text-ink">{data.longCount + data.shortCount}</span> active positions.
              </p>

              {/* Net-exposure tilt bar */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <span className="section-label text-[11px] text-muted">Net long / short tilt</span>
                  <span className={cn("font-mono text-2xs tabular-nums", signClass(data.netExposure))}>
                    {fmtSignedPct(data.netExposure, 0)}
                  </span>
                </div>
                <ExposureBar net={data.netExposure} />
              </div>

              {/* Exposure / strength deck */}
              <div className="grid grid-cols-3 gap-4 pt-1">
                <Stat label="Gross exposure" value={`${fmtNum(data.grossExposure, 0)}%`} tone="accent" />
                <Stat
                  label="Net exposure"
                  value={fmtSignedPct(data.netExposure, 0)}
                  tone={data.netExposure >= 0 ? "pos" : "neg"}
                />
                <Stat label="Trend strength" value={`${fmtNum(data.trendStrength, 1)}%`} />
              </div>
            </div>

            {/* Book composition — long/short/flat counts + active book legend */}
            <div className="space-y-3 bg-base p-4">
              <div>
                <div className="section-label text-[11px] text-muted">Book Composition</div>
                <p className="mt-1 text-2xs text-dim">Direction is set by each market&apos;s own 12-month return.</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded border border-pos/30 bg-pos/5 px-3 py-2.5 text-center">
                  <div className="font-mono text-2xl font-semibold leading-none text-pos">{data.longCount}</div>
                  <div className="mt-1 font-mono text-2xs uppercase tracking-wider text-dim">Long</div>
                </div>
                <div className="rounded border border-neg/30 bg-neg/5 px-3 py-2.5 text-center">
                  <div className="font-mono text-2xl font-semibold leading-none text-neg">{data.shortCount}</div>
                  <div className="mt-1 font-mono text-2xs uppercase tracking-wider text-dim">Short</div>
                </div>
                <div className="rounded border border-line bg-elevated/10 px-3 py-2.5 text-center">
                  <div className="font-mono text-2xl font-semibold leading-none text-dim">{data.flatCount}</div>
                  <div className="mt-1 font-mono text-2xs uppercase tracking-wider text-dim">Flat</div>
                </div>
              </div>
              <p className="text-2xs leading-relaxed text-dim">
                Positions are volatility-targeted to ~equal risk, so quieter markets carry larger weights. Gross is
                scaled to 100%; the net is what is left after longs and shorts offset.
              </p>
            </div>
          </div>

          {/* ── Signal table (sorted by |weight| desc, as returned) ── */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse">
              <thead>
                <tr>
                  <Th>Asset</Th>
                  <Th right>12M momentum</Th>
                  <Th right>3M momentum</Th>
                  <Th right>Vol</Th>
                  <Th>Signal</Th>
                  <Th right>Weight</Th>
                </tr>
              </thead>
              <tbody>
                {data.signals.map((s: TsSignal) => {
                  const sm = SIGNAL_META[s.signal];
                  return (
                    <tr key={s.id} className="transition-colors hover:bg-elevated/40">
                      <Td mono={false}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-ink">{s.label}</span>
                          <Chip>{s.assetClass}</Chip>
                        </div>
                      </Td>
                      <Td right className={cn("font-semibold", signClass(s.mom12m))}>
                        {fmtSignedPct(s.mom12m, 1)}
                      </Td>
                      <Td right className={signClass(s.mom3m)}>
                        {fmtSignedPct(s.mom3m, 1)}
                      </Td>
                      <Td right className="text-muted">
                        {fmtNum(s.vol, 1)}%
                      </Td>
                      <Td mono={false}>
                        <Chip tone={sm.tone} dot={s.signal !== "Flat"}>
                          {s.signal}
                        </Chip>
                      </Td>
                      <Td right>
                        <span className={cn("font-mono tabular-nums", s.signal === "Flat" ? "text-faint" : signClass(s.weight))}>
                          {s.signal === "Flat" ? "—" : fmtSignedPct(s.weight, 1)}
                        </span>
                        {s.signal !== "Flat" ? <WeightBar weight={s.weight} scale={weightScale} label={s.label} /> : null}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── Footer ── */}
      <div className="border-t border-line px-4 py-2.5 font-mono text-2xs text-faint">
        Time-series momentum (Moskowitz-Ooi-Pedersen): each asset is judged against its own trailing 12-month return —
        positive goes long, negative short — with positions volatility-targeted to equal risk. This is the core
        trend-following / managed-futures signal. Source: Stooq multi-asset ETFs.
      </div>
    </Panel>
  );
}
