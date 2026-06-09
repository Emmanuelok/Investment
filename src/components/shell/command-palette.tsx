"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { NAV } from "@/lib/nav";
import { Icon } from "@/components/icon-map";
import { Search, Command, ChevronRight } from "@/components/icons";
import { cn } from "@/lib/cn";

type Cmd = { label: string; href: string; icon: string; group: string; tag?: string };

const FLAT: Cmd[] = NAV.flatMap((g) => g.items.map((it) => ({ ...it, group: g.label })));

const QUICK: Cmd[] = [
  { label: "Open BTC chart", href: "/charts", icon: "candle", group: "Action" },
  { label: "Screen: semis < 20x fwd P/E, rev > 20%", href: "/terminal/screener", icon: "filter", group: "Action" },
  { label: "Latest filings & 13F activity", href: "/terminal/filings", icon: "doc", group: "Action" },
];

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("pantheon:command", onOpen as EventListener);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pantheon:command", onOpen as EventListener);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQ("");
      setIdx(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  const results = useMemo(() => {
    const pool = [...QUICK, ...FLAT];
    if (!q.trim()) return pool.slice(0, 9);
    const t = q.toLowerCase();
    return pool.filter((c) => (c.label + c.group + (c.tag ?? "")).toLowerCase().includes(t)).slice(0, 10);
  }, [q]);

  useEffect(() => setIdx(0), [q]);

  if (!open) return null;

  const go = (c?: Cmd) => {
    const target = c ?? results[idx];
    if (!target) return;
    setOpen(false);
    router.push(target.href);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh]" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-2xl overflow-hidden rounded-lg border border-line-strong bg-panel shadow-2xl animate-rise-in">
        <div className="flex items-center gap-3 border-b border-line px-4 py-3">
          <Search width={18} height={18} className="text-dim" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => Math.min(i + 1, results.length - 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); }
              if (e.key === "Enter") { e.preventDefault(); go(); }
            }}
            placeholder="Search entity, ticker, signal, filing, or command…"
            className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-dim"
          />
          <span className="hidden items-center gap-1 sm:flex">
            <kbd className="rounded border border-line bg-elevated px-1.5 py-0.5 font-mono text-2xs text-dim">esc</kbd>
          </span>
        </div>
        <ul className="max-h-[52vh] overflow-y-auto py-1.5">
          {results.map((c, i) => (
            <li key={c.href + c.label}>
              <button
                onMouseEnter={() => setIdx(i)}
                onClick={() => go(c)}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm",
                  i === idx ? "bg-elevated text-ink" : "text-muted",
                )}
              >
                <Icon name={c.icon} width={16} height={16} className={i === idx ? "text-accent" : "text-dim"} />
                <span className="flex-1 truncate">{c.label}</span>
                <span className="font-mono text-2xs uppercase tracking-wider text-dim">{c.group}</span>
                <ChevronRight width={14} height={14} className="text-faint" />
              </button>
            </li>
          ))}
          {results.length === 0 ? <li className="px-4 py-6 text-center text-sm text-dim">No matches.</li> : null}
        </ul>
        <div className="flex items-center justify-between border-t border-line px-4 py-2 font-mono text-2xs text-faint">
          <span className="flex items-center gap-1.5"><Command width={12} height={12} /> PANTHEON command bar</span>
          <span>↑↓ navigate · ↵ open</span>
        </div>
      </div>
    </div>
  );
}
