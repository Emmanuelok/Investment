import type { ComponentType, SVGProps } from "react";
import * as I from "@/components/icons";

/** String id -> icon component, for serializable nav data. */
const MAP: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  eye: I.Eye,
  activity: I.Activity,
  radio: I.Radio,
  bars: I.Bars,
  doc: I.Doc,
  globe: I.Globe,
  cart: I.Cart,
  flask: I.Flask,
  sparkle: I.Sparkle,
  database: I.Database,
  shield: I.Shield,
  plug: I.Plug,
  search: I.Search,
  bell: I.Bell,
  bolt: I.Bolt,
  lock: I.Lock,
  layers: I.Layers,
  target: I.Target,
  scale: I.Scale,
  grid: I.Grid,
  candle: I.Candle,
  flow: I.Flow,
  book: I.Book,
  pulse: I.Pulse,
  gauge: I.Gauge,
  cpu: I.Cpu,
  route: I.Route,
  wave: I.Wave,
  coins: I.Coins,
  filter: I.Filter,
  play: I.Play,
  command: I.Command,
};

export function Icon({ name, ...rest }: { name: string } & SVGProps<SVGSVGElement>) {
  const C = MAP[name] ?? I.Dot;
  return <C {...rest} />;
}
