import { Text } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import { sankey, sankeyLinkHorizontal, type SankeyLink, type SankeyNode } from "d3-sankey";
import { useMemo, useState } from "react";

import type { Flow, FlowLink, FlowNode } from "../api/insightHooks";

type Node = SankeyNode<FlowNode, FlowLink>;
type Link = SankeyLink<FlowNode, FlowLink>;

const HEIGHT = 440;
const LABEL_SPACE = 200; // room for the last column's labels on the right ("Deciding whether to apply 12")

const colour = (name: string) => `var(--mantine-color-${name}-6)`;

/**
 * Stage-to-stage flows, left to right. Outcomes (success and closed stages, or anything that
 * isn't "active") sit in the last column. `unit` is what the flow counts: applications, or roles.
 */
export function SankeyChart({
  flow,
  unit = "application",
  label,
}: {
  flow: Flow;
  unit?: "application" | "role";
  label?: string; // what the diagram shows, for screen readers
}) {
  const plural = (n: number) => `${n} ${unit}${n === 1 ? "" : "s"}`;
  const nodeText = (n: FlowNode) => {
    // Sources, and where things are waiting, count what's there rather than what "reached" it.
    if (unit === "role" || n.kind === "holding" || n.id.startsWith("source:"))
      return `${n.name}: ${plural(n.reached)}`;
    const still = n.current ? `, ${n.current} still there` : "";
    return `${n.name}: ${plural(n.reached)} reached${still}`;
  };
  const linkText = (l: Link) => {
    const source = l.source as Node;
    const target = l.target as Node;
    const share = source.reached ? Math.round((100 * l.value) / source.reached) : 0;
    return `${source.name} → ${target.name}: ${plural(l.value)} (${share}% of ${source.name})`;
  };
  const { ref, width: measured } = useElementSize();
  // Never narrower than this: on a phone the chart scrolls sideways rather than squash its labels.
  const width = Math.max(measured || 900, 760);
  const [hover, setHover] = useState<string | null>(null);

  const layout = useMemo(() => {
    const order = new Map(flow.nodes.map((n, i) => [n.id, i]));
    const rank = (n: FlowNode) => (n.kind === "holding" ? -1000 : 0) + (order.get(n.id) ?? 0);
    return (
      sankey<FlowNode, FlowLink>()
        .nodeId((n) => n.id)
        .nodeWidth(14)
        .nodePadding(22)
        // Active stages by how far along they are, and where things wait just after their stage
        // (Deciding whether to apply in the same column as Applied); outcomes line up on the right.
        .nodeAlign((n, columns) =>
          n.kind === "active" || n.kind === "holding" || n.sourceLinks?.length ? (n.depth ?? 0) : columns - 1,
        )
        // Within a column, what's waiting sits above the stage that comes next.
        .nodeSort((a, b) => rank(a) - rank(b))
        .extent([
          [1, 8],
          [width - LABEL_SPACE, HEIGHT - 8],
        ])({
        // d3 mutates what it's given. A node is as tall as the applications that reached it,
        // including those still there, not just the ones that flowed through.
        nodes: flow.nodes.map((n) => ({ ...n, fixedValue: n.reached })),
        links: flow.links.map((l) => ({ ...l })),
      })
    );
  }, [flow, width]);

  const path = sankeyLinkHorizontal();
  const hoveredLink = layout.links.find((l) => linkKey(l) === hover);
  const hoveredNode = layout.nodes.find((n) => n.id === hover);
  const caption = hoveredLink ? linkText(hoveredLink) : hoveredNode ? nodeText(hoveredNode) : null;

  return (
    <div ref={ref} style={{ overflowX: "auto" }}>
      <svg
        width={width}
        height={HEIGHT}
        viewBox={`0 0 ${width} ${HEIGHT}`}
        role="img"
        aria-label={
          label ??
          (unit === "role"
            ? `Sankey diagram of ${plural(flow.applications)} pitched to you, by what happened to them`
            : `Sankey diagram of ${plural(flow.applications)} moving through the stages`)
        }
        style={{ display: "block" }}
      >
        <g fill="none">
          {layout.links.map((l) => {
            const key = linkKey(l);
            const dim = hover !== null && hover !== key && !touches(l, hover);
            return (
              <path
                key={key}
                d={path(l) ?? undefined}
                stroke={colour((l.source as Node).color)}
                strokeWidth={Math.max(1, l.width ?? 1)}
                strokeOpacity={dim ? 0.12 : hover === key ? 0.6 : 0.35}
                onMouseEnter={() => setHover(key)}
                onMouseLeave={() => setHover(null)}
              >
                <title>{linkText(l)}</title>
              </path>
            );
          })}
        </g>
        {layout.nodes.map((n) => {
          const x0 = n.x0 ?? 0;
          const x1 = n.x1 ?? 0;
          const y0 = n.y0 ?? 0;
          const y1 = n.y1 ?? 0;
          // Labels sit to the right of each node; LABEL_SPACE keeps the last column's on screen.
          return (
            <g key={n.id} onMouseEnter={() => setHover(n.id)} onMouseLeave={() => setHover(null)}>
              <rect
                x={x0}
                y={y0}
                width={x1 - x0}
                height={Math.max(2, y1 - y0)}
                fill={colour(n.color)}
                rx={2}
                opacity={hover !== null && hover !== n.id && !nodeTouches(n, hover) ? 0.4 : 1}
              >
                <title>{nodeText(n)}</title>
              </rect>
              <text
                x={x1 + 6}
                y={(y0 + y1) / 2}
                dy="0.35em"
                fontSize={12}
                fill="var(--mantine-color-text)"
                // A halo in the page colour keeps a label readable where it crosses a flow.
                stroke="var(--mantine-color-body)"
                strokeWidth={3}
                paintOrder="stroke"
                style={{ pointerEvents: "none" }}
              >
                {n.name}{" "}
                <tspan fill="var(--mantine-color-dimmed)" fontWeight={600}>
                  {n.reached}
                </tspan>
              </text>
            </g>
          );
        })}
      </svg>
      <Text size="sm" c={caption ? undefined : "dimmed"} mt="xs">
        {caption ?? "Hover over a stage or a flow to see its numbers."}
      </Text>
    </div>
  );
}

function linkKey(l: Link) {
  return `${(l.source as Node).id}→${(l.target as Node).id}`;
}

/** Is the hovered node at either end of this link? */
function touches(l: Link, hover: string) {
  return (l.source as Node).id === hover || (l.target as Node).id === hover;
}

/** Is this node the hovered node, or at an end of the hovered link? */
function nodeTouches(n: Node, hover: string) {
  return hover.split("→").includes(n.id);
}
