"use client";

import { useEffect, useState } from "react";
import { Search } from "@/components/icons";

/** Command-bar trigger — opens the ⌘K palette via custom event. */
export function CommandTrigger() {
  return (
    <button
      onClick={() => window.dispatchEvent(new CustomEvent("pantheon:command"))}
      className="group flex h-9 w-full items-center gap-3 rounded-md border border-line bg-base/60 px-3 text-sm text-dim transition-colors hover:border-line-strong hover:bg-elevated/60"
    >
      <Search width={16} height={16} className="text-dim group-hover:text-muted" />
      <span className="flex-1 text-left">search entity, ticker, signal, or filing…</span>
      <kbd className="hidden rounded border border-line bg-elevated px-1.5 py-0.5 font-mono text-2xs text-dim sm:block">⌘K</kbd>
    </button>
  );
}

/** Live UTC clock. Renders the server value first (no hydration drift), then ticks. */
export function LiveClock({ initial }: { initial: string }) {
  const [t, setT] = useState(initial);
  useEffect(() => {
    const id = setInterval(() => setT(new Date().toISOString().slice(11, 19)), 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="font-mono text-xs tabular-nums text-muted">{t} UTC</span>;
}

/** Append-only PIT archive counter — climbs to feel alive. */
export function ArchiveCounter({ initial }: { initial: number }) {
  const [n, setN] = useState(initial);
  useEffect(() => {
    const id = setInterval(() => setN((x) => x + Math.floor(8 + Math.random() * 240)), 1400);
    return () => clearInterval(id);
  }, []);
  return <span className="font-mono tabular-nums text-accent">+{n.toLocaleString("en-US")}</span>;
}
