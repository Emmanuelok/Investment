import { PageHeader, Panel, PanelHeader, Chip, KpiCard, Th, Td, StatusDot } from "@/components/ui/kit";
import { LiveStat, LiveDot } from "@/components/live/live-stat";
import { COMPETITOR_COSTS } from "@/lib/data";
import { FEED_LICENSES, MNPI_QUARANTINE } from "@/lib/data/core";
import { fmtUsd, fmtInt } from "@/lib/format";
import { Icon } from "@/components/icon-map";
import { Lock, Shield, Check } from "@/components/icons";

export const metadata = { title: "License Manager · PANTHEON Infrastructure" };

const MODE_TONE: Record<string, "accent" | "warn" | "neg" | "info"> = {
  "display": "warn",
  "non-display": "accent",
  "redistribution": "neg",
  "internal": "info",
};

const STATUS_STYLE: Record<string, { label: string; tone: "pos" | "warn" | "neg" | "default" }> = {
  "active": { label: "Active", tone: "pos" },
  "paper": { label: "Paper", tone: "warn" },
  "not-provisioned": { label: "Not provisioned", tone: "neg" },
  "optional": { label: "Optional upgrade", tone: "default" },
};

const monthlyTotal = FEED_LICENSES.reduce((s, f) => s + f.monthlyCost, 0);
const activeCount = FEED_LICENSES.filter((f) => f.status === "active").length;
const paidCount = FEED_LICENSES.filter((f) => f.monthlyCost > 0).length;

