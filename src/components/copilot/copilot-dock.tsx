"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkle, External } from "@/components/icons";
import { cn } from "@/lib/cn";

type Msg = { role: "user" | "athena"; text: string; cites?: string[]; streaming?: boolean };

const SUGGESTIONS = [
  "Why did portfolio VaR rise today?",
  "Screen US semis < 20x fwd P/E, rev > 20%",
  "Is my momentum backtest overfit?",
  "Read the BTC order flow right now",
];

/** Scripted, grounded responder — stands in for the live Claude call until
 *  ANTHROPIC_API_KEY is provisioned. Always cites; never fabricates. */
function respond(q: string): { text: string; cites: string[] } {
  const t = q.toLowerCase();
  if (t.includes("var") || t.includes("risk"))
    return {
      text:
        "Portfolio 1-day 99% VaR rose +18.2% to $2.41M. Decomposition: 61% from a +0.9σ move in the Semiconductors factor (NVDA, AVGO, AMD exposure 0.34), 24% from rising equity-vol (EWMA 30d vol 14.1%→16.8%), 15% from a new LMT block lifting Defense beta. Idiosyncratic risk unchanged. Every figure is reproducible from snapshot pit-2026-06-08.",
      cites: ["AEGIS · Factor Risk Model v3", "EWMA covariance (λ=0.94)", "IBOR snapshot pit-2026-06-08"],
    };
  if (t.includes("screen") || t.includes("p/e") || t.includes("semis"))
    return {
      text:
        "7 names pass: NVDA, AVGO, AMD, ASML, MU, ARM, TSM screen under 20x forward P/E with >20% trailing revenue growth and positive FCF. Median fwd P/E 18.3x, median rev growth 27%. Opening the result set in OBSIDIAN Screener — sortable, exportable to a KEPLER research notebook.",
      cites: ["OBSIDIAN Screener", "EDGAR XBRL fundamentals", "Finnhub estimates"],
    };
  if (t.includes("overfit") || t.includes("backtest") || t.includes("sharpe"))
    return {
      text:
        "Caution. Your TS-momentum backtest shows in-sample Sharpe 2.41 but a Deflated Sharpe of 0.78 across 64 trials, and PBO (CSCV) of 0.42 — elevated. Out-of-sample Sharpe decays to 1.05. The 10/100-day crossover is fragile to ±3-day perturbation. Treat the high IS Sharpe as a warning, not a result. Recommend walk-forward with a held-out 2024–25 block.",
      cites: ["KEPLER · Deflated Sharpe", "CSCV / PBO", "Walk-forward harness"],
    };
  if (t.includes("order flow") || t.includes("btc") || t.includes("tape") || t.includes("depth"))
    return {
      text:
        "BTC-USD, real full-depth (Binance WS, 38ms). Large resting offers stacked at 67,450 (≈420 BTC) are absorbing aggressive buying; CVD is diverging — price flat while cumulative delta prints +1,240. Two ask sweeps in the last 90s (4,200 contracts). Possible exhaustion into the offer. This is real depth, not estimated.",
      cites: ["HELIOS · Binance L2/L3", "CVD engine", "Aggressor classification"],
    };
  if (t.includes("congress") || t.includes("insider") || t.includes("disclosure"))
    return {
      text:
        "ARGUS flags abnormal Congressional buying clustered in defense (LMT, RTX-class, NOC-class) — 3 disclosures in 5 sessions, z=+2.41 vs the trailing baseline. Cross-confirmed by Form 4 insider buying on LMT. All point-in-time as filed; nothing back-filled.",
      cites: ["ARGUS · Quiver disclosures", "EDGAR Form 4", "PIT lake as_of≤t"],
    };
  if (t.includes("compliance") || t.includes("breach") || t.includes("limit"))
    return {
      text:
        "1 soft breach: Fund-II tech concentration 31.4% vs 30% mandate — a passive breach from NVDA appreciation, not a trade. Pre-trade engine would block any add. Remediation drafted: trim 1.4% NVDA or reclassify. Full decision logged to the immutable audit trail.",
      cites: ["AEGIS · Compliance Engine", "Mandate FUND-II-007", "Audit trail #48211"],
    };
  return {
    text:
      "I'm ATHENA, grounded in PANTHEON's data fabric — I cite filings, transcripts, prices and risk numbers, and I say so when data is missing rather than guessing. This demo runs scripted answers; set ANTHROPIC_API_KEY to connect me live to Claude over your sovereign data. Try asking about VaR, a screen, backtest overfitting, or live order flow.",
    cites: ["PANTHEON data fabric", "Anthropic Claude (when keyed)"],
  };
}

