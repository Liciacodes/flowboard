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

  const navigate = useNavigate()

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
      }
    };

    loadWorkflows();
  }, []);

  return (
    <main className="min-h-screen bg-neutral-950 p-8 text-white">
      <h1 className="text-2xl font-semibold">My Workflows</h1>


<button
    onClick={handleCreateWorkflow}
    className="rounded-lg bg-white px-4 py-2 mt-4 text-sm font-medium text-black hover:bg-neutral-200"
  >
    + New Workflow
  </button>


      <div className="mt-6 space-y-3">
        {workflows.map((workflow) => (
          <Link
            key={workflow.id}
            to={`/workflows/${workflow.id}`}
            className="block rounded-xl border border-neutral-800 bg-neutral-900 p-4 hover:bg-neutral-800"
          >
            <h2 className="font-medium">{workflow.name}</h2>

            <p className="mt-1 text-sm text-neutral-400">
              {workflow.status}
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}