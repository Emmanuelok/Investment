"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Panel, PanelHeader, Stat, Chip, Th, Td } from "@/components/ui/kit";
import { ProgressBar } from "@/components/ui/viz";
import { fmtNum, signClass } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Rng } from "@/lib/rng";
import {
  analyzeCorrelationRegime,
  type AssetSeries,
  type CorrelationRegimeReport,
  type PairCorr,
  type CorrelationRegime as Regime,
  type RiskAppetite,
} from "@/lib/engine/correlation-regime";

/* ── Types matching /api/engine/correlation-regime ─────────────────────────── */

type AssetClassRow = { symbol: string; assetClass: string };

/** Live response = the engine report + provenance + the basket's class map. */
type Fetched =
  | (CorrelationRegimeReport & {
      live: true;
      source: string;
      asOf: string;
      window: number;
      classes: AssetClassRow[];
    })
  | { live: false };

/** Local view model — the computed report plus its presentation provenance. */
type RegimeData = CorrelationRegimeReport & {
  source: string;
  asOf: string;
  window: number;
  classes: AssetClassRow[];
};

type Status = "loading" | "live" | "demo";

/* ── Regime presentation (static class maps — no dynamic Tailwind) ─────────── */

const REGIME_META: Record<Regime, { text: string; desc: string }> = {
  Diversified: { text: "text-pos", desc: "cross-asset correlations low — diversification is working" },
  Normal: { text: "text-pos/80", desc: "correlations moderate — diversification largely intact" },
  Correlated: { text: "text-warn", desc: "correlations elevated — diversification is breaking down" },
  Crisis: { text: "text-neg", desc: "correlations spiking toward 1 — diversification has evaporated" },
};

const APPETITE_TONE: Record<RiskAppetite, "pos" | "neg" | "default"> = {
  "Risk-on": "pos",
  Neutral: "default",
  "Risk-off": "neg",
};

/** Stress percentile chip tone — high percentile = elevated/stress. */
const pctileTone = (p: number): "pos" | "warn" | "neg" => (p >= 80 ? "neg" : p >= 50 ? "warn" : "pos");

const ordinal = (n: number): string => {
  const r = Math.round(n);
  const v = r % 100;
  if (v >= 11 && v <= 13) return `${r}th`;
  switch (r % 10) {
    case 1:
      return `${r}st`;
    case 2:
      return `${r}nd`;
    case 3:
      return `${r}rd`;
    default:
      return `${r}th`;
  }
};

/** Correlation magnitude → color: high magnitude is a diversification hotspot. */
const corrColor = (v: number): string => {
  const a = Math.abs(v);
  if (v < 0) return a >= 0.4 ? "text-pos" : "text-muted";
  return a >= 0.6 ? "text-neg" : a >= 0.4 ? "text-warn" : "text-muted";
};

/* ── Demo: deterministic cross-asset basket → identical engine math ────────── */

/** Asset-class basket: a shared market factor drives moderate, realistic corr. */
const DEMO_BASKET: { symbol: string; assetClass: string; beta: number; idio: number; drift: number }[] = [
  { symbol: "SPY", assetClass: "Equity (US)", beta: 1.0, idio: 0.0045, drift: 0.0004 },
  { symbol: "QQQ", assetClass: "Equity (Tech)", beta: 1.15, idio: 0.006, drift: 0.0005 },
  { symbol: "EFA", assetClass: "Equity (Intl)", beta: 0.85, idio: 0.005, drift: 0.0002 },
  { symbol: "TLT", assetClass: "Bond (Long Treasury)", beta: -0.35, idio: 0.0045, drift: 0.0001 },
  { symbol: "LQD", assetClass: "Credit (IG)", beta: 0.25, idio: 0.003, drift: 0.0001 },
  { symbol: "GLD", assetClass: "Commodity (Gold)", beta: 0.1, idio: 0.006, drift: 0.0003 },
  { symbol: "DBC", assetClass: "Commodity (Broad)", beta: 0.45, idio: 0.0065, drift: 0.0002 },
  { symbol: "VNQ", assetClass: "Real Estate (REIT)", beta: 0.9, idio: 0.006, drift: 0.0003 },
];

