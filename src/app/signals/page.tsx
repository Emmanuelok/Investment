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
import { ChevronRight, Sparkle, Route } from "@/components/icons";
import { LiveDot } from "@/components/live/live-stat";
import { AnomalyScanner } from "@/components/engine/anomaly-scanner";
import { TrendScanner } from "@/components/engine/trend-scanner";
import { CANDIDATES, FAMILY_COVERAGE } from "@/lib/data";
import { EXTRA_SIGNALS, SIGNAL_KPIS } from "@/lib/data/argus";
import { fmtSigned, fmtNum, signClass } from "@/lib/format";
import { cn } from "@/lib/cn";

export const metadata = { title: "ARGUS · Signal Feed" };

/* Merge CANDIDATES (from data.ts) and EXTRA_SIGNALS into one stream */
const ALL_SIGNALS = [
  ...CANDIDATES.map((c) => ({
    sym: c.sym,
    name: c.name,
    thesis: c.thesis,
    z: c.z,
    ic: c.ic,
    decay: c.decay,
    crowding: c.crowding,
    novelty: 0.5 + Math.abs(c.z) * 0.08, // derived approximation
    families: inferFamilies(c.thesis),
    spark: c.spark,
  })),
  ...EXTRA_SIGNALS,
].sort((a, b) => Math.abs(b.z) - Math.abs(a.z));

function inferFamilies(
  thesis: string
): Array<"Disclosure" | "NLP" | "Web" | "Consumer"> {
  const t = thesis.toLowerCase();
  const out: Array<"Disclosure" | "NLP" | "Web" | "Consumer"> = [];
  if (t.includes("insider") || t.includes("congressional") || t.includes("contract")) out.push("Disclosure");
  if (t.includes("nlp") || t.includes("sentiment") || t.includes("event") || t.includes("patent")) out.push("NLP");
  if (t.includes("hiring") || t.includes("web") || t.includes("app") || t.includes("search") || t.includes("traffic")) out.push("Web");
  if (t.includes("spend") || t.includes("foot-traffic") || t.includes("consumer") || t.includes("card") || t.includes("transaction")) out.push("Consumer");
  return out.length ? out : ["NLP"];
}

const FAMILY_TONE: Record<string, string> = {
  Disclosure: "chip-accent",
  NLP: "chip-ai",
  Web: "border-info/30 bg-info/10 text-info",
  Consumer: "chip-warn",
};

