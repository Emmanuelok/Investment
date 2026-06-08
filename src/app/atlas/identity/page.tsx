import {
  PageHeader, Panel, PanelHeader, Chip, KpiCard,
  StatusDot, Th, Td,
} from "@/components/ui/kit";
import { Icon } from "@/components/icon-map";
import { Shield, Lock, Check, Warn } from "@/components/icons";
import { fmtInt } from "@/lib/format";
import {
  IDENTITY_KPIS,
  RBAC_SCOPES,
  ROLE_MATRIX,
  VAULT_SECRETS,
  ACCESS_AUDIT,
  S2S_AUTH_NOTES,
} from "@/lib/data/atlas-ops";

export const metadata = { title: "Identity, Auth & Secrets · ATLAS Platform & Ops" };

const SECRET_TYPE_TONE: Record<string, "warn" | "neg" | "accent" | "info" | "pos"> = {
  "broker-key":        "warn",
  "data-provider-key": "accent",
  "db-cred":           "neg",
  "signing-key":       "info",
  "oauth-secret":      "info",
  "mtls-cert":         "pos",
};

const SECRET_STATUS_TONE: Record<string, "pos" | "warn" | "neg"> = {
  active:             "pos",
  "expiring-soon":    "warn",
  expired:            "neg",
  "rotation-pending": "warn",
};

const AUDIT_ACTION_TONE: Record<string, "accent" | "warn" | "neg" | "pos"> = {
  read:   "accent",
  renew:  "pos",
  rotate: "warn",
  create: "pos",
  revoke: "neg",
};

