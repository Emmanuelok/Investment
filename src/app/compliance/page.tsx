import { PageHeader, Panel, PanelHeader, Chip, KpiCard, Th, Td, Ticker, Stat, StatusDot } from "@/components/ui/kit";
import { ProgressBar, Ring } from "@/components/ui/viz";
import { Icon } from "@/components/icon-map";
import {
  SNAPSHOT_ID, COMPLIANCE_RULES, ACTIVE_BREACHES, PRETRADE_SCENARIO, AUDIT_TRAIL,
  type RuleStatus, type PreTradeResult,
} from "@/lib/data/aegis-risk";
import { fmtNum, fmtPct } from "@/lib/format";
import { cn } from "@/lib/cn";

export const metadata = { title: "Compliance Engine — AEGIS" };

/* ── helpers ─────────────────────────────────────────────────────────────── */
function ruleStatusChip(s: RuleStatus) {
  const map: Record<RuleStatus, { tone: "pos"|"warn"|"neg"|"default"; label: string }> = {
    PASS:    { tone: "pos",   label: "PASS" },
    WARN:    { tone: "warn",  label: "WARN" },
    BREACH:  { tone: "neg",   label: "BREACH" },
    PASSIVE: { tone: "warn",  label: "PASSIVE" },
  };
  const m = map[s];
  return <Chip tone={m.tone} dot>{m.label}</Chip>;
}

function preTradeChip(r: PreTradeResult) {
  const map: Record<PreTradeResult, { tone: "pos"|"warn"|"neg"; label: string }> = {
    PASS:  { tone: "pos",  label: "PASS" },
    WARN:  { tone: "warn", label: "WARN" },
    BLOCK: { tone: "neg",  label: "BLOCK" },
  };
  const m = map[r];
  return <Chip tone={m.tone} dot>{m.label}</Chip>;
}

