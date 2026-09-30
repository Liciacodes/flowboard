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

import { useBlocker, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { AnimatePresence } from "motion/react";

import TriggerNode from "../nodes/TriggerNode";
import ActionNode from "../nodes/ActionNode";
import ConditionNode from "../nodes/ConditionNode";
import DelayNode from "../nodes/DelayNode";
import EndNode from "../nodes/EndNode";
import PropertiesPanel from "./PropertiesPanel";

import {
  executeWorkflow,
  type ExecutionLog,
} from '../../execution/executeWorkflow';

const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
  delay: DelayNode,
  end: EndNode,
};

type ValidationIssue = {
  message: string;
};

const validateWorkflow = (nodes: Node[], edges: Edge[]) => {
  const issues: ValidationIssue[] = [];

  // Find the trigger node.
  const triggerNode = nodes.find(
    (node) => node.type === "trigger",
  );

  if (!triggerNode) {
    issues.push({
      message: "Workflow must have a trigger",
    });
  }

  // Check whether trigger has an outgoing connection.
  if (triggerNode) {
    const triggerIsConnected = edges.some(
      (edge) => edge.source === triggerNode.id,
    );

    if (!triggerIsConnected) {
      issues.push({
        message: `"${String(
          triggerNode.data.label,
        )}" must be connected to a node`,
      });
    }
  }

  // Check whether at least one End node exists.
  const endNodes = nodes.filter(
    (node) => node.type === "end",
  );

  if (endNodes.length === 0) {
    issues.push({
      message: "Workflow must have an end",
    });
  }

  // Check whether End nodes have incoming connections.
  endNodes.forEach((endNode) => {
    const endIsConnected = edges.some(
      (edge) => edge.target === endNode.id,
    );

    if (!endIsConnected) {
      issues.push({
        message: `"${String(
          endNode.data.label,
        )}" must have an incoming connection`,
      });
    }
  });

  // Action and delay nodes need outgoing connections.
  const nodesThatNeedOutgoingConnection = nodes.filter(
    (node) =>
      node.type === "action" ||
      node.type === "delay",
  );

  nodesThatNeedOutgoingConnection.forEach((node) => {
    const nodeIsConnected = edges.some(
      (edge) => edge.source === node.id,
    );

    if (!nodeIsConnected) {
      issues.push({
        message: `"${String(
          node.data.label,
        )}" must be connected to another node`,
      });
    }
  });

  // Conditions need both YES and NO branches.
  const conditionNodes = nodes.filter(
    (node) => node.type === "condition",
  );

  conditionNodes.forEach((node) => {
    const yesIsConnected = edges.some(
      (edge) =>
        edge.source === node.id &&
        edge.sourceHandle === "yes",
    );

    const noIsConnected = edges.some(
      (edge) =>
        edge.source === node.id &&
        edge.sourceHandle === "no",
    );

    if (!yesIsConnected) {
      issues.push({
        message: `"${String(
          node.data.label,
        )}" YES branch must be connected`,
      });
    }

    if (!noIsConnected) {
      issues.push({
        message: `"${String(
          node.data.label,
        )}" NO branch must be connected`,
      });
    }
  });

  // Check whether the trigger can eventually reach an End node.
  if (triggerNode && endNodes.length > 0) {
    const canReachEnd = (
      currentNodeId: string,
      visited = new Set<string>(),
    ): boolean => {
      if (visited.has(currentNodeId)) {
        return false;
      }

      const isEndNode = endNodes.some(
        (endNode) => endNode.id === currentNodeId,
      );

      if (isEndNode) {
        return true;
      }

      const nextVisited = new Set(visited);
      nextVisited.add(currentNodeId);

      const outgoingEdges = edges.filter(
        (edge) => edge.source === currentNodeId,
      );

      const nextNodeIds = outgoingEdges.map(
        (edge) => edge.target,
      );

      if (nextNodeIds.length === 0) {
        return false;
      }

      return nextNodeIds.every((nextNodeId) =>
        canReachEnd(nextNodeId, nextVisited),
      );
    };

    const triggerCanReachEnd = canReachEnd(
      triggerNode.id,
    );

    if (!triggerCanReachEnd) {
      issues.push({
        message:
          "The workflow does not have a valid path from Trigger to End",
      });
    }
  }

  return issues;
};

