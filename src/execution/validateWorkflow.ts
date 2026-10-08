import type { Edge, Node } from "@xyflow/react";

export type ValidationIssue = {
  message: string;
};

export const validateWorkflow = (nodes: Node[], edges: Edge[]) => {
  const issues: ValidationIssue[] = [];

  const triggerNode = nodes.find((node) => node.type === "trigger");

  if (!triggerNode) {
    issues.push({
      message: "Workflow must have a trigger",
    });
  }

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

  const endNodes = nodes.filter((node) => node.type === "end");

  if (endNodes.length === 0) {
    issues.push({
      message: "Workflow must have an end",
    });
  }

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

  const nodesThatNeedOutgoingConnection = nodes.filter(
    (node) => node.type === "action" || node.type === "delay",
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

  const conditionNodes = nodes.filter(
    (node) => node.type === "condition",
  );

  conditionNodes.forEach((node) => {
    const yesIsConnected = edges.some(
      (edge) => edge.source === node.id && edge.sourceHandle === "yes",
    );

    const noIsConnected = edges.some(
      (edge) => edge.source === node.id && edge.sourceHandle === "no",
    );

    if (!yesIsConnected) {
      issues.push({
        message: `"${String(node.data.label)}" YES branch must be connected`,
      });
    }

    if (!noIsConnected) {
      issues.push({
        message: `"${String(node.data.label)}" NO branch must be connected`,
      });
    }
  });

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

      const nextNodeIds = outgoingEdges.map((edge) => edge.target);

      if (nextNodeIds.length === 0) {
        return false;
      }

      return nextNodeIds.every((nextNodeId) =>
        canReachEnd(nextNodeId, nextVisited),
      );
    };

    const triggerCanReachEnd = canReachEnd(triggerNode.id);

    if (!triggerCanReachEnd) {
      issues.push({
        message:
          "The workflow does not have a valid path from Trigger to End",
      });
    }
  }

  return issues;
};
