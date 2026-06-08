import { PageHeader, Panel, PanelHeader, Chip, Th, Td, Ticker, KpiCard } from "@/components/ui/kit";
import { LiveStat } from "@/components/live/live-stat";
import { Sparkline } from "@/components/ui/viz";
import { Icon } from "@/components/icon-map";
import { Sparkle } from "@/components/icons";
import { signClass, fmtSignedPct } from "@/lib/format";
import { cn } from "@/lib/cn";
import { SCREENER_ROWS, SAVED_SCREENS } from "@/lib/data/obsidian";
import { priceWalk } from "@/lib/rng";
import { ScreenerInteractive } from "@/components/terminal/screener-interactive";
import { LiveScreener } from "@/components/markets/live-screener";

export const metadata = { title: "Screener / Scanner — OBSIDIAN Terminal" };

export default function ScreenerPage() {
  const rows = SCREENER_ROWS;

  return (
    <div className="space-y-5">
      <PageHeader
        module={{ name: "OBSIDIAN · Terminal", tone: "accent" }}
        title="Screener & Scanner — interactive"
        desc="Multi-factor equity screen across 5,000+ securities. Filter by sector, fundamentals, technicals, and alt-data signals."
        right={
          <div className="flex gap-2">
            <button className="btn">
              <Icon name="filter" width={14} height={14} />
              Reset Filters
            </button>
            <button className="btn btn-accent">
              <Icon name="play" width={14} height={14} />
              Run Screen
            </button>
          </div>
        }
      />

      <LiveScreener />

      <ScreenerInteractive />

      {/* KPI summary */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="UNIVERSE" value={<LiveStat value={5284} decimals={0} vol={0.01} />} sub="US equities · ADV > $1M" icon={<Icon name="grid" width={14} height={14} />} />
        <KpiCard label="PASSED SCREEN" value={`${rows.length}`} sub="Current filters applied" tone="accent" icon={<Icon name="filter" width={14} height={14} />} />
        <KpiCard label="AVG P/E" value={<LiveStat value={32.4} suffix="x" decimals={1} vol={0.006} />} sub="Filtered universe" icon={<Icon name="scale" width={14} height={14} />} />
        <KpiCard label="AVG REV GROWTH" value="+21.8%" sub="YoY, filtered" tone="pos" icon={<Icon name="activity" width={14} height={14} />} />
      </div>

      {/* ATHENA natural language callout */}
      <Panel glow>
        <div className="flex items-center gap-4 px-5 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-ai/30 bg-ai/10">
            <Sparkle width={20} height={20} className="text-ai" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-ink">Ask ATHENA in plain English</span>
              <Chip tone="ai">AI Copilot</Chip>
            </div>
            <p className="mt-0.5 text-sm text-dim">
              &ldquo;Show me small-cap defense names with revenue acceleration, low short interest, and recent insider buying&rdquo; — ATHENA translates to a factor screen and runs it.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="flex h-9 w-80 cursor-text items-center rounded-md border border-ai/30 bg-ai/5 px-3 font-mono text-sm text-dim">
              <span className="opacity-50">Describe what you&apos;re looking for...</span>
              <span className="ml-auto text-2xs text-faint">⌘K</span>
            </div>
            <button className="btn btn-accent">
              <Sparkle width={14} height={14} />
              Screen
            </button>
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-4">
        {/* Filter rail */}
        <Panel className="xl:col-span-1">
          <PanelHeader title="Filters" right={<button className="font-mono text-2xs text-accent hover:underline">Reset</button>} />
          <div className="space-y-4 px-4 py-4">
            {/* Sector chips */}
            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-widest text-dim">Sector</div>
              <div className="flex flex-wrap gap-1.5">
                {["All", "Semis", "Software", "Defense", "Healthcare", "Consumer", "Financials", "Energy", "Industrials"].map((s) => (
                  <span
                    key={s}
                    className={cn("chip cursor-pointer", s === "All" ? "chip-accent" : "")}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {/* P/E range */}
            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-widest text-dim">P/E Ratio</div>
              <div className="flex gap-2">
                <div className="flex-1 rounded border border-line bg-elevated px-2.5 py-1.5 font-mono text-xs text-muted">Min: 10x</div>
                <div className="flex-1 rounded border border-line bg-elevated px-2.5 py-1.5 font-mono text-xs text-muted">Max: 60x</div>
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                {["< 15x", "15–30x", "30–50x", "> 50x"].map((r) => (
                  <span key={r} className="chip cursor-pointer text-2xs">{r}</span>
                ))}
              </div>
            </div>

            {/* Rev growth */}
            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-widest text-dim">Revenue Growth</div>
              <div className="flex gap-2">
                <div className="flex-1 rounded border border-line bg-elevated px-2.5 py-1.5 font-mono text-xs text-muted">Min: 0%</div>
                <div className="flex-1 rounded border border-line bg-elevated px-2.5 py-1.5 font-mono text-xs text-muted">Max: 100%</div>
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                {["> 10%", "> 25%", "> 50%", "< 0%"].map((r) => (
                  <span key={r} className={cn("chip cursor-pointer text-2xs", r === "> 25%" ? "chip-accent" : "")}>{r}</span>
                ))}
              </div>
            </div>

            {/* FCF yield */}
            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-widest text-dim">FCF Yield</div>
              <div className="flex flex-wrap gap-1">
                {["> 1%", "> 2%", "> 4%", "> 6%"].map((r) => (
                  <span key={r} className="chip cursor-pointer text-2xs">{r}</span>
                ))}
              </div>
            </div>

            {/* Beta */}
            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-widest text-dim">Beta</div>
              <div className="flex flex-wrap gap-1">
                {["< 0.8", "0.8–1.2", "1.2–1.6", "> 1.6"].map((r) => (
                  <span key={r} className="chip cursor-pointer text-2xs">{r}</span>
                ))}
              </div>
            </div>

            {/* RSI */}
            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-widest text-dim">RSI (14D)</div>
              <div className="flex flex-wrap gap-1">
                {["< 30 (OS)", "30–50", "50–70", "> 70 (OB)"].map((r) => (
                  <span key={r} className="chip cursor-pointer text-2xs">{r}</span>
                ))}
              </div>
            </div>

            {/* Mkt cap */}
            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-widest text-dim">Market Cap</div>
              <div className="flex flex-wrap gap-1">
                {["Mega (>200B)", "Large (10–200B)", "Mid (2–10B)", "Small (<2B)"].map((r) => (
                  <span key={r} className="chip cursor-pointer text-2xs">{r}</span>
                ))}
              </div>
            </div>

            {/* Alt data */}
            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-widest text-dim">PANTHEON Signals</div>
              <div className="flex flex-wrap gap-1">
                {["Insider buy cluster", "Momentum Z > 1.5", "Web signal bullish", "Low crowding"].map((r) => (
                  <span key={r} className="chip chip-ai cursor-pointer text-2xs">{r}</span>
                ))}
              </div>
            </div>
          </div>
        </Panel>

        {/* Results table */}
        <div className="space-y-4 xl:col-span-3">
          <Panel>
            <PanelHeader
              title={`Screen Results — ${rows.length} securities matched`}
              right={
                <div className="flex gap-2">
                  <Chip tone="accent">{rows.length} results</Chip>
                  <button className="btn text-xs">Export CSV</button>
                </div>
              }
            />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] border-collapse">
                <thead>
                  <tr>
                    <Th>Symbol</Th>
                    <Th>Sector</Th>
                    <Th right>Mkt Cap ($B)</Th>
                    <Th right>P/E</Th>
                    <Th right>Fwd P/E</Th>
                    <Th right>Rev Gr%</Th>
                    <Th right>EPS Gr%</Th>
                    <Th right>FCF Yld</Th>
                    <Th right>Beta</Th>
                    <Th right>RSI</Th>
                    <Th right>Momentum</Th>
                    <Th right>Short %</Th>
                    <Th right>Spark 30D</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const spark = priceWalk(row.sym + "-scr-spark", 30, 100, 0.02, row.momentum / 100 / 30);
                    return (
                      <tr key={row.sym} className="group hover:bg-elevated/40">
                        <Td mono={false}>
                          <Ticker sym={row.sym} name={row.name} />
                        </Td>
                        <Td mono={false} className="text-dim text-xs">{row.sector}</Td>
                        <Td right>{row.mktcap.toFixed(0)}</Td>
                        <Td right className={row.pe > 50 ? "text-warn" : ""}>{row.pe.toFixed(1)}x</Td>
                        <Td right>{row.fwdPe.toFixed(1)}x</Td>
                        <Td right className={signClass(row.revGrowth)}>{fmtSignedPct(row.revGrowth)}</Td>
                        <Td right className={signClass(row.epsGrowth)}>{fmtSignedPct(row.epsGrowth)}</Td>
                        <Td right className={row.fcfYield > 3 ? "text-pos" : row.fcfYield < 0 ? "text-neg" : "text-muted"}>
                          {row.fcfYield.toFixed(1)}%
                        </Td>
                        <Td right className={row.beta > 1.5 ? "text-warn" : "text-muted"}>{row.beta.toFixed(2)}</Td>
                        <Td right className={row.rsi > 70 ? "text-warn" : row.rsi < 30 ? "text-neg" : "text-muted"}>
                          {row.rsi}
                        </Td>
                        <Td right className={signClass(row.momentum)}>{fmtSignedPct(row.momentum)}</Td>
                        <Td right className={row.short > 10 ? "text-neg" : "text-muted"}>{row.short.toFixed(1)}%</Td>
                        <Td right>
                          <Sparkline data={spark} width={72} height={22} />
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-line px-4 py-2.5 text-xs text-dim">
              <span>Showing {rows.length} of {rows.length} results · sorted by market cap desc</span>
              <span>Data: yfinance + SEC EDGAR · Refresh: 15m delay</span>
            </div>
          </Panel>

          {/* Saved screens */}
          <Panel>
            <PanelHeader
              title="Saved Screens"
              right={
                <button className="btn btn-accent text-xs">
                  <Icon name="bolt" width={12} height={12} />
                  Save current
                </button>
              }
            />
            <ul className="divide-y divide-line">
              {SAVED_SCREENS.map((s, i) => (
                <li key={i} className="group flex items-center gap-4 px-4 py-3 hover:bg-elevated/40">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-ink">{s.name}</span>
                      <Chip tone="accent" className="text-2xs">{s.count} results</Chip>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-dim">{s.desc}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="font-mono text-xs text-faint">{s.lastRun}</span>
                    <button className="btn text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                      <Icon name="play" width={12} height={12} />
                      Run
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
