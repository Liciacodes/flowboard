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

import { useState } from "react";
import { AnimatePresence } from "motion/react";

import TriggerNode from "../nodes/TriggerNode";
import ActionNode from "../nodes/ActionNode";
import ConditionNode from "../nodes/ConditionNode";
import DelayNode from "../nodes/DelayNode";
import EndNode from "../nodes/EndNode";
import PropertiesPanel from "./PropertiesPanel";

const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
  delay: DelayNode,
  end: EndNode,
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

type ValidationIssue = {
  message: string;
};

const validateWorkflow = (nodes: Node[], edges: Edge[]) => {
  const issues: ValidationIssue[] = [];

  // Find the actual trigger node because we need its id later.
  const triggerNode = nodes.find((node) => node.type === "trigger");

  if (!triggerNode) {
    issues.push({
      message: "Workflow must have a trigger",
    });
  }

  // If a trigger exists, check whether it has an outgoing connection.
  if (triggerNode) {
    const triggerIsConnected = edges.some(
      (edge) => edge.source === triggerNode.id,
    );

    if (!triggerIsConnected) {
      issues.push({
        message: "Trigger must be connected to another node",
      });
    }
  }

  // Check whether at least one End node exists.
  const endNode = nodes.find((node) => node.type === "end");

  if (!endNode) {
    issues.push({
      message: "Workflow must have an end",
    });
  }

  if (endNode) {
    const endIsConnected = edges.some((edge) => 
    edge.target === endNode.id,
    )


  if (!endIsConnected) {
    issues.push({
      message: 'End must be connected from another node'
    })
  }
}
  return issues;
};

function FlowEditorCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const [isNodeMenuOpen, setIsNodeMenuOpen] = useState(false);

  const [validationIssues, setValidationIssues] = useState<
    ValidationIssue[] | null
  >(null);

  const { screenToFlowPosition } = useReactFlow();

  const selectedNode = nodes.find((node) => node.id === selectedNodeId);

  const onConnect = (connection: Connection) => {
    setEdges((currentEdges) => addEdge(connection, currentEdges));
  };

  const handleValidateWorkflow = () => {
    const issues = validateWorkflow(nodes, edges);

    setValidationIssues(issues);
  };

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

  const addNode = (
    type: "trigger" | "action" | "condition" | "delay" | "end",
  ) => {
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
      end: {
        label: "End workflow",
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
          edge.source !== selectedNodeId &&
          edge.target !== selectedNodeId,
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
        deleteKeyCode={["Backspace", "Delete"]}
        nodeTypes={nodeTypes}
        onNodeClick={(_, node) => {
          setSelectedNodeId(node.id);
        }}
        onNodesDelete={(deletedNodes) => {
          const selectedNodeWasDeleted = deletedNodes.some(
            (node) => node.id === selectedNodeId,
          );

          if (selectedNodeWasDeleted) {
            setSelectedNodeId(null);
          }
        }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
        />

        <Controls />
      </ReactFlow>

      {/* Top-left controls */}
      <div className="absolute left-4 top-4 z-10">
        {/* Only these two buttons are in the flex row */}
        <div className="flex gap-2">
          <button
            onClick={() => setIsNodeMenuOpen((open) => !open)}
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800"
          >
            + Add node
          </button>

          <button
            onClick={handleValidateWorkflow}
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800"
          >
            Validate workflow
          </button>
        </div>

        {/* Add-node dropdown */}
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

            <button
              onClick={() => addNode("end")}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-neutral-200 hover:bg-neutral-900"
            >
              End
            </button>
          </div>
        )}

        {/* Validation results */}
        {validationIssues !== null && (
          <div className="mt-3 rounded-lg border border-neutral-800 bg-neutral-950 p-3 text-sm text-white">
            {validationIssues.length === 0 ? (
              <p>Workflow is ready</p>
            ) : (
              validationIssues.map((issue, index) => (
                <p key={index}>{issue.message}</p>
              ))
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedNode && (
          <PropertiesPanel
            selectedNode={selectedNode}
            onLabelChange={handleLabelChange}
            onNodeDataChange={handleNodeDataChange}
            onDeleteNode={deleteSelectedNode}
            onClose={() => setSelectedNodeId(null)}
          />
        )}
      </AnimatePresence>
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