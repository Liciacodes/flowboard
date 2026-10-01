import type { Edge, Node } from "@xyflow/react";

type WorkflowNode = Node<{
  label?: string;
  duration?: string;
  unit?: string;
  field?: string;
  operator?: string;
  value?: string;
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

const getDelayInMilliseconds = (
  duration: string | undefined,
  unit: string | undefined,
) => {
  const parsedDuration = Number(duration);

  if (!Number.isFinite(parsedDuration) || parsedDuration < 0) {
    return null;
  }

  switch (unit) {
    case "seconds":
      return parsedDuration * 1000;

    case "minutes":
      return parsedDuration * 60 * 1000;

    case "hours":
      return parsedDuration * 60 * 60 * 1000;

    case "days":
      return parsedDuration * 24 * 60 * 60 * 1000;

    default:
      return null;
  }
};

const evaluateCondition = (
  field: string | undefined,
  operator: string | undefined,
  value: string | undefined,
) => {
  if (!field || !operator) {
    return null;
  }

  const actualValue = field.trim();
  const expectedValue = value?.trim() ?? "";

  switch (operator) {
    case "equals":
      return actualValue === expectedValue;

    case "not-equals":
      return actualValue !== expectedValue;

    case "contains":
      return actualValue
        .toLowerCase()
        .includes(expectedValue.toLowerCase());

    case "greater-than": {
      const actualNumber = Number(actualValue);
      const expectedNumber = Number(expectedValue);

      if (
        !Number.isFinite(actualNumber) ||
        !Number.isFinite(expectedNumber)
      ) {
        return null;
      }

      return actualNumber > expectedNumber;
    }

    case "less-than": {
      const actualNumber = Number(actualValue);
      const expectedNumber = Number(expectedValue);

      if (
        !Number.isFinite(actualNumber) ||
        !Number.isFinite(expectedNumber)
      ) {
        return null;
      }

      return actualNumber < expectedNumber;
    }

    default:
      return null;
  }
};

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

  let currentNode: WorkflowNode | undefined =
    triggerNode;

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

    // Trigger
    if (currentNode.type === "trigger") {
      logs.push({
        nodeId: currentNode.id,
        nodeType: currentNode.type,
        label,
        status: "completed",
      });
    }

    // Action
    if (currentNode.type === "action") {
      await wait(800);

      logs.push({
        nodeId: currentNode.id,
        nodeType: currentNode.type,
        label,
        status: "completed",
      });
    }

    // Delay
    if (currentNode.type === "delay") {
      const duration = currentNode.data?.duration;
      const unit = currentNode.data?.unit;

      const delayInMilliseconds =
        getDelayInMilliseconds(duration, unit);

      if (delayInMilliseconds === null) {
        return {
          success: false,
          logs,
          error: `Delay "${label}" has an invalid duration or unit.`,
        };
      }

      console.log(
        `Waiting ${duration} ${unit}...`,
      );

      await wait(delayInMilliseconds);

      logs.push({
        nodeId: currentNode.id,
        nodeType: currentNode.type,
        label,
        status: "completed",
      });
    }

    // End
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

    /*
     * Condition
     *
     * A condition has two possible outgoing edges:
     *
     * YES -> handle "yes"
     * NO  -> handle "no"
     */
    if (currentNode.type === "condition") {
      const conditionResult = evaluateCondition(
        currentNode.data?.field,
        currentNode.data?.operator,
        currentNode.data?.value,
      );

      if (conditionResult === null) {
        return {
          success: false,
          logs,
          error: `Condition "${label}" has invalid settings.`,
        };
      }

      const selectedHandle = conditionResult
        ? "yes"
        : "no";

      console.log(
        `Condition "${label}" evaluated to ${
          conditionResult ? "YES" : "NO"
        }`,
      );

      const conditionEdge = edges.find(
        (edge) =>
          edge.source === currentNode?.id &&
          edge.sourceHandle === selectedHandle,
      );

      if (!conditionEdge) {
        return {
          success: false,
          logs,
          error: `Condition "${label}" does not have a ${selectedHandle.toUpperCase()} connection.`,
        };
      }

      const nextNode = nodes.find(
        (node) =>
          node.id === conditionEdge.target,
      );

      if (!nextNode) {
        return {
          success: false,
          logs,
          error:
            "Workflow contains an edge pointing to a missing node.",
        };
      }

      logs.push({
        nodeId: currentNode.id,
        nodeType: currentNode.type,
        label,
        status: "completed",
      });

      currentNode = nextNode;

      continue;
    }

    /*
     * Normal nodes have one outgoing edge.
     */
    const outgoingEdge = edges.find(
      (edge) =>
        edge.source === currentNode?.id,
    );

    if (!outgoingEdge) {
      return {
        success: false,
        logs,
        error: `Node "${label}" does not have a next step.`,
      };
    }

    const nextNode = nodes.find(
      (node) =>
        node.id === outgoingEdge.target,
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
    error:
      "Workflow execution stopped unexpectedly.",
  };
}