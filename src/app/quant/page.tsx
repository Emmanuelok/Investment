import { PageHeader, Panel, PanelHeader, Chip, Th, Td } from "@/components/ui/kit";
import { ProgressBar } from "@/components/ui/viz";
import { Icon } from "@/components/icon-map";
import { Database, Play, Bolt, Clock, Sparkle } from "@/components/icons";
import {
  DATASET_CATALOG,
  DSL_EXAMPLES,
  RECENT_EXPERIMENTS,
} from "@/lib/data/kepler";
import { fmtNum, fmtPct, signClass } from "@/lib/format";
import { cn } from "@/lib/cn";

export const metadata = { title: "KEPLER — Research Environment" };

const NOTEBOOK_TEMPLATES = [
  { id: "nb-01", name: "Alpha Discovery", desc: "Cross-sectional factor research with IC & decay analysis", tags: ["factor", "IC"], icon: "flask" },
  { id: "nb-02", name: "PIT Data Audit", desc: "Validate point-in-time semantics across dataset joins", tags: ["PIT", "audit"], icon: "database" },
  { id: "nb-03", name: "Signal IC Tearsheet", desc: "Full IC time-series, autocorrelation, and Fama–MacBeth", tags: ["IC", "tearsheet"], icon: "activity" },
  { id: "nb-04", name: "Turnover Budget", desc: "Estimate live turnover with realistic slippage assumptions", tags: ["execution", "slippage"], icon: "gauge" },
  { id: "nb-05", name: "Overfitting Audit", desc: "DSR, PBO (CSCV), multiple-testing correction (Holm–Bonferroni)", tags: ["DSR", "PBO", "CSCV"], icon: "shield" },
  { id: "nb-06", name: "Walk-Forward OOS", desc: "Anchored / rolling walk-forward with OOS decay tracker", tags: ["OOS", "walk-forward"], icon: "route" },
  { id: "nb-07", name: "Universe Construction", desc: "Point-in-time universe with survivorship-bias-free constituents", tags: ["universe", "PIT"], icon: "layers" },
  { id: "nb-08", name: "Factor Attribution", desc: "Decompose PnL into factor exposures with Barra-style attribution", tags: ["attribution", "risk"], icon: "bars" },
];

const statusTone = {
  pass: "pos",
  warn: "warn",
  fail: "neg",
} as const;

