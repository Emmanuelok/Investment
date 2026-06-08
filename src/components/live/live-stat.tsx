import { cn } from "@/lib/cn";

/**
 * Formatted numeric value. (Previously animated; now renders a STATIC number —
 * no fake motion. Kept as a component, with its original prop signature intact,
 * so existing call-sites compile unchanged. Real-time surfaces fetch live data
 * and render it directly; this is only a formatter for demo/illustrative stats.)
 */
export function LiveStat({
  value,
  decimals = 2,
  prefix = "",
  suffix = "",
  compact = false,
  className,
}: {
  value: number;
  /** accepted for back-compat; no longer used */
  vol?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  compact?: boolean;
  /** accepted for back-compat; no longer used */
  tickMs?: number;
  className?: string;
}) {
  const fmt = compact
    ? Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: decimals }).format(value)
    : value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return <span className={cn("tabular-nums", className)}>{prefix}{fmt}{suffix}</span>;
}

/** Small pulsing "LIVE" indicator (used on surfaces backed by a live feed). */
export function LiveDot({ label = "LIVE", className }: { label?: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-mono text-2xs uppercase tracking-wider text-pos", className)}>
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pos opacity-60" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-pos" />
      </span>
      {label}
    </span>
  );
}

/** Static signed-delta chip. (No longer animated.) */
export function LiveDelta({ base = 0, className }: { base?: number; vol?: number; className?: string }) {
  const up = base >= 0;
  return (
    <span className={cn("font-mono tabular-nums", up ? "text-pos" : "text-neg", className)}>
      {up ? "+" : ""}{base.toFixed(2)}%
    </span>
  );
}
