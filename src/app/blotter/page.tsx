import {
  PageHeader, Panel, PanelHeader, Chip, KpiCard, Stat,
  Th, Td, Ticker, StatusDot,
} from "@/components/ui/kit";
import { ProgressBar } from "@/components/ui/viz";
import { Icon } from "@/components/icon-map";
import { Shield, Bolt } from "@/components/icons";
import {
  blotterOrders, blockOrders,
  BLOTTER_KPIS, ORDER_LIFECYCLE,
  type OrderStatus, type OrderSide, type OrderType, type Venue,
} from "@/lib/data/aegis-exec";
import { fmtUsdCompact, fmtInt, fmtNum, fmtPct, signClass } from "@/lib/format";
import { cn } from "@/lib/cn";

export const metadata = { title: "OMS Blotter — AEGIS" };

/* ── helpers ─────────────────────────────────────────────────────────────── */

const STATUS_TONE: Record<OrderStatus, "pos" | "neg" | "warn" | "accent" | "default" | "info"> = {
  CREATED:    "default",
  COMPLIANCE: "warn",
  STAGED:     "accent",
  ROUTED:     "info",
  PARTIAL:    "warn",
  FILLED:     "pos",
  ALLOCATED:  "pos",
  BOOKED:     "pos",
  RECONCILED: "pos",
  REJECTED:   "neg",
  CANCELLED:  "neg",
};

const SIDE_COLOR: Record<OrderSide, string> = {
  BUY:        "text-pos",
  SELL:       "text-neg",
  SELL_SHORT: "text-warn",
};

const TYPE_TONE: Record<OrderType, "default" | "accent" | "info"> = {
  MKT: "default",
  LMT: "default",
  STOP: "default",
  TWAP: "accent",
  VWAP: "accent",
  IS:   "accent",
  ICE:  "info",
};

const VENUE_LABEL: Record<Venue, string> = {
  IBKR:     "IBKR",
  ALPACA:   "Alpaca",
  BINANCE:  "Binance",
  COINBASE: "Coinbase",
  SIM:      "SIM",
  IEX:      "IEX",
  DARK:     "Dark Pool",
};

/* ── page ─────────────────────────────────────────────────────────────────── */

