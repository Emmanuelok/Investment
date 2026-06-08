import { PageHeader, Panel, PanelHeader, Chip, KpiCard, Stat, Th, Td, Ticker, StatusDot } from "@/components/ui/kit";
import { LiveStat, LiveDot } from "@/components/live/live-stat";
import { Sparkline, Ring, ProgressBar } from "@/components/ui/viz";
import { Candles } from "@/components/ui/candles";
import { Icon } from "@/components/icon-map";
import { signClass, fmtNum, fmtSignedPct, fmtBps } from "@/lib/format";
import { cn } from "@/lib/cn";
import {
  MARKET_INDICES,
  SPY_CANDLES,
  SECTORS,
  TOP_GAINERS,
  TOP_LOSERS,
  FX_RATES,
  RATES_TABLE,
  CRYPTO_TABLE,
} from "@/lib/data/obsidian";

export const metadata = { title: "Markets Overview — OBSIDIAN Terminal" };

export default function MarketsOverviewPage() {
  const advancers = 2847;
  const decliners = 1634;
  const unchanged = 319;
  const total = advancers + decliners + unchanged;
  const newHighs = 182;
  const newLows = 47;
  const aboveMA200 = 68.4;

  return (
    <div className="space-y-5">
      <PageHeader
        module={{ name: "OBSIDIAN · Terminal", tone: "accent" }}
        title="Markets Overview"
        desc="Global multi-asset snapshot — indices, sectors, movers, FX, rates, and crypto. As-of close, demo data."
        right={
          <div className="flex items-center gap-2">
            <LiveDot />
            <StatusDot tone="pos" pulse />
            <span className="font-mono text-xs text-muted">MARKETS OPEN</span>
            <Chip tone="accent">NYSE · 14:32 ET</Chip>
          </div>
        }
      />

      {/* Index strip */}
      <div className="overflow-x-auto">
        <div className="flex gap-3 min-w-max pb-1">
          {MARKET_INDICES.map((idx) => (
            <Panel key={idx.sym} hover className="scanline min-w-[160px] px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-medium text-ink">{idx.sym}</span>
                <span className={cn("font-mono text-xs", signClass(idx.chgPct))}>
                  {idx.chgPct >= 0 ? "+" : ""}{idx.chgPct.toFixed(2)}%
                </span>
              </div>
              <div className="mt-0.5 text-2xs text-dim">{idx.name}</div>
              <div className="mt-2">
                <Sparkline data={idx.spark} width={120} height={28} />
              </div>
              <div className="mt-1 flex items-end justify-between">
                <span className="font-mono text-sm font-medium text-ink">
                  {idx.last.toLocaleString("en-US", { maximumFractionDigits: idx.last > 1000 ? 1 : 2 })}
                </span>
                <span className={cn("font-mono text-2xs", signClass(idx.ytd))}>YTD {idx.ytd >= 0 ? "+" : ""}{idx.ytd}%</span>
              </div>
            </Panel>
          ))}
        </div>
      </div>

      {/* Featured chart + breadth */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <PanelHeader
            title="S&P 500 — SPY · 90D Daily"
            sub="DEMO snapshot · SMA-20 overlay · live candles via data pipeline when enabled"
            right={
              <div className="flex items-center gap-2">
                <Chip>SMA 20</Chip>
                <Chip tone="accent">90D</Chip>
              </div>
            }
          />
          <div className="p-3">
            <Candles data={SPY_CANDLES} width={720} height={260} volume sma={20} />
          </div>
          <div className="grid grid-cols-3 divide-x divide-line border-t border-line">
            <div className="px-4 py-2.5">
              <div className="kpi-label">OPEN</div>
              <div className="mt-1 font-mono text-sm text-ink">544.82</div>
            </div>
            <div className="px-4 py-2.5">
              <div className="kpi-label">HIGH / LOW</div>
              <div className="mt-1 font-mono text-sm text-ink">549.14 / 543.28</div>
            </div>
            <div className="px-4 py-2.5">
              <div className="kpi-label">VOLUME</div>
              <div className="mt-1 font-mono text-sm text-ink">84.2M</div>
            </div>
          </div>
        </Panel>

        {/* Market breadth */}
        <Panel>
          <PanelHeader title="Market Breadth — NYSE + Nasdaq" />
          <div className="space-y-5 px-4 py-4">
            <div className="flex items-center justify-center gap-6">
              <Ring
                value={advancers}
                max={total}
                size={88}
                stroke={8}
                color="var(--pos)"
                label={advancers.toLocaleString()}
                sub="ADV"
              />
              <div className="space-y-2 text-center">
                <div>
                  <div className="kpi-label">A/D RATIO</div>
                  <div className="mt-1 font-mono text-lg font-medium text-pos">
                    {(advancers / decliners).toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="kpi-label">UNCHANGED</div>
                  <div className="mt-1 font-mono text-sm text-muted">{unchanged}</div>
                </div>
              </div>
              <Ring
                value={decliners}
                max={total}
                size={88}
                stroke={8}
                color="var(--neg)"
                label={decliners.toLocaleString()}
                sub="DEC"
              />
            </div>

            <div className="space-y-3">
              <div>
                <div className="mb-1.5 flex justify-between text-xs">
                  <span className="text-muted">New Highs</span>
                  <span className="font-mono text-pos">{newHighs}</span>
                </div>
                <ProgressBar value={newHighs} max={newHighs + newLows} color="var(--pos)" height={6} />
              </div>
              <div>
                <div className="mb-1.5 flex justify-between text-xs">
                  <span className="text-muted">New Lows</span>
                  <span className="font-mono text-neg">{newLows}</span>
                </div>
                <ProgressBar value={newLows} max={newHighs + newLows} color="var(--neg)" height={6} />
              </div>
              <div>
                <div className="mb-1.5 flex justify-between text-xs">
                  <span className="text-muted">Above 200D MA</span>
                  <span className="font-mono text-accent">{aboveMA200}%</span>
                </div>
                <ProgressBar value={aboveMA200} color="var(--accent)" height={6} />
              </div>
              <div>
                <div className="mb-1.5 flex justify-between text-xs">
                  <span className="text-muted">Put/Call Ratio</span>
                  <span className="font-mono text-warn">0.84</span>
                </div>
                <ProgressBar value={84} color="var(--warn)" height={6} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <Stat label="VIX" value={<LiveStat value={14.82} decimals={2} vol={0.004} />} tone="accent" />
              <Stat label="VXST" value={<LiveStat value={12.41} decimals={2} vol={0.004} />} tone="accent" />
              <Stat label="SKEW" value={<LiveStat value={134.2} decimals={1} vol={0.004} />} />
              <Stat label="NYSE TICK" value="+482" tone="pos" />
            </div>
          </div>
        </Panel>
      </div>

      {/* Sector heat grid */}
      <Panel>
        <PanelHeader
          title="S&P 500 Sector Performance"
          right={<Chip>1D change shown</Chip>}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse">
            <thead>
              <tr>
                <Th>Sector</Th>
                <Th>ETF</Th>
                <Th right>1D</Th>
                <Th right>MTD</Th>
                <Th right>YTD</Th>
                <Th right>Heat</Th>
              </tr>
            </thead>
            <tbody>
              {SECTORS.map((s) => (
                <tr key={s.sym} className="group hover:bg-elevated/40">
                  <Td mono={false} className="font-medium text-ink">{s.name}</Td>
                  <Td>
                    <span className="inline-flex items-center rounded border border-line bg-elevated/70 px-1.5 py-0.5 font-mono text-2xs font-medium text-ink">
                      {s.sym}
                    </span>
                  </Td>
                  <Td right className={signClass(s.chgPct)}>{fmtSignedPct(s.chgPct)}</Td>
                  <Td right className={signClass(s.mtd)}>{fmtSignedPct(s.mtd)}</Td>
                  <Td right className={signClass(s.ytd)}>{fmtSignedPct(s.ytd)}</Td>
                  <Td right>
                    <div className="flex items-center justify-end gap-2">
                      <div
                        className="h-4 w-20 rounded-[2px]"
                        style={{
                          background: `rgba(${s.chgPct > 0 ? "31,229,192" : "255,93,99"},${Math.abs(s.chgPct) / 3})`,
                        }}
                      />
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Gainers / Losers */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHeader
            title="Top Gainers — Today"
            right={<Chip tone="pos">+</Chip>}
          />
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <Th>Symbol</Th>
                  <Th right>Last</Th>
                  <Th right>Chg %</Th>
                  <Th right>Volume</Th>
                  <Th right>Mkt Cap</Th>
                </tr>
              </thead>
              <tbody>
                {TOP_GAINERS.map((g) => (
                  <tr key={g.sym} className="group hover:bg-elevated/40">
                    <Td mono={false}>
                      <Ticker sym={g.sym} name={g.name} />
                    </Td>
                    <Td right>{fmtNum(g.last)}</Td>
                    <Td right className="text-pos font-medium">{fmtSignedPct(g.chgPct)}</Td>
                    <Td right className="text-muted">{g.vol}</Td>
                    <Td right className="text-muted">{g.mktcap}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            title="Top Losers — Today"
            right={<Chip tone="neg">−</Chip>}
          />
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <Th>Symbol</Th>
                  <Th right>Last</Th>
                  <Th right>Chg %</Th>
                  <Th right>Volume</Th>
                  <Th right>Mkt Cap</Th>
                </tr>
              </thead>
              <tbody>
                {TOP_LOSERS.map((g) => (
                  <tr key={g.sym} className="group hover:bg-elevated/40">
                    <Td mono={false}>
                      <Ticker sym={g.sym} name={g.name} />
                    </Td>
                    <Td right>{fmtNum(g.last)}</Td>
                    <Td right className="text-neg font-medium">{fmtSignedPct(g.chgPct)}</Td>
                    <Td right className="text-muted">{g.vol}</Td>
                    <Td right className="text-muted">{g.mktcap}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      {/* FX + Rates + Crypto */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel>
          <PanelHeader title="FX Rates" right={<Icon name="globe" width={14} height={14} className="text-dim" />} />
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <Th>Pair</Th>
                <Th right>Rate</Th>
                <Th right>1D</Th>
              </tr>
            </thead>
            <tbody>
              {FX_RATES.map((fx) => (
                <tr key={fx.pair} className="hover:bg-elevated/40">
                  <Td mono={false} className="font-medium">{fx.pair}</Td>
                  <Td right>{fx.rate.toFixed(4)}</Td>
                  <Td right className={signClass(fx.chgPct)}>{fmtSignedPct(fx.chgPct)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel>
          <PanelHeader title="US Rates" right={<Icon name="wave" width={14} height={14} className="text-dim" />} />
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <Th>Tenor</Th>
                <Th right>Yield</Th>
                <Th right>1D Δ</Th>
              </tr>
            </thead>
            <tbody>
              {RATES_TABLE.map((r) => (
                <tr key={r.tenor} className="hover:bg-elevated/40">
                  <Td mono={false} className="text-muted">{r.tenor}</Td>
                  <Td right className="text-ink">{r.yield.toFixed(3)}%</Td>
                  <Td right className={signClass(r.chgBps)}>{fmtBps(r.chgBps)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel>
          <PanelHeader title="Crypto Spot" right={<Icon name="coins" width={14} height={14} className="text-dim" />} />
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <Th>Asset</Th>
                <Th right>Price</Th>
                <Th right>24H</Th>
              </tr>
            </thead>
            <tbody>
              {CRYPTO_TABLE.map((c) => (
                <tr key={c.sym} className="hover:bg-elevated/40">
                  <Td mono={false}>
                    <div className="flex flex-col">
                      <span className="font-mono text-xs font-medium text-ink">{c.sym}</span>
                      <span className="text-2xs text-dim">{c.name}</span>
                    </div>
                  </Td>
                  <Td right>${c.last.toLocaleString("en-US", { maximumFractionDigits: c.last > 1000 ? 0 : 2 })}</Td>
                  <Td right className={signClass(c.chgPct)}>{fmtSignedPct(c.chgPct)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-line px-4 py-2.5 text-2xs text-dim">
            Vol 24H: BTC $31.4B · ETH $18.2B · live depth via Binance WS when enabled
          </div>
        </Panel>
      </div>
    </div>
  );
}
