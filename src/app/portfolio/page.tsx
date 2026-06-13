import { PageHeader, Panel, PanelHeader, Chip, KpiCard, Th, Td, Ticker, Stat, StatusDot } from "@/components/ui/kit";
import { LiveDot } from "@/components/live/live-stat";
import { PortfolioAnalytics } from "@/components/engine/portfolio-analytics";
import { Sparkline, ProgressBar, Ring } from "@/components/ui/viz";
import { Icon } from "@/components/icon-map";
import {
  SNAPSHOT_ID, SNAP_AS_OF, FUND_HIERARCHY, CASH_LEDGER, EXPOSURE,
  positions, type FundNode, type Position,
} from "@/lib/data/aegis-risk";
import { fmtUsdCompact, fmtSignedPct, fmtPct, signClass, fmtNum, fmtInt } from "@/lib/format";
import { cn } from "@/lib/cn";

export const metadata = { title: "IBOR — Portfolio · AEGIS" };

/* ── Helpers ───────────────────────────────────────────────────────────────── */
function assetClassBadge(ac: Position["assetClass"]) {
  const map: Record<Position["assetClass"], { tone: "accent"|"pos"|"warn"|"info"|"default"|"ai"; label: string }> = {
    Equity:   { tone: "accent", label: "EQ" },
    Options:  { tone: "warn",   label: "OPT" },
    "FX Fwd": { tone: "info",   label: "FX" },
    Rates:    { tone: "default",label: "RATES" },
    Crypto:   { tone: "ai",     label: "CRYPTO" },
    Credit:   { tone: "pos",    label: "CREDIT" },
  };
  const m = map[ac];
  return <Chip tone={m.tone}>{m.label}</Chip>;
}

function NodeRow({ node, depth = 0 }: { node: FundNode; depth?: number }) {
  const indent = depth * 16;
  const isFirm = node.type === "firm";
  const isFund = node.type === "fund";
  return (
    <>
      <tr className={cn("hover:bg-elevated/40 transition-colors", isFirm && "bg-elevated/30")}>
        <Td mono={false}>
          <div className="flex items-center gap-2" style={{ paddingLeft: indent }}>
            <Icon
              name={isFirm ? "layers" : isFund ? "book" : "pulse"}
              width={13} height={13}
              className={cn("shrink-0", isFirm ? "text-accent" : isFund ? "text-info" : "text-dim")}
            />
            <span className={cn("text-sm", isFirm && "font-semibold text-ink", isFund && "font-medium text-ink", !isFirm && !isFund && "text-muted")}>
              {node.name}
            </span>
          </div>
        </Td>
        <Td right className={cn("font-mono tabular-nums", isFirm && "text-ink font-semibold")}>
          {fmtUsdCompact(node.aum * 1e6)}
        </Td>
        <Td right className={cn("font-mono tabular-nums", node.pnlDay > 0 ? "text-pos" : "text-neg")}>
          {node.pnlDay > 0 ? "+" : ""}{fmtUsdCompact(node.pnlDay * 1e3)}
        </Td>
        <Td right className={cn("font-mono tabular-nums", node.pnlMtd > 0 ? "text-pos" : "text-neg")}>
          {node.pnlMtd > 0 ? "+" : ""}{fmtUsdCompact(node.pnlMtd * 1e3)}
        </Td>
        <Td right>
          {node.navPerShare ? (
            <span className="font-mono tabular-nums text-muted">${fmtNum(node.navPerShare)}</span>
          ) : (
            <span className="text-dim">—</span>
          )}
        </Td>
        <Td>
          <Chip tone={isFirm ? "accent" : isFund ? "info" : "default"}>
            {node.type.toUpperCase()}
          </Chip>
        </Td>
      </tr>
      {node.children?.map((c) => <NodeRow key={c.id} node={c} depth={depth + 1} />)}
    </>
  );
}