export default function BlotterPage() {
  const orders = blotterOrders();
  const blocks = blockOrders();
  const block = blocks[0];

  return (
    <div className="space-y-5">
      {/* Header */}
      <PageHeader
        module={{ name: "AEGIS · Risk & Execution", tone: "accent" }}
        title="OMS Blotter"
        desc="Live order lifecycle management — every order audited from creation through reconciliation. Fat-finger guards and kill-switch active."
        right={
          <div className="flex items-center gap-2">
            <button className="btn btn-accent flex items-center gap-1.5">
              <Bolt width={14} height={14} />
              New Order
            </button>
            <button className="btn flex items-center gap-1.5 border-neg/40 text-neg hover:bg-neg/10">
              <Shield width={14} height={14} />
              Kill Switch
            </button>
          </div>
        }
      />

      {/* KPI deck */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {BLOTTER_KPIS.map((k) => (
          <KpiCard
            key={k.label}
            label={k.label}
            value={k.value}
            sub={k.sub}
            icon={<Icon name={k.icon} width={15} height={15} />}
            tone={k.tone}
          />
        ))}
      </div>

      {/* Order lifecycle state machine legend */}
      <Panel>
        <PanelHeader
          title="Order Lifecycle — Audited State Machine"
          right={<Chip tone="accent">9-state OMS FSM · every transition logged</Chip>}
        />
        <div className="flex flex-wrap gap-2 px-4 py-3.5">
          {ORDER_LIFECYCLE.map((s, i) => (
            <div key={s.state} className="flex items-center gap-1.5">
              <Chip tone={STATUS_TONE[s.state]}>{s.state}</Chip>
              <span className="hidden text-xs text-dim lg:inline">{s.desc}</span>
              {i < ORDER_LIFECYCLE.length - 1 && (
                <span className="hidden text-faint lg:inline">→</span>
              )}
            </div>
          ))}
        </div>
        <div className="grid gap-x-6 gap-y-2 border-t border-line px-4 py-3 sm:grid-cols-2 lg:grid-cols-3">
          {ORDER_LIFECYCLE.map((s) => (
            <div key={s.state} className="flex items-start gap-2 lg:hidden">
              <Chip tone={STATUS_TONE[s.state]} className="shrink-0 text-[10px]">{s.state}</Chip>
              <span className="text-xs text-dim">{s.desc}</span>
            </div>
          ))}
          {ORDER_LIFECYCLE.map((s) => (
            <div key={s.state + "d"} className="hidden items-start gap-2 lg:flex">
              <Chip tone={STATUS_TONE[s.state]} className="shrink-0 text-[10px]">{s.state}</Chip>
              <span className="text-xs text-dim">{s.desc}</span>
            </div>
          ))}
        </div>
      </Panel>

      {/* Main order blotter table */}
      <Panel>
        <PanelHeader
          title="Live Order Blotter"
          sub="point-in-time snapshot · DEMO DATA — live fills via IBKR/Alpaca FIX when adapters enabled"
          right={
            <div className="flex items-center gap-2">
              <StatusDot tone="pos" pulse />
              <span className="font-mono text-xs text-pos">LIVE</span>
              <Chip tone="default">FIX 4.2</Chip>
            </div>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] border-collapse">
            <thead>
              <tr>
                <Th>Order ID</Th>
                <Th>Time</Th>
                <Th>Side</Th>
                <Th>Symbol</Th>
                <Th right>Qty</Th>
                <Th>Type</Th>
                <Th right>Limit Px</Th>
                <Th right>Filled %</Th>
                <Th right>Avg Px</Th>
                <Th>Venue</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const fillPct = o.qty > 0 ? (o.filledQty / o.qty) * 100 : 0;
                return (
                  <tr key={o.id} className="group transition-colors hover:bg-elevated/40">
                    <Td className="font-mono text-xs text-accent">{o.id}</Td>
                    <Td className="text-dim">{o.time}</Td>
                    <Td mono={false}>
                      <span className={cn("font-mono text-xs font-semibold", SIDE_COLOR[o.side])}>
                        {o.side}
                      </span>
                    </Td>
                    <Td mono={false}>
                      <Ticker sym={o.sym} />
                    </Td>
                    <Td right>{fmtInt(o.qty)}</Td>
                    <Td mono={false}>
                      <Chip tone={TYPE_TONE[o.type]} className="text-[10px]">{o.type}</Chip>
                    </Td>
                    <Td right className="text-muted">
                      {o.limitPx != null ? `$${fmtNum(o.limitPx)}` : "—"}
                    </Td>
                    <Td right>
                      <div className="flex items-center justify-end gap-2">
                        <ProgressBar
                          value={fillPct}
                          max={100}
                          height={4}
                          color={fillPct === 100 ? "var(--pos)" : "var(--accent)"}
                          className="w-16"
                        />
                        <span className={cn("w-10 text-right font-mono text-xs", fillPct === 100 ? "text-pos" : "text-muted")}>
                          {fmtPct(fillPct, 0)}
                        </span>
                      </div>
                    </Td>
                    <Td right className="text-muted">
                      {o.avgPx != null ? `$${fmtNum(o.avgPx)}` : "—"}
                    </Td>
                    <Td mono={false}>
                      <span className="font-mono text-xs text-dim">{VENUE_LABEL[o.venue]}</span>
                    </Td>
                    <Td mono={false}>
                      <Chip tone={STATUS_TONE[o.status]} className="text-[10px]">
                        {o.status}
                      </Chip>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-line px-4 py-2 text-xs text-dim">
          <span>Showing {orders.length} orders · session today · all venues</span>
          <span className="font-mono">
            Open notional:{" "}
            <span className="text-accent">
              {fmtUsdCompact(
                orders
                  .filter((o) => ["CREATED", "COMPLIANCE", "STAGED", "ROUTED", "PARTIAL"].includes(o.status))
                  .reduce((s, o) => s + o.notional, 0),
              )}
            </span>
          </span>
        </div>
      </Panel>

      {/* Block order + allocations */}
      <div className="grid gap-4 lg:grid-cols-5">
        <Panel className="lg:col-span-2">
          <PanelHeader
            title="Block Order"
            right={<Chip tone="accent">Pro-rata · avg-price allocation</Chip>}
          />
          <div className="space-y-3 px-4 py-4">
            <div className="flex items-center gap-2">
              <Ticker sym={block.sym} />
              <Chip tone="pos">{block.side}</Chip>
              <Chip tone={TYPE_TONE[block.type]}>{block.type}</Chip>
              <Chip tone={STATUS_TONE[block.status]}>{block.status}</Chip>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Block ID" value={block.id} />
              <Stat label="Total Qty" value={fmtInt(block.totalQty)} />
              <Stat label="Filled Qty" value={fmtInt(block.filledQty)} tone="pos" />
              <Stat label="Avg Fill Px" value={`$${fmtNum(block.avgPx)}`} tone="accent" />
            </div>
            <div className="rounded border border-line/60 bg-elevated/30 px-3 py-2 text-xs text-dim">
              <span className="font-medium text-muted">Allocation method:</span> Pro-rata by account
              AUM weight · Average price across child fills. Block-level compliance pre-checked before
              any child order is routed.
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Icon name="shield" width={13} height={13} className="text-pos" />
              <span className="text-dim">Pre-trade compliance: <span className="text-pos">PASSED</span></span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Icon name="shield" width={13} height={13} className="text-pos" />
              <span className="text-dim">Fat-finger check: qty within 3× 5-day ADV limit</span>
            </div>
          </div>
        </Panel>

        <Panel className="lg:col-span-3">
          <PanelHeader
            title="Child Allocations — Account Level"
            right={<Chip tone="pos">FULLY ALLOCATED</Chip>}
          />
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <Th>Account</Th>
                  <Th>Fund / Sleeve</Th>
                  <Th right>Alloc %</Th>
                  <Th right>Qty</Th>
                  <Th right>Avg Px</Th>
                  <Th right>Notional</Th>
                </tr>
              </thead>
              <tbody>
                {block.allocations.map((a) => (
                  <tr key={a.account} className="hover:bg-elevated/40">
                    <Td className="text-accent">{a.account}</Td>
                    <Td mono={false} className="text-muted">{a.fund}</Td>
                    <Td right>{fmtPct(a.pct, 0)}</Td>
                    <Td right>{fmtInt(a.qty)}</Td>
                    <Td right>${fmtNum(a.avgPx)}</Td>
                    <Td right className="text-muted">{fmtUsdCompact(a.notional)}</Td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-line">
                  <Td mono={false} className="font-medium text-ink" colSpan={2}>TOTAL</Td>
                  <Td right className="font-medium text-ink">100%</Td>
                  <Td right className="font-medium text-ink">{fmtInt(block.totalQty)}</Td>
                  <Td right className="font-medium text-accent">${fmtNum(block.avgPx)}</Td>
                  <Td right className="font-medium text-ink">
                    {fmtUsdCompact(block.allocations.reduce((s, a) => s + a.notional, 0))}
                  </Td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Panel>
      </div>

      {/* Order-type reference + compliance guards */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHeader
            title="Order Type Reference"
            right={<Chip tone="default">7 types supported</Chip>}
          />
          <div className="divide-y divide-line">
            {([
              ["MKT",  "Market",            "Executes immediately at prevailing market price. No price protection."],
              ["LMT",  "Limit",             "Executes only at limit price or better. Resting or IOC/FOK variants."],
              ["STOP", "Stop",              "Triggered when market reaches stop price; converts to MKT or LMT."],
              ["TWAP", "Time-Weighted AP",  "Slices order uniformly over horizon. Minimises timing risk."],
              ["VWAP", "Volume-Weighted AP","Targets intraday volume curve. Benchmarks against VWAP."],
              ["IS",   "Impl. Shortfall",   "Optimises market impact vs. timing cost. Dynamic rebalancing."],
              ["ICE",  "Iceberg",           "Displays a small clip; parent qty hidden from tape. Dark-pool friendly."],
            ] as const).map(([code, label, desc]) => (
              <div key={code} className="flex items-start gap-3 px-4 py-2.5">
                <Chip tone={TYPE_TONE[code as OrderType]} className="shrink-0 text-[10px]">{code}</Chip>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-muted">{label}</div>
                  <div className="mt-0.5 text-xs text-dim">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            title="Compliance Guards & Audit Trail"
            right={
              <div className="flex items-center gap-2">
                <StatusDot tone="pos" />
                <span className="font-mono text-xs text-pos">ALL GUARDS ACTIVE</span>
              </div>
            }
          />
          <div className="divide-y divide-line">
            {[
              {
                icon: "shield",
                tone: "pos" as const,
                label: "Fat-finger limit",
                desc: "Orders > 3× 5-day ADV or > $5M notional require second-level approval.",
              },
              {
                icon: "shield",
                tone: "pos" as const,
                label: "Kill switch",
                desc: "Single-click hard stop: cancels all open orders, halts new routing, logs event with timestamp.",
              },
              {
                icon: "shield",
                tone: "pos" as const,
                label: "Duplicate check",
                desc: "Cross-session dedup prevents double-submission within a 30-second window.",
              },
              {
                icon: "shield",
                tone: "warn" as const,
                label: "AML / sanctions screen",
                desc: "Counterparty and instrument screened against OFAC + EU sanctions lists on every order.",
              },
              {
                icon: "shield",
                tone: "pos" as const,
                label: "Short-sell locate",
                desc: "SELL_SHORT orders require confirmed borrow locate before routing.",
              },
              {
                icon: "lock",
                tone: "pos" as const,
                label: "Immutable audit log",
                desc: "Every state transition, user action, and system event appended to tamper-evident audit chain.",
              },
              {
                icon: "lock",
                tone: "pos" as const,
                label: "4-eyes for large blocks",
                desc: "Block orders > $10M require a second approver before entering STAGED state.",
              },
            ].map((g) => (
              <div key={g.label} className="flex items-start gap-3 px-4 py-2.5">
                <Icon name={g.icon} width={14} height={14} className={g.tone === "pos" ? "mt-0.5 text-pos" : "mt-0.5 text-warn"} />
                <div>
                  <div className="text-xs font-medium text-muted">{g.label}</div>
                  <div className="mt-0.5 text-xs text-dim">{g.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
