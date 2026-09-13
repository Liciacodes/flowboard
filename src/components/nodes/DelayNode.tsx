import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { DelayNodeData } from "../../types/workflow";

export default function DelayNode({ data}: NodeProps) {
    const nodeData = data as DelayNodeData;

    return (
    <div className="flex min-w-[180px] items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900 p-3.5 text-neutral-100">
      <Handle
        type="target"
        position={Position.Top}
        className="!h-[9px] !w-[9px] !border-2 !border-neutral-900 !bg-neutral-400"
      />

      <div className="flex h-[34px] w-[34px] items-center justify-center rounded-lg bg-neutral-800">
        ◷
      </div>

      <div className="flex flex-col gap-[3px]">
        <span className="text-[11px] uppercase tracking-[0.06em] text-neutral-500">
          Delay
        </span>

        <p className="m-0 text-sm font-medium">
          {nodeData.label}
        </p>

        <p className="text-xs text-neutral-500">
          {nodeData.duration} {nodeData.unit}
        </p>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-[9px] !w-[9px] !border-2 !border-neutral-900 !bg-neutral-400"
      />
    </div>
  );
}