"use client";

import { useMemo } from "react";
import { TradingChart } from "@/components/charts/trading-chart";
import { useTrades } from "@/components/live/use-binance";
import { FeedBadge } from "@/components/live/feed-badge";
import { useAppState } from "@/components/providers/app-state";
import { candleSeries } from "@/lib/rng";
import { cn } from "@/lib/cn";

const META: Record<string, { base: number; vol: number }> = {
  BTCUSDT: { base: 67000, vol: 0.02 },
  ETHUSDT: { base: 3500, vol: 0.022 },
  SOLUSDT: { base: 150, vol: 0.03 },
};
const CRYPTO = Object.keys(META);
const lbl = (s: string) => s.replace("USDT", "-USD");

/** Interactive charting hero — deterministic candle history with a live last-price mark. */
export function LiveChartPanel() {
  const { symbol, setSymbol } = useAppState();
  const sym = CRYPTO.includes(symbol) ? symbol : "BTCUSDT";
  const meta = META[sym];
  const { last, status } = useTrades(sym, 4);
  const candles = useMemo(() => candleSeries(sym + "-h1", 220, meta.base, meta.vol, 0.0003), [sym, meta.base, meta.vol]);
  const first = candles[candles.length - 2]?.c ?? last;
  const chg = first ? (last / first - 1) * 100 : 0;

  return (
    <div className="panel p-3">
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          {CRYPTO.map((s) => (
            <button key={s} onClick={() => setSymbol(s)} className={cn("rounded border px-2 py-0.5 font-mono text-2xs uppercase tracking-wider transition-colors", sym === s ? "border-accent/40 bg-accent/10 text-accent" : "border-line text-dim hover:text-muted")}>
              {lbl(s)}
            </button>
          ))}
        </div>
        <span className="font-mono text-lg font-semibold tabular-nums text-ink">{last >= 1000 ? last.toFixed(1) : last.toFixed(2)}</span>
        <span className={cn("font-mono text-xs tabular-nums", chg >= 0 ? "text-pos" : "text-neg")}>{chg >= 0 ? "+" : ""}{chg.toFixed(2)}%</span>
        <FeedBadge status={status} className="ml-auto" />
      </div>
      <TradingChart candles={candles} livePrice={last} height={420} />
    </div>
  );
}
