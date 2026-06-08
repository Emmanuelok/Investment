"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, Warn, Shield, Bolt, Sparkle, Dot } from "@/components/icons";
import { cn } from "@/lib/cn";

type Tone = "accent" | "warn" | "pos" | "ai";
type Note = { id: number; tone: Tone; title: string; body: string; ago: number };

const POOL: Omit<Note, "id" | "ago">[] = [
  { tone: "accent", title: "NVDA breakout", body: "Crossed VWAP+2σ on 3.1× volume" },
  { tone: "warn", title: "Risk limit 78%", body: "Tech factor exposure nearing cap" },
  { tone: "ai", title: "ATHENA insight", body: "Regime shift → momentum decaying" },
  { tone: "pos", title: "Fill confirmed", body: "LMT 2,400 @ 458.12 — 4bps slippage" },
  { tone: "accent", title: "Alt-data spike", body: "Retail web traffic +18% WoW (ELF)" },
  { tone: "warn", title: "8-K filed", body: "RTX material event — 2m ago" },
  { tone: "ai", title: "Alpha promoted", body: "reversal_v3 IC 0.061 → live shadow" },
  { tone: "pos", title: "Settlement clear", body: "T+1 batch reconciled, 0 breaks" },
];

const ICON: Record<Tone, typeof Bell> = { accent: Bolt, warn: Warn, pos: Shield, ai: Sparkle };
const TONE: Record<Tone, string> = {
  accent: "text-accent",
  warn: "text-warn",
  pos: "text-pos",
  ai: "text-ai",
};

export function Notifications() {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<Note[]>(() => POOL.slice(0, 3).map((p, i) => ({ ...p, id: i, ago: (i + 1) * 6 })));
  const [unread, setUnread] = useState(3);
  const wrap = useRef<HTMLDivElement>(null);
  const seq = useRef(3);

  // stream new alerts in
  useEffect(() => {
    const id = setInterval(() => {
      const p = POOL[Math.floor(Math.random() * POOL.length)];
      setNotes((cur) => [{ ...p, id: seq.current++, ago: 0 }, ...cur].slice(0, 12));
      setUnread((u) => Math.min(u + 1, 99));
    }, 9000);
    return () => clearInterval(id);
  }, []);

  // age timestamps
  useEffect(() => {
    const id = setInterval(() => setNotes((cur) => cur.map((n) => ({ ...n, ago: n.ago + 1 }))), 60000);
    return () => clearInterval(id);
  }, []);

  // close on outside click / escape
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const toggle = () => {
    setOpen((o) => !o);
    if (!open) setUnread(0);
  };

  return (
    <div className="relative" ref={wrap}>
      <button
        onClick={toggle}
        aria-label="Notifications"
        className={cn(
          "relative grid h-9 w-9 place-items-center rounded-md border text-muted transition-colors hover:text-ink",
          open ? "border-line-strong bg-elevated/60 text-ink" : "border-line hover:border-line-strong",
        )}
      >
        <Bell width={16} height={16} />
        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 font-mono text-[9px] font-bold text-black">
            {unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-lg border border-line bg-surface/95 shadow-2xl backdrop-blur">
          <div className="flex items-center justify-between border-b border-line px-3 py-2">
            <span className="flex items-center gap-1.5 font-mono text-2xs uppercase tracking-wider text-dim">
              <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-accent" /> Live alerts
            </span>
            <button onClick={() => { setNotes([]); setUnread(0); }} className="font-mono text-2xs text-dim hover:text-ink">
              clear
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notes.length === 0 ? (
              <div className="px-3 py-8 text-center font-mono text-2xs text-dim">No new alerts</div>
            ) : (
              notes.map((n) => {
                const I = ICON[n.tone];
                return (
                  <div key={n.id} className="flex items-start gap-2.5 border-b border-line/60 px-3 py-2.5 transition-colors hover:bg-elevated/40">
                    <I width={14} height={14} className={cn("mt-0.5 shrink-0", TONE[n.tone])} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-medium text-ink">{n.title}</span>
                        <span className="shrink-0 font-mono text-[10px] text-dim">{n.ago === 0 ? "now" : `${n.ago}m`}</span>
                      </div>
                      <p className="mt-0.5 truncate text-2xs text-muted">{n.body}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <a href="/signals/events" className="flex items-center justify-center gap-1 border-t border-line px-3 py-2 font-mono text-2xs uppercase tracking-wider text-accent transition-colors hover:bg-accent/10">
            <Dot width={6} height={6} /> View all in event stream
          </a>
        </div>
      ) : null}
    </div>
  );
}
