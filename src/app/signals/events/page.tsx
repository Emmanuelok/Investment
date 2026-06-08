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
import { Sparkline, DeltaBars, ProgressBar, MiniBars } from "@/components/ui/viz";
import { Icon } from "@/components/icon-map";
import { ChevronRight, Sparkle, Route, Brain } from "@/components/icons";
import {
  CLASSIFIED_EVENTS,
  EVENT_KPI,
  EVENT_TAXONOMY,
  ENTITY_LINKS,
  ENTITY_SENTIMENT_SPARKS,
  type EventType,
} from "@/lib/data/argus2";
import { fmtInt, fmtCompact, fmtNum, fmtPct } from "@/lib/format";
import { cn } from "@/lib/cn";

export const metadata = { title: "ARGUS · NLP Event-Detection Engine" };

const EVENT_TYPE_TONE: Record<EventType, string> = {
  earnings:         "chip-pos",
  guidance:         "chip-accent",
  "M&A":            "chip-ai",
  "mgmt-change":    "chip-warn",
  "legal-regulatory": "chip-neg",
  product:          "border-info/30 bg-info/10 text-info",
  partnership:      "border-info/30 bg-info/10 text-info",
  layoffs:          "chip-neg",
  buyback:          "chip-pos",
  "rating-change":  "chip-warn",
  "supply-chain":   "chip-accent",
  macro:            "",
};

const EVENT_TYPE_LABEL: Record<EventType, string> = {
  earnings:          "EARNINGS",
  guidance:          "GUIDANCE",
  "M&A":             "M&A",
  "mgmt-change":     "MGMT",
  "legal-regulatory":"LEGAL/REG",
  product:           "PRODUCT",
  partnership:       "PARTNER",
  layoffs:           "LAYOFFS",
  buyback:           "BUYBACK",
  "rating-change":   "RATING",
  "supply-chain":    "SUPPLY-CHAIN",
  macro:             "MACRO",
};

/* Derived: event-intensity delta bars for taxonomy (count deltas vs baseline) */
const TAXONOMY_DELTAS = EVENT_TAXONOMY.map((t, i) => (i % 2 === 0 ? t.pct * 0.4 : -t.pct * 0.18));

