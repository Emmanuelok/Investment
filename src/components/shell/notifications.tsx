"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, Warn, Shield, Bolt, Dot } from "@/components/icons";
import { evaluateRules, defaultRules, RULE_LABEL, type Rule, type RuleKind, type SymbolSnap } from "@/lib/engine/alerts";
import { candleSeries, Rng } from "@/lib/rng";
import { cn } from "@/lib/cn";

type Note = { id: number; tone: "pos" | "neg" | "warn"; title: string; body: string; ts: number; sim: boolean };
type Feed = "loading" | "live" | "sim";

const LS = "pantheon.alerts.v1";
const KINDS: RuleKind[] = ["moveAbsPct", "priceAbove", "priceBelow", "rsiAbove", "rsiBelow", "crossSMA20"];
const ICON = { pos: Shield, neg: Warn, warn: Bolt } as const;
const TONE = { pos: "text-pos", neg: "text-neg", warn: "text-warn" } as const;

function loadRules(): Rule[] {
  try {
    const raw = localStorage.getItem(LS);
    if (raw) { const r = JSON.parse(raw) as Rule[]; if (Array.isArray(r) && r.length) return r.slice(0, 12); }
  } catch { /* ignore */ }
  return [...defaultRules(["SPY", "NVDA", "TSLA"]), { id: "def-rsi", symbol: "QQQ", kind: "rsiBelow", value: 30, enabled: true }];
}

function demoSnap(sym: string): SymbolSnap {
  const candles = candleSeries(sym + "-alert", 80, 80 + new Rng(sym).float(0, 300), 0.02, 0.0004);
  const last = candles[candles.length - 1].c, prev = candles[candles.length - 2].c;
  return { price: last, chgPct: (last / prev - 1) * 100, candles };
}

const ago = (ts: number) => {
  const m = Math.floor((Date.now() - ts) / 60000);
  return m <= 0 ? "now" : m < 60 ? `${m}m` : `${Math.floor(m / 60)}h`;
};

