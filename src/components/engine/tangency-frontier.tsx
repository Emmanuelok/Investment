"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Panel, PanelHeader, Stat, Chip, Th, Td } from "@/components/ui/kit";
import { fmtNum, fmtPct, signClass } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Rng } from "@/lib/rng";
import { covarianceMatrix } from "@/lib/engine/optimizer";
import { analyzeTangency, meanReturns, type TangencyResult, type PortfolioStat, type FrontierPoint } from "@/lib/engine/tangency";

/* ── Types matching /api/engine/tangency ───────────────────────────────────── */

/**
 * The route spreads a TangencyResult (which already carries `rf`, `assets`,
 * `maxSharpe`, `tangency`, `gmv`, `longOnly`, `frontier`) alongside the request
 * context it resolved. `expectedReturns` is in PERCENT; `rf` is a decimal.
 */
type LiveResponse =
  | ({
      live: true;
      source: string;
      asOf: string;
      symbols: string[];
      expectedReturns: number[];
      rfSource: string;
    } & TangencyResult)
  | { live: false };

/** The data the panel renders, plus the request context it resolved. */
type TangencyView = {
  symbols: string[];
  expectedReturns: number[];
  rf: number;
  rfSource: string;
  assets: number;
  maxSharpe: number;
  tangency: PortfolioStat | null;
  gmv: PortfolioStat | null;
  longOnly: PortfolioStat;
  frontier: FrontierPoint[];
  source?: string;
  asOf?: string;
};

type Status = "loading" | "live" | "demo";

/* ── Demo universe — a five-asset factor world (shared market + idiosyncratic) ─
   so the covariance is non-trivial, the frontier is well-shaped, and the
   tangency portfolio takes genuine shorts. Runs the SAME engine math. ───────── */

const DEMO_SYMBOLS = ["SPY", "QQQ", "TLT", "GLD", "XLE"] as const;
const DEMO_RF = 0.045;
const DEMO_OBS = 300;

// [dailyDrift, idiosyncraticDailyVol, marketBeta]
const DEMO_SPEC: Record<(typeof DEMO_SYMBOLS)[number], [number, number, number]> = {
  SPY: [0.0004, 0.006, 1.0],
  QQQ: [0.00055, 0.0105, 1.25],
  TLT: [0.00012, 0.007, -0.4],
  GLD: [0.00022, 0.008, 0.05],
  XLE: [0.00018, 0.013, 0.8],
};

function buildDemo(): TangencyView {
  // One shared market factor drives correlations; each asset adds idiosyncratic noise.
  const mkt = new Rng("PANTHEON-tangency-market");
  const market: number[] = [];
  for (let t = 0; t < DEMO_OBS; t++) market.push(mkt.gauss(0.0003, 0.0072));

  const rows: number[][] = DEMO_SYMBOLS.map((sym) => {
    const [drift, idioVol, beta] = DEMO_SPEC[sym];
    const r = new Rng(`PANTHEON-tangency-${sym}`);
    const out: number[] = [];
    for (let t = 0; t < DEMO_OBS; t++) out.push(drift + beta * market[t] + r.gauss(0, idioVol));
    return out;
  });

  const cov = covarianceMatrix(rows);
  const mu = meanReturns(rows);
  const result = analyzeTangency(mu, cov, DEMO_RF);

  return {
    symbols: [...DEMO_SYMBOLS],
    expectedReturns: mu.map((x) => x * 100),
    rf: DEMO_RF,
    rfSource: "demo · 4.50%",
    assets: result.assets,
    maxSharpe: result.maxSharpe,
    tangency: result.tangency,
    gmv: result.gmv,
    longOnly: result.longOnly,
    frontier: result.frontier,
  };
}

/* ── The efficient-frontier SVG (volatility × expected return, both %) ──────── */