export default function EventsPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        module={{ name: "ARGUS · Alt-Data & Signals", tone: "accent" }}
        title="NLP / Event-Detection Engine"
        desc="RavenPack-class: every document classified, entity-linked, scored for relevance & novelty. Cheap spaCy/embedding pre-filter saves 84% of LLM calls. Every output cites its source document."
        right={
          <div className="flex items-center gap-2">
            <StatusDot tone="pos" pulse />
            <span className="font-mono text-xs text-dim">live · real-time ingestion</span>
            <Link href="/signals/ingestion" className="btn">Ingestion</Link>
            <Link href="/signals" className="btn">← Signals</Link>
          </div>
        }
      />

      {/* KPI deck */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <KpiCard
          label="Docs Processed / 24h"
          value={fmtCompact(EVENT_KPI.docsProcessed24h)}
          sub="articles · filings · press releases"
          icon={<Icon name="doc" width={15} height={15} />}
          tone="accent"
        />
        <KpiCard
          label="Entities Linked"
          value={fmtCompact(EVENT_KPI.entitiesLinked)}
          sub="securities resolved · PIT-mapped"
          icon={<Icon name="route" width={15} height={15} />}
        />
        <KpiCard
          label="Events Classified"
          value={fmtCompact(EVENT_KPI.eventsClassified)}
          sub="12 taxonomy types · extensible"
          icon={<Icon name="layers" width={15} height={15} />}
          tone="pos"
        />
        <KpiCard
          label="Avg Novelty Score"
          value={fmtNum(EVENT_KPI.avgNovelty, 2)}
          sub="incremental vs 30D corpus"
          icon={<Icon name="sparkle" width={15} height={15} />}
          tone="warn"
        />
        <KpiCard
          label="LLM Calls Saved"
          value={`${fmtNum(EVENT_KPI.pctLlmCallsSaved, 1)}%`}
          sub="spaCy/embed pre-filter → LLM only when needed"
          icon={<Icon name="brain" width={15} height={15} />}
          tone="ai"
        />
      </div>

      {/* Classified event stream */}
      <Panel>
        <PanelHeader
          title="Live Classified-Event Stream"
          sub="As-of 2025-06-06 09:45 ET · point-in-time · every row cites source document · content_hash stored"
          right={<Chip tone="accent">Glass-box · source-cited</Chip>}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border-collapse">
            <thead>
              <tr>
                <Th>Timestamp</Th>
                <Th>Headline + Source</Th>
                <Th>Entity</Th>
                <Th>Event Type</Th>
                <Th right>Sentiment</Th>
                <Th right>Relevance</Th>
                <Th right>Novelty</Th>
                <Th right>Trace</Th>
              </tr>
            </thead>
            <tbody>
              {CLASSIFIED_EVENTS.map((ev, i) => {
                const sentTone = ev.sentiment === "pos" ? "text-pos" : ev.sentiment === "neg" ? "text-neg" : "text-muted";
                const sentLabel = ev.sentiment === "pos" ? "▲ POS" : ev.sentiment === "neg" ? "▼ NEG" : "— NEU";
                return (
                  <tr key={i} className="group transition-colors hover:bg-elevated/40">
                    <Td className="whitespace-nowrap text-dim">{ev.timestamp}</Td>
                    <Td mono={false} className="max-w-[340px]">
                      <div className="text-sm font-medium text-ink leading-snug">{ev.headline}</div>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <span className="font-mono text-2xs text-faint">{ev.source}</span>
                        <span className="font-mono text-2xs text-faint">·</span>
                        <span className="font-mono text-2xs text-faint">hash:{ev.contentHash.slice(-8)}</span>
                      </div>
                    </Td>
                    <Td mono={false}>
                      <Ticker sym={ev.ticker} name={ev.name} />
                    </Td>
                    <Td mono={false}>
                      <span className={cn("chip text-2xs", EVENT_TYPE_TONE[ev.eventType])}>
                        {EVENT_TYPE_LABEL[ev.eventType]}
                      </span>
                    </Td>
                    <Td right>
                      <div className="flex flex-col items-end gap-1">
                        <span className={cn("font-mono text-xs font-medium", sentTone)}>{sentLabel}</span>
                        <div
                          className="h-1.5 rounded-full"
                          style={{
                            width: `${Math.round(ev.sentimentMag * 48)}px`,
                            background: ev.sentiment === "pos" ? "var(--pos)" : ev.sentiment === "neg" ? "var(--neg)" : "var(--dim)",
                            opacity: 0.8,
                          }}
                        />
                      </div>
                    </Td>
                    <Td right>
                      <div className="flex items-center justify-end gap-1.5">
                        <div className="h-1.5 w-12 overflow-hidden rounded-full bg-line">
                          <div
                            className="h-full rounded-full bg-accent"
                            style={{ width: `${ev.relevance}%`, opacity: 0.8 }}
                          />
                        </div>
                        <span className="font-mono text-xs text-muted">{ev.relevance}%</span>
                      </div>
                    </Td>
                    <Td right>
                      <span
                        className={cn(
                          "font-mono text-xs font-medium",
                          ev.novelty >= 0.7 ? "text-pos" : ev.novelty >= 0.45 ? "text-warn" : "text-dim"
                        )}
                      >
                        {fmtNum(ev.novelty, 2)}
                      </span>
                    </Td>
                    <Td right>
                      <a
                        href={ev.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-mono text-xs text-accent hover:underline"
                      >
                        <Route width={12} height={12} /> source
                      </a>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="border-t border-line px-4 py-2.5">
          <div className="flex items-center justify-between text-xs text-dim">
            <span>
              Every event record stores: <span className="font-mono text-faint">source · fetched_at · as_of · content_hash</span> — immutable, never back-filled.
            </span>
            <Link href="/data-lake" className="flex items-center gap-1 text-accent hover:underline">
              full archive <ChevronRight width={13} height={13} />
            </Link>
          </div>
        </div>
      </Panel>

      {/* Taxonomy + Entity Linking row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Event Taxonomy panel */}
        <Panel>
          <PanelHeader
            title="Event Taxonomy — 24h Distribution"
            sub="12 top-level types · extensible toward thousands of subtypes via hierarchical classifier"
            right={<Chip tone="ai"><Sparkle width={11} height={11} /> 12 types · extensible</Chip>}
          />
          <div className="space-y-0 divide-y divide-line">
            {EVENT_TAXONOMY.map((t) => (
              <div key={t.eventType} className="flex items-center gap-3 px-4 py-2.5">
                <span className={cn("chip text-2xs shrink-0 w-28", EVENT_TYPE_TONE[t.eventType])}>
                  {EVENT_TYPE_LABEL[t.eventType]}
                </span>
                <ProgressBar
                  value={t.pct}
                  max={20}
                  color={t.color}
                  className="flex-1"
                  height={6}
                />
                <span className="w-14 shrink-0 text-right font-mono text-xs text-muted">
                  {fmtInt(t.count24h)}
                </span>
                <span className="w-10 shrink-0 text-right font-mono text-2xs text-dim">
                  {fmtNum(t.pct, 1)}%
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-line px-4 py-3">
            <div className="flex items-start gap-2 text-xs text-dim">
              <Icon name="layers" width={13} height={13} className="mt-0.5 shrink-0 text-faint" />
              <span>
                12 top-level taxonomy types are further decomposed into subtypes (e.g. earnings → beat/miss/inline; M&A → acquisition/merger/divestiture). The classifier is extensible via prompt-tuning without full retraining.
              </span>
            </div>
          </div>
        </Panel>

        {/* Entity Linking panel */}
        <Panel>
          <PanelHeader
            title="Entity-Linking — Document → Security"
            sub="Confidence-weighted · PIT ticker-change mapping · ambiguity resolution"
            right={<Chip tone="info">PIT-mapped</Chip>}
          />
          <div className="space-y-0 divide-y divide-line">
            {ENTITY_LINKS.map((el, i) => (
              <div key={i} className="px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-dim italic truncate max-w-[280px]">
                    &ldquo;{el.docFragment}&rdquo;
                  </span>
                  <Ticker sym={el.linkedTicker} name={el.linkedName} />
                </div>
                <div className="mt-1.5 flex items-center gap-3">
                  <span className="font-mono text-2xs text-faint">mention: <span className="text-muted">{el.rawMention}</span></span>
                  <div className="flex items-center gap-1">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-line">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${el.confidence}%`, opacity: 0.85 }} />
                    </div>
                    <span className={cn("font-mono text-2xs", el.confidence >= 90 ? "text-pos" : el.confidence >= 75 ? "text-warn" : "text-neg")}>
                      {el.confidence}%
                    </span>
                  </div>
                </div>
                <div className="mt-1 text-2xs text-dim leading-relaxed">{el.pitNote}</div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* Relevance & Novelty explainer */}
      <Panel glow>
        <PanelHeader
          title="Relevance & Novelty — How Scores Are Computed"
          right={<Chip tone="ai"><Sparkle width={11} height={11} /> embedding-based</Chip>}
        />
        <div className="grid gap-0 divide-y divide-line md:grid-cols-2 md:divide-x md:divide-y-0">
          <div className="space-y-3.5 p-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 shrink-0 font-mono text-xs text-accent">REL</span>
              <div>
                <p className="text-sm font-medium text-ink">Relevance — Is this about the entity?</p>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  Cosine similarity between the document embedding and the entity&rsquo;s reference embedding (built from its filings, descriptions, and sector context). A score of 0.90+ means the document primarily discusses the target entity. Relevance filters noise — a macro article mentioning NVDA once scores low, not high.
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-3 rounded border border-line bg-elevated/40 px-3 py-2.5">
              <span className="font-mono text-xs text-dim">Example: CPI release mentioning &ldquo;chip demand&rdquo;</span>
              <div className="ml-auto shrink-0">
                <span className="chip chip-warn text-xs">72% relevance to SPY</span>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded border border-line bg-elevated/40 px-3 py-2.5">
              <span className="font-mono text-xs text-dim">Example: NVDA supply-chain deal article</span>
              <div className="ml-auto shrink-0">
                <span className="chip chip-pos text-xs">96% relevance to NVDA</span>
              </div>
            </div>
          </div>
          <div className="space-y-3.5 p-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 shrink-0 font-mono text-xs text-accent">NOV</span>
              <div>
                <p className="text-sm font-medium text-ink">Novelty — Is this already priced?</p>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  Minimum cosine distance between the new document and the trailing-30D corpus (entity-filtered). High novelty (≥0.7) means the content carries information not yet in the processed stream — a genuine signal increment. Low novelty (&lt;0.35) means the market has likely seen this narrative. Novelty is the single most important score for controlling signal decay.
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-3 rounded border border-line bg-elevated/40 px-3 py-2.5">
              <span className="font-mono text-xs text-dim">10th restatement of same earnings beat</span>
              <div className="ml-auto shrink-0">
                <span className="chip text-xs">0.19 novelty</span>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded border border-line bg-elevated/40 px-3 py-2.5">
              <span className="font-mono text-xs text-dim">First report of unannounced supply deal</span>
              <div className="ml-auto shrink-0">
                <span className="chip chip-pos text-xs">0.83 novelty</span>
              </div>
            </div>
          </div>
        </div>
        <div className="border-t border-line px-4 py-3">
          <div className="flex items-start gap-2 text-xs text-dim">
            <Icon name="cpu" width={13} height={13} className="mt-0.5 shrink-0 text-faint" />
            <span>
              <strong className="text-muted">Cost discipline:</strong> A cheap spaCy NER + embedding similarity pre-filter routes 84% of documents away from the LLM. Only high-relevance, candidate-novel documents hit the LLM classifier. The LLM output cites the source document — every classification is traceable.
            </span>
          </div>
        </div>
      </Panel>

      {/* Per-entity rolling sentiment */}
      <Panel>
        <PanelHeader
          title="Per-Entity Rolling Sentiment / Event Intensity (30D)"
          sub="Smoothed net-sentiment score · trailing corpus · normalized 0–1 · point-in-time"
          right={<Chip tone="accent">30D rolling</Chip>}
        />
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(ENTITY_SENTIMENT_SPARKS).map(([sym, spark]) => {
            const last = spark[spark.length - 1];
            const first = spark[0];
            const up = last >= first;
            return (
              <div
                key={sym}
                className="flex flex-col gap-2 rounded border border-line bg-elevated/30 p-3"
              >
                <div className="flex items-center justify-between">
                  <Ticker sym={sym} />
                  <span className={cn("font-mono text-sm font-semibold", up ? "text-pos" : "text-neg")}>
                    {up ? "▲" : "▼"} {fmtNum(last, 2)}
                  </span>
                </div>
                <Sparkline data={spark} width={200} height={36} />
                <div className="flex items-center justify-between text-2xs text-faint">
                  <span>30D low: {fmtNum(Math.min(...spark), 2)}</span>
                  <span>30D high: {fmtNum(Math.max(...spark), 2)}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="border-t border-line px-4 py-2.5">
          <div className="flex items-start gap-2 text-xs text-dim">
            <Icon name="activity" width={13} height={13} className="mt-0.5 shrink-0 text-faint" />
            <span>
              Sentiment scored 0–1 (0 = fully negative, 0.5 = neutral, 1 = fully positive). Rolling 30D window using exponential decay. Aggregated from all classified events for the entity in the trailing window.
            </span>
          </div>
        </div>
      </Panel>

      {/* LLM cost-control callout */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHeader
            title="Two-Stage Pipeline — Cost Control Architecture"
            right={<Chip tone="ai"><Brain width={11} height={11} /> hybrid NLP</Chip>}
          />
          <div className="space-y-0 divide-y divide-line">
            {[
              {
                stage: "01",
                label: "Ingest & Dedup",
                tone: "text-accent",
                body: "Raw documents arrive from all sources. Content-hash dedup drops 18% of documents immediately (seen before). Remaining docs enter the pre-filter.",
              },
              {
                stage: "02",
                label: "Cheap Pre-Filter (spaCy + Embeddings)",
                tone: "text-accent",
                body: "spaCy NER extracts named entities in ~2ms/doc. Embedding similarity (cosine) checks relevance against entity profiles. 84% of documents are classified cheaply here and never touch the LLM.",
              },
              {
                stage: "03",
                label: "LLM Classification (GPT-4o-mini)",
                tone: "text-ai",
                body: "Only high-relevance, candidate-novel documents (16%) are sent to the LLM for fine-grained event typing, sentiment scoring, and glass-box reasoning. Output cites the exact source document.",
              },
              {
                stage: "04",
                label: "PIT Archival",
                tone: "text-pos",
                body: "Classified events are written to the immutable PIT lake with {source, fetched_at, as_of, content_hash}. Nothing is back-filled or mutated. Version history is append-only.",
              },
              {
                stage: "05",
                label: "Novelty + MNPI Gate",
                tone: "text-warn",
                body: "Novelty scoring (trailing-30D corpus delta). MNPI classifier runs in parallel — any event with a material non-public flag is quarantined before reaching the signal stream.",
              },
            ].map(({ stage, label, tone, body }) => (
              <div key={stage} className="flex gap-4 px-4 py-3">
                <span className={cn("mt-0.5 shrink-0 font-mono text-xs", tone)}>{stage}</span>
                <div>
                  <p className="text-sm font-medium text-ink">{label}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            title="Event Intensity — Taxonomy Delta vs Baseline"
            sub="24h event count deviation from 30D rolling baseline — positive = above-normal activity"
          />
          <div className="px-4 py-4">
            <p className="mb-3 section-label">30-day baseline delta · by event type</p>
            <DeltaBars
              data={TAXONOMY_DELTAS}
              width={480}
              height={64}
            />
            <div className="mt-2 flex gap-3 text-2xs">
              <span className="font-mono text-pos">positive = above-baseline volume</span>
              <span className="font-mono text-neg">negative = below-baseline</span>
            </div>
          </div>
          <div className="border-t border-line">
            <div className="space-y-0 divide-y divide-line">
              {[
                { label: "Highest 24h activity", value: "SUPPLY-CHAIN · +38% vs baseline", tone: "text-pos" },
                { label: "Lowest 24h activity", value: "MGMT-CHANGE · −22% vs baseline", tone: "text-neg" },
                { label: "Cache hit rate", value: "84% of LLM calls avoided", tone: "text-ai" },
                { label: "Avg classify latency", value: "12ms pre-filter · 480ms LLM", tone: "text-muted" },
              ].map(({ label, value, tone }) => (
                <div key={label} className="flex items-center justify-between px-4 py-2">
                  <span className="text-xs text-dim">{label}</span>
                  <span className={cn("font-mono text-xs", tone)}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
