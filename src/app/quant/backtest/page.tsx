import { PageHeader, Panel, PanelHeader, Chip, Th, Td, KpiCard } from "@/components/ui/kit";
import { Sparkline, DeltaBars } from "@/components/ui/viz";
import { Candles } from "@/components/ui/candles";
import { Icon } from "@/components/icon-map";
import { Warn, Shield, Play } from "@/components/icons";
import {
  backtestCandles,
  oosEquityCurve,
  BACKTEST_STATS,
  generateTradeLog,
} from "@/lib/data/kepler";
import { fmtNum, fmtPct, fmtSignedPct, fmtBps, fmtInt } from "@/lib/format";
import { cn } from "@/lib/cn";
import { priceWalk } from "@/lib/rng";
import { BacktestLab } from "@/components/quant/backtest-lab";

export const metadata = { title: "KEPLER — Backtest Engine" };

const s = BACKTEST_STATS;
const candles = backtestCandles();
const oosCurve = oosEquityCurve();
const trades = generateTradeLog();

// IS equity curve as sparkline (from candle closes)
const isSparkline = candles.map((c) => c.c);
// OOS relative to last IS close
const lastIS = isSparkline[isSparkline.length - 1];
const oosNorm = oosCurve.map((v) => (v / oosCurve[0]) * lastIS);

// Monthly PnL bars (synthetic, deterministic)
const monthlyPnl = priceWalk("kepler-monthly-pnl", 24, 0, 0.03, 0.012).map((v, i, a) =>
  i === 0 ? 0 : v - a[i - 1],
);

