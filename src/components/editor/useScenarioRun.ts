import { useState } from "react";
import type { Edge, Node } from "@xyflow/react";

import {
  getBranchCoverage,
  runScenarios,
  type BranchCoverage,
  type ScenarioResult,
} from "../../execution/runScenarios";

import { validateWorkflow } from "../../execution/validateWorkflow";
import type { Scenario } from "../../types/workflow";

export function useScenarioRun(
  nodes: Node[],
  edges: Edge[],
  scenarios: Scenario[],
) {
  const [results, setResults] = useState<ScenarioResult[] | null>(null);
  const [coverage, setCoverage] = useState<BranchCoverage | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clear = () => {
    setResults(null);
    setCoverage(null);
    setError(null);
  };

  const runAll = async () => {
    if (scenarios.length === 0) {
      return;
    }

    clear();

    if (validateWorkflow(nodes, edges).length > 0) {
      setError(
        "Scenarios cannot run because the workflow has validation issues.",
      );

      return;
    }

    try {
      const scenarioResults = await runScenarios(nodes, edges, scenarios);

      setResults(scenarioResults);
      setCoverage(getBranchCoverage(nodes, edges, scenarioResults));
    } catch (runError) {
      console.error("Scenario run failed:", runError);

      setError("An unexpected error occurred while running the scenarios.");
    }
  };

  return {
    results,
    coverage,
    error,
    runAll,
    clear,
  };
}
