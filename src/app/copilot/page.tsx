import { PageHeader, Panel, PanelHeader, Chip, KpiCard, Th, Td, StatusDot } from "@/components/ui/kit";
import { Sparkle, Brain, Shield, Database, Route, Book, Bolt, Activity, Check } from "@/components/icons";
import { Icon } from "@/components/icon-map";
import AthenaOpenButton from "@/components/core/AthenaOpenButton";

export const metadata = { title: "ATHENA · PANTHEON Copilot" };

const CAPABILITIES = [
  {
    icon: "shield",
    name: "Explainable Risk",
    desc: "Decomposes portfolio VaR, factor exposures and stress scenarios in plain English — with every number traceable to the snapshot that generated it.",
    cites: ["AEGIS Factor Model", "EWMA Covariance", "PIT Snapshot"],
    tone: "accent" as const,
  },
  {
    icon: "search",
    name: "NL Data Query",
    desc: "Ask in natural language. ATHENA translates to DuckDB/SQL over the PIT lake and returns typed results with provenance — no schema knowledge required.",
    cites: ["DuckDB", "PIT Lake", "XBRL Fundamentals"],
    tone: "accent" as const,
  },
  {
    icon: "doc",
    name: "Auto Research Memos",
    desc: "Generates investment memos citing EDGAR filings, earnings transcripts, and macro data. Every claim is source-linked — fabrication is structurally impossible.",
    cites: ["EDGAR RAG", "Transcript Corpus", "FRED Macro"],
    tone: "ai" as const,
  },
  {
    icon: "activity",
    name: "Anomaly Detection",
    desc: "Monitors all signal families in real time. Surfaces novelty spikes, unusual clustering and regime breaks — with a written explanation and confidence interval.",
    cites: ["ARGUS Signal Bus", "NLP Novelty Engine", "Z-Score Baseline"],
    tone: "warn" as const,
  },
  {
    icon: "flask",
    name: "Overfitting Red-Flagging",
    desc: "Calculates Deflated Sharpe, PBO via CSCV, and in-sample/out-of-sample decay on every backtest. Warns loudly when results are fragile or trial-inflated.",
    cites: ["KEPLER Backtester", "Deflated Sharpe (DSR)", "CSCV / PBO"],
    tone: "neg" as const,
  },
  {
    icon: "flow",
    name: "Order-Flow Narration",
    desc: "Translates live L2/L3 tape into narrative: sweep detection, CVD divergence, iceberg identification, and directional read with timestamp-precise citations.",
    cites: ["HELIOS L2/L3", "Binance WS (38ms)", "CVD Engine"],
    tone: "pos" as const,
  },
];

const TOOLS_BOUND = [
  { name: "Risk Engine (AEGIS)", desc: "Factor VaR, covariance, stress", icon: "gauge" },
  { name: "Screener (OBSIDIAN)", desc: "Cross-sectional filtering & ranking", icon: "search" },
  { name: "Backtest (KEPLER)", desc: "Strategy runs, DSR, PBO checks", icon: "flask" },
  { name: "Order Flow (HELIOS)", desc: "L2/L3 depth, CVD, tape reading", icon: "flow" },
  { name: "Compliance (AEGIS)", desc: "Mandate limits, MNPI quarantine", icon: "shield" },
  { name: "Filings RAG (EDGAR)", desc: "10-K/10-Q/8-K vector search", icon: "doc" },
];