export default function BacktestPage() {
  return (
    <div className="space-y-5">
      <div className="panel p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="chip chip-ai">Interactive · runs in your browser</span>
          <span className="section-label">Backtest Lab — pick a strategy, tune parameters, watch the overfitting diagnostics react</span>
        </div>
        <BacktestLab />
      </div>
      <PageHeader
        module={{ name: "KEPLER · Quant Lab", tone: "ai" }}
        title="Backtest Engine"
        desc="Realistic-fill simulation with slippage, market impact, and commissions. Overfitting diagnostics are first-class — a high in-sample Sharpe is a warning."
        right={
          <div className="flex items-center gap-2">
            <button className="btn">
              <Icon name="filter" width={14} height={14} />
              Parameters
            </button>
            <button className="btn btn-accent">
              <Play width={14} height={14} />
              Re-run
            </button>
          </div>
        }
      />

      {/* KPI Deck */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-5">
        <KpiCard
          label="CAGR"
          value={fmtPct(s.cagr, 1)}
          sub="net of all costs"
          tone="pos"
          icon={<Icon name="bars" width={14} height={14} />}
        />
        <KpiCard
          label="SHARPE (IS)"
          value={fmtNum(s.sharpeIS)}
          sub={<span className="text-warn">⚠ HIGH — see diagnostics</span>}
          tone="warn"
          icon={<Icon name="gauge" width={14} height={14} />}
        />
        <KpiCard
          label="SHARPE (OOS)"
          value={fmtNum(s.sharpeOOS)}
          sub="held-out period"
          tone="accent"
          icon={<Icon name="gauge" width={14} height={14} />}
        />
        <KpiCard
          label="MAX DRAWDOWN"
          value={fmtSignedPct(s.maxDD, 1)}
          sub={`Calmar ${fmtNum(s.calmar)}`}
          tone="neg"
          icon={<Icon name="activity" width={14} height={14} />}
        />
        <KpiCard
          label="WIN RATE"
          value={fmtPct(s.winPct, 1)}
          sub={`Profit factor ${fmtNum(s.profitFactor)}`}
          tone="pos"
          icon={<Icon name="target" width={14} height={14} />}
        />
      </div>

      {/* Equity Curve */}
      <Panel glow>
        <PanelHeader
          title="Equity Curve — IS (120 bars) + OOS (63 bars)"
          sub={`Momentum + Insider Fusion · Russell 1000 · Seed: kepler-bt-001 · Bit-for-bit reproducible`}
          right={
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 font-mono text-xs text-pos">
                <span className="inline-block h-2 w-5 rounded bg-pos/70" /> IS
              </span>
              <span className="flex items-center gap-1.5 font-mono text-xs text-warn">
                <span className="inline-block h-2 w-5 rounded bg-warn/50 border border-warn/40 border-dashed" /> OOS
              </span>
              <Chip tone="accent">Candles</Chip>
            </div>
          }
        />
        <div className="relative px-1 py-2">
          <Candles data={candles} width={960} height={300} volume sma={20} className="w-full" />
          {/* OOS overlay sparkline */}
          <div className="absolute right-[46px] top-2 w-[calc(33%-46px)] pointer-events-none opacity-80">
            <Sparkline
              data={oosNorm}
              width={280}
              height={292}
              color="var(--warn)"
              strokeWidth={1.6}
              area={false}
            />
          </div>
        </div>
        <div className="border-t border-line px-4 py-3">
          <div className="flex flex-wrap gap-6 text-xs text-dim">
            <span>Period: 2024-01-02 → 2026-06-07</span>
            <span>Universe: Russell 1000 (PIT constituents)</span>
            <span>Rebal: daily signal, weekly execution</span>
            <span className="text-warn font-medium">OOS window shaded — strategy saw zero OOS data during IS optimization</span>
          </div>
        </div>
      </Panel>

      {/* Full Stats Grid + Monthly PnL */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <PanelHeader title="Performance & Risk Statistics" sub="Net of slippage + impact + commission + borrow" />
          <div className="grid grid-cols-2 divide-x divide-y divide-line sm:grid-cols-3 md:grid-cols-5">
            {[
              { label: "CAGR", value: fmtPct(s.cagr, 1), tone: "pos" as const },
              { label: "Ann. Vol", value: fmtPct(s.vol, 1), tone: undefined },
              { label: "Sharpe IS", value: fmtNum(s.sharpeIS), tone: "warn" as const },
              { label: "Sortino", value: fmtNum(s.sortino), tone: "pos" as const },
              { label: "Calmar", value: fmtNum(s.calmar), tone: "pos" as const },
              { label: "Max DD", value: fmtSignedPct(s.maxDD, 1), tone: "neg" as const },
              { label: "Win %", value: fmtPct(s.winPct, 1), tone: "pos" as const },
              { label: "Profit Factor", value: fmtNum(s.profitFactor), tone: "pos" as const },
              { label: "Turnover", value: fmtPct(s.turnover, 1), tone: undefined },
              { label: "Beta", value: fmtNum(s.beta), tone: undefined },
              { label: "Alpha (ann.)", value: fmtPct(s.alpha, 1), tone: "pos" as const },
              { label: "Avg Hold", value: `${s.avgHoldDays}d`, tone: undefined },
              { label: "Num Trades", value: fmtInt(s.numTrades), tone: undefined },
              { label: "Sharpe OOS", value: fmtNum(s.sharpeOOS), tone: "accent" as const },
              { label: "Min TRL", value: `${s.minTRL}yr`, tone: "muted" as const },
            ].map((st) => (
              <div key={st.label} className="flex flex-col gap-0.5 px-4 py-3">
                <span className="kpi-label">{st.label}</span>
                <span className={cn(
                  "font-mono text-lg tabular-nums",
                  st.tone === "pos" ? "text-pos" : st.tone === "neg" ? "text-neg" : st.tone === "warn" ? "text-warn" : st.tone === "accent" ? "text-accent" : st.tone === "muted" ? "text-muted" : "text-ink",
                )}>
                  {st.value}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-line p-4">
            <div className="mb-2 text-xs font-medium text-muted">Monthly PnL (24 months, normalized)</div>
            <DeltaBars data={monthlyPnl} width={600} height={48} className="w-full" />
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Realistic Fills Note" sub="Every simulated fill includes all four cost components" />
          <div className="space-y-3 p-4">
            {[
              {
                icon: "wave",
                label: "Bid-Ask Slippage",
                value: "1.8 bps avg",
                desc: "Half-spread cost on entry and exit, scaled by ADV fraction.",
                tone: "warn",
              },
              {
                icon: "activity",
                label: "Market Impact",
                value: "0.9 bps avg",
                desc: "Square-root market impact model: Δcost ∝ √(participation rate × daily vol).",
                tone: "warn",
              },
              {
                icon: "coins",
                label: "Commission",
                value: "$0.005/sh",
                desc: "Exchange fees + routing cost. Modeled as $0.005/share floor.",
                tone: "default",
              },
              {
                icon: "lock",
                label: "Borrow Cost",
                value: "0.3–4.5% ann.",
                desc: "Short positions carry daily borrow; HTB names excluded from short universe.",
                tone: "default",
              },
            ].map((item) => (
              <div key={item.label} className="flex gap-3 rounded border border-line bg-elevated/30 p-3">
                <Icon name={item.icon} width={14} height={14} className={cn("mt-0.5 shrink-0", item.tone === "warn" ? "text-warn" : "text-accent")} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-ink">{item.label}</span>
                    <span className="font-mono text-xs text-accent">{item.value}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-dim">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-line px-4 py-3 text-xs text-dim">
            Total avg round-trip cost: ~5.4 bps. Strategies with &lt;10 bps gross edge are automatically flagged.
          </div>
        </Panel>
      </div>

      {/* OVERFITTING DIAGNOSTICS — LOUD WARNING PANEL */}
      <div className="relative overflow-hidden rounded-md border-2 border-neg/60 bg-neg/5">
        {/* Loud stripe top */}
        <div className="flex items-center gap-3 border-b-2 border-neg/60 bg-neg/15 px-4 py-3">
          <Warn width={20} height={20} className="shrink-0 text-neg animate-pulse" />
          <div className="flex-1">
            <span className="font-mono text-base font-bold uppercase tracking-wider text-neg">
              Overfitting Diagnostics — REVIEW REQUIRED
            </span>
            <span className="ml-3 font-mono text-xs text-neg/80">
              In-sample Sharpe 2.41 is a WARNING, not a success. Multiple red flags detected.
            </span>
          </div>
          <Chip tone="neg">64 trials run</Chip>
          <Chip tone="warn">Param sensitivity HIGH</Chip>
        </div>

        <div className="grid gap-px bg-neg/10 sm:grid-cols-2 lg:grid-cols-4">
          {/* DSR */}
          <div className="bg-base p-4">
            <div className="kpi-label text-neg mb-1">Deflated Sharpe Ratio (DSR)</div>
            <div className="font-mono text-4xl font-bold tabular-nums text-neg">0.78</div>
            <div className="mt-1 text-xs text-muted">
              True Sharpe adjusted for: selection bias, non-Gaussian returns, strategy length, # trials.
              DSR &lt; 1.0 is below the bar for promotion.
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-neg">
              <Warn width={12} height={12} />
              DSR &lt; 1.0 → BLOCKED from live
            </div>
          </div>

          {/* PBO */}
          <div className="bg-base p-4">
            <div className="kpi-label text-neg mb-1">PBO — Prob. Backtest Overfitting (CSCV)</div>
            <div className="font-mono text-4xl font-bold tabular-nums text-neg">42%</div>
            <div className="mt-1 text-xs text-muted">
              Combinatorial Symmetric Cross-Validation over 64 parameter combinations.
              42% chance the selected params overfit the IS period.
              Threshold: &lt;25% for promotion.
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-neg">
              <Warn width={12} height={12} />
              PBO &gt; 25% → FAILED gate
            </div>
          </div>

          {/* IS vs OOS Sharpe */}
          <div className="bg-base p-4">
            <div className="kpi-label text-warn mb-1">In-Sample → Out-of-Sample Decay</div>
            <div className="flex items-end gap-2">
              <span className="font-mono text-3xl font-bold tabular-nums text-warn">2.41</span>
              <span className="font-mono text-2xl text-neg mb-0.5">→</span>
              <span className="font-mono text-3xl font-bold tabular-nums text-neg">1.05</span>
            </div>
            <div className="mt-1 text-xs text-muted">
              Sharpe ratio collapsed 56% from IS to a fully held-out OOS window.
              Expected decay &lt;30% for a genuine signal.
            </div>
            <div className="mt-2">
              <div className="flex justify-between text-xs text-dim mb-1">
                <span>OOS / IS ratio</span>
                <span className="font-mono text-neg">0.44×</span>
              </div>
              <div className="h-2 w-full rounded-full bg-line overflow-hidden">
                <div className="h-full rounded-full bg-neg" style={{ width: "44%" }} />
              </div>
            </div>
          </div>

          {/* Multiple Testing */}
          <div className="bg-base p-4">
            <div className="kpi-label text-warn mb-1">Multiple Testing Correction</div>
            <div className="font-mono text-4xl font-bold tabular-nums text-warn">64</div>
            <div className="mt-1 text-xs text-muted">
              64 parameter combinations tested. Bonferroni-adjusted p-value threshold:
              α = 0.05 / 64 = 0.00078. Effective significance bar much higher than naive t-test.
            </div>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-dim">Naive p-val (IS Sharpe)</span>
                <span className="font-mono text-pos">0.0009</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-dim">Bonferroni threshold</span>
                <span className="font-mono text-warn">0.00078</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-dim">Margin</span>
                <span className="font-mono text-neg">−0.00012 (FAIL)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Walk-forward OOS decay */}
        <div className="border-t border-neg/30 px-4 py-3">
          <div className="mb-2 flex items-center gap-2">
            <Shield width={13} height={13} className="text-warn" />
            <span className="text-xs font-medium text-warn">Walk-Forward OOS Performance (6 windows, anchored)</span>
          </div>
          <div className="flex items-end gap-2">
            {[
              { period: "WF-1", sharpe: 1.48 },
              { period: "WF-2", sharpe: 1.31 },
              { period: "WF-3", sharpe: 1.18 },
              { period: "WF-4", sharpe: 0.94 },
              { period: "WF-5", sharpe: 1.02 },
              { period: "WF-6", sharpe: 1.05 },
            ].map((wf) => (
              <div key={wf.period} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex items-end h-10 w-full justify-center">
                  <div
                    className="w-3/4 rounded-[2px]"
                    style={{
                      height: `${(wf.sharpe / 2.41) * 100}%`,
                      background: wf.sharpe < 1.0 ? "var(--neg)" : wf.sharpe < 1.3 ? "var(--warn)" : "var(--pos)",
                      opacity: 0.85,
                    }}
                  />
                </div>
                <span className="font-mono text-2xs text-dim">{wf.period}</span>
                <span className={cn("font-mono text-xs tabular-nums", wf.sharpe < 1.0 ? "text-neg" : wf.sharpe < 1.3 ? "text-warn" : "text-pos")}>
                  {fmtNum(wf.sharpe)}
                </span>
              </div>
            ))}
            <div className="flex flex-1 flex-col items-center gap-1 border-l border-line pl-2">
              <div className="flex items-end h-10 w-full justify-center">
                <div className="w-3/4 rounded-[2px] bg-warn/40 border border-warn/60" style={{ height: "100%" }} />
              </div>
              <span className="font-mono text-2xs text-dim">IS</span>
              <span className="font-mono text-xs tabular-nums text-warn">{fmtNum(s.sharpeIS)}</span>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-dim">
            <Warn width={11} height={11} className="text-neg shrink-0" />
            <span>
              Declining OOS Sharpe trend across walk-forward windows confirms structural overfitting.
              Parameter sensitivity test: Sharpe degrades &gt;0.3σ per 10% parameter deviation.
            </span>
          </div>
        </div>
      </div>

      {/* Trade Log */}
      <Panel>
        <PanelHeader
          title="Trade Log — Recent Fills (Realistic)"
          sub="Entry/exit include modeled slippage, market impact, and commission per trade"
          right={<Chip tone="default">{fmtInt(s.numTrades)} total trades</Chip>}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse">
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>Symbol</Th>
                <Th>Side</Th>
                <Th right>Entry</Th>
                <Th right>Exit</Th>
                <Th right>Shares</Th>
                <Th right>PnL ($)</Th>
                <Th right>Slippage</Th>
                <Th right>Commission</Th>
                <Th right>Impact</Th>
              </tr>
            </thead>
            <tbody>
              {trades.map((t, i) => (
                <tr key={i} className="group transition-colors hover:bg-elevated/40">
                  <Td className="text-xs text-dim">{t.date}</Td>
                  <Td mono={false}>
                    <span className="inline-flex items-center rounded border border-line bg-elevated/70 px-1.5 py-0.5 font-mono text-xs font-medium text-ink">
                      {t.sym}
                    </span>
                  </Td>
                  <Td>
                    <Chip tone={t.side === "LONG" ? "pos" : "neg"}>{t.side}</Chip>
                  </Td>
                  <Td right>{fmtNum(t.entry, 2)}</Td>
                  <Td right>{fmtNum(t.exit, 2)}</Td>
                  <Td right>{fmtInt(t.shares)}</Td>
                  <Td right className={t.pnl >= 0 ? "text-pos font-semibold" : "text-neg font-semibold"}>
                    {t.pnl >= 0 ? "+" : ""}{fmtNum(t.pnl, 0)}
                  </Td>
                  <Td right className="text-warn">{fmtBps(t.slippage)}</Td>
                  <Td right className="text-dim">${fmtNum(t.commission, 2)}</Td>
                  <Td right className="text-dim">{fmtBps(t.impact)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-line px-4 py-3 text-xs text-dim">
          <div className="flex flex-wrap gap-4">
            <span>All fills are modeled — not live execution. Actual fills may differ.</span>
            <span>Slippage model: Almgren-Chriss with ADV-scaled participation rate.</span>
            <span>Impact model: √participation × daily vol × spread.</span>
            <Chip tone="default">DEMO DATA</Chip>
          </div>
        </div>
      </Panel>
    </div>
  );
}
