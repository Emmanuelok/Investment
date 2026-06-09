import Link from "next/link";
import {
  PageHeader,
  Panel,
  PanelHeader,
  Chip,
  KpiCard,
  Th,
  Td,
  StatusDot,
} from "@/components/ui/kit";
import { ProgressBar } from "@/components/ui/viz";
import { Icon } from "@/components/icon-map";
import { ChevronRight, Check, Warn, Shield } from "@/components/icons";
import { LiveDot } from "@/components/live/live-stat";
import {
  PERMISSION_REGISTRY,
  GOVERNANCE_KPI,
  MNPI_QUEUE,
  PII_FIELDS,
  LICENSE_MANAGER,
  type PermissionStatus,
} from "@/lib/data/argus2";
import { fmtInt, fmtUsdCompact } from "@/lib/format";
import { cn } from "@/lib/cn";

export const metadata = { title: "ARGUS · Compliance & Data Governance" };

const permissionTone = (status: PermissionStatus) =>
  status === "ALLOWED" ? "chip-pos" : "chip-neg";

const mnpiStatusTone = (s: string) =>
  s === "quarantined" ? "chip-neg" : s === "cleared" ? "chip-pos" : "chip-warn";

const piiActionTone = (a: string) => {
  if (a === "not-collected") return "chip-pos";
  if (a === "aggregated") return "chip-accent";
  if (a === "anonymized") return "chip-accent";
  if (a === "deleted-after-30d") return "chip-warn";
  return "";
};