const TRANSCRIPT = [
  {
    role: "user" as const,
    text: "Why did portfolio VaR jump today? Is it driven by NVDA?",
  },
  {
    role: "athena" as const,
    text: "Portfolio 1-day 99% VaR rose +18.2% to $2.41M. Decomposition: 61% driven by a +0.9σ move in the Semiconductors factor — your NVDA, AVGO and AMD exposure collectively 0.34 — 24% from rising EWMA 30-day vol (14.1%→16.8%), and 15% from a new LMT block lifting your Defense beta. Idiosyncratic risk is unchanged. NVDA alone contributes 28% of marginal VaR. Every figure is reproducible from snapshot pit-2026-06-08.",
    cites: ["AEGIS · Factor Risk Model v3", "EWMA covariance (λ=0.94)", "IBOR snapshot pit-2026-06-08", "Semiconductors factor decomp"],
  },
  {
    role: "user" as const,
    text: "Should I trim NVDA? What does the signal say?",
  },
  {
    role: "athena" as const,
    text: "Signal picture is mixed. ARGUS composite z=+1.97 (bullish): hiring acceleration, patent velocity and elevated event intensity all positive. However, crowding is HIGH — consensus long among multi-managers — so any mean-reversion creates asymmetric drawdown risk. On risk alone, trimming 1–2% reduces marginal VaR by ~28% and drops Semis factor exposure below your 30% mandate soft-limit. I'm citing the signal state as of as_of=2026-06-08; not a recommendation.",
    cites: ["ARGUS · Cross-signal composite", "OBSIDIAN Screener · crowding z", "AEGIS · Mandate FUND-II-007", "PIT as_of 2026-06-08"],
  },
  {
    role: "user" as const,
    text: "Is my momentum backtest overfit? Sharpe looks too good.",
  },
  {
    role: "athena" as const,
    text: "Caution warranted. In-sample Sharpe 2.41 but Deflated Sharpe (DSR) collapses to 0.78 across 64 trials, and PBO (CSCV) is 0.42 — elevated. Out-of-sample Sharpe in a held-out 2024–25 block decays to 1.05. The 10/100-day crossover parameter is fragile: ±3-day perturbation flips sign in 3 of 8 walk-forward windows. Treat the IS Sharpe as a warning flag, not a result. Recommend a proper walk-forward with a blocked hold-out before any allocation.",
    cites: ["KEPLER · Deflated Sharpe (Bailey & López de Prado)", "CSCV / PBO engine", "Walk-forward harness · 8 windows"],
  },
];

