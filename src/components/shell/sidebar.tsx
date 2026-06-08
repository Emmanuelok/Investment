"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV } from "@/lib/nav";
import { Icon } from "@/components/icon-map";
import { Eye } from "@/components/icons";
import { cn } from "@/lib/cn";

function isActive(href: string, path: string): boolean {
  if (href === "/") return path === "/";
  return path === href || path.startsWith(href + "/");
}

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="flex h-full w-[244px] shrink-0 flex-col border-r border-line bg-surface/80">
      {/* Brand */}
      <Link href="/" className="flex items-center gap-3 border-b border-line px-4 py-3.5">
        <span className="relative grid h-9 w-9 place-items-center rounded-md border border-accent/40 bg-accent/10 text-accent shadow-[0_0_18px_-6px_var(--accent)]">
          <Eye width={20} height={20} />
        </span>
        <span className="leading-tight">
          <span className="block font-mono text-sm font-semibold tracking-[0.22em] text-ink">PANTHEON</span>
          <span className="block font-mono text-2xs uppercase tracking-widest text-dim">Sovereign Finance OS</span>
        </span>
      </Link>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-3">
        {NAV.map((group) => (
          <div key={group.label} className="mb-4">
            <div className="px-2 pb-1.5 section-label">{group.label}</div>
            <div className="space-y-0.5">
              {group.items.map((it) => {
                const active = isActive(it.href, path);
                return (
                  <Link key={it.href} href={it.href} className={cn("nav-item group", active && "nav-item-active")}>
                    <Icon name={it.icon} width={16} height={16} className={cn("shrink-0", active ? "text-accent" : "text-dim group-hover:text-muted")} />
                    <span className="flex-1 truncate">{it.label}</span>
                    {it.tag ? (
                      <span className="rounded border border-line px-1 py-px font-mono text-[9px] uppercase tracking-wider text-dim group-hover:text-muted">
                        {it.tag}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* System status */}
      <div className="border-t border-line px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="section-label">System</span>
          <span className="flex items-center gap-1.5 font-mono text-2xs text-pos">
            <span className="h-1.5 w-1.5 rounded-full bg-pos animate-pulse-soft" />
            operational
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="section-label">Self-hosted</span>
          <span className="font-mono text-2xs text-accent">sovereign</span>
        </div>
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-line">
          <div className="h-full w-[93%] rounded-full bg-gradient-to-r from-accent/40 to-accent" />
        </div>
        <div className="mt-1.5 font-mono text-[9px] tracking-wide text-faint">14 / 15 sources · 47 signals live</div>
      </div>
    </aside>
  );
}