/** Synthesize ~160 closes per asset from a shared market factor + idio noise. */
function buildDemo(): RegimeData {
  const N = 160;
  const r = new Rng("correlation-regime-v1");

  // Shared market factor: one return stream all assets load on (via beta).
  const market: number[] = [];
  for (let i = 0; i < N; i++) market.push(r.gauss(0.0004, 0.012));

  const assets: AssetSeries[] = DEMO_BASKET.map((spec) => {
    const closes: number[] = [100];
    for (let i = 1; i < N; i++) {
      const ret = spec.drift + spec.beta * market[i] + r.gauss(0, spec.idio);
      closes.push(Math.max(0.5, closes[i - 1] * (1 + ret)));
    }
    return { symbol: spec.symbol, assetClass: spec.assetClass, closes };
  });

  const report = analyzeCorrelationRegime(assets);
  const classes: AssetClassRow[] = assets.map((a) => ({ symbol: a.symbol, assetClass: a.assetClass }));
  return { ...report, source: "demo", asOf: "", window: 60, classes };
}

/* ── The rolling-correlation SVG (centerpiece, modeled on CurveChart) ──────── */

function RollingCorrChart({ rolling, current }: { rolling: number[]; current: number }) {
  const W = 640;
  const H = 260;
  const PAD_L = 40;
  const PAD_R = 16;
  const PAD_T = 22;
  const PAD_B = 26;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;

  const n = rolling.length;

  // Y range across the rolling series + the current marker; padded headroom.
  const vals = rolling.concat(current);
  const rawMin = Math.min(...vals, -0.2);
  const rawMax = Math.max(...vals, 1.0);
  const yMin = Math.max(-1, rawMin - 0.05);
  const yMax = Math.min(1, rawMax + 0.05);
  const spanY = yMax - yMin || 1;

  // Evenly-spaced ordinal x — one slot per rolling block, oldest → newest.
  const xOf = (i: number) => (n <= 1 ? PAD_L + plotW / 2 : PAD_L + (i / (n - 1)) * plotW);
  const yOf = (v: number) => PAD_T + plotH - ((v - yMin) / spanY) * plotH;

  // Nice Y gridlines (~5 ticks across the correlation range).
  const ticks = useMemo(() => {
    const target = 5;
    const rough = spanY / target;
    const mag = Math.pow(10, Math.floor(Math.log10(rough)));
    const norm = rough / mag;
    const step = (norm >= 5 ? 5 : norm >= 2 ? 2 : 1) * mag;
    const start = Math.ceil(yMin / step) * step;
    const out: number[] = [];
    for (let v = start; v <= yMax + 1e-9; v += step) out.push(Number(v.toFixed(6)));
    return out;
  }, [spanY, yMin, yMax]);

  const linePath = rolling
    .map((v, i) => `${i === 0 ? "M" : "L"}${xOf(i).toFixed(1)},${yOf(v).toFixed(1)}`)
    .join(" ");

  // High-correlation zone (>0.6) shaded faintly in --neg — clamp to plot.
  const zoneTopY = yOf(Math.min(yMax, 1));
  const zoneBotY = yOf(Math.max(yMin, 0.6));
  const zoneH = Math.max(0, zoneBotY - zoneTopY);

  const curX = xOf(n - 1);
  const curY = yOf(current);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      className="block overflow-visible"
      role="img"
      aria-label={`Rolling average cross-asset correlation over time; current value ${current.toFixed(2)}`}
    >
      {/* high-correlation (>0.6) stress zone (behind everything) */}
      {zoneH > 0 ? <rect x={PAD_L} y={zoneTopY} width={plotW} height={zoneH} fill="var(--neg)" opacity={0.08} /> : null}

      {/* Y gridlines + correlation tick labels */}
      {ticks.map((t) => {
        const yp = yOf(t);
        if (yp < PAD_T - 0.5 || yp > PAD_T + plotH + 0.5) return null;
        return (
          <g key={`g-${t}`}>
            <line x1={PAD_L} y1={yp} x2={PAD_L + plotW} y2={yp} stroke="var(--line)" strokeWidth={0.6} />
            <text x={PAD_L - 6} y={yp + 3} textAnchor="end" fontSize={9} fontFamily="var(--font-mono)" fill="var(--dim)">
              {t.toFixed(1)}
            </text>
          </g>
        );
      })}

      {/* reference line at the current value */}
      <line
        x1={PAD_L}
        y1={curY}
        x2={PAD_L + plotW}
        y2={curY}
        stroke="var(--accent)"
        strokeWidth={1}
        strokeDasharray="4 3"
        opacity={0.55}
      />

      {/* faint area under the rolling line */}
      <path
        d={`${linePath} L${xOf(n - 1).toFixed(1)},${(PAD_T + plotH).toFixed(1)} L${xOf(0).toFixed(1)},${(PAD_T + plotH).toFixed(1)} Z`}
        fill="var(--accent)"
        opacity={0.07}
      />

      {/* the rolling-correlation line */}
      <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

      {/* current / last point marked */}
      <circle cx={curX} cy={curY} r={3.5} fill="var(--accent)" />
      <text x={curX - 6} y={curY - 8} textAnchor="end" fontSize={10} fontFamily="var(--font-mono)" fill="var(--muted)">
        {current.toFixed(2)}
      </text>

      {/* X-axis endpoints (oldest → now) */}
      <text x={PAD_L} y={PAD_T + plotH + 16} textAnchor="start" fontSize={9} fontFamily="var(--font-mono)" fill="var(--dim)">
        older
      </text>
      <text
        x={PAD_L + plotW}
        y={PAD_T + plotH + 16}
        textAnchor="end"
        fontSize={9}
        fontFamily="var(--font-mono)"
        fill="var(--dim)"
      >
        now
      </text>
    </svg>
  );
}

