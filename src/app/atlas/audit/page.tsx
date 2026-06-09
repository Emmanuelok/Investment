import Link from "next/link";
import { LiveStat, LiveDot } from "@/components/live/live-stat";
import { PageHeader, Panel, PanelHeader, Chip, KpiCard, Th, Td, StatusDot } from "@/components/ui/kit";
import { ProgressBar } from "@/components/ui/viz";
import { Icon } from "@/components/icon-map";
import { Shield, Lock, Database, Check, Activity } from "@/components/icons";
import {
  CROSS_AUDIT,
  HASH_CHAIN_STATUS,
  RETENTION_CONFIG,
  type AuditPlatform,
} from "@/lib/data/atlas-runtime";
import { fmtInt } from "@/lib/format";
import { cn } from "@/lib/cn";

export const metadata = { title: "Audit & Compliance Backbone · ATLAS" };

/* Platform chip styles */
const PLATFORM_STYLE: Record<AuditPlatform, string> = {
  OBSIDIAN: "border-accent/30 bg-accent/10 text-accent",
  ARGUS:    "border-info/30 bg-info/10 text-info",
  KEPLER:   "border-ai/30 bg-ai/10 text-ai",
  AEGIS:    "border-warn/30 bg-warn/10 text-warn",
  HELIOS:   "border-pos/30 bg-pos/10 text-pos",
  ATLAS:    "border-neg/30 bg-neg/10 text-neg",
};

/* Action-level chip */
function ActionChip({ action }: { action: string }) {
  const top = action.split(".")[0].toLowerCase();
  const style =
    top === "order"      ? "chip-warn" :
    top === "risk"       ? "chip-neg" :
    top === "compliance" ? "border-warn/30 bg-warn/10 text-warn" :
    top === "config"     ? "chip-neg" :
    top === "permission" ? "chip-neg" :
    top === "backtest"   ? "border-ai/30 bg-ai/10 text-ai" :
    top === "source"     ? "border-info/30 bg-info/10 text-info" :
    top === "data"       ? "border-info/30 bg-info/10 text-info" :
    "border-line bg-elevated/40 text-muted";
  return <span className={cn("chip text-[9px]", style)}>{action}</span>;
}

