import type { NodeProps } from "@xyflow/react";
import type { EndNodeData } from "../../types/workflow";
import NodeShell from "./NodeShell";

export default function EndNode({ data }: NodeProps) {
  const nodeData = data as EndNodeData;

  return <NodeShell kind="end" title={nodeData.label} hasSource={false} />;
}