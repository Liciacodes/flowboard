import type { Node } from "@xyflow/react";
import { motion } from "motion/react";

type PropertiesPanelProps = {
  selectedNode: Node;
  onLabelChange: (label: string) => void;
  onNodeDataChange: (key: string, value: string) => void;
  onDeleteNode: () => void;
  onClose: () => void;
};

const dotColors: Record<string, string> = {
  trigger: "bg-amber-400",
  action: "bg-sky-400",
  condition: "bg-violet-400",
  delay: "bg-slate-400",
  end: "bg-emerald-400",
};

const fieldClass =
  "mt-2 w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-neutral-600";

const labelClass = "block text-xs text-neutral-400";

const hintClass = "mt-1.5 text-[11px] leading-4 text-neutral-500";

export default function PropertiesPanel({
  selectedNode,
  onLabelChange,
  onNodeDataChange,
  onDeleteNode,
  onClose,
}: PropertiesPanelProps) {
  const data = selectedNode.data;

  return (
    <motion.aside
      initial={{ x: 320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 320, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="absolute right-0 top-0 z-10 h-full w-72 border-l border-neutral-800 bg-neutral-950 p-5 text-white"
    >
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-neutral-500">
            Properties
          </p>

          <div className="mt-1 flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                dotColors[selectedNode.type ?? ""] ?? "bg-neutral-500"
              }`}
            />

            <h2 className="text-base font-medium capitalize text-white">
              {selectedNode.type}
            </h2>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close properties panel"
          className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-900 hover:text-white"
        >
          ×
        </button>
      </div>

      <div className="space-y-5">
        <div>
          <label className={labelClass}>Label</label>

          <input
            type="text"
            value={String(data.label ?? "")}
            onChange={(event) => onLabelChange(event.target.value)}
            className={fieldClass}
          />
        </div>

        {selectedNode.type === "condition" && (
          <>
            <div>
              <label className={labelClass}>Field</label>

              <input
                type="text"
                value={String(data.field ?? "")}
                onChange={(event) =>
                  onNodeDataChange("field", event.target.value)
                }
                className={fieldClass}
              />

              <p className={hintClass}>
                The key to read from the sample data, for example status.
              </p>
            </div>

            <div>
              <label className={labelClass}>Operator</label>

              <select
                value={String(data.operator ?? "equals")}
                onChange={(event) =>
                  onNodeDataChange("operator", event.target.value)
                }
                className={fieldClass}
              >
                <option value="equals">Equals</option>
                <option value="not-equals">Does not equal</option>
                <option value="contains">Contains</option>
                <option value="greater-than">Greater than</option>
                <option value="less-than">Less than</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Value</label>

              <input
                type="text"
                value={String(data.value ?? "")}
                onChange={(event) =>
                  onNodeDataChange("value", event.target.value)
                }
                className={fieldClass}
              />
            </div>
          </>
        )}

        {selectedNode.type === "delay" && (
          <>
            <div>
              <label className={labelClass}>Duration</label>

              <input
                type="number"
                min="0"
                value={String(data.duration ?? "")}
                onChange={(event) =>
                  onNodeDataChange("duration", event.target.value)
                }
                className={fieldClass}
              />
            </div>

            <div>
              <label className={labelClass}>Unit</label>

              <select
                value={String(data.unit ?? "seconds")}
                onChange={(event) =>
                  onNodeDataChange("unit", event.target.value)
                }
                className={fieldClass}
              >
                <option value="seconds">Seconds</option>
                <option value="minutes">Minutes</option>
                <option value="hours">Hours</option>
                <option value="days">Days</option>
              </select>

              <p className={hintClass}>
                Test runs shorten every delay to 1.5 seconds at most.
              </p>
            </div>
          </>
        )}

        <button
          type="button"
          onClick={onDeleteNode}
          className="mt-6 w-full rounded-md border border-red-900 px-3 py-2 text-sm text-red-400 hover:bg-red-950"
        >
          Delete node
        </button>
      </div>
    </motion.aside>
  );
}