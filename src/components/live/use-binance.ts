"use client";

import { useEffect, useRef, useState } from "react";
import { Rng } from "@/lib/rng";

/**
 * Live crypto market data from Binance's FREE public websockets — real
 * full-depth order flow, no API key (per the HELIOS spec: crypto L2/L3 is free).
 * If the socket can't connect (region block, CI, offline) each hook degrades
 * gracefully to a deterministic demo stream and reports `status: "demo"` so the
 * UI can label it honestly — never presenting synthetic flow as real.
 */

export type FeedStatus = "connecting" | "live" | "demo";
export type Trade = { id: number; t: number; price: number; qty: number; side: "buy" | "sell" };
export type Depth = { bids: [number, number][]; asks: [number, number][] };

const WS_BASE = "wss://stream.binance.com:9443/ws";
const BASE_PX: Record<string, number> = {
  BTCUSDT: 67250, ETHUSDT: 3528, SOLUSDT: 152, BNBUSDT: 612, XRPUSDT: 0.62, DOGEUSDT: 0.16,
};
const basePx = (s: string) => BASE_PX[s.toUpperCase()] ?? 100;

function useFallbackTimer(active: boolean, fn: () => void, ms: number) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => ref.current(), ms);
    return () => clearInterval(id);
  }, [active, ms]);
}

/** Live trade tape + cumulative volume delta. */
export function useTrades(symbol: string, cap = 48): { trades: Trade[]; cvd: number; status: FeedStatus; last: number } {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [status, setStatus] = useState<FeedStatus>("connecting");
  const cvdRef = useRef(0);
  const [cvd, setCvd] = useState(0);
  const [last, setLast] = useState(basePx(symbol));
  const idRef = useRef(1);

  useEffect(() => {
    setTrades([]); setStatus("connecting"); cvdRef.current = 0; setCvd(0); setLast(basePx(symbol));
    let ws: WebSocket | null = null;
    let killed = false;
    const liveRef = { v: false };
    const fallback = setTimeout(() => { if (!killed && !liveRef.v) setStatus("demo"); }, 4500);
    try {
      ws = new WebSocket(`${WS_BASE}/${symbol.toLowerCase()}@aggTrade`);
      ws.onopen = () => { if (!killed) { liveRef.v = true; setStatus("live"); } };
      ws.onmessage = (ev) => {
        if (killed) return;
        const d = JSON.parse(ev.data);
        const price = parseFloat(d.p);
        const qty = parseFloat(d.q);
        const side: "buy" | "sell" = d.m ? "sell" : "buy"; // m = buyer is maker → aggressive sell
        cvdRef.current += side === "buy" ? qty : -qty;
        setCvd(cvdRef.current);
        setLast(price);
        setTrades((t) => [{ id: idRef.current++, t: d.T, price, qty, side }, ...t].slice(0, cap));
      };
      ws.onerror = () => { if (!killed && !liveRef.v) setStatus("demo"); };
      ws.onclose = () => { if (!killed && !liveRef.v) setStatus("demo"); };
    } catch {
      setStatus("demo");
    }
    return () => { killed = true; clearTimeout(fallback); ws?.close(); };
  }, [symbol, cap]);

  const rng = useRef(new Rng(symbol + "tape"));
  useEffect(() => { rng.current = new Rng(symbol + "tape"); }, [symbol]);
  useFallbackTimer(
    status === "demo",
    () => {
      const r = rng.current;
      const drift = r.gauss(0, basePx(symbol) * 0.0006);
      setLast((p) => {
        const np = Math.max(0.0001, p + drift);
        const side: "buy" | "sell" = r.bool(0.5) ? "buy" : "sell";
        const qty = Math.abs(r.gauss(0, 1)) * (basePx(symbol) > 1000 ? 0.6 : 60);
        cvdRef.current += side === "buy" ? qty : -qty;
        setCvd(cvdRef.current);
        setTrades((t) => [{ id: idRef.current++, t: Date.now(), price: np, qty, side }, ...t].slice(0, cap));
        return np;
      });
    },
    480,
  );

  return { trades, cvd, status, last };
}

