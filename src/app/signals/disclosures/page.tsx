import Link from "next/link";
import {
  PageHeader,
  Panel,
  PanelHeader,
  Chip,
  KpiCard,
  Th,
  Td,
  Ticker,
  StatusDot,
} from "@/components/ui/kit";
import { Sparkline, DeltaBars } from "@/components/ui/viz";
import { Icon } from "@/components/icon-map";
import { ChevronRight } from "@/components/icons";
import {
  CONGRESS_TRADES,
  INSIDER_TRADES,
  LOBBY_DATA,
  CONTRACT_AWARDS,
} from "@/lib/data/argus";
import { fmtUsdCompact, fmtCompact, fmtSignedPct, signClass } from "@/lib/format";
import { priceWalk } from "@/lib/rng";
import { cn } from "@/lib/cn";

export const metadata = { title: "ARGUS · Disclosures" };

/* Defense cluster sparkline (LMT/RTX/NOC cluster activity) */
const DEFENSE_CLUSTER_SPARK = priceWalk("defense-cluster", 30, 100, 0.015, 0.006);
const LMT_SPARK = priceWalk("LMT-disc", 30, 100, 0.012, 0.004);
const RTX_SPARK = priceWalk("RTX-disc", 30, 100, 0.013, 0.004);
const NOC_SPARK = priceWalk("NOC-disc", 30, 100, 0.011, 0.004);

const buyCount = CONGRESS_TRADES.filter((t) => t.transaction === "Buy").length;
const sellCount = CONGRESS_TRADES.filter((t) => t.transaction === "Sell").length;
const flaggedCount = CONGRESS_TRADES.filter((t) => t.flagged).length;
const avgDisclose =
  Math.round(
    CONGRESS_TRADES.reduce((s, t) => s + t.daysToDisclose, 0) / CONGRESS_TRADES.length
  );

const insiderBuys = INSIDER_TRADES.filter((t) => t.type === "Buy");
const insiderSells = INSIDER_TRADES.filter((t) => t.type === "Sell");

