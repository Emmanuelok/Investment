"use client";

import { SymbolSwitcher, LiveDom, LiveTape } from "@/components/live/order-flow";

/** Live order-flow hero — real full-depth crypto book + tape (Binance WS, free). */
export function LiveOrderFlowPanel() {
  return (
    <div className="panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5">
        <span className="section-label">Live Order Flow — real full-depth crypto (free Binance websocket)</span>
        <SymbolSwitcher />
      </div>
      <div className="grid gap-px bg-line md:grid-cols-2">
        <div className="bg-panel" style={{ height: 460 }}><LiveDom /></div>
        <div className="bg-panel" style={{ height: 460 }}><LiveTape /></div>
      </div>
      <div className="border-t border-line px-4 py-2 text-2xs text-dim">
        This is <span className="text-pos">real</span> exchange depth &amp; trades — aggressor side, CVD, and large prints are computed from the live book. Equities/futures
        order flow activates with a licensed Databento/Polygon feed. Order flow is never fabricated.
      </div>
    </div>
  );
}
