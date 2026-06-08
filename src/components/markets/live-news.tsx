"use client";

import { useEffect, useState, useCallback } from "react";
import { Panel, PanelHeader } from "@/components/ui/kit";
import { Icon } from "@/components/icon-map";

/* ── Types ────────────────────────────────────────────────────────────────── */

interface NewsItem {
  title: string;
  link: string;
  source: string;
  ts: string; // ISO 8601
  tickers: string[];
}

interface NewsLive {
  live: true;
  source: string;
  asOf: string;
  items: NewsItem[];
}

interface NewsDemo {
  live: false;
}

type NewsResponse = NewsLive | NewsDemo;
type Status = "loading" | "live" | "demo";

/* ── Relative time helper ─────────────────────────────────────────────────── */

function relativeTime(ts: string): string {
  const diffMs = Date.now() - new Date(ts).getTime();
  if (diffMs < 0) return "just now";
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays}d ago`;
}

/* ── Demo fallback data ───────────────────────────────────────────────────── */

const now = Date.now();
const DEMO_ITEMS: NewsItem[] = [
  {
    title: "Fed Signals Cautious Approach to Rate Cuts Amid Sticky Inflation Data",
    link: "#",
    source: "Reuters",
    ts: new Date(now - 8 * 60 * 1000).toISOString(),
    tickers: ["SPY", "TLT"],
  },
  {
    title: "NVIDIA Surges After Analysts Raise Price Targets on Blackwell GPU Demand",
    link: "#",
    source: "Bloomberg",
    ts: new Date(now - 22 * 60 * 1000).toISOString(),
    tickers: ["NVDA"],
  },
  {
    title: "Apple Vision Pro 2 Production Ramp Underway, Supply Chain Sources Say",
    link: "#",
    source: "Nikkei Asia",
    ts: new Date(now - 41 * 60 * 1000).toISOString(),
    tickers: ["AAPL"],
  },
  {
    title: "Microsoft Azure AI Wins $2.4B U.S. Government Cloud Contract",
    link: "#",
    source: "WSJ",
    ts: new Date(now - 1.3 * 60 * 60 * 1000).toISOString(),
    tickers: ["MSFT"],
  },
  {
    title: "Tesla Cuts Model Y Prices in Europe for the Third Time This Quarter",
    link: "#",
    source: "Financial Times",
    ts: new Date(now - 2.1 * 60 * 60 * 1000).toISOString(),
    tickers: ["TSLA"],
  },
  {
    title: "Amazon Web Services Launches Graviton4 Instances in Six New Regions",
    link: "#",
    source: "CNBC",
    ts: new Date(now - 3.5 * 60 * 60 * 1000).toISOString(),
    tickers: ["AMZN"],
  },
  {
    title: "Meta AI Studio Opens to All Developers; Llama 4 API Now Generally Available",
    link: "#",
    source: "TechCrunch",
    ts: new Date(now - 5.2 * 60 * 60 * 1000).toISOString(),
    tickers: ["META"],
  },
  {
    title: "Alphabet Beats Q2 Estimates on Search and Cloud; Raises Full-Year Guidance",
    link: "#",
    source: "Barron's",
    ts: new Date(now - 7.8 * 60 * 60 * 1000).toISOString(),
    tickers: ["GOOGL"],
  },
];

/* ── Component ────────────────────────────────────────────────────────────── */

const SYMBOLS = "AAPL,NVDA,MSFT,TSLA,AMZN,META,GOOGL,SPY";

export function LiveNews() {
  const [status, setStatus] = useState<Status>("loading");
  const [items, setItems] = useState<NewsItem[]>([]);
  const [source, setSource] = useState<string>("");
  const [updated, setUpdated] = useState<string>("");

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/news?symbols=${SYMBOLS}`, { cache: "no-store" });
      const j = (await r.json()) as NewsResponse;
      if (j.live) {
        setItems(j.items);
        setSource(j.source);
        setStatus("live");
        setUpdated(new Date(j.asOf).toLocaleTimeString("en-US", { hour12: false }));
      } else {
        setStatus("demo");
      }
    } catch {
      setStatus("demo");
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 120_000);
    return () => clearInterval(id);
  }, [load]);

  const displayItems = status === "live" ? items : DEMO_ITEMS;

  return (
    <Panel>
      <PanelHeader
        title="Market Headlines"
        sub="Yahoo Finance RSS — top stories for mega-cap equities and SPY"
        right={
          <div className="flex items-center gap-2">
            {status === "loading" ? (
              <span className="flex items-center gap-1.5 font-mono text-2xs uppercase tracking-wider text-dim">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-dim" />
                connecting…
              </span>
            ) : status === "live" ? (
              <>
                <span className="flex items-center gap-1.5 font-mono text-2xs uppercase tracking-wider text-pos">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pos opacity-60" />
                    <span className="relative h-1.5 w-1.5 rounded-full bg-pos" />
                  </span>
                  LIVE · {source}
                </span>
                <span className="hidden font-mono text-2xs text-dim sm:inline">as of {updated}</span>
              </>
            ) : (
              <span className="flex items-center gap-1.5 rounded border border-warn/40 bg-warn/10 px-2 py-1 font-mono text-2xs uppercase tracking-wider text-warn">
                <Icon name="warn" width={12} height={12} />
                DEMO · live feed unreachable
              </span>
            )}
          </div>
        }
      />

      <ul className="divide-y divide-line">
        {displayItems.map((item, i) => (
          <li key={`${item.ts}-${i}`} className="group px-4 py-3 hover:bg-elevated/40">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted leading-snug transition-colors hover:text-accent"
                >
                  {item.title}
                </a>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <span className="font-mono text-2xs text-dim">{item.source}</span>
                  {item.tickers.length > 0 && (
                    <>
                      <span className="text-dim">·</span>
                      {item.tickers.slice(0, 4).map((t) => (
                        <span
                          key={t}
                          className="inline-flex items-center rounded border border-line bg-elevated/70 px-1.5 py-0.5 font-mono text-2xs font-medium text-ink"
                        >
                          {t}
                        </span>
                      ))}
                    </>
                  )}
                </div>
              </div>
              <span className="shrink-0 font-mono text-2xs text-dim tabular-nums">
                {relativeTime(item.ts)}
              </span>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between border-t border-line px-4 py-2 text-2xs text-dim">
        <span>Headlines via Yahoo Finance RSS when reachable.</span>
        <Icon name="radio" width={12} height={12} className="text-dim" />
      </div>
    </Panel>
  );
}
