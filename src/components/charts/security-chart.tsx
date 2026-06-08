"use client";

import { useMemo } from "react";
import { TradingChart } from "@/components/charts/trading-chart";
import { candleSeries } from "@/lib/rng";

/** Interactive price chart for a single security (deterministic demo history). */
export function SecurityChart({ seed = "NVDA-des", base = 128, vol = 0.028, label = "NVDA" }: { seed?: string; base?: number; vol?: number; label?: string }) {
  const candles = useMemo(() => candleSeries(seed, 180, base, vol, 0.0016), [seed, base, vol]);
  return (
    <div className="panel p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="section-label">{label} · Interactive Chart</span>
        <span className="font-mono text-2xs text-faint">scroll = zoom · drag = pan · hover = OHLC</span>
      </div>
      <TradingChart candles={candles} height={360} />
    </div>
  );
}
