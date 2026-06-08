"use client";

import { Sparkle } from "@/components/icons";

export default function AthenaOpenButton() {
  return (
    <button
      className="btn btn-accent flex items-center gap-2"
      onClick={() => window.dispatchEvent(new CustomEvent("pantheon:copilot"))}
      aria-label="Open ATHENA copilot"
    >
      <Sparkle width={15} height={15} />
      Open ATHENA
    </button>
  );
}
