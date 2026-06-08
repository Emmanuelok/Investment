"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * A self-ticking live number. Mean-reverting random walk around an anchor so it
 * feels like a streaming quote without drifting away. SSR-safe: the server and
 * first client render both show `value`, then it animates after mount. Flashes
 * green/red on each tick. Pure client motion — labelled "Demo Data" globally.
 */
export function LiveStat({
  value,
  vol = 0.0016,
  decimals = 2,
  prefix = "",
  suffix = "",
  compact = false,
  tickMs = 1600,
  className,
}: {
  value: number;
  vol?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  compact?: boolean;
  tickMs?: number;
  className?: string;
}) {
  const anchor = useRef(value);
  const [n, setN] = useState(value);
  const [dir, setDir] = useState<0 | 1 | -1>(0);
  const flashTo = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const id = setInterval(() => {
      setN((prev) => {
        const shock = (Math.random() - 0.5) * 2 * vol * anchor.current;
        const pull = (anchor.current - prev) * 0.12;
        const next = prev + shock + pull;
        setDir(next > prev ? 1 : next < prev ? -1 : 0);
        if (flashTo.current) clearTimeout(flashTo.current);
        flashTo.current = setTimeout(() => setDir(0), 500);
        return next;
      });
    }, tickMs + Math.random() * 600);
    return () => {
      clearInterval(id);
      if (flashTo.current) clearTimeout(flashTo.current);
    };
  }, [vol, tickMs]);

  const fmt = compact
    ? Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: decimals }).format(n)
    : n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

  return (
    <span
      className={cn(
        "tabular-nums transition-colors duration-300",
        dir === 1 ? "text-pos" : dir === -1 ? "text-neg" : "",
        className,
      )}
    >
      {prefix}
      {fmt}
      {suffix}
    </span>
  );
}

/** Tiny pulsing "LIVE" indicator. */
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

/** A live signed-delta chip that re-rolls on a timer. */
export function LiveDelta({ base = 0, vol = 0.25, className }: { base?: number; vol?: number; className?: string }) {
  const [v, setV] = useState(base);
  useEffect(() => {
    const id = setInterval(() => setV(base + (Math.random() - 0.5) * 2 * vol), 2000 + Math.random() * 800);
    return () => clearInterval(id);
  }, [base, vol]);
  const up = v >= 0;
  return (
    <span className={cn("font-mono tabular-nums transition-colors", up ? "text-pos" : "text-neg", className)}>
      {up ? "+" : ""}
      {v.toFixed(2)}%
    </span>
  );
}