export default function QuantResearchPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        module={{ name: "KEPLER · Quant Lab", tone: "ai" }}
        title="Research Environment"
        desc="Point-in-time alpha discovery, dataset catalog, DSL playground, and overfitting-aware experiment tracking."
        right={
          <div className="flex items-center gap-2">
            <button className="btn">
              <Database width={14} height={14} />
              Dataset Catalog
            </button>
            <button className="btn btn-accent">
              <Bolt width={14} height={14} />
              New Experiment
            </button>
          </div>
        }
      />

      {/* PIT Guarantee Callout */}
      <div className="relative overflow-hidden rounded-md border border-accent/30 bg-accent/5 px-4 py-3.5">
        <div className="absolute inset-y-0 left-0 w-1 bg-accent" />
        <div className="flex flex-wrap items-center gap-3">
          <Icon name="shield" width={16} height={16} className="shrink-0 text-accent" />
          <div>
            <span className="font-mono text-sm font-semibold text-accent">POINT-IN-TIME GUARANTEE</span>
            <span className="ml-2 text-sm text-muted">
              Every research query enforces{" "}
              <code className="font-mono text-xs bg-accent/15 px-1 py-0.5 rounded text-accent">as_of ≤ t</code>
              — no future fundamental, estimate, or revision visible to the model at date t.
              Survivorship-bias-free universe. Restatements versioned. Look-ahead impossible by construction.
            </span>
          </div>
          <Chip tone="accent" className="ml-auto shrink-0">PIT enforced</Chip>
        </div>
      </div>

      {/* Notebook Templates Grid */}
      <Panel>
        <PanelHeader
          title="Notebook Templates"
          sub="Clone a template to start a reproducible research session"
          right={<Chip tone="ai"><Sparkle width={11} height={11} />AI-assisted</Chip>}
        />
        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          {NOTEBOOK_TEMPLATES.map((nb) => (
            <div
              key={nb.id}
              className="group flex cursor-pointer flex-col gap-2 rounded border border-line bg-elevated/40 p-3 transition-colors hover:border-accent/40 hover:bg-accent/5"
            >
              <div className="flex items-start justify-between">
                <Icon name={nb.icon} width={15} height={15} className="mt-0.5 shrink-0 text-accent" />
                <div className="flex flex-wrap gap-1">
                  {nb.tags.map((t) => (
                    <span key={t} className="font-mono text-2xs text-dim border border-line/60 rounded px-1">{t}</span>
                  ))}
                </div>
              </div>
              <div className="text-sm font-medium text-ink">{nb.name}</div>
              <div className="text-xs text-dim leading-relaxed">{nb.desc}</div>
              <div className="mt-auto flex items-center gap-1.5 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Play width={11} height={11} className="text-accent" />
                <span className="text-xs text-accent font-mono">Clone &amp; run</span>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Dataset Catalog */}
      <Panel>
        <PanelHeader
          title="Dataset Catalog — PIT Field Registry"
          sub="All fields carry as_of semantics; query engine enforces version ≤ t before join"
          right={<Chip tone="info">10 datasets · 2 not provisioned</Chip>}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse">
            <thead>
              <tr>
                <Th>Field(s)</Th>
                <Th>Dataset</Th>
                <Th right>Coverage %</Th>
                <Th>Frequency</Th>
                <Th>PIT Semantics</Th>
                <Th>Source</Th>
              </tr>
            </thead>
            <tbody>
              {DATASET_CATALOG.map((row) => {
                const covered = row.coverage > 0;
                return (
                  <tr key={row.field} className="group transition-colors hover:bg-elevated/40">
                    <Td mono className="font-mono text-xs text-accent max-w-[180px] truncate">
                      {row.field}
                    </Td>
                    <Td mono={false} className="font-medium text-sm text-ink">
                      {row.dataset}
                    </Td>
                    <Td right>
                      <div className="flex items-center justify-end gap-2">
                        <ProgressBar
                          value={row.coverage}
                          max={100}
                          color={row.coverage === 0 ? "var(--dim)" : row.coverage >= 90 ? "var(--pos)" : "var(--warn)"}
                          height={5}
                          className="w-16"
                        />
                        <span className={cn("font-mono text-xs tabular-nums", row.coverage === 0 ? "text-dim" : row.coverage >= 90 ? "text-pos" : "text-warn")}>
                          {row.coverage}%
                        </span>
                      </div>
                    </Td>
                    <Td mono={false} className="text-xs text-muted">{row.frequency}</Td>
                    <Td mono className="text-xs text-dim max-w-[240px]">
                      <code className="text-xs">{row.pit}</code>
                    </Td>
                    <Td mono={false} className="text-xs text-dim">
                      {covered ? row.source : (
                        <span className="flex items-center gap-1.5">
                          <Icon name="lock" width={11} height={11} className="text-neg" />
                          {row.source}
                        </span>
                      )}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-start gap-2 border-t border-line px-4 py-3 text-xs text-dim">
          <Icon name="shield" width={13} height={13} className="mt-0.5 shrink-0 text-accent" />
          <span>
            Query engine enforces temporal join integrity: every field read goes through{" "}
            <code className="font-mono text-2xs bg-elevated px-1 rounded">DataReader(as_of=date)</code> — future vintages physically excluded from the result set.
          </span>
        </div>
      </Panel>

      {/* Alpha DSL Playground + Operator Info */}
      <div className="grid gap-4 lg:grid-cols-5">
        <Panel className="lg:col-span-3">
          <PanelHeader
            title="Alpha Expression DSL — Static Playground"
            sub="Parsed server-side; live execution routed to Spark/Pandas compute when backend enabled"
            right={<Chip tone="warn">DEMO snapshot</Chip>}
          />
          <div className="space-y-4 p-4">
            {DSL_EXAMPLES.map((ex) => (
              <div key={ex.id} className="rounded border border-line bg-base p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-muted">{ex.label}</span>
                  <div className="flex gap-2">
                    <Chip tone="default">IC {ex.icMean.toFixed(3)}</Chip>
                    <Chip tone="default">IR {ex.icIr.toFixed(2)}</Chip>
                    <Chip tone="default">T/O {ex.turnover}%</Chip>
                    <Chip tone="default">t½ {ex.halfLife}d</Chip>
                  </div>
                </div>
                <pre className="overflow-x-auto rounded bg-elevated px-3 py-2.5 font-mono text-xs leading-relaxed text-accent">
                  <code>{ex.expr}</code>
                </pre>
              </div>
            ))}
          </div>
          <div className="border-t border-line px-4 py-3 text-xs text-dim">
            Operators are vectorized over the full universe × time; output is a cross-sectional score per date.
            PIT fields resolved automatically from <code className="font-mono text-2xs bg-elevated px-1 rounded">as_of</code>.
          </div>
        </Panel>

        <Panel className="lg:col-span-2">
          <PanelHeader title="DSL Output Stats — exp-0041" sub="Momentum + Insider Fusion · Russell 1000" />
          <div className="grid grid-cols-2 gap-px border-b border-line">
            {[
              { label: "IC Mean", value: "0.068", tone: "pos" as const },
              { label: "IC IR", value: "1.14", tone: "pos" as const },
              { label: "IC t-stat", value: "4.82", tone: "pos" as const },
              { label: "Turnover", value: "18.3%", tone: undefined },
              { label: "Half-life", value: "12d", tone: undefined },
              { label: "Uni. size", value: "~980", tone: undefined },
              { label: "Test period", value: "252d", tone: undefined },
              { label: "OOS IC", value: "0.041", tone: "warn" as const },
            ].map((s) => (
              <div key={s.label} className="flex flex-col gap-0.5 px-4 py-3">
                <span className="kpi-label">{s.label}</span>
                <span className={cn("font-mono text-lg tabular-nums", s.tone === "pos" ? "text-pos" : s.tone === "warn" ? "text-warn" : "text-ink")}>
                  {s.value}
                </span>
              </div>
            ))}
          </div>
          <div className="px-4 py-3">
            <div className="text-xs font-medium text-muted mb-2">IC Time-Series (60d rolling)</div>
            <div className="flex items-end gap-[2px] h-12">
              {[0.04,0.06,0.07,0.08,0.07,0.05,0.06,0.09,0.07,0.06,0.08,0.07,0.04,0.06,0.07,0.05,0.06,0.07,0.08,0.06].map((v, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-[1px]"
                  style={{ height: `${(v / 0.10) * 100}%`, background: "var(--pos)", opacity: 0.6 + 0.4 * (v / 0.10) }}
                />
              ))}
            </div>
          </div>
          <div className="border-t border-line px-4 py-3">
            <div className="flex items-start gap-2 text-xs text-dim">
              <Icon name="shield" width={12} height={12} className="mt-0.5 shrink-0 text-warn" />
              <span>OOS IC degradation detected: 0.068 → 0.041 (−40%). Consider wider universe or shorter hold.</span>
            </div>
          </div>
        </Panel>
      </div>

      {/* Recent Experiments */}
      <Panel>
        <PanelHeader
          title="Recent Experiments — Logged Runs"
          sub="Every run records seed, universe, parameter set, and full overfitting diagnostics"
          right={
            <div className="flex items-center gap-2">
              <Chip tone="warn">High IS Sharpe = WARNING</Chip>
              <Chip tone="ai"><Sparkle width={11} height={11} />Auto-log</Chip>
            </div>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border-collapse">
            <thead>
              <tr>
                <Th>ID</Th>
                <Th>Name</Th>
                <Th>Universe</Th>
                <Th right>IC Mean</Th>
                <Th right>IC IR</Th>
                <Th right>Sharpe IS</Th>
                <Th right>Sharpe OOS</Th>
                <Th right>OOS Decay</Th>
                <Th right>DSR</Th>
                <Th right>PBO</Th>
                <Th right>Trials</Th>
                <Th>Status</Th>
                <Th>Run At</Th>
              </tr>
            </thead>
            <tbody>
              {RECENT_EXPERIMENTS.map((exp) => {
                const oosWarn = exp.oosDecay > 50;
                const pboWarn = exp.pbo > 0.4;
                return (
                  <tr key={exp.id} className="group transition-colors hover:bg-elevated/40">
                    <Td className="text-xs text-dim">{exp.id}</Td>
                    <Td mono={false} className="font-medium text-sm text-ink whitespace-nowrap">{exp.name}</Td>
                    <Td mono={false} className="text-xs text-dim">{exp.universe}</Td>
                    <Td right className={signClass(exp.icMean)}>{exp.icMean.toFixed(3)}</Td>
                    <Td right className={signClass(exp.icIr)}>{exp.icIr.toFixed(2)}</Td>
                    <Td right className={exp.sharpeIS > 2.0 ? "text-warn font-semibold" : "text-ink"}>
                      {fmtNum(exp.sharpeIS)}
                      {exp.sharpeIS > 2.0 && <span className="ml-1 text-warn">⚠</span>}
                    </Td>
                    <Td right className={exp.sharpeOOS < 0.8 ? "text-neg" : exp.sharpeOOS < 1.2 ? "text-warn" : "text-pos"}>
                      {fmtNum(exp.sharpeOOS)}
                    </Td>
                    <Td right className={oosWarn ? "text-neg font-semibold" : "text-muted"}>
                      {fmtPct(exp.oosDecay, 0)}
                    </Td>
                    <Td right className={exp.dsr < 0.8 ? "text-warn" : "text-pos"}>{fmtNum(exp.dsr)}</Td>
                    <Td right className={pboWarn ? "text-neg font-semibold" : "text-muted"}>{fmtNum(exp.pbo)}</Td>
                    <Td right className="text-dim">{exp.trials}</Td>
                    <Td>
                      <Chip tone={statusTone[exp.status]} dot>{exp.status.toUpperCase()}</Chip>
                    </Td>
                    <Td mono className="text-xs text-dim whitespace-nowrap">
                      <span className="flex items-center gap-1">
                        <Clock width={10} height={10} />
                        {exp.runAt}
                      </span>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="border-t border-line px-4 py-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 text-xs text-dim">
            <div className="flex items-start gap-1.5">
              <Icon name="shield" width={12} height={12} className="mt-0.5 text-warn shrink-0" />
              <span><span className="text-warn font-medium">IS Sharpe &gt; 2.0</span> triggers automatic overfitting review. A high in-sample Sharpe is a red flag, not a success signal.</span>
            </div>
            <div className="flex items-start gap-1.5">
              <Icon name="shield" width={12} height={12} className="mt-0.5 text-neg shrink-0" />
              <span><span className="text-neg font-medium">OOS Decay &gt; 50%</span> or <span className="text-neg font-medium">PBO &gt; 0.40</span> → auto-flagged FAIL. Strategy blocked from backtest promotion.</span>
            </div>
            <div className="flex items-start gap-1.5">
              <Icon name="database" width={12} height={12} className="mt-0.5 text-accent shrink-0" />
              <span>Every run stores: seed, as_of range, universe constituents, parameters. <span className="text-accent">Bit-for-bit reproducible</span> from the run ID.</span>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}