export default function SignalFeedPage() {
  const crowdTone = (c: string) =>
    c === "LOW" ? ("pos" as const) : c === "MED" ? ("warn" as const) : ("neg" as const);

  return (
    <div className="space-y-5">
      <PageHeader
        module={{ name: "ARGUS · Alt-Data & Signals", tone: "accent" }}
        title="Signal Feed"
        desc="Cross-family composite signals — point-in-time (as_of ≤ t), glass-box theses, novelty-scored, MNPI-clean."
        right={
          <div className="flex items-center gap-2">
            <LiveDot />
            <StatusDot tone="pos" pulse />
            <span className="font-mono text-xs text-dim">live · 47 signals active</span>
            <Link href="/signals/disclosures" className="btn">Disclosures</Link>
            <Link href="/signals/web" className="btn">Web</Link>
            <Link href="/signals/consumer" className="btn">Consumer</Link>
          </div>
        }
      />

      <AnomalyScanner />

      <TrendScanner />

      {/* KPI deck */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          label="Live Signals"
          value={String(SIGNAL_KPIS.liveSignals)}
          sub="8 families · 6 in beta"
          icon={<Icon name="bolt" width={15} height={15} />}
          tone="accent"
        />
        <KpiCard
          label="Families Active"
          value={String(SIGNAL_KPIS.families)}
          sub="Disclosure · NLP · Web · Consumer"
          icon={<Icon name="layers" width={15} height={15} />}
        />
        <KpiCard
          label="Avg IC 60D"
          value={fmtNum(SIGNAL_KPIS.avgIC, 3)}
          sub="information coefficient · equal-wt"
          icon={<Icon name="activity" width={15} height={15} />}
          tone="pos"
        />
        <KpiCard
          label="Novelty Index"
          value={fmtNum(SIGNAL_KPIS.noveltyIndex, 2)}
          sub="incremental vs 30D corpus (0–1)"
          icon={<Icon name="sparkle" width={15} height={15} />}
          tone="warn"
        />
      </div>

      {/* Family filter chips row */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="section-label mr-1">Filter family:</span>
        {(["All", "Disclosure", "NLP", "Web", "Consumer"] as const).map((f) => (
          <span
            key={f}
            className={cn(
              "chip cursor-pointer",
              f === "All" ? "chip-accent" : FAMILY_TONE[f] ?? ""
            )}
          >
            {f}
          </span>
        ))}
        <span className="ml-auto font-mono text-xs text-dim">
          Showing {ALL_SIGNALS.length} signals · sorted by |z|
        </span>
      </div>

      {/* Signal stream table */}
      <Panel>
        <PanelHeader
          title="Composite Signal Stream — All Families"
          sub="As-of 2025-06-06 09:30 ET · point-in-time snapshot · no look-ahead"
          right={<Chip tone="accent">Glass-box theses</Chip>}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] border-collapse">
            <thead>
              <tr>
                <Th>Entity</Th>
                <Th>Composite thesis</Th>
                <Th right>Z-score</Th>
                <Th right>IC 60D</Th>
                <Th right>Decay</Th>
                <Th right>Novelty</Th>
                <Th right>Crowding</Th>
                <Th right>30D</Th>
                <Th>Families</Th>
                <Th right>Trace</Th>
              </tr>
            </thead>
            <tbody>
              {ALL_SIGNALS.map((sig) => (
                <tr
                  key={sig.sym}
                  className="group transition-colors hover:bg-elevated/40"
                >
                  <Td mono={false}>
                    <Ticker sym={sig.sym} name={sig.name} />
                  </Td>
                  <Td mono={false} className="max-w-[360px] text-muted">
                    <span className="text-xs leading-snug">{sig.thesis}</span>
                  </Td>
                  <Td right className={cn("font-semibold", sig.z >= 0 ? "text-pos" : "text-neg")}>
                    {fmtSigned(sig.z)}
                  </Td>
                  <Td right className="text-muted">{sig.ic.toFixed(3)}</Td>
                  <Td right className="text-dim">{sig.decay}d</Td>
                  <Td right>
                    <span
                      className={cn(
                        "font-mono text-xs",
                        sig.novelty >= 0.7
                          ? "text-pos"
                          : sig.novelty >= 0.45
                          ? "text-warn"
                          : "text-dim"
                      )}
                    >
                      {fmtNum(sig.novelty, 2)}
                    </span>
                  </Td>
                  <Td right>
                    <Chip tone={crowdTone(sig.crowding)}>{sig.crowding}</Chip>
                  </Td>
                  <Td right>
                    <div className="flex justify-end">
                      <Sparkline data={sig.spark} width={88} height={26} />
                    </div>
                  </Td>
                  <Td mono={false}>
                    <div className="flex flex-wrap gap-1">
                      {sig.families.map((f) => (
                        <span key={f} className={cn("chip text-2xs", FAMILY_TONE[f] ?? "")}>
                          {f}
                        </span>
                      ))}
                    </div>
                  </Td>
                  <Td right>
                    <Link
                      href="/data-lake"
                      className="inline-flex items-center gap-1 font-mono text-xs text-accent hover:underline"
                    >
                      <Route width={12} height={12} /> lineage
                    </Link>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Bottom row: fusion explainer + family coverage */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Cross-signal fusion explainer */}
        <Panel glow>
          <PanelHeader
            title="Cross-Signal Fusion — How One Z Emerges"
            right={<Chip tone="ai"><Sparkle width={11} height={11} /> ARGUS engine</Chip>}
          />
          <div className="space-y-0 divide-y divide-line">
            {[
              {
                step: "01",
                title: "Per-family raw signals",
                body: "Each family (Disclosure, NLP, Web, Consumer) produces its own point-in-time z-score for an entity. Scores are capped at as_of ≤ t — nothing back-filled or revised.",
              },
              {
                step: "02",
                title: "Orthogonality test",
                body: "Pairwise correlation between family signals is computed over trailing 120D. Only families with |ρ| < 0.35 are treated as independent; correlated families are collapsed to avoid double-counting.",
              },
              {
                step: "03",
                title: "IC-weighted fusion",
                body: "Independent family z-scores are blended by their 60D information coefficient. Higher IC families get proportionally more weight. The combined z is re-normalized to unit variance.",
              },
              {
                step: "04",
                title: "Novelty & decay adjustment",
                body: "A novelty score (incremental vs trailing 30D corpus) boosts signals that carry genuinely new information. Decay half-life discounts signals as the edge dissolves.",
              },
              {
                step: "05",
                title: "Crowding overlay",
                body: "Crowding (LOW / MED / HIGH) is estimated from hedge-fund 13F overlap and short-interest benchmarks. HIGH-crowding signals are flagged but not suppressed — the analyst decides.",
              },
              {
                step: "06",
                title: "MNPI quarantine gate",
                body: "Any event touching a material non-public information flag is routed to the compliance quarantine queue and never surfaces in the live stream until cleared by the policy engine.",
              },
            ].map(({ step, title, body }) => (
              <div key={step} className="flex gap-4 px-4 py-3.5">
                <span className="mt-0.5 shrink-0 font-mono text-xs text-accent">{step}</span>
                <div>
                  <p className="text-sm font-medium text-ink">{title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted">{body}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-line px-4 py-2.5">
            <Link
              href="/data-lake"
              className="flex items-center justify-between text-xs text-dim hover:text-muted"
            >
              <span>Full lineage and derivation notebooks in DATA LAKE</span>
              <ChevronRight width={14} height={14} />
            </Link>
          </div>
        </Panel>

        {/* Family coverage + metadata */}
        <div className="space-y-4">
          <Panel>
            <PanelHeader title="Signal-Family Coverage" />
            <div className="space-y-3.5 px-4 py-4">
              {FAMILY_COVERAGE.map((f) => (
                <div key={f.label} className="flex items-center gap-3">
                  <span className="w-36 shrink-0 text-sm text-muted">{f.label}</span>
                  <ProgressBar value={f.pct} color={f.color} className="flex-1" height={7} />
                  <span className="w-10 shrink-0 text-right font-mono text-xs text-muted">
                    {f.pct}%
                  </span>
                </div>
              ))}
            </div>
            <div className="flex items-start gap-2 border-t border-line px-4 py-3 text-xs text-dim">
              <Icon name="lock" width={14} height={14} className="mt-0.5 shrink-0 text-faint" />
              <span>
                Licensed panel (card/transaction) is INACTIVE at 0% coverage — running on free
                demand proxies (search/app/web) until a YipitData license is provisioned.
              </span>
            </div>
          </Panel>

          <Panel>
            <PanelHeader
              title="Point-in-Time Guarantees"
              right={<Chip tone="info">PIT enforced</Chip>}
            />
            <div className="space-y-0 divide-y divide-line">
              {[
                { label: "as_of constraint", value: "as_of ≤ t", sub: "all signals respect this bound" },
                { label: "archive depth", value: "38.4 TB", sub: "append-only, never back-filled" },
                { label: "revision control", value: "immutable", sub: "re-stated filings versioned separately" },
                { label: "lookahead leaks", value: "0 detected", sub: "CI scans every pipeline" },
                { label: "MNPI quarantine", value: "2 items", sub: "held pending compliance clearance" },
              ].map(({ label, value, sub }) => (
                <div key={label} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-xs text-muted">{label}</span>
                  <div className="text-right">
                    <span className="font-mono text-xs text-ink">{value}</span>
                    <span className="ml-2 font-mono text-2xs text-dim">{sub}</span>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