/** "Nice" gridline ticks (~target across [lo,hi]) — same algorithm as yield-curve. */
function niceTicks(lo: number, hi: number, target = 5): number[] {
  const span = hi - lo || 1;
  const rough = span / target;
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const norm = rough / mag;
  const step = (norm >= 5 ? 5 : norm >= 2 ? 2 : 1) * mag;
  const start = Math.ceil(lo / step) * step;
  const out: number[] = [];
  for (let v = start; v <= hi + 1e-9; v += step) out.push(Number(v.toFixed(6)));
  return out;
}

// Chart geometry — module-scoped so the scale callbacks have stable deps.
const W = 640;
const H = 300;
const PAD_L = 40;
const PAD_R = 18;
const PAD_T = 18;
const PAD_B = 32;
const plotW = W - PAD_L - PAD_R;
const plotH = H - PAD_T - PAD_B;

function FrontierChart({
  frontier,
  tangency,
  gmv,
  rf,
}: {
  frontier: FrontierPoint[];
  tangency: PortfolioStat | null;
  gmv: PortfolioStat | null;
  rf: number;
}) {
  // All values are decimals; render axes in percent. Anchor x at 0% vol so the
  // capital market line (from the risk-free rate on the y-axis) reads correctly.
  const pts = useMemo(
    () =>
      [...frontier]
        .filter((p) => Number.isFinite(p.vol) && Number.isFinite(p.ret))
        .sort((a, b) => a.vol - b.vol),
    [frontier],
  );

  const { xMax, yMin, yMax } = useMemo(() => {
    const vols = pts.map((p) => p.vol);
    const rets = pts.map((p) => p.ret);
    if (tangency) {
      vols.push(tangency.vol);
      rets.push(tangency.ret);
    }
    if (gmv) {
      vols.push(gmv.vol);
      rets.push(gmv.ret);
    }
    rets.push(rf);
    const vHi = vols.length ? Math.max(...vols) : 0.2;
    const rHi = rets.length ? Math.max(...rets) : 0.2;
    const rLo = rets.length ? Math.min(...rets) : 0;
    const rPad = Math.max(0.01, (rHi - rLo) * 0.12);
    return {
      xMax: vHi * 1.12 || 0.2,
      yMin: Math.min(rLo, rf) - rPad,
      yMax: rHi + rPad,
    };
  }, [pts, tangency, gmv, rf]);

  const spanY = yMax - yMin || 1;
  const xOf = useCallback((v: number) => PAD_L + (v / (xMax || 1)) * plotW, [xMax]);
  const yOf = useCallback((v: number) => PAD_T + plotH - ((v - yMin) / spanY) * plotH, [yMin, spanY]);

  const yTicks = useMemo(() => niceTicks(yMin, yMax), [yMin, yMax]);
  const xTicks = useMemo(() => niceTicks(0, xMax), [xMax]);

  // Smooth frontier via Catmull-Rom → cubic Bézier (sorted by vol).
  const curvePath = useMemo(() => {
    if (pts.length < 2) return "";
    const P = pts.map((p) => ({ x: xOf(p.vol), y: yOf(p.ret) }));
    let d = `M${P[0].x.toFixed(1)},${P[0].y.toFixed(1)}`;
    for (let i = 0; i < P.length - 1; i++) {
      const p0 = P[i - 1] ?? P[i];
      const p1 = P[i];
      const p2 = P[i + 1];
      const p3 = P[i + 2] ?? p2;
      const c1x = p1.x + (p2.x - p0.x) / 6;
      const c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6;
      const c2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    }
    return d;
  }, [pts, xOf, yOf]);

  // Capital market line: from (0, rf) through the tangency point, extended to the right edge.
  const cml = useMemo(() => {
    if (!tangency || tangency.vol <= 1e-9) return null;
    const slope = (tangency.ret - rf) / tangency.vol; // = Sharpe
    const xEnd = xMax;
    const yEnd = rf + slope * xEnd;
    return { x1: xOf(0), y1: yOf(rf), x2: xOf(xEnd), y2: yOf(yEnd) };
  }, [tangency, rf, xMax, xOf, yOf]);

  const ariaLabel = tangency
    ? `Efficient frontier with the tangency portfolio at ${(tangency.vol * 100).toFixed(1)} percent volatility and ${(tangency.ret * 100).toFixed(1)} percent expected return, and the capital market line from the ${(rf * 100).toFixed(2)} percent risk-free rate.`
    : "Efficient frontier in volatility–return space.";

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      className="block overflow-visible"
      role="img"
      aria-label={ariaLabel}
    >
      {/* Y gridlines + tick labels (expected return %) */}
      {yTicks.map((t) => {
        const yp = yOf(t);
        if (yp < PAD_T - 0.5 || yp > PAD_T + plotH + 0.5) return null;
        return (
          <g key={`gy-${t}`}>
            <line x1={PAD_L} y1={yp} x2={PAD_L + plotW} y2={yp} stroke="var(--line)" strokeWidth={0.6} />
            <text x={PAD_L - 6} y={yp + 3} textAnchor="end" fontSize={9} fontFamily="var(--font-mono)" fill="var(--dim)">
              {(t * 100).toFixed(0)}%
            </text>
          </g>
        );
      })}

      {/* X gridlines + tick labels (volatility %) */}
      {xTicks.map((t) => {
        const xp = xOf(t);
        if (xp < PAD_L - 0.5 || xp > PAD_L + plotW + 0.5) return null;
        return (
          <g key={`gx-${t}`}>
            <line x1={xp} y1={PAD_T} x2={xp} y2={PAD_T + plotH} stroke="var(--line)" strokeWidth={0.6} />
            <text x={xp} y={PAD_T + plotH + 16} textAnchor="middle" fontSize={9} fontFamily="var(--font-mono)" fill="var(--dim)">
              {(t * 100).toFixed(0)}%
            </text>
          </g>
        );
      })}

      {/* axis captions */}
      <text x={PAD_L + plotW / 2} y={H - 1} textAnchor="middle" fontSize={9} fontFamily="var(--font-mono)" fill="var(--muted)">
        annualized volatility
      </text>
      <text
        x={11}
        y={PAD_T + plotH / 2}
        textAnchor="middle"
        fontSize={9}
        fontFamily="var(--font-mono)"
        fill="var(--muted)"
        transform={`rotate(-90, 11, ${PAD_T + plotH / 2})`}
      >
        expected return
      </text>

      {/* Capital market line (rf → tangency, extended) */}
      {cml ? (
        <line
          x1={cml.x1}
          y1={cml.y1}
          x2={cml.x2}
          y2={cml.y2}
          stroke="var(--accent)"
          strokeWidth={1}
          strokeDasharray="4,3"
          opacity={0.55}
        />
      ) : null}

      {/* risk-free anchor on the y-axis */}
      <circle cx={xOf(0)} cy={yOf(rf)} r={2.5} fill="var(--muted)" />
      <text x={xOf(0) + 6} y={yOf(rf) - 4} fontSize={8} fontFamily="var(--font-mono)" fill="var(--dim)">
        rf {(rf * 100).toFixed(2)}%
      </text>

      {/* the efficient frontier */}
      {curvePath ? (
        <path d={curvePath} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      ) : null}

      {/* GMV point */}
      {gmv ? (
        <g>
          <circle cx={xOf(gmv.vol)} cy={yOf(gmv.ret)} r={6.5} fill="var(--info)" opacity={0.18} />
          <circle cx={xOf(gmv.vol)} cy={yOf(gmv.ret)} r={3.5} fill="var(--info)" />
          <text x={xOf(gmv.vol) - 7} y={yOf(gmv.ret) + 12} textAnchor="end" fontSize={8.5} fontFamily="var(--font-mono)" fontWeight="bold" fill="var(--info)">
            GMV
          </text>
        </g>
      ) : null}

      {/* Tangency point */}
      {tangency ? (
        <g>
          <circle cx={xOf(tangency.vol)} cy={yOf(tangency.ret)} r={7} fill="var(--accent)" opacity={0.2} />
          <circle cx={xOf(tangency.vol)} cy={yOf(tangency.ret)} r={4} fill="var(--accent)" />
          <text x={xOf(tangency.vol) + 8} y={yOf(tangency.ret) - 5} fontSize={8.5} fontFamily="var(--font-mono)" fontWeight="bold" fill="var(--accent)">
            TANGENCY
          </text>
          <text x={xOf(tangency.vol) + 8} y={yOf(tangency.ret) + 6} fontSize={8} fontFamily="var(--font-mono)" fill="var(--dim)">
            SR {tangency.sharpe.toFixed(2)} · {(tangency.ret * 100).toFixed(1)}% / {(tangency.vol * 100).toFixed(1)}%
          </text>
        </g>
      ) : null}
    </svg>
  );
}

