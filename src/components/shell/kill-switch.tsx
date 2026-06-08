"use client";

import { useAppState } from "@/components/providers/app-state";
import { Bolt, Shield } from "@/components/icons";
import { cn } from "@/lib/cn";

/** Top-bar global trading kill-switch (ATLAS). Confirm-guarded when arming. */
export function KillSwitchChip() {
  const { killed, setKilled } = useAppState();
  return (
    <button
      onClick={() => {
        if (!killed) {
          if (confirm("Arm the GLOBAL KILL-SWITCH? This halts all trading across AEGIS · KEPLER · HELIOS.")) setKilled(true);
        } else setKilled(false);
      }}
      className={cn(
        "flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 font-mono text-2xs uppercase tracking-wider transition-colors",
        killed ? "border-neg/50 bg-neg/15 text-neg" : "border-line text-dim hover:border-line-strong hover:text-muted",
      )}
      title="Global trading kill-switch"
    >
      {killed ? <Bolt width={13} height={13} className="animate-pulse-soft" /> : <Shield width={13} height={13} />}
      {killed ? "Halted" : "Kill-switch"}
    </button>
  );
}

/** Full-width banner shown while the kill-switch is armed. */
export function KillSwitchBanner() {
  const { killed, setKilled } = useAppState();
  if (!killed) return null;
  return (
    <div className="flex shrink-0 items-center justify-center gap-3 border-b border-neg/40 bg-neg/15 px-4 py-1.5">
      <Bolt width={14} height={14} className="text-neg animate-pulse-soft" />
      <span className="font-mono text-2xs uppercase tracking-widest text-neg">Global kill-switch armed — all trading halted across AEGIS · KEPLER · HELIOS · propagated over the bus</span>
      <button onClick={() => setKilled(false)} className="rounded border border-neg/40 px-2 py-0.5 font-mono text-2xs text-neg hover:bg-neg/10">disarm</button>
    </div>
  );
}