export default function AtlasAuditPage() {
  const platformCounts = CROSS_AUDIT.reduce<Record<string, number>>((acc, e) => {
    acc[e.platform] = (acc[e.platform] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <PageHeader
        module={{ name: "ATLAS · Platform & Ops", tone: "info" }}
        title="Audit & Compliance Backbone"
        desc="Centralized, tamper-evident audit backbone for the entire PANTHEON suite. Events are aggregated from all 6 platforms via the ATLAS event bus — this is the immutable record of every significant action across the system."
        right={
          <div className="flex items-center gap-2">
            <LiveDot />
            <Chip tone="pos" dot>Hash-chain verified</Chip>
            <Chip tone="accent">Append-only</Chip>
            <Chip tone="info">6 services emitting</Chip>
          </div>
        }
      />

      {/* KPI deck */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <KpiCard
          label="TOTAL AUDIT EVENTS"
          value={fmtInt(101842)}
          sub="across all 6 platforms since inception"
          tone="accent"
          icon={<Database width={15} height={15} />}
        />
        <KpiCard
          label="EVENTS TODAY"
          value={<LiveStat value={2241} decimals={0} vol={0.01} />}
          sub="since 00:00 UTC · 6-service aggregate"
          icon={<Activity width={15} height={15} />}
        />
        <KpiCard
          label="SERVICES EMITTING"
          value="6 / 6"
          sub="OBSIDIAN · AEGIS · ARGUS · KEPLER · HELIOS · ATLAS"
          tone="pos"
          icon={<Icon name="radio" width={15} height={15} />}
        />
        <KpiCard
          label="HASH-CHAIN STATUS"
          value="VERIFIED"
          sub={`seq #1 → #${fmtInt(HASH_CHAIN_STATUS.chainLength)} · no gaps · no tampering`}
          tone="pos"
          icon={<Shield width={15} height={15} />}
        />
        <KpiCard
          label="RETENTION WINDOW"
          value="7 years"
          sub="hot 90d (Postgres) · cold 7y (S3 Object Lock)"
          icon={<Lock width={15} height={15} />}
        />
      </div>

      {/* Tamper-evidence callouts */}
      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            icon: "database",
            title: "Append-Only Storage",
            body: "Every event is inserted once and never modified. Corrections create new rows — the original event remains verbatim. No SQL UPDATE or DELETE is permitted on the audit schema. Physical deletes require quorum approval and produce a deletion-record entry.",
            accent: "border-accent/20 bg-accent/5 text-accent",
          },
          {
            icon: "shield",
            title: "Hash Chain — Tamper Evidence",
            body: "Each entry stores SHA-256(prev_hash ∥ seq ∥ ts ∥ platform ∥ actor ∥ action ∥ object). Any tampering with any field in any row breaks the chain immediately. Verification runs on every append and on a 60-second background schedule.",
            accent: "border-pos/20 bg-pos/5 text-pos",
          },
          {
            icon: "route",
            title: "Cross-Service Aggregation",
            body: "Unlike per-desk audit trails (see /audit), this backbone aggregates events from all 6 platforms via the ATLAS event bus. A single tamper-evident log covers every order, risk run, compliance decision, backtest, config change, and data access across the entire suite.",
            accent: "border-info/20 bg-info/5 text-info",
          },
        ].map((c) => (
          <Panel key={c.title} className={`border ${c.accent.split(" ")[0]}`}>
            <div className="p-4">
              <div className={cn("mb-3 grid h-8 w-8 place-items-center rounded border", c.accent)}>
                <Icon name={c.icon} width={14} height={14} />
              </div>
              <div className="font-mono text-sm font-semibold text-ink">{c.title}</div>
              <p className="mt-2 text-xs leading-relaxed text-muted">{c.body}</p>
            </div>
          </Panel>
        ))}
      </div>

      {/* Cross-service audit stream */}
      <Panel>
        <PanelHeader
          title="Cross-Service Audit Stream — Recent Entries"
          right={
            <div className="flex items-center gap-2">
              <Chip tone="pos" dot>Chain intact · seq #101,832–101,842</Chip>
              <Chip tone="default">All platforms</Chip>
            </div>
          }
        />

        {/* Platform filter chips (visual only — server rendered) */}
        <div className="flex flex-wrap gap-2 border-b border-line px-4 py-2.5">
          <span className="chip chip-accent">ALL</span>
          {(Object.keys(PLATFORM_STYLE) as AuditPlatform[]).map((p) => (
            <span key={p} className={cn("chip text-[10px] cursor-default", PLATFORM_STYLE[p])}>
              {p}
              <span className="ml-1 font-mono text-[9px] opacity-70">
                {platformCounts[p] ?? 0}
              </span>
            </span>
          ))}
          <span className="ml-auto self-center text-xs text-dim">Snapshot · event-bus aggregated</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse">
            <thead>
              <tr>
                <Th>Seq #</Th>
                <Th>Timestamp UTC</Th>
                <Th>Platform</Th>
                <Th>Actor</Th>
                <Th>Action</Th>
                <Th>Object / Detail</Th>
                <Th>SHA-256</Th>
              </tr>
            </thead>
            <tbody>
              {CROSS_AUDIT.map((entry, i) => (
                <tr
                  key={entry.seq}
                  className={cn(
                    "group transition-colors hover:bg-elevated/40",
                    i === 0 && "bg-elevated/20",
                  )}
                >
                  <Td mono className="text-accent font-semibold text-xs">
                    {fmtInt(entry.seq)}
                  </Td>
                  <Td mono className="text-dim text-xs whitespace-nowrap">
                    {entry.ts}
                  </Td>
                  <Td>
                    <span className={cn("chip text-[9px]", PLATFORM_STYLE[entry.platform])}>
                      {entry.platform}
                    </span>
                  </Td>
                  <Td mono className="text-xs text-muted">{entry.actor}</Td>
                  <Td>
                    <ActionChip action={entry.action} />
                  </Td>
                  <Td mono={false} className="text-xs text-muted max-w-[320px]">
                    <span className="line-clamp-2">{entry.object}</span>
                  </Td>
                  <Td mono className="text-xs text-dim">
                    <span title={`prev: ${entry.prevHash}`}>{entry.hash}</span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Per-platform mini breakdown */}
        <div className="grid grid-cols-3 divide-x divide-line border-t border-line md:grid-cols-6">
          {(Object.entries(PLATFORM_STYLE) as [AuditPlatform, string][]).map(([p, style]) => (
            <div key={p} className="px-4 py-3">
              <div className="kpi-label">{p}</div>
              <div className={cn("mt-1 font-mono text-lg font-semibold", style.split(" ").find(c => c.startsWith("text-")))}>
                {platformCounts[p] ?? 0}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Hash-chain verification + Retention row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Hash chain */}
        <Panel>
          <PanelHeader
            title="Hash-Chain Verification"
            right={<Chip tone="pos" dot>VERIFIED</Chip>}
          />
          <div className="p-4 space-y-4">
            <div className="rounded-lg border border-pos/20 bg-pos/5 p-3">
              <div className="flex items-center gap-2 mb-1">
                <Check width={14} height={14} className="text-pos" />
                <span className="font-mono text-sm font-semibold text-pos">Chain integrity: VERIFIED</span>
              </div>
              <p className="text-xs text-muted">{HASH_CHAIN_STATUS.integrityNote}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Algorithm",      value: HASH_CHAIN_STATUS.algorithm },
                { label: "Chain Length",   value: fmtInt(HASH_CHAIN_STATUS.chainLength) },
                { label: "Last Verified",  value: HASH_CHAIN_STATUS.lastCheck.slice(11, 19) + " UTC" },
                { label: "Verify Schedule","value": "Every 60 seconds (background)" },
              ].map((s) => (
                <div key={s.label} className="rounded border border-line bg-elevated/40 px-3 py-2">
                  <div className="kpi-label">{s.label}</div>
                  <div className="mt-0.5 font-mono text-xs text-ink">{s.value}</div>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <div className="kpi-label">Sample hash-chain linkage</div>
              <div className="space-y-1 font-mono text-[10px]">
                <div className="rounded bg-elevated/60 px-3 py-1.5">
                  <span className="text-dim">seq#101842 </span>
                  <span className="text-accent">hash=9f3c2a1e4b7d</span>
                  <span className="text-dim"> prev=7bc42a9e3d1f</span>
                </div>
                <div className="flex items-center gap-2 px-3 text-dim">
                  <span>↑ SHA-256(prev_hash ∥ seq ∥ ts ∥ platform ∥ actor ∥ action ∥ object)</span>
                </div>
                <div className="rounded bg-elevated/60 px-3 py-1.5">
                  <span className="text-dim">seq#101841 </span>
                  <span className="text-accent">hash=7bc42a9e3d1f</span>
                  <span className="text-dim"> prev=a3f9d2e1b7c0</span>
                </div>
              </div>
            </div>
          </div>
        </Panel>

        {/* Retention & export */}
        <Panel>
          <PanelHeader
            title="Retention & Export"
            right={<Chip tone="info">Regulatory-grade</Chip>}
          />
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded border border-line bg-elevated/40 px-3 py-2.5">
                <div className="kpi-label">Hot store</div>
                <div className="mt-0.5 font-mono text-xs font-semibold text-ink">{RETENTION_CONFIG.hotStore.name}</div>
                <div className="mt-1 text-[10px] text-dim">
                  Window: <span className="text-muted">{RETENTION_CONFIG.hotStore.window}</span> ·{" "}
                  {RETENTION_CONFIG.hotStore.sizeGb} GB
                </div>
              </div>
              <div className="rounded border border-line bg-elevated/40 px-3 py-2.5">
                <div className="kpi-label">Cold store</div>
                <div className="mt-0.5 font-mono text-xs font-semibold text-ink">{RETENTION_CONFIG.coldStore.name}</div>
                <div className="mt-1 text-[10px] text-dim">
                  Window: <span className="text-muted">{RETENTION_CONFIG.coldStore.window}</span> ·{" "}
                  {RETENTION_CONFIG.coldStore.sizeGb} GB
                </div>
              </div>
            </div>
            <div>
              <div className="kpi-label mb-2">Export formats</div>
              <div className="flex flex-wrap gap-1.5">
                {RETENTION_CONFIG.exportFormats.map((f) => (
                  <span key={f} className="chip text-[10px]">{f}</span>
                ))}
              </div>
            </div>
            <div>
              <div className="kpi-label mb-2">Regulatory compliance</div>
              <div className="space-y-1.5">
                {RETENTION_CONFIG.regulatoryNotes.map((note, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <Check width={12} height={12} className="mt-0.5 shrink-0 text-pos" />
                    <span className="text-muted">{note}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Panel>
      </div>

      {/* Event-volume by platform */}
      <Panel>
        <PanelHeader
          title="Audit Event Volume by Platform — Today"
          right={<Chip tone="default">2,241 events · 00:00–18:00 UTC</Chip>}
        />
        <div className="p-4 space-y-3">
          {([
            { platform: "OBSIDIAN" as AuditPlatform, events: 884, note: "market data access, secmaster lookups, ingest confirmations" },
            { platform: "AEGIS"    as AuditPlatform, events: 612, note: "order lifecycle, risk runs, pre-trade approvals, compliance rejections" },
            { platform: "ARGUS"    as AuditPlatform, events: 402, note: "source collections, MNPI quarantine events, event detections" },
            { platform: "KEPLER"   as AuditPlatform, events: 188, note: "backtest runs, strategy signal scoring, position changes" },
            { platform: "HELIOS"   as AuditPlatform, events: 97,  note: "order intents, portfolio NAV updates, report generation" },
            { platform: "ATLAS"    as AuditPlatform, events: 58,  note: "config changes, permission updates, kill-switch state, auth events" },
          ]).map((row) => {
            const pct = Math.round((row.events / 2241) * 100);
            const style = PLATFORM_STYLE[row.platform];
            const textColor = style.split(" ").find((c) => c.startsWith("text-")) ?? "text-muted";
            const barColor =
              row.platform === "OBSIDIAN" ? "var(--accent)" :
              row.platform === "ARGUS"    ? "var(--info)"   :
              row.platform === "KEPLER"   ? "var(--ai)"     :
              row.platform === "AEGIS"    ? "var(--warn)"   :
              row.platform === "HELIOS"   ? "var(--pos)"    :
              "var(--neg)";
            return (
              <div key={row.platform} className="flex items-center gap-3">
                <span className={cn("w-20 shrink-0 font-mono text-xs font-semibold", textColor)}>
                  {row.platform}
                </span>
                <ProgressBar value={pct} color={barColor} height={7} className="flex-1" />
                <span className="w-12 shrink-0 text-right font-mono text-xs text-muted">{fmtInt(row.events)}</span>
                <span className="hidden xl:block w-5 text-right font-mono text-xs text-dim">{pct}%</span>
                <span className="hidden lg:block w-72 shrink-0 text-xs text-dim truncate">{row.note}</span>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* Distinction from /audit */}
      <Panel>
        <PanelHeader title="Foundation for Regulatory Reporting" right={<Chip tone="info">Architecture note</Chip>} />
        <div className="grid gap-px bg-line md:grid-cols-2">
          {[
            {
              icon: "route",
              title: "This page vs. the per-desk Audit Trail",
              body: "This backbone aggregates events from ALL platforms via the event bus — it is the master compliance record. The per-desk Audit Trail at /audit shows only AEGIS order/risk/compliance events relevant to the trading desk UI.",
            },
            {
              icon: "shield",
              title: "Regulatory reporting pipeline",
              body: "Audit exports are automatically generated in SEC 17a-4 / MiFID II compatible formats on a daily schedule. Each export is signed (Ed25519), timestamped, and archived to WORM storage before delivery.",
            },
            {
              icon: "database",
              title: "Write path — event bus",
              body: "Services publish audit events to the ATLAS bus topic atlas.audit.events. The audit service consumes, validates, appends to Postgres, computes the hash, and archives to S3. No service writes directly to the audit DB.",
            },
            {
              icon: "lock",
              title: "Access controls",
              body: "Audit records are read-only for all users. Write path is restricted to the atlas-audit service account. Human operators can never write, update, or delete audit records — only query and export.",
            },
          ].map((c) => (
            <div key={c.title} className="bg-panel p-4">
              <div className="flex items-start gap-2">
                <Icon name={c.icon} width={13} height={13} className="mt-0.5 shrink-0 text-info" />
                <div>
                  <div className="font-mono text-xs font-semibold text-ink">{c.title}</div>
                  <p className="mt-1 text-xs leading-relaxed text-muted">{c.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-line px-4 py-3">
          <span className="text-xs text-dim">Per-desk audit trail (AEGIS orders / risk / compliance only)</span>
          <Link href="/audit" className="font-mono text-xs text-accent hover:underline">
            → View /audit
          </Link>
        </div>
      </Panel>
    </div>
  );
}