export default function CopilotPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        module={{ name: "PANTHEON · ATHENA", tone: "ai" }}
        title="ATHENA AI Copilot Workspace"
        desc="Grounded, cited, sovereign. ATHENA answers across every PANTHEON module — and says so when it doesn't know."
        right={<AthenaOpenButton />}
      />

      {/* KPI deck */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          label="TOOLS BOUND"
          value="6"
          sub="Risk · Screener · Backtest · Flow · Compliance · Filings"
          tone="accent"
          icon={<Bolt width={15} height={15} />}
        />
        <KpiCard
          label="CITATIONS / TURN"
          value="3–6"
          sub="Every claim source-linked before output"
          tone="pos"
          icon={<Check width={15} height={15} />}
        />
        <KpiCard
          label="HALLUCINATIONS"
          value="0"
          sub="Grounded in data fabric — refuses to fabricate"
          tone="pos"
          icon={<Shield width={15} height={15} />}
        />
        <KpiCard
          label="DEPLOYMENT"
          value="Sovereign"
          sub="Set ANTHROPIC_API_KEY → live Claude in your VPC"
          tone="ai"
          icon={<Sparkle width={15} height={15} />}
        />
      </div>

      {/* Capabilities grid */}
      <Panel>
        <PanelHeader
          title="ATHENA Capabilities"
          right={<Chip tone="ai"><Sparkle width={11} height={11} /> AI-native</Chip>}
        />
        <div className="grid gap-px bg-line md:grid-cols-2 xl:grid-cols-3">
          {CAPABILITIES.map((cap) => (
            <div key={cap.name} className="flex flex-col gap-3 bg-panel p-4 transition-colors hover:bg-elevated/30">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded border border-ai/20 bg-ai/8 text-ai">
                  <Icon name={cap.icon} width={15} height={15} />
                </span>
                <div>
                  <div className="font-mono text-sm font-medium text-ink">{cap.name}</div>
                  <p className="mt-1 text-xs leading-relaxed text-muted">{cap.desc}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {cap.cites.map((c) => (
                  <span key={c} className="inline-flex items-center gap-1 rounded border border-line px-1.5 py-0.5 font-mono text-[9px] text-dim">
                    <Route width={8} height={8} /> {c}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Sample conversation */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel>
            <PanelHeader
              title="Sample Cited Conversation"
              right={
                <div className="flex items-center gap-2">
                  <Chip tone="ai">DEMO TRANSCRIPT</Chip>
                  <Chip tone="default">grounded · cited</Chip>
                </div>
              }
            />
            <div className="space-y-4 p-4">
              {TRANSCRIPT.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[88%] rounded-lg border px-3.5 py-2.5 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "border-line bg-elevated text-ink"
                        : "border-ai/20 bg-ai/5 text-muted"
                    }`}
                  >
                    {msg.role === "athena" ? (
                      <div className="mb-1.5 flex items-center gap-1.5">
                        <Sparkle width={11} height={11} className="text-ai" />
                        <span className="font-mono text-[10px] uppercase tracking-widest text-ai">ATHENA</span>
                      </div>
                    ) : (
                      <div className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-dim">YOU</div>
                    )}
                    <p>{msg.text}</p>
                    {msg.cites ? (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {msg.cites.map((c) => (
                          <span key={c} className="inline-flex items-center gap-1 rounded border border-ai/20 bg-ai/5 px-1.5 py-0.5 font-mono text-[9px] text-ai/70">
                            <Book width={8} height={8} /> {c}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-line px-4 py-3">
              <p className="text-xs text-dim">
                Demo transcript — scripted responses. Set{" "}
                <code className="rounded bg-elevated px-1 font-mono text-xs text-accent">ANTHROPIC_API_KEY</code>{" "}
                to connect live Claude to your sovereign data fabric.
              </p>
            </div>
          </Panel>
        </div>

        {/* Tools bound panel */}
        <div className="space-y-4">
          <Panel>
            <PanelHeader title="Tools Bound" right={<Chip tone="pos" dot>6 active</Chip>} />
            <ul className="divide-y divide-line">
              {TOOLS_BOUND.map((tool) => (
                <li key={tool.name} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-elevated/30">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded border border-line bg-elevated/60 text-muted">
                    <Icon name={tool.icon} width={13} height={13} />
                  </span>
                  <div className="min-w-0">
                    <div className="font-mono text-xs font-medium text-ink">{tool.name}</div>
                    <div className="text-xs text-dim">{tool.desc}</div>
                  </div>
                  <StatusDot tone="pos" />
                </li>
              ))}
            </ul>
          </Panel>

          <Panel>
            <PanelHeader title="Design Principles" />
            <div className="space-y-3 p-4">
              {[
                { label: "Grounded", body: "Every answer cites the underlying data — filing, snapshot, or model output.", tone: "pos" as const },
                { label: "Never fabricates", body: "If data is missing or out-of-scope, ATHENA says so explicitly.", tone: "pos" as const },
                { label: "In your environment", body: "Runs inside your VPC. Positions and prompts never leave your network.", tone: "accent" as const },
                { label: "Reproducible", body: "Answers reference named PIT snapshots — re-run any query and get the same numbers.", tone: "accent" as const },
              ].map((p) => (
                <div key={p.label} className="flex gap-2.5">
                  <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${p.tone === "pos" ? "bg-pos" : "bg-accent"}`} />
                  <p className="text-xs leading-relaxed text-muted">
                    <span className="font-medium text-ink">{p.label} — </span>{p.body}
                  </p>
                </div>
              ))}
            </div>
            <div className="border-t border-line px-4 py-3">
              <p className="font-mono text-[10px] text-dim">
                ANTHROPIC_API_KEY → live Claude · otherwise scripted demo
              </p>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
