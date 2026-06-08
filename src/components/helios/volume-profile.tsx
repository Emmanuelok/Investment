/**
 * VolumeProfile — horizontal bar strip showing traded volume distribution,
 * VAH/VAL/POC markers. Demo snapshot.
 */
import type { VolumeProfileBar } from "@/lib/data/helios";

export function VolumeProfile({
  bars,
  width = 120,
}: {
  bars: VolumeProfileBar[];
  width?: number;
}) {
  const barH = 10;
  const labelW = 64;
  const plotW = width - labelW;
  const svgH = bars.length * (barH + 1);

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${width} ${svgH}`}
      className="block"
      preserveAspectRatio="none"
    >
      {bars.map((b, i) => {
        const barColor = b.poc
          ? "var(--accent)"
          : b.vah || b.val
          ? "var(--warn)"
          : "var(--info)";
        const opacity = b.poc ? 0.9 : 0.55;
        const y = i * (barH + 1);
        const bw = (b.pct / 100) * plotW;

        return (
          <g key={i}>
            <rect
              x={0}
              y={y}
              width={Math.max(1, bw)}
              height={barH}
              fill={barColor}
              opacity={opacity}
              rx={1}
            />
            {/* Labels */}
            {(b.poc || b.vah || b.val) && (
              <text
                x={bw + 3}
                y={y + barH * 0.75}
                fontSize={6}
                fontFamily="var(--font-mono)"
                fill={barColor}
                opacity={0.9}
              >
                {b.poc ? "POC" : b.vah ? "VAH" : "VAL"}
              </text>
            )}
            <text
              x={plotW + 3}
              y={y + barH * 0.75}
              fontSize={6.5}
              fontFamily="var(--font-mono)"
              fill="var(--dim)"
            >
              {b.price.toFixed(b.price > 1000 ? 0 : 2)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
