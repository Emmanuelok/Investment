"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Panel, PanelHeader, Chip, Th, Td, Ticker } from "@/components/ui/kit";
import { ProgressBar } from "@/components/ui/viz";
import { Icon } from "@/components/icon-map";
import { cn } from "@/lib/cn";
import { detectAnomalies, type Anomaly } from "@/lib/engine/anomaly";
import { candleSeries, type Candle } from "@/lib/rng";

type Status = "loading" | "live" | "demo";
type ChipTone = "default" | "accent" | "pos" | "neg" | "warn";
type AnomalyType = Anomaly["type"];

/** A scanned anomaly tagged with the symbol it was detected on. */
type AnomalyHit = Anomaly & { symbol: string };

type AnomalyPayload = {
  live: true;
  source: string;
  asOf: string;
  scanned: number;
  anomalies: AnomalyHit[];
};
type AnomalyResponse = AnomalyPayload | { live: false };

const UNIVERSE = ["SPY", "QQQ", "NVDA", "AAPL", "MSFT", "AMZN", "META", "TSLA", "AMD", "AVGO", "JPM", "XOM"] as const;

/** Filter buckets — "ALL" shows everything, otherwise we match a single type. */
const FILTERS = [
  { key: "ALL", label: "All" },
  { key: "VOLUME_SPIKE", label: "Volume" },
  { key: "RETURN_SHOCK", label: "Return Shock" },
  { key: "GAP", label: "Gap" },
  { key: "VOL_EXPANSION", label: "Vol Expansion" },
  { key: "RANGE_BLOWOUT", label: "Range" },
] as const;
type FilterKey = (typeof FILTERS)[number]["key"];

const TYPE_LABEL: Record<AnomalyType, string> = {
  VOLUME_SPIKE: "Volume Spike",
  RETURN_SHOCK: "Return Shock",
  GAP: "Gap",
  VOL_EXPANSION: "Vol Expansion",
  RANGE_BLOWOUT: "Range Blowout",
};

const TONE_CLASS: Record<Anomaly["tone"], ChipTone> = { pos: "pos", neg: "neg", warn: "warn" };

/** Type badge tone — volume spikes read accent, shocks/gaps follow their tone, vol/range warn. */
function typeTone(a: AnomalyHit): ChipTone {
  switch (a.type) {
    case "VOLUME_SPIKE":
      return "accent";
    case "RETURN_SHOCK":
    case "GAP":
      return TONE_CLASS[a.tone];
    case "VOL_EXPANSION":
    case "RANGE_BLOWOUT":
    default:
      return "warn";
  }
}

/** Severity bar colour — extreme reads neg, elevated warn, otherwise dim. */
function severityColor(a: AnomalyHit): string {
  if (a.severity >= 70) return a.tone === "pos" ? "var(--pos)" : "var(--neg)";
  if (a.severity >= 40) return "var(--warn)";
  return "var(--dim)";
}

const median = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/**
 * Build the scan locally from deterministic candle series. Anomalies are
 * injected into a handful of symbols so the demo always surfaces visible hits.
 */
function demoScan(): { anomalies: AnomalyHit[]; scanned: number } {
  const hits: AnomalyHit[] = [];
  UNIVERSE.forEach((sym, idx) => {
    const candles: Candle[] = candleSeries(sym + "-anom", 90, 100, 0.02, 0.0004);
    if (candles.length >= 2 && idx % 3 === 0) {
      const last = candles[candles.length - 1];
      const prev = candles[candles.length - 2];
      const medVol = median(candles.map((c) => c.v));
      // 9× median volume spike + a gap open vs the prior close.
      last.v = Math.round(medVol * 9);
      last.o = prev.c * (idx % 2 ? 1.05 : 0.95);
      last.h = Math.max(last.h, last.o, last.c);
      last.l = Math.min(last.l, last.o, last.c);
    }
    for (const a of detectAnomalies(candles)) hits.push({ ...a, symbol: sym });
  });
  hits.sort((x, y) => y.severity - x.severity);
  return { anomalies: hits.slice(0, 40), scanned: UNIVERSE.length };
}