const getWorkflowSnapshot = (
  name: string,
  workflowNodes: Node[],
  workflowEdges: Edge[],
) => ({
  name,
  nodes: workflowNodes.map(
    ({ selected, dragging, measured, ...node }) => node,
  ),
  edges: workflowEdges.map(
    ({ selected, ...edge }) => edge,
  ),
});

function FlowEditorCanvas() {
  const { id } = useParams();

  const [nodes, setNodes, onNodesChange] =
    useNodesState<Node>([]);

  const [edges, setEdges, onEdgesChange] =
    useEdgesState<Edge>([]);

  const [selectedNodeId, setSelectedNodeId] =
    useState<string | null>(null);

  const [isNodeMenuOpen, setIsNodeMenuOpen] =
    useState(false);

  const [validationIssues, setValidationIssues] =
    useState<ValidationIssue[] | null>(null);

  const [workflowName, setWorkflowName] =
    useState("");

  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  const [isLoading, setIsLoading] =
    useState(true);

  const [savedWorkflow, setSavedWorkflow] =
    useState<{
      name: string;
      nodes: Node[];
      edges: Edge[];
    } | null>(null);

  const [isRunning, setIsRunning] =
    useState(false);

  const [executionLogs, setExecutionLogs] =
    useState<ExecutionLog[]>([]);

  const [executionError, setExecutionError] =
    useState<string | null>(null);

  const [executionComplete, setExecutionComplete] =
    useState(false);

  const { screenToFlowPosition } =
    useReactFlow();

  const selectedNode = nodes.find(
    (node) => node.id === selectedNodeId,
  );

  const currentWorkflowSnapshot =
    getWorkflowSnapshot(
      workflowName,
      nodes,
      edges,
    );

  const savedWorkflowSnapshot = savedWorkflow
    ? getWorkflowSnapshot(
        savedWorkflow.name,
        savedWorkflow.nodes,
        savedWorkflow.edges,
      )
    : null;

  const hasUnsavedChanges =
    savedWorkflowSnapshot !== null &&
    JSON.stringify(currentWorkflowSnapshot) !==
      JSON.stringify(savedWorkflowSnapshot);

  const onConnect = (connection: Connection) => {
    setEdges((currentEdges) =>
      addEdge(connection, currentEdges),
    );
  };

  // Protect internal navigation when there are unsaved changes.
  const blocker = useBlocker(hasUnsavedChanges);

  useEffect(() => {
    if (blocker.state !== "blocked") {
      return;
    }

    const shouldLeave = window.confirm(
      "You have unsaved changes. Are you sure you want to leave?",
    );

    if (shouldLeave) {
      blocker.proceed();
    } else {
      blocker.reset();
    }
  }, [blocker]);

  // Protect browser refresh / closing.
  useEffect(() => {
    const handleBeforeUnload = (
      event: BeforeUnloadEvent,
    ) => {
      if (!hasUnsavedChanges) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener(
      "beforeunload",
      handleBeforeUnload,
    );

    return () => {
      window.removeEventListener(
        "beforeunload",
        handleBeforeUnload,
      );
    };
  }, [hasUnsavedChanges]);

  // Load workflow from backend.
  useEffect(() => {
    const loadWorkflow = async () => {
      try {
        const response = await fetch(
          `http://localhost:5000/api/workflows/${id}`,
        );

        if (!response.ok) {
          throw new Error(
            "Failed to load workflow",
          );
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
        console.error(
          "Error loading workflow:",
          error,
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadWorkflow();
  }, [id, setNodes, setEdges]);

  // Save workflow.
  const handleSaveWorkflow = async () => {
    if (
      !hasUnsavedChanges ||
      saveStatus === "saving"
    ) {
      return;
    }

    setSaveStatus("saving");

    try {
      const response = await fetch(
        `http://localhost:5000/api/workflows/${id}`,
        {
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
        },
      );

      if (!response.ok) {
        throw new Error(
          "Failed to save workflow",
        );
      }

      const data = await response.json();

      console.log(
        "Workflow saved:",
        data,
      );

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
      console.error(
        "Error saving workflow:",
        error,
      );

      setSaveStatus("error");
    }
  };

  // Validate workflow.
  const handleValidateWorkflow = () => {
    const issues = validateWorkflow(
      nodes,
      edges,
    );

    setValidationIssues(issues);
  };

  // Run workflow.
  const handleRunWorkflow = async () => {
    if (isRunning) {
      return;
    }

    setExecutionLogs([]);
    setExecutionError(null);
    setExecutionComplete(false);

    const issues = validateWorkflow(
      nodes,
      edges,
    );

    setValidationIssues(issues);

    if (issues.length > 0) {
      setExecutionError(
        "Workflow cannot run because it has validation issues.",
      );

      return;
    }

    setIsRunning(true);

    try {
      const result = await executeWorkflow(
        nodes,
        edges,
      );

      setExecutionLogs(result.logs);

      if (!result.success) {
        setExecutionError(
          result.error ??
            "Workflow execution failed.",
        );

        return;
      }

      setExecutionComplete(true);
    } catch (error) {
      console.error(
        "Workflow execution failed:",
        error,
      );

      setExecutionError(
        "An unexpected error occurred while running the workflow.",
      );
    } finally {
      setIsRunning(false);
    }
  };

  // Change selected node label.
  const handleLabelChange = (
    label: string,
  ) => {
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

  // Change selected node data.
  const handleNodeDataChange = (
    key: string,
    value: string,
  ) => {
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

  // Add a new node.
  const addNode = (
    type:
      | "trigger"
      | "action"
      | "condition"
      | "delay"
      | "end",
  ) => {
    const position =
      screenToFlowPosition({
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

    setNodes((currentNodes) => [
      ...currentNodes,
      newNode,
    ]);

    setIsNodeMenuOpen(false);
  };

  // Delete selected node.
  const deleteSelectedNode = () => {
    if (!selectedNodeId) return;

    setNodes((currentNodes) =>
      currentNodes.filter(
        (node) => node.id !== selectedNodeId,
      ),
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

  // Loading state.
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
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        deleteKeyCode={[
          "Backspace",
          "Delete",
        ]}
        nodeTypes={nodeTypes}
        onNodeClick={(_, node) => {
          setSelectedNodeId(node.id);
        }}
        onNodesDelete={(deletedNodes) => {
          const selectedNodeWasDeleted =
            deletedNodes.some(
              (node) =>
                node.id === selectedNodeId,
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
        {/* Workflow name */}
        <input
          type="text"
          value={workflowName}
          onChange={(event) =>
            setWorkflowName(
              event.target.value,
            )
          }
          placeholder="Workflow name"
          className="mb-3 w-64 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white outline-none"
        />

        {/* Buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() =>
              setIsNodeMenuOpen(
                (open) => !open,
              )
            }
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

          <button
            onClick={handleRunWorkflow}
            disabled={isRunning}
            className="rounded-lg border border-emerald-800 bg-emerald-950 px-4 py-2 text-sm text-emerald-300 hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isRunning
              ? "Running..."
              : "▶ Run workflow"}
          </button>

          {hasUnsavedChanges && (
            <span className="flex items-center px-2 text-xs text-amber-400">
              Unsaved changes
            </span>
          )}

          <button
            onClick={handleSaveWorkflow}
            disabled={
              saveStatus === "saving" ||
              !hasUnsavedChanges
            }
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saveStatus === "saving"
              ? "Saving..."
              : saveStatus === "saved"
                ? "✓ Saved"
                : saveStatus === "error"
                  ? "Save failed"
                  : "Save workflow"}
          </button>
        </div>

        {/* Add-node dropdown */}
        {isNodeMenuOpen && (
          <div className="mt-2 w-44 rounded-xl border border-neutral-800 bg-neutral-950 p-1.5 shadow-xl">
            <button
              onClick={() =>
                addNode("trigger")
              }
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-neutral-200 hover:bg-neutral-900"
            >
              Trigger
            </button>

            <button
              onClick={() =>
                addNode("action")
              }
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-neutral-200 hover:bg-neutral-900"
            >
              Action
            </button>

            <button
              onClick={() =>
                addNode("condition")
              }
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-neutral-200 hover:bg-neutral-900"
            >
              Condition
            </button>

            <button
              onClick={() =>
                addNode("delay")
              }
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-neutral-200 hover:bg-neutral-900"
            >
              Delay
            </button>

            <button
              onClick={() =>
                addNode("end")
              }
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-neutral-200 hover:bg-neutral-900"
            >
              End
            </button>
          </div>
        )}

        {/* Validation results */}
        {validationIssues !== null && (
          <div className="mt-3 w-80 rounded-xl border border-neutral-800 bg-neutral-950 p-4 text-sm text-white shadow-xl">
            {validationIssues.length === 0 ? (
              <div className="flex items-start gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-xs text-emerald-400">
                  ✓
                </span>

                <div>
                  <p className="font-medium text-neutral-100">
                    Workflow is ready
                  </p>

                  <p className="mt-1 text-xs text-neutral-500">
                    All validation checks
                    passed.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-xs text-red-400">
                    !
                  </span>

                  <p className="font-medium text-neutral-100">
                    {validationIssues.length}{" "}
                    {validationIssues.length ===
                    1
                      ? "issue"
                      : "issues"}{" "}
                    found
                  </p>
                </div>

                <div className="space-y-2">
                  {validationIssues.map(
                    (issue, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-2 text-xs text-neutral-300"
                      >
                        <span className="mt-[2px] text-red-400">
                          •
                        </span>

                        <p className="leading-5">
                          {issue.message}
                        </p>
                      </div>
                    ),
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Execution results */}
        {(isRunning ||
          executionLogs.length > 0 ||
          executionError ||
          executionComplete) && (
          <div className="mt-3 w-80 rounded-xl border border-neutral-800 bg-neutral-950 p-4 text-sm text-white shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-medium">
                Execution
              </p>

              {isRunning && (
                <span className="text-xs text-amber-400">
                  Running...
                </span>
              )}

              {executionComplete && (
                <span className="text-xs text-emerald-400">
                  Completed
                </span>
              )}
            </div>

            {executionLogs.length > 0 && (
              <div className="space-y-2">
                {executionLogs.map(
                  (log) => (
                    <div
                      key={log.nodeId}
                      className="flex items-center gap-2 rounded-lg bg-neutral-900 px-3 py-2"
                    >
                      <span className="text-emerald-400">
                        ✓
                      </span>

                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-neutral-200">
                          {log.label}
                        </p>

                        <p className="text-[11px] text-neutral-500">
                          {log.nodeType}
                        </p>
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}

            {executionError && (
              <div className="mt-3 rounded-lg border border-red-900/50 bg-red-950/30 p-3 text-xs text-red-300">
                {executionError}
              </div>
            )}

            {executionComplete &&
              !executionError && (
                <div className="mt-3 rounded-lg border border-emerald-900/50 bg-emerald-950/30 p-3 text-xs text-emerald-300">
                  Workflow completed
                  successfully.
                </div>
              )}
          </div>
        )}
      </div>

      {/* Properties panel */}
      <AnimatePresence>
        {selectedNode && (
          <PropertiesPanel
            selectedNode={selectedNode}
            onLabelChange={
              handleLabelChange
            }
            onNodeDataChange={
              handleNodeDataChange
            }
            onDeleteNode={
              deleteSelectedNode
            }
            onClose={() =>
              setSelectedNodeId(null)
            }
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



// import {
//   addEdge,
//   Background,
//   BackgroundVariant,
//   Controls,
//   ReactFlow,
//   type Connection,
//   type Edge,
//   type Node,
//   useEdgesState,
//   useNodesState,
//   ReactFlowProvider,
//   useReactFlow,
// } from "@xyflow/react";

// import { useBlocker, useParams } from "react-router-dom";
// import { useEffect, useState } from "react";
// import { AnimatePresence } from "motion/react";

// import TriggerNode from "../nodes/TriggerNode";
// import ActionNode from "../nodes/ActionNode";
// import ConditionNode from "../nodes/ConditionNode";
// import DelayNode from "../nodes/DelayNode";
// import EndNode from "../nodes/EndNode";
// import PropertiesPanel from "./PropertiesPanel";

// const nodeTypes = {
//   trigger: TriggerNode,
//   action: ActionNode,
//   condition: ConditionNode,
//   delay: DelayNode,
//   end: EndNode,
// };

// type ValidationIssue = {
//   message: string;
// };

// const validateWorkflow = (nodes: Node[], edges: Edge[]) => {
//   const issues: ValidationIssue[] = [];

//   // Find the trigger node.
//   const triggerNode = nodes.find((node) => node.type === "trigger");

//   if (!triggerNode) {
//     issues.push({
//       message: "Workflow must have a trigger",
//     });
//   }

//   // Check whether trigger has an outgoing connection.
//   if (triggerNode) {
//     const triggerIsConnected = edges.some(
//       (edge) => edge.source === triggerNode.id,
//     );

//     if (!triggerIsConnected) {
//       issues.push({
//         message: `"${String(
//           triggerNode.data.label,
//         )}" must be connected to a node`,
//       });
//     }
//   }

//   // Check whether at least one End node exists.
//   const endNodes = nodes.filter((node) => node.type === "end");

//   if (endNodes.length === 0) {
//     issues.push({
//       message: "Workflow must have an end",
//     });
//   }

//   // Check whether End nodes have incoming connections.
//   endNodes.forEach((endNode) => {
//     const endIsConnected = edges.some(
//       (edge) => edge.target === endNode.id,
//     );

//     if (!endIsConnected) {
//       issues.push({
//         message: `"${String(
//           endNode.data.label,
//         )}" must have an incoming connection`,
//       });
//     }
//   });

//   // Action and delay nodes need outgoing connections.
//   const nodesThatNeedOutgoingConnection = nodes.filter(
//     (node) => node.type === "action" || node.type === "delay",
//   );

//   nodesThatNeedOutgoingConnection.forEach((node) => {
//     const nodeIsConnected = edges.some(
//       (edge) => edge.source === node.id,
//     );

//     if (!nodeIsConnected) {
//       issues.push({
//         message: `"${String(
//           node.data.label,
//         )}" must be connected to another node`,
//       });
//     }
//   });

//   // Conditions need both YES and NO branches.
//   const conditionNodes = nodes.filter(
//     (node) => node.type === "condition",
//   );

//   conditionNodes.forEach((node) => {
//     const yesIsConnected = edges.some(
//       (edge) =>
//         edge.source === node.id &&
//         edge.sourceHandle === "yes",
//     );

//     const noIsConnected = edges.some(
//       (edge) =>
//         edge.source === node.id &&
//         edge.sourceHandle === "no",
//     );

//     if (!yesIsConnected) {
//       issues.push({
//         message: `"${String(
//           node.data.label,
//         )}" YES branch must be connected`,
//       });
//     }

//     if (!noIsConnected) {
//       issues.push({
//         message: `"${String(
//           node.data.label,
//         )}" NO branch must be connected`,
//       });
//     }
//   });

//   // Check whether the trigger can eventually reach an End node.
//   if (triggerNode && endNodes.length > 0) {
//     const canReachEnd = (
//       currentNodeId: string,
//       visited = new Set<string>(),
//     ): boolean => {
//       if (visited.has(currentNodeId)) {
//         return false;
//       }

//       const isEndNode = endNodes.some(
//         (endNode) => endNode.id === currentNodeId,
//       );

//       if (isEndNode) {
//         return true;
//       }

//       const nextVisited = new Set(visited);
//       nextVisited.add(currentNodeId);

//       const outgoingEdges = edges.filter(
//         (edge) => edge.source === currentNodeId,
//       );

//       const nextNodeIds = outgoingEdges.map(
//         (edge) => edge.target,
//       );

//       if (nextNodeIds.length === 0) {
//         return false;
//       }

//       return nextNodeIds.every((nextNodeId) =>
//         canReachEnd(nextNodeId, nextVisited),
//       );
//     };

//     const triggerCanReachEnd = canReachEnd(triggerNode.id);

//     if (!triggerCanReachEnd) {
//       issues.push({
//         message:
//           "The workflow does not have a valid path from Trigger to End",
//       });
//     }
//   }

//   return issues;
// };

// const getWorkflowSnapshot = (
//   name: string,
//   workflowNodes: Node[],
//   workflowEdges: Edge[],
// ) => ({
//   name,
//   nodes: workflowNodes.map(
//     ({ selected, dragging, measured, ...node }) => node,
//   ),
//   edges: workflowEdges.map(({ selected, ...edge }) => edge),
// });


// function FlowEditorCanvas() {
//   const { id } = useParams();

//   const [nodes, setNodes, onNodesChange] =
//     useNodesState<Node>([]);

//   const [edges, setEdges, onEdgesChange] =
//     useEdgesState<Edge>([]);

//   const [selectedNodeId, setSelectedNodeId] =
//     useState<string | null>(null);

//   const [isNodeMenuOpen, setIsNodeMenuOpen] = useState(false);

//   const [validationIssues, setValidationIssues] = useState<
//     ValidationIssue[] | null
//   >(null);

//   const [workflowName, setWorkflowName] = useState("");

//   const [saveStatus, setSaveStatus] = useState<
//     "idle" | "saving" | "saved" | "error"
//   >("idle");

//   const [isLoading, setIsLoading] = useState(true);

//   const [savedWorkflow, setSavedWorkflow] = useState<{
//     name: string;
//     nodes: Node[];
//     edges: Edge[];
//   } | null>(null);

//   const { screenToFlowPosition } = useReactFlow();

//   const selectedNode = nodes.find(
//     (node) => node.id === selectedNodeId,
//   );

//  const currentWorkflowSnapshot = getWorkflowSnapshot(
//   workflowName,
//   nodes,
//   edges,
// );

// const savedWorkflowSnapshot = savedWorkflow
//   ? getWorkflowSnapshot(
//       savedWorkflow.name,
//       savedWorkflow.nodes,
//       savedWorkflow.edges,
//     )
//   : null;

// const hasUnsavedChanges =
//   savedWorkflowSnapshot !== null &&
//   JSON.stringify(currentWorkflowSnapshot) !==
//     JSON.stringify(savedWorkflowSnapshot);

//   const onConnect = (connection: Connection) => {
//     setEdges((currentEdges) =>
//       addEdge(connection, currentEdges),
//     );
//   };

//   const blocker = useBlocker(hasUnsavedChanges)

//   useEffect(() => {
//   if (blocker.state !== "blocked") {
//     return;
//   }

//   const shouldLeave = window.confirm(
//     "You have unsaved changes. Are you sure you want to leave?",
//   );

//   if (shouldLeave) {
//     blocker.proceed();
//   } else {
//     blocker.reset();
//   }
// }, [blocker]);

//   useEffect(() => {
//   const handleBeforeUnload = (event: BeforeUnloadEvent) => {
//     if (!hasUnsavedChanges) {
//       return;
//     }

//     event.preventDefault();
//     event.returnValue = "";
//   };

//   window.addEventListener("beforeunload", handleBeforeUnload);

//   return () => {
//     window.removeEventListener("beforeunload", handleBeforeUnload);
//   };
// }, [hasUnsavedChanges]);

//   // Load workflow from backend
//   useEffect(() => {
//     const loadWorkflow = async () => {
//       try {
//         const response = await fetch(
//           `http://localhost:5000/api/workflows/${id}`,
//         );

//         if (!response.ok) {
//           throw new Error("Failed to load workflow");
//         }

//         const data = await response.json();

//         setNodes(data.workflow.nodes);
//         setEdges(data.workflow.edges);
//         setWorkflowName(data.workflow.name);

//         setSavedWorkflow({
//           name: data.workflow.name,
//           nodes: data.workflow.nodes,
//           edges: data.workflow.edges,
//         });
//       } catch (error) {
//         console.error("Error loading workflow:", error);
//       } finally {
//         setIsLoading(false);
//       }
//     };

//     loadWorkflow();
//   }, [id, setNodes, setEdges]);

//   // Save workflow
//   const handleSaveWorkflow = async () => {
//     setSaveStatus("saving");

//     try {
//       const response = await fetch(
//         `http://localhost:5000/api/workflows/${id}`,
//         {
//           method: "PATCH",
//           headers: {
//             "Content-Type": "application/json",
//           },
//           body: JSON.stringify({
//             name: workflowName,
//             nodes,
//             edges,
//             status: "draft",
//           }),
//         },
//       );

//       if (!response.ok) {
//         throw new Error("Failed to save workflow");
//       }

//       const data = await response.json();

//       console.log("Workflow saved:", data);

//       setSavedWorkflow({
//         name: workflowName,
//         nodes,
//         edges,
//       });

//       setSaveStatus("saved");

//       setTimeout(() => {
//         setSaveStatus("idle");
//       }, 2000);
//     } catch (error) {
//       console.error("Error saving workflow:", error);

//       setSaveStatus("error");
//     }
//   };

//   // Validate workflow
//   const handleValidateWorkflow = () => {
//     const issues = validateWorkflow(nodes, edges);

//     setValidationIssues(issues);
//   };

//   // Change selected node label
//   const handleLabelChange = (label: string) => {
//     if (!selectedNodeId) return;

//     setNodes((currentNodes) =>
//       currentNodes.map((node) =>
//         node.id === selectedNodeId
//           ? {
//               ...node,
//               data: {
//                 ...node.data,
//                 label,
//               },
//             }
//           : node,
//       ),
//     );
//   };

//   // Change selected node data
//   const handleNodeDataChange = (
//     key: string,
//     value: string,
//   ) => {
//     if (!selectedNodeId) return;

//     setNodes((currentNodes) =>
//       currentNodes.map((node) =>
//         node.id === selectedNodeId
//           ? {
//               ...node,
//               data: {
//                 ...node.data,
//                 [key]: value,
//               },
//             }
//           : node,
//       ),
//     );
//   };

//   // Add a new node
//   const addNode = (
//     type: "trigger" | "action" | "condition" | "delay" | "end",
//   ) => {
//     const position = screenToFlowPosition({
//       x: window.innerWidth / 2,
//       y: window.innerHeight / 2,
//     });

//     const nodeData = {
//       trigger: {
//         label: "New event",
//       },

//       action: {
//         label: "New action",
//       },

//       condition: {
//         label: "New condition",
//         field: "status",
//         operator: "equals",
//         value: "active",
//       },

//       delay: {
//         label: "New delay",
//         duration: "1",
//         unit: "hours",
//       },

//       end: {
//         label: "End workflow",
//       },
//     };

//     const newNode: Node = {
//       id: crypto.randomUUID(),
//       type,
//       position,
//       data: nodeData[type],
//     };

//     setNodes((currentNodes) => [
//       ...currentNodes,
//       newNode,
//     ]);

//     setIsNodeMenuOpen(false);
//   };

//   // Delete selected node
//   const deleteSelectedNode = () => {
//     if (!selectedNodeId) return;

//     setNodes((currentNodes) =>
//       currentNodes.filter(
//         (node) => node.id !== selectedNodeId,
//       ),
//     );

//     setEdges((currentEdges) =>
//       currentEdges.filter(
//         (edge) =>
//           edge.source !== selectedNodeId &&
//           edge.target !== selectedNodeId,
//       ),
//     );

//     setSelectedNodeId(null);
//   };

//   // Loading state
//   if (isLoading) {
//     return (
//       <div className="flex h-screen items-center justify-center bg-neutral-950 text-neutral-400">
//         Loading workflow...
//       </div>
//     );
//   }

//   return (
//     <div className="flow-editor">
//       <ReactFlow
//         nodes={nodes}
//         edges={edges}
//         onNodesChange={onNodesChange}
//         onEdgesChange={onEdgesChange}
//         onConnect={onConnect}
//         deleteKeyCode={["Backspace", "Delete"]}
//         nodeTypes={nodeTypes}
//         onNodeClick={(_, node) => {
//           setSelectedNodeId(node.id);
//         }}
//         onNodesDelete={(deletedNodes) => {
//           const selectedNodeWasDeleted =
//             deletedNodes.some(
//               (node) => node.id === selectedNodeId,
//             );

//           if (selectedNodeWasDeleted) {
//             setSelectedNodeId(null);
//           }
//         }}
//       >
//         <Background
//           variant={BackgroundVariant.Dots}
//           gap={20}
//           size={1}
//         />

//         <Controls />
//       </ReactFlow>

//       {/* Top-left controls */}
//       <div className="absolute left-4 top-4 z-10">
//         {/* Workflow name */}
//         <input
//           type="text"
//           value={workflowName}
//           onChange={(event) =>
//             setWorkflowName(event.target.value)
//           }
//           placeholder="Workflow name"
//           className="mb-3 w-64 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white outline-none"
//         />

//         {/* Buttons */}
//         <div className="flex gap-2">
//           <button
//             onClick={() =>
//               setIsNodeMenuOpen((open) => !open)
//             }
//             className="rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800"
//           >
//             + Add node
//           </button>

//           <button
//             onClick={handleValidateWorkflow}
//             className="rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800"
//           >
//             Validate workflow
//           </button>

//           {hasUnsavedChanges && (
//             <span className="flex items-center px-2 text-xs text-amber-400">
//               Unsaved changes
//             </span>
//           )}

//           <button
//             onClick={handleSaveWorkflow}
//             className="rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800"
//           >
//             {saveStatus === "saving"
//               ? "Saving..."
//               : saveStatus === "saved"
//                 ? "✓ Saved"
//                 : saveStatus === "error"
//                   ? "Save failed"
//                   : "Save workflow"}
//           </button>
//         </div>

//         {/* Add-node dropdown */}
//         {isNodeMenuOpen && (
//           <div className="mt-2 w-44 rounded-xl border border-neutral-800 bg-neutral-950 p-1.5 shadow-xl">
//             <button
//               onClick={() => addNode("trigger")}
//               className="block w-full rounded-lg px-3 py-2 text-left text-sm text-neutral-200 hover:bg-neutral-900"
//             >
//               Trigger
//             </button>

//             <button
//               onClick={() => addNode("action")}
//               className="block w-full rounded-lg px-3 py-2 text-left text-sm text-neutral-200 hover:bg-neutral-900"
//             >
//               Action
//             </button>

//             <button
//               onClick={() => addNode("condition")}
//               className="block w-full rounded-lg px-3 py-2 text-left text-sm text-neutral-200 hover:bg-neutral-900"
//             >
//               Condition
//             </button>

//             <button
//               onClick={() => addNode("delay")}
//               className="block w-full rounded-lg px-3 py-2 text-left text-sm text-neutral-200 hover:bg-neutral-900"
//             >
//               Delay
//             </button>

//             <button
//               onClick={() => addNode("end")}
//               className="block w-full rounded-lg px-3 py-2 text-left text-sm text-neutral-200 hover:bg-neutral-900"
//             >
//               End
//             </button>
//           </div>
//         )}

//         {/* Validation results */}
//         {validationIssues !== null && (
//           <div className="mt-3 w-80 rounded-xl border border-neutral-800 bg-neutral-950 p-4 text-sm text-white shadow-xl">
//             {validationIssues.length === 0 ? (
//               // Success state
//               <div className="flex items-start gap-3">
//                 <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-xs text-emerald-400">
//                   ✓
//                 </span>

//                 <div>
//                   <p className="font-medium text-neutral-100">
//                     Workflow is ready
//                   </p>

//                   <p className="mt-1 text-xs text-neutral-500">
//                     All validation checks passed.
//                   </p>
//                 </div>
//               </div>
//             ) : (
//               // Error state
//               <>
//                 <div className="mb-3 flex items-center gap-2">
//                   <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-xs text-red-400">
//                     !
//                   </span>

//                   <p className="font-medium text-neutral-100">
//                     {validationIssues.length}{" "}
//                     {validationIssues.length === 1
//                       ? "issue"
//                       : "issues"}{" "}
//                     found
//                   </p>
//                 </div>

//                 <div className="space-y-2">
//                   {validationIssues.map((issue, index) => (
//                     <div
//                       key={index}
//                       className="flex items-start gap-2 text-xs text-neutral-300"
//                     >
//                       <span className="mt-[2px] text-red-400">
//                         •
//                       </span>

//                       <p className="leading-5">
//                         {issue.message}
//                       </p>
//                     </div>
//                   ))}
//                 </div>
//               </>
//             )}
//           </div>
//         )}
//       </div>

//       {/* Properties panel */}
//       <AnimatePresence>
//         {selectedNode && (
//           <PropertiesPanel
//             selectedNode={selectedNode}
//             onLabelChange={handleLabelChange}
//             onNodeDataChange={handleNodeDataChange}
//             onDeleteNode={deleteSelectedNode}
//             onClose={() => setSelectedNodeId(null)}
//           />
//         )}
//       </AnimatePresence>
//     </div>
//   );
// }

// export default function FlowEditor() {
//   return (
//     <ReactFlowProvider>
//       <FlowEditorCanvas />
//     </ReactFlowProvider>
//   );
// }