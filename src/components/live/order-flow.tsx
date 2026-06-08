"use client";

import { useEffect, useRef, useState } from "react";
import { useTrades, useDepth } from "@/components/live/use-binance";
import { FeedBadge } from "@/components/live/feed-badge";
import { useAppState } from "@/components/providers/app-state";
import { Sparkline } from "@/components/ui/viz";
import { cn } from "@/lib/cn";

const CRYPTO = ["BTCUSDT", "ETHUSDT", "SOLUSDT"];
const lbl = (s: string) => s.replace("USDT", "-USD");

export function SymbolSwitcher() {
  const { symbol, setSymbol } = useAppState();
  return (
    <div className="flex items-center gap-1.5">
      {CRYPTO.map((s) => (
        <button
          key={s}
          onClick={() => setSymbol(s)}
          className={cn("rounded border px-2 py-0.5 font-mono text-2xs uppercase tracking-wider transition-colors", symbol === s ? "border-accent/40 bg-accent/10 text-accent" : "border-line text-dim hover:text-muted")}
        >
          {lbl(s)}
        </button>
      ))}
    </div>
  );
}

const fmtQty = (q: number) => (q >= 1000 ? (q / 1000).toFixed(1) + "k" : q >= 1 ? q.toFixed(2) : q.toFixed(4));
const fmtPx = (p: number) => (p >= 1000 ? p.toFixed(1) : p >= 1 ? p.toFixed(3) : p.toFixed(5));

/** Live time & sales tape + cumulative volume delta. */
export function LiveTape({ symbol }: { symbol?: string }) {
  const app = useAppState();
  const sym = symbol ?? app.symbol;
  const { trades, cvd, status, last } = useTrades(sym);
  const [cvdHist, setCvdHist] = useState<number[]>([]);
  useEffect(() => {
    setCvdHist((h) => [...h, cvd].slice(-80));
  }, [cvd]);
  useEffect(() => setCvdHist([]), [sym]);

  const now = Date.now();
  const recent = trades.filter((t) => now - t.t < 2000).length;
  const maxQty = Math.max(...trades.map((t) => t.qty), 1e-9);
  const buys = trades.filter((t) => t.side === "buy").reduce((a, t) => a + t.qty, 0);
  const sells = trades.filter((t) => t.side === "sell").reduce((a, t) => a + t.qty, 0);
  const buyPct = buys + sells > 0 ? (buys / (buys + sells)) * 100 : 50;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-line px-3 py-2">
        <span className="section-label">Time &amp; Sales · {lbl(sym)}</span>
        <FeedBadge status={status} />
      </div>
      <div className="grid grid-cols-3 gap-2 border-b border-line px-3 py-2 text-center">
        <div>
          <div className="kpi-label">Last</div>
          <div className="font-mono text-sm text-ink tabular-nums">{fmtPx(last)}</div>
        </div>
        <div>
          <div className="kpi-label">CVD</div>
          <div className={cn("font-mono text-sm tabular-nums", cvd >= 0 ? "text-pos" : "text-neg")}>{cvd >= 0 ? "+" : ""}{fmtQty(cvd)}</div>
        </div>
        <div>
          <div className="kpi-label">Tape/s</div>
          <div className="font-mono text-sm text-ink tabular-nums">{(recent / 2).toFixed(1)}</div>
        </div>
      </div>
      <div className="border-b border-line px-3 py-2">
        <div className="mb-1 flex items-center justify-between font-mono text-2xs text-dim">
          <span>Cumulative delta</span>
          <span className={cn(buyPct >= 50 ? "text-pos" : "text-neg")}>{buyPct.toFixed(0)}% buy</span>
        </div>
        {cvdHist.length > 3 ? <Sparkline data={cvdHist} width={300} height={30} color={cvd >= 0 ? "var(--pos)" : "var(--neg)"} className="w-full" /> : <div className="h-[30px]" />}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <table className="w-full">
          <tbody>
            {trades.map((t) => {
              const big = t.qty > maxQty * 0.55;
              return (
                <tr key={t.id} className={cn("border-b border-line/40", big && (t.side === "buy" ? "bg-pos/10" : "bg-neg/10"))}>
                  <td className="px-3 py-0.5 font-mono text-2xs tabular-nums text-dim">{new Date(t.t).toISOString().slice(11, 19)}</td>
                  <td className={cn("px-2 py-0.5 text-right font-mono text-xs tabular-nums", t.side === "buy" ? "text-pos" : "text-neg")}>{fmtPx(t.price)}</td>
                  <td className={cn("px-3 py-0.5 text-right font-mono text-xs tabular-nums", big ? "font-semibold text-ink" : "text-muted")}>{fmtQty(t.qty)}</td>
                </tr>
              );
            })}
            {trades.length === 0 ? (
              <tr><td colSpan={3} className="px-3 py-6 text-center font-mono text-2xs text-dim">awaiting prints…</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Live depth-of-market ladder. */
export function LiveDom({ symbol }: { symbol?: string }) {
  const app = useAppState();
  const sym = symbol ?? app.symbol;
  const { depth, status, mid } = useDepth(sym);
  const maxSz = Math.max(...depth.bids.map((b) => b[1]), ...depth.asks.map((a) => a[1]), 1e-9);
  const asks = depth.asks.slice().reverse();

  const Row = ({ price, size, side }: { price: number; size: number; side: "bid" | "ask" }) => (
    <div className="relative grid grid-cols-2 items-center px-3 py-[3px] font-mono text-xs tabular-nums">
      <div
        className={cn("absolute inset-y-0", side === "bid" ? "right-1/2 bg-pos/15" : "left-1/2 bg-neg/15")}
        style={{ width: `${(size / maxSz) * 50}%` }}
      />
      {side === "ask" ? (
        <>
          <span className="relative z-10 text-neg">{fmtPx(price)}</span>
          <span className="relative z-10 text-right text-muted">{fmtQty(size)}</span>
        </>
      ) : (
        <>
          <span className="relative z-10 text-muted">{fmtQty(size)}</span>
          <span className="relative z-10 text-right text-pos">{fmtPx(price)}</span>
        </>
      )}
    </div>
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-line px-3 py-2">
        <span className="section-label">DOM Ladder · {lbl(sym)}</span>
        <FeedBadge status={status} />
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        {asks.map((a, i) => <Row key={"a" + i} price={a[0]} size={a[1]} side="ask" />)}
        <div className="my-0.5 flex items-center justify-center gap-2 border-y border-line bg-elevated/40 py-1 font-mono text-xs">
          <span className="text-dim">mid</span>
          <span className="font-semibold text-accent tabular-nums">{fmtPx(mid)}</span>
        </div>
        {depth.bids.map((b, i) => <Row key={"b" + i} price={b[0]} size={b[1]} side="bid" />)}
        {depth.bids.length === 0 ? <div className="px-3 py-6 text-center font-mono text-2xs text-dim">reconstructing book…</div> : null}
      </div>
    </div>
  );
}