export function Notifications() {
  const [open, setOpen] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [rules, setRules] = useState<Rule[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [unread, setUnread] = useState(0);
  const [feed, setFeed] = useState<Feed>("loading");
  const [draft, setDraft] = useState<{ symbol: string; kind: RuleKind; value: string }>({ symbol: "", kind: "moveAbsPct", value: "2" });
  const wrap = useRef<HTMLDivElement>(null);
  const seq = useRef(0);
  const fired = useRef<Set<string>>(new Set());
  const rulesRef = useRef<Rule[]>([]);

  // hydrate rules once on mount
  useEffect(() => { const r = loadRules(); setRules(r); rulesRef.current = r; }, []);
  useEffect(() => {
    rulesRef.current = rules;
    if (rules.length) try { localStorage.setItem(LS, JSON.stringify(rules)); } catch { /* ignore */ }
  }, [rules]);

  // engine loop: fetch real snapshots, evaluate rules, emit computed alerts
  const tick = useCallback(async () => {
    const active = rulesRef.current.filter((r) => r.enabled);
    if (!active.length) return;
    const symbols = [...new Set(active.map((r) => r.symbol))].slice(0, 6);
    const snaps: Record<string, SymbolSnap> = {};
    let anyLive = false;
    await Promise.all(symbols.map(async (s) => {
      try {
        const r = await fetch(`/api/quote?symbol=${encodeURIComponent(s)}&limit=80`, { cache: "no-store" });
        const j = (await r.json()) as { live?: boolean; quote?: { price: number; chgPct: number }; candles?: SymbolSnap["candles"] };
        if (j.live && j.quote) { snaps[s] = { price: j.quote.price, chgPct: j.quote.chgPct, candles: j.candles }; anyLive = true; return; }
      } catch { /* fall to demo */ }
      snaps[s] = demoSnap(s);
    }));
    setFeed(anyLive ? "live" : "sim");
    const sim = !anyLive;
    const hits = evaluateRules(active, snaps);
    const fresh = hits.filter((h) => !fired.current.has(h.ruleId + (sim ? ":sim" : ":live")));
    if (fresh.length) {
      fresh.forEach((h) => fired.current.add(h.ruleId + (sim ? ":sim" : ":live")));
      setNotes((cur) => [...fresh.map((h) => ({ id: seq.current++, tone: h.tone, title: h.title, body: h.body, ts: Date.now(), sim })), ...cur].slice(0, 14));
      setUnread((u) => Math.min(u + fresh.length, 99));
    }
  }, []);

  useEffect(() => {
    if (!rules.length) return;
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rules.length > 0]);

  // close on outside click / escape
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const addRule = () => {
    const sym = draft.symbol.trim().toUpperCase();
    const val = parseFloat(draft.value);
    if (!/^[A-Z0-9.^-]{1,10}$/.test(sym) || !Number.isFinite(val)) return;
    setRules((r) => [...r, { id: `${sym}-${draft.kind}-${Date.now()}`, symbol: sym, kind: draft.kind, value: val, enabled: true }].slice(0, 12));
    setDraft({ symbol: "", kind: "moveAbsPct", value: "2" });
  };

  return (
    <div className="relative" ref={wrap}>
      <button
        onClick={() => { setOpen((o) => !o); if (!open) setUnread(0); }}
        aria-label="Alert engine"
        className={cn("relative grid h-9 w-9 place-items-center rounded-md border text-muted transition-colors hover:text-ink", open ? "border-line-strong bg-elevated/60 text-ink" : "border-line hover:border-line-strong")}
      >
        <Bell width={16} height={16} />
        {unread > 0 ? <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 font-mono text-[9px] font-bold text-black">{unread}</span> : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-11 z-50 w-[22rem] overflow-hidden rounded-lg border border-line bg-surface/95 shadow-2xl backdrop-blur animate-rise">
          <div className="flex items-center justify-between border-b border-line px-3 py-2">
            {feed === "live" ? (
              <span className="flex items-center gap-1.5 font-mono text-2xs uppercase tracking-wider text-pos"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-pos" /> Alert engine · live</span>
            ) : feed === "sim" ? (
              <span className="flex items-center gap-1.5 font-mono text-2xs uppercase tracking-wider text-warn"><Warn width={11} height={11} /> Alert engine · simulated</span>
            ) : (
              <span className="font-mono text-2xs uppercase tracking-wider text-dim">Alert engine · starting…</span>
            )}
            <div className="flex items-center gap-2">
              <button onClick={() => setShowRules((s) => !s)} className={cn("font-mono text-2xs uppercase tracking-wider", showRules ? "text-accent" : "text-dim hover:text-ink")}>rules ({rules.filter((r) => r.enabled).length})</button>
              <button onClick={() => { setNotes([]); setUnread(0); }} className="font-mono text-2xs text-dim hover:text-ink">clear</button>
            </div>
          </div>

          {showRules ? (
            <div className="border-b border-line bg-base/40 px-3 py-2">
              <div className="max-h-40 space-y-1 overflow-y-auto">
                {rules.map((r) => (
                  <div key={r.id} className="flex items-center gap-2 font-mono text-2xs">
                    <button onClick={() => setRules((cur) => cur.map((x) => (x.id === r.id ? { ...x, enabled: !x.enabled } : x)))} className={cn("h-3 w-6 rounded-full border transition-colors", r.enabled ? "border-pos/50 bg-pos/30" : "border-line bg-elevated")} aria-label="toggle rule">
                      <span className={cn("block h-2 w-2 rounded-full bg-ink transition-transform", r.enabled ? "translate-x-3" : "translate-x-0.5")} />
                    </button>
                    <span className={cn("w-12", r.enabled ? "text-ink" : "text-dim")}>{r.symbol}</span>
                    <span className="flex-1 text-dim">{RULE_LABEL[r.kind]} {r.kind === "crossSMA20" ? "" : r.value}</span>
                    <button onClick={() => setRules((cur) => cur.filter((x) => x.id !== r.id))} className="text-dim hover:text-neg">×</button>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <input value={draft.symbol} onChange={(e) => setDraft((d) => ({ ...d, symbol: e.target.value }))} placeholder="SYM" className="w-14 rounded border border-line bg-base/60 px-1.5 py-1 font-mono text-2xs text-ink outline-none focus:border-accent/40" />
                <select value={draft.kind} onChange={(e) => setDraft((d) => ({ ...d, kind: e.target.value as RuleKind }))} className="flex-1 rounded border border-line bg-base/60 px-1 py-1 font-mono text-2xs text-muted outline-none">
                  {KINDS.map((k) => <option key={k} value={k}>{RULE_LABEL[k]}</option>)}
                </select>
                <input value={draft.value} onChange={(e) => setDraft((d) => ({ ...d, value: e.target.value }))} className="w-12 rounded border border-line bg-base/60 px-1.5 py-1 font-mono text-2xs text-ink outline-none focus:border-accent/40" />
                <button onClick={addRule} className="rounded border border-accent/40 bg-accent/10 px-2 py-1 font-mono text-2xs text-accent hover:bg-accent/20">+</button>
              </div>
            </div>
          ) : null}

          <div className="max-h-72 overflow-y-auto">
            {notes.length === 0 ? (
              <div className="px-3 py-7 text-center font-mono text-2xs text-dim">No rules triggered yet — the engine re-evaluates every 60s</div>
            ) : (
              notes.map((n) => {
                const I = ICON[n.tone];
                return (
                  <div key={n.id} className="flex items-start gap-2.5 border-b border-line/60 px-3 py-2.5 transition-colors hover:bg-elevated/40">
                    <I width={14} height={14} className={cn("mt-0.5 shrink-0", TONE[n.tone])} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-medium text-ink">{n.title}</span>
                        <span className="flex shrink-0 items-center gap-1.5">
                          {n.sim ? <span className="rounded border border-warn/40 px-1 font-mono text-[9px] uppercase text-warn">sim</span> : null}
                          <span className="font-mono text-[10px] text-dim">{ago(n.ts)}</span>
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-2xs text-muted">{n.body}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <a href="/terminal/news" className="flex items-center justify-center gap-1 border-t border-line px-3 py-2 font-mono text-2xs uppercase tracking-wider text-accent transition-colors hover:bg-accent/10">
            <Dot width={6} height={6} /> Open news &amp; headlines
          </a>
        </div>
      ) : null}
    </div>
  );
}
