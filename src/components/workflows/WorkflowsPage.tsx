import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { demoNodes, demoEdges } from "../../data/demoWorkflow";

type PreviewNode = {
  id: string;
  type?: string;
  position: { x: number; y: number };
};

type PreviewEdge = {
  source: string;
  target: string;
};

type Workflow = {
  id: string;
  name: string;
  status: string;
  nodes?: PreviewNode[];
  edges?: PreviewEdge[];
  createdAt: string;
  updatedAt: string;
};

const nodeColors: Record<string, string> = {
  trigger: "#fbbf24",
  action: "#38bdf8",
  condition: "#a78bfa",
  delay: "#94a3b8",
  end: "#34d399",
};

const statusStyles: Record<string, string> = {
  draft: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  active: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
};

const PREVIEW_WIDTH = 240;
const PREVIEW_HEIGHT = 110;
const PREVIEW_PADDING = 16;

function WorkflowPreview({
  nodes,
  edges,
}: {
  nodes: PreviewNode[];
  edges: PreviewEdge[];
}) {
  if (nodes.length === 0) {
    return (
      <div className="flex h-[110px] items-center justify-center rounded-lg border border-dashed border-neutral-800 text-xs text-neutral-600">
        Empty canvas
      </div>
    );
  }

  const xs = nodes.map((node) => node.position.x);
  const ys = nodes.map((node) => node.position.y);

  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const width = Math.max(Math.max(...xs) - minX, 1);
  const height = Math.max(Math.max(...ys) - minY, 1);

  const innerWidth = PREVIEW_WIDTH - PREVIEW_PADDING * 2;
  const innerHeight = PREVIEW_HEIGHT - PREVIEW_PADDING * 2;
  const scale = Math.min(innerWidth / width, innerHeight / height, 0.35);

  const offsetX = (innerWidth - width * scale) / 2;
  const offsetY = (innerHeight - height * scale) / 2;

  const centers = new Map<string, { x: number; y: number }>();

  nodes.forEach((node) => {
    centers.set(node.id, {
      x: PREVIEW_PADDING + offsetX + (node.position.x - minX) * scale,
      y: PREVIEW_PADDING + offsetY + (node.position.y - minY) * scale,
    });
  });

  return (
    <svg
      viewBox={`0 0 ${PREVIEW_WIDTH} ${PREVIEW_HEIGHT}`}
      className="h-[110px] w-full rounded-lg bg-neutral-950/60"
    >
      {edges.map((edge, index) => {
        const from = centers.get(edge.source);
        const to = centers.get(edge.target);

        if (!from || !to) {
          return null;
        }

        return (
          <line
            key={index}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke="#52525b"
            strokeWidth="1.5"
          />
        );
      })}

      {nodes.map((node) => {
        const center = centers.get(node.id);

        if (!center) {
          return null;
        }

        return (
          <rect
            key={node.id}
            x={center.x - 9}
            y={center.y - 5}
            width="18"
            height="10"
            rx="3"
            fill={nodeColors[node.type ?? ""] ?? "#71717a"}
          />
        );
      })}
    </svg>
  );
}

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
  const [query, setQuery] = useState("");

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

  const createWorkflow = async (
    name: string,
    nodes: unknown[],
    edges: unknown[],
  ) => {
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
        body: JSON.stringify({ name, nodes, edges }),
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

  const handleCreateWorkflow = () => createWorkflow("Untitled Workflow", [], []);

  const handleCreateDemo = () =>
    createWorkflow("Customer Onboarding", demoNodes, demoEdges);

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

    const seconds = Math.round((date.getTime() - Date.now()) / 1000);
    const absSeconds = Math.abs(seconds);
    const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

    if (absSeconds < 60) {
      return "just now";
    }

    if (absSeconds < 3600) {
      return formatter.format(Math.round(seconds / 60), "minute");
    }

    if (absSeconds < 86400) {
      return formatter.format(Math.round(seconds / 3600), "hour");
    }

    if (absSeconds < 86400 * 30) {
      return formatter.format(Math.round(seconds / 86400), "day");
    }

    return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(date);
  };

  const filteredWorkflows = useMemo(
    () =>
      workflows.filter((workflow) =>
        workflow.name.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [workflows, query],
  );

  const totalNodes = workflows.reduce(
    (sum, workflow) => sum + (workflow.nodes?.length ?? 0),
    0,
  );

  const isBusy =
    deletingWorkflowId !== null || duplicatingWorkflowId !== null;

  return (
    <main className="relative min-h-screen overflow-hidden bg-neutral-950 px-6 py-10 text-white md:px-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(60%_80%_at_50%_0%,rgba(245,166,35,0.14),transparent)]" />

      <div className="relative mx-auto max-w-6xl">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium tracking-wide text-amber-400">
              Flowboard
            </p>

            <h1 className="mt-2 bg-gradient-to-b from-white to-neutral-400 bg-clip-text text-4xl font-semibold tracking-tight text-transparent">
              Build workflows that explain themselves
            </h1>

            <p className="mt-3 max-w-xl text-sm text-neutral-400">
              Design, validate and run automations on a visual canvas. Every
              run shows exactly which path it took.
            </p>
          </div>

          <div className="flex shrink-0 gap-2">
            <button
              onClick={handleCreateDemo}
              disabled={isCreating}
              className="rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Start from demo
            </button>

            <button
              onClick={handleCreateWorkflow}
              disabled={isCreating}
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isCreating ? "Creating..." : "+ New workflow"}
            </button>
          </div>
        </div>

        {!isLoading && !loadError && workflows.length > 0 && (
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/70 px-4 py-2.5">
                <p className="text-xl font-semibold">{workflows.length}</p>
                <p className="text-xs text-neutral-500">
                  {workflows.length === 1 ? "Workflow" : "Workflows"}
                </p>
              </div>

              <div className="rounded-xl border border-neutral-800 bg-neutral-900/70 px-4 py-2.5">
                <p className="text-xl font-semibold">{totalNodes}</p>
                <p className="text-xs text-neutral-500">Total nodes</p>
              </div>
            </div>

            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search workflows..."
              aria-label="Search workflows"
              className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm text-white outline-none placeholder:text-neutral-600 focus:border-neutral-600 sm:w-72"
            />
          </div>
        )}

        {isLoading && (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="h-64 animate-pulse rounded-2xl border border-neutral-800 bg-neutral-900/60"
              />
            ))}
          </div>
        )}

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

        {!isLoading && !loadError && workflows.length === 0 && (
          <div className="mt-8 rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/40 p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 text-xl">
              +
            </div>

            <h2 className="mt-4 text-lg font-medium text-white">
              No workflows yet
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm text-neutral-400">
              Start from the Customer Onboarding demo to see a workflow run, or
              build your own from scratch.
            </p>

            <div className="mt-5 flex justify-center gap-2">
              <button
                onClick={handleCreateDemo}
                disabled={isCreating}
                className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Start from demo
              </button>

              <button
                onClick={handleCreateWorkflow}
                disabled={isCreating}
                className="rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Create blank
              </button>
            </div>
          </div>
        )}

        {!isLoading &&
          !loadError &&
          workflows.length > 0 &&
          filteredWorkflows.length === 0 && (
            <p className="mt-10 text-center text-sm text-neutral-500">
              No workflows match "{query}".
            </p>
          )}

        {!isLoading && !loadError && filteredWorkflows.length > 0 && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredWorkflows.map((workflow) => {
              const isDeleting = deletingWorkflowId === workflow.id;
              const isDuplicating = duplicatingWorkflowId === workflow.id;
              const nodeCount = workflow.nodes?.length ?? 0;

              return (
                <div
                  key={workflow.id}
                  className="group flex flex-col rounded-2xl border border-neutral-800 bg-neutral-900/70 p-4 transition hover:-translate-y-0.5 hover:border-neutral-600 hover:bg-neutral-900"
                >
                  <Link to={`/workflows/${workflow.id}`} className="block">
                    <WorkflowPreview
                      nodes={workflow.nodes ?? []}
                      edges={workflow.edges ?? []}
                    />

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <h2 className="truncate font-medium text-white">
                        {workflow.name}
                      </h2>

                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-xs capitalize ${
                          statusStyles[workflow.status] ??
                          "border-neutral-700 bg-neutral-800 text-neutral-400"
                        }`}
                      >
                        {workflow.status}
                      </span>
                    </div>

                    <p className="mt-1.5 text-xs text-neutral-500">
                      {nodeCount} {nodeCount === 1 ? "node" : "nodes"} ·
                      Updated {formatUpdatedTime(workflow.updatedAt)}
                    </p>
                  </Link>

                  <div className="mt-4 flex items-center gap-1 border-t border-neutral-800 pt-3">
                    <Link
                      to={`/workflows/${workflow.id}`}
                      className="rounded-lg bg-neutral-800 px-3 py-1.5 text-sm text-white hover:bg-neutral-700"
                    >
                      Open
                    </Link>

                    <button
                      onClick={() => handleDuplicateWorkflow(workflow.id)}
                      disabled={isBusy}
                      className="rounded-lg px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isDuplicating ? "Duplicating..." : "Duplicate"}
                    </button>

                    <button
                      onClick={() => handleDeleteWorkflow(workflow.id)}
                      disabled={isBusy}
                      className="ml-auto rounded-lg px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isDeleting ? "Deleting..." : "Delete"}
                    </button>
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