import { cn } from "@/lib/cn";

/**
 * Pure-SVG visualizations — no charting library, fully server-renderable,
 * zero client JS. Deterministic input -> deterministic output.
 */

function pathFrom(values: number[], w: number, h: number, pad = 1) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const dx = (w - pad * 2) / (values.length - 1 || 1);
  return values
    .map((v, i) => {
      const x = pad + i * dx;
      const y = pad + (h - pad * 2) * (1 - (v - min) / span);
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

export function Sparkline({
  data,
  width = 120,
  height = 34,
  color,
  area = true,
  strokeWidth = 1.4,
  className,
}: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  area?: boolean;
  strokeWidth?: number;
  className?: string;
}) {
  const up = data[data.length - 1] >= data[0];
  const stroke = color ?? (up ? "var(--pos)" : "var(--neg)");
  const d = pathFrom(data, width, height);
  const gid = `sg-${Math.abs(hashStr(d + stroke))}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={cn("overflow-visible", className)} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      {area ? <path d={`${d} L${width - 1},${height - 1} L1,${height - 1} Z`} fill={`url(#${gid})`} /> : null}
      <path d={d} fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function MiniBars({
  data,
  width = 120,
  height = 34,
  color = "var(--accent)",
  className,
}: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}) {
  const max = Math.max(...data, 1);
  const gap = 1.5;
  const bw = (width - gap * (data.length - 1)) / data.length;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className}>
      {data.map((v, i) => {
        const bh = Math.max(1, (v / max) * height);
        return <rect key={i} x={i * (bw + gap)} y={height - bh} width={bw} height={bh} rx={0.6} fill={color} opacity={0.45 + 0.55 * (v / max)} />;
      })}
    </svg>
  );
}

/** Diverging bars around a zero baseline (e.g. CVD / delta / factor returns). */
export function DeltaBars({
  data,
  width = 160,
  height = 40,
  className,
}: {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
}) {
  const max = Math.max(...data.map((d) => Math.abs(d)), 1e-9);
  const gap = 1.2;
  const bw = (width - gap * (data.length - 1)) / data.length;
  const mid = height / 2;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className}>
      <line x1={0} y1={mid} x2={width} y2={mid} stroke="var(--line)" strokeWidth={1} />
      {data.map((v, i) => {
        const bh = (Math.abs(v) / max) * (mid - 1);
        const y = v >= 0 ? mid - bh : mid;
        return <rect key={i} x={i * (bw + gap)} y={y} width={bw} height={Math.max(0.6, bh)} fill={v >= 0 ? "var(--pos)" : "var(--neg)"} opacity={0.85} />;
      })}
    </svg>
  );
}

export function ProgressBar({
  value,
  max = 100,
  color = "var(--accent)",
  track = "var(--line)",
  height = 6,
  className,
  showGlow,
}: {
  value: number;
  max?: number;
  color?: string;
  track?: string;
  height?: number;
  className?: string;
  showGlow?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={cn("w-full overflow-hidden rounded-full", className)} style={{ height, background: track }}>
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${pct}%`, background: color, boxShadow: showGlow ? `0 0 10px -1px ${color}` : undefined }}
      />
    </div>
  );
}

/** Single-value ring gauge. */
export function Ring({
  value,
  max = 100,
  size = 64,
  stroke = 6,
  color = "var(--accent)",
  label,
  sub,
}: {
  value: number;
  max?: number;
  size?: number;
  stroke?: number;
  color?: string;
  label?: string;
  sub?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / max));
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {label ? <span className="font-mono text-sm font-medium text-ink">{label}</span> : null}
        {sub ? <span className="font-mono text-2xs text-dim">{sub}</span> : null}
      </div>
    </div>
  );
}

/** Horizontal heat row — cells colored by intensity (e.g. correlation strip). */
export function HeatRow({
  values,
  className,
  cellH = 14,
}: {
  values: number[];
  className?: string;
  cellH?: number;
}) {
  return (
    <div className={cn("flex gap-0.5", className)}>
      {values.map((v, i) => {
        const t = Math.max(0, Math.min(1, v));
        return <div key={i} className="flex-1 rounded-[1px]" style={{ height: cellH, background: heat(t) }} />;
      })}
    </div>
  );
}

export function heat(t: number): string {
  // teal (low) -> amber (mid) -> red (high)
  if (t < 0.5) {
    const k = t / 0.5;
    return mix([31, 229, 192], [242, 180, 61], k, 0.18 + 0.5 * k);
  }
  const k = (t - 0.5) / 0.5;
  return mix([242, 180, 61], [255, 93, 99], k, 0.5 + 0.45 * k);
}

function mix(a: number[], b: number[], k: number, alpha: number) {
  const c = a.map((x, i) => Math.round(x + (b[i] - x) * k));
  return `rgba(${c[0]},${c[1]},${c[2]},${alpha.toFixed(2)})`;
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}
