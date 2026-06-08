import { PageHeader, Panel, PanelHeader, Chip, KpiCard, Stat, Th, Td, Ticker, StatusDot } from "@/components/ui/kit";
import { Sparkline, ProgressBar, Ring } from "@/components/ui/viz";
import { Icon } from "@/components/icon-map";
import { Bolt, Sparkle, Activity, Target } from "@/components/icons";
import { SCANNER_SETUPS } from "@/lib/data/helios";
import { fmtUsd, fmtSignedPct, signClass, fmtCompact } from "@/lib/format";
import { priceWalk } from "@/lib/rng";

export const metadata = { title: "HELIOS — AI Scanner" };

const SETUP_TONES = {
  "ARGUS-Signal": "ai",
  "Breakout":     "accent",
  "Momentum":     "pos",
  "Absorption":   "info",
  "Sweep":        "warn",
} as const;

const FILTER_CHIPS = [
  { label: "All setups",   active: true  },
  { label: "ARGUS only",   active: false },
  { label: "Breakout",     active: false },
  { label: "Momentum",     active: false },
  { label: "Absorption",   active: false },
  { label: "Sweep",        active: false },
  { label: "Gap ≥ 2%",     active: false },
  { label: "RelVol ≥ 2×",  active: false },
  { label: "Order-flow +", active: false },
  { label: "Score ≥ 75",   active: false },
];

// Top setup for ATHENA explanation panel
const TOP_SETUP = SCANNER_SETUPS[0];

