import type { Edge, Node } from "@xyflow/react";

type WorkflowNode = Node<{
  label?: string;
}>;

export type ExecutionLog = {
  nodeId: string;
  nodeType: string;
  label: string;
  status: "completed" | "failed";
};

export type ExecuteWorkflowResult = {
  success: boolean;
  logs: ExecutionLog[];
  error?: string;
};

const wait = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export async function executeWorkflow(
  nodes: WorkflowNode[],
  edges: Edge[],
): Promise<ExecuteWorkflowResult> {
  const logs: ExecutionLog[] = [];

  const triggerNode = nodes.find(
    (node) => node.type === "trigger",
  );

  if (!triggerNode) {
    return {
      success: false,
      logs,
      error: "Workflow does not have a Trigger node.",
    };
  }

  const visitedNodes = new Set<string>();

  let currentNode: WorkflowNode | undefined = triggerNode;

  while (currentNode) {
    if (visitedNodes.has(currentNode.id)) {
      return {
        success: false,
        logs,
        error: "Workflow contains a cycle.",
      };
    }

    visitedNodes.add(currentNode.id);

    const label =
      typeof currentNode.data?.label === "string"
        ? currentNode.data.label
        : currentNode.type ?? "Unknown node";

    console.log(`Executing node: ${label}`);

    if (currentNode.type === "trigger") {
      logs.push({
        nodeId: currentNode.id,
        nodeType: currentNode.type,
        label,
        status: "completed",
      });
    }

    if (currentNode.type === "action") {
      await wait(800);

      logs.push({
        nodeId: currentNode.id,
        nodeType: currentNode.type,
        label,
        status: "completed",
      });
    }

    if (currentNode.type === "end") {
      logs.push({
        nodeId: currentNode.id,
        nodeType: currentNode.type,
        label,
        status: "completed",
      });

      return {
        success: true,
        logs,
      };
    }

    const outgoingEdge = edges.find(
      (edge) => edge.source === currentNode.id,
    );

    if (!outgoingEdge) {
      return {
        success: false,
        logs,
        error: `Node "${label}" does not have a next step.`,
      };
    }

    const nextNode = nodes.find(
      (node) => node.id === outgoingEdge.target,
    );

    if (!nextNode) {
      return {
        success: false,
        logs,
        error:
          "Workflow contains an edge pointing to a missing node.",
      };
    }

    currentNode = nextNode;
  }

  return {
    success: false,
    logs,
    error: "Workflow execution stopped unexpectedly.",
  };
}