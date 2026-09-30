import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

type Workflow = {
  id: string;
  name: string;
  status: string;
  nodes?: unknown[];
  createdAt: string;
  updatedAt: string;
};

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingWorkflowId, setDeletingWorkflowId] = useState<string | null>(
    null,
  );
  const [duplicatingWorkflowId, setDuplicatingWorkflowId] = useState<
    string | null
  >(null);

  const navigate = useNavigate();

  const loadWorkflows = async () => {
    setIsLoading(true);
    setLoadError(false);

    try {
      const response = await fetch("http://localhost:5000/api/workflows");

      if (!response.ok) {
        throw new Error("Failed to load workflows");
      }

      const data = await response.json();

      setWorkflows(data.workflows);
    } catch (error) {
      console.error("Error loading workflows:", error);
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWorkflows();
  }, []);

  const handleCreateWorkflow = async () => {
    if (isCreating) {
      return;
    }

    setIsCreating(true);

    try {
      const response = await fetch("http://localhost:5000/api/workflows", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Untitled Workflow",
          nodes: [],
          edges: [],
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create workflow");
      }

      const data = await response.json();

      navigate(`/workflows/${data.workflow.id}`);
    } catch (error) {
      console.error("Error creating workflow:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteWorkflow = async (id: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this workflow?",
    );

    if (!confirmed) {
      return;
    }

    setDeletingWorkflowId(id);

    try {
      const response = await fetch(
        `http://localhost:5000/api/workflows/${id}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to delete workflow");
      }

      setWorkflows((currentWorkflows) =>
        currentWorkflows.filter((workflow) => workflow.id !== id),
      );
    } catch (error) {
      console.error("Error deleting workflow:", error);
    } finally {
      setDeletingWorkflowId(null);
    }
  };

  const handleDuplicateWorkflow = async (id: string) => {
    if (duplicatingWorkflowId) {
      return;
    }

    setDuplicatingWorkflowId(id);

    try {
      const response = await fetch(
        `http://localhost:5000/api/workflows/${id}/duplicate`,
        {
          method: "POST",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to duplicate workflow");
      }

      const data = await response.json();

      setWorkflows((currentWorkflows) => [
        data.workflow,
        ...currentWorkflows,
      ]);
    } catch (error) {
      console.error("Error duplicating workflow:", error);
    } finally {
      setDuplicatingWorkflowId(null);
    }
  };

  const formatUpdatedTime = (dateString: string) => {
    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return "Unknown";
    }

    return new Intl.DateTimeFormat("en", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  };

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-8 text-white md:px-10">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-neutral-500">Flowboard</p>

            <h1 className="mt-1 text-2xl font-semibold">
              My Workflows
            </h1>

            <p className="mt-1 text-sm text-neutral-400">
              Create, manage, and edit your workflows.
            </p>
          </div>

          <button
            onClick={handleCreateWorkflow}
            disabled={isCreating}
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isCreating ? "Creating..." : "+ New Workflow"}
          </button>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="mt-8 rounded-xl border border-neutral-800 bg-neutral-900 p-10 text-center">
            <p className="text-sm text-neutral-400">
              Loading workflows...
            </p>
          </div>
        )}

        {/* Error state */}
        {!isLoading && loadError && (
          <div className="mt-8 rounded-xl border border-red-500/20 bg-red-500/5 p-8 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10 text-red-400">
              !
            </div>

            <h2 className="mt-4 font-medium text-white">
              Couldn't load your workflows
            </h2>

            <p className="mt-2 text-sm text-neutral-400">
              Something went wrong while connecting to Flowboard.
            </p>

            <button
              onClick={loadWorkflows}
              className="mt-5 rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800"
            >
              Try again
            </button>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !loadError && workflows.length === 0 && (
          <div className="mt-8 rounded-xl border border-dashed border-neutral-800 bg-neutral-900/50 p-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 text-xl">
              +
            </div>

            <h2 className="mt-4 text-lg font-medium text-white">
              No workflows yet
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm text-neutral-400">
              Create your first workflow and start building your automation.
            </p>

            <button
              onClick={handleCreateWorkflow}
              disabled={isCreating}
              className="mt-5 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isCreating
                ? "Creating..."
                : "+ Create your first workflow"}
            </button>
          </div>
        )}

        {/* Workflow list */}
        {!isLoading && !loadError && workflows.length > 0 && (
          <div className="mt-8 space-y-3">
            {workflows.map((workflow) => {
              const isDeleting = deletingWorkflowId === workflow.id;
              const isDuplicating =
                duplicatingWorkflowId === workflow.id;

              const nodeCount = workflow.nodes?.length ?? 0;

              return (
                <div
                  key={workflow.id}
                  className="rounded-xl border border-neutral-800 bg-neutral-900 p-5 transition hover:border-neutral-700 hover:bg-neutral-900/80"
                >
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    {/* Workflow information */}
                    <Link
                      to={`/workflows/${workflow.id}`}
                      className="min-w-0 flex-1"
                    >
                      <div className="flex items-center gap-3">
                        <h2 className="truncate font-medium text-white">
                          {workflow.name}
                        </h2>

                        <span className="rounded-full border border-neutral-700 bg-neutral-800 px-2 py-0.5 text-xs text-neutral-400">
                          {workflow.status}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500">
                        <span>
                          {nodeCount}{" "}
                          {nodeCount === 1 ? "node" : "nodes"}
                        </span>

                        <span>
                          Updated{" "}
                          {formatUpdatedTime(workflow.updatedAt)}
                        </span>
                      </div>
                    </Link>

                    {/* Actions */}
                    <div className="flex shrink-0 gap-2">
                      <Link
                        to={`/workflows/${workflow.id}`}
                        className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white hover:bg-neutral-800"
                      >
                        Open
                      </Link>

                      <button
                        onClick={() =>
                          handleDuplicateWorkflow(workflow.id)
                        }
                        disabled={
                          duplicatingWorkflowId !== null ||
                          deletingWorkflowId !== null
                        }
                        className="rounded-lg px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isDuplicating ? "Duplicating..." : "Duplicate"}
                      </button>

                      <button
                        onClick={() =>
                          handleDeleteWorkflow(workflow.id)
                        }
                        disabled={
                          isDeleting ||
                          deletingWorkflowId !== null ||
                          duplicatingWorkflowId !== null
                        }
                        className="rounded-lg px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isDeleting ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}