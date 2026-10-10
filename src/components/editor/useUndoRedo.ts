import { useCallback, useEffect, useMemo, useState } from "react";
import type { Edge, Node } from "@xyflow/react";

import {
  emptyHistory,
  record,
  redo as redoHistory,
  undo as undoHistory,
  type History,
} from "./history";

type CanvasState = {
  nodes: Node[];
  edges: Edge[];
};

export function useUndoRedo(
  nodes: Node[],
  edges: Edge[],
  setNodes: (nodes: Node[]) => void,
  setEdges: (edges: Edge[]) => void,
  disabled: boolean,
) {
  const [history, setHistory] = useState<History<CanvasState>>(emptyHistory);

  const current = useMemo(() => ({ nodes, edges }), [nodes, edges]);

  // Call this just before changing the canvas.
  const takeSnapshot = useCallback(() => {
    setHistory((currentHistory) => record(currentHistory, current));
  }, [current]);

  const reset = useCallback(() => {
    setHistory(emptyHistory);
  }, []);

  const undo = useCallback(() => {
    const result = disabled ? null : undoHistory(history, current);

    if (!result) {
      return;
    }

    setHistory(result.history);
    setNodes(result.state.nodes);
    setEdges(result.state.edges);
  }, [disabled, history, current, setNodes, setEdges]);

  const redo = useCallback(() => {
    const result = disabled ? null : redoHistory(history, current);

    if (!result) {
      return;
    }

    setHistory(result.history);
    setNodes(result.state.nodes);
    setEdges(result.state.edges);
  }, [disabled, history, current, setNodes, setEdges]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!event.ctrlKey && !event.metaKey) {
        return;
      }

      // Text boxes keep their own undo for what was typed.
      if (
        event.target instanceof HTMLElement &&
        event.target.closest("input, textarea, select")
      ) {
        return;
      }

      const key = event.key.toLowerCase();

      if (key === "z" && !event.shiftKey) {
        event.preventDefault();
        undo();
      } else if (key === "y" || (key === "z" && event.shiftKey)) {
        event.preventDefault();
        redo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [undo, redo]);

  return {
    takeSnapshot,
    reset,
    undo,
    redo,
    canUndo: !disabled && history.past.length > 0,
    canRedo: !disabled && history.future.length > 0,
  };
}
