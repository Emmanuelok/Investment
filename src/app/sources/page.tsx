import { PageHeader, Panel, PanelHeader, Chip, KpiCard, Th, Td, StatusDot } from "@/components/ui/kit";
import { SOURCES } from "@/lib/data";
import { fmtUsd } from "@/lib/format";
import { Icon } from "@/components/icon-map";
import { Shield, Plug, Lock } from "@/components/icons";

export const metadata = { title: "Sources · PANTHEON Infrastructure" };

const TIER_TONE: Record<string, "pos" | "warn" | "accent"> = {
  free: "pos",
  freemium: "warn",
  paid: "accent",
};

const STATUS_TONE: Record<string, "pos" | "warn" | "neg"> = {
  healthy: "pos",
  degraded: "warn",
  blocked: "neg",
};

const ROUTING_RULES = [
  { field: "Fundamentals / XBRL", primary: "SEC EDGAR", fallback: "yfinance", reason: "EDGAR is authoritative, PIT-exact as filed" },
  { field: "Intraday Quotes", primary: "yfinance", fallback: "Alpha Vantage", reason: "Low latency; Alpha Vantage as degraded fallback" },
  { field: "Macro / Curves", primary: "FRED", fallback: "—", reason: "Official central bank data; no substitute" },
  { field: "News / Events", primary: "Finnhub", fallback: "GDELT + RSS", reason: "Finnhub structured; GDELT for global breadth" },
  { field: "Crypto L2/L3", primary: "Binance WS", fallback: "Coinbase WS", reason: "38ms depth; Coinbase for cross-venue validation" },
  { field: "Web Signals", primary: "Thinknum", fallback: "—", reason: "No free substitute — paid only; blocked without license" },
  { field: "Disclosures", primary: "Quiver Quant", fallback: "SEC EDGAR Form 4", reason: "Quiver structured; EDGAR raw fallback" },
  { field: "Execution", primary: "Alpaca", fallback: "IBKR", reason: "Alpaca paper default; IBKR for live production" },
];

const healthyCount = SOURCES.filter((s) => s.status === "healthy").length;
const blockedCount = SOURCES.filter((s) => s.status === "blocked").length;
const degradedCount = SOURCES.filter((s) => s.status === "degraded").length;
const totalCost = SOURCES.reduce((sum, s) => sum + s.cost, 0);

