# PANTHEON — BUILD CONTRACT (read before writing any page)

You are building pages for **PANTHEON**, a unified, AI-native finance OS with a
dark "terminal" aesthetic (deep teal-black, emerald/cyan accents, monospace
data). The reference gold-standard page is **`src/app/page.tsx`** — read it and
mirror its density, rhythm, and polish.

## Non-negotiable rules

1. **Server Components by default.** Only add `"use client"` to small
   interactive leaves (tab switchers, sliders, toggles). Most pages are 100%
   server-rendered. Keep the JS bundle tiny — this platform must load fast.
2. **Use the shared kit — do not reinvent it.** Read these files and use their
   exports verbatim:
   - `src/components/ui/kit.tsx` → `Panel`, `PanelHeader`, `SectionLabel`,
     `Divider`, `Chip` (tone: default|accent|pos|neg|warn|ai|info), `StatusDot`,
     `KpiCard`, `Stat`, `PageHeader`, `Th`, `Td`, `Ticker`.
   - `src/components/ui/viz.tsx` → `Sparkline`, `MiniBars`, `DeltaBars`,
     `ProgressBar`, `Ring`, `HeatRow`, `heat()`.
   - `src/components/ui/candles.tsx` → `Candles` (uses `Candle[]`).
   - `src/components/icon-map.tsx` → `<Icon name="..." />` (names listed in the
     map). Or import named icons from `src/components/icons.tsx`.
   - `src/lib/format.ts` → `fmtNum, fmtInt, fmtCompact, fmtUsd, fmtUsdCompact,
     fmtPct, fmtSignedPct, fmtSigned, fmtBps, signClass`.
   - `src/lib/rng.ts` → `Rng`, `priceWalk`, `candleSeries`, `Candle`. Use these
     to generate ALL series so output is deterministic (no `Math.random()` at
     module/render scope — it breaks hydration).
   - `src/lib/data.ts` → shared datasets (`securities()`, `watchlist()`,
     `SOURCES`, `CANDIDATES`, `PAIN_POINTS`, `COMPETITOR_COSTS`, etc.).
3. **Determinism.** Seed every generated series with a fixed string. Never call
   `Date.now()`/`Math.random()` during render. Live-updating widgets must be
   client components that render a stable server value first, then tick.
4. **Honesty bar.** This is DEMO DATA (the shell already shows the badge). Never
   present fabricated order flow / fills as real. Where a feature needs a live
   backend (real L2/L3 depth, live fills, RAG over filings), show a representative
   snapshot and a small honest note (e.g. a `Chip` "DEMO" or a one-line caption:
   "live depth via Binance WS when enabled"). This matches the platform's design.
5. **Typed & clean.** Strict TypeScript. No `any` unless unavoidable. No TODO,
   no `pass`, no empty handlers that look real. The final `next build` must pass.
6. **FILE OWNERSHIP — do not edit shared files.** You may ONLY create files in
   the folders assigned to you in your task. Do NOT modify `kit.tsx`, `viz.tsx`,
   `candles.tsx`, `icons.tsx`, `icon-map.tsx`, `globals.css`, `tailwind.config.ts`,
   `layout.tsx`, `nav.ts`, `data.ts`, `rng.ts`, `format.ts`, `sidebar.tsx`, or
   any other agent's folder. If you need extra data, create a NEW file
   `src/lib/data/<yourmodule>.ts`. If you need a module-only component, put it in
   `src/components/<yourmodule>/`.

## Design tokens (Tailwind classes already configured)

- Surfaces: `bg-base bg-surface bg-panel bg-elevated` · borders `border-line
  border-line-strong` · opacity modifiers work (`bg-elevated/60`, `border-accent/30`).
- Text: `text-ink` (primary) `text-muted` (secondary) `text-dim` (tertiary)
  `text-faint` (quaternary).
- Semantic: `text-accent text-pos text-neg text-warn text-info text-ai` and their
  `bg-*/10`, `border-*/30` variants.
- Helpers: `.panel` `.panel-hover` `.section-label` `.kpi-label` `.data`
  `.chip .chip-accent/.chip-pos/.chip-neg/.chip-warn/.chip-ai` `.btn .btn-accent`
  `.nav-item` `.scanline` `.grid-faint` · `font-mono` `tabular-nums`
  `animate-pulse-soft` `animate-rise-in`.
- Numbers/data are ALWAYS `font-mono tabular-nums`. Labels are uppercase
  `section-label`/`kpi-label`. Positive green, negative red, caution amber.

## Page pattern

```tsx
import { PageHeader, Panel, PanelHeader, Chip, Stat, Th, Td, Ticker } from "@/components/ui/kit";
// ...
export default function Page() {
  return (
    <div className="space-y-5">
      <PageHeader
        module={{ name: "MODULE — Subtitle", tone: "accent" }}
        title="Page Title"
        desc="One-line description of what this view does."
        right={<button className="btn btn-accent">Primary action</button>}
      />
      {/* KPI deck: grid grid-cols-2 md:grid-cols-4 gap-3, KpiCard ... */}
      {/* Panels with PanelHeader + tables/viz */}
    </div>
  );
}
```

Use `export const metadata = { title: "Page Title" }` on each page.

## Quality target

Each page should feel like a real, dense, institutional screen — multiple
panels, a KPI deck, at least one data table or visualization, realistic numbers,
and copy that reflects the module's actual capability (per the master prompts).
Aim for the richness of `src/app/page.tsx` or better. Make it impressive.