export default function ScannerPage() {
  const argusCount = SCANNER_SETUPS.filter((s) => s.argus).length;
  const highScoreCount = SCANNER_SETUPS.filter((s) => s.score >= 75).length;
  const avgScore = SCANNER_SETUPS.reduce((s, r) => s + r.score, 0) / SCANNER_SETUPS.length;

  return (
    <div className="space-y-5">
      <PageHeader
        module={{ name: "HELIOS · Charts & Order Flow", tone: "info" }}
        title="AI Scanner — Trade Ideas"
        desc="Real-time ranked setups combining technical triggers, order flow signals, and ARGUS multi-family AI analysis. Powered by ATHENA."
        right={
          <div className="flex items-center gap-2">
            <StatusDot tone="pos" pulse />
            <span className="text-xs text-dim">Scanning {SCANNER_SETUPS.length} setups</span>
            <button className="btn btn-accent">
              <Sparkle width={14} height={14} />
              Run ATHENA Scan
            </button>
          </div>
        }
      />

      {/* KPI deck */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-5">
        <KpiCard
          label="ACTIVE SETUPS"
          value={String(SCANNER_SETUPS.length)}
          sub="across all types"
          icon={<Icon name="target" width={14} height={14} />}
        />
        <KpiCard
          label="ARGUS SIGNALS"
          value={String(argusCount)}
          sub="multi-family fused"
          tone="accent"
          icon={<Sparkle width={14} height={14} />}
        />
        <KpiCard
          label="HIGH CONVICTION"
          value={String(highScoreCount)}
          sub="score ≥ 75"
          tone="pos"
          icon={<Target width={14} height={14} />}
        />
        <KpiCard
          label="AVG SCORE"
          value={avgScore.toFixed(0)}
          sub="out of 100"
          icon={<Activity width={14} height={14} />}
        />
        <KpiCard
          label="TOP SCORE"
          value={String(SCANNER_SETUPS[0].score)}
          sub={SCANNER_SETUPS[0].sym}
          tone="ai"
          icon={<Bolt width={14} height={14} />}
        />
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap items-center gap-2">
        <Icon name="filter" width={14} height={14} className="text-dim" />
        <span className="section-label mr-1">Filter:</span>
        {FILTER_CHIPS.map((f) => (
          <button key={f.label} className={`chip cursor-pointer ${f.active ? "chip-accent" : "hover:bg-elevated/60"}`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Main setups table */}
      <Panel>
        <PanelHeader
          title="Ranked Setups — All Types"
          right={<Chip tone="ai"><Sparkle width={11} height={11} /> ATHENA ranked</Chip>}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse">
            <thead>
              <tr>
                <Th>Symbol</Th>
                <Th>Setup Type</Th>
                <Th right>Score</Th>
                <Th>Trigger</Th>
                <Th right>Price</Th>
                <Th right>Chg %</Th>
                <Th right>Rel Vol</Th>
                <Th right>Spark</Th>
                <Th right>ARGUS</Th>
              </tr>
            </thead>
            <tbody>
              {SCANNER_SETUPS.map((row, i) => {
                const spark = priceWalk(`scanner-${row.sym}`, 30, row.price, 0.012, row.chgPct / 100 / 30);
                const tone = SETUP_TONES[row.setup as keyof typeof SETUP_TONES] ?? "default";
                return (
                  <tr key={i} className="group transition-colors hover:bg-elevated/40">
                    <Td mono={false}>
                      <Ticker sym={row.sym} name={row.name} />
                    </Td>
                    <Td mono={false}>
                      <Chip tone={tone as "ai" | "accent" | "pos" | "info" | "warn"}>
                        {row.setup}
                      </Chip>
                    </Td>
                    <Td right>
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16">
                          <ProgressBar
                            value={row.score}
                            max={100}
                            height={5}
                            color={
                              row.score >= 85
                                ? "var(--ai)"
                                : row.score >= 70
                                ? "var(--accent)"
                                : "var(--info)"
                            }
                            showGlow={row.score >= 85}
                          />
                        </div>
                        <span className={`text-sm ${row.score >= 85 ? "text-ai" : row.score >= 70 ? "text-accent" : "text-muted"}`}>
                          {row.score}
                        </span>
                      </div>
                    </Td>
                    <Td mono={false} className="max-w-[260px] text-muted">
                      <span className="text-xs">{row.trigger}</span>
                    </Td>
                    <Td right>
                      {fmtUsd(row.price, row.price > 1000 ? 0 : 2)}
                    </Td>
                    <Td right className={signClass(row.chgPct)}>
                      {fmtSignedPct(row.chgPct)}
                    </Td>
                    <Td right className={row.relVol >= 2.5 ? "text-warn" : row.relVol >= 1.8 ? "text-accent" : "text-muted"}>
                      {row.relVol.toFixed(1)}×
                    </Td>
                    <Td right>
                      <Sparkline data={spark} width={80} height={24} />
                    </Td>
                    <Td right>
                      {row.argus ? (
                        <Chip tone="ai"><Sparkle width={10} height={10} /> AI</Chip>
                      ) : (
                        <span className="text-dim">—</span>
                      )}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* ATHENA explanation panel */}
      <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
        <Panel glow>
          <PanelHeader
            title="ATHENA — Idea Explanation"
            sub={`Top setup: ${TOP_SETUP.sym} · ${TOP_SETUP.setup} · Score ${TOP_SETUP.score}`}
            right={<Chip tone="ai"><Sparkle width={11} height={11} /> AI Copilot</Chip>}
          />
          <div className="px-4 py-4 space-y-4">
            {/* Score gauge + headline */}
            <div className="flex items-start gap-5">
              <Ring
                value={TOP_SETUP.score}
                max={100}
                size={72}
                stroke={7}
                color="var(--ai)"
                label={String(TOP_SETUP.score)}
                sub="score"
              />
              <div className="flex-1">
                <div className="mb-1.5 flex items-center gap-2">
                  <Ticker sym={TOP_SETUP.sym} name={TOP_SETUP.name} />
                  <Chip tone="ai">{TOP_SETUP.setup}</Chip>
                </div>
                <p className="text-sm text-ink font-medium leading-relaxed">
                  {TOP_SETUP.trigger}
                </p>
              </div>
            </div>

            {/* Cited explanation */}
            <div className="rounded border border-ai/20 bg-ai/5 px-4 py-3.5 space-y-2.5">
              <div className="flex items-center gap-2 mb-2">
                <Sparkle width={13} height={13} className="text-ai" />
                <span className="text-xs font-medium text-ai">ATHENA Analysis</span>
                <span className="text-xs text-dim">(plain-English, cited)</span>
              </div>
              <p className="text-sm text-muted leading-relaxed">
                <strong className="text-ink">Setup rationale:</strong> {TOP_SETUP.sym} exhibits a confluence of
                order-flow absorption at the {fmtUsd(TOP_SETUP.price - 450, 0)} level and a sustained CVD
                divergence indicating institutional accumulation over the past 4 hours. The sweep cluster at
                {" "}<strong className="text-accent">{fmtUsd(TOP_SETUP.price - 500, 0)}</strong> cleared resting
                ask liquidity while price held bid — a classic absorption + continuation pattern.
              </p>
              <p className="text-sm text-muted leading-relaxed">
                <strong className="text-ink">Corroborating signals (ARGUS):</strong> The ARGUS multi-family
                model fuses order-flow data with NLP event signals and shows elevated novelty (0.78) on
                supply-chain thread not yet in consensus. Insider disclosure clustering in the trailing 14 days
                adds a further positive Z-score of +2.1 across the composite model.
              </p>
              <p className="text-sm text-muted leading-relaxed">
                <strong className="text-ink">Risk factors:</strong> Relative volume is {TOP_SETUP.relVol.toFixed(1)}×
                normal — elevated, which can signal late-stage momentum. The setup invalidates on a close below
                {" "}<strong className="text-neg">{fmtUsd(TOP_SETUP.price * 0.985, 0)}</strong> with high volume.
                Broader macro (Fed policy risk, BTC correlation) should be assessed via KEPLER before sizing.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-dim border-t border-line">
                <span>Sources:</span>
                <Chip tone="default">Binance WS L2 depth</Chip>
                <Chip tone="default">ARGUS NLP corpus</Chip>
                <Chip tone="default">SEC EDGAR Form 4</Chip>
                <Chip tone="default">CVD series</Chip>
              </div>
            </div>

            {/* Signal breakdown bars */}
            <div className="space-y-2.5">
              <div className="section-label text-[11px]">Signal breakdown</div>
              {[
                { label: "Order flow conviction",  pct: 88, color: "var(--pos)"    },
                { label: "ARGUS NLP / events",     pct: 91, color: "var(--ai)"     },
                { label: "Technical structure",    pct: 74, color: "var(--accent)"  },
                { label: "Insider / disclosure",   pct: 62, color: "var(--info)"   },
                { label: "Macro / regime fit",     pct: 55, color: "var(--warn)"   },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-3">
                  <span className="w-40 shrink-0 text-xs text-dim">{s.label}</span>
                  <ProgressBar value={s.pct} max={100} color={s.color} height={6} className="flex-1" />
                  <span className="w-8 shrink-0 text-right font-mono text-xs text-muted">{s.pct}</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        {/* Sidebar: top setups mini-list */}
        <div className="space-y-4">
          <Panel>
            <PanelHeader title="Top 5 by Score" />
            <div className="divide-y divide-line/60">
              {SCANNER_SETUPS.slice(0, 5).map((s, i) => {
                const tone = SETUP_TONES[s.setup as keyof typeof SETUP_TONES] ?? "default";
                return (
                  <div key={s.sym} className="flex items-center gap-3 px-4 py-2.5 hover:bg-elevated/30 transition-colors">
                    <span className="font-mono text-xs text-dim w-4">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="font-mono text-sm text-ink font-medium">{s.sym}</span>
                        {s.argus && <Sparkle width={10} height={10} className="text-ai" />}
                      </div>
                      <Chip tone={tone as "ai" | "accent" | "pos" | "info" | "warn"}>{s.setup}</Chip>
                    </div>
                    <div className="text-right">
                      <div className={`font-mono text-lg leading-none ${s.score >= 85 ? "text-ai" : "text-accent"}`}>{s.score}</div>
                      <div className={`font-mono text-xs ${signClass(s.chgPct)}`}>{fmtSignedPct(s.chgPct)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Setup Distribution" />
            <div className="px-4 py-3 space-y-2.5">
              {Object.entries(SETUP_TONES).map(([type, tone]) => {
                const count = SCANNER_SETUPS.filter((s) => s.setup === type).length;
                const pct = (count / SCANNER_SETUPS.length) * 100;
                const colorMap: Record<string, string> = {
                  ai: "var(--ai)", accent: "var(--accent)", pos: "var(--pos)",
                  info: "var(--info)", warn: "var(--warn)",
                };
                return (
                  <div key={type} className="flex items-center gap-2">
                    <span className="w-28 text-xs text-dim shrink-0">{type}</span>
                    <ProgressBar value={pct} max={100} color={colorMap[tone] ?? "var(--accent)"} height={5} className="flex-1" />
                    <span className="w-4 text-right font-mono text-xs text-dim shrink-0">{count}</span>
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
