import { PageHeader, Panel, PanelHeader, Chip, KpiCard, Th, Td } from "@/components/ui/kit";
import { AUDIT_LOG } from "@/lib/data/core";
import { Icon } from "@/components/icon-map";
import { Shield, Lock, Database, Check, Activity } from "@/components/icons";

export const metadata = { title: "Audit Trail · PANTHEON Infrastructure" };

const MODULE_TONE: Record<string, "accent" | "pos" | "warn" | "neg"> = {
  orders: "accent",
  compliance: "warn",
  risk: "info" as "accent",
  data: "default" as "pos",
};

const MODULE_COLOR: Record<string, string> = {
  orders: "text-accent border-accent/20 bg-accent/5",
  compliance: "text-warn border-warn/20 bg-warn/5",
  risk: "text-info border-info/20 bg-info/5",
  data: "text-muted border-line bg-elevated/40",
};

const FILTER_CHIPS = [
  { label: "ALL", count: AUDIT_LOG.length, active: true, module: null },
  { label: "ORDERS", count: AUDIT_LOG.filter((e) => e.module === "orders").length, active: false, module: "orders" },
  { label: "COMPLIANCE", count: AUDIT_LOG.filter((e) => e.module === "compliance").length, active: false, module: "compliance" },
  { label: "RISK RUNS", count: AUDIT_LOG.filter((e) => e.module === "risk").length, active: false, module: "risk" },
  { label: "DATA", count: AUDIT_LOG.filter((e) => e.module === "data").length, active: false, module: "data" },
];

