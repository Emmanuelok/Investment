"use client";

import { useState } from "react";
import { Chip } from "@/components/ui/kit";
import { Icon } from "@/components/icon-map";

type Speed = "0.5×" | "1×" | "2×" | "5×" | "10×";
const SPEEDS: Speed[] = ["0.5×", "1×", "2×", "5×", "10×"];

export function ReplayControls({
  totalMinutes,
  sessionLabel,
}: {
  totalMinutes: number;
  sessionLabel: string;
}) {
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<Speed>("1×");
  const [position, setPosition] = useState(0); // 0..100

  return (
    <div className="space-y-3">
      {/* Status line */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Chip tone={playing ? "pos" : "default"} dot={playing}>
            {playing ? "Replaying" : "Paused"}
          </Chip>
          <span className="text-xs text-dim">{sessionLabel}</span>
        </div>
        <span className="font-mono text-xs text-dim">
          {Math.round((position / 100) * totalMinutes)}m / {totalMinutes}m
        </span>
      </div>

      {/* Scrubber */}
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-line">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${position}%` }}
        />
        <input
          type="range"
          min={0}
          max={100}
          value={position}
          onChange={(e) => setPosition(Number(e.target.value))}
          className="absolute inset-0 w-full cursor-pointer opacity-0"
        />
      </div>

      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Rewind */}
        <button
          onClick={() => setPosition((p) => Math.max(0, p - 5))}
          className="btn"
          title="Rewind 5%"
        >
          <Icon name="play" width={13} height={13} className="rotate-180" />
          -5%
        </button>

        {/* Play / Pause */}
        <button
          onClick={() => setPlaying((p) => !p)}
          className={`btn ${playing ? "btn-accent" : ""}`}
        >
          <Icon name={playing ? "gauge" : "play"} width={14} height={14} />
          {playing ? "Pause" : "Play"}
        </button>

        {/* Skip forward */}
        <button
          onClick={() => setPosition((p) => Math.min(100, p + 5))}
          className="btn"
          title="Skip 5%"
        >
          <Icon name="play" width={13} height={13} />
          +5%
        </button>

        {/* Reset */}
        <button
          onClick={() => { setPlaying(false); setPosition(0); }}
          className="btn"
        >
          <Icon name="route" width={13} height={13} />
          Reset
        </button>

        <div className="h-4 w-px bg-line mx-1" />

        {/* Speed selector */}
        <span className="text-xs text-dim">Speed:</span>
        {SPEEDS.map((s) => (
          <button
            key={s}
            onClick={() => setSpeed(s)}
            className={`chip cursor-pointer ${speed === s ? "chip-accent" : "hover:bg-elevated/60"}`}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
