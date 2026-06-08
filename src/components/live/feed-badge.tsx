"use client";

import type { FeedStatus } from "@/components/live/use-binance";
import { cn } from "@/lib/cn";

/** Honest data-provenance badge — distinguishes real exchange data from the demo fallback. */
export function FeedBadge({ status, source = "Binance WS", className }: { status: FeedStatus; source?: string; className?: string }) {
  const map = {
    live: { dot: "bg-pos", text: "text-pos", label: `LIVE · ${source}` },
    connecting: { dot: "bg-dim", text: "text-dim", label: "connecting…" },
    demo: { dot: "bg-warn", text: "text-warn", label: "DEMO · feed unreachable" },
  }[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded border border-line px-1.5 py-0.5 font-mono text-2xs uppercase tracking-wider", map.text, className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", map.dot, status === "live" && "animate-pulse-soft")} />
      {map.label}
    </span>
  );
}
