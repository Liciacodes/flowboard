import type { Node } from "@xyflow/react";

type PropertiesPanelProps = {
  selectedNode: Node | undefined;
};

export default function PropertiesPanel({
  selectedNode,
}: PropertiesPanelProps) {
  return (
    <aside className="absolute right-0 top-0 z-10 h-full w-72 border-l border-neutral-800 bg-neutral-950 p-5 text-white">
      <h2 className="text-sm font-semibold">
        Properties
      </h2>

      {!selectedNode ? (
        <p className="mt-4 text-sm text-neutral-500">
          Select a node to view its properties.
        </p>
      ) : (
        <div className="mt-6">
          <p className="text-xs uppercase tracking-wider text-neutral-500">
            {selectedNode.type}
          </p>

          <p className="mt-1 text-sm font-medium">
            {String(selectedNode.data.label)}
          </p>
        </div>
      )}
    </aside>
  );
}