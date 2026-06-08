import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/* ── Panels & layout ──────────────────────────────────────────────────────── */

export function Panel({
  className,
  children,
  hover,
  glow,
}: {
  className?: string;
  children: ReactNode;
  hover?: boolean;
  glow?: boolean;
}) {
  return (
    <div
      className={cn("panel", hover && "panel-hover", className)}
      style={glow ? { boxShadow: "0 0 0 1px var(--accent-dim), 0 0 40px -22px var(--accent)" } : undefined}
    >
      {children}
    </div>
  );
}

export function PanelHeader({
  title,
  sub,
  right,
  className,
}: {
  title: ReactNode;
  sub?: ReactNode;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3 border-b border-line px-4 py-2.5", className)}>
      <div className="min-w-0">
        <div className="section-label text-[11px] text-muted">{title}</div>
        {sub ? <div className="mt-0.5 truncate text-xs text-dim">{sub}</div> : null}
      </div>
      {right ? <div className="flex shrink-0 items-center gap-2">{right}</div> : null}
    </div>
  );
}

export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("section-label", className)}>{children}</div>;
}

export function Divider({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-line", className)} />;
}

/* ── Chips / badges ───────────────────────────────────────────────────────── */

type Tone = "default" | "accent" | "pos" | "neg" | "warn" | "ai" | "info";
const toneClass: Record<Tone, string> = {
  default: "",
  accent: "chip-accent",
  pos: "chip-pos",
  neg: "chip-neg",
  warn: "chip-warn",
  ai: "chip-ai",
  info: "border-info/30 bg-info/10 text-info",
};

export function Chip({
  children,
  tone = "default",
  className,
  dot,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span className={cn("chip", toneClass[tone], className)}>
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current" /> : null}
      {children}
    </span>
  );
}

export function StatusDot({ tone = "pos", pulse }: { tone?: Tone; pulse?: boolean }) {
  const color: Record<Tone, string> = {
    default: "bg-dim",
    accent: "bg-accent",
    pos: "bg-pos",
    neg: "bg-neg",
    warn: "bg-warn",
    ai: "bg-ai",
    info: "bg-info",
  };
  return (
    <span className="relative inline-flex h-2 w-2">
      {pulse ? <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-60", color[tone])} /> : null}
      <span className={cn("relative inline-flex h-2 w-2 rounded-full", color[tone])} />
    </span>
  );
}

/* ── KPI / stat cards ─────────────────────────────────────────────────────── */

export function KpiCard({
  label,
  value,
  sub,
  icon,
  tone,
  className,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  tone?: "pos" | "neg" | "warn" | "accent";
  className?: string;
}) {
  const valueColor =
    tone === "pos" ? "text-pos" : tone === "neg" ? "text-neg" : tone === "warn" ? "text-warn" : tone === "accent" ? "text-accent" : "text-ink";
  return (
    <Panel hover className={cn("scanline px-4 py-3", className)}>
      <div className="flex items-center justify-between">
        <span className="kpi-label">{label}</span>
        <span className="text-dim">{icon}</span>
      </div>
      <div className={cn("mt-2 font-mono text-[1.6rem] leading-none tracking-tight", valueColor)}>{value}</div>
      {sub ? <div className="mt-1.5 text-xs text-dim">{sub}</div> : null}
    </Panel>
  );
}

export function Stat({
  label,
  value,
  tone,
  mono = true,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  tone?: "pos" | "neg" | "warn" | "accent" | "muted";
  mono?: boolean;
  className?: string;
}) {
  const color =
    tone === "pos" ? "text-pos" : tone === "neg" ? "text-neg" : tone === "warn" ? "text-warn" : tone === "accent" ? "text-accent" : tone === "muted" ? "text-muted" : "text-ink";
  return (
    <div className={className}>
      <div className="kpi-label">{label}</div>
      <div className={cn("mt-1", mono && "font-mono tabular-nums", color)}>{value}</div>
    </div>
  );
}

/* ── Page scaffolding ─────────────────────────────────────────────────────── */

export function PageHeader({
  module,
  title,
  desc,
  right,
}: {
  module?: { name: string; tone?: Tone };
  title: string;
  desc?: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        {module ? (
          <div className="mb-2">
            <Chip tone={module.tone ?? "accent"}>{module.name}</Chip>
          </div>
        ) : null}
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
        {desc ? <p className="mt-1 max-w-2xl text-sm text-dim">{desc}</p> : null}
      </div>
      {right ? <div className="flex items-center gap-2">{right}</div> : null}
    </div>
  );
}

/* ── Tables ───────────────────────────────────────────────────────────────── */

export function Th({ children, className, right }: { children?: ReactNode; className?: string; right?: boolean }) {
  return (
    <th
      className={cn(
        "select-none border-b border-line px-3 py-2 text-left font-mono text-2xs font-normal uppercase tracking-widest text-dim",
        right && "text-right",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className,
  right,
  mono = true,
}: {
  children?: ReactNode;
  className?: string;
  right?: boolean;
  mono?: boolean;
}) {
  return (
    <td className={cn("border-b border-line/60 px-3 py-2 text-sm", mono && "font-mono tabular-nums", right && "text-right", className)}>
      {children}
    </td>
  );
}

export function Ticker({ sym, name }: { sym: string; name?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="inline-flex items-center rounded border border-line bg-elevated/70 px-1.5 py-0.5 font-mono text-xs font-medium text-ink">
        {sym}
      </span>
      {name ? <span className="truncate text-xs text-dim">{name}</span> : null}
    </div>
  );
}
