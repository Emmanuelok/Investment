"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type AppState = {
  /** Linked symbol shared across cockpit widgets (HELIOS-style). */
  symbol: string;
  setSymbol: (s: string) => void;
  /** Suite-wide trading kill-switch (ATLAS). When armed, order entry is blocked. */
  killed: boolean;
  setKilled: (v: boolean) => void;
  /** Persistent watchlist. */
  watch: string[];
  toggleWatch: (s: string) => void;
  isWatched: (s: string) => boolean;
};

const Ctx = createContext<AppState | null>(null);
const LS = "pantheon.state.v1";

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [killed, setKilled] = useState(false);
  const [watch, setWatch] = useState<string[]>(["NVDA", "LMT", "BTCUSDT"]);

  // hydrate from localStorage once on mount (avoids SSR mismatch)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS);
      if (raw) {
        const s = JSON.parse(raw);
        if (s.symbol) setSymbol(s.symbol);
        if (typeof s.killed === "boolean") setKilled(s.killed);
        if (Array.isArray(s.watch)) setWatch(s.watch);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LS, JSON.stringify({ symbol, killed, watch }));
    } catch {
      /* ignore */
    }
  }, [symbol, killed, watch]);

  const toggleWatch = useCallback((s: string) => {
    setWatch((w) => (w.includes(s) ? w.filter((x) => x !== s) : [...w, s]));
  }, []);
  const isWatched = useCallback((s: string) => watch.includes(s), [watch]);

  const value = useMemo<AppState>(
    () => ({ symbol, setSymbol, killed, setKilled, watch, toggleWatch, isWatched }),
    [symbol, killed, watch, toggleWatch, isWatched],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState(): AppState {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAppState must be used within AppStateProvider");
  return c;
}
