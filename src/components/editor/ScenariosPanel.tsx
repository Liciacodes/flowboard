import { useId, useState, type FormEvent } from "react";

import type {
  BranchCoverage,
  ScenarioResult,
} from "../../execution/runScenarios";

import type { Scenario } from "../../types/workflow";
import { parseSampleData } from "./useWorkflowRun";

type EndOption = {
  id: string;
  label: string;
};

type ScenariosPanelProps = {
  scenarios: Scenario[];
  endOptions: EndOption[];
  sampleDataText: string;
  results: ScenarioResult[] | null;
  coverage: BranchCoverage | null;
  error: string | null;
  onAdd: (scenario: Omit<Scenario, "id">) => void;
  onLoad: (scenario: Scenario) => void;
  onDelete: (scenarioId: string) => void;
  onRunAll: () => void;
};

const statusStyles: Record<
  ScenarioResult["status"],
  { icon: string; color: string }
> = {
  passed: { icon: "✓", color: "text-emerald-400" },
  failed: { icon: "✕", color: "text-red-400" },
  error: { icon: "!", color: "text-amber-400" },
};

const fieldClass =
  "mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-xs text-white outline-none focus:border-neutral-500";

const rowButton =
  "rounded px-1.5 py-0.5 text-[11px] text-neutral-400 hover:bg-neutral-800 hover:text-white";

export default function ScenariosPanel({
  scenarios,
  endOptions,
  sampleDataText,
  results,
  coverage,
  error,
  onAdd,
  onLoad,
  onDelete,
  onRunAll,
}: ScenariosPanelProps) {
  const nameId = useId();
  const expectedEndId = useId();

  const [name, setName] = useState("");
  const [expectedEnd, setExpectedEnd] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const passedCount =
    results?.filter((result) => result.status === "passed").length ?? 0;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    const sampleData = parseSampleData(sampleDataText);

    if (sampleData === null) {
      setFormError(
        'Sample data must be a valid JSON object, for example {"status": "active"}.',
      );

      return;
    }

    onAdd({
      name: name.trim() || `Scenario ${scenarios.length + 1}`,
      sampleData,
      expectedEndId: expectedEnd === "" ? null : expectedEnd,
    });

    setName("");
    setFormError(null);
  };

  return (
    <div className="max-h-[60vh] w-80 overflow-y-auto rounded-xl border border-neutral-800 bg-neutral-950 p-3 text-white shadow-xl">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
          Scenarios
        </p>

        <button
          onClick={onRunAll}
          disabled={scenarios.length === 0}
          className="rounded-lg border border-emerald-800 bg-emerald-950 px-2.5 py-1 text-xs text-emerald-300 hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          ▶ Run all
        </button>
      </div>

      {scenarios.length === 0 ? (
        <p className="text-xs leading-5 text-neutral-500">
          A scenario is saved sample data and the End it should reach. Add a
          few, then run them all to check every branch.
        </p>
      ) : (
        <ul className="space-y-1">
          {scenarios.map((scenario) => {
            const result = results?.find(
              (item) => item.scenarioId === scenario.id,
            );

            const expectedLabel =
              scenario.expectedEndId === null
                ? "Any end"
                : endOptions.find(
                    (option) => option.id === scenario.expectedEndId,
                  )?.label ?? "Deleted end";

            return (
              <li
                key={scenario.id}
                className="rounded-md bg-neutral-900 px-2 py-1.5 text-xs"
              >
                <div className="flex items-center gap-2">
                  {result && (
                    <span className={statusStyles[result.status].color}>
                      {statusStyles[result.status].icon}
                    </span>
                  )}

                  <span className="min-w-0 flex-1 truncate text-neutral-200">
                    {scenario.name}
                  </span>

                  <button onClick={() => onLoad(scenario)} className={rowButton}>
                    Load
                  </button>

                  <button
                    onClick={() => onDelete(scenario.id)}
                    aria-label={`Delete scenario ${scenario.name}`}
                    className={rowButton}
                  >
                    ✕
                  </button>
                </div>

                <p className="mt-1 truncate font-mono text-[11px] text-neutral-500">
                  {JSON.stringify(scenario.sampleData)} → {expectedLabel}
                </p>

                {result && (
                  <p
                    className={`mt-1 leading-4 ${
                      result.status === "passed"
                        ? "text-neutral-400"
                        : statusStyles[result.status].color
                    }`}
                  >
                    {result.message}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div aria-live="polite">
        {error && (
          <div className="mt-2 rounded-md border border-red-900/50 bg-red-950/30 p-2 text-xs text-red-300">
            {error}
          </div>
        )}

        {results && coverage && (
          <div className="mt-2 border-t border-neutral-800 pt-2 text-xs">
            <p className="text-neutral-200">
              {passedCount} of {results.length} passed · {coverage.covered} of{" "}
              {coverage.total} branches covered
            </p>

            {coverage.uncoveredBranches.length > 0 && (
              <ul className="mt-1 space-y-1">
                {coverage.uncoveredBranches.map((branch) => (
                  <li
                    key={branch}
                    className="flex items-start gap-2 leading-5 text-neutral-300"
                  >
                    <span className="text-red-400">•</span>
                    {branch}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-3 border-t border-neutral-800 pt-3"
      >
        <p className="text-xs text-neutral-400">
          Save the sample data above as a scenario
        </p>

        <label htmlFor={nameId} className="mt-2 block text-xs text-neutral-400">
          Name
        </label>

        <input
          id={nameId}
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Active customer"
          className={fieldClass}
        />

        <label
          htmlFor={expectedEndId}
          className="mt-2 block text-xs text-neutral-400"
        >
          Should end at
        </label>

        <select
          id={expectedEndId}
          value={expectedEnd}
          onChange={(event) => setExpectedEnd(event.target.value)}
          className={fieldClass}
        >
          <option value="">Any end</option>

          {endOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>

        {formError && (
          <p className="mt-2 text-[11px] leading-4 text-red-300">{formError}</p>
        )}

        <button
          type="submit"
          className="mt-3 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-xs text-white hover:bg-neutral-800"
        >
          + Add scenario
        </button>
      </form>
    </div>
  );
}