/** Live order-book depth (top levels). */
export function useDepth(symbol: string, levels = 12): { depth: Depth; status: FeedStatus; mid: number } {
  const [depth, setDepth] = useState<Depth>({ bids: [], asks: [] });
  const [status, setStatus] = useState<FeedStatus>("connecting");
  const [mid, setMid] = useState(basePx(symbol));

  useEffect(() => {
    setDepth({ bids: [], asks: [] }); setStatus("connecting"); setMid(basePx(symbol));
    let ws: WebSocket | null = null;
    let killed = false;
    const liveRef = { v: false };
    const fallback = setTimeout(() => { if (!killed && !liveRef.v) setStatus("demo"); }, 4500);
    try {
      ws = new WebSocket(`${WS_BASE}/${symbol.toLowerCase()}@depth20@100ms`);
      ws.onopen = () => { if (!killed) { liveRef.v = true; setStatus("live"); } };
      ws.onmessage = (ev) => {
        if (killed) return;
        const d = JSON.parse(ev.data);
        const bids: [number, number][] = (d.bids ?? d.b ?? []).slice(0, levels).map((x: string[]) => [parseFloat(x[0]), parseFloat(x[1])]);
        const asks: [number, number][] = (d.asks ?? d.a ?? []).slice(0, levels).map((x: string[]) => [parseFloat(x[0]), parseFloat(x[1])]);
        if (bids.length && asks.length) { setDepth({ bids, asks }); setMid((bids[0][0] + asks[0][0]) / 2); }
      };
      ws.onerror = () => { if (!killed && !liveRef.v) setStatus("demo"); };
      ws.onclose = () => { if (!killed && !liveRef.v) setStatus("demo"); };
    } catch {
      setStatus("demo");
    }
    return () => { killed = true; clearTimeout(fallback); ws?.close(); };
  }, [symbol, levels]);

  const rng = useRef(new Rng(symbol + "depth"));
  useEffect(() => { rng.current = new Rng(symbol + "depth"); }, [symbol]);
  useFallbackTimer(
    status === "demo",
    () => {
      const r = rng.current;
      const m = basePx(symbol) * (1 + r.gauss(0, 0.0004));
      const tick = basePx(symbol) > 1000 ? 1 : basePx(symbol) > 10 ? 0.05 : 0.0001;
      const bids: [number, number][] = [];
      const asks: [number, number][] = [];
      for (let i = 0; i < levels; i++) {
        bids.push([m - (i + 1) * tick, Math.abs(r.gauss(0, 1)) * (basePx(symbol) > 1000 ? 3 : 300)]);
        asks.push([m + (i + 1) * tick, Math.abs(r.gauss(0, 1)) * (basePx(symbol) > 1000 ? 3 : 300)]);
      }
      setDepth({ bids, asks });
      setMid(m);
    },
    260,
  );

  return { depth, status, mid };
}

/** Live mini-ticker for a basket of crypto symbols (price + 24h %). */
export function useTickers(symbols: string[]): { quotes: Record<string, { price: number; chg: number }>; status: FeedStatus } {
  const [quotes, setQuotes] = useState<Record<string, { price: number; chg: number }>>({});
  const [status, setStatus] = useState<FeedStatus>("connecting");
  const key = symbols.join(",");

  useEffect(() => {
    setStatus("connecting");
    let ws: WebSocket | null = null;
    let killed = false;
    const liveRef = { v: false };
    const streams = symbols.map((s) => `${s.toLowerCase()}@miniTicker`).join("/");
    const fallback = setTimeout(() => { if (!killed && !liveRef.v) setStatus("demo"); }, 4500);
    try {
      ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`);
      ws.onopen = () => { if (!killed) { liveRef.v = true; setStatus("live"); } };
      ws.onmessage = (ev) => {
        if (killed) return;
        const msg = JSON.parse(ev.data);
        const d = msg.data ?? msg;
        if (!d || !d.s) return;
        const price = parseFloat(d.c);
        const open = parseFloat(d.o);
        setQuotes((q) => ({ ...q, [d.s]: { price, chg: open ? (price / open - 1) * 100 : 0 } }));
      };
      ws.onerror = () => { if (!killed && !liveRef.v) setStatus("demo"); };
      ws.onclose = () => { if (!killed && !liveRef.v) setStatus("demo"); };
    } catch {
      setStatus("demo");
    }
    return () => { killed = true; clearTimeout(fallback); ws?.close(); };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const rng = useRef(new Rng(key + "tick"));
  useFallbackTimer(
    status === "demo",
    () => {
      const r = rng.current;
      setQuotes((q) => {
        const next = { ...q };
        for (const s of symbols) {
          const prev = next[s]?.price ?? basePx(s);
          const np = Math.max(0.0001, prev * (1 + r.gauss(0, 0.0009)));
          next[s] = { price: np, chg: (next[s]?.chg ?? r.gauss(0.4, 1.6)) + r.gauss(0, 0.05) };
        }
        return next;
      });
    },
    1500,
  );

  return { quotes, status };
}
