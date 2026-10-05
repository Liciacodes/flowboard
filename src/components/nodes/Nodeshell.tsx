import { Handle, Position } from "@xyflow/react";
import type { ReactNode } from "react";

export type NodeKind = "trigger" | "action" | "condition" | "delay" | "end";

const accents: Record<
  NodeKind,
  { label: string; iconBox: string; handle: string; bar: string }
> = {
  trigger: {
    label: "Trigger",
    iconBox: "bg-amber-500/15 text-amber-400",
    handle: "!bg-amber-400",
    bar: "bg-amber-400",
  },
  action: {
    label: "Action",
    iconBox: "bg-sky-500/15 text-sky-400",
    handle: "!bg-sky-400",
    bar: "bg-sky-400",
  },
  condition: {
    label: "Condition",
    iconBox: "bg-violet-500/15 text-violet-400",
    handle: "!bg-violet-400",
    bar: "bg-violet-400",
  },
  delay: {
    label: "Delay",
    iconBox: "bg-slate-500/20 text-slate-300",
    handle: "!bg-slate-400",
    bar: "bg-slate-400",
  },
  end: {
    label: "End",
    iconBox: "bg-emerald-500/15 text-emerald-400",
    handle: "!bg-emerald-400",
    bar: "bg-emerald-400",
  },
};

const iconPaths: Record<NodeKind, ReactNode> = {
  trigger: <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />,
  action: <path d="M5 12h14M13 6l6 6-6 6" />,
  condition: <path d="M12 2 22 12 12 22 2 12z" />,
  delay: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  end: <path d="M5 13l4 4L19 7" />,
};

const handleBase = "!h-[9px] !w-[9px] !border-2 !border-neutral-900";

type NodeShellProps = {
  kind: NodeKind;
  title: string;
  subtitle?: string;
  hasTarget?: boolean;
  hasSource?: boolean;
  children?: ReactNode;
};

export default function NodeShell({
  kind,
  title,
  subtitle,
  hasTarget = true,
  hasSource = true,
  children,
}: NodeShellProps) {
  const accent = accents[kind];

  return (
    <div className="relative flex min-w-[200px] items-center gap-3 overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900 py-3.5 pl-4 pr-4 text-neutral-100 shadow-lg shadow-black/30">
      <span className={`absolute left-0 top-0 h-full w-1 ${accent.bar}`} />

      {hasTarget && (
        <Handle
          type="target"
          position={Position.Top}
          className={`${handleBase} ${accent.handle}`}
        />
      )}

      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${accent.iconBox}`}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {iconPaths[kind]}
        </svg>
      </div>

      <div className="flex min-w-0 flex-col gap-[3px]">
        <span className="text-[11px] uppercase tracking-[0.06em] text-neutral-500">
          {accent.label}
        </span>

        <p className="m-0 truncate text-sm font-medium">{title}</p>

        {subtitle && (
          <p className="m-0 truncate text-xs text-neutral-500">{subtitle}</p>
        )}
      </div>

      {hasSource && (
        <Handle
          type="source"
          position={Position.Bottom}
          className={`${handleBase} ${accent.handle}`}
        />
      )}

      {children}
    </div>
  );
}