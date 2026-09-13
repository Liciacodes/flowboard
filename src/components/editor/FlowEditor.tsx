import {
  addEdge,
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  type Connection,
  type Edge,
  type Node,
  useEdgesState,
  useNodesState,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react";

import TriggerNode from "../nodes/TriggerNode";
import ActionNode from "../nodes/ActionNode";
import ConditionNode from "../nodes/ConditionNode";
import { useState } from "react";
import PropertiesPanel from "./PropertiesPanel";
import DelayNode from "../nodes/DelayNode";

const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
  delay: DelayNode,
};

const initialNodes: Node[] = [
  {
    id: "1",
    type: "trigger",
    position: { x: 250, y: 150 },
    data: {
      label: "New event",
    },
  },
  {
    id: "2",
    type: "action",
    position: { x: 250, y: 300 },
    data: {
      label: "Send email",
    },
  },
  {
    id: "3",
    type: "condition",
    position: { x: 250, y: 450 },
    data: {
      label: "Condition met?",
      field: "status",
      operator: "equals",
      value: "active",
    },
  },
  {
    id: "4",
    type: "action",
    position: { x: 80, y: 650 },
    data: {
      label: "Send message",
    },
  },
  {
    id: "5",
    type: "action",
    position: { x: 420, y: 650 },
    data: {
      label: "Notify team",
    },
  },

  {
    id: "6",
    type: "delay",
    position: { x: 650, y: 450 },
    data: {
      label: "Wait before continuing",
      duration: "2",
      unit: "hours",
    },
  },
];

const initialEdges: Edge[] = [];

export function FlowEditorCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isNodeMenuOpen, setIsNodeMenuOpen] = useState(false);
  const { screenToFlowPosition } = useReactFlow();
  const onConnect = (connection: Connection) => {
    setEdges((currentEdges) => addEdge(connection, currentEdges));
  };

  const selectedNode = nodes.find((node) => node.id === selectedNodeId);

  const handleLabelChange = (label: string) => {
    if (!selectedNodeId) return;

    setNodes((currentNodes) =>
      currentNodes.map((node) =>
        node.id === selectedNodeId
          ? {
              ...node,
              data: {
                ...node.data,
                label,
              },
            }
          : node,
      ),
    );
  };

  const handleNodeDataChange = (key: string, value: string) => {
    if (!selectedNodeId) return;

    setNodes((currentNodes) =>
      currentNodes.map((node) =>
        node.id === selectedNodeId
          ? {
              ...node,
              data: {
                ...node.data,
                [key]: value,
              },
            }
          : node,
      ),
    );
  };

  const addNode = (type: "trigger" | "action" | "condition" | "delay") => {
    const position = screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });

    const nodeData = {
      trigger: {
        label: "New event",
      },
      action: {
        label: "New action",
      },
      condition: {
        label: "New condition",
        field: "status",
        operator: "equals",
        value: "active",
      },
      delay: {
        label: "New delay",
        duration: "1",
        unit: "hours",
      },
    };

    const newNode: Node = {
      id: crypto.randomUUID(),
      type,
      position,
      data: nodeData[type],
    };

    setNodes((currentNodes) => [...currentNodes, newNode]);

    setIsNodeMenuOpen(false);
  };

  const deleteSelectedNode = () => {
    if (!selectedNodeId) return;

    setNodes((currentNodes) =>
      currentNodes.filter((node) => node.id !== selectedNodeId),
    );

    setEdges((currentEdges) =>
      currentEdges.filter(
        (edge) =>
          edge.source !== selectedNodeId && edge.target !== selectedNodeId,
      ),
    );

    setSelectedNodeId(null);
  };

  return (
    <div className="flow-editor">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        onNodeClick={(_, node) => {
          setSelectedNodeId(node.id);
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />

        <Controls />
      </ReactFlow>

      <div className="absolute left-4 top-4 z-10">
        <button
          onClick={() => setIsNodeMenuOpen((open) => !open)}
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800"
        >
          + Add node
        </button>

        {isNodeMenuOpen && (
          <div className="mt-2 w-44 rounded-xl border border-neutral-800 bg-neutral-950 p-1.5 shadow-xl">
            <button
              onClick={() => addNode("trigger")}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-neutral-200 hover:bg-neutral-900"
            >
              Trigger
            </button>

            <button
              onClick={() => addNode("action")}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-neutral-200 hover:bg-neutral-900"
            >
              Action
            </button>

            <button
              onClick={() => addNode("condition")}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-neutral-200 hover:bg-neutral-900"
            >
              Condition
            </button>

            <button
              onClick={() => addNode("delay")}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-neutral-200 hover:bg-neutral-900"
            >
              Delay
            </button>
          </div>
        )}
      </div>
      <PropertiesPanel
        selectedNode={selectedNode}
        onLabelChange={handleLabelChange}
        onNodeDataChange={handleNodeDataChange}
        onDeleteNode={deleteSelectedNode}
      />
    </div>
  );
}

export default function FlowEditor() {
  return (
    <ReactFlowProvider>
      <FlowEditorCanvas />
    </ReactFlowProvider>
  );
}
