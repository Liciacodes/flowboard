import type { NodeProps } from "@xyflow/react";
import type { ActionNodeData } from "../../types/workflow";
import NodeShell from "./NodeShell";

export default function ActionNode({ data }: NodeProps) {
  const nodeData = data as ActionNodeData;

  return <NodeShell kind="action" title={nodeData.label} />;
}