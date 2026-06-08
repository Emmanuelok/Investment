import type { Candle } from "@/lib/rng";
import { cn } from "@/lib/cn";

/**
 * Server-rendered SVG candlestick chart with optional volume pane + SMA overlay.
 * Deterministic, zero client JS. Honest demo snapshot — live streaming candles
 * come from the OBSIDIAN/HELIOS data pipeline when enabled.
 */
export function Candles({
  data,
  width = 720,
  height = 280,
  volume = true,
  sma,
  className,
}: {
  data: Candle[];
  width?: number;
  height?: number;
  volume?: boolean;
  sma?: number; // SMA period overlay
  className?: string;
}) {
  const padR = 46;
  const volH = volume ? Math.round(height * 0.18) : 0;
  const priceH = height - volH - 8;
  const plotW = width - padR;

  const highs = data.map((d) => d.h);
  const lows = data.map((d) => d.l);
  const max = Math.max(...highs);
  const min = Math.min(...lows);
  const span = max - min || 1;
  const maxVol = Math.max(...data.map((d) => d.v), 1);

  const n = data.length;
  const step = plotW / n;
  const bw = Math.max(1.4, step * 0.62);

  const y = (p: number) => 4 + priceH * (1 - (p - min) / span);

  // SMA overlay
  let smaPath = "";
  if (sma && sma > 1) {
    const pts: string[] = [];
    for (let i = 0; i < n; i++) {
      if (i < sma - 1) continue;
      let s = 0;
      for (let k = 0; k < sma; k++) s += data[i - k].c;
      const avg = s / sma;
      const x = i * step + step / 2;
      pts.push(`${pts.length === 0 ? "M" : "L"}${x.toFixed(1)},${y(avg).toFixed(1)}`);
    }
    smaPath = pts.join(" ");
  }

  const gridLines = 4;
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} className={cn("block", className)} preserveAspectRatio="none">
      {/* horizontal grid + price axis */}
      {Array.from({ length: gridLines + 1 }).map((_, i) => {
        const gy = 4 + (priceH * i) / gridLines;
        const price = max - (span * i) / gridLines;
        return (
          <g key={i}>
            <line x1={0} y1={gy} x2={plotW} y2={gy} stroke="var(--line)" strokeWidth={0.6} />
            <text x={width - padR + 6} y={gy + 3} fontSize={9} fontFamily="var(--font-mono)" fill="var(--dim)">
              {price.toFixed(price > 1000 ? 0 : 2)}
            </text>
          </g>
        );
      })}

      {/* candles */}
      {data.map((d, i) => {
        const x = i * step + step / 2;
        const up = d.c >= d.o;
        const color = up ? "var(--pos)" : "var(--neg)";
        const yo = y(d.o);
        const yc = y(d.c);
        const top = Math.min(yo, yc);
        const bh = Math.max(0.8, Math.abs(yc - yo));
        return (
          <g key={i}>
            <line x1={x} y1={y(d.h)} x2={x} y2={y(d.l)} stroke={color} strokeWidth={0.9} opacity={0.9} />
            <rect x={x - bw / 2} y={top} width={bw} height={bh} fill={color} opacity={up ? 0.85 : 0.9} />
          </g>
        );
      })}

      {/* SMA */}
      {smaPath ? <path d={smaPath} fill="none" stroke="var(--accent)" strokeWidth={1.2} opacity={0.85} /> : null}

      {/* volume pane */}
      {volume
        ? data.map((d, i) => {
            const x = i * step + step / 2;
            const vh = (d.v / maxVol) * (volH - 4);
            const up = d.c >= d.o;
            return <rect key={i} x={x - bw / 2} y={height - vh} width={bw} height={vh} fill={up ? "var(--pos)" : "var(--neg)"} opacity={0.32} />;
          })
        : null}
    </svg>
  );
}
