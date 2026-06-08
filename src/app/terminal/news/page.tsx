import { PageHeader, Panel, PanelHeader, Chip, Th, Td, Ticker, KpiCard, StatusDot } from "@/components/ui/kit";
import { Sparkline, Ring, ProgressBar } from "@/components/ui/viz";
import { Icon } from "@/components/icon-map";
import { Sparkle } from "@/components/icons";
import { signClass } from "@/lib/format";
import { cn } from "@/lib/cn";
import {
  NEWS_STREAM,
  SENTIMENT_BULLS,
  SENTIMENT_BEARS,
} from "@/lib/data/obsidian";

export const metadata = { title: "News & Sentiment — OBSIDIAN Terminal" };

const EVENT_CLASS_COLORS: Record<string, string> = {
  "Macro Policy": "border-warn/30 bg-warn/10 text-warn",
  "Supply Chain": "border-info/30 bg-info/10 text-info",
  "Earnings Beat": "chip-pos",
  "Contract Award": "chip-pos",
  "Regulatory Risk": "chip-neg",
  "Earnings Miss": "chip-neg",
  "Analyst Action": "border-info/30 bg-info/10 text-info",
  "Macro Data": "border-warn/30 bg-warn/10 text-warn",
  "Operations": "chip-accent",
  "Competitive": "chip-warn",
  "Web Signal": "border-ai/30 bg-ai/10 text-ai",
  "Disclosure": "border-accent/30 bg-accent/10 text-accent",
  "Flow": "chip-accent",
};

function sentimentBar(score: number) {
  const pct = Math.round((score + 1) / 2 * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-line">
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: score > 0.3 ? "var(--pos)" : score > 0 ? "var(--accent)" : score > -0.3 ? "var(--warn)" : "var(--neg)",
          }}
        />
      </div>
      <span className={cn("font-mono text-2xs tabular-nums", signClass(score))}>
        {score >= 0 ? "+" : ""}{score.toFixed(2)}
      </span>
    </div>
  );
}

