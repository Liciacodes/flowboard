import { useEffect } from "react";
import { useBlocker } from "react-router-dom";
import type { Edge, Node } from "@xyflow/react";

export type WorkflowState = {
  name: string;
  nodes: Node[];
  edges: Edge[];
};

const getWorkflowSnapshot = ({ name, nodes, edges }: WorkflowState) => ({
  name,
  nodes: nodes.map(({ selected, dragging, measured, ...node }) => node),
  edges: edges.map(({ selected, ...edge }) => edge),
});

export function useUnsavedChanges(
  current: WorkflowState,
  saved: WorkflowState | null,
) {
  const hasUnsavedChanges =
    saved !== null &&
    JSON.stringify(getWorkflowSnapshot(current)) !==
      JSON.stringify(getWorkflowSnapshot(saved));

  const blocker = useBlocker(hasUnsavedChanges);

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