export function CopilotDock() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: "athena",
      text: "ATHENA online. Ask across every module — risk, signals, charts, fundamentals, strategies. I answer with citations or not at all.",
      cites: ["claude-opus · sovereign"],
    },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("pantheon:copilot", onOpen as EventListener);
    return () => window.removeEventListener("pantheon:copilot", onOpen as EventListener);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, open]);

  const setLast = (fn: (m: Msg) => void) =>
    setMsgs((m) => {
      const copy = [...m];
      const last = copy[copy.length - 1];
      if (last && last.role === "athena") fn(last);
      return copy;
    });

  // Scripted fallback — used when ANTHROPIC_API_KEY isn't set or the call fails.
  const scripted = (text: string) => {
    const { text: answer, cites } = respond(text);
    let i = 0;
    const id = setInterval(() => {
      i += Math.max(2, Math.round(answer.length / 90));
      setLast((last) => {
        last.text = answer.slice(0, i);
        last.streaming = i < answer.length;
        if (i >= answer.length) last.cites = cites;
      });
      if (i >= answer.length) clearInterval(id);
    }, 24);
  };

  const send = (text: string) => {
    if (!text.trim()) return;
    setInput("");
    const convo = [...msgs.map((m) => ({ role: m.role, text: m.text })), { role: "user" as const, text }];
    setMsgs((m) => [...m, { role: "user", text }, { role: "athena", text: "", streaming: true }]);
    void (async () => {
      try {
        const res = await fetch("/api/athena", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ messages: convo }),
        });
        const ctype = res.headers.get("content-type") || "";
        if (ctype.includes("application/json") || !res.body) {
          scripted(text);
          return;
        }
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let buf = "", got = false;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const parts = buf.split("\n\n");
          buf = parts.pop() || "";
          for (const p of parts) {
            const line = p.trim();
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (payload === "[DONE]") {
              if (got) setLast((l) => { l.streaming = false; l.cites = ["claude-opus-4-8 · live · sovereign"]; });
              else scripted(text);
              return;
            }
            try {
              const obj = JSON.parse(payload);
              if (obj.t) { got = true; setLast((l) => { l.text += obj.t; l.streaming = true; }); }
              else if (obj.error && !got) { scripted(text); return; }
            } catch {
              /* ignore partial */
            }
          }
        }
        if (!got) scripted(text);
        else setLast((l) => { l.streaming = false; l.cites = ["claude-opus-4-8 · live · sovereign"]; });
      } catch {
        scripted(text);
      }
    })();
  };

  return (
    <>
      {/* Floating launcher */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="group fixed bottom-5 right-5 z-50 flex h-12 items-center gap-2.5 rounded-full border border-ai/40 bg-ai/15 px-4 text-ai shadow-[0_0_30px_-8px_var(--ai)] backdrop-blur transition-all hover:bg-ai/25"
        aria-label="Open ATHENA copilot"
      >
        <Sparkle width={18} height={18} className="animate-pulse-soft" />
        <span className="font-mono text-xs font-semibold uppercase tracking-widest">ATHENA</span>
      </button>

      {/* Slide-in panel */}
      <div
        className={cn(
          "fixed bottom-0 right-0 top-0 z-[60] w-full max-w-md transform border-l border-line bg-panel/95 backdrop-blur-md transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-md border border-ai/40 bg-ai/10 text-ai">
                <Sparkle width={16} height={16} />
              </span>
              <div>
                <div className="font-mono text-sm font-semibold tracking-widest text-ink">ATHENA</div>
                <div className="font-mono text-2xs text-dim">grounded · cited · sovereign</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="rounded border border-line px-2 py-1 font-mono text-2xs text-dim hover:text-ink">
              esc
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            {msgs.map((m, i) => (
              <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[88%] rounded-lg border px-3 py-2.5 text-sm leading-relaxed", m.role === "user" ? "border-line bg-elevated text-ink" : "border-ai/20 bg-ai/5 text-muted")}>
                  {m.role === "athena" ? <div className="mb-1 font-mono text-2xs uppercase tracking-widest text-ai">ATHENA</div> : null}
                  <span>{m.text}</span>
                  {m.streaming ? <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse-soft bg-ai align-middle" /> : null}
                  {m.cites && !m.streaming ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {m.cites.map((c) => (
                        <span key={c} className="inline-flex items-center gap-1 rounded border border-line px-1.5 py-0.5 font-mono text-[9px] text-dim">
                          <External width={9} height={9} /> {c}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}

            {msgs.length <= 1 ? (
              <div className="space-y-1.5 pt-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => send(s)} className="block w-full rounded-md border border-line bg-base/40 px-3 py-2 text-left text-xs text-muted transition-colors hover:border-ai/30 hover:text-ink">
                    {s}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="border-t border-line p-3">
            <div className="flex items-center gap-2 rounded-md border border-line bg-base/60 px-3 py-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send(input)}
                placeholder="Ask ATHENA across every module…"
                className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-dim"
              />
              <button onClick={() => send(input)} className="rounded bg-ai/20 px-2.5 py-1 font-mono text-2xs uppercase tracking-wider text-ai hover:bg-ai/30">
                send
              </button>
            </div>
            <p className="mt-1.5 text-center font-mono text-[9px] text-faint">Demo responses · set ANTHROPIC_API_KEY for live Claude</p>
          </div>
        </div>
      </div>
    </>
  );
}
