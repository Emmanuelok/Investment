import { PageHeader, Panel, PanelHeader, Chip, KpiCard, Th, Td } from "@/components/ui/kit";
import { LiveStat, LiveDot } from "@/components/live/live-stat";
import { PAIN_POINTS, COMPETITOR_COSTS } from "@/lib/data";
import { fmtUsd } from "@/lib/format";
import { Shield, Sparkle, Lock, Book, Bolt, Check } from "@/components/icons";
import { Icon } from "@/components/icon-map";

export const metadata = { title: "Why PANTHEON" };

const PILLARS = [
  {
    icon: "eye",
    name: "Glass-box",
    tagline: "Inspect every number",
    desc: "Every factor weight, covariance estimate, backtest trade, and risk decomposition is fully traceable to the underlying data and methodology. No black boxes.",
    color: "text-accent",
    border: "border-accent/20",
    bg: "bg-accent/5",
  },
  {
    icon: "sparkle",
    name: "AI-native",
    tagline: "Grounded, never hallucinating",
    desc: "ATHENA cites every claim — filings, snapshots, prices — and refuses to fabricate. The first finance AI that earns trust by showing its work, not asserting confidence.",
    color: "text-ai",
    border: "border-ai/20",
    bg: "bg-ai/5",
  },
  {
    icon: "book",
    name: "One sovereign book",
    tagline: "All assets, one codebase",
    desc: "Equities, rates, FX, crypto, alternatives and alt-data unified in a single scriptable environment. One script reaches everything — no vendor silos, no CSV exports.",
    color: "text-pos",
    border: "border-pos/20",
    bg: "bg-pos/5",
  },
  {
    icon: "bolt",
    name: "Open & scriptable",
    tagline: "Your logic, your environment",
    desc: "Self-host in your own VPC. Python/TypeScript API throughout. Every workflow — signals, risk, compliance, execution — is automatable without asking a vendor for permission.",
    color: "text-warn",
    border: "border-warn/20",
    bg: "bg-warn/5",
  },
];

const UNIQUENESS = [
  { label: "Cited AI over your own data", body: "ATHENA grounds answers in your PIT lake and EDGAR corpus — not a generic chatbot. Competitors offer chatbots that hallucinate.", icon: "sparkle" },
  { label: "Point-in-time by default", body: "Every query, backtest, and risk run operates on the data that existed at a specific as_of date. Look-ahead bias is structurally impossible.", icon: "database" },
  { label: "Full-depth crypto L2/L3", body: "Real order book depth via free Binance/Coinbase websockets — 38ms latency. No synthetic reconstruction, no upcharge.", icon: "flow" },
  { label: "Cryptographic audit trail", body: "Every action — trade, risk-run, compliance breach — is appended to an immutable hash-chained log. Reproducibility is a property, not a promise.", icon: "shield" },
  { label: "Self-hostable for $0", body: "No per-seat fee, no vendor lock-in, no AUM basis points. Provision on your own cloud and keep every dollar of data spend for actual data.", icon: "lock" },
  { label: "Deflated Sharpe on every backtest", body: "Automatically computes DSR and PBO (CSCV) to catch overfitted strategies before they hit capital. No other platform does this by default.", icon: "gauge" },
];

// Max competitor cost for scaling the bar chart
const MAX_COST = Math.max(...COMPETITOR_COSTS.map((c) => c.cost));

// PANTHEON reference entry for the chart
const CHART_ENTRIES = [
  ...COMPETITOR_COSTS,
  { name: "PANTHEON (self-hosted)", cost: 0, unit: "/yr" },
];

