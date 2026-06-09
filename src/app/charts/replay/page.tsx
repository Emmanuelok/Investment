import { PageHeader, Panel, PanelHeader, Chip, KpiCard, Stat } from "@/components/ui/kit";
import { Candles } from "@/components/ui/candles";
import { Sparkline, DeltaBars, Ring } from "@/components/ui/viz";
import { ReplayControls } from "@/components/helios/replay-controls";
import { Icon } from "@/components/icon-map";
import { Sparkle, Shield } from "@/components/icons";
import {
  REPLAY_SESSIONS,
  simPosition,
  getCandles,
  cvdSeries,
} from "@/lib/data/helios";
import { fmtUsd, fmtSignedPct, fmtInt, fmtCompact } from "@/lib/format";

export const metadata = { title: "HELIOS — Replay & Sim" };

const ACTIVE_SESSION = REPLAY_SESSIONS[0];
const ACTIVE_SYM = ACTIVE_SESSION.sym;

export default function ReplayPage() {
  const candles = getCandles(ACTIVE_SYM, "5m", 80);
  const pos = simPosition(ACTIVE_SYM);
  const cvd = cvdSeries(ACTIVE_SYM, 60);

  // Bracket / OCO levels display
  const riskAmount = pos.avgPrice - pos.stop;
  const rewardAmount = pos.target - pos.avgPrice;
  const rr = rewardAmount / (riskAmount || 0.001);

  return (
    <div className="space-y-5">
      <PageHeader
        module={{ name: "HELIOS · Charts & Order Flow", tone: "info" }}
        title="Replay & Sim — Practice Cockpit"
        desc="Market-replay at historical sessions with SIM trading panel. All orders route through AEGIS SIM with pre-trade guards and kill-switch. No real capital."
        right={
          <div className="flex items-center gap-2">
            <Chip tone="warn">SIM MODE — No real capital</Chip>
            <Chip tone="pos">AEGIS guards active</Chip>
            <button className="btn btn-accent">
              <Icon name="play" width={14} height={14} />
              New SIM session
            </button>
          </div>
        }
      />

      {/* SIM safety banner */}
      <div className="flex items-center gap-3 rounded border border-warn/30 bg-warn/8 px-4 py-3 text-sm">
        <Shield width={16} height={16} className="shrink-0 text-warn" />
        <div>
          <strong className="text-warn">SIM trading only.</strong>
          <span className="ml-1.5 text-dim">
            All orders are routed to the <strong className="text-muted">AEGIS SIM engine</strong> — never to live markets.
            Pre-trade guards, size limits, and a kill-switch are active at all times.
            This is a practice / trade-along tool for learning execution and strategy.
          </span>
        </div>
      </div>

      {/* Session selector */}
      <Panel>
        <PanelHeader title="Session Selector" right={<Chip tone="info">{REPLAY_SESSIONS.length} historical sessions</Chip>} />
        <div className="flex flex-wrap gap-0 divide-x divide-line overflow-x-auto">
          {REPLAY_SESSIONS.map((session, i) => (
            <button
              key={session.id}
              className={`flex flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-elevated/40 ${
                i === 0 ? "bg-accent/8" : ""
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`font-mono text-xs font-medium ${i === 0 ? "text-accent" : "text-ink"}`}>
                  {session.label}
                </span>
                {i === 0 && <Chip tone="accent">Active</Chip>}
              </div>
              <span className="font-mono text-xs text-dim">{session.date}</span>
              <span className="text-xs text-faint">{session.event}</span>
            </button>
          ))}
        </div>
      </Panel>

      {/* Replay controls + chart */}
      <Panel>
        <PanelHeader
          title={`Replay: ${ACTIVE_SESSION.label}`}
          sub={ACTIVE_SESSION.event}
          right={
            <div className="flex items-center gap-2">
              <Chip tone="info">{ACTIVE_SYM}</Chip>
              <Chip tone="pos">5m candles</Chip>
            </div>
          }
        />
        <div className="px-4 py-3 border-b border-line">
          <ReplayControls
            totalMinutes={390}
            sessionLabel={ACTIVE_SESSION.label}
          />
        </div>
        <div className="p-4">
          <Candles data={candles} width={900} height={280} sma={20} className="w-full" />
          {/* CVD during replay */}
          <div className="mt-2 border-t border-line pt-2">
            <div className="flex items-center justify-between mb-1">
              <span className="section-label text-[10px]">CVD — Replay Period</span>
              <span className={`font-mono text-xs ${cvd[cvd.length - 1] > 0 ? "text-pos" : "text-neg"}`}>
                {fmtCompact(cvd[cvd.length - 1])}
              </span>
            </div>
            <DeltaBars data={cvd.slice(-60)} width={900} height={36} className="w-full" />
          </div>
        </div>
      </Panel>

      {/* SIM trading panel + position */}
      <div className="grid gap-4 xl:grid-cols-[340px_1fr]">
        {/* SIM Panel */}
        <Panel glow>
          <PanelHeader
            title="SIM Trading Panel"
            sub="AEGIS Sim Engine · Paper orders only"
            right={<Chip tone="warn">SIM</Chip>}
          />
          <div className="px-4 py-4 space-y-4">
            {/* Position summary */}
            <div className="rounded border border-line bg-elevated/40 p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="section-label text-[10px]">Open Position</span>
                <Chip tone="pos">{pos.side}</Chip>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Stat label="Symbol" value={pos.sym} />
                <Stat label="Qty" value={String(pos.qty)} tone="accent" />
                <Stat
                  label="Avg Entry"
                  value={fmtUsd(pos.avgPrice, pos.avgPrice > 1000 ? 0 : 2)}
                />
                <Stat
                  label="Current"
                  value={fmtUsd(pos.currentPrice, pos.currentPrice > 1000 ? 0 : 2)}
                />
              </div>
            </div>

            {/* PnL ring */}
            <div className="flex items-center gap-4">
              <Ring
                value={Math.abs(pos.pnl)}
                max={Math.abs(pos.pnl) * 2.5}
                size={64}
                stroke={6}
                color={pos.pnl >= 0 ? "var(--pos)" : "var(--neg)"}
                label={pos.pnl >= 0 ? `+$${fmtInt(pos.pnl)}` : `-$${fmtInt(Math.abs(pos.pnl))}`}
                sub="PnL"
              />
              <div className="flex-1 space-y-1.5">
                <Stat
                  label="Unrealized P&L"
                  value={`${pos.pnl >= 0 ? "+" : ""}${fmtUsd(pos.pnl, 0)}`}
                  tone={pos.pnl >= 0 ? "pos" : "neg"}
                />
                <Stat
                  label="Return"
                  value={fmtSignedPct(((pos.currentPrice - pos.avgPrice) / pos.avgPrice) * 100)}
                  tone={pos.pnl >= 0 ? "pos" : "neg"}
                />
              </div>
            </div>

            {/* Bracket / OCO levels */}
            <div className="rounded border border-line p-3 space-y-2">
              <div className="section-label text-[10px] mb-1.5">Bracket / OCO Orders</div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-dim">Target (limit)</span>
                <span className="font-mono text-pos">{fmtUsd(pos.target, pos.target > 1000 ? 0 : 2)}</span>
              </div>
              <div className="relative h-1.5 w-full rounded-full bg-line overflow-hidden">
                <div
                  className="h-full rounded-full bg-pos/40"
                  style={{ width: `${Math.min(100, (rewardAmount / (rewardAmount + riskAmount)) * 100).toFixed(0)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-dim">Current price</span>
                <span className="font-mono text-accent">{fmtUsd(pos.currentPrice, pos.currentPrice > 1000 ? 0 : 2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-dim">Stop (stop-loss)</span>
                <span className="font-mono text-neg">{fmtUsd(pos.stop, pos.stop > 1000 ? 0 : 2)}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-dim border-t border-line pt-2">
                <span>Risk / Reward</span>
                <span className={`font-mono font-medium ${rr >= 2 ? "text-pos" : rr >= 1 ? "text-warn" : "text-neg"}`}>
                  1 : {rr.toFixed(1)}
                </span>
              </div>
            </div>

            {/* Order entry */}
            <div className="space-y-2">
              <div className="section-label text-[10px]">New SIM Order</div>
              <div className="grid grid-cols-2 gap-2">
                <button className="btn btn-accent justify-center py-2">
                  BUY / LONG
                </button>
                <button className="btn justify-center py-2 border-neg/30 text-neg hover:bg-neg/10">
                  SELL / SHORT
                </button>
              </div>
              <button className="btn w-full justify-center py-2 border-warn/30 text-warn hover:bg-warn/10">
                <Icon name="shield" width={13} height={13} />
                FLATTEN (close all)
              </button>
            </div>

            {/* Kill switch */}
            <div className="rounded border border-neg/20 bg-neg/5 px-3 py-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield width={13} height={13} className="text-neg shrink-0" />
                  <span className="text-xs font-medium text-neg">AEGIS Kill-Switch</span>
                </div>
                <button className="chip border-neg/40 text-neg hover:bg-neg/20">
                  Trigger
                </button>
              </div>
              <p className="mt-1.5 text-xs text-dim">
                Cancels all SIM orders instantly. In live mode, routes through AEGIS OMS with real cancel-on-disconnect.
              </p>
            </div>
          </div>
        </Panel>

        {/* Trade-along practice panel */}
        <div className="space-y-4">
          <Panel>
            <PanelHeader
              title="Trade-Along Practice"
              right={<Chip tone="ai"><Sparkle width={11} height={11} /> ATHENA coaching</Chip>}
            />
            <div className="px-4 py-4 space-y-4">
              <p className="text-sm text-muted leading-relaxed">
                Replay mode lets you practice trading against historical data as if it were live — with the same
                order flow, DOM, and tape available in the real cockpit. Your SIM executions are tracked for
                post-session review including fill quality, entry timing, and risk adherence.
              </p>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {[
                  { label: "SIM Trades Today",    value: "7",          tone: "accent" as const },
                  { label: "Win Rate",             value: "57%",        tone: "pos" as const    },
                  { label: "Avg R:R Achieved",     value: "1.8",        tone: undefined          },
                  { label: "Largest Winner",       value: "+$1,240",    tone: "pos" as const    },
                  { label: "Largest Loser",        value: "−$480",      tone: "neg" as const    },
                  { label: "Rule Violations",      value: "0",          tone: "pos" as const    },
                ].map((s) => (
                  <div key={s.label} className="rounded border border-line bg-elevated/30 px-3 py-2.5">
                    <Stat label={s.label} value={s.value} tone={s.tone} />
                  </div>
                ))}
              </div>
            </div>
          </Panel>

          <Panel>
            <PanelHeader
              title="AEGIS Sim Guards"
              sub="Pre-trade risk checks active for all SIM orders"
            />
            <div className="divide-y divide-line/60">
              {[
                { guard: "Max position size",    status: "OK",  detail: "≤ 5 contracts per instrument"          },
                { guard: "Daily loss limit",      status: "OK",  detail: "≤ $2,000 / session · $0 used today"   },
                { guard: "Kill-switch armed",     status: "OK",  detail: "Cancel-on-disconnect active"          },
                { guard: "Wash-trade filter",     status: "OK",  detail: "Minimum 5s hold before flip"          },
                { guard: "Fat-finger check",      status: "OK",  detail: "Order > 2× avg size requires confirm"  },
                { guard: "Market hours check",    status: "OK",  detail: "SIM session: always open"             },
              ].map((g, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-pos" />
                  <div className="flex-1">
                    <div className="text-sm text-ink">{g.guard}</div>
                    <div className="text-xs text-dim">{g.detail}</div>
                  </div>
                  <Chip tone="pos">{g.status}</Chip>
                </div>
              ))}
            </div>
            <div className="border-t border-line px-4 py-2.5 text-xs text-dim flex items-center gap-1.5">
              <Icon name="shield" width={12} height={12} className="text-faint shrink-0" />
              <span>All guards mirror live AEGIS OMS checks. Same rules, zero real capital.</span>
            </div>
          </Panel>

          {/* Replay session performance chart */}
          <Panel>
            <PanelHeader title="SIM Equity Curve — This Session" />
            <div className="p-4">
              <Sparkline
                data={[10000, 10140, 10080, 10320, 10210, 10450, 10380, 10520, 10490, 10680, 10720, 10650, 10840]}
                width={700}
                height={60}
                color="var(--pos)"
                className="w-full"
              />
              <div className="mt-2 flex items-center justify-between text-xs text-dim">
                <span>Session start: $10,000</span>
                <span className="text-pos font-mono font-medium">+$840 (+8.4%) SIM</span>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