/* ── Page ──────────────────────────────────────────────────────────────────── */
export default function PortfolioPage() {
  const pos = positions();
  const totalAum = FUND_HIERARCHY.aum;
  const totalPnlDay = FUND_HIERARCHY.pnlDay;
  const totalPnlMtd = FUND_HIERARCHY.pnlMtd;
  const netExp = EXPOSURE.netExposure;
  const netExpPct = (netExp / totalAum) * 100;

  return (
    <div className="space-y-5">
      {/* Header */}
      <PageHeader
        module={{ name: "AEGIS · Risk & Execution", tone: "accent" }}
        title="Investment Book of Record"
        desc="Point-in-time IBOR snapshot — multi-entity hierarchy, multi-asset positions, cash ledger, and live exposure summary. All figures traceable to snapshot id."
        right={
          <div className="flex items-center gap-2">
            <LiveDot />
            <div className="flex items-center gap-1.5 rounded border border-accent/30 bg-accent/10 px-2.5 py-1.5 font-mono text-xs text-accent">
              <Icon name="database" width={12} height={12} />
              {SNAPSHOT_ID}
            </div>
            <button className="btn btn-accent">
              <Icon name="bolt" width={14} height={14} />
              Publish IBOR
            </button>
          </div>
        }
      />

      {/* Portfolio analytics engine */}
      <PortfolioAnalytics />

      {/* KPI deck */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          label="Total AUM"
          value={fmtUsdCompact(totalAum * 1e6)}
          sub={`3 funds · ${SNAP_AS_OF.slice(0, 10)}`}
          icon={<Icon name="layers" width={15} height={15} />}
          tone="accent"
        />
        <KpiCard
          label="Day P&L"
          value={`+${fmtUsdCompact(totalPnlDay * 1e3)}`}
          sub="+0.048% of AUM"
          icon={<Icon name="activity" width={15} height={15} />}
          tone="pos"
        />
        <KpiCard
          label="MTD P&L"
          value={`+${fmtUsdCompact(totalPnlMtd * 1e3)}`}
          sub="+0.38% MTD return"
          icon={<Icon name="candle" width={15} height={15} />}
          tone="pos"
        />
        <KpiCard
          label="Net Exposure"
          value={`${fmtUsdCompact(netExp * 1e6)}`}
          sub={`${fmtPct(netExpPct)} of AUM`}
          icon={<Icon name="gauge" width={15} height={15} />}
          tone="accent"
        />
      </div>

      {/* Exposure summary strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
        <Panel className="col-span-2 px-4 py-3.5 md:col-span-4 lg:col-span-2">
          <div className="mb-3 section-label text-[11px] text-muted">Gross / Net Exposure by Asset Class</div>
          <div className="space-y-2.5">
            {EXPOSURE.byAsset.map((row) => (
              <div key={row.label} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted">{row.label}</span>
                  <span className="font-mono tabular-nums text-dim">
                    L {fmtUsdCompact(row.long * 1e6)} / S {fmtUsdCompact(Math.abs(row.short) * 1e6)}
                  </span>
                </div>
                <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-elevated">
                  <div
                    className="h-full rounded-full bg-pos"
                    style={{ width: `${(row.long / EXPOSURE.grossLong) * 100}%` }}
                  />
                  {row.short < 0 && (
                    <div
                      className="h-full rounded-full bg-neg"
                      style={{ width: `${(Math.abs(row.short) / EXPOSURE.grossLong) * 50}%` }}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="col-span-2 px-4 py-3.5">
          <div className="mb-3 section-label text-[11px] text-muted">Exposure Summary</div>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Gross Long" value={fmtUsdCompact(EXPOSURE.grossLong * 1e6)} tone="pos" />
            <Stat label="Gross Short" value={fmtUsdCompact(Math.abs(EXPOSURE.grossShort) * 1e6)} tone="neg" />
            <Stat label="Net Exposure" value={fmtUsdCompact(EXPOSURE.netExposure * 1e6)} />
            <Stat label="Gross Total" value={fmtUsdCompact(EXPOSURE.grossExposure * 1e6)} />
            <Stat label="Leverage" value={`${fmtNum(EXPOSURE.leverageRatio)}×`} tone="accent" />
            <Stat label="Beta-Adj Net" value={fmtUsdCompact(EXPOSURE.betaAdjNet * 1e6)} />
          </div>
        </Panel>

        <Panel className="col-span-2 px-4 py-3.5">
          <div className="mb-3 section-label text-[11px] text-muted">Snapshot Details</div>
          <div className="space-y-2 font-mono text-xs">
            <div className="flex justify-between">
              <span className="text-dim">Snapshot ID</span>
              <span className="text-accent">{SNAPSHOT_ID}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-dim">As-of</span>
              <span className="text-muted">{SNAP_AS_OF}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-dim">Positions</span>
              <span className="text-muted">{pos.length} lines</span>
            </div>
            <div className="flex justify-between">
              <span className="text-dim">Currencies</span>
              <span className="text-muted">{CASH_LEDGER.length} CCY</span>
            </div>
            <div className="flex justify-between">
              <span className="text-dim">Status</span>
              <span className="flex items-center gap-1.5 text-pos">
                <StatusDot tone="pos" pulse />LIVE
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-dim">Immutable</span>
              <span className="text-pos">✓ Audit Ledger</span>
            </div>
          </div>
        </Panel>
      </div>

      {/* Fund hierarchy */}
      <Panel>
        <PanelHeader
          title="Entity Hierarchy — Fund of Record"
          sub="Firm → Fund → Portfolio · click any row to drill into positions"
          right={<Chip tone="info">IBOR</Chip>}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr>
                <Th>Entity</Th>
                <Th right>AUM</Th>
                <Th right>Day P&L</Th>
                <Th right>MTD P&L</Th>
                <Th right>NAV / Share</Th>
                <Th>Type</Th>
              </tr>
            </thead>
            <tbody>
              <NodeRow node={FUND_HIERARCHY} depth={0} />
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Positions table */}
      <Panel>
        <PanelHeader
          title="Multi-Asset Positions"
          sub="Equities · Options · FX Fwd · Rates · Crypto · Credit — all books consolidated"
          right={
            <div className="flex items-center gap-2">
              <Chip tone="default">T+0 Settlement</Chip>
              <Chip tone="accent">DEMO</Chip>
            </div>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] border-collapse">
            <thead>
              <tr>
                <Th>Instrument</Th>
                <Th>Class</Th>
                <Th>Fund</Th>
                <Th right>Qty</Th>
                <Th right>Price</Th>
                <Th right>Mkt Value</Th>
                <Th right>Weight</Th>
                <Th right>Day P&L</Th>
                <Th right>Unreal P&L</Th>
                <Th>CCY</Th>
                <Th right>30D</Th>
              </tr>
            </thead>
            <tbody>
              {pos.map((p) => (
                <tr key={p.sym} className="group transition-colors hover:bg-elevated/40">
                  <Td mono={false}>
                    <Ticker sym={p.sym} name={p.name} />
                  </Td>
                  <Td mono={false}>{assetClassBadge(p.assetClass)}</Td>
                  <Td mono={false}>
                    <span className="font-mono text-xs text-dim">{p.fund}</span>
                  </Td>
                  <Td right>{fmtInt(p.qty)}</Td>
                  <Td right className="text-muted">
                    {p.assetClass === "FX Fwd"
                      ? fmtNum(p.price, 4)
                      : p.assetClass === "Crypto"
                      ? fmtInt(p.price)
                      : fmtNum(p.price)}
                  </Td>
                  <Td right className="text-ink">${fmtNum(p.mktValue)}K</Td>
                  <Td right>
                    <div className="flex items-center justify-end gap-2">
                      <ProgressBar
                        value={Math.abs(p.weight)}
                        max={35}
                        color="var(--accent)"
                        height={4}
                        className="w-16"
                      />
                      <span className="w-12 text-right font-mono text-xs text-muted">
                        {fmtPct(p.weight, 2)}
                      </span>
                    </div>
                  </Td>
                  <Td right className={signClass(p.pnlDay)}>
                    {p.pnlDay > 0 ? "+" : ""}{fmtNum(p.pnlDay)}K
                  </Td>
                  <Td right className={signClass(p.pnlUnreal)}>
                    {p.pnlUnreal > 0 ? "+" : ""}{fmtNum(p.pnlUnreal)}K
                  </Td>
                  <Td mono={false}>
                    <span className="font-mono text-xs text-dim">{p.currency}</span>
                  </Td>
                  <Td right>
                    <Sparkline data={p.spark} width={72} height={22} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-line px-4 py-2 text-xs text-dim">
          DEMO DATA — representative IBOR snapshot. Live positions update on each order fill via the AEGIS execution bus.
          Every row is immutably logged at {SNAPSHOT_ID}.
        </div>
      </Panel>

      {/* Cash ledger */}
      <Panel>
        <PanelHeader
          title="Cash Ledger — by Currency"
          sub="Settlement balances + unsettled T+0 through T+2"
          right={<Chip tone="default">5 currencies</Chip>}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr>
                <Th>Currency</Th>
                <Th right>Balance (native)</Th>
                <Th right>USD Equiv</Th>
                <Th right>Unsettled ($K)</Th>
                <Th right>FX Rate</Th>
                <Th right>% of Cash</Th>
              </tr>
            </thead>
            <tbody>
              {CASH_LEDGER.map((c) => {
                const totalCash = CASH_LEDGER.reduce((s, x) => s + x.usdEquiv, 0);
                const pct = (c.usdEquiv / totalCash) * 100;
                return (
                  <tr key={c.currency} className="hover:bg-elevated/40 transition-colors">
                    <Td mono={false}>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center rounded border border-line bg-elevated/70 px-1.5 py-0.5 font-mono text-xs font-medium text-ink">
                          {c.currency}
                        </span>
                      </div>
                    </Td>
                    <Td right className="text-muted">
                      {c.currency === "BTC"
                        ? fmtNum(c.balance, 3)
                        : fmtInt(c.balance)}
                    </Td>
                    <Td right className="text-ink">${fmtNum(c.usdEquiv)}K</Td>
                    <Td right className="text-warn">${fmtNum(c.unsettled)}K</Td>
                    <Td right className="text-dim">
                      {c.currency === "USD" ? "1.0000" : fmtNum(c.fxRate, 4)}
                    </Td>
                    <Td right>
                      <div className="flex items-center justify-end gap-2">
                        <ProgressBar value={pct} max={100} color="var(--accent)" height={4} className="w-20" />
                        <span className="w-12 text-right font-mono text-xs text-muted">{fmtPct(pct, 1)}</span>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-elevated/30">
                <Td mono={false} className="font-semibold text-muted">Total</Td>
                <Td right />
                <Td right className="font-semibold text-ink">
                  ${fmtNum(CASH_LEDGER.reduce((s, c) => s + c.usdEquiv, 0))}K
                </Td>
                <Td right className="text-warn">
                  ${fmtNum(CASH_LEDGER.reduce((s, c) => s + c.unsettled, 0))}K
                </Td>
                <Td right />
                <Td right />
              </tr>
            </tfoot>
          </table>
        </div>
      </Panel>
    </div>
  );
}
