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
import { Sparkline, ProgressBar } from "@/components/ui/viz";
import { Icon } from "@/components/icon-map";
import { ChevronRight } from "@/components/icons";
import { CONSUMER_PROXIES } from "@/lib/data/argus";
import { fmtSignedPct, signClass } from "@/lib/format";
import { cn } from "@/lib/cn";

export const metadata = { title: "ARGUS · Consumer Proxies" };

const TREND_TONE: Record<string, "pos" | "warn" | "neg"> = {
  UP: "pos",
  FLAT: "warn",
  DOWN: "neg",
};

const upCount = CONSUMER_PROXIES.filter((p) => p.trend === "UP").length;
const downCount = CONSUMER_PROXIES.filter((p) => p.trend === "DOWN").length;
const flatCount = CONSUMER_PROXIES.filter((p) => p.trend === "FLAT").length;
const avgNowcast =
  CONSUMER_PROXIES.reduce((s, p) => s + p.nowcast, 0) / CONSUMER_PROXIES.length;

export default function ConsumerProxiesPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        module={{ name: "ARGUS · Alt-Data & Signals", tone: "accent" }}
        title="Consumer Proxies — Yipit Family"
        desc="Card-spend proxies, transaction nowcasts, and foot-traffic — derived from search, app, and web signals. Licensed panel INACTIVE."
        right={
          <div className="flex items-center gap-2">
            <StatusDot tone="warn" />
            <span className="font-mono text-xs text-warn">Panel INACTIVE · free proxies only</span>
            <Link href="/signals" className="btn">
              ← All Signals
            </Link>
          </div>
        }
      />

      {/* INACTIVE license banner — prominent honest note */}
      <Panel className="border border-warn/30 bg-warn/5">
        <div className="flex flex-wrap items-start gap-4 px-4 py-4">
          <div className="flex shrink-0 items-center gap-2.5">
            <Icon name="lock" width={20} height={20} className="text-warn" />
            <div>
              <div className="font-medium text-warn">Licensed Transaction Panel — INACTIVE (0% coverage)</div>
              <div className="mt-0.5 text-xs text-muted">
                YipitData card/transaction panel not provisioned. This view runs entirely on
                free demand proxies: Google Trends search interest, App Store / Play Store
                rank changes, and web-traffic estimates. These are correlated with but not
                equivalent to actual card-spend data.
              </div>
            </div>
          </div>
          <div className="ml-auto shrink-0 flex items-center gap-2">
            <Link
              href="/sources"
              className="btn btn-accent"
            >
              <Icon name="plug" width={14} height={14} />
              License Manager
            </Link>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 border-t border-warn/20 px-4 py-3 text-xs text-muted">
          {[
            { label: "Panel coverage", value: "0%", neg: true },
            { label: "Free proxy coverage", value: "88%", neg: false },
            { label: "Estimated IC degradation", value: "~35%", neg: true },
            { label: "Estimated signal decay acceleration", value: "+2–4 days", neg: true },
            { label: "Provisioning lead time", value: "~5 business days", neg: false },
          ].map(({ label, value, neg }) => (
            <div key={label}>
              <div className="section-label">{label}</div>
              <div className={cn("font-mono text-sm", neg ? "text-warn" : "text-muted")}>
                {value}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* KPI deck */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          label="Tracked Entities"
          value={String(CONSUMER_PROXIES.length)}
          sub="consumer proxy coverage"
          icon={<Icon name="target" width={15} height={15} />}
          tone="accent"
        />
        <KpiCard
          label="Trend UP"
          value={String(upCount)}
          sub="accelerating demand proxies"
          icon={<Icon name="activity" width={15} height={15} />}
          tone="pos"
        />
        <KpiCard
          label="Trend DOWN"
          value={String(downCount)}
          sub="decelerating demand proxies"
          icon={<Icon name="gauge" width={15} height={15} />}
          tone="neg"
        />
        <KpiCard
          label="Avg Nowcast SSS"
          value={fmtSignedPct(avgNowcast, 1)}
          sub="proxy-estimated same-store-sales YoY"
          icon={<Icon name="pulse" width={15} height={15} />}
          tone={avgNowcast >= 0 ? "pos" : "neg"}
        />
      </div>

      {/* Consumer proxy card grid */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {CONSUMER_PROXIES.map((p) => (
          <Panel key={p.sym} hover>
            <div className="px-4 py-3.5 space-y-3">
              {/* Header row */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Ticker sym={p.sym} name={p.name} />
                  <span className="mt-1 block font-mono text-2xs text-dim">{p.category}</span>
                </div>
                <Chip tone={TREND_TONE[p.trend]}>{p.trend}</Chip>
              </div>

              {/* Spend sparkline (proxy) */}
              <div>
                <span className="section-label">Spend Proxy (free)</span>
                <Sparkline
                  data={p.spendSpark}
                  width={220}
                  height={38}
                  className="mt-1"
                />
              </div>

              {/* Key metrics grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="section-label">Search YoY</div>
                  <div className={cn("font-mono", signClass(p.searchYoY))}>
                    {fmtSignedPct(p.searchYoY, 1)}
                  </div>
                </div>
                <div>
                  <div className="section-label">App Rank Δ</div>
                  <div className={cn("font-mono", p.appRankYoY > 0 ? "text-pos" : p.appRankYoY < 0 ? "text-neg" : "text-muted")}>
                    {p.appRankYoY > 0 ? `+${p.appRankYoY}` : String(p.appRankYoY)}% YoY
                  </div>
                </div>
                <div>
                  <div className="section-label">Foot Traffic YoY</div>
                  <div className={cn("font-mono", signClass(p.footTrafficYoY))}>
                    {fmtSignedPct(p.footTrafficYoY, 1)}
                  </div>
                </div>
                <div>
                  <div className="section-label">Proxy SSS Nowcast</div>
                  <div className={cn("font-mono font-semibold", signClass(p.nowcast))}>
                    {fmtSignedPct(p.nowcast, 1)}
                  </div>
                </div>
              </div>

              {/* Proxy coverage bar */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="section-label">Proxy confidence</span>
                  <span className="font-mono text-2xs text-dim">
                    {p.trend === "UP" ? "78%" : p.trend === "FLAT" ? "61%" : "72%"}
                  </span>
                </div>
                <ProgressBar
                  value={p.trend === "UP" ? 78 : p.trend === "FLAT" ? 61 : 72}
                  max={100}
                  color={TREND_TONE[p.trend] === "pos" ? "var(--pos)" : TREND_TONE[p.trend] === "neg" ? "var(--neg)" : "var(--warn)"}
                  height={5}
                />
              </div>
            </div>
          </Panel>
        ))}
      </div>

      {/* Detail table */}
      <Panel>
        <PanelHeader
          title="Consumer Proxy Detail Table"
          sub="All metrics are free-proxy estimates. Card/transaction column shows 0 — panel license not provisioned."
          right={<Chip tone="warn">Panel INACTIVE</Chip>}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] border-collapse">
            <thead>
              <tr>
                <Th>Entity</Th>
                <Th>Category</Th>
                <Th right>Search Idx</Th>
                <Th right>Search YoY</Th>
                <Th right>Search 16W</Th>
                <Th right>Foot Traffic YoY</Th>
                <Th right>Traffic 16W</Th>
                <Th right>Spend Proxy</Th>
                <Th right>Spend YoY</Th>
                <Th right>Card Panel</Th>
                <Th right>SSS Nowcast</Th>
                <Th>Trend</Th>
              </tr>
            </thead>
            <tbody>
              {CONSUMER_PROXIES.map((p) => (
                <tr key={p.sym} className="group transition-colors hover:bg-elevated/40">
                  <Td mono={false}>
                    <Ticker sym={p.sym} name={p.name} />
                  </Td>
                  <Td mono={false} className="text-xs text-dim">
                    {p.category}
                  </Td>
                  <Td right className="text-muted">
                    {p.searchIndex}
                  </Td>
                  <Td right className={signClass(p.searchYoY)}>
                    {fmtSignedPct(p.searchYoY, 1)}
                  </Td>
                  <Td right>
                    <Sparkline data={p.searchSpark} width={64} height={20} />
                  </Td>
                  <Td right className={signClass(p.footTrafficYoY)}>
                    {fmtSignedPct(p.footTrafficYoY, 1)}
                  </Td>
                  <Td right>
                    <Sparkline data={p.trafficSpark} width={64} height={20} />
                  </Td>
                  <Td right className="text-muted">
                    {p.spendProxy}
                  </Td>
                  <Td right className={signClass(p.spendYoY)}>
                    {fmtSignedPct(p.spendYoY, 1)}
                  </Td>
                  <Td right>
                    <span className="font-mono text-xs text-faint line-through">N/A</span>
                  </Td>
                  <Td right className={cn("font-semibold", signClass(p.nowcast))}>
                    {fmtSignedPct(p.nowcast, 1)}
                  </Td>
                  <Td>
                    <Chip tone={TREND_TONE[p.trend]}>{p.trend}</Chip>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Spotlight: TGT rollover + cross-family note */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHeader
            title="TGT — Spend Proxy Rollover Detail"
            right={<Chip tone="neg">DOWN · z=–1.36</Chip>}
          />
          <div className="px-4 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <Ticker sym="TGT" name="Target Corp" />
              <span className="font-mono text-sm font-semibold text-neg">–3.6% spend proxy</span>
            </div>
            <Sparkline
              data={CONSUMER_PROXIES.find((p) => p.sym === "TGT")!.spendSpark}
              width={360}
              height={48}
            />
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <div className="section-label">Search YoY</div>
                <div className="font-mono text-neg">–4.2%</div>
              </div>
              <div>
                <div className="section-label">Foot Traffic YoY</div>
                <div className="font-mono text-neg">–2.8%</div>
              </div>
              <div>
                <div className="section-label">SSS Nowcast</div>
                <div className="font-mono font-semibold text-neg">–2.1%</div>
              </div>
              <div>
                <div className="section-label">App Rank YoY</div>
                <div className="font-mono text-neg">–3.1%</div>
              </div>
              <div>
                <div className="section-label">Card Panel</div>
                <div className="font-mono text-faint line-through">INACTIVE</div>
              </div>
              <div>
                <div className="section-label">Proxy Confidence</div>
                <div className="font-mono text-warn">72%</div>
              </div>
            </div>
            <p className="text-xs leading-relaxed text-muted">
              All free proxies aligning bearish simultaneously — search, foot-traffic, and app
              engagement all deteriorating on a YoY basis. Consistent with the composite thesis
              (z = –1.36, decay 9d). Note: with a licensed card panel, SSS estimate confidence
              would improve from ~72% to ~91% based on typical IC uplift from transaction data.
            </p>
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            title="CMG — Positive Demand Proxy"
            right={<Chip tone="pos">UP · z=+1.31</Chip>}
          />
          <div className="px-4 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <Ticker sym="CMG" name="Chipotle Mexican Grill" />
              <span className="font-mono text-sm font-semibold text-pos">+7.2% spend proxy</span>
            </div>
            <Sparkline
              data={CONSUMER_PROXIES.find((p) => p.sym === "CMG")!.spendSpark}
              width={360}
              height={48}
            />
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <div className="section-label">Search YoY</div>
                <div className="font-mono text-pos">+6.4%</div>
              </div>
              <div>
                <div className="section-label">Foot Traffic YoY</div>
                <div className="font-mono text-pos">+4.1%</div>
              </div>
              <div>
                <div className="section-label">SSS Nowcast</div>
                <div className="font-mono font-semibold text-pos">+5.8%</div>
              </div>
              <div>
                <div className="section-label">App Rank YoY</div>
                <div className="font-mono text-pos">+4.2%</div>
              </div>
              <div>
                <div className="section-label">Card Panel</div>
                <div className="font-mono text-faint line-through">INACTIVE</div>
              </div>
              <div>
                <div className="section-label">Proxy Confidence</div>
                <div className="font-mono text-pos">78%</div>
              </div>
            </div>
            <p className="text-xs leading-relaxed text-muted">
              App-store review velocity rising, foot-traffic up week-over-week. No offsetting
              disclosure or NLP signal. Demand proxy confidence 78% — licensing a card panel would
              add transaction-level validation and likely improve IC.
            </p>
          </div>
        </Panel>
      </div>

      {/* Family coverage: consumer family position */}
      <Panel>
        <PanelHeader
          title="Consumer Signal Family — Data Source Matrix"
          right={
            <Link href="/sources" className="inline-flex items-center gap-1 text-xs text-accent hover:underline">
              License Manager <ChevronRight width={13} height={13} />
            </Link>
          }
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 px-4 py-4">
          {[
            {
              name: "Search Interest",
              source: "Google Trends",
              coverage: 100,
              status: "active" as const,
              note: "Free · normalized 0–100 · 7-day lag",
              color: "var(--pos)",
            },
            {
              name: "App Store Rank",
              source: "App Store / Play Store",
              coverage: 88,
              status: "active" as const,
              note: "Free scrape · iOS + Android · 1-day lag",
              color: "var(--pos)",
            },
            {
              name: "Web Traffic",
              source: "SimilarWeb (est.)",
              coverage: 73,
              status: "active" as const,
              note: "Free tier · monthly estimates",
              color: "var(--warn)",
            },
            {
              name: "Card/Transaction Panel",
              source: "YipitData",
              coverage: 0,
              status: "inactive" as const,
              note: "License NOT provisioned · ~$2,500/mo",
              color: "var(--neg)",
            },
          ].map((src) => (
            <div
              key={src.name}
              className={cn(
                "rounded border p-3 space-y-2",
                src.status === "inactive"
                  ? "border-neg/20 bg-neg/5"
                  : "border-line bg-elevated/30"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-ink">{src.name}</span>
                <Chip tone={src.status === "inactive" ? "neg" : "pos"}>
                  {src.status === "inactive" ? "INACTIVE" : "ACTIVE"}
                </Chip>
              </div>
              <div className="section-label">{src.source}</div>
              <div className="flex items-center gap-2">
                <ProgressBar value={src.coverage} color={src.color} height={6} className="flex-1" />
                <span className="shrink-0 font-mono text-xs text-muted">{src.coverage}%</span>
              </div>
              <p className="text-xs text-dim">{src.note}</p>
              {src.status === "inactive" && (
                <Link
                  href="/sources"
                  className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
                >
                  <Icon name="lock" width={12} height={12} />
                  Provision license
                </Link>
              )}
            </div>
          ))}
        </div>
        <div className="flex items-start gap-2 border-t border-line px-4 py-3 text-xs text-dim">
          <Icon name="shield" width={13} height={13} className="mt-0.5 shrink-0 text-warn" />
          <span>
            All estimates labelled DEMO DATA. Consumer proxy signals have lower IC than licensed
            card-panel equivalents — typically 35% lower information coefficient and 2–4 days faster
            decay half-life. Activate a YipitData or Bloomberg Second Measure license in the{" "}
            <Link href="/sources" className="text-accent hover:underline">
              License Manager
            </Link>{" "}
            to enable the full Panel family.
          </span>
        </div>
      </Panel>
    </div>
  );
}
