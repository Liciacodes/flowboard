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

import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "motion/react";

import TriggerNode from "../nodes/TriggerNode";
import ActionNode from "../nodes/ActionNode";
import ConditionNode from "../nodes/ConditionNode";
import DelayNode from "../nodes/DelayNode";
import EndNode from "../nodes/EndNode";
import ConfirmDialog from "../ConfirmDialog";
import PropertiesPanel from "./PropertiesPanel";
import EditorToolbar, { type SaveStatus } from "./EditorToolbar";
import ResultsPanel from "./ResultsPanel";
import ScenariosPanel from "./ScenariosPanel";
import { useScenarioRun } from "./useScenarioRun";
import { useUnsavedChanges, type WorkflowState } from "./useUnsavedChanges";
import { useWorkflowRun } from "./useWorkflowRun";

import { demoNodes, demoEdges, demoScenarios } from "../../data/demoWorkflow";
import { API_URL } from "../../config";
import { getWorkflowKey, getWorkflowPath } from "../../workflowUrl";
import type { Scenario, WorkFlowNodeType } from "../../types/workflow";

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
  const { slug } = useParams();
  const workflowKey = getWorkflowKey(slug ?? "");
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [workflowId, setWorkflowId] = useState<string | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isNodeMenuOpen, setIsNodeMenuOpen] = useState(false);
  const [isSampleDataOpen, setIsSampleDataOpen] = useState(false);

  const [scenarios, setScenarios] = useState<Scenario[]>([]);

  const [workflowName, setWorkflowName] = useState("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [savedWorkflow, setSavedWorkflow] = useState<WorkflowState | null>(
    null,
  );

  const [isDemoConfirmOpen, setIsDemoConfirmOpen] = useState(false);

  const { screenToFlowPosition, fitView } = useReactFlow();

  const { hasUnsavedChanges, blocker } = useUnsavedChanges(
    { name: workflowName, nodes, edges, scenarios },
    savedWorkflow,
  );

  const workflowRun = useWorkflowRun(nodes, edges, () =>
    setIsSampleDataOpen(true),
  );

  const scenarioRun = useScenarioRun(nodes, edges, scenarios);

  const { isRunning, activeNodeId, activeEdgeId } = workflowRun;
  const uncoveredEdgeIds = scenarioRun.coverage?.uncoveredEdgeIds;

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
      edges.map((edge) => {
        if (edge.id === activeEdgeId) {
          return {
            ...edge,
            animated: true,
            style: { stroke: "#f5a623", strokeWidth: 2 },
          };
        }

        // A branch that no scenario took in the last "Run all".
        if (uncoveredEdgeIds?.includes(edge.id)) {
          return {
            ...edge,
            style: {
              stroke: "#f87171",
              strokeWidth: 1.5,
              strokeDasharray: "6 4",
            },
          };
        }

        return edge;
      }),
    [edges, activeEdgeId, uncoveredEdgeIds],
  );

  const endOptions = useMemo(
    () =>
      nodes
        .filter((node) => node.type === "end")
        .map((node) => ({
          id: node.id,
          label: String(node.data.label ?? "End"),
        })),
    [nodes],
  );

  const onConnect = (connection: Connection) => {
    setEdges((currentEdges) => addEdge(connection, currentEdges));
  };

  useEffect(() => {
    const loadWorkflow = async () => {
      try {
        const response = await fetch(
          `${API_URL}/api/workflows/${workflowKey}`,
        );

        if (!response.ok) {
          throw new Error("Failed to load workflow");
        }

        const data = await response.json();
        const loadedScenarios: Scenario[] = data.workflow.scenarios ?? [];

        setWorkflowId(data.workflow.id);
        setNodes(data.workflow.nodes);
        setEdges(data.workflow.edges);
        setScenarios(loadedScenarios);
        setWorkflowName(data.workflow.name);

        setSavedWorkflow({
          name: data.workflow.name,
          nodes: data.workflow.nodes,
          edges: data.workflow.edges,
          scenarios: loadedScenarios,
        });
      } catch (error) {
        console.error("Error loading workflow:", error);
        setLoadError(true);
      } finally {
        setIsLoading(false);
      }
    };

    loadWorkflow();
  }, [workflowKey, loadAttempt, setNodes, setEdges]);

  const savedName = savedWorkflow?.name;

  // Keep the address in step with the saved name, for example after a rename.
  useEffect(() => {
    if (
      !workflowId ||
      savedName === undefined ||
      !workflowId.startsWith(workflowKey)
    ) {
      return;
    }

    const path = getWorkflowPath({ id: workflowId, name: savedName });

    if (pathname !== path) {
      navigate(path, { replace: true });
    }
  }, [workflowId, workflowKey, savedName, pathname, navigate]);

  useEffect(() => {
    const previousTitle = document.title;

    if (savedName) {
      document.title = `${savedName} · Flowboard`;
    }

    return () => {
      document.title = previousTitle;
    };
  }, [savedName]);

  const handleRetryLoad = () => {
    setIsLoading(true);
    setLoadError(false);
    setLoadAttempt((attempt) => attempt + 1);
  };

  const isLeaveConfirmOpen = blocker.state === "blocked";
  const isDialogOpen = isLeaveConfirmOpen || isDemoConfirmOpen;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || isDialogOpen) {
        return;
      }

      if (isNodeMenuOpen) {
        setIsNodeMenuOpen(false);
      } else if (isSampleDataOpen) {
        setIsSampleDataOpen(false);
      } else {
        setSelectedNodeId(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDialogOpen, isNodeMenuOpen, isSampleDataOpen]);

  const handleSaveWorkflow = async () => {
    if (!workflowId || !hasUnsavedChanges || saveStatus === "saving") {
      return;
    }

    setSaveStatus("saving");

    try {
      const response = await fetch(`${API_URL}/api/workflows/${workflowId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: workflowName,
          nodes,
          edges,
          scenarios,
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
        scenarios,
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

    if (nodes.length > 0) {
      setIsDemoConfirmOpen(true);
      return;
    }

    loadDemo();
  };

  const loadDemo = () => {
    setIsDemoConfirmOpen(false);
    setNodes(demoNodes);
    setEdges(demoEdges);
    setScenarios(demoScenarios);
    setSelectedNodeId(null);
    workflowRun.clearResults();
    scenarioRun.clear();
    setIsNodeMenuOpen(false);

    setTimeout(() => fitView({ padding: 0.35, duration: 400 }), 50);
  };

  const handleAddScenario = (scenario: Omit<Scenario, "id">) => {
    setScenarios((currentScenarios) => [
      ...currentScenarios,
      { ...scenario, id: crypto.randomUUID() },
    ]);

    scenarioRun.clear();
  };

  const handleDeleteScenario = (scenarioId: string) => {
    setScenarios((currentScenarios) =>
      currentScenarios.filter((scenario) => scenario.id !== scenarioId),
    );

    scenarioRun.clear();
  };

  const handleLoadScenario = (scenario: Scenario) => {
    workflowRun.setSampleDataText(JSON.stringify(scenario.sampleData));
    setIsSampleDataOpen(true);
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

  if (loadError) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-950 px-6 text-white">
        <div className="max-w-md rounded-xl border border-red-500/20 bg-red-500/5 p-8 text-center">
          <h1 className="font-medium">Couldn't load this workflow</h1>

          <p className="mt-2 text-sm text-neutral-400">
            It may have been deleted, or Flowboard could not be reached.
          </p>

          <div className="mt-5 flex justify-center gap-2">
            <button
              onClick={handleRetryLoad}
              className="rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800"
            >
              Try again
            </button>

            <Link
              to="/"
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200"
            >
              Back to workflows
            </Link>
          </div>
        </div>
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
        scenariosPanel={
          <ScenariosPanel
            scenarios={scenarios}
            endOptions={endOptions}
            sampleDataText={workflowRun.sampleDataText}
            results={scenarioRun.results}
            coverage={scenarioRun.coverage}
            error={scenarioRun.error}
            onAdd={handleAddScenario}
            onLoad={handleLoadScenario}
            onDelete={handleDeleteScenario}
            onRunAll={scenarioRun.runAll}
          />
        }
        hasUnsavedChanges={hasUnsavedChanges}
        saveStatus={saveStatus}
        onSave={handleSaveWorkflow}
      />

      <div aria-live="polite">
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
      </div>

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

      <ConfirmDialog
        open={isLeaveConfirmOpen}
        title="Leave without saving?"
        message="You have unsaved changes. If you leave now, they will be lost."
        confirmLabel="Leave"
        danger
        onConfirm={() => blocker.proceed?.()}
        onCancel={() => blocker.reset?.()}
      />

      <ConfirmDialog
        open={isDemoConfirmOpen}
        title="Load the demo workflow?"
        message="This replaces everything on the current canvas."
        confirmLabel="Replace canvas"
        onConfirm={loadDemo}
        onCancel={() => setIsDemoConfirmOpen(false)}
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
