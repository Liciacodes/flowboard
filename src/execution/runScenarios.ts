import type { Edge, Node } from "@xyflow/react";

import type { Scenario } from "../types/workflow";
import { executeWorkflow, type ExecutionLog } from "./executeWorkflow";

export type ScenarioResult = {
  scenarioId: string;
  status: "passed" | "failed" | "error";
  message: string;
  logs: ExecutionLog[];
  takenEdgeIds: string[];
};

export type BranchCoverage = {
  total: number;
  covered: number;
  uncoveredEdgeIds: string[];
  uncoveredBranches: string[];
};

const getLabel = (node: Node) =>
  typeof node.data?.label === "string"
    ? node.data.label
    : node.type ?? "Unknown node";

const runScenario = async (
  nodes: Node[],
  edges: Edge[],
  scenario: Scenario,
): Promise<ScenarioResult> => {
  const takenEdgeIds: string[] = [];

  const result = await executeWorkflow(
    nodes,
    edges,
    undefined,
    scenario.sampleData,
    (edgeId) => {
      takenEdgeIds.push(edgeId);
    },
    { instant: true },
  );

  const base = {
    scenarioId: scenario.id,
    logs: result.logs,
    takenEdgeIds,
  };

  if (!result.success) {
    return {
      ...base,
      status: "error",
      message: result.error ?? "Workflow execution failed.",
    };
  }

  // A successful run always finishes on an End node, which is its last log.
  const reachedEndId = result.logs[result.logs.length - 1]?.nodeId;
  const reachedEnd = nodes.find((node) => node.id === reachedEndId);
  const reachedLabel = reachedEnd ? getLabel(reachedEnd) : "an unknown node";

  if (scenario.expectedEndId === null) {
    return {
      ...base,
      status: "passed",
      message: `Ended at "${reachedLabel}".`,
    };
  }

  const expectedEnd = nodes.find(
    (node) => node.id === scenario.expectedEndId && node.type === "end",
  );

  if (!expectedEnd) {
    return {
      ...base,
      status: "failed",
      message: "The expected End no longer exists in this workflow.",
    };
  }

  if (expectedEnd.id === reachedEndId) {
    return {
      ...base,
      status: "passed",
      message: `Ended at "${reachedLabel}", as expected.`,
    };
  }

  return {
    ...base,
    status: "failed",
    message: `Expected to end at "${getLabel(
      expectedEnd,
    )}" but ended at "${reachedLabel}".`,
  };
};

export async function runScenarios(
  nodes: Node[],
  edges: Edge[],
  scenarios: Scenario[],
): Promise<ScenarioResult[]> {
  const results: ScenarioResult[] = [];

  for (const scenario of scenarios) {
    results.push(await runScenario(nodes, edges, scenario));
  }

  return results;
}

// A branch is an edge leaving a Condition node, so each Condition has two.
export function getBranchCoverage(
  nodes: Node[],
  edges: Edge[],
  results: ScenarioResult[],
): BranchCoverage {
  const takenEdgeIds = new Set(
    results.flatMap((result) => result.takenEdgeIds),
  );

  const uncoveredEdgeIds: string[] = [];
  const uncoveredBranches: string[] = [];

  let total = 0;

  edges.forEach((edge) => {
    const source = nodes.find((node) => node.id === edge.source);

    if (source?.type !== "condition") {
      return;
    }

    total += 1;

    if (takenEdgeIds.has(edge.id)) {
      return;
    }

    uncoveredEdgeIds.push(edge.id);

    uncoveredBranches.push(
      `"${getLabel(source)}" ${(
        edge.sourceHandle ?? "branch"
      ).toUpperCase()} is never taken.`,
    );
  });

  return {
    total,
    covered: total - uncoveredEdgeIds.length,
    uncoveredEdgeIds,
    uncoveredBranches,
  };
}
