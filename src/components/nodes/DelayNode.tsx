import type { NodeProps } from "@xyflow/react";
import type { DelayNodeData } from "../../types/workflow";
import NodeShell from "./Nodeshell";

export default function DelayNode({ data }: NodeProps) {
  const nodeData = data as DelayNodeData;

  return (
    <NodeShell
      kind="delay"
      title={nodeData.label}
      subtitle={`${nodeData.duration} ${nodeData.unit}`}
    />
  );
}