export default function NewsPage() {
  const overallSentiment = 0.28; // mildly bullish aggregate
  const sentimentPct = Math.round((overallSentiment + 1) / 2 * 100);

  return (
    <div className="space-y-5">
      <PageHeader
        module={{ name: "OBSIDIAN · Terminal", tone: "accent" }}
        title="News & Sentiment"
        desc="RavenPack-lite real-time news stream with LLM sentiment scoring, event classification, novelty detection, and per-security sentiment leaders."
        right={
          <div className="flex items-center gap-2">
            <StatusDot tone="pos" pulse />
            <span className="font-mono text-xs text-muted">GDELT + Finnhub · live</span>
            <Chip tone="ai"><Sparkle width={11} height={11} /> AI Scored</Chip>
          </div>
        }
      />

      {/* Aggregate sentiment gauge + KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Panel hover className="scanline md:col-span-2 px-4 py-3">
          <div className="flex items-center gap-5">
            <Ring
              value={sentimentPct}
              max={100}
              size={80}
              stroke={8}
              color={overallSentiment > 0.3 ? "var(--pos)" : overallSentiment > 0 ? "var(--accent)" : overallSentiment > -0.3 ? "var(--warn)" : "var(--neg)"}
              label={`+${(overallSentiment).toFixed(2)}`}
              sub="BULLISH"
            />
            <div>
              <div className="kpi-label">MARKET SENTIMENT</div>
              <div className="mt-1 font-mono text-2xl font-semibold text-pos">Mildly Bullish</div>
              <div className="mt-1 text-xs text-dim">Aggregate · 15 news items · last 8h</div>
            </div>
          </div>
        </Panel>
        <KpiCard label="NEWS ITEMS (24H)" value="4,182" sub="LLM classified + scored" icon={<Icon name="radio" width={14} height={14} />} />
        <KpiCard label="AVG NOVELTY" value="0.54" sub="vs trailing 30D corpus" tone="accent" icon={<Icon name="sparkle" width={14} height={14} />} />
        <KpiCard label="EVENT INTENSITY" value="0.68" sub="↑ elevated vs baseline" tone="warn" icon={<Icon name="activity" width={14} height={14} />} />
      </div>

      {/* News stream + event breakdown */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2">
          <PanelHeader
            title="Live News Stream"
            sub="LLM-classified · entity-tagged · sentiment scored · novelty detected"
            right={
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {["All", "High Impact", "Macro", "Earnings", "Regulatory"].map((f) => (
                    <span
                      key={f}
                      className={cn("chip cursor-pointer text-2xs", f === "All" ? "chip-accent" : "")}
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            }
          />
          <ul className="divide-y divide-line">
            {NEWS_STREAM.map((item) => (
              <li key={item.id} className="group px-4 py-3 hover:bg-elevated/40">
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                      item.sentiment > 0.5 ? "bg-pos" :
                      item.sentiment > 0.1 ? "bg-accent" :
                      item.sentiment > -0.2 ? "bg-warn" : "bg-neg"
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted leading-snug hover:text-ink transition-colors cursor-pointer">
                      {item.headline}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <span className="font-mono text-2xs text-dim">{item.source}</span>
                      <span className="text-faint">·</span>
                      <span className="font-mono text-2xs text-dim">{item.time}</span>
                      <span
                        className={cn("chip text-2xs", EVENT_CLASS_COLORS[item.eventClass] ?? "")}
                      >
                        {item.eventClass}
                      </span>
                      {item.entities.map((e) => (
                        <span key={e} className="chip text-2xs">{e}</span>
                      ))}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    {sentimentBar(item.sentiment)}
                    <div className="mt-1 flex items-center justify-end gap-1">
                      <span className="font-mono text-2xs text-dim">novelty</span>
                      <span className={cn(
                        "font-mono text-2xs tabular-nums",
                        item.novelty > 0.7 ? "text-warn" : "text-muted"
                      )}>
                        {item.novelty.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t border-line px-4 py-2.5 text-xs text-dim">
            <span>Showing 15 of 4,182 items in the last 24h</span>
            <button className="font-mono text-accent hover:underline">Load more →</button>
          </div>
        </Panel>

        {/* Right column: category breakdown + sentiment leaders */}
        <div className="space-y-4">
          {/* Event category breakdown */}
          <Panel>
            <PanelHeader title="Event Classification" right={<Chip tone="ai">AI</Chip>} />
            <div className="space-y-3 px-4 py-3">
              {[
                { label: "Earnings / Revenue", count: 1284, pct: 30.7, color: "var(--pos)" },
                { label: "Macro / Central Bank", count: 892, pct: 21.3, color: "var(--warn)" },
                { label: "Analyst Actions", count: 641, pct: 15.3, color: "var(--accent)" },
                { label: "Regulatory / Legal", count: 418, pct: 10.0, color: "var(--neg)" },
                { label: "Contract / Awards", count: 384, pct: 9.2, color: "var(--pos)" },
                { label: "M&A / Corporate", count: 312, pct: 7.5, color: "var(--info)" },
                { label: "Insider / Disclosure", count: 251, pct: 6.0, color: "var(--ai)" },
              ].map((c) => (
                <div key={c.label}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-muted">{c.label}</span>
                    <span className="font-mono" style={{ color: c.color }}>{c.pct}%</span>
                  </div>
                  <ProgressBar value={c.pct} max={100} color={c.color} height={5} />
                </div>
              ))}
            </div>
          </Panel>

          {/* Sentiment leaders — bulls */}
          <Panel>
            <PanelHeader title="Sentiment Leaders — Bullish" right={<Chip tone="pos">↑</Chip>} />
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <Th>Symbol</Th>
                  <Th right>Score</Th>
                  <Th right>Articles</Th>
                  <Th right>14D</Th>
                </tr>
              </thead>
              <tbody>
                {SENTIMENT_BULLS.map((s) => (
                  <tr key={s.sym} className="hover:bg-elevated/40">
                    <Td mono={false}>
                      <Ticker sym={s.sym} name={s.name} />
                    </Td>
                    <Td right className="text-pos font-medium">+{s.score.toFixed(2)}</Td>
                    <Td right className="text-muted">{s.articles}</Td>
                    <Td right>
                      <Sparkline data={s.trend} width={56} height={20} color="var(--pos)" />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>

          {/* Sentiment leaders — bears */}
          <Panel>
            <PanelHeader title="Sentiment Laggards — Bearish" right={<Chip tone="neg">↓</Chip>} />
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <Th>Symbol</Th>
                  <Th right>Score</Th>
                  <Th right>Articles</Th>
                  <Th right>14D</Th>
                </tr>
              </thead>
              <tbody>
                {SENTIMENT_BEARS.map((s) => (
                  <tr key={s.sym} className="hover:bg-elevated/40">
                    <Td mono={false}>
                      <Ticker sym={s.sym} name={s.name} />
                    </Td>
                    <Td right className="text-neg font-medium">{s.score.toFixed(2)}</Td>
                    <Td right className="text-muted">{s.articles}</Td>
                    <Td right>
                      <Sparkline data={s.trend} width={56} height={20} color="var(--neg)" />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-line px-4 py-2.5 text-xs text-dim">
              Sentiment scores: LLM (claude-haiku) · 12h rolling · normalized −1 to +1. Novelty: cosine distance vs 30D TF-IDF corpus.
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
