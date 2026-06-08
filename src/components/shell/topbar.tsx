import { Bell, Shield, Warn, Database } from "@/components/icons";
import { CommandTrigger, LiveClock, ArchiveCounter } from "@/components/shell/client-widgets";
import { utcClock } from "@/lib/format";

export function TopBar() {
  return (
    <header className="z-40 flex h-14 shrink-0 items-center gap-4 border-b border-line bg-surface/70 px-4 backdrop-blur">
      {/* Command bar */}
      <div className="hidden max-w-xl flex-1 md:block">
        <CommandTrigger />
      </div>

      <div className="flex-1 md:hidden" />

      {/* Status cluster */}
      <div className="flex items-center gap-3">
        <span className="hidden items-center gap-2 rounded-md border border-line bg-base/50 px-2.5 py-1.5 lg:flex">
          <Database width={14} height={14} className="text-accent" />
          <span className="font-mono text-2xs uppercase tracking-wider text-dim">PIT Lake · Archiving</span>
          <ArchiveCounter initial={1284302} />
          <span className="font-mono text-2xs text-dim">obs today</span>
        </span>

        <span className="hidden items-center gap-1.5 rounded-md border border-pos/30 bg-pos/10 px-2.5 py-1.5 sm:flex">
          <Shield width={14} height={14} className="text-pos" />
          <span className="font-mono text-2xs uppercase tracking-wider text-pos">Compliance</span>
          <span className="font-mono text-2xs font-semibold text-pos">PASS</span>
        </span>

        <span className="flex items-center gap-1.5 rounded-md border border-warn/30 bg-warn/10 px-2.5 py-1.5">
          <Warn width={14} height={14} className="text-warn" />
          <span className="font-mono text-2xs uppercase tracking-wider text-warn">Demo Data</span>
        </span>

        <LiveClock initial={utcClock()} />

        <button className="relative grid h-9 w-9 place-items-center rounded-md border border-line text-muted transition-colors hover:border-line-strong hover:text-ink">
          <Bell width={16} height={16} />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-accent" />
        </button>
      </div>
    </header>
  );
}
