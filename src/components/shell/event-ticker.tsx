import { EVENT_STRIP } from "@/lib/data";
import { Dot } from "@/components/icons";

/** Pure-CSS marquee — zero JS, seamless loop via duplicated content. */
export function EventTicker() {
  const items = [...EVENT_STRIP, ...EVENT_STRIP];
  return (
    <div className="flex h-8 shrink-0 items-center overflow-hidden border-b border-line bg-base/60">
      <span className="flex shrink-0 items-center gap-1.5 border-r border-line px-3 font-mono text-2xs uppercase tracking-widest text-accent">
        <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse-soft" />
        Live tape
      </span>
      <div className="relative flex-1 overflow-hidden">
        <div className="flex w-max animate-ticker items-center gap-6 whitespace-nowrap pl-6">
          {items.map((e, i) => (
            <span key={i} className="flex items-center gap-2 font-mono text-2xs text-muted">
              <Dot width={6} height={6} className="text-accent/60" />
              {e}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
