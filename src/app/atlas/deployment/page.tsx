import { PageHeader, Panel, PanelHeader, Chip, KpiCard, Th, Td, StatusDot } from "@/components/ui/kit";
import { ProgressBar } from "@/components/ui/viz";
import { Icon } from "@/components/icon-map";
import { Check, Clock, Layers, Shield, Warn } from "@/components/icons";
import {
  ENVIRONMENTS,
  PIPELINE_STAGES,
  K8S_DEPLOYMENTS,
  TF_MODULES,
  CANARY,
} from "@/lib/data/atlas-runtime";
import { fmtNum } from "@/lib/format";
import { cn } from "@/lib/cn";

export const metadata = { title: "Deployment & IaC · ATLAS" };

const PIPELINE_STATUS_STYLE: Record<string, { chip: string; dot: "pos" | "warn" | "neg" | "accent" | "info" | "default" }> = {
  pass:    { chip: "chip-pos",                                     dot: "pos"     },
  fail:    { chip: "chip-neg",                                     dot: "neg"     },
  running: { chip: "border-accent/30 bg-accent/10 text-accent",   dot: "accent"  },
  pending: { chip: "border-line bg-elevated/40 text-dim",         dot: "default" },
  skipped: { chip: "border-line bg-elevated/20 text-faint",       dot: "default" },
};

const ENV_STATUS_STYLE: Record<string, { chip: string; dot: "pos" | "warn" | "neg" | "accent" }> = {
  live:      { chip: "chip-pos",                                   dot: "pos"    },
  deploying: { chip: "border-accent/30 bg-accent/10 text-accent", dot: "accent" },
  canary:    { chip: "chip-warn",                                  dot: "warn"   },
  frozen:    { chip: "border-neg/30 bg-neg/10 text-neg",          dot: "neg"    },
};

const TF_STATE_STYLE: Record<string, string> = {
  applied: "chip-pos",
  drifted: "chip-warn",
  planned: "border-info/30 bg-info/10 text-info",
  failed:  "chip-neg",
};

