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
import { Sparkline, ProgressBar, MiniBars } from "@/components/ui/viz";
import { Icon } from "@/components/icon-map";
import { ChevronRight } from "@/components/icons";
import { LiveDot } from "@/components/live/live-stat";
import {
  INGESTION_SOURCES,
  INGESTION_KPI,
  PIT_ARTIFACTS,
  BACKFILL_SOURCES,
  type LicenseMode,
  type SourceHealth,
} from "@/lib/data/argus2";
import { priceWalk } from "@/lib/rng";
import { fmtInt, fmtCompact, fmtNum, fmtPct } from "@/lib/format";
import { cn } from "@/lib/cn";

export const metadata = { title: "ARGUS · Ingestion & Source Framework" };

/* Fetch-rate sparkline over 24h (hourly bins) */
const FETCH_RATE_24H = priceWalk("fetch-rate-24h", 24, 9_800, 0.08, 0.002);
const DEDUP_RATE_24H = priceWalk("dedup-rate-24h", 24, 18.4, 0.04, 0.0);
const ARCHIVE_GROWTH_24H = priceWalk("archive-growth-24h", 24, 14.2, 0.05, 0.001);

const statusTone: Record<SourceHealth, string> = {
  healthy:  "chip-pos",
  degraded: "chip-warn",
  blocked:  "chip-neg",
};

const licenseTone: Record<LicenseMode, string> = {
  "public-domain":  "chip-pos",
  "official-api":   "chip-accent",
  "freemium-api":   "chip-warn",
  "licensed":       "border-info/30 bg-info/10 text-info",
  "BLOCKED-ToS":    "chip-neg",
};

const licenseLabelShort: Record<LicenseMode, string> = {
  "public-domain":  "Public Domain",
  "official-api":   "Official API",
  "freemium-api":   "Freemium API",
  "licensed":       "Licensed",
  "BLOCKED-ToS":    "BLOCKED-ToS",
};