export default function LicensesPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        module={{ name: "PANTHEON · Infrastructure", tone: "accent" }}
        title="License Manager"
        desc="Data feed licensing — display vs. non-display permissions, seat counts, cost tracking, MNPI quarantine policy, and benchmark savings vs. incumbents."
        right={
          <div className="flex items-center gap-2">
            <LiveDot />
            <Chip tone="pos" dot>{activeCount} feeds active</Chip>
            <Chip tone="accent">{fmtUsd(monthlyTotal, 0)}/mo total</Chip>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          label="EFFECTIVE SPEND / MO"
          value={fmtUsd(monthlyTotal, 0)}
          sub={`${paidCount} of ${FEED_LICENSES.length} feeds licensed`}
          tone="accent"
          icon={<Lock width={15} height={15} />}
        />
        <KpiCard
          label="BLOOMBERG SAVINGS"
          value={<LiveStat value={31980} prefix="$" decimals={0} vol={0.003} />}
          sub="per seat per year avoided"
          tone="pos"
          icon={<Check width={15} height={15} />}
        />
        <KpiCard
          label="MNPI QUARANTINED"
          value={<LiveStat value={2} decimals={0} vol={0.01} />}
          sub="items held before research access"
          tone="warn"
          icon={<Shield width={15} height={15} />}
        />
        <KpiCard
          label="FREE DATA FEEDS"
          value={FEED_LICENSES.filter((f) => f.monthlyCost === 0 && f.status === "active").length.toString()}
          sub="EDGAR · FRED · Finnhub · Quiver"
          tone="pos"
          icon={<Icon name="plug" width={15} height={15} />}
        />
      </div>

      {/* License table */}
      <Panel>
        <PanelHeader
          title="Feed Licensing Register"
          right={<Chip tone="accent">Effective {fmtUsd(monthlyTotal, 0)}/mo</Chip>}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] border-collapse">
            <thead>
              <tr>
                <Th>Feed</Th>
                <Th>Kind</Th>
                <Th>License Mode</Th>
                <Th>Status</Th>
                <Th right>Seats</Th>
                <Th right>Monthly Cost</Th>
                <Th>Notes</Th>
              </tr>
            </thead>
            <tbody>
              {FEED_LICENSES.map((f) => {
                const st = STATUS_STYLE[f.status] ?? STATUS_STYLE["optional"];
                const modeTone = MODE_TONE[f.mode] ?? "default";
                const isUnlicensed = f.status === "not-provisioned" || f.status === "optional";
                return (
                  <tr key={f.name} className={`group transition-colors hover:bg-elevated/40 ${isUnlicensed ? "opacity-60" : ""}`}>
                    <Td mono className="text-ink font-medium">{f.name}</Td>
                    <Td mono={false} className="text-muted text-xs">{f.kind}</Td>
                    <Td mono={false}>
                      <Chip tone={modeTone} className="text-[9px]">{f.mode}</Chip>
                    </Td>
                    <Td mono={false}>
                      <div className="flex items-center gap-1.5">
                        <StatusDot tone={st.tone} />
                        <span className={`font-mono text-xs ${st.tone === "pos" ? "text-pos" : st.tone === "warn" ? "text-warn" : st.tone === "neg" ? "text-neg" : "text-dim"}`}>
                          {st.label}
                        </span>
                      </div>
                    </Td>
                    <Td right className="text-muted">
                      {f.seats === null ? "—" : f.seats}
                    </Td>
                    <Td right className={f.monthlyCost > 0 ? "text-warn font-semibold" : "text-pos"}>
                      {f.monthlyCost === 0 ? "$0" : fmtUsd(f.monthlyCost, 0)}
                    </Td>
                    <Td mono={false} className="text-dim text-xs max-w-[260px]">{f.notes}</Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="grid grid-cols-3 divide-x divide-line border-t border-line">
          <div className="px-4 py-3">
            <div className="kpi-label">TOTAL MONTHLY</div>
            <div className="mt-1 font-mono text-xl text-ink">{fmtUsd(monthlyTotal, 0)}</div>
          </div>
          <div className="px-4 py-3">
            <div className="kpi-label">ANNUAL EQUIVALENT</div>
            <div className="mt-1 font-mono text-xl text-ink">{fmtUsd(monthlyTotal * 12, 0)}</div>
          </div>
          <div className="px-4 py-3">
            <div className="kpi-label">VS BLOOMBERG (1 SEAT)</div>
            <div className="mt-1 font-mono text-xl text-pos">−{fmtUsd(31980 - monthlyTotal * 12, 0)}/yr</div>
          </div>
        </div>
      </Panel>

      {/* Block-on-exceed policy */}
      <div className="grid gap-4 md:grid-cols-2">
        <Panel>
          <PanelHeader
            title="Block-on-Exceed Policy"
            right={<Chip tone="neg">Enforcement active</Chip>}
          />
          <div className="space-y-3 p-4">
            {[
              { rule: "Hard block on non-display budget exceed", detail: "Any feed query that would breach non-display terms is rejected pre-execution with a compliance log entry.", tone: "neg" as const },
              { rule: "Seat-count enforcement", detail: "API keys are scoped per seat. Shared credentials are rejected. Violations are logged to the audit trail.", tone: "neg" as const },
              { rule: "Redistribution prohibition", detail: "Display-licensed data is never written to redistributable endpoints (external APIs, public notebooks).", tone: "warn" as const },
              { rule: "License expiry auto-disable", detail: "30-day warning email. On expiry, the feed is auto-disabled and downstream signals degrade to fallback sources.", tone: "warn" as const },
            ].map((r) => (
              <div key={r.rule} className="flex gap-2.5">
                <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${r.tone === "neg" ? "bg-neg" : "bg-warn"}`} />
                <div>
                  <div className="font-mono text-xs font-medium text-ink">{r.rule}</div>
                  <p className="mt-0.5 text-xs leading-relaxed text-dim">{r.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        {/* MNPI quarantine panel */}
        <Panel>
          <PanelHeader
            title="MNPI Quarantine"
            right={<Chip tone="warn" dot>2 items held</Chip>}
          />
          <div className="divide-y divide-line">
            {MNPI_QUARANTINE.map((item) => (
              <div key={item.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-warn" />
                    <span className="font-mono text-xs font-medium text-warn">{item.id}</span>
                  </div>
                  <Chip tone="warn" className="text-[9px]">HELD</Chip>
                </div>
                <p className="mt-2 text-xs text-muted">{item.desc}</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="font-mono text-[10px] text-dim">{item.ts}</span>
                  <span className="text-dim">·</span>
                  <span className="font-mono text-[10px] text-dim">{item.source}</span>
                </div>
                <p className="mt-1 text-[10px] text-faint">{item.reason}</p>
              </div>
            ))}
          </div>
          <div className="border-t border-line px-4 py-3 text-xs text-dim">
            MNPI events are quarantined before research pipelines can access them. A compliance officer must explicitly release or flag each item.
          </div>
        </Panel>
      </div>

      {/* Incumbent cost comparison */}
      <Panel>
        <PanelHeader
          title="Savings vs. Incumbent Platforms"
          right={<Chip tone="pos">PANTHEON wins on every row</Chip>}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr>
                <Th>Incumbent</Th>
                <Th right>List Price</Th>
                <Th right>PANTHEON Equivalent</Th>
                <Th right>Annual Saving (1 seat)</Th>
                <Th right>10-Yr NPV (5% discount)</Th>
              </tr>
            </thead>
            <tbody>
              {COMPETITOR_COSTS.map((c) => {
                const pantheonAnnual = monthlyTotal * 12;
                const saving = c.cost - pantheonAnnual;
                const npv = saving * ((1 - Math.pow(1.05, -10)) / 0.05);
                return (
                  <tr key={c.name} className="group transition-colors hover:bg-elevated/40">
                    <Td mono={false} className="font-medium text-ink">{c.name}</Td>
                    <Td right className="text-neg font-semibold">{fmtUsd(c.cost, 0)}{c.unit}</Td>
                    <Td right className="text-pos">{fmtUsd(pantheonAnnual, 0)}/yr</Td>
                    <Td right className="text-pos font-semibold">{fmtUsd(saving, 0)}</Td>
                    <Td right className="text-accent">
                      ${fmtInt(Math.round(npv))}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="border-t border-line px-4 py-2.5 text-xs text-dim">
          PANTHEON cost = {fmtUsd(monthlyTotal, 0)}/mo ({fmtUsd(monthlyTotal * 12, 0)}/yr). Incumbent list prices per public pricing. NPV calculated at 5% discount rate over 10 years.
        </div>
      </Panel>
    </div>
  );
}
