"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Candle } from "@/lib/rng";
import { sma, ema, bollinger, vwap, rsi, closes } from "@/lib/quant/indicators";
import { cn } from "@/lib/cn";

const C = {
  bg: "#0b1112", grid: "#16201f", axis: "#56676c", ink: "#dfe9ea", dim: "#56676c",
  pos: "#34d27f", neg: "#ff5d63", accent: "#1fe5c0", ema: "#f2b43d", boll: "#4aa8ff", vwap: "#9a8cff",
};
type Overlay = "sma" | "ema" | "boll" | "vwap";

export function TradingChart({
  candles,
  height = 420,
  livePrice,
  className,
}: {
  candles: Candle[];
  height?: number;
  livePrice?: number;
  className?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [count, setCount] = useState(Math.min(110, candles.length));
  const [start, setStart] = useState(Math.max(0, candles.length - 110));
  const [hover, setHover] = useState<number | null>(null);
  const [overlays, setOverlays] = useState<Record<Overlay, boolean>>({ sma: true, ema: false, boll: false, vwap: false });
  const [showRsi, setShowRsi] = useState(true);
  const drag = useRef<{ x: number; start: number } | null>(null);

  // merge live price into the last candle
  const data = useMemo(() => {
    if (livePrice == null || candles.length === 0) return candles;
    const copy = candles.slice();
    const last = { ...copy[copy.length - 1] };
    last.c = livePrice;
    last.h = Math.max(last.h, livePrice);
    last.l = Math.min(last.l, livePrice);
    copy[copy.length - 1] = last;
    return copy;
  }, [candles, livePrice]);

  const cl = useMemo(() => closes(data), [data]);
  const ind = useMemo(
    () => ({
      sma20: sma(cl, 20), sma50: sma(cl, 50), ema20: ema(cl, 20),
      boll: bollinger(cl, 20, 2), vwap: vwap(data), rsi: rsi(cl, 14),
    }),
    [cl, data],
  );

  // clamp view when data length changes
  useEffect(() => {
    setCount((c) => Math.min(Math.max(30, c), data.length));
    setStart((s) => Math.min(Math.max(0, s), Math.max(0, data.length - 30)));
  }, [data.length]);

  // wheel zoom (non-passive so we can preventDefault)
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 1.12 : 0.89;
      setCount((c) => {
        const next = Math.round(Math.min(Math.max(30, c * factor), data.length));
        setStart((s) => Math.min(Math.max(0, s + Math.round((c - next) * 0.7)), Math.max(0, data.length - next)));
        return next;
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [data.length]);

  // render
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = wrap.clientWidth;
    const H = height;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const padR = 56;
    const rsiH = showRsi ? Math.round(H * 0.2) : 0;
    const priceH = H - rsiH - (showRsi ? 8 : 0);
    const plotW = W - padR;
    const s = Math.max(0, Math.min(start, data.length - 1));
    const n = Math.max(2, Math.min(count, data.length - s));
    const vis = data.slice(s, s + n);
    const step = plotW / n;
    const bw = Math.max(1, step * 0.62);

    const hi = Math.max(...vis.map((c) => c.h));
    const lo = Math.min(...vis.map((c) => c.l));
    const span = hi - lo || 1;
    const pad = span * 0.06;
    const yMin = lo - pad, yMax = hi + pad;
    const y = (p: number) => 4 + (priceH - 8) * (1 - (p - yMin) / (yMax - yMin));
    const maxVol = Math.max(...vis.map((c) => c.v), 1);

    // grid + price axis
    ctx.font = "10px ui-monospace, monospace";
    ctx.textBaseline = "middle";
    for (let i = 0; i <= 4; i++) {
      const gy = 4 + ((priceH - 8) * i) / 4;
      const price = yMax - ((yMax - yMin) * i) / 4;
      ctx.strokeStyle = C.grid;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(plotW, gy); ctx.stroke();
      ctx.fillStyle = C.dim;
      ctx.fillText(price >= 1000 ? price.toFixed(0) : price.toFixed(price < 1 ? 4 : 2), plotW + 6, gy);
    }

    // volume
    for (let i = 0; i < vis.length; i++) {
      const c = vis[i];
      const vh = (c.v / maxVol) * (priceH * 0.16);
      ctx.fillStyle = c.c >= c.o ? "rgba(52,210,127,0.25)" : "rgba(255,93,99,0.25)";
      ctx.fillRect(i * step + (step - bw) / 2, priceH - vh, bw, vh);
    }

    // candles
    for (let i = 0; i < vis.length; i++) {
      const c = vis[i];
      const x = i * step + step / 2;
      const up = c.c >= c.o;
      ctx.strokeStyle = up ? C.pos : C.neg;
      ctx.fillStyle = up ? C.pos : C.neg;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, y(c.h)); ctx.lineTo(x, y(c.l)); ctx.stroke();
      const yo = y(c.o), yc = y(c.c);
      ctx.fillRect(x - bw / 2, Math.min(yo, yc), bw, Math.max(1, Math.abs(yc - yo)));
    }

    const drawLine = (series: (number | null)[], color: string, wdt = 1.3) => {
      ctx.strokeStyle = color; ctx.lineWidth = wdt; ctx.beginPath();
      let started = false;
      for (let i = 0; i < n; i++) {
        const v = series[s + i];
        if (v == null) { started = false; continue; }
        const x = i * step + step / 2;
        if (!started) { ctx.moveTo(x, y(v)); started = true; } else ctx.lineTo(x, y(v));
      }
      ctx.stroke();
    };
    if (overlays.sma) { drawLine(ind.sma20, C.accent); drawLine(ind.sma50, "#1f8f7e"); }
    if (overlays.ema) drawLine(ind.ema20, C.ema);
    if (overlays.vwap) drawLine(ind.vwap, C.vwap);
    if (overlays.boll) { drawLine(ind.boll.upper, C.boll, 1); drawLine(ind.boll.lower, C.boll, 1); drawLine(ind.boll.mid, "rgba(74,168,255,0.5)", 1); }

    // last price line
    const lastPx = data[data.length - 1].c;
    if (lastPx >= yMin && lastPx <= yMax) {
      ctx.strokeStyle = "rgba(31,229,192,0.5)"; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(0, y(lastPx)); ctx.lineTo(plotW, y(lastPx)); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = C.accent;
      ctx.fillRect(plotW, y(lastPx) - 8, padR, 16);
      ctx.fillStyle = "#04140f";
      ctx.fillText(lastPx >= 1000 ? lastPx.toFixed(0) : lastPx.toFixed(2), plotW + 5, y(lastPx));
    }

    // RSI pane
    if (showRsi) {
      const top = priceH + 8;
      const rh = rsiH - 8;
      const ry = (v: number) => top + rh * (1 - v / 100);
      ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
      for (const lvl of [30, 50, 70]) { ctx.beginPath(); ctx.moveTo(0, ry(lvl)); ctx.lineTo(plotW, ry(lvl)); ctx.stroke(); }
      ctx.fillStyle = C.dim; ctx.fillText("RSI 14", 4, top + 8);
      ctx.strokeStyle = C.boll; ctx.lineWidth = 1.3; ctx.beginPath();
      let started = false;
      for (let i = 0; i < n; i++) {
        const v = ind.rsi[s + i];
        if (v == null) { started = false; continue; }
        const x = i * step + step / 2;
        if (!started) { ctx.moveTo(x, ry(v)); started = true; } else ctx.lineTo(x, ry(v));
      }
      ctx.stroke();
    }

    // crosshair + tooltip
    if (hover != null && hover >= 0 && hover < n) {
      const c = vis[hover];
      const x = hover * step + step / 2;
      ctx.strokeStyle = "rgba(223,233,234,0.25)"; ctx.lineWidth = 1; ctx.setLineDash([2, 3]);
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, priceH); ctx.stroke(); ctx.setLineDash([]);
      const up = c.c >= c.o;
      const lines = [
        `O ${c.o.toFixed(2)}  H ${c.h.toFixed(2)}`,
        `L ${c.l.toFixed(2)}  C ${c.c.toFixed(2)}`,
        `${up ? "▲" : "▼"} ${(((c.c - c.o) / c.o) * 100).toFixed(2)}%   vol ${(c.v / 1000).toFixed(0)}k`,
      ];
      const bx = Math.min(x + 10, plotW - 168);
      ctx.fillStyle = "rgba(7,9,10,0.92)";
      ctx.strokeStyle = "#25343650";
      ctx.fillRect(bx, 8, 160, 48);
      ctx.strokeRect(bx, 8, 160, 48);
      ctx.fillStyle = up ? C.pos : C.neg;
      lines.forEach((t, i) => ctx.fillText(t, bx + 8, 20 + i * 13));
    }
  }, [data, count, start, hover, overlays, showRsi, height, ind, cl]);

  // pointer interactions
  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    drag.current = { x: e.clientX, start };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    if (drag.current) {
      const dx = e.clientX - drag.current.x;
      const step = (rect.width - 56) / count;
      const shift = Math.round(dx / step);
      setStart(Math.min(Math.max(0, drag.current.start - shift), Math.max(0, data.length - count)));
      setHover(null);
    } else {
      const x = e.clientX - rect.left;
      const step = (rect.width - 56) / count;
      const idx = Math.floor(x / step);
      setHover(idx >= 0 && idx < count ? idx : null);
    }
  };
  const onPointerUp = () => { drag.current = null; };

  const toggle = (k: Overlay) => setOverlays((o) => ({ ...o, [k]: !o[k] }));
  const ovBtn = (k: Overlay, label: string) => (
    <button
      onClick={() => toggle(k)}
      className={cn("rounded border px-2 py-0.5 font-mono text-2xs uppercase tracking-wider transition-colors", overlays[k] ? "border-accent/40 bg-accent/10 text-accent" : "border-line text-dim hover:text-muted")}
    >
      {label}
    </button>
  );

  return (
    <div className={cn("select-none", className)}>
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        {ovBtn("sma", "SMA")}
        {ovBtn("ema", "EMA")}
        {ovBtn("boll", "BOLL")}
        {ovBtn("vwap", "VWAP")}
        <button
          onClick={() => setShowRsi((v) => !v)}
          className={cn("rounded border px-2 py-0.5 font-mono text-2xs uppercase tracking-wider transition-colors", showRsi ? "border-accent/40 bg-accent/10 text-accent" : "border-line text-dim hover:text-muted")}
        >
          RSI
        </button>
        <span className="ml-auto font-mono text-2xs text-faint">scroll = zoom · drag = pan · hover = inspect</span>
      </div>
      <div
        ref={wrapRef}
        className="relative w-full cursor-crosshair touch-none rounded-md border border-line bg-[#0b1112]"
        style={{ height }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => { drag.current = null; setHover(null); }}
      >
        <canvas ref={canvasRef} className="block" />
      </div>
    </div>
  );
}
