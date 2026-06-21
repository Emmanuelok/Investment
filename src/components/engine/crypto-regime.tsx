"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Panel, PanelHeader, Stat, Chip, Th, Td } from "@/components/ui/kit";
import { Ring } from "@/components/ui/viz";
import { fmtNum, fmtUsd, fmtUsdCompact, fmtSignedPct, signClass } from "@/lib/format";
import { cn } from "@/lib/cn";
import { priceWalk } from "@/lib/rng";
import {
  buildCryptoRegime,
  type CoinSeries,
  type CryptoRegimeReport,
  type CoinRead,
  type CryptoRegime as CryptoRegimeLabel,
  type CryptoRisk,
} from "@/lib/engine/crypto-regime";

/* ── Types matching /api/engine/crypto-regime ──────────────────────────────── */

/** Live response = the full CryptoRegimeReport plus the wrapper provenance. */
type CryptoData = CryptoRegimeReport & { source?: string; asOf?: string };

type LiveResponse =
  | ({
      live: true;
      source: string;
      asOf: string;
    } & CryptoRegimeReport)
  | { live: false };

type Status = "loading" | "live" | "demo";

/* ── Regime / risk presentation (static class maps — no dynamic Tailwind) ───── */

const REGIME_META: Record<CryptoRegimeLabel, { color: string; ringColor: string; word: string }> = {
  Bull: { color: "text-pos", ringColor: "var(--pos)", word: "bull" },
  Neutral: { color: "text-dim", ringColor: "var(--accent)", word: "ranging" },
  Bear: { color: "text-neg", ringColor: "var(--neg)", word: "bear" },
};

const RISK_TONE: Record<CryptoRisk, "pos" | "neg" | "default"> = {
  "Risk-on": "pos",
  Neutral: "default",
  "Risk-off": "neg",
};

const TREND_TONE: Record<CoinRead["trend"], "pos" | "neg" | "default"> = {
  Up: "pos",
  Neutral: "default",
  Down: "neg",
};

/** Breadth ring colour by level — broad pos, mid accent, narrow neg. */
const breadthColor = (v: number): string => (v >= 60 ? "var(--pos)" : v >= 40 ? "var(--accent)" : "var(--neg)");

/** RSI tone — >70 overbought (warn), <30 oversold (warn), mid neutral (dim). */
const rsiClass = (r: number): string => (r > 70 || r < 30 ? "text-warn" : "text-dim");

/** Price formatting — large coins compact, sub-dollar to 4dp, mid to 2dp. */
function fmtCoinPrice(price: number): string {
  if (price >= 10000) return fmtUsdCompact(price);
  if (price < 1) return fmtUsd(price, 4);
  return fmtUsd(price, price >= 100 ? 0 : 2);
}

/* ── Demo fallback (sandbox returns { live:false }) ─────────────────────────── */

/**
 * Seven seeded coin series (ids include btc & eth as the engine requires), each
 * ~300 deterministic geometric closes run through the SAME engine math
 * (buildCryptoRegime). Drifts are chosen so BTC trends up (above its 200-DMA,
 * positive 90-day momentum → Bull) and ETH out-drifts BTC (ETH/BTC ratio rising
 * → alts leading → Risk-on). A two-pass walk centres each `start` so the final
 * close lands on a believable spot level (BTC ~67k, ETH ~3.5k, …) regardless of
 * the realized path multiple.
 */
type DemoSpec = { id: string; label: string; drift: number; target: number };

const DEMO_VOL = 0.011;
const DEMO_PREFIX = "creg-";

const DEMO_SPECS: ReadonlyArray<DemoSpec> = [
  { id: "btc", label: "Bitcoin", drift: 0.00065, target: 67000 },
  { id: "eth", label: "Ethereum", drift: 0.0016, target: 3500 }, // out-drifts BTC → risk-on
  { id: "sol", label: "Solana", drift: 0.00115, target: 155 },
  { id: "bnb", label: "BNB", drift: 0.0006, target: 585 },
  { id: "xrp", label: "XRP", drift: 0.0005, target: 0.58 },
  { id: "ada", label: "Cardano", drift: -0.00055, target: 0.45 }, // laggard
  { id: "doge", label: "Dogecoin", drift: 0.0004, target: 0.155 },
];

