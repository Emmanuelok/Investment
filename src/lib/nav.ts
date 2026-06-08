/**
 * PANTHEON navigation model — the unified suite rail.
 * Five workspaces (ARGUS · OBSIDIAN · HELIOS · KEPLER · AEGIS) + command +
 * infrastructure. `icon` is a string id resolved by the client NavLinks map so
 * the nav data stays serializable across the server/client boundary.
 */

export type NavItem = {
  label: string;
  href: string;
  icon: string;
  tag?: string; // tiny right-aligned source/vendor pill
  soon?: boolean;
};

export type NavGroup = {
  label: string;
  module?: ModuleKey;
  items: NavItem[];
};

export type ModuleKey = "argus" | "obsidian" | "helios" | "kepler" | "aegis" | "core";

export const MODULES: Record<ModuleKey, { name: string; tag: string; blurb: string }> = {
  core: { name: "PANTHEON", tag: "Command", blurb: "Sovereign finance OS" },
  argus: { name: "ARGUS", tag: "Alt-Data & Signals", blurb: "Cross-signal alpha, point-in-time" },
  obsidian: { name: "OBSIDIAN", tag: "Terminal", blurb: "Multi-asset terminal & research" },
  helios: { name: "HELIOS", tag: "Charts & Order Flow", blurb: "Microstructure cockpit" },
  kepler: { name: "KEPLER", tag: "Quant Lab", blurb: "Research → backtest → live" },
  aegis: { name: "AEGIS", tag: "Risk & Execution", blurb: "Portfolio, risk, compliance, EMS" },
};

export const NAV: NavGroup[] = [
  {
    label: "Command",
    module: "core",
    items: [
      { label: "Command Overview", href: "/", icon: "activity" },
      { label: "ATHENA Copilot", href: "/copilot", icon: "sparkle", tag: "AI" },
      { label: "Why Pantheon", href: "/why", icon: "target" },
    ],
  },
  {
    label: "Terminal",
    module: "obsidian",
    items: [
      { label: "Markets", href: "/terminal", icon: "globe" },
      { label: "Security · DES", href: "/terminal/security", icon: "doc" },
      { label: "Fundamentals", href: "/terminal/fundamentals", icon: "book" },
      { label: "Filings & 13F", href: "/terminal/filings", icon: "doc", tag: "EDGAR" },
      { label: "Screener", href: "/terminal/screener", icon: "filter" },
      { label: "News & Sentiment", href: "/terminal/news", icon: "radio", tag: "GDELT" },
      { label: "Economics", href: "/terminal/economics", icon: "wave", tag: "FRED" },
    ],
  },
  {
    label: "Charts & Order Flow",
    module: "helios",
    items: [
      { label: "Charting", href: "/charts", icon: "candle" },
      { label: "Order Flow", href: "/charts/orderflow", icon: "flow" },
      { label: "DOM & Tape", href: "/charts/dom", icon: "bars" },
      { label: "AI Scanner", href: "/charts/scanner", icon: "search" },
      { label: "Replay & Sim", href: "/charts/replay", icon: "play" },
    ],
  },
  {
    label: "Signals",
    module: "argus",
    items: [
      { label: "Signal Feed", href: "/signals", icon: "pulse", tag: "RavenPack" },
      { label: "Disclosures", href: "/signals/disclosures", icon: "doc", tag: "Quiver" },
      { label: "Web Signals", href: "/signals/web", icon: "globe", tag: "Thinknum" },
      { label: "Consumer Proxies", href: "/signals/consumer", icon: "cart", tag: "Yipit" },
    ],
  },
  {
    label: "Quant Lab",
    module: "kepler",
    items: [
      { label: "Research", href: "/quant", icon: "flask" },
      { label: "Backtest", href: "/quant/backtest", icon: "bars" },
      { label: "Alpha Factory", href: "/quant/alpha", icon: "cpu", tag: "BRAIN" },
      { label: "Strategies", href: "/quant/strategies", icon: "route" },
    ],
  },
  {
    label: "Risk & Execution",
    module: "aegis",
    items: [
      { label: "Portfolio · IBOR", href: "/portfolio", icon: "book" },
      { label: "Risk Engine", href: "/risk", icon: "gauge" },
      { label: "Compliance", href: "/compliance", icon: "shield" },
      { label: "Blotter · OMS", href: "/blotter", icon: "layers" },
      { label: "Execution · EMS", href: "/execution", icon: "route" },
      { label: "Attribution", href: "/attribution", icon: "scale" },
      { label: "Private Markets", href: "/private-markets", icon: "coins" },
      { label: "Optimizer", href: "/optimizer", icon: "target" },
    ],
  },
  {
    label: "Infrastructure",
    module: "core",
    items: [
      { label: "PIT Data Lake", href: "/data-lake", icon: "database" },
      { label: "Sources", href: "/sources", icon: "plug" },
      { label: "License Manager", href: "/licenses", icon: "lock" },
      { label: "Audit Trail", href: "/audit", icon: "shield" },
    ],
  },
];

/** Resolve which module a pathname belongs to (for header chips / theming). */
export function moduleForPath(path: string): ModuleKey {
  for (const g of NAV) {
    for (const it of g.items) {
      if (it.href === "/" ? path === "/" : path.startsWith(it.href)) {
        return g.module ?? "core";
      }
    }
  }
  return "core";
}
