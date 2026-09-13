import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { ConditionNodeData } from "../../types/workflow";

export default function ConditionNode({ data }: NodeProps) {
  const nodeData = data as ConditionNodeData;

  return (
    <div className="relative flex min-w-[180px] items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900 p-3.5 text-neutral-100">
      <Handle
        type="target"
        position={Position.Top}
        className="!h-[9px] !w-[9px] !border-2 !border-neutral-900 !bg-neutral-400"
      />

      <div className="flex h-[34px] w-[34px] items-center justify-center rounded-lg bg-neutral-800">
        ?
      </div>

      <div className="flex flex-col gap-[3px]">
        <span className="text-[11px] uppercase tracking-[0.06em] text-neutral-500">
          Condition
        </span>

        <p className="m-0 text-sm font-medium">{nodeData.label}</p>
        <p className="mt-1 text-xs text-neutral-500">
  {nodeData.field} {nodeData.operator} {nodeData.value}
</p>

      </div>


      <span className="absolute bottom-[-24px] left-[35%] -translate-x-1/2 text-[9px] tracking-[0.05em] text-neutral-500">
        YES
      </span>

      <span className="absolute bottom-[-24px] left-[65%] -translate-x-1/2 text-[9px] tracking-[0.05em] text-neutral-500">
        NO
      </span>

      <Handle
        id="yes"
        type="source"
        position={Position.Bottom}
        className="!h-[9px] !w-[9px] !border-2 !border-neutral-900 !bg-neutral-400"
        style={{ left: "35%" }}
      />

      <Handle
        id="no"
        type="source"
        position={Position.Bottom}
        className="!h-[9px] !w-[9px] !border-2 !border-neutral-900 !bg-neutral-400"
        style={{ left: "65%" }}
      />
    </div>
  );
}