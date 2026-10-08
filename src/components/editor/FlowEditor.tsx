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

import "@xyflow/react/dist/style.css";

import { useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "motion/react";

import TriggerNode from "../nodes/TriggerNode";
import ActionNode from "../nodes/ActionNode";
import ConditionNode from "../nodes/ConditionNode";
import DelayNode from "../nodes/DelayNode";
import EndNode from "../nodes/EndNode";
import PropertiesPanel from "./PropertiesPanel";
import EditorToolbar, { type SaveStatus } from "./EditorToolbar";
import ResultsPanel from "./ResultsPanel";
import { useUnsavedChanges, type WorkflowState } from "./useUnsavedChanges";
import { useWorkflowRun } from "./useWorkflowRun";

import { demoNodes, demoEdges } from "../../data/demoWorkflow";
import { API_URL } from "../../config";
import type { WorkFlowNodeType } from "../../types/workflow";

const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
  delay: DelayNode,
  end: EndNode,
};

const defaultNodeData: Record<WorkFlowNodeType, Record<string, string>> = {
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

function FlowEditorCanvas() {
  const { id } = useParams();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isNodeMenuOpen, setIsNodeMenuOpen] = useState(false);
  const [isSampleDataOpen, setIsSampleDataOpen] = useState(false);

  const [workflowName, setWorkflowName] = useState("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [isLoading, setIsLoading] = useState(true);
  const [savedWorkflow, setSavedWorkflow] = useState<WorkflowState | null>(
    null,
  );

  const { screenToFlowPosition, fitView } = useReactFlow();

  const hasUnsavedChanges = useUnsavedChanges(
    { name: workflowName, nodes, edges },
    savedWorkflow,
  );

  const workflowRun = useWorkflowRun(nodes, edges, () =>
    setIsSampleDataOpen(true),
  );

  const { isRunning, activeNodeId, activeEdgeId } = workflowRun;

  const selectedNode = nodes.find((node) => node.id === selectedNodeId);

  const displayNodes = useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        className: node.id === activeNodeId ? "node-active" : "",
      })),
    [nodes, activeNodeId],
  );

  const displayEdges = useMemo(
    () =>
      edges.map((edge) =>
        edge.id === activeEdgeId
          ? {
              ...edge,
              animated: true,
              style: { stroke: "#f5a623", strokeWidth: 2 },
            }
          : edge,
      ),
    [edges, activeEdgeId],
  );

  const onConnect = (connection: Connection) => {
    setEdges((currentEdges) => addEdge(connection, currentEdges));
  };

  useEffect(() => {
    const loadWorkflow = async () => {
      try {
        const response = await fetch(`${API_URL}/api/workflows/${id}`);

        if (!response.ok) {
          throw new Error("Failed to load workflow");
        }

        const data = await response.json();

        setNodes(data.workflow.nodes);
        setEdges(data.workflow.edges);
        setWorkflowName(data.workflow.name);

        setSavedWorkflow({
          name: data.workflow.name,
          nodes: data.workflow.nodes,
          edges: data.workflow.edges,
        });
      } catch (error) {
        console.error("Error loading workflow:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadWorkflow();
  }, [id, setNodes, setEdges]);

  const handleSaveWorkflow = async () => {
    if (!hasUnsavedChanges || saveStatus === "saving") {
      return;
    }

    setSaveStatus("saving");

    try {
      const response = await fetch(`${API_URL}/api/workflows/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: workflowName,
          nodes,
          edges,
          status: "draft",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save workflow");
      }

      setSavedWorkflow({
        name: workflowName,
        nodes,
        edges,
      });

      setSaveStatus("saved");

      setTimeout(() => {
        setSaveStatus("idle");
      }, 2000);
    } catch (error) {
      console.error("Error saving workflow:", error);

      setSaveStatus("error");
    }
  };

  const handleLoadDemo = () => {
    if (isRunning) {
      return;
    }

    if (
      nodes.length > 0 &&
      !window.confirm("Replace the current canvas with the demo workflow?")
    ) {
      return;
    }

    setNodes(demoNodes);
    setEdges(demoEdges);
    setSelectedNodeId(null);
    workflowRun.clearResults();
    setIsNodeMenuOpen(false);

    setTimeout(() => fitView({ padding: 0.35, duration: 400 }), 50);
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

  const addNode = (type: WorkFlowNodeType) => {
    const position = screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });

    const newNode: Node = {
      id: crypto.randomUUID(),
      type,
      position,
      data: defaultNodeData[type],
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

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-950 text-neutral-400">
        Loading workflow...
      </div>
    );
  }

  return (
    <div className="flow-editor">
      <ReactFlow
        nodes={displayNodes}
        edges={displayEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        fitViewOptions={{ padding: 0.35 }}
        defaultEdgeOptions={{
          style: { stroke: "#52525b", strokeWidth: 1.5 },
        }}
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
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />

        <Controls />
      </ReactFlow>

      <EditorToolbar
        workflowName={workflowName}
        onWorkflowNameChange={setWorkflowName}
        isNodeMenuOpen={isNodeMenuOpen}
        onToggleNodeMenu={() => setIsNodeMenuOpen((open) => !open)}
        onAddNode={addNode}
        onValidate={workflowRun.validate}
        onRun={workflowRun.run}
        isRunning={isRunning}
        onLoadDemo={handleLoadDemo}
        isSampleDataOpen={isSampleDataOpen}
        onToggleSampleData={() => setIsSampleDataOpen((open) => !open)}
        sampleDataText={workflowRun.sampleDataText}
        onSampleDataChange={workflowRun.setSampleDataText}
        hasUnsavedChanges={hasUnsavedChanges}
        saveStatus={saveStatus}
        onSave={handleSaveWorkflow}
      />

      {workflowRun.hasResults && (
        <ResultsPanel
          validationIssues={workflowRun.validationIssues}
          isRunning={isRunning}
          executionLogs={workflowRun.executionLogs}
          executionError={workflowRun.executionError}
          executionComplete={workflowRun.executionComplete}
          onClose={workflowRun.clearResults}
        />
      )}

      <AnimatePresence>
        {selectedNode && (
          <PropertiesPanel
            selectedNode={selectedNode}
            onLabelChange={(label) => handleNodeDataChange("label", label)}
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