export default function AuditPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        module={{ name: "PANTHEON · Infrastructure", tone: "accent" }}
        title="Audit Trail"
        desc="Immutable, append-only, cryptographically hash-chained log of every action across all PANTHEON modules. Full reproducibility — any state can be reconstructed from this log."
        right={
          <div className="flex items-center gap-2">
            <Chip tone="pos" dot>Append-only</Chip>
            <Chip tone="accent">SHA-256 chained</Chip>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          label="TOTAL LOG ENTRIES"
          value="48,221"
          sub="since inception — immutable, never deleted"
          tone="accent"
          icon={<Database width={15} height={15} />}
        />
        <KpiCard
          label="ENTRIES TODAY"
          value="312"
          sub="across all modules since 00:00 UTC"
          icon={<Activity width={15} height={15} />}
        />
        <KpiCard
          label="HASH ALGORITHM"
          value="SHA-256"
          sub="chain verified on each append"
          tone="pos"
          icon={<Shield width={15} height={15} />}
        />
        <KpiCard
          label="MUTATIONS"
          value="0"
          sub="Records are write-once — no UPDATE, no DELETE"
          tone="pos"
          icon={<Lock width={15} height={15} />}
        />
      </div>

      {/* Integrity callouts */}
      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            icon: "database",
            title: "Append-Only Storage",
            body: "Every event is inserted once and never modified. Corrections and reversals create new rows — the original event remains verbatim in the log. No SQL UPDATE or DELETE is permitted on the audit schema.",
            tone: "border-accent/20 bg-accent/5 text-accent",
          },
          {
            icon: "shield",
            title: "Cryptographic Hash Chain",
            body: "Each entry stores its own SHA-256 hash and the hash of the previous entry. Any tampering breaks the chain and is immediately detectable. Verification runs automatically on each append.",
            tone: "border-pos/20 bg-pos/5 text-pos",
          },
          {
            icon: "flask",
            title: "Full Reproducibility",
            body: "Given a named PIT snapshot ID and the audit log up to any seq#, every system state is exactly reproducible. Backtests, risk runs, and compliance decisions can all be re-derived from first principles.",
            tone: "border-ai/20 bg-ai/5 text-ai",
          },
        ].map((c) => (
          <Panel key={c.title} className={`border ${c.tone.split(" ")[0]}`}>
            <div className="p-4">
              <div className={`mb-3 grid h-8 w-8 place-items-center rounded border ${c.tone}`}>
                <Icon name={c.icon} width={14} height={14} />
              </div>
              <div className="font-mono text-sm font-semibold text-ink">{c.title}</div>
              <p className="mt-2 text-xs leading-relaxed text-muted">{c.body}</p>
            </div>
          </Panel>
        ))}
      </div>

      {/* Filter chips (visual only — server rendered) */}
      <Panel>
        <PanelHeader
          title="Immutable Log — Recent Entries"
          right={
            <div className="flex items-center gap-2">
              <Chip tone="pos" dot>Chain intact</Chip>
              <Chip tone="default">seq# 48,210–48,221</Chip>
            </div>
          }
        />
        {/* Filter bar */}
        <div className="flex flex-wrap gap-2 border-b border-line px-4 py-2.5">
          {FILTER_CHIPS.map((f) => (
            <span
              key={f.label}
              className={`chip cursor-default select-none ${f.active ? "chip-accent" : ""}`}
            >
              {f.label}
              <span className={`ml-1 font-mono text-[10px] ${f.active ? "text-accent" : "text-dim"}`}>
                {f.count}
              </span>
            </span>
          ))}
          <span className="ml-auto text-xs text-dim self-center">Showing all modules · server-rendered snapshot</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse">
            <thead>
              <tr>
                <Th>Seq #</Th>
                <Th>Timestamp (UTC)</Th>
                <Th>Actor</Th>
                <Th>Action</Th>
                <Th>Object / Detail</Th>
                <Th>Module</Th>
                <Th>Hash</Th>
              </tr>
            </thead>
            <tbody>
              {AUDIT_LOG.map((entry, i) => (
                <tr key={entry.seq} className={`group transition-colors hover:bg-elevated/40 ${i === 0 ? "bg-elevated/20" : ""}`}>
                  <Td mono className="text-accent font-semibold">
                    {entry.seq.toLocaleString()}
                  </Td>
                  <Td mono className="text-dim text-xs whitespace-nowrap">
                    {entry.ts}
                  </Td>
                  <Td mono className="text-muted text-xs">
                    {entry.actor}
                  </Td>
                  <Td mono className="text-ink text-xs font-medium">
                    {entry.action}
                  </Td>
                  <Td mono={false} className="text-muted text-xs max-w-[280px]">
                    {entry.object}
                  </Td>
                  <Td mono={false}>
                    <span className={`chip text-[9px] ${MODULE_COLOR[entry.module]}`}>
                      {entry.module.toUpperCase()}
                    </span>
                  </Td>
                  <Td mono className="text-dim text-xs">
                    <span title={`prev: ${entry.prevHash}`}>
                      {entry.hash}
                    </span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-2 divide-x divide-line border-t border-line md:grid-cols-4">
          {[
            { label: "ORDERS", count: AUDIT_LOG.filter((e) => e.module === "orders").length, color: "text-accent" },
            { label: "COMPLIANCE", count: AUDIT_LOG.filter((e) => e.module === "compliance").length, color: "text-warn" },
            { label: "RISK RUNS", count: AUDIT_LOG.filter((e) => e.module === "risk").length, color: "text-info" },
            { label: "DATA OPS", count: AUDIT_LOG.filter((e) => e.module === "data").length, color: "text-muted" },
          ].map((s) => (
            <div key={s.label} className="px-4 py-3">
              <div className="kpi-label">{s.label}</div>
              <div className={`mt-1 font-mono text-lg font-semibold ${s.color}`}>{s.count}</div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Technical notes */}
      <Panel>
        <PanelHeader title="Implementation Notes" right={<Chip tone="default">Architecture</Chip>} />
        <div className="grid gap-px bg-line md:grid-cols-2">
          {[
            { label: "Storage Backend", body: "Append-only Parquet files on object storage (S3/GCS). New partition per day. No row-level delete operations permitted at the storage layer." },
            { label: "Hash Chain Verification", body: "Each write computes SHA-256(prev_hash || seq || ts || actor || action || object) and stores it. Chain is verified asynchronously every 60 seconds — failures alert immediately." },
            { label: "Access Controls", body: "Read-only access to all users. Write access is restricted to the PANTHEON service accounts. Human users never write directly to the audit schema." },
            { label: "Regulatory Compatibility", body: "Log format is compatible with SEC Rule 17a-4 and FINRA 4370 requirements for electronic record-keeping. Export to standard formats on demand." },
          ].map((n) => (
            <div key={n.label} className="bg-panel p-4">
              <div className="flex items-start gap-2">
                <Check width={13} height={13} className="mt-0.5 shrink-0 text-pos" />
                <div>
                  <div className="font-mono text-xs font-semibold text-ink">{n.label}</div>
                  <p className="mt-1 text-xs leading-relaxed text-muted">{n.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
