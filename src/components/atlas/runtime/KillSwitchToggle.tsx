"use client";

import { useState } from "react";

export function KillSwitchToggle({ initialArmed = false }: { initialArmed?: boolean }) {
  const [armed, setArmed] = useState(initialArmed);
  const [confirming, setConfirming] = useState(false);

  function handleToggleClick() {
    if (armed) {
      // Disarm immediately (safe direction, no confirm needed)
      setArmed(false);
      setConfirming(false);
    } else {
      setConfirming(true);
    }
  }

  function handleConfirmArm() {
    setArmed(true);
    setConfirming(false);
  }

  function handleCancelArm() {
    setConfirming(false);
  }

  return (
    <div className="space-y-4">
      {/* State badge + toggle row */}
      <div className="flex flex-wrap items-center gap-4">
        {/* State indicator */}
        <div
          className={`flex items-center gap-3 rounded-lg border px-5 py-3 transition-all ${
            armed
              ? "border-neg/40 bg-neg/10 text-neg"
              : "border-pos/30 bg-pos/10 text-pos"
          }`}
        >
          <span
            className={`relative flex h-3 w-3 ${armed ? "" : ""}`}
          >
            {armed && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-neg opacity-75" />
            )}
            <span
              className={`relative inline-flex h-3 w-3 rounded-full ${
                armed ? "bg-neg" : "bg-pos"
              }`}
            />
          </span>
          <span className="font-mono text-lg font-bold tracking-widest">
            {armed ? "ARMED" : "SAFE"}
          </span>
        </div>

        {/* Toggle button */}
        <button
          onClick={handleToggleClick}
          className={`rounded border px-4 py-2 font-mono text-sm font-semibold transition-colors ${
            armed
              ? "border-pos/40 bg-pos/10 text-pos hover:bg-pos/20"
              : "border-neg/40 bg-neg/10 text-neg hover:bg-neg/20"
          }`}
        >
          {armed ? "DISARM — Resume trading" : "ARM kill-switch"}
        </button>
      </div>

      {/* Confirm dialog */}
      {confirming && (
        <div className="rounded-lg border border-neg/40 bg-neg/5 p-4">
          <p className="font-mono text-sm font-semibold text-neg">
            CONFIRM: ARM GLOBAL KILL-SWITCH?
          </p>
          <p className="mt-1 text-xs text-muted">
            This will halt ALL order submission across AEGIS · KEPLER · HELIOS immediately.
            The command is propagated over the event bus within 200 ms.
            Open positions are NOT automatically closed — risk desk must manage manually.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleConfirmArm}
              className="rounded border border-neg/50 bg-neg/20 px-3 py-1.5 font-mono text-xs font-bold text-neg hover:bg-neg/30"
            >
              CONFIRM — HALT ALL TRADING
            </button>
            <button
              onClick={handleCancelArm}
              className="rounded border border-line px-3 py-1.5 font-mono text-xs text-muted hover:bg-elevated/60"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Armed alert banner */}
      {armed && (
        <div className="rounded-lg border border-neg/50 bg-neg/10 p-4">
          <div className="flex items-start gap-3">
            <span className="relative mt-0.5 flex h-3 w-3 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-neg opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-neg" />
            </span>
            <div>
              <p className="font-mono text-sm font-bold text-neg">
                ALL TRADING HALTED — Kill-switch ARMED
              </p>
              <p className="mt-1 text-xs text-muted">
                Command propagated to <span className="font-mono text-ink">AEGIS</span> ·{" "}
                <span className="font-mono text-ink">KEPLER</span> ·{" "}
                <span className="font-mono text-ink">HELIOS</span> over the event bus.
                Order submission disabled. Risk monitors remain active. Audit entry written.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
