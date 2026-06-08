/**
 * ATLAS Event Integration Flow — static SVG diagram showing producer→consumer
 * relationships across the 6-service suite. Server component, zero client JS.
 */

type FlowNode = {
  id: string;
  label: string;
  x: number;
  y: number;
  color: string;
  textColor: string;
};

type FlowEdge = {
  from: string;
  to: string;
  topic: string;
  color: string;
};

const W = 780;
const H = 360;

const NODES: FlowNode[] = [
  { id: "obsidian", label: "OBSIDIAN",  x: 80,  y: 80,  color: "var(--accent)",  textColor: "var(--ink)" },
  { id: "argus",    label: "ARGUS",     x: 80,  y: 200, color: "var(--pos)",     textColor: "var(--ink)" },
  { id: "bus",      label: "ATLAS BUS", x: 330, y: 175, color: "var(--surface)", textColor: "var(--accent)" },
  { id: "kepler",   label: "KEPLER",    x: 580, y: 80,  color: "var(--info)",    textColor: "var(--ink)" },
  { id: "aegis",    label: "AEGIS",     x: 580, y: 200, color: "var(--warn)",    textColor: "var(--ink)" },
  { id: "helios",   label: "HELIOS",    x: 580, y: 300, color: "var(--pos)",     textColor: "var(--ink)" },
];

const NW = 90;
const NH = 32;

function cx(id: string) {
  const n = NODES.find((x) => x.id === id)!;
  return n.x + NW / 2;
}
function cy(id: string) {
  const n = NODES.find((x) => x.id === id)!;
  return n.y + NH / 2;
}

const EDGES: FlowEdge[] = [
  { from: "obsidian", to: "bus",    topic: "market.bar / market.tick",            color: "var(--accent)" },
  { from: "argus",    to: "bus",    topic: "signal.updated / event.detected",      color: "var(--pos)" },
  { from: "bus",      to: "kepler", topic: "market.bar → model input",             color: "var(--info)" },
  { from: "kepler",   to: "bus",    topic: "strategy.order_intent",                color: "var(--info)" },
  { from: "bus",      to: "aegis",  topic: "order_intent → execution",             color: "var(--warn)" },
  { from: "aegis",    to: "bus",    topic: "order.filled / risk.breach",           color: "var(--warn)" },
  { from: "bus",      to: "helios", topic: "position.updated / order.filled",      color: "var(--pos)" },
  { from: "bus",      to: "argus",  topic: "market.bar → alt-data enrichment",     color: "var(--pos)" },
  { from: "bus",      to: "obsidian", topic: "order.filled → position snapshot",   color: "var(--accent)" },
];

function arrowPath(fromId: string, toId: string): string {
  const fx = cx(fromId);
  const fy = cy(fromId);
  const tx = cx(toId);
  const ty = cy(toId);

  // Simple cubic bezier
  const mx = (fx + tx) / 2;
  return `M${fx},${fy} C${mx},${fy} ${mx},${ty} ${tx},${ty}`;
}

export function IntegrationFlow() {
  return (
    <div className="overflow-x-auto">
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        className="min-w-[600px]"
        style={{ fontFamily: "var(--font-mono, monospace)" }}
      >
        {/* Arrow marker defs */}
        <defs>
          {["accent", "pos", "warn", "info"].map((tone) => (
            <marker
              key={tone}
              id={`arr-${tone}`}
              viewBox="0 0 8 8"
              refX="7"
              refY="4"
              markerWidth="6"
              markerHeight="6"
              orient="auto"
            >
              <path d="M0,0 L8,4 L0,8 Z" fill={`var(--${tone})`} opacity="0.9" />
            </marker>
          ))}
        </defs>

        {/* Edges */}
        {EDGES.map((e, i) => {
          const toneKey = e.color.replace("var(--", "").replace(")", "");
          return (
            <path
              key={i}
              d={arrowPath(e.from, e.to)}
              fill="none"
              stroke={e.color}
              strokeWidth={1.5}
              strokeOpacity={0.5}
              strokeDasharray={e.from === "bus" ? "4 2" : undefined}
              markerEnd={`url(#arr-${toneKey})`}
            />
          );
        })}

        {/* Nodes */}
        {NODES.map((n) => (
          <g key={n.id}>
            <rect
              x={n.x}
              y={n.y}
              width={NW}
              height={NH}
              rx={4}
              fill={n.id === "bus" ? "var(--elevated)" : "var(--surface)"}
              stroke={n.color}
              strokeWidth={n.id === "bus" ? 1.5 : 1}
              opacity={0.95}
            />
            <text
              x={n.x + NW / 2}
              y={n.y + NH / 2 + 4}
              textAnchor="middle"
              fontSize={10}
              fontWeight={n.id === "bus" ? 700 : 600}
              fill={n.id === "bus" ? "var(--accent)" : "var(--ink)"}
            >
              {n.label}
            </text>
          </g>
        ))}

        {/* Edge topic labels — sampled subset to avoid clutter */}
        {EDGES.slice(0, 5).map((e, i) => {
          const fx = cx(e.from);
          const fy = cy(e.from);
          const tx = cx(e.to);
          const ty = cy(e.to);
          const lx = (fx + tx) / 2;
          const ly = (fy + ty) / 2 - 6;
          return (
            <text
              key={`lbl-${i}`}
              x={lx}
              y={ly}
              textAnchor="middle"
              fontSize={8}
              fill={e.color}
              opacity={0.75}
            >
              {e.topic.length > 28 ? e.topic.slice(0, 26) + "…" : e.topic}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
