import type { ExecutionLog } from "../../execution/executeWorkflow";
import type { ValidationIssue } from "../../execution/validateWorkflow";

type ResultsPanelProps = {
  validationIssues: ValidationIssue[] | null;
  isRunning: boolean;
  executionLogs: ExecutionLog[];
  executionError: string | null;
  executionComplete: boolean;
  // Moves the panel clear of the test data panel while that is open.
  besideTestData: boolean;
  onClose: () => void;
};

export default function ResultsPanel({
  validationIssues,
  isRunning,
  executionLogs,
  executionError,
  executionComplete,
  besideTestData,
  onClose,
}: ResultsPanelProps) {
  return (
    <div
      className={`absolute bottom-4 z-10 max-h-[40vh] w-80 overflow-y-auto rounded-xl border border-neutral-800 bg-neutral-950/95 p-3 text-sm text-white shadow-xl backdrop-blur ${
        besideTestData ? "left-88" : "left-16"
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
          Results
        </p>

        <button
          onClick={onClose}
          disabled={isRunning}
          aria-label="Close results"
          className="rounded px-1.5 text-neutral-500 hover:bg-neutral-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          ✕
        </button>
      </div>

      {validationIssues !== null && (
        <div className="mb-2">
          {validationIssues.length === 0 ? (
            <p className="flex items-center gap-2 text-xs text-emerald-400">
              <span>✓</span>
              Workflow is ready. All checks passed.
            </p>
          ) : (
            <>
              <p className="mb-1 flex items-center gap-2 text-xs font-medium text-red-400">
                <span>!</span>
                {validationIssues.length}{" "}
                {validationIssues.length === 1 ? "issue" : "issues"} found
              </p>

              <ul className="space-y-1">
                {validationIssues.map((issue, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-xs leading-5 text-neutral-300"
                  >
                    <span className="text-red-400">•</span>
                    {issue.message}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {(isRunning ||
        executionLogs.length > 0 ||
        executionError ||
        executionComplete) && (
        <div className="border-t border-neutral-800 pt-2">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-xs font-medium text-neutral-200">Execution</p>

            {isRunning && (
              <span className="text-xs text-amber-400">Running...</span>
            )}

            {executionComplete && (
              <span className="text-xs text-emerald-400">Completed</span>
            )}
          </div>

          {executionLogs.length > 0 && (
            <ul className="space-y-1">
              {executionLogs.map((log) => (
                <li
                  key={log.nodeId}
                  className="rounded-md bg-neutral-900 px-2 py-1.5 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400">✓</span>

                    <span className="min-w-0 flex-1 truncate text-neutral-200">
                      {log.label}
                    </span>

                    <span className="text-[11px] text-neutral-500">
                      {log.nodeType}
                    </span>
                  </div>

                  {log.detail && (
                    <p className="mt-1 pl-5 leading-4 text-neutral-400">
                      {log.detail}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}

          {executionError && (
            <div className="mt-2 rounded-md border border-red-900/50 bg-red-950/30 p-2 text-xs text-red-300">
              {executionError}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
