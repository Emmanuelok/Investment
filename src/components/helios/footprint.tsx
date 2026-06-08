/**
 * FootprintCluster — price rows × bid|ask traded volume with imbalance
 * highlighting and per-row delta. DEMO snapshot — live footprint data
 * streams from exchange websockets when enabled.
 */
import type { FootprintRow } from "@/lib/data/helios";
import { fmtInt } from "@/lib/format";

export function FootprintCluster({
  rows,
  maxVol,
}: {
  rows: FootprintRow[];
  maxVol: number;
}) {
  return (
    <div className="font-mono tabular-nums text-xs">
      {/* Header */}
      <div className="flex items-center gap-1 border-b border-line px-2 py-1.5 text-[10px] text-dim">
        <span className="w-20 text-right">BID</span>
        <span className="w-24 text-center">PRICE</span>
        <span className="w-20 text-left">ASK</span>
        <span className="w-16 text-right">DELTA</span>
        <span className="w-12 text-right">IMB</span>
      </div>
      {rows.map((row, i) => {
        const totalVol = row.bid + row.ask;
        const bidPct = (row.bid / maxVol) * 100;
        const askPct = (row.ask / maxVol) * 100;
        const isImbalanceBid = row.imbalance === "bid";
        const isImbalanceAsk = row.imbalance === "ask";
        const deltaColor = row.delta > 0 ? "text-pos" : row.delta < 0 ? "text-neg" : "text-muted";

        return (
          <div
            key={i}
            className={`relative flex items-center gap-1 border-b border-line/40 px-2 py-[3px] transition-colors ${
              row.poc ? "bg-accent/10" : isImbalanceAsk ? "bg-pos/5" : isImbalanceBid ? "bg-neg/5" : "hover:bg-elevated/30"
            }`}
          >
            {/* Bid volume bar (right-aligned) */}
            <div className="relative flex w-20 items-center justify-end gap-1">
              <div className="absolute right-0 h-[18px] rounded-sm bg-neg/25" style={{ width: `${bidPct}%` }} />
              <span className={`relative z-10 text-[11px] ${isImbalanceBid ? "text-neg font-medium" : "text-muted"}`}>
                {fmtInt(row.bid)}
              </span>
            </div>

            {/* Price */}
            <div className="w-24 text-center">
              <span className={`text-[11px] ${row.poc ? "text-accent font-semibold" : "text-ink"}`}>
                {row.price.toFixed(row.price > 1000 ? (row.price > 10000 ? 0 : 2) : 4)}
              </span>
              {row.poc && (
                <span className="ml-1 text-[9px] text-accent opacity-80">POC</span>
              )}
            </div>

            {/* Ask volume bar (left-aligned) */}
            <div className="relative flex w-20 items-center justify-start gap-1">
              <div className="absolute left-0 h-[18px] rounded-sm bg-pos/25" style={{ width: `${askPct}%` }} />
              <span className={`relative z-10 text-[11px] ${isImbalanceAsk ? "text-pos font-medium" : "text-muted"}`}>
                {fmtInt(row.ask)}
              </span>
            </div>

            {/* Delta */}
            <div className={`w-16 text-right text-[11px] ${deltaColor}`}>
              {row.delta > 0 ? "+" : ""}{fmtInt(row.delta)}
            </div>

            {/* Imbalance */}
            <div className="w-12 text-right">
              {isImbalanceAsk && <span className="text-[9px] text-pos font-medium">ASK↑</span>}
              {isImbalanceBid && <span className="text-[9px] text-neg font-medium">BID↓</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
