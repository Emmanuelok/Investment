"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="grid min-h-[60vh] place-items-center px-6">
      <div className="w-full max-w-md rounded-lg border border-line bg-surface/80 p-6 text-center animate-rise">
        <div className="font-mono text-2xs uppercase tracking-widest text-neg">runtime fault contained</div>
        <h2 className="mt-2 text-lg font-semibold text-ink">This panel hit an error</h2>
        <p className="mt-2 text-sm text-dim">
          The rest of PANTHEON is unaffected. {error.digest ? <span className="font-mono text-2xs">ref {error.digest}</span> : null}
        </p>
        <button
          onClick={reset}
          className="mt-4 rounded-md border border-accent/40 bg-accent/10 px-4 py-2 font-mono text-xs uppercase tracking-wider text-accent transition-colors hover:bg-accent/20"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