export function AnomalyScanner() {
  const [status, setStatus] = useState<Status>("loading");
  const [anomalies, setAnomalies] = useState<AnomalyHit[]>([]);
  const [scanned, setScanned] = useState<number>(UNIVERSE.length);
  const [source, setSource] = useState<string>("");
  const [updated, setUpdated] = useState<string>("");
  const [filter, setFilter] = useState<FilterKey>("ALL");

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/engine/anomaly?symbols=${UNIVERSE.join(",")}`, { cache: "no-store" });
      const j = (await r.json()) as AnomalyResponse;
      if (j.live) {
        setAnomalies(j.anomalies);
        setScanned(j.scanned);
        setSource(j.source);
        setUpdated(new Date(j.asOf).toLocaleTimeString("en-US", { hour12: false }));
        setStatus("live");
        return;
      }
    } catch {
      /* fall through to demo */
    }
    const demo = demoScan();
    setAnomalies(demo.anomalies);
    setScanned(demo.scanned);
    setStatus("demo");
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 300_000);
    return () => clearInterval(id);
  }, [load]);

  const filtered = useMemo(
    () => (filter === "ALL" ? anomalies : anomalies.filter((a) => a.type === filter)),
    [anomalies, filter],
  );

  // Count by type for the header summary chips.
  const counts = useMemo(() => {
    const c = {} as Record<AnomalyType, number>;
    for (const a of anomalies) c[a.type] = (c[a.type] ?? 0) + 1;
    return c;
  }, [anomalies]);

  return (
    <Panel className="animate-rise">
      <PanelHeader
        title="Anomaly Detection Engine"
        sub="Statistically unusual bars across the universe — volume spikes, return shocks, gaps & vol expansion"
        right={
          status === "loading" ? (
            <span className="flex items-center gap-1.5 font-mono text-2xs uppercase tracking-wider text-dim">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-dim" /> scanning…
            </span>
          ) : status === "live" ? (
            <>
              <span className="flex items-center gap-1.5 font-mono text-2xs uppercase tracking-wider text-pos">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pos opacity-60" />
                  <span className="relative h-1.5 w-1.5 rounded-full bg-pos" />
                </span>
                ENGINE · LIVE · {source}
              </span>
              <span className="hidden font-mono text-2xs text-dim sm:inline">as of {updated}</span>
            </>
          ) : (
            <span className="flex items-center gap-1.5 rounded border border-warn/40 bg-warn/10 px-2 py-1 font-mono text-2xs uppercase tracking-wider text-warn">
              <Icon name="warn" width={12} height={12} /> ENGINE · DEMO DATA
            </span>
          )
        }
      />

      {/* Summary + count-by-type chips */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-4 py-2.5">
        <span className="font-mono text-xs text-ink">
          {anomalies.length} <span className="text-dim">anomalies</span> · {scanned}{" "}
          <span className="text-dim">symbols scanned</span>
        </span>
        <span className="flex flex-wrap items-center gap-1.5 sm:ml-auto">
          {FILTERS.filter((f) => f.key !== "ALL").map((f) => {
            const n = counts[f.key as AnomalyType] ?? 0;
            if (!n) return null;
            return (
              <span
                key={f.key}
                className="rounded border border-line bg-elevated/70 px-1.5 py-0.5 font-mono text-2xs text-muted"
              >
                {f.label} {n}
              </span>
            );
          })}
        </span>
      </div>

      {/* Type filter bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2.5">
        <span className="section-label mr-1">Filter type:</span>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn("chip cursor-pointer", filter === f.key && "chip-accent")}
            aria-pressed={filter === f.key}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Anomaly list */}
      {filtered.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse">
            <thead>
              <tr>
                <Th>Symbol</Th>
                <Th>Type</Th>
                <Th>Severity</Th>
                <Th>Detail</Th>
                <Th right>When</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a, i) => (
                <tr key={`${a.symbol}-${a.type}-${a.barsAgo}-${i}`} className="group hover:bg-elevated/40">
                  <Td mono={false}>
                    <Ticker sym={a.symbol} />
                  </Td>
                  <Td mono={false}>
                    <Chip tone={typeTone(a)}>{TYPE_LABEL[a.type]}</Chip>
                  </Td>
                  <Td mono={false}>
                    <div className="flex items-center gap-2">
                      <div className="w-24 sm:w-32">
                        <ProgressBar value={a.severity} color={severityColor(a)} height={6} />
                      </div>
                      <span className="font-mono text-xs tabular-nums text-muted">{Math.round(a.severity)}</span>
                    </div>
                  </Td>
                  <Td mono={false} className="max-w-[360px] text-muted">
                    <span className="text-xs leading-snug">{a.detail}</span>
                  </Td>
                  <Td right className="text-dim">{a.barsAgo === 0 ? "now" : `${a.barsAgo}d ago`}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-1.5 px-4 py-10 text-center">
          <Icon name="warn" width={18} height={18} className="text-faint" />
          <p className="text-sm text-muted">No {filter === "ALL" ? "" : TYPE_LABEL[filter as AnomalyType].toLowerCase() + " "}anomalies in the current scan.</p>
          {filter !== "ALL" ? (
            <button onClick={() => setFilter("ALL")} className="font-mono text-2xs text-accent hover:underline">
              clear filter
            </button>
          ) : null}
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-line px-4 py-2.5 text-xs text-dim">
        Severity scales with how extreme the z-score / ratio is vs each name&apos;s own recent history.
      </div>
    </Panel>
  );
}
