import { PageHeader, Panel, PanelHeader, Chip, KpiCard, Ticker } from "@/components/ui/kit";
import { DeltaBars, Sparkline } from "@/components/ui/viz";
import { OrderBookHeatmap } from "@/components/helios/heatmap";
import { FootprintCluster } from "@/components/helios/footprint";
import { VolumeProfile } from "@/components/helios/volume-profile";
import { Icon } from "@/components/icon-map";
import { Activity, Bolt, Wave } from "@/components/icons";
import {
  HELIOS_SYMBOLS,
  orderBookHeatmap,
  footprintData,
  cvdSeries,
  volumeProfile,
  getCandles,
} from "@/lib/data/helios";
import { fmtInt, fmtCompact, fmtUsd, signClass, fmtSignedPct } from "@/lib/format";
import { LiveOrderFlowPanel } from "@/components/live/live-orderflow-panel";

export const metadata = { title: "HELIOS — Order Flow Suite" };

const ACTIVE_SYM = "BTC-USD";

export default function OrderFlowPage() {
  const sym = HELIOS_SYMBOLS.find((s) => s.sym === ACTIVE_SYM)!;
  const heatRows = orderBookHeatmap(ACTIVE_SYM, 22, 40);
  const candles = getCandles(ACTIVE_SYM, "5m", 80);
  const refCandle = candles[candles.length - 1];
  const fpRows = footprintData(ACTIVE_SYM, refCandle);
  const maxFpVol = Math.max(...fpRows.map((r) => Math.max(r.bid, r.ask)));
  const cvd = cvdSeries(ACTIVE_SYM, 80);
  const vp = volumeProfile(ACTIVE_SYM, candles);
  const cvdNow = cvd[cvd.length - 1];
  const cvdTrend = cvdNow > cvd[cvd.length - 20] ? "pos" : "neg";

  // Compute a few absorption/sweep stats from footprint
  const sweeps = fpRows.filter((r) => r.imbalance === "ask" && r.ask > 4000).length;
  const absorptions = fpRows.filter((r) => r.poc).length;
  const totalDelta = fpRows.reduce((s, r) => s + r.delta, 0);

  return (
    <div className="space-y-5">
      <LiveOrderFlowPanel />
      <PageHeader
        module={{ name: "HELIOS · Charts & Order Flow", tone: "info" }}
        title="Order Flow Suite"
        desc="Resting liquidity heatmap, footprint clusters, CVD, and volume profile. Real full-depth L2/L3 crypto via Binance WS when enabled."
        right={
          <div className="flex items-center gap-2">
            <Chip tone="warn">Demo snapshot · live full-depth via Binance WS when enabled</Chip>
            <button className="btn btn-accent">
              <Bolt width={14} height={14} />
              Enable Live
            </button>
          </div>
        }
      />

      {/* Symbol + capability badges */}
      <div className="flex flex-wrap items-center gap-3">
        {HELIOS_SYMBOLS.map((s) => (
          <div key={s.sym} className="flex items-center gap-1.5">
            <Ticker sym={s.sym} />
            <Chip
              tone={
                s.depthCap === "full-depth"
                  ? "pos"
                  : s.depthCap === "top-of-book"
                  ? "warn"
                  : "neg"
              }
            >
              {s.depthCap}
            </Chip>
          </div>
        ))}
      </div>

      {/* KPI deck */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-5">
        <KpiCard
          label="LAST PRICE"
          value={fmtUsd(sym.price, 0)}
          sub={<span className={signClass(sym.chg)}>{fmtSignedPct(sym.chg)} today</span>}
          tone={sym.chg >= 0 ? "pos" : "neg"}
          icon={<Icon name="candle" width={14} height={14} />}
        />
        <KpiCard
          label="SESSION CVD"
          value={fmtCompact(cvdNow)}
          sub={cvdNow > 0 ? "Net buy-side pressure" : "Net sell-side pressure"}
          tone={cvdTrend}
          icon={<Activity width={14} height={14} />}
        />
        <KpiCard
          label="CANDLE DELTA"
          value={fmtCompact(totalDelta)}
          sub="footprint cluster total"
          tone={totalDelta > 0 ? "pos" : "neg"}
          icon={<Icon name="flow" width={14} height={14} />}
        />
        <KpiCard
          label="ASK SWEEPS"
          value={String(sweeps)}
          sub="large-print ask imbalance rows"
          tone={sweeps > 2 ? "pos" : undefined}
          icon={<Wave width={14} height={14} />}
        />
        <KpiCard
          label="DATA SOURCE"
          value="Binance WS"
          sub="full L2/L3 free — not enabled"
          tone="warn"
          icon={<Icon name="plug" width={14} height={14} />}
        />
      </div>

      {/* Heatmap + Volume Profile row */}
      <div className="grid gap-4 xl:grid-cols-[1fr_180px]">
        <Panel>
          <PanelHeader
            title="Order Book Heatmap — Resting Liquidity Over Time"
            sub={`${ACTIVE_SYM} · 5m snapshot · 40 time buckets`}
            right={
              <div className="flex items-center gap-2">
                <Chip tone="warn">Demo snapshot · live full-depth via Binance WS when enabled</Chip>
              </div>
            }
          />
          <div className="p-4">
            <OrderBookHeatmap rows={heatRows} width={760} height={260} />
            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-dim">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-6 rounded" style={{ background: "rgba(31,229,192,0.4)" }} />
                <span>Light — small resting orders</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-6 rounded" style={{ background: "rgba(242,180,61,0.7)" }} />
                <span>Amber — medium clusters</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-6 rounded" style={{ background: "rgba(255,93,99,0.9)" }} />
                <span>Red — large walls / sweeps</span>
              </div>
              <span className="ml-auto text-faint">Time moves right → left (newest = right)</span>
            </div>
          </div>
        </Panel>

        {/* Volume Profile strip */}
        <Panel>
          <PanelHeader title="Volume Profile" sub="VAH / VAL / POC" />
          <div className="p-3">
            <VolumeProfile bars={vp} width={160} />
            <div className="mt-3 space-y-1.5 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-3 rounded" style={{ background: "var(--accent)" }} />
                <span className="text-dim">POC — Point of Control</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-3 rounded" style={{ background: "var(--warn)" }} />
                <span className="text-dim">VAH / VAL — Value Area</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-3 rounded" style={{ background: "var(--info)" }} />
                <span className="text-dim">Distribution</span>
              </div>
            </div>
          </div>
        </Panel>
      </div>

      {/* Footprint + CVD row */}
      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        {/* Footprint cluster */}
        <Panel>
          <PanelHeader
            title="Footprint Cluster — Bid × Ask Traded Volume"
            sub={`${ACTIVE_SYM} · Last 5m candle · price range ${fmtUsd(refCandle.l, 0)}–${fmtUsd(refCandle.h, 0)}`}
            right={
              <div className="flex items-center gap-2">
                <Chip tone="warn">Demo snapshot · live via Binance WS when enabled</Chip>
              </div>
            }
          />
          <div className="overflow-x-auto">
            <FootprintCluster rows={fpRows} maxVol={maxFpVol} />
          </div>
          {/* Legend / callouts */}
          <div className="flex flex-wrap gap-3 border-t border-line px-4 py-2.5 text-xs text-dim">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: "var(--accent)", opacity: 0.7 }} />
              <span>POC row — highest traded volume</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-pos font-medium">ASK↑</span>
              <span>Ask imbalance — buyers absorbed / swept</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-neg font-medium">BID↓</span>
              <span>Bid imbalance — sellers absorbed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-muted">Delta</span>
              <span>Ask − Bid traded per price row</span>
            </div>
          </div>
        </Panel>

        {/* CVD + absorption callouts */}
        <div className="space-y-4">
          <Panel>
            <PanelHeader
              title="CVD — Cumulative Volume Delta"
              right={
                <span className={`font-mono text-sm ${cvdNow > 0 ? "text-pos" : "text-neg"}`}>
                  {cvdNow > 0 ? "+" : ""}{fmtCompact(cvdNow)}
                </span>
              }
            />
            <div className="p-4">
              <DeltaBars data={cvd.slice(-60)} width={320} height={80} />
              <div className="mt-3 flex items-center gap-3 text-xs text-dim">
                <span className="text-pos">■ Positive — buy-side dominance</span>
                <span className="text-neg">■ Negative — sell-side dominance</span>
              </div>
              <Sparkline
                data={cvd.slice(-60)}
                width={320}
                height={40}
                color={cvdNow > 0 ? "var(--pos)" : "var(--neg)"}
                className="mt-2 w-full"
              />
            </div>
          </Panel>

          {/* Absorption / sweep callouts */}
          <Panel>
            <PanelHeader title="Absorption & Sweep Callouts" right={<Chip tone="warn">Demo snapshot</Chip>} />
            <div className="divide-y divide-line/60">
              <div className="flex items-start gap-3 px-4 py-3">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-pos" />
                <div>
                  <span className="text-sm font-medium text-pos">Ask sweep detected</span>
                  <p className="mt-0.5 text-xs text-dim">
                    Large ask-side volume cleared at {fmtUsd(sym.price - 50, 0)}–{fmtUsd(sym.price, 0)}.
                    Absorption at prior bid wall suggests institutional accumulation.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 px-4 py-3">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent" />
                <div>
                  <span className="text-sm font-medium text-accent">Large print at POC</span>
                  <p className="mt-0.5 text-xs text-dim">
                    {fmtInt(fpRows.find((r) => r.poc)?.ask ?? 0)} contracts traded at POC level —
                    highest single-price volume in the session. Often pivot point.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 px-4 py-3">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-info" />
                <div>
                  <span className="text-sm font-medium text-info">Bid absorption confirmed</span>
                  <p className="mt-0.5 text-xs text-dim">
                    Bid wall at {fmtUsd(refCandle.l * 1.002, 0)} absorbing sell-side aggression.
                    CVD holding positive — buyers in control.
                  </p>
                </div>
              </div>
            </div>
          </Panel>
        </div>
      </div>

      {/* Honest data capability note */}
      <div className="flex flex-wrap items-center gap-3 rounded border border-warn/20 bg-warn/5 px-4 py-3 text-xs">
        <Icon name="shield" width={14} height={14} className="shrink-0 text-warn" />
        <span className="font-medium text-warn">Honesty note:</span>
        <span className="text-dim">
          All order flow above is a <strong className="text-muted">DEMO snapshot</strong> generated deterministically for illustration.
          Real full-depth (L2/L3) order flow is <strong className="text-muted">free on crypto</strong> via
          Binance WebSocket and Coinbase Advanced WebSocket (CCXT Pro compatible).
          For equities and futures, licensed feeds are available via <strong className="text-muted">Databento</strong> or <strong className="text-muted">Polygon.io</strong>.
          Enable live feed in Settings → Data Sources to stream real depth.
        </span>
      </div>
    </div>
  );
}
