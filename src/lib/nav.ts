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

export type ModuleKey = "obsidian" | "helios" | "core";

export const MODULES: Record<ModuleKey, { name: string; tag: string; blurb: string }> = {
  core: { name: "PANTHEON", tag: "Command", blurb: "Sovereign finance OS" },
  obsidian: { name: "OBSIDIAN", tag: "Terminal", blurb: "Multi-asset terminal & research" },
  helios: { name: "HELIOS", tag: "Charts & Order Flow", blurb: "Microstructure cockpit" },
};

export const NAV: NavGroup[] = [
  {
    label: "Terminal",
    module: "obsidian",
    items: [
      { label: "Markets", href: "/terminal", icon: "globe" },
      { label: "Security · DES", href: "/terminal/security", icon: "doc" },
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
