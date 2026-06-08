/**
 * DagGraph — pure-SVG server-renderable asset-lineage / dependency graph.
 * Renders nodes as status-coloured rectangles with labelled directed edges.
 * No client JS required.
 */
import type { DagNode, DagEdge, DagNodeStatus } from "@/lib/data/atlas-ops";

const STATUS_COLOR: Record<DagNodeStatus, string> = {
  materialized: "var(--pos)",
  running:      "var(--accent)",
  failed:       "var(--neg)",
  pending:      "var(--warn)",
  skipped:      "var(--dim)",
};

const STATUS_BG: Record<DagNodeStatus, string> = {
  materialized: "rgba(31,229,160,0.10)",
  running:      "rgba(0,212,255,0.12)",
  failed:       "rgba(255,93,99,0.12)",
  pending:      "rgba(242,180,61,0.10)",
  skipped:      "rgba(100,120,130,0.08)",
};

const STATUS_LABEL: Record<DagNodeStatus, string> = {
  materialized: "MATERIALIZED",
  running:      "RUNNING",
  failed:       "FAILED",
  pending:      "PENDING",
  skipped:      "SKIPPED",
};

const NODE_W = 148;
const NODE_H = 52;
const SVG_W  = 940;
const SVG_H  = 260;

function nodeCenter(node: DagNode): { cx: number; cy: number } {
  const cx = (node.x / 100) * SVG_W + NODE_W / 2;
  const cy = (node.y / 100) * SVG_H + NODE_H / 2;
  return { cx, cy };
}

function nodeBox(node: DagNode): { x: number; y: number } {
  return {
    x: (node.x / 100) * SVG_W,
    y: (node.y / 100) * SVG_H,
  };
}

/** Shorten a cubic path from source rect edge to target rect edge. */
function edgePath(from: DagNode, to: DagNode): string {
  const f = nodeCenter(from);
  const t = nodeCenter(to);
  // Depart from right edge of source, arrive at left edge of target
  const x1 = (from.x / 100) * SVG_W + NODE_W;
  const y1 = f.cy;
  const x2 = (to.x / 100) * SVG_W;
  const y2 = t.cy;
  const cx1 = x1 + (x2 - x1) * 0.55;
  const cy1 = y1;
  const cx2 = x2 - (x2 - x1) * 0.55;
  const cy2 = y2;
  return `M${x1.toFixed(1)},${y1.toFixed(1)} C${cx1.toFixed(1)},${cy1.toFixed(1)} ${cx2.toFixed(1)},${cy2.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`;
}

interface Props {
  nodes: DagNode[];
  edges: DagEdge[];
}

export function DagGraph({ nodes, edges }: Props) {
  const nodeById = Object.fromEntries(nodes.map((n) => [n.id, n]));

  return (
    <div className="w-full overflow-x-auto">
      <svg
        width={SVG_W}
        height={SVG_H}
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        className="min-w-[600px]"
        style={{ fontFamily: "var(--font-mono, monospace)" }}
      >
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 Z" fill="var(--dim)" fillOpacity={0.7} />
          </marker>
          <marker id="arrow-failed" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 Z" fill="var(--neg)" fillOpacity={0.8} />
          </marker>
        </defs>

        {/* Edges */}
        {edges.map((edge, i) => {
          const fromNode = nodeById[edge.from];
          const toNode   = nodeById[edge.to];
          if (!fromNode || !toNode) return null;
          const failed = fromNode.status === "failed" || toNode.status === "failed";
          return (
            <path
              key={i}
              d={edgePath(fromNode, toNode)}
              fill="none"
              stroke={failed ? "var(--neg)" : "var(--line-strong)"}
              strokeWidth={1.4}
              strokeOpacity={failed ? 0.7 : 0.55}
              strokeDasharray={toNode.status === "pending" ? "4 3" : undefined}
              markerEnd={failed ? "url(#arrow-failed)" : "url(#arrow)"}
            />
          );
        })}

        {/* Nodes */}
        {nodes.map((node) => {
          const { x, y } = nodeBox(node);
          const color = STATUS_COLOR[node.status];
          const bg    = STATUS_BG[node.status];
          const isRunning = node.status === "running";
          return (
            <g key={node.id}>
              {/* Glow for running */}
              {isRunning && (
                <rect
                  x={x - 3} y={y - 3}
                  width={NODE_W + 6} height={NODE_H + 6}
                  rx={7}
                  fill="none"
                  stroke={color}
                  strokeWidth={1}
                  strokeOpacity={0.35}
                />
              )}
              {/* Card bg */}
              <rect
                x={x} y={y}
                width={NODE_W} height={NODE_H}
                rx={5}
                fill={bg}
                stroke={color}
                strokeWidth={1.2}
                strokeOpacity={0.55}
              />
              {/* Status dot */}
              <circle cx={x + 10} cy={y + 13} r={3.5} fill={color} fillOpacity={0.9} />
              {/* Node label */}
              <text
                x={x + 20} y={y + 16}
                fontSize={9}
                fill="var(--ink)"
                opacity={0.92}
                fontWeight="600"
                letterSpacing="0.5"
              >
                {node.label.length > 18 ? node.label.slice(0, 17) + "…" : node.label}
              </text>
              {/* Sub label */}
              <text x={x + 20} y={y + 27} fontSize={7.5} fill="var(--dim)" opacity={0.8}>
                {node.sub}
              </text>
              {/* Status badge */}
              <rect
                x={x + 8} y={y + NODE_H - 15}
                width={64} height={10}
                rx={3}
                fill={color}
                fillOpacity={0.15}
                stroke={color}
                strokeWidth={0.6}
                strokeOpacity={0.5}
              />
              <text
                x={x + 40} y={y + NODE_H - 7}
                fontSize={6.5}
                fill={color}
                textAnchor="middle"
                fontWeight="700"
                letterSpacing="0.8"
              >
                {STATUS_LABEL[node.status]}
              </text>
              {/* Duration */}
              {node.lastRunDuration !== "—" && (
                <text
                  x={x + NODE_W - 6} y={y + NODE_H - 7}
                  fontSize={6.5}
                  fill="var(--dim)"
                  textAnchor="end"
                  opacity={0.7}
                >
                  {node.lastRunDuration}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="mt-2 flex flex-wrap items-center gap-4 px-1 text-[10px] text-dim">
        {(Object.keys(STATUS_COLOR) as DagNodeStatus[]).map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: STATUS_COLOR[s] }} />
            {STATUS_LABEL[s]}
          </span>
        ))}
        <span className="ml-auto font-mono text-[9px]">DEMO · Dagster asset lineage</span>
      </div>
    </div>
  );
}