/* ── Main panel ────────────────────────────────────────────────────────────── */

export function CorrelationRegime() {
  const [status, setStatus] = useState<Status>("loading");
  const [data, setData] = useState<RegimeData | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const r = await fetch("/api/engine/correlation-regime", { cache: "no-store" });
      const j = (await r.json()) as Fetched;
      if (j.live) {
        setData({
          n: j.n,
          avgPairwise: j.avgPairwise,
          rolling: j.rolling,
          percentile: j.percentile,
          stockBondCorr: j.stockBondCorr,
          topPairs: j.topPairs,
          effectiveBets: j.effectiveBets,
          diversification: j.diversification,
          equityReturn: j.equityReturn,
          regime: j.regime,
          riskAppetite: j.riskAppetite,
          source: j.source,
          asOf: j.asOf,
          window: j.window,
          classes: j.classes,
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

  const regimeMeta = data ? REGIME_META[data.regime] : null;
  const rolling = data?.rolling ?? [];

  // Stock-bond correlation read (guard null).
  const sbCorr = data?.stockBondCorr ?? null;
  const sbTone: "pos" | "warn" | undefined = sbCorr === null ? undefined : sbCorr < 0 ? "pos" : "warn";
  const sbRead = sbCorr === null ? "—" : sbCorr < 0 ? "healthy hedge" : "inflation regime";

  const breaking = data ? data.avgPairwise >= 0.45 : false;

  return (
    <Panel className="animate-rise">
      <PanelHeader
        title="Correlation Regime"
        sub="Cross-asset correlation dynamics · diversification, effective bets & stress regime — from Stooq ETF proxies"
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
              aria-label="Refresh correlation regime"
            >
              ↻
            </button>
          </div>
        }
      />

      {!data ? (
        <div className="grid h-64 place-items-center font-mono text-2xs uppercase tracking-wider text-dim">computing…</div>
      ) : (
        <div className="grid grid-cols-1 gap-px bg-line lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
          {/* ── Left: hero + rolling-correlation chart ── */}
          <div className="space-y-4 bg-base p-4">
            {/* Hero — regime headline + current avg correlation */}
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
              <span className={cn("font-mono text-4xl font-semibold leading-none tracking-tight", regimeMeta?.text)}>
                {data.regime}
              </span>
              <span className="font-mono text-2xl font-semibold leading-none tracking-tight text-ink">
                ρ̄ {data.avgPairwise.toFixed(2)}
              </span>
              <Chip tone={pctileTone(data.percentile)}>{ordinal(data.percentile)} pctile</Chip>
              <Chip tone={APPETITE_TONE[data.riskAppetite]}>{data.riskAppetite}</Chip>
            </div>
            <p className="text-sm text-dim">
              Average cross-asset correlation at{" "}
              <span className="font-mono text-muted">{data.avgPairwise.toFixed(2)}</span> ({ordinal(data.percentile)}{" "}
              percentile) — diversification is{" "}
              <span className={breaking ? "text-warn" : "text-pos"}>{breaking ? "breaking down" : "intact"}</span>.
            </p>

            {/* The rolling-correlation chart */}
            <div className="rounded border border-line bg-elevated/10 p-3">
              {rolling.length ? (
                <RollingCorrChart rolling={rolling} current={data.avgPairwise} />
              ) : (
                <div className="grid h-48 place-items-center font-mono text-2xs uppercase tracking-wider text-dim">
                  insufficient history for rolling series
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-2xs text-dim">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-px w-3 bg-accent" /> rolling ρ̄
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-3 rounded-sm bg-neg/20" /> high-corr zone (&gt;0.6)
              </span>
            </div>
          </div>

          {/* ── Right: stats deck ── */}
          <div className="space-y-3 bg-base p-4">
            <div>
              <div className="section-label">Diversification Read</div>
              <p className="mt-1 text-2xs text-dim">How many independent bets the basket really holds.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Avg pairwise corr" value={data.avgPairwise.toFixed(2)} tone="accent" />
              <Stat label="Effective bets" value={`${fmtNum(data.effectiveBets, 1)} / ${data.n}`} />
            </div>
            <div>
              <div className="kpi-label">Diversification</div>
              <div className="mt-1.5 flex items-center gap-2">
                <ProgressBar
                  value={data.diversification}
                  max={100}
                  color={data.diversification >= 60 ? "var(--pos)" : data.diversification >= 35 ? "var(--warn)" : "var(--neg)"}
                  height={6}
                  className="flex-1"
                />
                <span className="w-12 text-right font-mono text-xs tabular-nums text-muted">
                  {fmtNum(data.diversification, 0)}%
                </span>
              </div>
            </div>
            <Stat
              label="Stock-bond corr"
              value={
                <span className="flex items-baseline gap-1.5">
                  <span className={sbCorr === null ? "text-faint" : signClass(sbCorr)}>
                    {sbCorr === null ? "—" : fmtNum(sbCorr, 2)}
                  </span>
                  <span className="text-2xs uppercase tracking-wider text-dim">{sbRead}</span>
                </span>
              }
              tone={sbTone}
            />
          </div>
        </div>
      )}

      {/* ── Most-correlated pairs table ── */}
      {data && data.topPairs.length ? (
        <div className="overflow-x-auto border-t border-line">
          <table className="w-full min-w-[420px] border-collapse">
            <thead>
              <tr>
                <Th>Most-Correlated Pair</Th>
                <Th right>Correlation</Th>
              </tr>
            </thead>
            <tbody>
              {data.topPairs.map((p: PairCorr) => (
                <tr key={`${p.a}-${p.b}`} className="hover:bg-elevated/40">
                  <Td className="text-muted">
                    {p.a}
                    <span className="px-1 text-faint">↔</span>
                    {p.b}
                  </Td>
                  <Td right>
                    <div className="flex items-center justify-end gap-2">
                      <span className="relative hidden h-1.5 w-20 overflow-hidden rounded-[2px] bg-line/50 sm:inline-block">
                        <span
                          className={cn(
                            "absolute inset-y-0 left-0 rounded-[2px]",
                            Math.abs(p.corr) >= 0.6 ? "bg-neg/70" : Math.abs(p.corr) >= 0.4 ? "bg-warn/70" : "bg-accent/70",
                          )}
                          style={{ width: `${Math.max(2, Math.min(100, Math.abs(p.corr) * 100))}%` }}
                        />
                      </span>
                      <span className={cn("w-10 text-right tabular-nums", corrColor(p.corr))}>{p.corr.toFixed(2)}</span>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {/* ── Asset-class legend ── */}
      {data && data.classes.length ? (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 border-t border-line px-4 py-3">
          <span className="section-label mr-1 text-muted">Basket</span>
          {data.classes.map((c) => (
            <Chip key={c.symbol} className="gap-1.5">
              <span className="font-medium text-ink">{c.symbol}</span>
              <span className="text-dim">{c.assetClass}</span>
            </Chip>
          ))}
        </div>
      ) : null}

      <div className="border-t border-line px-4 py-2.5 font-mono text-2xs text-faint">
        In stress, cross-asset correlations spike toward 1 and diversification disappears. Effective bets = n/(1+(n−1)ρ̄).
        A negative equity-bond correlation means bonds hedge equities; a positive one signals an inflation regime. Source:
        Stooq cross-asset ETF proxies.
      </div>
    </Panel>
  );
}