export default function GovernancePage() {
  return (
    <div className="space-y-5">
      <PageHeader
        module={{ name: "ARGUS · Alt-Data & Signals", tone: "accent" }}
        title="Compliance & Data Governance"
        desc="First-class, non-negotiable. Lawful sourcing, MNPI quarantine, PII minimization, and a full permission registry that refuses blocked sources. Compliance is what makes a real alt-data operation durable."
        right={
          <div className="flex items-center gap-2">
            <LiveDot />
            <StatusDot tone="pos" />
            <span className="font-mono text-xs text-dim">policy engine active</span>
            <Link href="/signals/ingestion" className="btn">Ingestion</Link>
            <Link href="/signals" className="btn">← Signals</Link>
          </div>
        }
      />

      {/* KPI deck */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <KpiCard
          label="Sources Permitted"
          value={String(GOVERNANCE_KPI.sourcesPermitted)}
          sub="robots/ToS checked · registry approved"
          icon={<Icon name="check" width={15} height={15} />}
          tone="pos"
        />
        <KpiCard
          label="Sources Blocked"
          value={String(GOVERNANCE_KPI.sourcesBlocked)}
          sub="ToS prohibits · never fetched"
          icon={<Icon name="lock" width={15} height={15} />}
          tone="neg"
        />
        <KpiCard
          label="MNPI Quarantined"
          value={String(GOVERNANCE_KPI.mnpiQuarantined)}
          sub="held pending review · not in signal stream"
          icon={<Icon name="shield" width={15} height={15} />}
          tone="warn"
        />
        <KpiCard
          label="PII Fields Minimized"
          value={String(GOVERNANCE_KPI.piiFieldsMinimized)}
          sub="not-collected / anonymized / aggregated"
          icon={<Icon name="eye" width={15} height={15} />}
          tone="accent"
        />
        <KpiCard
          label="Datasets Licensed"
          value={String(GOVERNANCE_KPI.datasetsLicensed)}
          sub="of 2 paid sources active"
          icon={<Icon name="doc" width={15} height={15} />}
        />
      </div>

      {/* Compliance banner */}
      <div className="flex items-start gap-3 rounded border border-accent/30 bg-accent/5 px-4 py-3.5">
        <Icon name="shield" width={16} height={16} className="mt-0.5 shrink-0 text-accent" />
        <div>
          <p className="text-sm font-semibold text-ink">Lawful Sourcing is a Feature, Not a Footnote</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted">
            ARGUS is designed from the ground up to use only legally permissible data. The permission registry actively refuses sources blocked by robots.txt or ToS — no bypassing, no proxies, no CAPTCHA circumvention.
            Every signal traces to a cited, publicly available document. MNPI is quarantined before it reaches research. PII is minimized to what is necessary and lawful.
            This isn&rsquo;t defensive compliance — it&rsquo;s what makes an alt-data operation durable.
          </p>
        </div>
      </div>

      {/* Source Permission Registry */}
      <Panel>
        <PanelHeader
          title="Source Permission Registry"
          sub="The ingestion framework refuses any source with BLOCKED status. No exceptions. Updated on each source addition."
          right={<Chip tone="pos">{GOVERNANCE_KPI.sourcesPermitted} ALLOWED · <span className="text-neg">{GOVERNANCE_KPI.sourcesBlocked} BLOCKED</span></Chip>}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse">
            <thead>
              <tr>
                <Th>Source</Th>
                <Th>robots.txt Status</Th>
                <Th>ToS Posture</Th>
                <Th>Verdict</Th>
                <Th>Notes</Th>
              </tr>
            </thead>
            <tbody>
              {PERMISSION_REGISTRY.map((row, i) => (
                <tr
                  key={i}
                  className={cn(
                    "group transition-colors hover:bg-elevated/40",
                    row.allowed === "BLOCKED" && "bg-neg/5"
                  )}
                >
                  <Td mono={false}>
                    <div className="flex items-center gap-2">
                      {row.allowed === "BLOCKED" ? (
                        <Icon name="lock" width={13} height={13} className="shrink-0 text-neg" />
                      ) : (
                        <Icon name="check" width={13} height={13} className="shrink-0 text-pos" />
                      )}
                      <span className={cn("font-medium text-sm", row.allowed === "BLOCKED" ? "text-neg" : "text-ink")}>
                        {row.source}
                      </span>
                    </div>
                  </Td>
                  <Td mono={false}>
                    <span className={cn("chip text-2xs", row.robotsTxtStatus === "respects" ? "chip-pos" : row.robotsTxtStatus === "no-file" ? "chip-warn" : "chip-neg")}>
                      {row.robotsTxtStatus === "respects" ? "✓ allows" : row.robotsTxtStatus === "no-file" ? "no file" : "✗ disallows"}
                    </span>
                  </Td>
                  <Td mono={false}>
                    <span className={cn("chip text-2xs", row.tosPosture === "permissive" ? "chip-pos" : row.tosPosture === "restricted" ? "chip-warn" : "chip-neg")}>
                      {row.tosPosture}
                    </span>
                  </Td>
                  <Td mono={false}>
                    <span className={cn("chip text-xs font-semibold", permissionTone(row.allowed))}>
                      {row.allowed}
                    </span>
                  </Td>
                  <Td mono={false} className="max-w-[380px] text-xs text-muted leading-snug">
                    {row.notes}
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
              <strong className="text-muted">Hard rule:</strong> Any source with a BLOCKED verdict is not fetchable, not proxied, and not accessible via any indirect method. To onboard a blocked source: obtain an official license or data partnership agreement, then update the registry with the license reference.
            </span>
          </div>
        </div>
      </Panel>

      {/* Lawful Access Guardrails */}
      <Panel glow>
        <PanelHeader
          title="Lawful-Access Guardrails"
          right={<Chip tone="accent">Non-negotiable</Chip>}
        />
        <div className="grid gap-0 divide-y divide-line md:grid-cols-2 md:divide-x md:divide-y-0">
          <div className="space-y-0 divide-y divide-line">
            <div className="px-4 py-3">
              <p className="text-sm font-semibold text-pos flex items-center gap-1.5">
                <Check width={14} height={14} /> Always do
              </p>
            </div>
            {[
              { title: "Respect robots.txt",         body: "Every source is checked against its robots.txt on first access and on cache expiry. Disallowed paths are never fetched." },
              { title: "Respect ToS rate limits",    body: "Per-host rate limits are set below ToS maximums. We never race to the limit — we operate well inside it." },
              { title: "Use official APIs first",     body: "If an official API exists (EDGAR EFTS, FEC API, USPTO PatentsView, Wikimedia REST), we use it. Crawling is the fallback for data with no official API." },
              { title: "License restricted sources",  body: "When a source is valuable but access-restricted (LinkedIn, Glassdoor, Bloomberg), the path is a data partnership license — not evasion." },
              { title: "Cite every output",           body: "Every classified event and signal cites its source document URL and content hash. No fabricated or citation-free data." },
            ].map(({ title, body }) => (
              <div key={title} className="flex gap-3 px-4 py-3">
                <Icon name="check" width={13} height={13} className="mt-0.5 shrink-0 text-pos" />
                <div>
                  <p className="text-sm font-medium text-ink">{title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted">{body}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-0 divide-y divide-line">
            <div className="px-4 py-3">
              <p className="text-sm font-semibold text-neg flex items-center gap-1.5">
                <Warn width={14} height={14} /> Never do
              </p>
            </div>
            {[
              { title: "Circumvent paywalls",       body: "Never use credential sharing, bypass scripts, or cached paywall-evading copies of subscriber-only content." },
              { title: "Circumvent CAPTCHAs",       body: "No CAPTCHA-solving services, headless-browser tricks, or rotating IP schemes to bypass bot detection." },
              { title: "Use anti-bot evasion",      body: "Never rotate user agents, fake browser fingerprints, or use residential proxies to disguise programmatic access." },
              { title: "Log in to scrape",          body: "Never authenticate to a platform to scrape data behind a login wall (LinkedIn, Glassdoor, Bloomberg). This is unauthorized access." },
              { title: "Back-fill with non-public", body: "Never supplement the PIT archive with data obtained through channels that weren't publicly available at the as_of date. Survivorship-bias correction uses only legal archival sources." },
            ].map(({ title, body }) => (
              <div key={title} className="flex gap-3 px-4 py-3">
                <Icon name="warn" width={13} height={13} className="mt-0.5 shrink-0 text-neg" />
                <div>
                  <p className="text-sm font-medium text-ink">{title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      {/* MNPI + PII row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* MNPI Screening & Quarantine */}
        <Panel>
          <PanelHeader
            title="MNPI Screening & Quarantine"
            sub="Flagged items held before research · never enter signal stream · full audit log"
            right={<Chip tone="warn">{GOVERNANCE_KPI.mnpiQuarantined} quarantined</Chip>}
          />
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <Th>ID</Th>
                  <Th>Entity</Th>
                  <Th>Type</Th>
                  <Th>Flagged At</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {MNPI_QUEUE.map((item) => (
                  <tr key={item.id} className={cn("group transition-colors hover:bg-elevated/40", item.status === "quarantined" && "bg-neg/5")}>
                    <Td className="font-mono text-2xs text-dim">{item.id}</Td>
                    <Td mono={false}>
                      <span className="font-mono text-xs font-medium text-ink">{item.entity}</span>
                    </Td>
                    <Td mono={false}>
                      <span className="chip chip-warn text-2xs">{item.eventType}</span>
                    </Td>
                    <Td className="text-dim text-2xs">{item.flaggedAt}</Td>
                    <Td mono={false}>
                      <span className={cn("chip text-2xs", mnpiStatusTone(item.status))}>
                        {item.status.toUpperCase()}
                      </span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-0 divide-y divide-line">
            {MNPI_QUEUE.map((item) => (
              <div key={item.id} className={cn("px-4 py-2.5", item.status === "quarantined" && "bg-neg/5")}>
                <div className="flex items-start gap-2">
                  <span className="font-mono text-2xs text-dim mt-0.5">{item.id}</span>
                  <div className="flex-1">
                    <p className="text-xs text-muted leading-snug">{item.reason}</p>
                    <p className="mt-0.5 font-mono text-2xs text-faint">audit: {item.auditUser}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-line px-4 py-3">
            <div className="flex items-start gap-2 text-xs text-dim">
              <Icon name="shield" width={13} height={13} className="mt-0.5 shrink-0 text-warn" />
              <span>
                MNPI classifier runs on all classified events before they enter the signal stream. Default policy: public-only. Any item with a material non-public flag is quarantined and requires compliance clearance before use.
              </span>
            </div>
          </div>
        </Panel>

        {/* PII Minimization */}
        <Panel>
          <PanelHeader
            title="PII Minimization"
            sub="Collect only lawful/necessary · anonymize/aggregate · GDPR/CCPA retention & deletion"
            right={<Chip tone="accent">GDPR / CCPA</Chip>}
          />
          <div className="space-y-0 divide-y divide-line">
            {PII_FIELDS.map((f, i) => (
              <div key={i} className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium text-ink">{f.field}</span>
                  <span className={cn("chip text-2xs shrink-0", piiActionTone(f.action))}>
                    {f.action}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="font-mono text-2xs text-dim">source: {f.source}</span>
                </div>
                <p className="mt-1 text-2xs text-dim leading-relaxed">{f.basis}</p>
              </div>
            ))}
          </div>
          <div className="border-t border-line px-4 py-3">
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Retention policy",       value: "30d for raw web; permanent for public filings", tone: "text-muted" },
                { label: "Deletion on request",     value: "GDPR Art. 17 / CCPA honored", tone: "text-pos" },
                { label: "Third-party transfers",   value: "None; data stays in-VPC", tone: "text-pos" },
                { label: "Individual tracking",     value: "Not performed; entity-level only", tone: "text-pos" },
              ].map(({ label, value, tone }) => (
                <div key={label} className="rounded border border-line bg-elevated/30 px-3 py-2">
                  <div className="text-2xs text-dim">{label}</div>
                  <div className={cn("mt-0.5 font-mono text-2xs", tone)}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>

      {/* License Manager */}
      <Panel>
        <PanelHeader
          title="License Manager — Dataset & Data Provider Agreements"
          sub="Only licensed or public-domain sources are active. Blocked sources require a formal license before activation."
          right={
            <Link href="/licenses" className="btn btn-accent text-xs">
              View /licenses
            </Link>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse">
            <thead>
              <tr>
                <Th>Dataset</Th>
                <Th>Provider</Th>
                <Th>License Mode</Th>
                <Th right>Monthly Cost</Th>
                <Th>Active</Th>
                <Th>Notes</Th>
              </tr>
            </thead>
            <tbody>
              {LICENSE_MANAGER.map((row, i) => (
                <tr
                  key={i}
                  className={cn(
                    "group transition-colors hover:bg-elevated/40",
                    !row.active && row.monthlyCostUsd === 0 && "opacity-60"
                  )}
                >
                  <Td mono={false} className="font-medium text-ink text-sm">{row.dataset}</Td>
                  <Td mono={false} className="text-dim text-xs">{row.dataProvider}</Td>
                  <Td mono={false}>
                    <span className={cn(
                      "chip text-2xs",
                      row.licenseMode.includes("BLOCKED") ? "chip-neg" :
                      row.licenseMode.includes("Not provisioned") ? "chip-warn" :
                      row.licenseMode.includes("public") ? "chip-pos" :
                      row.active ? "chip-accent" : ""
                    )}>
                      {row.licenseMode.length > 28 ? row.licenseMode.slice(0, 26) + "…" : row.licenseMode}
                    </span>
                  </Td>
                  <Td right className={row.monthlyCostUsd > 0 ? "text-muted" : "text-dim"}>
                    {row.monthlyCostUsd > 0 ? fmtUsdCompact(row.monthlyCostUsd) + "/mo" : "—"}
                  </Td>
                  <Td mono={false}>
                    {row.active ? (
                      <span className="chip chip-pos text-2xs">ACTIVE</span>
                    ) : (
                      <span className="chip chip-neg text-2xs">INACTIVE</span>
                    )}
                  </Td>
                  <Td mono={false} className="max-w-[360px] text-xs text-dim leading-snug">
                    {row.notes}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-line">
          <div className="grid grid-cols-3 divide-x divide-line">
            {[
              { label: "Active paid licenses", value: `${LICENSE_MANAGER.filter(r => r.active && r.monthlyCostUsd > 0).length}`, sub: "of 2 paid sources" },
              { label: "Monthly data spend", value: `$${fmtInt(LICENSE_MANAGER.reduce((s, r) => s + r.monthlyCostUsd, 0))}`, sub: "all active datasets" },
              { label: "Inactive (needs license)", value: `${LICENSE_MANAGER.filter(r => !r.active).length}`, sub: "blocked or not provisioned" },
            ].map(({ label, value, sub }) => (
              <div key={label} className="px-4 py-3 text-center">
                <div className="section-label">{label}</div>
                <div className="mt-1 font-mono text-lg text-ink">{value}</div>
                <div className="text-2xs text-dim">{sub}</div>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      {/* Lineage & audit note */}
      <Panel>
        <PanelHeader
          title="Lineage & Audit Log — Append-Only"
          sub="Every signal, every classified event, every fetch, and every policy decision is auditable end-to-end"
          right={<Chip tone="info">Append-only · immutable</Chip>}
        />
        <div className="grid gap-0 divide-y divide-line md:grid-cols-3 md:divide-x md:divide-y-0">
          {[
            {
              icon: "database",
              title: "PIT Lake — Immutable Archive",
              body: "Every fetched document lands as an immutable artifact with {source, fetched_at, as_of, content_hash, license_mode}. Nothing is overwritten. Partitioned by source/date. The archive is the ground truth for backtest reproducibility and compliance audit.",
              tone: "text-accent",
            },
            {
              icon: "route",
              title: "Signal Lineage — Glass-Box",
              body: "Every signal value in the library is traceable to its source documents via the content hash. ATHENA can explain any signal from first principles, citing the exact filing, article, or data point that drove the score. No black-box inputs.",
              tone: "text-pos",
            },
            {
              icon: "shield",
              title: "Policy Audit Log",
              body: "Every MNPI quarantine decision, every permission registry check, and every blocked fetch attempt is logged with timestamp, system actor, and reason. Logs are append-only and stored separately from the signal lake. Available to compliance officers on request.",
              tone: "text-warn",
            },
          ].map(({ icon, title, body, tone }) => (
            <div key={title} className="flex flex-col gap-3 px-4 py-4">
              <div className="flex items-center gap-2">
                <Icon name={icon} width={15} height={15} className={cn("shrink-0", tone)} />
                <p className="text-sm font-semibold text-ink">{title}</p>
              </div>
              <p className="text-xs leading-relaxed text-muted">{body}</p>
            </div>
          ))}
        </div>
        <div className="border-t border-line px-4 py-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-dim">
              Compliance is not a feature flag. It is a first-class design constraint that makes ARGUS a lawful, durable, and institutional-grade alt-data operation.
            </p>
            <Link href="/data-lake" className="flex shrink-0 items-center gap-1 font-mono text-xs text-accent hover:underline">
              data lake <ChevronRight width={13} height={13} />
            </Link>
          </div>
        </div>
      </Panel>
    </div>
  );
}
