import { useEffect, useState } from "react";
import type { Edge, Node } from "@xyflow/react";

import {
  executeWorkflow,
  type ExecutionLog,
} from "../../execution/executeWorkflow";

import {
  validateWorkflow,
  type ValidationIssue,
} from "../../execution/validateWorkflow";

const parseSampleData = (text: string): Record<string, unknown> | null => {
  try {
    const parsed = JSON.parse(text);

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
};

export function useWorkflowRun(
  nodes: Node[],
  edges: Edge[],
  onInvalidSampleData: () => void,
) {
  const [validationIssues, setValidationIssues] = useState<
    ValidationIssue[] | null
  >(null);

  const [isRunning, setIsRunning] = useState(false);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [activeEdgeId, setActiveEdgeId] = useState<string | null>(null);
  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>([]);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [executionComplete, setExecutionComplete] = useState(false);

  const [sampleDataText, setSampleDataText] = useState(
    '{"status": "active"}',
  );

  useEffect(() => {
    if (isRunning) {
      return;
    }

    const runSucceeded = executionComplete && executionError === null;

    const validationPassedOnly =
      validationIssues !== null &&
      validationIssues.length === 0 &&
      executionLogs.length === 0 &&
      executionError === null;

    if (!runSucceeded && !validationPassedOnly) {
      return;
    }

    const timeoutId = setTimeout(
      () => {
        setValidationIssues(null);
        setExecutionLogs([]);
        setExecutionError(null);
        setExecutionComplete(false);
      },
      runSucceeded ? 8000 : 3000,
    );

    return () => clearTimeout(timeoutId);
  }, [
    isRunning,
    executionComplete,
    executionError,
    executionLogs,
    validationIssues,
  ]);

  const validate = () => {
    setValidationIssues(validateWorkflow(nodes, edges));
  };

  const clearResults = () => {
    if (isRunning) {
      return;
    }

    setValidationIssues(null);
    setExecutionLogs([]);
    setExecutionError(null);
    setExecutionComplete(false);
  };

  const handleNodeStart = (nodeId: string) => {
    setActiveNodeId(nodeId);
    setActiveEdgeId(null);
  };

  const run = async () => {
    if (isRunning) {
      return;
    }

    setExecutionLogs([]);
    setExecutionError(null);
    setExecutionComplete(false);

    const issues = validateWorkflow(nodes, edges);

    setValidationIssues(issues);

    if (issues.length > 0) {
      setExecutionError(
        "Workflow cannot run because it has validation issues.",
      );

      return;
    }

    const sampleData = parseSampleData(sampleDataText);

    if (sampleData === null) {
      setExecutionError(
        'Sample data must be a valid JSON object, for example {"status": "active"}.',
      );
      onInvalidSampleData();
      return;
    }

    setIsRunning(true);

    try {
      const result = await executeWorkflow(
        nodes,
        edges,
        handleNodeStart,
        sampleData,
        setActiveEdgeId,
      );

      setExecutionLogs(result.logs);

      if (!result.success) {
        setExecutionError(
          result.error ?? "Workflow execution failed.",
        );

        return;
      }

      setExecutionComplete(true);
    } catch (error) {
      console.error("Workflow execution failed:", error);

      setExecutionError(
        "An unexpected error occurred while running the workflow.",
      );
    } finally {
      setIsRunning(false);
      setActiveNodeId(null);
      setActiveEdgeId(null);
    }
  };

  const hasResults =
    validationIssues !== null ||
    isRunning ||
    executionLogs.length > 0 ||
    executionError !== null ||
    executionComplete;

  return {
    validationIssues,
    isRunning,
    activeNodeId,
    activeEdgeId,
    executionLogs,
    executionError,
    executionComplete,
    hasResults,
    sampleDataText,
    setSampleDataText,
    validate,
    run,
    clearResults,
  };
}