export default function DeploymentPage() {
  const totalDeployed = K8S_DEPLOYMENTS.reduce((s, d) => s + d.ready, 0);
  const totalReplicas = K8S_DEPLOYMENTS.reduce((s, d) => s + d.replicas, 0);
  const driftedModules = TF_MODULES.filter((m) => m.state === "drifted").length;

  return (
    <div className="space-y-5">
      <PageHeader
        module={{ name: "ATLAS · Platform & Ops", tone: "info" }}
        title="Deployment & Infrastructure-as-Code"
        desc="Versioned, reproducible environments. Secrets injected from Vault at runtime — never baked into images. Blue-green canary deployments with automated health gates."
        right={
          <div className="flex items-center gap-2">
            <Chip tone="pos" dot>{totalDeployed}/{totalReplicas} pods ready</Chip>
            {driftedModules > 0 && <Chip tone="warn" dot>{driftedModules} TF drift</Chip>}
          </div>
        }
      />

      {/* KPI deck */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          label="ENVIRONMENTS"
          value="3"
          sub="dev · staging · production"
          icon={<Layers width={15} height={15} />}
        />
        <KpiCard
          label="SERVICES DEPLOYED"
          value="9"
          sub={`${totalDeployed}/${totalReplicas} pods ready · Kubernetes EKS`}
          tone="pos"
          icon={<Check width={15} height={15} />}
        />
        <KpiCard
          label="LAST DEPLOY"
          value="17:41 UTC"
          sub="dev · v4.9.0-dev · sha f1a4d37"
          icon={<Clock width={15} height={15} />}
        />
        <KpiCard
          label="ROLLOUT STRATEGY"
          value="Blue-Green"
          sub="5% canary → health gates → full prod promote"
          tone="accent"
          icon={<Shield width={15} height={15} />}
        />
      </div>

      {/* Environments table */}
      <Panel>
        <PanelHeader
          title="Environments"
          right={<Chip tone="default">Versioned · reproducible · hermetic</Chip>}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse">
            <thead>
              <tr>
                <Th>Environment</Th>
                <Th>Version</Th>
                <Th>Status</Th>
                <Th>Replicas</Th>
                <Th>Region</Th>
                <Th>Last Deploy</Th>
                <Th>Git SHA</Th>
                <Th>Namespace</Th>
              </tr>
            </thead>
            <tbody>
              {ENVIRONMENTS.map((env) => {
                const style = ENV_STATUS_STYLE[env.status];
                return (
                  <tr key={env.name} className="group transition-colors hover:bg-elevated/40">
                    <Td mono className="font-semibold text-ink uppercase">{env.name}</Td>
                    <Td mono className="text-accent">{env.version}</Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <StatusDot tone={style.dot} pulse={env.status === "live"} />
                        <span className={cn("chip text-[9px]", style.chip)}>{env.status}</span>
                      </div>
                    </Td>
                    <Td mono className="text-muted text-xs">{env.replicas}</Td>
                    <Td mono className="text-dim text-xs">{env.region}</Td>
                    <Td mono className="text-dim text-xs whitespace-nowrap">{env.lastDeploy}</Td>
                    <Td mono className="text-accent text-xs">{env.gitSha}</Td>
                    <Td mono className="text-dim text-xs">{env.namespace}</Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="border-t border-line px-4 py-2.5 text-xs text-dim">
          Each environment is a reproducible Helm release. Secrets injected from Vault at pod startup — never present in Docker images or Git.
        </div>
      </Panel>

      {/* CI/CD pipeline */}
      <Panel>
        <PanelHeader
          title="CI/CD Pipeline — v4.9.0-rc1 deploy"
          right={
            <div className="flex items-center gap-2">
              <Chip tone="accent" dot>Canary running</Chip>
              <Chip tone="default">GitHub Actions · ArgoCD</Chip>
            </div>
          }
        />
        <div className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            {PIPELINE_STAGES.map((stage, i) => {
              const style = PIPELINE_STATUS_STYLE[stage.status];
              const isLast = i === PIPELINE_STAGES.length - 1;
              return (
                <div key={stage.stage} className="flex items-center gap-2">
                  <div className="flex flex-col items-center gap-1.5 rounded border border-line bg-elevated/40 px-3 py-2.5 min-w-[100px]">
                    <div className="flex items-center gap-1.5">
                      <StatusDot tone={style.dot} pulse={stage.status === "running"} />
                      <span className="font-mono text-[11px] font-semibold text-ink uppercase">{stage.stage}</span>
                    </div>
                    <span className={cn("chip text-[9px]", style.chip)}>{stage.status}</span>
                    {stage.durationS > 0 && (
                      <span className="font-mono text-[10px] text-dim">{stage.durationS}s</span>
                    )}
                    {stage.status === "running" && (
                      <span className="font-mono text-[10px] text-accent animate-pulse-soft">in progress…</span>
                    )}
                    {stage.status === "pending" && (
                      <span className="font-mono text-[10px] text-dim">waiting</span>
                    )}
                  </div>
                  {!isLast && (
                    <span className="text-dim font-mono text-sm">→</span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-4 space-y-1.5">
            {PIPELINE_STAGES.map((stage) => (
              <div key={stage.stage} className="flex items-start gap-3 text-xs">
                <span className="w-28 shrink-0 font-mono font-medium text-muted">{stage.stage}</span>
                <span className="text-dim">{stage.detail}</span>
                <span className="ml-auto shrink-0 font-mono text-[10px] text-faint">{stage.runner}</span>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      {/* K8s + Canary row */}
      <div className="grid gap-4 xl:grid-cols-3">
        {/* K8s deployments */}
        <div className="xl:col-span-2">
          <Panel>
            <PanelHeader
              title="Kubernetes / Helm — Production Deployments"
              right={
                <div className="flex items-center gap-2">
                  <Chip tone="pos" dot>{totalDeployed}/{totalReplicas} ready</Chip>
                  <Chip tone="default">EKS · Helm v3</Chip>
                </div>
              }
            />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse">
                <thead>
                  <tr>
                    <Th>Service</Th>
                    <Th>Image</Th>
                    <Th right>Ready</Th>
                    <Th>CPU req/lim</Th>
                    <Th>Mem req/lim</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {K8S_DEPLOYMENTS.map((d) => (
                    <tr key={d.service} className="group transition-colors hover:bg-elevated/40">
                      <Td mono className="text-xs font-semibold text-ink">{d.service}</Td>
                      <Td mono className="text-[10px] text-dim">{d.image}</Td>
                      <Td right className={d.ready === d.replicas ? "text-pos" : "text-warn"}>
                        {d.ready}/{d.replicas}
                      </Td>
                      <Td mono className="text-xs text-muted">{d.cpuReq} / {d.cpuLim}</Td>
                      <Td mono className="text-xs text-muted">{d.memReq} / {d.memLim}</Td>
                      <Td>
                        <span className={cn("chip text-[9px]",
                          d.status === "Running"      ? "chip-pos" :
                          d.status === "CrashLooping" ? "chip-neg" : "chip-warn"
                        )}>
                          {d.status}
                        </span>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-line px-4 py-2.5 text-xs text-dim">
              HPA scales at 70% CPU · PodDisruptionBudgets ensure ≥ 1 replica per AZ at all times.
            </div>
          </Panel>
        </div>

        {/* Canary panel */}
        <Panel>
          <PanelHeader
            title="Canary Deploy — Health Gates"
            right={<Chip tone="warn" dot>5% traffic</Chip>}
          />
          <div className="p-4">
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm text-muted">Canary traffic</span>
                <span className="font-mono text-sm font-bold text-accent">{CANARY.trafficPct}%</span>
              </div>
              <ProgressBar value={CANARY.trafficPct} color="var(--accent)" height={8} className="mt-2" />
              <div className="mt-1 text-[10px] text-dim">
                {CANARY.version} → production gate · promote at 100%
              </div>
            </div>
            <div className="space-y-2.5">
              {CANARY.healthGates.map((g) => (
                <div key={g.gate} className="flex items-start gap-2">
                  {g.pass ? (
                    <Check width={13} height={13} className="mt-0.5 shrink-0 text-pos" />
                  ) : (
                    <Warn width={13} height={13} className="mt-0.5 shrink-0 text-neg" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-[11px] text-muted">{g.gate}</div>
                    <div className="mt-0.5 font-mono text-xs font-semibold text-ink">
                      {typeof g.value === "number" && g.value < 1
                        ? `${fmtNum(g.value, 3)}%`
                        : typeof g.value === "number" && g.value > 1
                        ? `${fmtNum(g.value, 1)} ms`
                        : `${g.value}`}
                    </div>
                  </div>
                  <span className={cn("chip text-[9px] shrink-0", g.pass ? "chip-pos" : "chip-neg")}>
                    {g.pass ? "PASS" : "FAIL"}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded border border-pos/20 bg-pos/5 px-3 py-2.5 text-xs text-pos">
              All gates passing — promote to prod scheduled after 30-min soak at 5%.
            </div>
          </div>
        </Panel>
      </div>

      {/* Terraform modules */}
      <Panel>
        <PanelHeader
          title="Terraform / IaC Modules"
          right={
            <div className="flex items-center gap-2">
              <Chip tone="pos">6 applied</Chip>
              <Chip tone="warn" dot>{driftedModules} drifted</Chip>
            </div>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr>
                <Th>Module</Th>
                <Th>Description</Th>
                <Th right>Resources</Th>
                <Th>State</Th>
                <Th>Version</Th>
                <Th>Last Apply</Th>
              </tr>
            </thead>
            <tbody>
              {TF_MODULES.map((m) => (
                <tr key={m.module} className={cn("group transition-colors hover:bg-elevated/40", m.state === "drifted" && "bg-warn/[0.03]")}>
                  <Td mono className="font-semibold text-ink">{m.module}</Td>
                  <Td mono={false} className="text-xs text-muted">{m.description}</Td>
                  <Td right className="text-muted">{m.resources}</Td>
                  <Td>
                    <span className={cn("chip text-[9px]", TF_STATE_STYLE[m.state])}>
                      {m.state.toUpperCase()}
                    </span>
                  </Td>
                  <Td mono className="text-xs text-dim">{m.version}</Td>
                  <Td mono className="text-xs text-dim whitespace-nowrap">{m.lastApply}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-line px-4 py-2.5 text-xs text-dim">
          Drifted modules have cloud state that diverges from plan — <span className="font-mono text-warn">tf plan</span> review required before next apply.
          All state is stored in S3 with DynamoDB locking. Secrets are referenced from Vault — never in TF state files.
        </div>
      </Panel>

      {/* Security note */}
      <Panel>
        <PanelHeader title="Secrets & Image Security" right={<Chip tone="info">Non-negotiable</Chip>} />
        <div className="grid gap-px bg-line md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: "lock",
              title: "Vault-injected Secrets",
              body: "Secrets are injected via Vault Agent Injector at pod start. No secret ever appears in a Dockerfile, .env, or CI log. Images are immutable once pushed.",
            },
            {
              icon: "shield",
              title: "Image Signing (Cosign)",
              body: "Every Docker image is signed with Cosign before push. Admission webhook rejects any pod running an unsigned image in staging and prod namespaces.",
            },
            {
              icon: "layers",
              title: "Reproducible Builds",
              body: "All build inputs (base images, npm lockfiles, Helm chart versions) are pinned by digest. The same Git SHA always produces the same image SHA256.",
            },
            {
              icon: "database",
              title: "IaC State Integrity",
              body: "Terraform state is stored in S3 with versioning + Object Lock. DynamoDB prevents concurrent applies. No human touches infra directly — all changes via plan/apply.",
            },
          ].map((c) => (
            <div key={c.title} className="bg-panel p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon name={c.icon} width={13} height={13} className="text-info" />
                <span className="font-mono text-xs font-semibold text-ink">{c.title}</span>
              </div>
              <p className="text-xs leading-relaxed text-muted">{c.body}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