export default function DisclosuresPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        module={{ name: "ARGUS · Alt-Data & Signals", tone: "accent" }}
        title="Disclosures — Quiver Signal Family"
        desc="Congressional trading (STOCK Act), Form 4 insider activity, lobbying spend, and contract awards. Point-in-time as-filed — no look-ahead."
        right={
          <div className="flex items-center gap-2">
            <StatusDot tone="pos" pulse />
            <span className="font-mono text-xs text-dim">Quiver Quant · API Trader tier</span>
            <Link href="/signals" className="btn">
              ← All Signals
            </Link>
          </div>
        }
      />

      {/* KPI deck */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          label="Congress Trades (30D)"
          value={String(CONGRESS_TRADES.length)}
          sub={`${buyCount} buys · ${sellCount} sells`}
          icon={<Icon name="doc" width={15} height={15} />}
          tone="accent"
        />
        <KpiCard
          label="Abnormal Clusters"
          value={String(flaggedCount)}
          sub="defense cluster flagged · z=+2.41"
          icon={<Icon name="bell" width={15} height={15} />}
          tone="warn"
        />
        <KpiCard
          label="Avg Days-to-Disclose"
          value={`${avgDisclose}d`}
          sub="STOCK Act limit: 45 days"
          icon={<Icon name="gauge" width={15} height={15} />}
        />
        <KpiCard
          label="Insider Form 4s (30D)"
          value={String(INSIDER_TRADES.length)}
          sub={`${insiderBuys.length} buys · ${insiderSells.length} sells`}
          icon={<Icon name="shield" width={15} height={15} />}
        />
      </div>

      {/* Defense cluster anomaly callout */}
      <Panel glow>
        <PanelHeader
          title="Abnormal Congressional Cluster — Defense Names"
          right={<Chip tone="warn">z = +2.41 · FLAGGED</Chip>}
        />
        <div className="grid gap-4 p-4 md:grid-cols-3">
          {[
            { sym: "LMT", name: "Lockheed Martin", z: "+2.41", spark: LMT_SPARK, note: "2 members · buy · $100K–$200K combined" },
            { sym: "RTX", name: "RTX Corp", z: "+1.88", spark: RTX_SPARK, note: "1 member · buy · $15K–$50K" },
            { sym: "NOC", name: "Northrop Grumman", z: "+1.62", spark: NOC_SPARK, note: "1 member · buy · $50K–$100K" },
          ].map(({ sym, name, z, spark, note }) => (
            <div
              key={sym}
              className="flex flex-col gap-2 rounded border border-warn/20 bg-warn/5 p-3"
            >
              <div className="flex items-center justify-between">
                <Ticker sym={sym} name={name} />
                <span className="font-mono text-sm font-semibold text-pos">{z}</span>
              </div>
              <Sparkline data={spark} width={200} height={32} />
              <p className="text-xs text-muted">{note}</p>
            </div>
          ))}
        </div>
        <div className="border-t border-line px-4 py-3">
          <div className="flex items-start gap-3">
            <Icon name="shield" width={14} height={14} className="mt-0.5 shrink-0 text-warn" />
            <p className="text-xs leading-relaxed text-muted">
              3 congressional disclosures across defense names in 5 consecutive sessions constitutes
              a statistically abnormal cluster (z = +2.41 vs 52-week baseline). The cluster signal
              is MNPI-clean — these are STOCK Act public filings. Cross-referenced with Q1 2025
              defense supplemental budget hearings and F-35/B-21 contract news for calendar proximity.
              No data here was acquired through non-public channels.
            </p>
          </div>
        </div>
      </Panel>

      {/* Congressional trading table */}
      <Panel>
        <PanelHeader
          title="Congressional Trading — STOCK Act Disclosures (30D)"
          sub="Source: Quiver Quant · as-filed point-in-time · MNPI quarantine gate applied"
          right={<Chip tone="info">Public filings · MNPI-clean</Chip>}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse">
            <thead>
              <tr>
                <Th>Member</Th>
                <Th>Party</Th>
                <Th>Ticker</Th>
                <Th>Transaction</Th>
                <Th right>Amount Range</Th>
                <Th right>Tx Date</Th>
                <Th right>Filed Date</Th>
                <Th right>Days to Disclose</Th>
                <Th>Flag</Th>
              </tr>
            </thead>
            <tbody>
              {CONGRESS_TRADES.map((t, i) => (
                <tr
                  key={i}
                  className={cn(
                    "group transition-colors hover:bg-elevated/40",
                    t.flagged && "bg-warn/5"
                  )}
                >
                  <Td mono={false} className="font-medium text-ink">
                    {t.member}
                  </Td>
                  <Td mono={false}>
                    <Chip
                      tone={t.party === "D" ? "info" : t.party === "R" ? "neg" : "default"}
                    >
                      {t.party}
                    </Chip>
                  </Td>
                  <Td mono={false}>
                    <Ticker sym={t.ticker} />
                  </Td>
                  <Td mono={false}>
                    <span
                      className={cn(
                        "font-medium",
                        t.transaction === "Buy" ? "text-pos" : "text-neg"
                      )}
                    >
                      {t.transaction}
                    </span>
                  </Td>
                  <Td right className="text-muted">
                    {t.amountRange}
                  </Td>
                  <Td right className="text-dim">
                    {t.txDate}
                  </Td>
                  <Td right className="text-dim">
                    {t.filedDate}
                  </Td>
                  <Td right className={t.daysToDisclose > 20 ? "text-warn" : "text-muted"}>
                    {t.daysToDisclose}d
                  </Td>
                  <Td>
                    {t.flagged ? (
                      <Chip tone="warn">CLUSTER</Chip>
                    ) : (
                      <span className="font-mono text-xs text-dim">—</span>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-line px-4 py-2.5">
          <div className="flex items-center justify-between text-xs text-dim">
            <span>
              STOCK Act requires disclosure within 45 days of transaction. Cluster detection uses
              z-score vs 52-week rolling baseline, sector-adjusted.
            </span>
            <Link
              href="/data-lake"
              className="flex items-center gap-1 text-accent hover:underline"
            >
              full archive <ChevronRight width={13} height={13} />
            </Link>
          </div>
        </div>
      </Panel>

      {/* Insider Form 4 table */}
      <Panel>
        <PanelHeader
          title="Insider Form 4 — Recent Activity"
          sub="Source: SEC EDGAR · as-filed · officers, directors, and 10% owners"
          right={<Chip tone="accent">EDGAR real-time</Chip>}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] border-collapse">
            <thead>
              <tr>
                <Th>Insider</Th>
                <Th>Title</Th>
                <Th>Ticker</Th>
                <Th>Type</Th>
                <Th right>Shares</Th>
                <Th right>Price</Th>
                <Th right>Value</Th>
                <Th right>Tx Date</Th>
                <Th right>Filed</Th>
              </tr>
            </thead>
            <tbody>
              {INSIDER_TRADES.map((t, i) => (
                <tr key={i} className="group transition-colors hover:bg-elevated/40">
                  <Td mono={false} className="font-medium text-ink">
                    {t.name}
                  </Td>
                  <Td mono={false} className="text-dim">
                    {t.title}
                  </Td>
                  <Td mono={false}>
                    <Ticker sym={t.ticker} />
                  </Td>
                  <Td mono={false}>
                    <span className={t.type === "Buy" ? "font-medium text-pos" : "font-medium text-neg"}>
                      {t.type}
                    </span>
                  </Td>
                  <Td right>{fmtCompact(t.shares, 0)}</Td>
                  <Td right className="text-muted">
                    ${t.price.toFixed(2)}
                  </Td>
                  <Td right className="text-ink">
                    {fmtUsdCompact(t.value)}
                  </Td>
                  <Td right className="text-dim">
                    {t.txDate}
                  </Td>
                  <Td right className="text-dim">
                    {t.filedDate}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Bottom row: Lobbying + Contract Awards */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Lobbying spend */}
        <Panel>
          <PanelHeader
            title="Lobbying Spend — Q1 2025"
            sub="Source: Senate LDA · as-filed quarterly disclosures"
            right={<Chip tone="info">LDA · public</Chip>}
          />
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <Th>Company</Th>
                  <Th right>Spend</Th>
                  <Th right>QoQ</Th>
                  <Th mono={false}>Focus Area</Th>
                </tr>
              </thead>
              <tbody>
                {LOBBY_DATA.map((row) => (
                  <tr key={row.ticker} className="group transition-colors hover:bg-elevated/40">
                    <Td mono={false}>
                      <Ticker sym={row.ticker} name={row.company} />
                    </Td>
                    <Td right>{fmtUsdCompact(row.spend)}</Td>
                    <Td right className={signClass(row.qoq)}>
                      {fmtSignedPct(row.qoq)}
                    </Td>
                    <Td mono={false} className="text-xs text-dim">
                      {row.focus}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        {/* Government contract awards */}
        <Panel>
          <PanelHeader
            title="Government Contract Awards (Recent)"
            sub="Source: SAM.gov / USASpending · EDGAR 8-K cross-reference"
            right={<Chip tone="warn">Point-in-time as-filed</Chip>}
          />
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <Th>Entity</Th>
                  <Th>Agency</Th>
                  <Th right>Value</Th>
                  <Th right>Date</Th>
                  <Th>PIT</Th>
                </tr>
              </thead>
              <tbody>
                {CONTRACT_AWARDS.map((c, i) => (
                  <tr key={i} className="group transition-colors hover:bg-elevated/40">
                    <Td mono={false}>
                      <Ticker sym={c.ticker} name={c.company} />
                    </Td>
                    <Td mono={false} className="text-xs text-dim">
                      {c.agency}
                    </Td>
                    <Td right className="font-semibold text-pos">
                      {fmtUsdCompact(c.value)}
                    </Td>
                    <Td right className="text-dim">
                      {c.awardDate}
                    </Td>
                    <Td>
                      {c.piFlag ? (
                        <Chip tone="accent">PIT ✓</Chip>
                      ) : (
                        <span className="font-mono text-xs text-dim">—</span>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-line px-4 py-2.5">
            <div className="flex items-start gap-2 text-xs text-dim">
              <Icon name="shield" width={13} height={13} className="mt-0.5 shrink-0" />
              <span>
                PIT flag means the award appeared in a same-day 8-K filing — the signal does not
                use information not yet publicly disclosed at the as_of timestamp.
              </span>
            </div>
          </div>
        </Panel>
      </div>

      {/* Defense cluster delta bars */}
      <Panel>
        <PanelHeader
          title="Defense Cluster — Congressional Activity vs 52W Baseline"
          right={<Chip tone="warn">Abnormal accumulation detected</Chip>}
        />
        <div className="px-4 py-4">
          <div className="flex items-end gap-6">
            <div>
              <p className="mb-2 section-label">30-day rolling delta (vs baseline)</p>
              <DeltaBars
                data={DEFENSE_CLUSTER_SPARK.map((v, i) => (v - 100) * 0.6)}
                width={560}
                height={56}
              />
              <div className="mt-1 flex gap-3">
                <span className="font-mono text-xs text-pos">positive = above-baseline activity</span>
                <span className="font-mono text-xs text-neg">negative = below-baseline</span>
              </div>
            </div>
            <div className="ml-auto shrink-0 space-y-2 text-right">
              <div>
                <div className="section-label">Composite Z</div>
                <div className="font-mono text-2xl font-semibold text-pos">+2.41</div>
              </div>
              <div>
                <div className="section-label">Cluster Members</div>
                <div className="font-mono text-lg text-ink">LMT · RTX · NOC</div>
              </div>
              <div>
                <div className="section-label">Window</div>
                <div className="font-mono text-sm text-muted">5 sessions · 3 disclosures</div>
              </div>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}
