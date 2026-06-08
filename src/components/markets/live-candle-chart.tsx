"use client";

import { useEffect, useState, useCallback } from "react";
import { Panel, PanelHeader, Chip } from "@/components/ui/kit";
import { Candles } from "@/components/ui/candles";
import { candleSeries } from "@/lib/rng";
import { cn } from "@/lib/cn";
import type { Candle } from "@/lib/rng";

/* ── Types ─────────────────────────────────────────────────────────────────── */

type Status = "loading" | "live" | "demo";

interface QuoteData {
  sym: string;
  name: string;
  price: number;
  chg: number;
  chgPct: number;
  vol: string;
  open: number;
  high: number;
  low: number;
  prevClose: number;
}

interface ApiResponse {
  live: boolean;
  source?: string;
  asOf?: string;
  quote?: QuoteData;
  candles?: Candle[];
}

/* ── Helpers ────────────────────────────────────────────────────────────────── */

const compact = (n: number) =>
  n >= 1e9
    ? (n / 1e9).toFixed(1) + "B"
    : n >= 1e6
      ? (n / 1e6).toFixed(1) + "M"
      : n >= 1e3
        ? (n / 1e3).toFixed(1) + "K"
        : String(Math.round(n));

function buildDemoData(sym: string): { quote: QuoteData; candles: Candle[] } {
  const candles = candleSeries(sym, 90, 200, 0.02, 0.0004);
  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  const chg = last.c - prev.c;
  const chgPct = (chg / prev.c) * 100;
  const high = Math.max(...candles.map((c) => c.h));
  const low = Math.min(...candles.map((c) => c.l));
  const totalVol = candles.reduce((s, c) => s + c.v, 0);
  const quote: QuoteData = {
    sym,
    name: sym,
    price: last.c,
    chg,
    chgPct,
    vol: compact(Math.round(totalVol / candles.length)),
    open: last.o,
    high,
    low,
    prevClose: prev.c,
  };
  return { quote, candles };
}

/* ── Component ──────────────────────────────────────────────────────────────── */

export interface LiveCandleChartProps {
  symbol?: string;
  presets?: string[];
  title?: string;
}

export function LiveCandleChart({
  symbol,
  presets,
  title = "Live Equity Chart",
}: LiveCandleChartProps) {
  const defaultSym = presets?.[0] ?? symbol ?? "SPY";
  const [sel, setSel] = useState(symbol ?? defaultSym);
  const [status, setStatus] = useState<Status>("loading");
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [updated, setUpdated] = useState("");
  const [liveSource, setLiveSource] = useState("");

  const load = useCallback(
    async (sym: string) => {
      setStatus("loading");
      try {
        const r = await fetch(
          `/api/quote?symbol=${encodeURIComponent(sym)}&range=3mo&limit=90`,
          { cache: "no-store" },
        );
        const j = (await r.json()) as ApiResponse;
        if (j.live && j.quote && j.candles?.length) {
          setQuote(j.quote);
          setCandles(j.candles);
          setStatus("live");
          setLiveSource(j.source ?? "yahoo");
          setUpdated(
            new Date(j.asOf!).toLocaleTimeString("en-US", { hour12: false }),
          );
        } else {
          const demo = buildDemoData(sym);
          setQuote(demo.quote);
          setCandles(demo.candles);
          setStatus("demo");
        }
      } catch {
        const demo = buildDemoData(sym);
        setQuote(demo.quote);
        setCandles(demo.candles);
        setStatus("demo");
      }
    },
    [],
  );

  // Initial load + symbol change
  useEffect(() => {
    load(sel);
  }, [sel, load]);

  // 30-second refresh
  useEffect(() => {
    const id = setInterval(() => load(sel), 30_000);
    return () => clearInterval(id);
  }, [sel, load]);

  // When `symbol` prop changes externally (no presets), follow it
  useEffect(() => {
    if (symbol && !presets) setSel(symbol);
  }, [symbol, presets]);

  const chgPos = (quote?.chgPct ?? 0) >= 0;

  return (
    <Panel>
      {/* ── Header row ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3">
        {/* Left: symbol + name + price */}
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded border border-line bg-elevated/70 px-1.5 py-0.5 font-mono text-xs font-medium text-ink">
              {sel}
            </span>
            {quote && quote.name !== sel && (
              <span className="text-xs text-dim">{quote.name}</span>
            )}
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-mono text-2xl font-semibold tabular-nums text-ink">
              {quote ? quote.price.toFixed(2) : "—"}
            </span>
            <span
              className={cn(
                "font-mono text-sm tabular-nums",
                chgPos ? "text-pos" : "text-neg",
              )}
            >
              {quote
                ? `${chgPos ? "+" : ""}${quote.chgPct.toFixed(2)}%`
                : ""}
            </span>
          </div>
        </div>

        {/* Right: status badge + presets */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Symbol presets */}
          {presets && presets.length > 0 && (
            <div className="flex items-center gap-1">
              {presets.map((p) => (
                <button
                  key={p}
                  onClick={() => setSel(p)}
                  className={cn(
                    "chip cursor-pointer transition-colors",
                    sel === p ? "chip-accent" : "hover:bg-elevated/60",
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          {/* LIVE / DEMO / loading badge — mirrors markets-overview.tsx exactly */}
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
                LIVE · {liveSource}
              </span>
              <span className="hidden font-mono text-2xs text-dim sm:inline">
                as of {updated}
              </span>
            </>
          ) : (
            <span className="flex items-center gap-1.5 rounded border border-warn/40 bg-warn/10 px-2 py-1 font-mono text-2xs uppercase tracking-wider text-warn">
              <span className="h-1.5 w-1.5 rounded-full bg-warn" />
              DEMO · live feed unreachable
            </span>
          )}
        </div>
      </div>

      {/* ── Panel header (title + sub) ──────────────────────────────────────── */}
      <PanelHeader
        title={title}
        sub={
          status === "live"
            ? `Live daily candles · SMA-20 overlay · ${sel} 3M`
            : "Demo snapshot · SMA-20 overlay · 90 candles"
        }
        right={
          <div className="flex items-center gap-2">
            <Chip>SMA 20</Chip>
            <Chip tone="accent">3M</Chip>
          </div>
        }
      />

      {/* ── Candles chart ──────────────────────────────────────────────────── */}
      <div className="p-3">
        <Candles
          data={candles.length > 0 ? candles : buildDemoData(sel).candles}
          width={760}
          height={300}
          volume
          sma={20}
          className="w-full"
        />
      </div>

      {/* ── OHLC strip ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 divide-x divide-line border-t border-line">
        {[
          {
            label: "OPEN",
            value: quote ? quote.open.toFixed(2) : "—",
          },
          {
            label: "HIGH",
            value: quote ? quote.high.toFixed(2) : "—",
          },
          {
            label: "LOW",
            value: quote ? quote.low.toFixed(2) : "—",
          },
          {
            label: "VOLUME",
            value: quote ? quote.vol : "—",
          },
        ].map((s) => (
          <div key={s.label} className="px-4 py-2.5">
            <div className="kpi-label">{s.label}</div>
            <div className="mt-1 font-mono text-sm tabular-nums text-ink">
              {s.value}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
