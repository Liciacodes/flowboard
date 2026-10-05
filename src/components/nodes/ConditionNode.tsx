import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { ConditionNodeData } from "../../types/workflow";
import NodeShell from "./Nodeshell";

const handleBase = "!h-[9px] !w-[9px] !border-2 !border-neutral-900";

export default function ConditionNode({ data }: NodeProps) {
  const nodeData = data as ConditionNodeData;

  return (
    <NodeShell
      kind="condition"
      title={nodeData.label}
      subtitle={`${nodeData.field} ${nodeData.operator} ${nodeData.value}`}
      hasSource={false}
    >
      <span className="absolute bottom-[-24px] left-[35%] -translate-x-1/2 text-[10px] font-semibold tracking-[0.05em] text-emerald-400">
        YES
      </span>

      <span className="absolute bottom-[-24px] left-[65%] -translate-x-1/2 text-[10px] font-semibold tracking-[0.05em] text-rose-400">
        NO
      </span>

      <Handle
        id="yes"
        type="source"
        position={Position.Bottom}
        className={`${handleBase} !bg-emerald-400`}
        style={{ left: "35%" }}
      />

      <Handle
        id="no"
        type="source"
        position={Position.Bottom}
        className={`${handleBase} !bg-rose-400`}
        style={{ left: "65%" }}
      />
    </NodeShell>
  );
}