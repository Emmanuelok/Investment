"use client";

import { useTickers } from "@/components/live/use-binance";
import { useAppState } from "@/components/providers/app-state";
import { cn } from "@/lib/cn";

const SYMS = ["BTCUSDT", "ETHUSDT", "SOLUSDT"];
const LABEL: Record<string, string> = { BTCUSDT: "BTC", ETHUSDT: "ETH", SOLUSDT: "SOL" };

/** Real-time crypto strip in the top bar — free Binance feed, click to link the cockpit symbol. */
export function LiveTickerBar() {
  const { quotes, status } = useTickers(SYMS);
  const { setSymbol, symbol } = useAppState();
  return (
    <div className="hidden items-center gap-2 xl:flex">
      <span className={cn("h-1.5 w-1.5 rounded-full", status === "live" ? "bg-pos animate-pulse-soft" : status === "demo" ? "bg-warn" : "bg-dim")} title={status === "live" ? "Live · Binance" : status === "demo" ? "Demo fallback" : "connecting"} />
      {SYMS.map((s) => {
        const q = quotes[s];
        const price = q?.price;
        const chg = q?.chg ?? 0;
        return (
          <button
            key={s}
            onClick={() => setSymbol(s)}
            className={cn("flex items-center gap-1.5 rounded border px-2 py-1 font-mono text-2xs transition-colors", symbol === s ? "border-accent/40 bg-accent/5" : "border-line hover:border-line-strong")}
            title={`Link ${LABEL[s]} to cockpit`}
          >
            <span className="text-muted">{LABEL[s]}</span>
            <span className="tabular-nums text-ink">{price != null ? (price >= 1000 ? price.toFixed(0) : price.toFixed(2)) : "—"}</span>
            <span className={cn("tabular-nums", chg >= 0 ? "text-pos" : "text-neg")}>{chg >= 0 ? "+" : ""}{chg.toFixed(2)}%</span>
          </button>
        );
      })}
    </div>
  );
}
