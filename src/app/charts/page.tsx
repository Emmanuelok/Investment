import { PageHeader, Panel, PanelHeader, Chip, KpiCard, Ticker } from "@/components/ui/kit";
import { Candles } from "@/components/ui/candles";
import { Sparkline, DeltaBars } from "@/components/ui/viz";
import { Icon } from "@/components/icon-map";
import { Activity } from "@/components/icons";
import {
  HELIOS_SYMBOLS,
  CHART_TYPES,
  TIMEFRAMES,
  INDICATORS,
  DRAWING_TOOLS,
  getCandles,
  rsiSeries,
  cvdSeries,
} from "@/lib/data/helios";
import { fmtUsd, fmtSignedPct, fmtCompact, signClass } from "@/lib/format";
import { priceWalk } from "@/lib/rng";

export const metadata = { title: "HELIOS — Charting Engine" };

const ACTIVE_SYM = "BTC-USD";
const ACTIVE_TF = "1h" as const;

export default function ChartsPage() {
  const sym = HELIOS_SYMBOLS.find((s) => s.sym === ACTIVE_SYM)!;
  const candles = getCandles(ACTIVE_SYM, ACTIVE_TF, 120);
  const rsi = rsiSeries(candles);
  const rsiNow = rsi[rsi.length - 1];
  const cvd = cvdSeries(ACTIVE_SYM, 60);
  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  const chgPct = ((last.c - prev.c) / prev.c) * 100;

  const compareSyms = HELIOS_SYMBOLS.slice(1, 5);

  return (
    <div className="space-y-5">
      <PageHeader
        module={{ name: "HELIOS · Charts & Order Flow", tone: "info" }}
        title="Charting Engine"
        desc="Multi-timeframe candlestick engine with indicators, overlays, and drawing tools. 60fps GPU rendering when live feed is enabled."
        right={
          <div className="flex items-center gap-2">
            <Chip tone="default">
              <span className="h-1.5 w-1.5 rounded-full bg-pos mr-1.5 inline-block" />
              DEMO snapshot
            </Chip>
            <button className="btn btn-accent">
              <Icon name="play" width={14} height={14} />
              Go Live
            </button>
          </div>
        }
      />

      {/* KPI deck */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
        <KpiCard
          label="LAST PRICE"
          value={fmtUsd(last.c, last.c > 1000 ? 0 : 2)}
          sub={<span className={signClass(chgPct)}>{fmtSignedPct(chgPct)} today</span>}
          tone={chgPct >= 0 ? "pos" : "neg"}
          icon={<Icon name="candle" width={14} height={14} />}
        />
        <KpiCard
          label="24H VOLUME"
          value={sym.vol}
          sub="notional traded"
          icon={<Icon name="bars" width={14} height={14} />}
        />
        <KpiCard
          label="RSI(14)"
          value={rsiNow.toFixed(1)}
          sub={rsiNow > 70 ? "Overbought zone" : rsiNow < 30 ? "Oversold zone" : "Neutral range"}
          tone={rsiNow > 70 ? "warn" : rsiNow < 30 ? "neg" : undefined}
          icon={<Activity width={14} height={14} />}
        />
        <KpiCard
          label="SESSION HIGH"
          value={fmtUsd(Math.max(...candles.slice(-24).map((c) => c.h)), 0)}
          sub="rolling 24-candle window"
          icon={<Icon name="target" width={14} height={14} />}
        />
        <KpiCard
          label="SESSION LOW"
          value={fmtUsd(Math.min(...candles.slice(-24).map((c) => c.l)), 0)}
          sub="rolling 24-candle window"
          icon={<Icon name="gauge" width={14} height={14} />}
        />
        <KpiCard
          label="DEPTH CAP"
          value={sym.depthCap === "full-depth" ? "L2/L3" : sym.depthCap === "top-of-book" ? "ToB" : "Delayed"}
          sub={sym.depthCap === "full-depth" ? "Binance WS free" : sym.depthCap === "top-of-book" ? "Top-of-book only" : "15-min delay"}
          tone={sym.depthCap === "full-depth" ? "pos" : sym.depthCap === "top-of-book" ? "warn" : "neg"}
          icon={<Icon name="layers" width={14} height={14} />}
        />
      </div>

      {/* Main chart area */}
      <div className="grid gap-4 xl:grid-cols-[1fr_220px]">
        <Panel className="min-w-0">
          {/* Toolbar row */}
          <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2.5">
            {/* Symbol selector */}
            <div className="flex items-center gap-1.5">
              <Ticker sym={ACTIVE_SYM} />
              <Chip
                tone={sym.depthCap === "full-depth" ? "pos" : sym.depthCap === "top-of-book" ? "warn" : "neg"}
              >
                {sym.depthCap}
              </Chip>
            </div>

            <div className="h-4 w-px bg-line mx-1" />

            {/* Timeframe chips */}
            <div className="flex items-center gap-1">
              {TIMEFRAMES.map((tf) => (
                <span
                  key={tf}
                  className={`chip cursor-pointer ${tf === ACTIVE_TF ? "chip-accent" : "hover:bg-elevated/60"}`}
                >
                  {tf}
                </span>
              ))}
            </div>

            <div className="h-4 w-px bg-line mx-1" />

            {/* Chart type chips */}
            <div className="flex items-center gap-1">
              {CHART_TYPES.map((ct) => (
                <span
                  key={ct.id}
                  className={`chip cursor-pointer ${ct.id === "candlestick" ? "chip-accent" : "hover:bg-elevated/60"}`}
                >
                  {ct.label}
                </span>
              ))}
            </div>

            <div className="ml-auto flex items-center gap-2">
              <Chip tone="info">DEMO snapshot</Chip>
              <span className="text-xs text-dim">60fps GPU when live</span>
            </div>
          </div>

          {/* Drawing tools sidebar + chart */}
          <div className="flex">
            {/* Drawing tools palette */}
            <div className="flex w-10 shrink-0 flex-col items-center gap-1.5 border-r border-line py-3 px-1">
              {DRAWING_TOOLS.map((tool) => (
                <button
                  key={tool.id}
                  title={tool.label}
                  className="flex h-7 w-7 items-center justify-center rounded text-dim transition-colors hover:bg-elevated hover:text-muted"
                >
                  <Icon name={tool.icon} width={14} height={14} />
                </button>
              ))}
              <div className="mt-auto h-px w-6 bg-line" />
              <button className="flex h-7 w-7 items-center justify-center rounded text-dim hover:bg-elevated hover:text-muted" title="Crosshair">
                <Icon name="target" width={14} height={14} />
              </button>
              <button className="flex h-7 w-7 items-center justify-center rounded text-dim hover:bg-elevated hover:text-muted" title="Magnet">
                <Icon name="gauge" width={14} height={14} />
              </button>
            </div>

            {/* Chart canvas */}
            <div className="flex-1 min-w-0 p-4">
              <Candles data={candles} width={900} height={320} sma={20} className="w-full" />

              {/* RSI sub-pane */}
              <div className="mt-2 border-t border-line pt-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="section-label text-[10px]">RSI(14)</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted">{rsiNow.toFixed(1)}</span>
                    {rsiNow > 70 && <Chip tone="warn">Overbought</Chip>}
                    {rsiNow < 30 && <Chip tone="neg">Oversold</Chip>}
                  </div>
                </div>
                <div className="relative">
                  <Sparkline
                    data={rsi.slice(-80)}
                    width={900}
                    height={56}
                    color={rsiNow > 70 ? "var(--warn)" : rsiNow < 30 ? "var(--neg)" : "var(--accent)"}
                    area={false}
                    strokeWidth={1.2}
                    className="w-full"
                  />
                  {/* Overbought / oversold bands */}
                  <svg
                    className="pointer-events-none absolute inset-0 w-full"
                    viewBox="0 0 900 56"
                    preserveAspectRatio="none"
                  >
                    <line x1={0} y1={56 * 0.3} x2={900} y2={56 * 0.3} stroke="var(--warn)" strokeWidth={0.7} strokeDasharray="3,3" opacity={0.4} />
                    <line x1={0} y1={56 * 0.7} x2={900} y2={56 * 0.7} stroke="var(--neg)" strokeWidth={0.7} strokeDasharray="3,3" opacity={0.4} />
                    <text x={4} y={56 * 0.3 - 2} fontSize={7} fontFamily="var(--font-mono)" fill="var(--warn)" opacity={0.7}>70</text>
                    <text x={4} y={56 * 0.7 + 8} fontSize={7} fontFamily="var(--font-mono)" fill="var(--neg)" opacity={0.7}>30</text>
                  </svg>
                </div>
              </div>

              {/* CVD strip */}
              <div className="mt-2 border-t border-line pt-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="section-label text-[10px]">CVD — Cumulative Volume Delta</span>
                  <span className="font-mono text-xs text-muted">{fmtCompact(cvd[cvd.length - 1])}</span>
                </div>
                <DeltaBars data={cvd.slice(-60)} width={900} height={36} className="w-full" />
              </div>
            </div>
          </div>
        </Panel>

        {/* Indicator list panel */}
        <div className="space-y-4">
          <Panel>
            <PanelHeader title="Indicators" right={<button className="chip hover:chip-accent">+ Add</button>} />
            <div className="divide-y divide-line/60">
              {INDICATORS.map((ind) => (
                <div key={ind.id} className="flex items-center justify-between px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${ind.active ? "bg-accent" : "bg-line"}`}
                    />
                    <span className={`text-sm ${ind.active ? "text-ink" : "text-dim"}`}>{ind.label}</span>
                  </div>
                  <button className="text-dim hover:text-muted">
                    <Icon name="eye" width={13} height={13} />
                  </button>
                </div>
              ))}
            </div>
          </Panel>

          {/* Drawing tools list */}
          <Panel>
            <PanelHeader title="Drawing Tools" />
            <div className="divide-y divide-line/60">
              {DRAWING_TOOLS.map((tool) => (
                <button
                  key={tool.id}
                  className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-muted transition-colors hover:bg-elevated/40 hover:text-ink"
                >
                  <Icon name={tool.icon} width={13} height={13} className="shrink-0 text-dim" />
                  {tool.label}
                </button>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      {/* Multi-symbol compare strip */}
      <Panel>
        <PanelHeader
          title="Multi-Symbol Compare"
          right={<Chip tone="info">Relative performance — rebased 100</Chip>}
        />
        <div className="grid grid-cols-2 gap-0 divide-x divide-y divide-line md:grid-cols-4">
          {compareSyms.map((s) => {
            const spark = priceWalk(`${s.sym}-compare`, 60, 100, 0.015, s.chg / 100 / 60);
            const chg = ((spark[spark.length - 1] - spark[0]) / spark[0]) * 100;
            return (
              <div key={s.sym} className="flex flex-col gap-2 px-4 py-3 hover:bg-elevated/30 transition-colors">
                <div className="flex items-center justify-between">
                  <Ticker sym={s.sym} name={s.name} />
                  <span className={`font-mono text-xs ${signClass(chg)}`}>{fmtSignedPct(chg)}</span>
                </div>
                <Sparkline data={spark} width={160} height={40} />
                <div className="flex items-center gap-2">
                  <Chip
                    tone={s.depthCap === "full-depth" ? "pos" : s.depthCap === "top-of-book" ? "warn" : "default"}
                  >
                    {s.depthCap}
                  </Chip>
                  <span className="text-xs text-dim">Vol {s.vol}</span>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* Live data capability footer */}
      <div className="flex flex-wrap items-center gap-3 rounded border border-info/20 bg-info/5 px-4 py-3 text-xs text-info">
        <Icon name="plug" width={14} height={14} className="shrink-0" />
        <span className="font-medium">Live data capability:</span>
        <span className="text-dim">Crypto (BTC/ETH) — free full-depth L2/L3 via Binance WS + Coinbase WS.</span>
        <span className="text-dim">Equities/Futures — top-of-book delayed; upgrade to Databento/Polygon for licensed tick data.</span>
        <Chip tone="info">DEMO snapshot shown above</Chip>
      </div>
    </div>
  );
}
