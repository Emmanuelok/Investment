import { PageHeader, Panel, PanelHeader, Chip, Th, Td, Ticker, StatusDot } from "@/components/ui/kit";
import { LiveDot } from "@/components/live/live-stat";
import { LiveFilings } from "@/components/data/live-filings";
import { Icon } from "@/components/icon-map";
import { signClass } from "@/lib/format";
import { cn } from "@/lib/cn";
import {
  FILINGS,
  HOLDINGS_13F,
  INSIDER_TRANSACTIONS,
} from "@/lib/data/obsidian";

export const metadata = { title: "Filings & 13F — OBSIDIAN Terminal" };

const FORM_COLORS: Record<string, string> = {
  "10-K": "chip-accent",
  "10-Q": "border-info/30 bg-info/10 text-info",
  "8-K": "chip-warn",
  "S-1": "border-ai/30 bg-ai/10 text-ai",
  "DEF 14A": "chip-pos",
  "Form 4": "border-neg/30 bg-neg/10 text-neg",
};

function formChip(form: string) {
  const cls = FORM_COLORS[form] ?? "";
  return <span className={cn("chip", cls)}>{form}</span>;
}

export default function FilingsPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        module={{ name: "OBSIDIAN · Terminal", tone: "accent" }}
        title="Filings & 13F Browser"
        desc="EDGAR filings browser, 13F institutional holdings tracker, and Form 4 insider transactions. Source: SEC EDGAR public feeds."
        right={
          <div className="flex items-center gap-2">
            <LiveDot />
            <StatusDot tone="pos" pulse />
            <span className="font-mono text-xs text-muted">SEC EDGAR · live</span>
            <Chip tone="accent">EDGAR</Chip>
          </div>
        }
      />

      {/* Live EDGAR filings panel */}
      <LiveFilings />

      {/* Filing stats KPI deck */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "10-K FILINGS (30D)", value: "4,218", sub: "Annual reports", icon: "doc" },
          { label: "10-Q FILINGS (30D)", value: "12,841", sub: "Quarterly reports", icon: "doc" },
          { label: "FORM 4 (30D)", value: "28,492", sub: "Insider transactions", icon: "shield" },
          { label: "S-1 / S-11 (YTD)", value: "142", sub: "New registrations", icon: "globe" },
        ].map((k) => (
          <Panel key={k.label} hover className="scanline px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="kpi-label">{k.label}</span>
              <Icon name={k.icon} width={14} height={14} className="text-dim" />
            </div>
            <div className="mt-2 font-mono text-2xl font-semibold text-ink">{k.value}</div>
            <div className="mt-1 text-xs text-dim">{k.sub}</div>
          </Panel>
        ))}
      </div>

      {/* Full-text search bar */}
      <Panel>
        <PanelHeader
          title="EDGAR Full-Text Search"
          sub="Search form type, company, keyword, CIK, or accession number"
          right={<Chip tone="info">EFTS API</Chip>}
        />
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="relative flex-1">
            <Icon name="search" width={15} height={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-dim" />
            <div className="flex h-9 w-full items-center rounded-md border border-line bg-elevated px-3 pl-9 font-mono text-sm text-muted">
              <span className="opacity-40">Search filings, entities, keywords...</span>
              <span className="ml-auto font-mono text-2xs text-faint">⌘K</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {["10-K", "10-Q", "8-K", "S-1", "Form 4", "13F"].map((f) => (
              <span key={f} className={cn("chip cursor-pointer", FORM_COLORS[f] ?? "")}>{f}</span>
            ))}
          </div>
          <div className="flex gap-1">
            <button className="btn">2024</button>
            <button className="btn">All Sectors</button>
          </div>
        </div>
      </Panel>

      {/* Filings browser table */}
      <Panel>
        <PanelHeader
          title="Recent Filings — EDGAR Browser"
          right={
            <div className="flex items-center gap-2">
              <span className="font-mono text-2xs text-dim">Updated 4m ago</span>
              <StatusDot tone="pos" pulse />
            </div>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse">
            <thead>
              <tr>
                <Th>Form Type</Th>
                <Th>Company</Th>
                <Th>Filed Date</Th>
                <Th>Period</Th>
                <Th right>Pages</Th>
                <Th right>Size</Th>
                <Th right>View</Th>
              </tr>
            </thead>
            <tbody>
              {FILINGS.map((f, i) => (
                <tr key={i} className="group hover:bg-elevated/40">
                  <Td mono={false}>{formChip(f.form)}</Td>
                  <Td mono={false}>
                    <Ticker sym={f.sym} name={f.company} />
                  </Td>
                  <Td className="text-muted">{f.filed}</Td>
                  <Td className="text-muted">{f.period}</Td>
                  <Td right className="text-muted">{f.pages}</Td>
                  <Td right className="text-muted">{f.size}</Td>
                  <Td right>
                    <button className="font-mono text-xs text-accent hover:underline">
                      EDGAR ↗
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-line px-4 py-2.5 text-xs text-dim">
          <span>Showing 12 of 128,482 filings in the last 30 days</span>
          <button className="font-mono text-accent hover:underline">Load more →</button>
        </div>
      </Panel>

      {/* 13F Holdings table */}
      <Panel>
        <PanelHeader
          title="13F Institutional Holdings — NVDA (Q1 2024)"
          sub="Aggregated from SEC 13F filings. Quarterly frequency; not real-time."
          right={
            <div className="flex gap-2">
              <Ticker sym="NVDA" name="NVIDIA" />
              <Chip tone="info">Q1 2024</Chip>
            </div>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] border-collapse">
            <thead>
              <tr>
                <Th>Institution</Th>
                <Th right>Shares (000s)</Th>
                <Th right>Mkt Value ($M)</Th>
                <Th right>% Float</Th>
                <Th right>Chg QoQ (000s)</Th>
                <Th right>Quarter</Th>
              </tr>
            </thead>
            <tbody>
              {HOLDINGS_13F.map((h, i) => (
                <tr key={i} className="group hover:bg-elevated/40">
                  <Td mono={false} className="font-medium text-ink">{h.institution}</Td>
                  <Td right>{h.shares.toLocaleString()}</Td>
                  <Td right>${h.value.toLocaleString()}</Td>
                  <Td right className="text-muted">{h.pctFloat.toFixed(2)}%</Td>
                  <Td right className={signClass(h.chgQoQ)}>
                    {h.chgQoQ >= 0 ? "+" : ""}{h.chgQoQ.toLocaleString()}
                  </Td>
                  <Td right className="text-dim">{h.qtr}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-line px-4 py-2.5 text-xs text-dim">
          Total inst. ownership: 66.4% float · 4,182 institutions · data from latest 13F/13G/13D aggregation
        </div>
      </Panel>

      {/* Form 4 insider transactions */}
      <Panel>
        <PanelHeader
          title="Form 4 — Insider Transactions (Recent 30 Days)"
          sub="SEC EDGAR Section 16 reportable transactions. Insiders defined as directors, officers, and 10%+ holders."
          right={<Chip tone="warn">INSIDER</Chip>}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse">
            <thead>
              <tr>
                <Th>Insider</Th>
                <Th>Title</Th>
                <Th>Symbol</Th>
                <Th>Transaction</Th>
                <Th right>Shares</Th>
                <Th right>Avg Price</Th>
                <Th right>Total Value</Th>
                <Th right>Date</Th>
              </tr>
            </thead>
            <tbody>
              {INSIDER_TRANSACTIONS.map((tx, i) => (
                <tr key={i} className="group hover:bg-elevated/40">
                  <Td mono={false} className="font-medium text-ink">{tx.insider}</Td>
                  <Td mono={false} className="text-dim">{tx.title}</Td>
                  <Td mono={false}>
                    <span className="inline-flex items-center rounded border border-line bg-elevated/70 px-1.5 py-0.5 font-mono text-xs font-medium text-ink">
                      {tx.sym}
                    </span>
                  </Td>
                  <Td mono={false}>
                    <Chip
                      tone={tx.txType === "Buy" ? "pos" : tx.txType === "Sell" ? "neg" : "warn"}
                    >
                      {tx.txType}
                    </Chip>
                  </Td>
                  <Td right>{tx.shares.toLocaleString()}</Td>
                  <Td right>${tx.price.toFixed(2)}</Td>
                  <Td right className={tx.txType === "Buy" ? "text-pos font-medium" : "text-neg font-medium"}>
                    ${(tx.value / 1e6).toFixed(1)}M
                  </Td>
                  <Td right className="text-dim">{tx.date}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center gap-3 border-t border-line px-4 py-2.5 text-xs text-dim">
          <Icon name="shield" width={12} height={12} className="text-faint" />
          Data sourced directly from SEC EDGAR EDGAR 4/D/A feeds. Transactions with MNPI flags are quarantined per policy.
          <Chip tone="warn" className="ml-auto">2 ITEMS QUARANTINED</Chip>
        </div>
      </Panel>
    </div>
  );
}
