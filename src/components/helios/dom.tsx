/**
 * PriceLadderDOM — full-depth DOM (Depth of Market) price ladder.
 * Rows: bid size | price | ask size, histogram bars sized by volume,
 * centred near mid-price. DEMO snapshot — real depth via exchange WS when live.
 */
import type { DomRow } from "@/lib/data/helios";
import { fmtInt } from "@/lib/format";

export function PriceLadderDOM({ rows }: { rows: DomRow[] }) {
  const maxBid = Math.max(...rows.map((r) => r.bidSize), 1);
  const maxAsk = Math.max(...rows.map((r) => r.askSize), 1);
  const BAR_MAX_W = 96; // px

  return (
    <div className="font-mono tabular-nums text-xs select-none">
      {/* Column header */}
      <div className="grid grid-cols-[1fr_80px_1fr] border-b border-line px-2 py-1.5 text-[10px] text-dim">
        <span className="text-right pr-2">BID SIZE</span>
        <span className="text-center">PRICE</span>
        <span className="text-left pl-2">ASK SIZE</span>
      </div>

      {rows.map((row, i) => {
        const isBid = row.bidSize > 0 && !row.isMid;
        const isAsk = row.askSize > 0;
        const isMid = row.isMid;

        const bidBarW = isBid || isMid ? Math.round((row.bidSize / maxBid) * BAR_MAX_W) : 0;
        const askBarW = isAsk ? Math.round((row.askSize / maxAsk) * BAR_MAX_W) : 0;
        const isLargeBid = row.bidSize > maxBid * 0.6;
        const isLargeAsk = row.askSize > maxAsk * 0.6;

        return (
          <div
            key={i}
            className={`relative grid grid-cols-[1fr_80px_1fr] items-center border-b border-line/30 px-2 py-[3px] transition-colors
              ${isMid ? "bg-accent/8 border-accent/30" : "hover:bg-elevated/30"}`}
          >
            {/* Bid side */}
            <div className="relative flex items-center justify-end gap-1 pr-2 h-5">
              {(isBid || isMid) && (
                <>
                  <div
                    className="absolute right-0 h-[14px] rounded-[2px]"
                    style={{
                      width: `${bidBarW}px`,
                      background: isLargeBid
                        ? "rgba(31,229,192,0.35)"
                        : "rgba(31,229,192,0.18)",
                    }}
                  />
                  <span
                    className={`relative z-10 text-[11px] ${
                      isLargeBid ? "text-pos font-semibold" : "text-muted"
                    }`}
                  >
                    {fmtInt(row.bidSize)}
                  </span>
                </>
              )}
            </div>

            {/* Price */}
            <div className="text-center">
              <span
                className={`text-[11px] ${
                  isMid
                    ? "text-accent font-semibold"
                    : isBid
                    ? "text-pos"
                    : "text-neg"
                }`}
              >
                {row.price.toFixed(row.price > 10000 ? 0 : row.price > 1000 ? 2 : 4)}
              </span>
              {isMid && <span className="ml-1 text-[9px] text-accent opacity-70">MID</span>}
            </div>

            {/* Ask side */}
            <div className="relative flex items-center justify-start gap-1 pl-2 h-5">
              {isAsk && (
                <>
                  <div
                    className="absolute left-0 h-[14px] rounded-[2px]"
                    style={{
                      width: `${askBarW}px`,
                      background: isLargeAsk
                        ? "rgba(255,93,99,0.35)"
                        : "rgba(255,93,99,0.18)",
                    }}
                  />
                  <span
                    className={`relative z-10 text-[11px] ${
                      isLargeAsk ? "text-neg font-semibold" : "text-muted"
                    }`}
                  >
                    {fmtInt(row.askSize)}
                  </span>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
