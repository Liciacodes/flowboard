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
  detail?: string;
};

export type ExecuteWorkflowResult = {
  success: boolean;
  logs: ExecutionLog[];
  error?: string;
};

export type ExecuteWorkflowOptions = {
  // Skips every pause, so many runs can finish at once.
  instant?: boolean;
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

const conditionPhrases: Record<string, [string, string]> = {
  equals: ["equals", "does not equal"],
  "not-equals": ["is different from", "is the same as"],
  contains: ["contains", "does not contain"],
  "greater-than": ["is greater than", "is not greater than"],
  "less-than": ["is less than", "is not less than"],
};

type ConditionEvaluation = {
  result: boolean;
  actual: string;
  expected: string;
};

const evaluateCondition = (
  field: string | undefined,
  operator: string | undefined,
  value: string | undefined,
  sampleData: Record<string, unknown>,
): ConditionEvaluation | null => {
  if (!field || !operator) {
    return null;
  }

  const rawValue = sampleData[field.trim()];

  if (rawValue === undefined || rawValue === null) {
    return null;
  }

  const actual = String(rawValue).trim();
  const expected = value?.trim() ?? "";

  switch (operator) {
    case "equals":
      return { result: actual === expected, actual, expected };

    case "not-equals":
      return { result: actual !== expected, actual, expected };

    case "contains":
      return {
        result: actual.toLowerCase().includes(expected.toLowerCase()),
        actual,
        expected,
      };

    case "greater-than":
    case "less-than": {
      const actualNumber = Number(actual);
      const expectedNumber = Number(expected);

      if (
        !Number.isFinite(actualNumber) ||
        !Number.isFinite(expectedNumber)
      ) {
        return null;
      }

      return {
        result:
          operator === "greater-than"
            ? actualNumber > expectedNumber
            : actualNumber < expectedNumber,
        actual,
        expected,
      };
    }

    default:
      return null;
  }
};

export async function executeWorkflow(
  nodes: WorkflowNode[],
  edges: Edge[],
  onNodeStart?: (nodeId: string) => void,
  sampleData: Record<string, unknown> = {},
  onEdgeTaken?: (edgeId: string) => void,
  options: ExecuteWorkflowOptions = {},
): Promise<ExecuteWorkflowResult> {
  const logs: ExecutionLog[] = [];

  const pause = options.instant ? () => Promise.resolve() : wait;

  const triggerNode = nodes.find((node) => node.type === "trigger");

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

    onNodeStart?.(currentNode.id);
    await pause(600);

    const log = (detail?: string) => {
      logs.push({
        nodeId: currentNode!.id,
        nodeType: currentNode!.type ?? "unknown",
        label,
        status: "completed",
        detail,
      });
    };

    if (currentNode.type === "trigger" || currentNode.type === "action") {
      log();
    }

    if (currentNode.type === "delay") {
      const duration = currentNode.data?.duration;
      const unit = currentNode.data?.unit;

      const delayInMilliseconds = getDelayInMilliseconds(duration, unit);

      if (delayInMilliseconds === null) {
        return {
          success: false,
          logs,
          error: `Delay "${label}" has an invalid duration or unit.`,
        };
      }

      await pause(Math.min(delayInMilliseconds, 1500));

      log(`Waited ${duration} ${unit} (shortened for the demo).`);
    }

    if (currentNode.type === "end") {
      log("Workflow finished.");

      return {
        success: true,
        logs,
      };
    }

    if (currentNode.type === "condition") {
      const field = currentNode.data?.field;
      const operator = currentNode.data?.operator;

      const evaluation = evaluateCondition(
        field,
        operator,
        currentNode.data?.value,
        sampleData,
      );

      if (evaluation === null) {
        return {
          success: false,
          logs,
          error: `Condition "${label}" could not use "${String(
            field,
          )}" with the sample data. Check the field name and value.`,
        };
      }

      const selectedHandle = evaluation.result ? "yes" : "no";

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
        (node) => node.id === conditionEdge.target,
      );

      if (!nextNode) {
        return {
          success: false,
          logs,
          error: "Workflow contains an edge pointing to a missing node.",
        };
      }

      const phrases = conditionPhrases[operator ?? ""] ?? ["matches", "does not match"];
      const phrase = evaluation.result ? phrases[0] : phrases[1];

      log(
        `${field} is "${evaluation.actual}", which ${phrase} "${evaluation.expected}". Took ${selectedHandle.toUpperCase()}.`,
      );

      onEdgeTaken?.(conditionEdge.id);
      await pause(300);

      currentNode = nextNode;

      continue;
    }

    const outgoingEdge = edges.find(
      (edge) => edge.source === currentNode?.id,
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
        error: "Workflow contains an edge pointing to a missing node.",
      };
    }

    onEdgeTaken?.(outgoingEdge.id);
    await pause(300);

    currentNode = nextNode;
  }

  return {
    success: false,
    logs,
    error: "Workflow execution stopped unexpectedly.",
  };
}