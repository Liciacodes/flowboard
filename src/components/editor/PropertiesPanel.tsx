import type { Node } from "@xyflow/react";

type PropertiesPanelProps = {
  selectedNode: Node | undefined;
  onLabelChange: (label: string) => void;
  onNodeDataChange: (key: string, value: string) => void;
  onDeleteNode: () => void
};

export default function PropertiesPanel({
  selectedNode,
  onLabelChange,
  onNodeDataChange,
  onDeleteNode
}: PropertiesPanelProps) {
  return (
    <aside className="absolute right-0 top-0 z-10 h-full w-72 border-l border-neutral-800 bg-neutral-950 p-5 text-white">
      <h2 className="text-sm font-semibold">Properties</h2>

      {!selectedNode ? (
        <p className="mt-4 text-sm text-neutral-500">
          Select a node to view its properties.
        </p>
      ) : (
        <div className="mt-6 space-y-5">
          <div>
            <p className="text-xs uppercase tracking-wider text-neutral-500">
              {selectedNode.type}
            </p>
          </div>

          <div>
            <label className="block text-xs text-neutral-400">Label</label>

            <input
              type="text"
              value={String(selectedNode.data.label)}
              onChange={(event) => onLabelChange(event.target.value)}
              className="mt-2 w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-neutral-600"
            />
          </div>

          {selectedNode.type === "condition" && (
            <>
              <div>
                <label className="block text-xs text-neutral-400">Field</label>

                <input
                  type="text"
                  value={String(selectedNode.data.field)}
                  onChange={(event) =>
                    onNodeDataChange("field", event.target.value)
                  }
                  className="mt-2 w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-neutral-400">
                  Operator
                </label>

                <select
                  value={String(selectedNode.data.operator)}
                  onChange={(event) =>
                    onNodeDataChange("value", event.target.value)
                  }
                  className="mt-2 w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white"
                >
                  <option value="equals">Equals</option>
                  <option value="not-equals">Does not equal</option>
                  <option value="contains">Contains</option>
                  <option value="greater-than">Greater than</option>
                  <option value="less-than">Less than</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-neutral-400">Value</label>

                <input
                  type="text"
                  value={String(selectedNode.data.value)}
                  onChange={(event) =>
                    onNodeDataChange("value", event.target.value)
                  }
                  className="mt-2 w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white"
                />
              </div>
            </>
          )}

          {selectedNode.type === "delay" && (
            <>
              <div>
                <label className="block text-xs text-neutral-400">
                  Duration
                </label>

                <input
                  type="text"
                  value={String(selectedNode.data.duration)}
                  onChange={(event) =>
                    onNodeDataChange("duration", event.target.value)
                  }
                  className="mt-2 w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-neutral-600"
                />
              </div>

              <div>
                <label className="block text-xs text-neutral-400">Unit</label>

                <select
                  value={String(selectedNode.data.unit)}
                  onChange={(event) =>
                    onNodeDataChange("unit", event.target.value)
                  }
                  className="mt-2 w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-neutral-600"
                >
                  <option value="minutes">Minutes</option>
                  <option value="hours">Hours</option>
                  <option value="days">Days</option>
                </select>
              </div>
            </>
            
          )}
          <button
  onClick={onDeleteNode}
  className="mt-6 w-full rounded-md border border-red-900 px-3 py-2 text-sm text-red-400 hover:bg-red-950"
>
  Delete node
</button>
        </div>
      )}
    </aside>
  );
}