export default function SourcesPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        module={{ name: "PANTHEON · Infrastructure", tone: "accent" }}
        title="Data Sources"
        desc="All PANTHEON data connectors — health status, latency, licensing tier, and blended-source routing rules."
        right={<Chip tone="pos" dot>{healthyCount} / {SOURCES.length} healthy</Chip>}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          label="SOURCES HEALTHY"
          value={`${healthyCount} / ${SOURCES.length}`}
          sub={`${degradedCount} degraded · ${blockedCount} blocked by policy`}
          tone="pos"
          icon={<Plug width={15} height={15} />}
        />
        <KpiCard
          label="FREE SOURCES"
          value={SOURCES.filter((s) => s.tier === "free").length.toString()}
          sub="No cost · public / open license"
          tone="pos"
          icon={<Icon name="globe" width={15} height={15} />}
        />
        <KpiCard
          label="DATA SPEND / MO"
          value={fmtUsd(totalCost, 0)}
          sub="2 paid connectors provisioned"
          tone="accent"
          icon={<Lock width={15} height={15} />}
        />
        <KpiCard
          label="MIN LATENCY"
          value="38 ms"
          sub="Binance WS full book depth"
          icon={<Icon name="activity" width={15} height={15} />}
        />
      </div>

      {/* Sources table */}
      <Panel>
        <PanelHeader
          title="Source Catalog"
          right={
            <div className="flex items-center gap-2">
              <Chip tone="pos" dot>14 online</Chip>
              <Chip tone="neg" dot>1 blocked</Chip>
            </div>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse">
            <thead>
              <tr>
                <Th>Source</Th>
                <Th>Kind</Th>
                <Th>Tier</Th>
                <Th>Status</Th>
                <Th right>Latency</Th>
                <Th>Capabilities</Th>
                <Th right>Cost / mo</Th>
                <Th>License</Th>
              </tr>
            </thead>
            <tbody>
              {SOURCES.map((s) => {
                const statusTone = STATUS_TONE[s.status] ?? "warn";
                const tierTone = TIER_TONE[s.tier] ?? "default";
                const isBlocked = s.status === "blocked";
                return (
                  <tr key={s.name} className={`group transition-colors hover:bg-elevated/40 ${isBlocked ? "opacity-50" : ""}`}>
                    <Td mono={false}>
                      <div className="flex items-center gap-2">
                        <StatusDot tone={statusTone} pulse={s.status === "healthy"} />
                        <span className="font-mono text-xs font-medium text-ink">{s.name}</span>
                      </div>
                    </Td>
                    <Td mono={false} className="text-muted text-xs">{s.kind}</Td>
                    <Td mono={false}>
                      <Chip tone={tierTone} className="text-[10px]">{s.tier}</Chip>
                    </Td>
                    <Td mono={false}>
                      <span className={`font-mono text-xs ${statusTone === "pos" ? "text-pos" : statusTone === "warn" ? "text-warn" : "text-neg"}`}>
                        {s.status}
                      </span>
                    </Td>
                    <Td right className={s.latency === 0 ? "text-dim" : "text-ink"}>
                      {s.latency === 0 ? "—" : `${s.latency} ms`}
                    </Td>
                    <Td mono={false}>
                      <div className="flex flex-wrap gap-1">
                        {s.caps.map((c) => (
                          <span key={c} className="chip text-[9px]">{c}</span>
                        ))}
                      </div>
                    </Td>
                    <Td right className={s.cost > 0 ? "text-warn" : "text-pos"}>
                      {s.cost === 0 ? "$0" : fmtUsd(s.cost, 0)}
                    </Td>
                    <Td mono={false} className="text-dim text-xs">{s.license}</Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="border-t border-line px-4 py-2.5 text-xs text-dim">
          Status is checked on ingest. Degraded sources are still queried with a latency warning. Blocked sources require license provisioning.
        </div>
      </Panel>

      {/* Routing explainer */}
      <Panel>
        <PanelHeader
          title="Blended-Source Routing"
          right={<Chip tone="accent">Best field from each source</Chip>}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr>
                <Th>Field / Signal</Th>
                <Th>Primary Source</Th>
                <Th>Fallback</Th>
                <Th>Routing Reason</Th>
              </tr>
            </thead>
            <tbody>
              {ROUTING_RULES.map((r) => (
                <tr key={r.field} className="group transition-colors hover:bg-elevated/40">
                  <Td mono={false} className="font-medium text-ink text-xs">{r.field}</Td>
                  <Td mono={false}>
                    <span className="rounded border border-accent/20 bg-accent/5 px-1.5 py-0.5 font-mono text-[10px] text-accent">{r.primary}</span>
                  </Td>
                  <Td mono={false} className="text-dim text-xs">{r.fallback}</Td>
                  <Td mono={false} className="text-muted text-xs">{r.reason}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-line px-4 py-3 text-xs text-dim">
          PANTHEON prefers the most authoritative source per field — not just the most convenient. Source priority is versioned and auditable.
        </div>
      </Panel>

      {/* Health summary + toggle styling */}
      <div className="grid gap-4 md:grid-cols-2">
        <Panel>
          <PanelHeader title="Health Summary" />
          <div className="space-y-3 p-4">
            {[
              { label: "Healthy", count: healthyCount, tone: "pos" as const, pct: Math.round((healthyCount / SOURCES.length) * 100) },
              { label: "Degraded", count: degradedCount, tone: "warn" as const, pct: Math.round((degradedCount / SOURCES.length) * 100) },
              { label: "Blocked by policy", count: blockedCount, tone: "neg" as const, pct: Math.round((blockedCount / SOURCES.length) * 100) },
            ].map((h) => (
              <div key={h.label} className="flex items-center gap-3">
                <StatusDot tone={h.tone} />
                <span className="w-36 text-sm text-muted">{h.label}</span>
                <div className="flex-1 overflow-hidden rounded-full bg-elevated/40" style={{ height: 6 }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${h.pct}%`,
                      background: h.tone === "pos" ? "var(--pos)" : h.tone === "warn" ? "var(--warn)" : "var(--neg)",
                    }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right font-mono text-xs text-muted">{h.count}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-line px-4 py-3 text-xs text-dim">
            YipitData, Databento, Polygon blocked pending license provisioning. Functionality degrades gracefully — free proxies remain active.
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Provider On/Off Toggles" right={<Chip tone="warn">Styling only — demo</Chip>} />
          <div className="divide-y divide-line">
            {SOURCES.slice(0, 8).map((s) => {
              const isOn = s.status !== "blocked";
              return (
                <div key={s.name} className="flex items-center justify-between px-4 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <StatusDot tone={STATUS_TONE[s.status] ?? "warn"} />
                    <span className="font-mono text-xs text-ink">{s.name}</span>
                    <Chip tone={TIER_TONE[s.tier]}>{s.tier}</Chip>
                  </div>
                  {/* Toggle visual */}
                  <div
                    className={`relative h-5 w-9 rounded-full transition-colors ${isOn ? "bg-pos/30 border border-pos/40" : "bg-line border border-line"}`}
                  >
                    <div
                      className={`absolute top-0.5 h-4 w-4 rounded-full transition-transform ${isOn ? "translate-x-4 bg-pos" : "translate-x-0.5 bg-dim"}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="border-t border-line px-4 py-2.5 text-xs text-dim">
            Per-provider toggles disable ingest. Downstream signals automatically degrade to best available source.
          </div>
        </Panel>
      </div>
    </div>
  );
}