export default function IngestionPage() {
  const healthySources = INGESTION_SOURCES.filter((s) => s.status === "healthy").length;
  const degradedSources = INGESTION_SOURCES.filter((s) => s.status === "degraded").length;

  return (
    <div className="space-y-5">
      <PageHeader
        module={{ name: "ARGUS · Alt-Data & Signals", tone: "accent" }}
        title="Ingestion & Source Framework"
        desc="Every fetch lands an immutable PIT artifact: {source, fetched_at, as_of, content_hash, license_mode}. Partitioned by source/date. Never overwritten. Blocked sources are refused by the permission registry."
        right={
          <div className="flex items-center gap-2">
            <LiveDot />
            <StatusDot tone="pos" pulse />
            <span className="font-mono text-xs text-dim">{healthySources} healthy · {degradedSources} degraded</span>
            <Link href="/signals/governance" className="btn">Governance</Link>
            <Link href="/signals" className="btn">← Signals</Link>
          </div>
        }
      />

      {/* KPI deck */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <KpiCard
          label="Active Sources"
          value={String(INGESTION_KPI.activeSources)}
          sub="permitted + operational"
          icon={<Icon name="plug" width={15} height={15} />}
          tone="pos"
        />
        <KpiCard
          label="Fetches / 24h"
          value={fmtCompact(INGESTION_KPI.fetches24h)}
          sub="across all active sources"
          icon={<Icon name="activity" width={15} height={15} />}
          tone="accent"
        />
        <KpiCard
          label="Dedup Rate"
          value={`${fmtNum(INGESTION_KPI.dedupRate, 1)}%`}
          sub="content-hash matched · skipped"
          icon={<Icon name="filter" width={15} height={15} />}
        />
        <KpiCard
          label="Archive Growth / Day"
          value={`${fmtNum(INGESTION_KPI.archiveGrowthGbDay, 1)} GB`}
          sub="append-only · immutable partitions"
          icon={<Icon name="database" width={15} height={15} />}
          tone="warn"
        />
        <KpiCard
          label="Blocked Sources"
          value={String(INGESTION_KPI.blockedSources)}
          sub="refused by permission registry"
          icon={<Icon name="shield" width={15} height={15} />}
          tone="neg"
        />
      </div>

      {/* Source Framework Table */}
      <Panel>
        <PanelHeader
          title="Source Framework — Permission Registry"
          sub="Sources marked BLOCKED are refused by the ingestion framework; no data is ever collected from them."
          right={<Chip tone="accent">PIT enforced · robots/ToS checked</Chip>}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] border-collapse">
            <thead>
              <tr>
                <Th>Source</Th>
                <Th>Signal Family</Th>
                <Th>Cadence</Th>
                <Th right>Last Fetch</Th>
                <Th>Status</Th>
                <Th>robots/ToS</Th>
                <Th>License Mode</Th>
                <Th>Rate Limit</Th>
                <Th>Backoff</Th>
              </tr>
            </thead>
            <tbody>
              {INGESTION_SOURCES.map((s, i) => (
                <tr
                  key={i}
                  className={cn(
                    "group transition-colors hover:bg-elevated/40",
                    s.blocked && "bg-neg/5"
                  )}
                >
                  <Td mono={false}>
                    <div className="flex items-center gap-2">
                      {s.blocked ? (
                        <Icon name="lock" width={13} height={13} className="shrink-0 text-neg" />
                      ) : (
                        <Icon name="plug" width={13} height={13} className="shrink-0 text-dim" />
                      )}
                      <span className={cn("font-medium text-sm", s.blocked ? "text-neg" : "text-ink")}>
                        {s.source}
                      </span>
                    </div>
                  </Td>
                  <Td mono={false} className="text-xs text-dim">{s.signalFamily}</Td>
                  <Td mono={false} className="text-xs text-muted">{s.cadence}</Td>
                  <Td right className="text-dim whitespace-nowrap">
                    {s.blocked ? <span className="text-neg">—</span> : s.lastFetch.slice(0, 16)}
                  </Td>
                  <Td mono={false}>
                    <span className={cn("chip text-2xs", statusTone[s.status])}>
                      {s.status.toUpperCase()}
                    </span>
                  </Td>
                  <Td mono={false}>
                    <div className="flex gap-1">
                      <span className={cn("chip text-2xs", s.robotsPosture === "ALLOWED" ? "chip-pos" : s.robotsPosture === "CONDITIONAL" ? "chip-warn" : "chip-neg")}>
                        {s.robotsPosture === "ALLOWED" ? "robots ✓" : s.robotsPosture === "CONDITIONAL" ? "robots ~" : "robots ✗"}
                      </span>
                      <span className={cn("chip text-2xs", s.tosPosture === "allowed" ? "chip-pos" : "chip-neg")}>
                        {s.tosPosture === "allowed" ? "ToS ✓" : "ToS ✗"}
                      </span>
                    </div>
                  </Td>
                  <Td mono={false}>
                    <span className={cn("chip text-2xs", licenseTone[s.licenseMode])}>
                      {licenseLabelShort[s.licenseMode]}
                    </span>
                  </Td>
                  <Td mono={false} className="text-xs text-dim">
                    {s.blocked ? <span className="text-neg">N/A — BLOCKED</span> : s.rateLimit}
                  </Td>
                  <Td mono={false} className="text-xs text-dim">
                    {s.blocked ? <span className="text-neg">N/A</span> : s.backoffPolicy}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-line px-4 py-3">
          <div className="flex items-start gap-2 text-xs text-dim">
            <Icon name="shield" width={13} height={13} className="mt-0.5 shrink-0 text-neg" />
            <span>
              <strong className="text-muted">BLOCKED sources</strong> (LinkedIn, Glassdoor) are permanently refused by the permission registry. The ingestion framework will not fetch, proxy, or circumvent them. To enable: LICENSE the data through the provider&rsquo;s official partnership program.
            </span>
          </div>
        </div>
      </Panel>

      {/* Scheduler + Rate-Limiting row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Scheduler panel */}
        <Panel>
          <PanelHeader
            title="Scheduler — Per-Source Cadence & Next Run"
            sub="Cron-based; polite delays between requests; never concurrent hammering"
          />
          <div className="space-y-0 divide-y divide-line">
            {INGESTION_SOURCES.filter((s) => !s.blocked).slice(0, 8).map((s, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-2.5">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-ink">{s.source}</span>
                  <span className="font-mono text-2xs text-dim">{s.cadence}</span>
                </div>
                <div className="flex items-center gap-3 text-right">
                  <div className="flex flex-col items-end">
                    <span className="font-mono text-2xs text-dim">next run</span>
                    <span className="font-mono text-xs text-muted whitespace-nowrap">
                      {s.nextRun === "Real-time" || s.nextRun === "On demand" ? (
                        <span className="text-pos">{s.nextRun}</span>
                      ) : s.nextRun.slice(0, 16)}
                    </span>
                  </div>
                  <StatusDot tone={s.status === "healthy" ? "pos" : s.status === "degraded" ? "warn" : "neg"} />
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-line px-4 py-2.5">
            <Link href="/signals/governance" className="flex items-center justify-between text-xs text-dim hover:text-muted">
              <span>Full permission registry in Governance</span>
              <ChevronRight width={14} height={14} />
            </Link>
          </div>
        </Panel>

        {/* Rate-limiting & backoff */}
        <Panel>
          <PanelHeader
            title="Rate-Limiting & Backoff Policy"
            sub="Polite per-host limits · 429 → exponential backoff · never hammer"
            right={<Chip tone="info">Polite crawling</Chip>}
          />
          <div className="space-y-4 p-4">
            {[
              {
                label: "Per-host rate limit",
                value: "Enforced via token-bucket per origin",
                sub: "Limits set well below robots.txt / ToS minimums. Default: 1–10 req/s depending on host.",
                tone: "text-accent",
              },
              {
                label: "HTTP 429 handling",
                value: "Exponential backoff + Retry-After header",
                sub: "Base delay 10s · factor 2.0 · max 5 retries. Respects Retry-After if provided. Logs every backoff event.",
                tone: "text-warn",
              },
              {
                label: "HTTP 503 / network error",
                value: "Jittered retry (up to 3x)",
                sub: "Random jitter ±20% added to prevent thundering herd. Alert fires if source is unreachable for >2 scheduled runs.",
                tone: "text-warn",
              },
              {
                label: "Crawl delay (robots.txt)",
                value: "Always honored if specified",
                sub: "Crawl-delay directive in robots.txt overrides our default. We never ignore it even for high-value sources.",
                tone: "text-pos",
              },
              {
                label: "Concurrent connection limit",
                value: "Max 4 simultaneous per origin",
                sub: "Total concurrent fetches across all sources capped at 32. Burst capacity handled by queue, not parallelism.",
                tone: "text-muted",
              },
            ].map(({ label, value, sub, tone }) => (
              <div key={label} className="flex gap-3 rounded border border-line bg-elevated/30 p-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted">{label}</span>
                    <span className={cn("font-mono text-xs", tone)}>{value}</span>
                  </div>
                  <p className="mt-1 text-2xs text-dim leading-relaxed">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* Dedup + Incremental Fetch */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHeader
            title="Dedup + Incremental Fetch"
            sub="Content-hash dedup prevents re-processing; incremental fetch avoids full re-crawl"
            right={<Chip tone="accent">SHA-256 content hash</Chip>}
          />
          <div className="space-y-0 divide-y divide-line">
            {[
              {
                step: "01",
                title: "Compute content hash on arrival",
                body: "Every fetched document is SHA-256 hashed on the raw bytes before any parsing. Hash stored with the immutable PIT artifact.",
              },
              {
                step: "02",
                title: "Lookup in dedup index",
                body: "Hash compared against the per-source Bloom filter (fast) then the exact-match index (authoritative). If seen before: skip parse, skip LLM, mark artifact as duplicate.",
              },
              {
                step: "03",
                title: "Incremental fetch via ETag / Last-Modified",
                body: "Where the server supports HTTP conditional requests, we send If-None-Match (ETag) or If-Modified-Since. A 304 Not Modified avoids even downloading the body.",
              },
              {
                step: "04",
                title: "Filings: resume from last seen accession",
                body: "For EDGAR, we track the last ingested accession number per form type. New runs fetch only newer filings — no re-processing of historical archive on routine runs.",
              },
              {
                step: "05",
                title: "Amended / restated documents",
                body: "An amendment (e.g. 10-K/A) is treated as a NEW artifact with a new content hash. The original is preserved immutably. Signal logic handles revision history explicitly.",
              },
            ].map(({ step, title, body }) => (
              <div key={step} className="flex gap-4 px-4 py-3">
                <span className="mt-0.5 shrink-0 font-mono text-xs text-accent">{step}</span>
                <div>
                  <p className="text-sm font-medium text-ink">{title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        {/* RAW → PIT LAKE intake flow */}
        <Panel glow>
          <PanelHeader
            title="RAW → PIT Lake Intake Flow"
            sub="Every run lands an immutable artifact · partitioned by source/date · never overwritten"
            right={<Chip tone="info">PIT enforced</Chip>}
          />
          <div className="overflow-x-auto p-4">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <Th>Source</Th>
                  <Th right>Fetched At</Th>
                  <Th right>as_of</Th>
                  <Th>Content Hash</Th>
                  <Th>License</Th>
                  <Th>Partition</Th>
                  <Th right>Size</Th>
                </tr>
              </thead>
              <tbody>
                {PIT_ARTIFACTS.map((a, i) => (
                  <tr key={i} className="group transition-colors hover:bg-elevated/40">
                    <Td mono={false} className="text-ink font-medium text-xs">{a.source}</Td>
                    <Td right className="text-dim whitespace-nowrap">{a.fetchedAt.slice(0, 19).replace("T", " ")}</Td>
                    <Td right className="text-muted">{a.asOf}</Td>
                    <Td className="font-mono text-2xs text-faint">{a.contentHash}</Td>
                    <Td mono={false}>
                      <span className={cn("chip text-2xs", a.licenseMode === "public-domain" ? "chip-pos" : a.licenseMode === "official-api" ? "chip-accent" : "chip-warn")}>
                        {a.licenseMode}
                      </span>
                    </Td>
                    <Td className="text-dim text-2xs">{a.partition}</Td>
                    <Td right className="text-dim">{fmtCompact(a.sizeKb * 1024)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-line px-4 py-3">
            <div className="flex items-start gap-2 text-xs text-dim">
              <Icon name="lock" width={13} height={13} className="mt-0.5 shrink-0 text-faint" />
              <span>
                Artifacts are written once and never overwritten. The partition layout is <span className="font-mono text-faint">s3://pit-lake/[source]/[date]/[hash].parquet</span>. Amended documents get a new artifact; the original remains intact. This is the foundation of look-ahead-free backtesting.
              </span>
            </div>
          </div>
        </Panel>
      </div>

      {/* Backfill panel + fetch rate sparkline */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHeader
            title="Legitimate Backfill — Survivorship-Bias-Free History"
            sub="Bootstrap historical archive without look-ahead · legal sources only"
            right={<Chip tone="accent">PIT bootstrap</Chip>}
          />
          <div className="space-y-0 divide-y divide-line">
            {BACKFILL_SOURCES.map((b) => (
              <div key={b.name} className="px-4 py-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-ink">{b.name}</span>
                  <span className="font-mono text-xs text-dim">from {b.coverageFrom}</span>
                </div>
                <p className="mt-1 text-xs text-muted">{b.purpose}</p>
                <p className="mt-0.5 text-2xs text-dim">{b.note}</p>
              </div>
            ))}
          </div>
          <div className="border-t border-line px-4 py-3">
            <div className="flex items-start gap-2 text-xs text-dim">
              <Icon name="database" width={13} height={13} className="mt-0.5 shrink-0 text-faint" />
              <span>
                Backfill uses only legitimate archival sources. All documents are tagged with their original publication timestamp — the as_of date reflects the original filing/article date, not the backfill run date. This eliminates survivorship bias in the historical signal library.
              </span>
            </div>
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            title="Fetch Rate & Archive Growth — 24H"
            sub="Hourly fetch volume · archive growth GB · dedup rate %"
          />
          <div className="space-y-5 px-4 py-4">
            <div>
              <p className="mb-2 section-label">Fetch rate (docs/hour) · 24h</p>
              <Sparkline data={FETCH_RATE_24H} width={480} height={48} />
            </div>
            <div>
              <p className="mb-2 section-label">Archive growth (GB/hour) · 24h</p>
              <Sparkline data={ARCHIVE_GROWTH_24H} width={480} height={36} color="var(--accent)" />
            </div>
            <div>
              <p className="mb-2 section-label">Dedup rate (%) · 24h</p>
              <Sparkline data={DEDUP_RATE_24H} width={480} height={28} color="var(--warn)" />
            </div>
          </div>
          <div className="border-t border-line">
            <div className="grid grid-cols-3 divide-x divide-line">
              {[
                { label: "Peak Fetch/hr", value: `${fmtCompact(Math.round(Math.max(...FETCH_RATE_24H) * 1000))}` },
                { label: "Total Archive", value: "38.4 TB" },
                { label: "Dedup (avg)", value: `${fmtNum(INGESTION_KPI.dedupRate, 1)}%` },
              ].map(({ label, value }) => (
                <div key={label} className="px-4 py-2.5 text-center">
                  <div className="section-label">{label}</div>
                  <div className="mt-1 font-mono text-sm text-ink">{value}</div>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
