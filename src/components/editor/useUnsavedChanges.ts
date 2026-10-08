import { useEffect } from "react";
import { useBlocker } from "react-router-dom";
import type { Edge, Node } from "@xyflow/react";

import { isSameWorkflowPath } from "../../workflowUrl";
import type { Scenario } from "../../types/workflow";

export type WorkflowState = {
  name: string;
  nodes: Node[];
  edges: Edge[];
  scenarios: Scenario[];
};

const getWorkflowSnapshot = ({
  name,
  nodes,
  edges,
  scenarios,
}: WorkflowState) => ({
  name,
  nodes: nodes.map(({ selected, dragging, measured, ...node }) => node),
  edges: edges.map(({ selected, ...edge }) => edge),
  scenarios,
});

export function useUnsavedChanges(
  current: WorkflowState,
  saved: WorkflowState | null,
) {
  const hasUnsavedChanges =
    saved !== null &&
    JSON.stringify(getWorkflowSnapshot(current)) !==
      JSON.stringify(getWorkflowSnapshot(saved));

  // Renaming a workflow changes its address, which is not leaving the editor.
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      hasUnsavedChanges &&
      !isSameWorkflowPath(currentLocation.pathname, nextLocation.pathname),
  );

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  return { hasUnsavedChanges, blocker };
}
