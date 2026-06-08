/**
 * OrderBookHeatmap — SVG grid of resting liquidity over time.
 * Cells colored by size via heat(). Demo snapshot — live full-depth
 * via Binance WS when enabled.
 */
import { heat } from "@/components/ui/viz";
import type { HeatmapRow } from "@/lib/data/helios";

export function OrderBookHeatmap({
  rows,
  width = 640,
  height = 280,
}: {
  rows: HeatmapRow[];
  width?: number;
  height?: number;
}) {
  const nBuckets = rows[0]?.cells.length ?? 40;
  const nRows = rows.length;
  const cellW = (width - 56) / nBuckets;
  const cellH = height / nRows;
  const labelX = width - 52;

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${width} ${height}`}
      className="block overflow-visible"
      preserveAspectRatio="none"
    >
      {rows.map((row, ri) => (
        <g key={ri}>
          {row.cells.map((intensity, ti) => (
            <rect
              key={ti}
              x={ti * cellW}
              y={ri * cellH}
              width={Math.max(1, cellW - 0.5)}
              height={Math.max(1, cellH - 0.5)}
              fill={heat(intensity)}
              opacity={0.9}
            />
          ))}
          {/* price label */}
          <text
            x={labelX}
            y={ri * cellH + cellH * 0.65}
            fontSize={8}
            fontFamily="var(--font-mono)"
            fill="var(--dim)"
          >
            {row.price.toFixed(row.price > 1000 ? 0 : 2)}
          </text>
        </g>
      ))}
      {/* time axis ticks */}
      {Array.from({ length: 5 }).map((_, i) => {
        const x = ((i + 1) * nBuckets * cellW) / 6;
        const mins = Math.round(((5 - i) * 30) / 5);
        return (
          <text
            key={i}
            x={x}
            y={height - 2}
            fontSize={7}
            fontFamily="var(--font-mono)"
            fill="var(--dim)"
            textAnchor="middle"
          >
            -{mins}m
          </text>
        );
      })}
    </svg>
  );
}