/* ── Weights table ─────────────────────────────────────────────────────────── */

function weightClass(w: number): string {
  return w < -1e-6 ? "text-neg" : "text-ink";
}

function WeightCell({ w }: { w: number }) {
  const short = w < -1e-6;
  return (
    <span className={cn("font-mono tabular-nums", weightClass(w))}>
      {fmtNum(w * 100, 1)}%
      {short ? <span className="ml-1 text-2xs uppercase tracking-wider text-neg">short</span> : null}
    </span>
  );
}

/* ── Main panel ────────────────────────────────────────────────────────────── */

export function TangencyFrontier() {
  const [status, setStatus] = useState<Status>("loading");
  const [view, setView] = useState<TangencyView | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const r = await fetch("/api/engine/tangency", { cache: "no-store" });
      const j = (await r.json()) as LiveResponse;
      if (j.live) {
        setView({
          symbols: j.symbols,
          expectedReturns: j.expectedReturns,
          rf: j.rf,
          rfSource: j.rfSource,
          assets: j.assets,
          maxSharpe: j.maxSharpe,
          tangency: j.tangency,
          gmv: j.gmv,
          longOnly: j.longOnly,
          frontier: j.frontier,
          source: j.source,
          asOf: j.asOf,
        });
        setStatus("live");
      } else {
        setView(buildDemo());
        setStatus("demo");
      }
    } catch {
      setView(buildDemo());
      setStatus("demo");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const asOf = useMemo(() => {
    if (status !== "live" || !view?.asOf) return "";
    return new Date(view.asOf).toLocaleTimeString("en-US", { hour12: false });
  }, [status, view]);

  // Weight rows keyed by symbol, carrying each scheme's allocation + expected return.
  const rows = useMemo(() => {
    if (!view) return [];
    return view.symbols.map((sym, i) => ({
      sym,
      expRet: view.expectedReturns[i] ?? 0,
      tan: view.tangency?.weights[i] ?? null,
      lo: view.longOnly.weights[i] ?? 0,
      gmv: view.gmv?.weights[i] ?? null,
    }));
  }, [view]);

  const tangency = view?.tangency ?? null;
  const gmv = view?.gmv ?? null;

  return (
    <Panel className="animate-rise">
      <PanelHeader
        title="Tangency Portfolio & Efficient Frontier"
        sub="Markowitz mean-variance frontier · max-Sharpe tangency · capital market line — analytical Σ⁻¹ solve"
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
                ENGINE · LIVE · {view?.source}
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
              aria-label="Refresh tangency frontier"
            >
              ↻
            </button>
          </div>
        }
      />

      {!view ? (
        <div className="grid h-72 place-items-center font-mono text-2xs uppercase tracking-wider text-dim">computing…</div>
      ) : (
        <div className="grid grid-cols-1 gap-px bg-line lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
          {/* ── Left: hero frontier + stats ── */}
          <div className="space-y-4 bg-base p-4">
            <div className="rounded border border-line bg-elevated/10 p-3">
              <FrontierChart frontier={view.frontier} tangency={tangency} gmv={gmv} rf={view.rf} />
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-dim">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-accent" /> Tangency (max Sharpe)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-info" /> Global min-variance
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-4 border-t border-dashed border-accent opacity-60" /> Capital market line
              </span>
            </div>

            {/* Hero stats — Max Sharpe big + accent */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat
                label="Max Sharpe"
                value={<span className="text-3xl font-semibold leading-none tracking-tight">{fmtNum(view.maxSharpe, 2)}</span>}
                tone="accent"
              />
              <Stat
                label="Tangency Return"
                value={tangency ? fmtPct(tangency.ret * 100, 1) : "—"}
                tone={tangency ? "pos" : undefined}
              />
              <Stat label="Tangency Vol" value={tangency ? `${fmtNum(tangency.vol * 100, 1)}%` : "—"} tone="muted" />
              <Stat
                label="GMV Return / Vol"
                value={gmv ? `${fmtNum(gmv.ret * 100, 1)}% / ${fmtNum(gmv.vol * 100, 1)}%` : "—"}
              />
            </div>

            {/* One-line read */}
            {tangency ? (
              <p className="text-sm text-dim">
                The tangency portfolio earns{" "}
                <span className="font-mono text-pos">{fmtNum(tangency.ret * 100, 1)}%</span> at{" "}
                <span className="font-mono text-ink">{fmtNum(tangency.vol * 100, 1)}%</span> vol — Sharpe{" "}
                <span className="font-mono text-accent">{fmtNum(tangency.sharpe, 2)}</span> — the highest risk-adjusted
                mix of the {view.assets} assets.
              </p>
            ) : (
              <p className="text-sm text-warn">
                Covariance is singular for this universe — no analytical tangency exists. Showing the long-only solve
                and frontier where available.
              </p>
            )}
          </div>

          {/* ── Right: weights table ── */}
          <div className="space-y-3 bg-base p-4">
            <div>
              <div className="section-label">Optimal Weights</div>
              <p className="mt-1 text-2xs text-dim">
                Tangency &amp; GMV may short (negative); long-only re-solves with no shorting.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <Th>Asset</Th>
                    <Th right>μ %</Th>
                    <Th right>Tan %</Th>
                    <Th right>Long %</Th>
                    <Th right>GMV %</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.sym} className="hover:bg-elevated/40">
                      <Td mono={false}>
                        <span className="inline-flex items-center rounded border border-line bg-elevated/70 px-1.5 py-0.5 font-mono text-xs font-medium text-ink">
                          {r.sym}
                        </span>
                      </Td>
                      <Td right className={signClass(r.expRet)}>
                        {fmtNum(r.expRet, 1)}
                      </Td>
                      <Td right>{r.tan === null ? <span className="text-faint">—</span> : <WeightCell w={r.tan} />}</Td>
                      <Td right>
                        <WeightCell w={r.lo} />
                      </Td>
                      <Td right>{r.gmv === null ? <span className="text-faint">—</span> : <WeightCell w={r.gmv} />}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Chip tone="accent">{view.assets} assets</Chip>
              <span className="font-mono text-2xs text-dim">
                rf {fmtNum(view.rf * 100, 2)}% · {view.rfSource}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="border-t border-line px-4 py-2.5 font-mono text-2xs text-faint">
        Markowitz mean-variance frontier from Σ⁻¹. The tangency portfolio maximizes the Sharpe ratio (μ−rf)/σ; the
        capital market line runs from the risk-free rate through it. Long-only re-solves with no shorting (active-set).
        Source: Stooq returns + FRED risk-free rate.
      </div>
    </Panel>
  );
}
