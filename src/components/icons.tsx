import type { SVGProps } from "react";

/**
 * Hand-rolled thin-line icon set (1.6px stroke, 24px grid).
 * Inline SVG keeps the bundle free of icon packages and matches the
 * terminal aesthetic exactly. Color follows `currentColor`.
 */
type P = SVGProps<SVGSVGElement>;
const base = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const Eye = (p: P) => (
  <svg {...base} {...p}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
export const Activity = (p: P) => (
  <svg {...base} {...p}>
    <path d="M3 12h3l3 8 4-16 3 8h5" />
  </svg>
);
export const Radio = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="2" />
    <path d="M6.3 6.3a8 8 0 0 0 0 11.4M17.7 6.3a8 8 0 0 1 0 11.4M9.2 9.2a4 4 0 0 0 0 5.6M14.8 9.2a4 4 0 0 1 0 5.6" />
  </svg>
);
export const Bars = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 20V10M9 20V4M14 20v-7M19 20V8" />
  </svg>
);
export const Doc = (p: P) => (
  <svg {...base} {...p}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
    <path d="M14 3v5h5M8.5 13h7M8.5 16.5h7" />
  </svg>
);
export const Globe = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.5 2.5 2.5 15.5 0 18M12 3c-2.5 2.5-2.5 15.5 0 18" />
  </svg>
);
export const Cart = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="9" cy="20" r="1.4" />
    <circle cx="18" cy="20" r="1.4" />
    <path d="M2 3h2.2l2 12.5h11.2L20 7H6" />
  </svg>
);
export const Flask = (p: P) => (
  <svg {...base} {...p}>
    <path d="M9 3h6M10 3v6.5L5 18a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-8.5V3" />
    <path d="M7.5 14h9" />
  </svg>
);
export const Sparkle = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />
    <path d="M19 15l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2Z" />
  </svg>
);
export const Database = (p: P) => (
  <svg {...base} {...p}>
    <ellipse cx="12" cy="5.5" rx="8" ry="3" />
    <path d="M4 5.5v13c0 1.7 3.6 3 8 3s8-1.3 8-3v-13M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
  </svg>
);
export const Shield = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 3l8 3v6c0 5-3.4 8-8 9-4.6-1-8-4-8-9V6l8-3Z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);
export const Plug = (p: P) => (
  <svg {...base} {...p}>
    <path d="M9 3v5M15 3v5M6 8h12v3a6 6 0 0 1-12 0V8ZM12 17v4" />
  </svg>
);
export const Search = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.2-3.2" />
  </svg>
);
export const Bell = (p: P) => (
  <svg {...base} {...p}>
    <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6ZM10 19a2 2 0 0 0 4 0" />
  </svg>
);
export const Bolt = (p: P) => (
  <svg {...base} {...p}>
    <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
  </svg>
);
export const Lock = (p: P) => (
  <svg {...base} {...p}>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);
export const Layers = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 3 3 8l9 5 9-5-9-5ZM3 13l9 5 9-5M3 18l9 5 9-5" />
  </svg>
);
export const Target = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="12" cy="12" r="0.6" fill="currentColor" />
  </svg>
);
export const Scale = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 3v18M7 21h10M3 8l4-3 4 3-4 8-4-8ZM13 8l4-3 4 3-4 8-4-8Z" />
  </svg>
);
export const Grid = (p: P) => (
  <svg {...base} {...p}>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);
export const Candle = (p: P) => (
  <svg {...base} {...p}>
    <path d="M7 4v3M7 15v5M17 8v9M17 2v3" />
    <rect x="4.5" y="7" width="5" height="8" rx="1" />
    <rect x="14.5" y="5" width="5" height="10" rx="1" />
  </svg>
);
export const Flow = (p: P) => (
  <svg {...base} {...p}>
    <path d="M3 6h7M3 12h12M3 18h6" />
    <path d="M14 4l4 2-4 2M17 10l4 2-4 2M12 16l4 2-4 2" />
  </svg>
);
export const Book = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5Z" />
    <path d="M4 19a2 2 0 0 1 2-2h13" />
  </svg>
);
export const Pulse = (p: P) => (
  <svg {...base} {...p}>
    <path d="M2 12h4l2-5 4 13 3-9 2 3h5" />
  </svg>
);
export const Gauge = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 18a8 8 0 1 1 16 0" />
    <path d="M12 18l4-5" />
    <circle cx="12" cy="18" r="1.2" fill="currentColor" />
  </svg>
);
export const Beaker = Flask;
export const Cpu = (p: P) => (
  <svg {...base} {...p}>
    <rect x="6" y="6" width="12" height="12" rx="2" />
    <rect x="9.5" y="9.5" width="5" height="5" rx="1" />
    <path d="M9 3v2M15 3v2M9 19v2M15 19v2M3 9h2M3 15h2M19 9h2M19 15h2" />
  </svg>
);
export const Route = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="6" cy="19" r="2" />
    <circle cx="18" cy="5" r="2" />
    <path d="M8 19h7a3 3 0 0 0 3-3V7M6 17V9a3 3 0 0 1 3-3h3" />
  </svg>
);
export const Wave = (p: P) => (
  <svg {...base} {...p}>
    <path d="M2 12c2 0 2-5 4-5s2 10 4 10 2-12 4-12 2 7 4 7 2-3 2-3" />
  </svg>
);
export const ChevronRight = (p: P) => (
  <svg {...base} {...p}>
    <path d="m9 6 6 6-6 6" />
  </svg>
);
export const ChevronDown = (p: P) => (
  <svg {...base} {...p}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);
export const Dot = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
  </svg>
);
export const Command = (p: P) => (
  <svg {...base} {...p}>
    <path d="M9 6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6Z" />
  </svg>
);
export const External = (p: P) => (
  <svg {...base} {...p}>
    <path d="M14 4h6v6M20 4l-9 9M19 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5" />
  </svg>
);
export const Check = (p: P) => (
  <svg {...base} {...p}>
    <path d="m4 12 5 5L20 6" />
  </svg>
);
export const Warn = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 3 2 20h20L12 3ZM12 9v5M12 17.5v.2" />
  </svg>
);
export const Brain = (p: P) => (
  <svg {...base} {...p}>
    <path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-1 5 3 3 0 0 0 2 5 3 3 0 0 0 5 1V4.5A2.5 2.5 0 0 0 9 4ZM15 4a3 3 0 0 1 3 3 3 3 0 0 1 1 5 3 3 0 0 1-2 5 3 3 0 0 1-5 1" />
  </svg>
);
export const Clock = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);
export const Coins = (p: P) => (
  <svg {...base} {...p}>
    <ellipse cx="9" cy="7" rx="6" ry="3" />
    <path d="M3 7v5c0 1.7 2.7 3 6 3M15 9.2c2.4.5 4 1.6 4 2.8 0 1.7-2.7 3-6 3s-6-1.3-6-3" />
    <path d="M9 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5" />
  </svg>
);
export const Filter = (p: P) => (
  <svg {...base} {...p}>
    <path d="M3 5h18l-7 8v6l-4 2v-8L3 5Z" />
  </svg>
);
export const Play = (p: P) => (
  <svg {...base} {...p}>
    <path d="M7 4v16l13-8L7 4Z" />
  </svg>
);
