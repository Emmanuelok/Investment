import { PageHeader, Panel, PanelHeader, Chip, Stat, Th, Td, Ticker } from "@/components/ui/kit";
import { Sparkline, ProgressBar } from "@/components/ui/viz";
import { Icon } from "@/components/icon-map";
import { signClass, fmtSignedPct } from "@/lib/format";
import { cn } from "@/lib/cn";
import {
  INCOME_YEARS,
  INCOME_STATEMENT,
  BALANCE_SHEET,
  CASH_FLOW,
  RATIO_GRID,
  PEER_COMPS,
  type FinRow,
} from "@/lib/data/obsidian";

export const metadata = { title: "Fundamentals — OBSIDIAN Terminal" };

function finFmt(val: number | null, fmt: FinRow["fmt"]): string {
  if (val === null) return "—";
  if (fmt === "usd") return `$${(val / 1000).toFixed(1)}B`;
  if (fmt === "pct") return `${val.toFixed(1)}%`;
  if (fmt === "ratio") return val.toFixed(2);
  return val.toFixed(1);
}

function FinTable({ rows, years, title, badge }: { rows: FinRow[]; years: string[]; title: string; badge?: string }) {
  return (
    <Panel>
      <PanelHeader
        title={title}
        sub="EDGAR XBRL-framed · USD millions · FY ended Jan"
        right={badge ? <Chip tone="info">{badge}</Chip> : undefined}
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] border-collapse">
          <thead>
            <tr>
              <Th>Line Item</Th>
              {years.map((y) => <Th key={y} right>{y}</Th>)}
              <Th right>5Y CAGR</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const defined = row.vals.filter((v): v is number => v !== null);
              const cagr = defined.length >= 2
                ? (Math.pow(defined[defined.length - 1] / Math.abs(defined[0]), 1 / (defined.length - 1)) - 1) * 100
                : null;
              return (
                <tr
                  key={i}
                  className={cn(
                    "group hover:bg-elevated/40",
                    row.isTotal && "bg-elevated/20 font-medium",
                  )}
                >
                  <Td
                    mono={false}
                    className={cn(
                      row.isTotal ? "font-semibold text-ink" : row.isSub ? "pl-6 text-dim" : "text-muted",
                    )}
                  >
                    {row.label}
                  </Td>
                  {row.vals.map((v, vi) => (
                    <Td
                      key={vi}
                      right
                      className={cn(
                        row.fmt === "pct" ? signClass(v ?? 0) : "",
                        row.isTotal ? "font-semibold text-ink" : "",
                      )}
                    >
                      {finFmt(v, row.fmt)}
                    </Td>
                  ))}
                  <Td right className={cagr !== null ? signClass(cagr) : "text-dim"}>
                    {cagr !== null && isFinite(cagr) ? fmtSignedPct(cagr) : "—"}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

export default function FundamentalsPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        module={{ name: "OBSIDIAN · Terminal", tone: "accent" }}
        title="Fundamentals — FactSet / CapIQ Replica"
        desc="Multi-year income statement, balance sheet, cash flows, ratio grid, and peer comps. Demo data mirroring EDGAR XBRL framing."
        right={
          <div className="flex items-center gap-2">
            <Ticker sym="NVDA" name="NVIDIA Corporation" />
            <Chip tone="accent">FY2020–FY2024</Chip>
          </div>
        }
      />

      {/* Ratio grid KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {RATIO_GRID.map((r) => (
          <Panel key={r.label} hover className="scanline px-4 py-3">
            <div className="kpi-label">{r.label}</div>
            <div className="mt-2 font-mono text-xl font-medium text-accent">{r.value}</div>
            <div className="mt-1 text-xs text-dim">{r.note}</div>
          </Panel>
        ))}
      </div>

      {/* Income Statement */}
      <FinTable rows={INCOME_STATEMENT} years={INCOME_YEARS} title="Income Statement" badge="P&L" />

      {/* Balance Sheet */}
      <FinTable rows={BALANCE_SHEET} years={INCOME_YEARS} title="Balance Sheet" badge="B/S" />

      {/* Cash Flow */}
      <FinTable rows={CASH_FLOW} years={INCOME_YEARS} title="Cash Flow Statement" badge="CF" />

      {/* DCF mini-model */}
      <Panel>
        <PanelHeader
          title="DCF Mini-Model — Implied Intrinsic Value"
          sub="Static assumptions · illustrative only — wire up ATHENA for a live sensitivity table"
          right={<Chip tone="warn">ILLUSTRATIVE</Chip>}
        />
        <div className="grid gap-4 p-4 lg:grid-cols-2">
          <div>
            <div className="mb-3 text-xs font-medium uppercase tracking-widest text-dim">Assumptions</div>
            <div className="space-y-2.5">
              {[
                { label: "Projection horizon", value: "5Y" },
                { label: "FY2025E Revenue", value: "$192B" },
                { label: "Revenue CAGR (Y1-5)", value: "18%" },
                { label: "Terminal growth rate", value: "3.5%" },
                { label: "EBIT margin (terminal)", value: "62%" },
                { label: "Tax rate", value: "14%" },
                { label: "WACC", value: "9.2%" },
                { label: "Net debt (current)", value: "$(22.9)B" },
                { label: "Shares outstanding", value: "24.53B" },
              ].map((a) => (
                <div key={a.label} className="flex items-center justify-between border-b border-line/40 pb-2">
                  <span className="text-sm text-muted">{a.label}</span>
                  <span className="font-mono text-sm text-ink">{a.value}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-3 text-xs font-medium uppercase tracking-widest text-dim">Implied Valuation</div>
            <div className="rounded-lg border border-accent/20 bg-accent/5 p-4 text-center">
              <div className="kpi-label">INTRINSIC VALUE PER SHARE</div>
              <div className="mt-2 font-mono text-4xl font-semibold text-accent">$142.80</div>
              <div className="mt-1 text-xs text-dim">vs current $128.47 — +11.2% implied upside</div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="mb-2 text-xs font-medium uppercase tracking-widest text-dim">Sensitivity — Implied Price (WACC × g)</div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr>
                      <Th>WACC \ g</Th>
                      <Th right>2.5%</Th>
                      <Th right>3.0%</Th>
                      <Th right>3.5%</Th>
                      <Th right>4.0%</Th>
                      <Th right>4.5%</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { wacc: "8.0%", vals: ["$198", "$214", "$234", "$259", "$291"] },
                      { wacc: "9.0%", vals: ["$154", "$163", "$174", "$187", "$204"] },
                      { wacc: "9.2%", vals: ["$148", "$156", "$143", "$154", "$167"] },
                      { wacc: "10.0%", vals: ["$121", "$127", "$134", "$142", "$152"] },
                      { wacc: "11.0%", vals: ["$98", "$102", "$107", "$113", "$119"] },
                    ].map((row) => (
                      <tr key={row.wacc} className="hover:bg-elevated/40">
                        <Td className="text-dim">{row.wacc}</Td>
                        {row.vals.map((v, vi) => (
                          <Td key={vi} right className={cn(
                            row.wacc === "9.2%" && vi === 2 ? "bg-accent/10 font-semibold text-accent" : "text-muted"
                          )}>{v}</Td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </Panel>

      {/* Peer comps */}
      <Panel>
        <PanelHeader
          title="Peer Comps Valuation Table"
          right={<Chip tone="info">Semis peer group · NTM estimates</Chip>}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse">
            <thead>
              <tr>
                <Th>Company</Th>
                <Th right>Mkt Cap ($B)</Th>
                <Th right>EV ($B)</Th>
                <Th right>Rev Fwd ($B)</Th>
                <Th right>P/E (TTM)</Th>
                <Th right>EV/EBITDA</Th>
                <Th right>P/S</Th>
                <Th right>ROE %</Th>
              </tr>
            </thead>
            <tbody>
              {PEER_COMPS.map((p) => (
                <tr
                  key={p.sym}
                  className={cn("hover:bg-elevated/40", p.sym === "NVDA" && "bg-accent/5 font-medium")}
                >
                  <Td mono={false}>
                    <Ticker sym={p.sym} name={p.name} />
                  </Td>
                  <Td right className={p.sym === "NVDA" ? "text-accent" : ""}>{p.mktcap.toLocaleString()}</Td>
                  <Td right className={p.sym === "NVDA" ? "text-accent" : ""}>{p.ev.toLocaleString()}</Td>
                  <Td right>{p.revFwd.toFixed(1)}</Td>
                  <Td right>{p.pe.toFixed(1)}x</Td>
                  <Td right>{p.evEbitda.toFixed(1)}x</Td>
                  <Td right>{p.ps.toFixed(1)}x</Td>
                  <Td right className={signClass(p.roe)}>{p.roe.toFixed(1)}%</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-line px-4 py-2.5 text-xs text-dim">
          <Icon name="shield" width={12} height={12} className="mr-1.5 inline text-faint" />
          Demo data — methodology mirrors FactSet / Capital IQ consensus estimates. Wire EDGAR XBRL live via SEC source.
        </div>
      </Panel>
    </div>
  );
}