function buildDemo(): CryptoData {
  const series: CoinSeries[] = DEMO_SPECS.map((s) => {
    const seed = `${DEMO_PREFIX}${s.id}`;
    // Pass 1: probe from 1.0 to learn this path's final multiple.
    const probe = priceWalk(seed, 300, 1, DEMO_VOL, s.drift);
    const mult = probe[probe.length - 1] || 1;
    // Pass 2: re-centre so the final close ≈ the target spot price.
    const closes = priceWalk(seed, 300, s.target / mult, DEMO_VOL, s.drift);
    return { id: s.id, label: s.label, closes };
  });
  return { ...buildCryptoRegime(series), source: "engine·demo", asOf: new Date().toISOString() };
}

/* ── Status badge (identical idiom to yield-curve.tsx / commodities-cycle.tsx) ─ */

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

export function CryptoRegime() {
  const [status, setStatus] = useState<Status>("loading");
  const [data, setData] = useState<CryptoData | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const r = await fetch("/api/engine/crypto-regime", { cache: "no-store" });
      const j = (await r.json()) as LiveResponse;
      if (j.live) {
        setData({
          coins: j.coins,
          btcRegime: j.btcRegime,
          breadthPct: j.breadthPct,
          ethBtcRatio: j.ethBtcRatio,
          ethBtcChange30d: j.ethBtcChange30d,
          riskAppetite: j.riskAppetite,
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

  const rows = useMemo<CoinRead[]>(() => {
    if (!data) return [];
    return [...data.coins].sort((a, b) => b.ret30d - a.ret30d);
  }, [data]);

  const regimeMeta = data ? REGIME_META[data.btcRegime] : null;
  const altsLeading = data ? data.ethBtcChange30d >= 0 : false;

  return (
    <Panel className="animate-rise">
      <PanelHeader
        title="Crypto Regime & Risk Appetite"
        sub="Bitcoin trend vs its 50/200-DMA × ETH/BTC ratio × majors breadth → digital-asset regime — from Binance"
        right={
          <div className="flex items-center gap-2">
            <StatusBadge status={status} source={data?.source} asOf={asOf} />
            <button
              onClick={load}
              disabled={status === "loading"}
              className="grid h-7 w-7 place-items-center rounded border border-line font-mono text-sm text-dim hover:border-line-strong hover:text-ink disabled:opacity-40"
              aria-label="Refresh crypto regime"
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
          {/* ── Hero: BTC regime + risk chip + breadth ring + ETH/BTC gauge ── */}
          <div className="grid grid-cols-1 gap-px bg-line lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
            <div className="space-y-4 bg-base p-4">
              {/* Regime headline */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className={cn("font-mono text-3xl font-semibold leading-none tracking-tight", regimeMeta.color)}>
                  {data.btcRegime}
                </span>
                <Chip tone={RISK_TONE[data.riskAppetite]} dot>
                  {data.riskAppetite}
                </Chip>
              </div>

              {/* One-line read */}
              <p className="text-sm text-dim">
                Bitcoin is in a <span className={regimeMeta.color}>{regimeMeta.word}</span> trend; alts are{" "}
                <span className={altsLeading ? "text-pos" : "text-neg"}>{altsLeading ? "leading" : "lagging"}</span> —
                crypto risk appetite is{" "}
                <span className={data.riskAppetite === "Risk-on" ? "text-pos" : data.riskAppetite === "Risk-off" ? "text-neg" : "text-dim"}>
                  {data.riskAppetite === "Risk-on" ? "risk-on" : data.riskAppetite === "Risk-off" ? "risk-off" : "neutral"}
                </span>
                .
              </p>

              {/* Key gauges deck */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
                <Stat
                  label="ETH / BTC ratio"
                  value={data.ethBtcRatio === null ? "—" : fmtNum(data.ethBtcRatio, 4)}
                  tone="accent"
                />
                <Stat
                  label="ETH/BTC 30d"
                  value={fmtSignedPct(data.ethBtcChange30d)}
                  tone={data.ethBtcChange30d >= 0 ? "pos" : "neg"}
                />
                <Stat
                  label="Majors above 200-DMA"
                  value={`${fmtNum(data.breadthPct, 0)}%`}
                  tone={data.breadthPct >= 60 ? "pos" : data.breadthPct >= 40 ? "accent" : "neg"}
                />
              </div>
            </div>

            {/* Breadth ring */}
            <div className="flex items-center gap-4 bg-base p-4">
              <div
                role="img"
                aria-label={`Crypto breadth: ${fmtNum(data.breadthPct, 0)} percent of major coins above their 200-day average`}
              >
                <Ring
                  value={data.breadthPct}
                  color={breadthColor(data.breadthPct)}
                  size={84}
                  stroke={8}
                  label={`${fmtNum(data.breadthPct, 0)}%`}
                  sub="breadth"
                />
              </div>
              <div className="min-w-0">
                <div className="section-label">Crypto Breadth</div>
                <p className="mt-1.5 text-2xs leading-relaxed text-dim">
                  Share of majors above their 200-day average —{" "}
                  <span className="text-muted">{data.breadthPct >= 60 ? "broad" : data.breadthPct >= 40 ? "mixed" : "narrow"}</span>{" "}
                  participation under the tape.
                </p>
              </div>
            </div>
          </div>

          {/* ── Coin leaderboard table (sorted by 30d return desc) ── */}
          <div className="overflow-x-auto border-t border-line">
            <table className="w-full min-w-[760px] border-collapse">
              <thead>
                <tr>
                  <Th>Coin</Th>
                  <Th right>Price</Th>
                  <Th right>30D</Th>
                  <Th right>90D</Th>
                  <Th right>% from 200-DMA</Th>
                  <Th right>RSI</Th>
                  <Th right>Drawdown</Th>
                  <Th right>Trend</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => {
                  const isBtc = c.id === "btc";
                  return (
                    <tr key={c.id} className={cn("hover:bg-elevated/40", isBtc && "bg-accent/[0.04]")}>
                      <Td mono={false}>
                        <span className="flex items-center gap-2.5">
                          <span className="inline-flex items-center rounded border border-line bg-elevated/70 px-1.5 py-0.5 font-mono text-2xs font-medium uppercase text-ink">
                            {c.id}
                          </span>
                          <span className={cn("font-medium", isBtc ? "text-ink" : "text-muted")}>{c.label}</span>
                        </span>
                      </Td>
                      <Td right className="text-ink">
                        {fmtCoinPrice(c.price)}
                      </Td>
                      <Td right className={signClass(c.ret30d)}>
                        {fmtSignedPct(c.ret30d)}
                      </Td>
                      <Td right className={signClass(c.ret90d)}>
                        {fmtSignedPct(c.ret90d)}
                      </Td>
                      <Td right className={signClass(c.pctFrom200dma)}>
                        {fmtSignedPct(c.pctFrom200dma)}
                      </Td>
                      <Td right className={rsiClass(c.rsi)}>
                        {fmtNum(c.rsi, 0)}
                      </Td>
                      <Td right className={c.drawdownFromHigh < 0 ? "text-neg" : "text-muted"}>
                        {fmtSignedPct(c.drawdownFromHigh)}
                      </Td>
                      <Td right>
                        <Chip tone={TREND_TONE[c.trend]}>{c.trend}</Chip>
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
        Bitcoin&apos;s trend vs its 50/200-day averages sets the regime; the ETH/BTC ratio is crypto&apos;s internal
        risk-appetite gauge (alts leading = risk-on); breadth is the share of majors above their 200-day average.
        Source: Binance daily candles.
      </div>
    </Panel>
  );
}
