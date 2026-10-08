import { useId, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { API_URL } from "../../config";
import { getWorkflowPath } from "../../workflowUrl";

const MIN_LENGTH = 10;
const MAX_LENGTH = 500;

export default function GenerateWorkflowBox() {
  const inputId = useId();
  const navigate = useNavigate();

  const [description, setDescription] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (isGenerating) {
      return;
    }

    if (description.trim().length < MIN_LENGTH) {
      setError("Describe the workflow in a little more detail.");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/workflows/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ description }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setError(data?.message ?? "Could not generate a workflow.");
        return;
      }

      navigate(getWorkflowPath(data.workflow));
    } catch (generateError) {
      console.error("Error generating workflow:", generateError);

      setError("Flowboard could not be reached. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-8 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4"
    >
      <label
        htmlFor={inputId}
        className="block text-sm font-medium text-neutral-200"
      >
        Describe a workflow and Flowboard builds it
      </label>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          id={inputId}
          type="text"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={MAX_LENGTH}
          disabled={isGenerating}
          placeholder="When an order is placed, wait 2 days, then if it is unpaid send a reminder"
          className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-2 text-sm text-white outline-none placeholder:text-neutral-600 focus:border-neutral-600 disabled:opacity-60"
        />

        <button
          type="submit"
          disabled={isGenerating}
          className="shrink-0 rounded-lg bg-amber-400 px-4 py-2 text-sm font-medium text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isGenerating ? "Building your workflow..." : "✦ Generate"}
        </button>
      </div>

      <div aria-live="polite">
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      </div>
    </form>
  );
}
