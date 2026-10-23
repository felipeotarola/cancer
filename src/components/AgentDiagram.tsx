import { Surface } from "./ui/Surface";
import { useEffect, useMemo, useState } from "react";
import {
  Background,
  Controls,
  MarkerType,
  Position,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "./agent-diagram.css";

const edges: Edge[] = [
  {
    id: "message-agent",
    source: "message",
    target: "agent",
    markerEnd: { type: MarkerType.ArrowClosed },
  },
  {
    id: "agent-response",
    source: "agent",
    target: "response",
    markerEnd: { type: MarkerType.ArrowClosed },
  },
];
const fitOptions = { padding: 0.25, maxZoom: 1.1 };

export default function AgentDiagram({ dark }: { dark: boolean }) {
  const [compact, setCompact] = useState(
    () => window.matchMedia("(max-width: 640px)").matches,
  );
  useEffect(() => {
    const media = window.matchMedia("(max-width: 640px)");
    const update = () => setCompact(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const nodes = useMemo<Node[]>(
    () =>
      [
        {
          id: "message",
          type: "input",
          data: { label: "Meddelande" },
          position: { x: 0, y: 0 },
        },
        {
          id: "agent",
          data: { label: "OpenCancer" },
          position: compact ? { x: 0, y: 135 } : { x: 245, y: 0 },
          className: "primary-flow-node",
        },
        {
          id: "response",
          type: "output",
          data: { label: "Svar" },
          position: compact ? { x: 0, y: 270 } : { x: 490, y: 0 },
        },
      ].map((node) => ({
        ...node,
        sourcePosition: compact ? Position.Bottom : Position.Right,
        targetPosition: compact ? Position.Top : Position.Left,
      })),
    [compact],
  );

  return (
    <Surface className="agent-flow-card" aria-label="Agentdiagram">
      <div className="agent-flow-heading">
        <h2>Agentflöde</h2>
        <p>Meddelande → Agent → Svar</p>
      </div>
      <div className="agent-diagram">
        <ReactFlow
          key={compact ? "vertical" : "horizontal"}
          defaultNodes={nodes}
          defaultEdges={edges}
          fitView
          fitViewOptions={fitOptions}
          colorMode={dark ? "dark" : "light"}
          nodesConnectable={false}
          edgesReconnectable={false}
          deleteKeyCode={null}
          minZoom={0.3}
          maxZoom={1.8}
          ariaLabelConfig={{
            "controls.zoomIn.ariaLabel": "Zooma in",
            "controls.zoomOut.ariaLabel": "Zooma ut",
            "controls.fitView.ariaLabel": "Anpassa diagram",
          }}
        >
          <Background gap={22} size={1} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </Surface>
  );
}
