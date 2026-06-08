import { PageHeader, Panel, PanelHeader, Chip, KpiCard, Stat, Th, Td, Ticker, StatusDot } from "@/components/ui/kit";
import { Sparkline, MiniBars } from "@/components/ui/viz";
import { PriceLadderDOM } from "@/components/helios/dom";
import { Icon } from "@/components/icon-map";
import { Activity, Bolt, Wave, Clock } from "@/components/icons";
import {
  HELIOS_SYMBOLS,
  domRows,
  tapeSeries,
  getCandles,
} from "@/lib/data/helios";
import { fmtInt, fmtUsd, fmtCompact, signClass, fmtSignedPct } from "@/lib/format";
import { LiveOrderFlowPanel } from "@/components/live/live-orderflow-panel";

export const metadata = { title: "HELIOS — DOM & Tape" };

const ACTIVE_SYM = "BTC-USD";

export default function DomPage() {
  const sym = HELIOS_SYMBOLS.find((s) => s.sym === ACTIVE_SYM)!;
  const dom = domRows(ACTIVE_SYM, 16);
  const tape = tapeSeries(ACTIVE_SYM, 42);
  const candles = getCandles(ACTIVE_SYM, "1m", 60);

  // Speed-of-tape: bucket tape by time into 10 bins
  const binSize = Math.ceil(tape.length / 10);
  const tapeBins = Array.from({ length: 10 }, (_, i) => {
    const slice = tape.slice(i * binSize, (i + 1) * binSize);
    return slice.length;
  });

  const midRow = dom.find((r) => r.isMid)!;
  const bidRows = dom.filter((r) => r.bidSize > 0 && !r.isMid);
  const askRows = dom.filter((r) => r.askSize > 0);
  const totalBid = bidRows.reduce((s, r) => s + r.bidSize, 0);
  const totalAsk = askRows.reduce((s, r) => s + r.askSize, 0);
  const bidAskRatio = totalBid / (totalAsk || 1);

  const largePrints = tape.filter((t) => t.large);
  const buyCount = tape.filter((t) => t.side === "buy").length;
  const sellCount = tape.filter((t) => t.side === "sell").length;

  return (
    <div className="space-y-5">
      <LiveOrderFlowPanel />
      <PageHeader
        module={{ name: "HELIOS · Charts & Order Flow", tone: "info" }}
        title="DOM & Tape — Jigsaw View"
        desc="Price-ladder depth of market, Time & Sales tape, and speed-of-tape indicator. Real DOM via exchange WS when live."
        right={
          <div className="flex items-center gap-2">
            <Chip tone="warn">Demo snapshot · live via Binance WS when enabled</Chip>
            <button className="btn btn-accent">
              <Bolt width={14} height={14} />
              Enable Live
            </button>
          </div>
        }
      />

      {/* KPI deck */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-5">
        <KpiCard
          label="MID PRICE"
          value={fmtUsd(sym.price, 0)}
          sub={<span className={signClass(sym.chg)}>{fmtSignedPct(sym.chg)}</span>}
          tone={sym.chg >= 0 ? "pos" : "neg"}
          icon={<Icon name="candle" width={14} height={14} />}
        />
        <KpiCard
          label="BID / ASK RATIO"
          value={bidAskRatio.toFixed(2)}
          sub={bidAskRatio > 1.1 ? "Bid-heavy — buyers dominant" : bidAskRatio < 0.9 ? "Ask-heavy — sellers dominant" : "Balanced"}
          tone={bidAskRatio > 1.15 ? "pos" : bidAskRatio < 0.85 ? "neg" : undefined}
          icon={<Icon name="scale" width={14} height={14} />}
        />
        <KpiCard
          label="TOTAL BID DEPTH"
          value={fmtCompact(totalBid)}
          sub={`${dom.filter((r) => r.bidSize > 0).length} levels`}
          icon={<Activity width={14} height={14} />}
        />
        <KpiCard
          label="TOTAL ASK DEPTH"
          value={fmtCompact(totalAsk)}
          sub={`${dom.filter((r) => r.askSize > 0).length} levels`}
          icon={<Wave width={14} height={14} />}
        />
        <KpiCard
          label="LARGE PRINTS"
          value={String(largePrints.length)}
          sub="trades > 300 contracts"
          tone={largePrints.length > 2 ? "warn" : undefined}
          icon={<Icon name="bolt" width={14} height={14} />}
        />
      </div>

      {/* Main DOM + Tape layout */}
      <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
        {/* Price Ladder DOM */}
        <Panel>
          <PanelHeader
            title="Price Ladder DOM"
            sub={`${ACTIVE_SYM} · ${dom.length} price levels`}
            right={
              <div className="flex items-center gap-1.5">
                <StatusDot tone="pos" pulse />
                <Chip tone="warn">Demo</Chip>
              </div>
            }
          />
          <PriceLadderDOM rows={dom} />
          <div className="border-t border-line px-4 py-2.5 text-xs text-dim">
            <div className="flex items-start gap-1.5">
              <Icon name="shield" width={12} height={12} className="mt-0.5 shrink-0 text-faint" />
              <span>
                Large blocks highlighted. Real depth: free on crypto via Binance WS;
                equities via Databento/Polygon (optional upgrade).
              </span>
            </div>
          </div>
        </Panel>

        {/* Right column: tape + speed */}
        <div className="space-y-4">
          {/* Mini chart */}
          <Panel>
            <PanelHeader
              title={`${ACTIVE_SYM} — 1m Chart`}
              right={<Chip tone="accent">1m · 60 candles</Chip>}
            />
            <div className="p-4">
              <Sparkline
                data={candles.map((c) => c.c)}
                width={700}
                height={60}
                color={candles[candles.length - 1].c >= candles[0].c ? "var(--pos)" : "var(--neg)"}
                className="w-full"
              />
            </div>
          </Panel>

          {/* Speed of Tape */}
          <Panel>
            <PanelHeader
              title="Speed of Tape"
              sub="Trades per time interval — acceleration indicator"
              right={
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-ink">{tape.length} trades</span>
                  <Chip tone={buyCount > sellCount ? "pos" : "neg"}>
                    {buyCount}B / {sellCount}S
                  </Chip>
                </div>
              }
            />
            <div className="px-4 py-4">
              <MiniBars data={tapeBins} width={600} height={44} color="var(--accent)" className="w-full" />
              <div className="mt-2 flex items-center justify-between text-xs text-dim">
                <span>oldest ←</span>
                <span>Bars = trade count per interval</span>
                <span>→ newest</span>
              </div>
            </div>
            <div className="grid grid-cols-3 divide-x divide-line border-t border-line">
              <div className="px-4 py-2.5">
                <Stat label="Buy %"
                  value={`${((buyCount / tape.length) * 100).toFixed(0)}%`}
                  tone="pos"
                />
              </div>
              <div className="px-4 py-2.5">
                <Stat label="Sell %"
                  value={`${((sellCount / tape.length) * 100).toFixed(0)}%`}
                  tone="neg"
                />
              </div>
              <div className="px-4 py-2.5">
                <Stat label="Tape speed"
                  value={tapeBins[tapeBins.length - 1] > tapeBins[0] * 1.5 ? "Accelerating" : tapeBins[tapeBins.length - 1] < tapeBins[0] * 0.7 ? "Slowing" : "Steady"}
                  tone={tapeBins[tapeBins.length - 1] > tapeBins[0] * 1.5 ? "warn" : undefined}
                  mono={false}
                />
              </div>
            </div>
          </Panel>

          {/* Time & Sales tape */}
          <Panel>
            <PanelHeader
              title="Time & Sales Tape"
              sub={`${ACTIVE_SYM} · ${tape.length} recent trades`}
              right={<Chip tone="warn">Demo snapshot</Chip>}
            />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px] border-collapse">
                <thead>
                  <tr>
                    <Th>Time</Th>
                    <Th right>Price</Th>
                    <Th right>Size</Th>
                    <Th right>Side</Th>
                    <Th right>Flag</Th>
                  </tr>
                </thead>
                <tbody>
                  {tape.map((row, i) => (
                    <tr
                      key={i}
                      className={`group transition-colors hover:bg-elevated/40 ${
                        row.large ? "bg-warn/5" : ""
                      }`}
                    >
                      <Td mono className="text-dim">
                        <div className="flex items-center gap-1.5">
                          <Clock width={11} height={11} className="text-faint shrink-0" />
                          {row.time}
                        </div>
                      </Td>
                      <Td right className={row.side === "buy" ? "text-pos" : "text-neg"}>
                        {fmtUsd(row.price, row.price > 1000 ? 0 : 2)}
                      </Td>
                      <Td right className={row.large ? "text-warn font-semibold" : "text-muted"}>
                        {fmtInt(row.size)}
                      </Td>
                      <Td right>
                        <Chip tone={row.side === "buy" ? "pos" : "neg"}>
                          {row.side.toUpperCase()}
                        </Chip>
                      </Td>
                      <Td right>
                        {row.large ? (
                          <Chip tone="warn">LARGE</Chip>
                        ) : null}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      </div>

      {/* Capability note */}
      <div className="flex flex-wrap items-center gap-3 rounded border border-info/20 bg-info/5 px-4 py-3 text-xs text-info">
        <Icon name="plug" width={14} height={14} className="shrink-0" />
        <span className="font-medium">Live DOM capability:</span>
        <span className="text-dim">
          Crypto full-depth free via Binance WS. Equities top-of-book via Alpaca/Finnhub (free tier).
          Full institutional-grade L3 MBO data: Databento (licensed). All shown above is DEMO.
        </span>
      </div>
    </div>
  );
}