/* ── Page ─────────────────────────────────────────────────────────────────── */
export default function CompliancePage() {
  const passCount   = COMPLIANCE_RULES.filter(r => r.status === "PASS").length;
  const warnCount   = COMPLIANCE_RULES.filter(r => r.status === "WARN").length;
  const breachCount = ACTIVE_BREACHES.filter(b => b.breachType === "ACTIVE").length;
  const passiveCount= ACTIVE_BREACHES.filter(b => b.breachType === "PASSIVE").length;
  const totalRules  = COMPLIANCE_RULES.length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <PageHeader
        module={{ name: "AEGIS · Risk & Execution", tone: "accent" }}
        title="Compliance Engine"
        desc="Declarative rule evaluation, pre-trade checks, and an immutable audit trail. Every compliance decision is version-controlled and reproducible. All rule evaluations linked to the snapshot id."
        right={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded border border-accent/30 bg-accent/10 px-2.5 py-1.5 font-mono text-xs text-accent">
              <Icon name="database" width={12} height={12} />
              {SNAPSHOT_ID}
            </div>
            <button className="btn">
              <Icon name="book" width={14} height={14} />
              Audit Trail
            </button>
            <button className="btn btn-accent">
              <Icon name="shield" width={14} height={14} />
              Run Full Check
            </button>
          </div>
        }
      />

      {/* KPI deck */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          label="Rules Passing"
          value={`${passCount} / ${totalRules}`}
          sub="Full compliance scan at 09:30"
          icon={<Icon name="shield" width={15} height={15} />}
          tone="pos"
        />
        <KpiCard
          label="Warnings"
          value={warnCount.toString()}
          sub="Approaching limit threshold"
          icon={<Icon name="bell" width={15} height={15} />}
          tone="warn"
        />
        <KpiCard
          label="Active Breaches"
          value={breachCount.toString()}
          sub="Requires immediate action"
          icon={<Icon name="bolt" width={15} height={15} />}
          tone={breachCount > 0 ? "neg" : "pos"}
        />
        <KpiCard
          label="Passive Breaches"
          value={passiveCount.toString()}
          sub="Mark-to-market drift · 10BD window"
          icon={<Icon name="activity" width={15} height={15} />}
          tone={passiveCount > 0 ? "warn" : "pos"}
        />
      </div>

      {/* Compliance health ring + summary */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel className="flex items-center gap-6 px-6 py-5">
          <Ring
            value={passCount}
            max={totalRules}
            size={96}
            stroke={8}
            color={passiveCount > 0 || warnCount > 0 ? "var(--warn)" : "var(--pos)"}
            label={`${Math.round((passCount / totalRules) * 100)}%`}
            sub="compliant"
          />
          <div className="flex-1 space-y-3">
            <Stat label="Rules Evaluated" value={totalRules.toString()} />
            <Stat label="Regulations" value="UCITS IV · AIFMD · Dodd-Frank · EMIR" mono={false} />
            <Stat label="Last Full Scan" value="2026-06-08 09:30:02" />
            <Stat label="Scan Engine" value="v2.4.1 — immutable" />
          </div>
        </Panel>

        {/* Active breach spotlight */}
        <Panel className="lg:col-span-2">
          <PanelHeader
            title="Active Breaches & Monitoring Flags"
            sub="Breaches require documented remediation — linked to audit ledger"
            right={<Chip tone="warn">Requires attention</Chip>}
          />
          {ACTIVE_BREACHES.map((b) => (
            <div key={b.id} className="border-b border-line px-4 py-4 last:border-0">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-dim">{b.id}</span>
                  <Chip tone={b.severity === "HIGH" ? "neg" : b.severity === "MED" ? "warn" : "default"}>
                    {b.severity}
                  </Chip>
                  <Chip tone={b.breachType === "ACTIVE" ? "neg" : "warn"}>{b.breachType}</Chip>
                  <Chip tone={b.status === "OPEN" ? "neg" : b.status === "REMEDIATION" ? "warn" : "info"}>
                    {b.status}
                  </Chip>
                </div>
                <span className="font-mono text-xs text-dim">Due: {b.dueDate}</span>
              </div>
              <div className="mt-2 font-medium text-sm text-ink">{b.rule}</div>
              <div className="mt-1 text-xs text-muted leading-relaxed">{b.detail}</div>
              <div className="mt-2 flex items-center gap-4 text-xs text-dim">
                <span>Fund: <span className="text-muted">{b.fund}</span></span>
                <span>Detected: <span className="text-muted">{b.detectedAt}</span></span>
                <span>Owner: <span className="text-muted">{b.owner}</span></span>
              </div>
            </div>
          ))}
        </Panel>
      </div>

      {/* Full rule list */}
      <Panel>
        <PanelHeader
          title="Declarative Rule Library — Full Evaluation"
          sub="Rules evaluated at every position change and full scan at market open · UCITS, AIFMD, Dodd-Frank, internal policy"
          right={
            <div className="flex items-center gap-2">
              <Chip tone="pos">{passCount} PASS</Chip>
              <Chip tone="warn">{warnCount + passiveCount} WARN/PASSIVE</Chip>
            </div>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] border-collapse">
            <thead>
              <tr>
                <Th>Rule ID</Th>
                <Th>Rule</Th>
                <Th>Category</Th>
                <Th>Fund</Th>
                <Th right>Limit</Th>
                <Th right>Current</Th>
                <Th right>Utilization</Th>
                <Th>Regulation</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {COMPLIANCE_RULES.map((rule) => {
                // For rules where current > limit that's a breach, otherwise gauge fill
                const isBreach = rule.status === "BREACH" || rule.status === "PASSIVE";
                const isWarn   = rule.status === "WARN";
                const pct = rule.limitVal > 0 ? Math.min((rule.currentVal / rule.limitVal) * 100, 120) : 0;
                const barColor = isBreach ? "var(--warn)" : isWarn ? "var(--warn)" : "var(--pos)";
                return (
                  <tr key={rule.id}
                    className={cn(
                      "transition-colors hover:bg-elevated/40",
                      isBreach && "bg-warn/5",
                    )}
                  >
                    <Td>
                      <span className="font-mono text-xs text-dim">{rule.id}</span>
                    </Td>
                    <Td mono={false} className="max-w-[220px] font-medium text-muted">
                      {rule.rule}
                    </Td>
                    <Td mono={false}>
                      <Chip tone="default">{rule.category}</Chip>
                    </Td>
                    <Td mono={false}>
                      <span className="font-mono text-xs text-dim">{rule.fund}</span>
                    </Td>
                    <Td right className="text-dim">{rule.limit}</Td>
                    <Td right className={cn(isBreach ? "text-warn font-semibold" : isWarn ? "text-warn" : "text-muted")}>
                      {rule.current}
                    </Td>
                    <Td right>
                      {rule.limitVal > 0 ? (
                        <div className="flex items-center justify-end gap-2">
                          <ProgressBar
                            value={Math.min(pct, 100)}
                            max={100}
                            color={barColor}
                            height={4}
                            className="w-20"
                          />
                          <span className={cn("w-10 text-right font-mono text-xs tabular-nums",
                            pct > 100 ? "text-warn" : pct > 85 ? "text-warn" : "text-muted")}>
                            {fmtPct(Math.min(pct, 100), 0)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-dim">—</span>
                      )}
                    </Td>
                    <Td mono={false}>
                      <span className="text-xs text-dim">{rule.regulation}</span>
                    </Td>
                    <Td>
                      {ruleStatusChip(rule.status)}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Pre-trade check simulator */}
      <Panel glow>
        <PanelHeader
          title="Pre-Trade Check Simulator"
          sub="Proposed order evaluated against all active rules before submission — BLOCK/WARN/PASS result logged to audit trail"
          right={
            <div className="flex items-center gap-2">
              <Chip tone={PRETRADE_SCENARIO.overall === "PASS" ? "pos" : PRETRADE_SCENARIO.overall === "WARN" ? "warn" : "neg"} dot>
                Overall: {PRETRADE_SCENARIO.overall}
              </Chip>
            </div>
          }
        />
        <div className="grid gap-4 p-4 md:grid-cols-3">
          {/* Order details */}
          <div className="space-y-3">
            <div className="section-label text-[11px] text-muted">Proposed Order</div>
            <div className="rounded border border-line bg-elevated/30 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Ticker sym={PRETRADE_SCENARIO.sym} name="NVIDIA Corp" />
                <Chip tone={PRETRADE_SCENARIO.side === "BUY" ? "pos" : "neg"}>
                  {PRETRADE_SCENARIO.side}
                </Chip>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <Stat label="Quantity" value={PRETRADE_SCENARIO.qty.toLocaleString()} />
                <Stat label="Notional" value={`$${fmtNum(PRETRADE_SCENARIO.notional, 3)}M`} />
                <Stat label="Fund" value={PRETRADE_SCENARIO.fund} />
                <Stat label="Instrument" value="Equity" />
              </div>
              <div className="pt-2">
                <div className="section-label text-[11px] text-muted mb-1">Order Result</div>
                <div className={cn(
                  "flex items-center gap-2 rounded border px-3 py-2",
                  PRETRADE_SCENARIO.overall === "PASS" ? "border-pos/30 bg-pos/10" :
                  PRETRADE_SCENARIO.overall === "WARN" ? "border-warn/30 bg-warn/10" :
                  "border-neg/30 bg-neg/10"
                )}>
                  <StatusDot tone={PRETRADE_SCENARIO.overall === "PASS" ? "pos" : PRETRADE_SCENARIO.overall === "WARN" ? "warn" : "neg"} pulse />
                  <span className={cn("font-mono text-sm font-semibold",
                    PRETRADE_SCENARIO.overall === "PASS" ? "text-pos" :
                    PRETRADE_SCENARIO.overall === "WARN" ? "text-warn" : "text-neg")}>
                    {PRETRADE_SCENARIO.overall} — Order {PRETRADE_SCENARIO.overall === "BLOCK" ? "Rejected" : PRETRADE_SCENARIO.overall === "WARN" ? "Requires Approval" : "Permitted"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Check results */}
          <div className="md:col-span-2 space-y-2">
            <div className="section-label text-[11px] text-muted">Rule Check Results</div>
            {PRETRADE_SCENARIO.checks.map((chk) => (
              <div key={chk.rule}
                className={cn(
                  "flex items-start gap-3 rounded border p-3",
                  chk.result === "PASS" ? "border-line bg-elevated/20" :
                  chk.result === "WARN" ? "border-warn/20 bg-warn/5" :
                  "border-neg/20 bg-neg/5"
                )}>
                <span className="mt-0.5 shrink-0">{preTradeChip(chk.result)}</span>
                <div className="flex-1">
                  <div className="text-sm font-medium text-muted">{chk.rule}</div>
                  <div className="mt-0.5 text-xs text-dim">{chk.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      {/* Audit trail */}
      <Panel>
        <PanelHeader
          title="Compliance Audit Trail"
          sub="Immutable log — every check, breach detection, acknowledgement, and override is permanently recorded"
          right={
            <div className="flex items-center gap-2">
              <StatusDot tone="pos" pulse />
              <span className="text-xs text-dim">Live · append-only</span>
            </div>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr>
                <Th>Time</Th>
                <Th>User</Th>
                <Th>Action</Th>
                <Th>Detail</Th>
                <Th>Rule</Th>
              </tr>
            </thead>
            <tbody>
              {AUDIT_TRAIL.map((a, i) => {
                const actionTone =
                  a.action === "BREACH LOGGED" ? "text-neg" :
                  a.action === "OVERRIDE REQ"  ? "text-warn" :
                  a.action === "ACK BREACH"    ? "text-warn" :
                  "text-muted";
                return (
                  <tr key={i} className="hover:bg-elevated/40 transition-colors">
                    <Td className="text-dim">{a.ts}</Td>
                    <Td className="text-accent">{a.user}</Td>
                    <Td className={actionTone}>{a.action}</Td>
                    <Td mono={false} className="max-w-[360px] text-xs text-dim">{a.detail}</Td>
                    <Td className="text-dim">{a.ruleId}</Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="border-t border-line px-4 py-2.5 text-xs text-dim">
          All audit records are cryptographically chained and stored in the AEGIS compliance ledger.
          DEMO DATA — live system streams real-time events.
        </div>
      </Panel>

      {/* Remediation workflow */}
      <Panel>
        <PanelHeader
          title="Remediation Workflow — BR-2026-042"
          sub="Tech sector passive breach (NVDA appreciation) · FUND-II · Due: 2026-06-20"
          right={<Chip tone="warn">MONITORING</Chip>}
        />
        <div className="p-4">
          <div className="flex items-start gap-3 overflow-x-auto pb-2">
            {[
              { step: "1", label: "Detection",       status: "done",    ts: "Jun 06 09:30", detail: "Auto-detected by AEGIS compliance scan" },
              { step: "2", label: "Classification",  status: "done",    ts: "Jun 06 09:30", detail: "Classified as PASSIVE (mark-to-market)" },
              { step: "3", label: "PM Notification", status: "done",    ts: "Jun 06 09:31", detail: "J. Harrison notified by system" },
              { step: "4", label: "PM Ack",          status: "done",    ts: "Jun 06 09:32", detail: "PM acknowledged, remediation plan filed" },
              { step: "5", label: "Remediation",     status: "active",  ts: "In progress",  detail: "Trim 2% NVDA within 10 BD per §7.4" },
              { step: "6", label: "Compliance Rev",  status: "pending", ts: "Due Jun 20",   detail: "Compliance sign-off after position trim" },
              { step: "7", label: "Close",           status: "pending", ts: "Pending",      detail: "Breach closed when CR-002 ≤ 30%" },
            ].map((s) => (
              <div key={s.step} className="flex shrink-0 flex-col items-center gap-1">
                <div className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border font-mono text-sm font-semibold",
                  s.status === "done"    && "border-pos bg-pos/20 text-pos",
                  s.status === "active"  && "border-warn bg-warn/20 text-warn animate-pulse-soft",
                  s.status === "pending" && "border-line bg-elevated text-dim",
                )}>
                  {s.status === "done" ? "✓" : s.step}
                </div>
                <div className="w-24 text-center text-2xs font-medium text-muted">{s.label}</div>
                <div className="w-24 text-center font-mono text-2xs text-dim">{s.ts}</div>
                <div className="w-24 text-center text-2xs text-dim leading-tight">{s.detail}</div>
                {/* connector */}
              </div>
            ))}
          </div>
        </div>
      </Panel>
    </div>
  );
}