export default function WhyPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        module={{ name: "PANTHEON · Why", tone: "accent" }}
        title="Why PANTHEON?"
        desc="One sovereign finance OS — institutional data, glass-box analytics, AI that cites its sources, and zero per-seat fees."
        right={
          <div className="flex items-center gap-2">
            <LiveDot />
            <Chip tone="pos" dot>14 / 15 sources live</Chip>
            <Chip tone="accent">Self-hosted · VPC</Chip>
          </div>
        }
      />

      {/* Hero stat row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          label="BLOOMBERG DELTA"
          value={<LiveStat value={31980} prefix="$" decimals={0} vol={0.003} />}
          sub="per seat per year — vs PANTHEON at $0 licensing"
          tone="neg"
          icon={<Icon name="coins" width={15} height={15} />}
        />
        <KpiCard
          label="FIGURES TRACEABLE"
          value={<LiveStat value={100} suffix="%" decimals={0} vol={0.006} />}
          sub="Glass-box — every number has a lineage"
          tone="pos"
          icon={<Check width={15} height={15} />}
        />
        <KpiCard
          label="PIT GUARANTEE"
          value="as_of ≤ t"
          sub="No look-ahead bias by construction"
          tone="accent"
          icon={<Icon name="database" width={15} height={15} />}
        />
        <KpiCard
          label="FABRICATED FIGURES"
          value={<LiveStat value={0} decimals={0} vol={0.01} />}
          sub="ATHENA cites or declines — never invents"
          tone="pos"
          icon={<Sparkle width={15} height={15} />}
        />
      </div>

      {/* Competitor cost bar chart */}
      <Panel>
        <PanelHeader
          title="Incumbent Licensing Costs vs PANTHEON"
          right={<Chip tone="accent">PANTHEON ≈ $0 self-hosted</Chip>}
        />
        <div className="space-y-3 px-4 py-4">
          {CHART_ENTRIES.map((entry) => {
            const isPantheon = entry.name.startsWith("PANTHEON");
            const pct = isPantheon ? 0.4 : (entry.cost / MAX_COST) * 100;
            const barColor = isPantheon ? "var(--pos)" : entry.cost > 100000 ? "var(--neg)" : entry.cost > 20000 ? "var(--warn)" : "var(--accent)";
            return (
              <div key={entry.name} className="flex items-center gap-3">
                <div className={`w-44 shrink-0 text-xs ${isPantheon ? "font-semibold text-pos" : "text-muted"}`}>
                  {entry.name}
                </div>
                <div className="flex flex-1 items-center gap-2">
                  <div className="relative h-5 flex-1 overflow-hidden rounded-sm bg-elevated/40">
                    <div
                      className="h-full rounded-sm transition-all"
                      style={{
                        width: `${pct}%`,
                        background: barColor,
                        opacity: isPantheon ? 0.9 : 0.65,
                        minWidth: isPantheon ? "2px" : undefined,
                        boxShadow: isPantheon ? `0 0 10px -2px ${barColor}` : undefined,
                      }}
                    />
                    {isPantheon && (
                      <div className="absolute left-2 top-0 flex h-full items-center">
                        <span className="font-mono text-[10px] font-bold text-pos">PANTHEON</span>
                      </div>
                    )}
                  </div>
                  <div className={`w-32 shrink-0 text-right font-mono text-xs ${isPantheon ? "text-pos font-semibold" : "text-muted"}`}>
                    {isPantheon ? "$0 / self-hosted" : `${fmtUsd(entry.cost, 0)} ${entry.unit}`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="border-t border-line px-4 py-2.5 text-xs text-dim">
          Incumbent prices per public pricing pages and industry estimates, 2024–2025. PANTHEON cost = hosting only (cloud provider or on-prem).
        </div>
      </Panel>

      {/* Four pillars */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {PILLARS.map((p) => (
          <Panel key={p.name} hover className={`border ${p.border}`}>
            <div className="p-4">
              <div className={`mb-3 grid h-9 w-9 place-items-center rounded border ${p.border} ${p.bg} ${p.color}`}>
                <Icon name={p.icon} width={16} height={16} />
              </div>
              <div className={`font-mono text-sm font-semibold ${p.color}`}>{p.name}</div>
              <div className="mt-0.5 text-xs font-medium text-muted">{p.tagline}</div>
              <p className="mt-2.5 text-xs leading-relaxed text-dim">{p.desc}</p>
            </div>
          </Panel>
        ))}
      </div>

      {/* Pain points grid */}
      <Panel>
        <PanelHeader
          title="Pain Points → PANTHEON Solutions"
          right={<Chip tone="accent">{PAIN_POINTS.length} problems solved</Chip>}
        />
        <div className="grid gap-px bg-line md:grid-cols-2">
          {PAIN_POINTS.map((p, i) => (
            <div key={i} className="bg-panel p-4 transition-colors hover:bg-elevated/30">
              <div className="mb-2 flex items-start justify-between gap-3">
                <p className="text-xs font-medium text-neg line-through decoration-neg/40">{p.pain}</p>
                <div className="shrink-0 text-right">
                  <div className="font-mono text-base font-bold text-ink">{p.stat}</div>
                  <div className="font-mono text-[9px] uppercase text-dim">{p.statLabel}</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Check width={13} height={13} className="mt-0.5 shrink-0 text-pos" />
                <p className="text-xs leading-relaxed text-muted">{p.fix}</p>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* What users can't find elsewhere */}
      <Panel>
        <PanelHeader
          title="What You Can't Find Anywhere Else"
          right={<Chip tone="ai">Unique to PANTHEON</Chip>}
        />
        <div className="grid gap-px bg-line md:grid-cols-2 xl:grid-cols-3">
          {UNIQUENESS.map((u) => (
            <div key={u.label} className="flex gap-3 bg-panel p-4 transition-colors hover:bg-elevated/30">
              <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded border border-accent/20 bg-accent/5 text-accent">
                <Icon name={u.icon} width={13} height={13} />
              </span>
              <div>
                <div className="font-mono text-xs font-semibold text-ink">{u.label}</div>
                <p className="mt-1 text-xs leading-relaxed text-dim">{u.body}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-line px-4 py-3">
          <p className="text-xs text-dim">
            PANTHEON is open-source infrastructure. Fork it, extend it, run it on your own cloud.{" "}
            <span className="font-mono text-accent">github.com/pantheon-finance</span>
          </p>
        </div>
      </Panel>
    </div>
  );
}
