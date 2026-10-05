import type { NodeProps } from "@xyflow/react";
import type { TriggerNodeData } from "../../types/workflow";
import NodeShell from "./NodeShell";

export default function TriggerNode({ data }: NodeProps) {
  const nodeData = data as TriggerNodeData;

  return <NodeShell kind="trigger" title={nodeData.label} hasTarget={false} />;
}