export default function IdentityPage() {
  const expiringCount = VAULT_SECRETS.filter((s) => s.status === "expiring-soon" || s.status === "expired").length;

  return (
    <div className="space-y-5">
      <PageHeader
        module={{ name: "ATLAS · Platform & Ops", tone: "info" }}
        title="Identity, Auth & Secrets Vault"
        desc="SSO, RBAC, and HashiCorp Vault — zero-secrets-in-code policy, least-privilege per service, mTLS service-to-service auth."
        right={
          <div className="flex items-center gap-2">
            <Chip tone="pos" dot>SSO Active</Chip>
            {expiringCount > 0 && (
              <Chip tone="warn" dot>{expiringCount} secrets expiring</Chip>
            )}
          </div>
        }
      />

      {/* KPI deck */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          label="TOTAL USERS"
          value={IDENTITY_KPIS.totalUsers.toString()}
          sub="47 / 47 MFA enrolled"
          tone="info"
          icon={<Icon name="shield" width={15} height={15} />}
        />
        <KpiCard
          label="ACTIVE ROLES"
          value={IDENTITY_KPIS.activeRoles.toString()}
          sub="Admin → ReadOnly"
          icon={<Icon name="layers" width={15} height={15} />}
        />
        <KpiCard
          label="ACTIVE SESSIONS"
          value={IDENTITY_KPIS.activeSessions.toString()}
          sub="JWT + SSO sessions"
          tone="accent"
          icon={<Icon name="activity" width={15} height={15} />}
        />
        <KpiCard
          label="SECRETS STORED"
          value={IDENTITY_KPIS.secretsStored.toString()}
          sub={`${expiringCount} expiring soon`}
          tone={expiringCount > 0 ? "warn" : "pos"}
          icon={<Lock width={15} height={15} />}
        />
        <KpiCard
          label="LAST ROTATION"
          value="Jun 7"
          sub={IDENTITY_KPIS.lastRotation}
          icon={<Icon name="clock" width={15} height={15} />}
        />
        <KpiCard
          label="NEXT ROTATION"
          value="Jun 14"
          sub={IDENTITY_KPIS.nextRotation}
          tone="warn"
          icon={<Icon name="clock" width={15} height={15} />}
        />
      </div>

      {/* SSO note + RBAC matrix */}
      <Panel>
        <PanelHeader
          title="SSO + RBAC — Roles × Scopes Matrix"
          sub={`Provider: ${IDENTITY_KPIS.ssoProvider} · 100% MFA enforced`}
          right={
            <div className="flex items-center gap-2">
              <Chip tone="pos" dot>SSO healthy</Chip>
              <Chip tone="info">8 scopes · 7 roles</Chip>
            </div>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse">
            <thead>
              <tr>
                <Th>Role</Th>
                <Th right>Users</Th>
                <Th>MFA</Th>
                {RBAC_SCOPES.map((s) => (
                  <Th key={s.id} className="text-center px-2">
                    <span className="block text-[9px]">{s.label}</span>
                  </Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROLE_MATRIX.map((row) => (
                <tr key={row.role} className="group hover:bg-elevated/40 transition-colors">
                  <Td mono={false}>
                    <span className="font-mono text-xs font-semibold text-ink">{row.role}</span>
                  </Td>
                  <Td right className="text-xs text-muted">{row.userCount}</Td>
                  <Td mono={false}>
                    {row.mfa ? (
                      <div className="flex items-center gap-1 text-pos">
                        <Check width={12} height={12} />
                        <span className="text-[10px] font-mono">required</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-dim">
                        <span className="text-[10px] font-mono">optional</span>
                      </div>
                    )}
                  </Td>
                  {RBAC_SCOPES.map((s) => {
                    const granted = row.scopes[s.id] ?? false;
                    return (
                      <Td key={s.id} className="text-center px-2">
                        {granted ? (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-pos/10 border border-pos/25">
                            <Check width={11} height={11} className="text-pos" />
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-line/30">
                            <span className="text-dim text-xs">—</span>
                          </span>
                        )}
                      </Td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-line px-4 py-2.5 text-xs text-dim">
          Scopes enforce least-privilege. <span className="font-mono text-faint">exec:kill</span> restricted to Admin + Risk roles only. Service-to-service calls use separate short-lived tokens, not user-role credentials.
        </div>
      </Panel>

      {/* Secrets Vault table */}
      <Panel>
        <PanelHeader
          title="Secrets Vault (HashiCorp Vault)"
          sub="secret paths shown · VALUES MASKED — no secrets at rest outside Vault"
          right={
            <div className="flex items-center gap-2">
              <Chip tone="neg">VALUES MASKED ••••</Chip>
              <Chip tone="pos" dot>{VAULT_SECRETS.filter((s) => s.status === "active").length} active</Chip>
            </div>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] border-collapse">
            <thead>
              <tr>
                <Th>Secret Path</Th>
                <Th>Type</Th>
                <Th>Description</Th>
                <Th>Value</Th>
                <Th>Last Rotated</Th>
                <Th right>TTL (days)</Th>
                <Th>Status</Th>
                <Th>Consumers</Th>
              </tr>
            </thead>
            <tbody>
              {VAULT_SECRETS.map((s) => {
                const statusTone = SECRET_STATUS_TONE[s.status];
                const typeTone   = SECRET_TYPE_TONE[s.secretType] ?? "default";
                return (
                  <tr key={s.path} className="group hover:bg-elevated/40 transition-colors">
                    <Td className="text-[10px] max-w-[220px] truncate text-accent">
                      {s.path}
                    </Td>
                    <Td mono={false}>
                      <Chip tone={typeTone} className="text-[9px]">{s.secretType}</Chip>
                    </Td>
                    <Td mono={false} className="text-xs text-dim max-w-[180px]">{s.description}</Td>
                    <Td className="tracking-widest text-dim text-sm select-none">
                      ••••••••
                    </Td>
                    <Td className="text-xs text-muted">{s.lastRotated}</Td>
                    <Td right className={s.ttlDays <= 14 ? "text-warn" : "text-muted"}>{s.ttlDays}d</Td>
                    <Td mono={false}>
                      <div className="flex items-center gap-1.5">
                        <StatusDot tone={statusTone} pulse={s.status === "active"} />
                        <span className={`text-xs font-mono ${statusTone === "pos" ? "text-pos" : statusTone === "warn" ? "text-warn" : "text-neg"}`}>
                          {s.status}
                        </span>
                      </div>
                    </Td>
                    <Td mono={false}>
                      <div className="flex flex-wrap gap-1">
                        {s.consumers.slice(0, 3).map((c) => (
                          <span key={c} className="chip text-[9px]">{c}</span>
                        ))}
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-start gap-2 border-t border-line px-4 py-3 text-xs text-dim">
          <Lock width={14} height={14} className="mt-0.5 shrink-0 text-faint" />
          <span>
            No secrets in code or .env files — all pulled from Vault at container startup via <span className="font-mono text-faint">vault agent</span>. The <span className="font-mono text-faint">.env.example</span> documents required key names; values are always fetched at runtime. Expiring-soon = within 14 days of TTL.
          </span>
        </div>
      </Panel>

      {/* Bottom row: S2S auth + rotation schedule + access audit */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Service-to-service auth */}
        <Panel>
          <PanelHeader
            title="Service-to-Service Auth"
            sub="mTLS + short-lived JWT — zero long-lived shared secrets between services"
            right={<Chip tone="info">mTLS + JWT</Chip>}
          />
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <Th>From</Th>
                  <Th>To</Th>
                  <Th>Method</Th>
                  <Th>Note</Th>
                </tr>
              </thead>
              <tbody>
                {S2S_AUTH_NOTES.map((row, i) => (
                  <tr key={i} className="group hover:bg-elevated/40 transition-colors">
                    <Td mono={false}>
                      <span className="rounded border border-accent/20 bg-accent/5 px-1.5 py-0.5 font-mono text-[10px] text-accent">
                        {row.from}
                      </span>
                    </Td>
                    <Td mono={false}>
                      <span className="rounded border border-info/20 bg-info/5 px-1.5 py-0.5 font-mono text-[10px] text-info">
                        {row.to}
                      </span>
                    </Td>
                    <Td mono={false}>
                      <Chip tone={row.method.startsWith("mTLS") ? "pos" : "accent"} className="text-[9px]">
                        {row.method}
                      </Chip>
                    </Td>
                    <Td mono={false} className="text-xs text-dim">{row.note}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-line px-4 py-2.5 text-xs text-dim">
            Services authenticate to each other via Vault-issued mTLS leaf certs (90d) or ATLAS-identity-issued JWTs (1h). No service has standing read access to another service&apos;s secrets path.
          </div>
        </Panel>

        {/* Access Audit */}
        <Panel>
          <PanelHeader
            title="Access Audit Log"
            sub="Vault access events — actors, paths, results"
            right={
              <div className="flex items-center gap-2">
                {ACCESS_AUDIT.filter((a) => a.result === "deny").length > 0 && (
                  <Chip tone="neg" dot>
                    {ACCESS_AUDIT.filter((a) => a.result === "deny").length} denied
                  </Chip>
                )}
                <Chip tone="info">{ACCESS_AUDIT.length} recent</Chip>
              </div>
            }
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse">
              <thead>
                <tr>
                  <Th>ID</Th>
                  <Th>Actor</Th>
                  <Th>Secret Path</Th>
                  <Th>Action</Th>
                  <Th>Result</Th>
                  <Th>Time</Th>
                </tr>
              </thead>
              <tbody>
                {ACCESS_AUDIT.map((a) => (
                  <tr key={a.id} className={`group hover:bg-elevated/40 transition-colors ${a.result === "deny" ? "bg-neg/5" : ""}`}>
                    <Td className="text-[10px] text-dim">{a.id}</Td>
                    <Td mono={false} className="text-xs">
                      <div className="font-mono text-ink">{a.actor}</div>
                      <div className="text-[9px] text-dim">{a.role}</div>
                    </Td>
                    <Td className="text-[10px] text-dim max-w-[180px] truncate">
                      {a.secretPath.replace("secret/prod/", "…/")}
                    </Td>
                    <Td mono={false}>
                      <Chip tone={AUDIT_ACTION_TONE[a.action] ?? "default"} className="text-[9px]">
                        {a.action}
                      </Chip>
                    </Td>
                    <Td mono={false}>
                      <div className="flex items-center gap-1.5">
                        {a.result === "allow" ? (
                          <>
                            <Check width={12} height={12} className="text-pos" />
                            <span className="text-xs font-mono text-pos">allow</span>
                          </>
                        ) : (
                          <>
                            <Warn width={12} height={12} className="text-neg" />
                            <span className="text-xs font-mono text-neg">deny</span>
                          </>
                        )}
                      </div>
                    </Td>
                    <Td className="text-[10px] text-dim whitespace-nowrap">{a.ts}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-line px-4 py-2.5 text-xs text-dim">
            All Vault access is audit-logged and tamper-evident (HMAC). Denied accesses trigger PagerDuty alert within 60 seconds. Full log archived to S3 weekly.
          </div>
        </Panel>
      </div>

      {/* Rotation schedule panel */}
      <Panel>
        <PanelHeader
          title="Rotation Schedule & Least-Privilege Credentials"
          sub="Per-service credential segmentation — each service only holds the secrets it needs"
          right={<Chip tone="info">Zero shared secrets between services</Chip>}
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 p-4">
          {[
            { service: "AEGIS",    secrets: ["broker-key (Alpaca, IBKR)", "mtls-cert (→ KEPLER, HELIOS)"], rotationCycle: "90d / 90d" },
            { service: "OBSIDIAN", secrets: ["data-provider-key (Polygon, Refinitiv)", "db-cred (atlas-main)"], rotationCycle: "90d / 30d" },
            { service: "KEPLER",   secrets: ["db-cred (kepler-strategies)", "mtls-cert (→ AEGIS)", "JWT from ATLAS-identity"], rotationCycle: "30d / 90d / 1h" },
            { service: "ARGUS",    secrets: ["data-provider-key (QuiverQuant, Finnhub)", "JWT from ATLAS-identity"], rotationCycle: "365d / 1h" },
            { service: "HELIOS",   secrets: ["mtls-cert (→ AEGIS)", "JWT from ATLAS-identity"], rotationCycle: "90d / 1h" },
            { service: "ATLAS",    secrets: ["db-cred (atlas-main, redis)", "jwt-private-key", "audit-hmac", "okta-client-secret"], rotationCycle: "30d / 30d / 30d / 180d" },
          ].map((row) => (
            <div key={row.service} className="rounded border border-line bg-elevated/30 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold text-ink">{row.service}</span>
                <Chip tone="default" className="text-[9px]">{row.rotationCycle}</Chip>
              </div>
              <ul className="space-y-1">
                {row.secrets.map((s) => (
                  <li key={s} className="flex items-start gap-1.5 text-[11px] text-dim">
                    <Lock width={10} height={10} className="mt-0.5 shrink-0 text-faint" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="flex items-start gap-2 border-t border-line px-4 py-3 text-xs text-dim">
          <Shield width={14} height={14} className="mt-0.5 shrink-0 text-faint" />
          <span>
            Services use Vault dynamic secrets where supported (Postgres). JWT tokens are short-lived (1h) and not persisted. mTLS certs are issued per service-pair — no wildcard certs. Rotation is automated via <span className="font-mono text-faint">vault-secret-rotation</span> Dagster job every Sunday 02:00 UTC. DEMO DATA.
          </span>
        </div>
      </Panel>
    </div>
  );
}
