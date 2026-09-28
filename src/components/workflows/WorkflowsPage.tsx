import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

type Workflow = {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const navigate = useNavigate();

  const handleCreateWorkflow = async () => {
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
    }
  };

  const handleDeleteWorkflow = async (id: string) => {
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
    }
  };

  const handleDuplicateWorkflow = async (id: string) => {
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

      setWorkflows((currentWorkflows) => [data.workflow, ...currentWorkflows]);
    } catch (error) {
      console.error("Error duplicating workflow:", error);
    }
  };

  useEffect(() => {
    const loadWorkflows = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/workflows");

        if (!response.ok) {
          throw new Error("Failed to load workflows");
        }

        const data = await response.json();

        setWorkflows(data.workflows);
      } catch (error) {
        console.error("Error loading workflows:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadWorkflows();
  }, []);

  return (
    <main className="min-h-screen bg-neutral-950 p-8 text-white">
      <h1 className="text-2xl font-semibold">My Workflows</h1>

      <button
        onClick={handleCreateWorkflow}
        className="mt-4 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200"
      >
        + New Workflow
      </button>

      <div className="mt-6">
        {isLoading ? (
          <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-8 text-center">
            <p className="text-sm text-neutral-400">
              Loading workflows...
            </p>
          </div>
        ) : workflows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-800 bg-neutral-900/50 p-10 text-center">
            <h2 className="text-lg font-medium text-white">
              No workflows yet
            </h2>

            <p className="mt-2 text-sm text-neutral-400">
              Create your first workflow to get started.
            </p>

            <button
              onClick={handleCreateWorkflow}
              className="mt-5 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200"
            >
              + Create your first workflow
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {workflows.map((workflow) => (
              <div
                key={workflow.id}
                className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900 p-4 hover:bg-neutral-800"
              >
                <Link
                  to={`/workflows/${workflow.id}`}
                  className="flex-1"
                >
                  <h2 className="font-medium">{workflow.name}</h2>

                  <p className="mt-1 text-sm text-neutral-400">
                    {workflow.status}
                  </p>
                </Link>

                <div className="ml-4 flex gap-2">
                  <button
                    onClick={() => handleDuplicateWorkflow(workflow.id)}
                    className="rounded-lg px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-800"
                  >
                    Duplicate
                  </button>

                  <button
                    onClick={() => handleDeleteWorkflow(workflow.id)}
                    className="rounded-lg px-3 py-2 text-sm text-red-400 hover:bg-red-500/10"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}