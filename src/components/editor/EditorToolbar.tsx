import { useId, type ReactNode } from "react";

import type { WorkFlowNodeType } from "../../types/workflow";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

type EditorToolbarProps = {
  workflowName: string;
  onWorkflowNameChange: (name: string) => void;
  isNodeMenuOpen: boolean;
  onToggleNodeMenu: () => void;
  onAddNode: (type: WorkFlowNodeType) => void;
  onValidate: () => void;
  onRun: () => void;
  isRunning: boolean;
  onLoadDemo: () => void;
  isSampleDataOpen: boolean;
  onToggleSampleData: () => void;
  sampleDataText: string;
  onSampleDataChange: (text: string) => void;
  scenariosPanel: ReactNode;
  hasUnsavedChanges: boolean;
  saveStatus: SaveStatus;
  onSave: () => void;
};

const nodeTypeOptions: WorkFlowNodeType[] = [
  "trigger",
  "action",
  "condition",
  "delay",
  "end",
];

const saveLabels: Record<SaveStatus, string> = {
  idle: "Save workflow",
  saving: "Saving...",
  saved: "✓ Saved",
  error: "Save failed",
};

const toolbarButton =
  "rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800";

export default function EditorToolbar({
  workflowName,
  onWorkflowNameChange,
  isNodeMenuOpen,
  onToggleNodeMenu,
  onAddNode,
  onValidate,
  onRun,
  isRunning,
  onLoadDemo,
  isSampleDataOpen,
  onToggleSampleData,
  sampleDataText,
  onSampleDataChange,
  scenariosPanel,
  hasUnsavedChanges,
  saveStatus,
  onSave,
}: EditorToolbarProps) {
  const nodeMenuId = useId();
  const sampleDataId = useId();
  const sampleDataInputId = useId();

  return (
    <div className="absolute left-4 top-4 z-10">
      <input
        type="text"
        value={workflowName}
        onChange={(event) => onWorkflowNameChange(event.target.value)}
        placeholder="Workflow name"
        aria-label="Workflow name"
        className="mb-3 w-64 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white outline-none"
      />

      <div className="flex flex-wrap gap-2">
        <button
          onClick={onToggleNodeMenu}
          aria-expanded={isNodeMenuOpen}
          aria-controls={nodeMenuId}
          className={toolbarButton}
        >
          + Add node
        </button>

        <button onClick={onValidate} className={toolbarButton}>
          Validate workflow
        </button>

        <button
          onClick={onRun}
          disabled={isRunning}
          className="rounded-lg border border-emerald-800 bg-emerald-950 px-4 py-2 text-sm text-emerald-300 hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isRunning ? "Running..." : "▶ Run workflow"}
        </button>

        <button onClick={onLoadDemo} className={toolbarButton}>
          Load demo
        </button>

        <button
          onClick={onToggleSampleData}
          aria-expanded={isSampleDataOpen}
          aria-controls={sampleDataId}
          className={toolbarButton}
        >
          {isSampleDataOpen ? "Hide test data" : "Test data"}
        </button>

        {hasUnsavedChanges && (
          <span className="flex items-center px-2 text-xs text-amber-400">
            Unsaved changes
          </span>
        )}

        <button
          onClick={onSave}
          disabled={saveStatus === "saving" || !hasUnsavedChanges}
          className={`${toolbarButton} disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {saveLabels[saveStatus]}
        </button>
      </div>

      {isSampleDataOpen && (
        <div id={sampleDataId} className="mt-3 space-y-2">
          <div className="w-80 rounded-xl border border-neutral-800 bg-neutral-950 p-3 shadow-xl">
            <label
              htmlFor={sampleDataInputId}
              className="block text-xs text-neutral-400"
            >
              Sample data (JSON)
            </label>

            <textarea
              id={sampleDataInputId}
              value={sampleDataText}
              onChange={(event) => onSampleDataChange(event.target.value)}
              rows={3}
              spellCheck={false}
              className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 p-2 font-mono text-xs text-white outline-none focus:border-neutral-500"
            />

            <p className="mt-1 text-[11px] text-neutral-500">
              Conditions read their field from this data.
            </p>
          </div>

          {scenariosPanel}
        </div>
      )}

      {isNodeMenuOpen && (
        <div
          id={nodeMenuId}
          className="mt-2 w-44 rounded-xl border border-neutral-800 bg-neutral-950 p-1.5 shadow-xl"
        >
          {nodeTypeOptions.map((type) => (
            <button
              key={type}
              onClick={() => onAddNode(type)}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm capitalize text-neutral-200 hover:bg-neutral-900"
            >
              {type}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
