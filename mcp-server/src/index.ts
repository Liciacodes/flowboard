import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { run, toFlowboard, validate } from "./workflow.js";

const API_URL = process.env.FLOWBOARD_API_URL ?? "http://localhost:5000";

type SavedWorkflow = {
  id: string;
  name: string;
  status: string;
  nodes: unknown;
  updatedAt: string;
};

async function api(path: string, body?: unknown) {
  const response = await fetch(`${API_URL}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) {
    throw new Error(`Flowboard API returned ${response.status}`);
  }

  return response.json();
}

function text(value: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
  };
}

function failure(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown error";
  return {
    isError: true,
    content: [{ type: "text" as const, text: `Could not reach Flowboard: ${message}` }],
  };
}

const server = new McpServer({
  name: "flowboard",
  version: "1.0.0",
});

server.registerTool(
  "list_workflows",
  {
    title: "List workflows",
    description:
      "Lists every saved workflow in Flowboard, newest first. Returns each workflow's id, name, status and how many steps it has. Use this first to find a workflow's id before asking for details.",
    inputSchema: {},
  },
  async () => {
    try {
      const data = await api("/api/workflows");

      const workflows = data.workflows.map((workflow: SavedWorkflow) => ({
        id: workflow.id,
        name: workflow.name,
        status: workflow.status,
        steps: Array.isArray(workflow.nodes) ? workflow.nodes.length : 0,
        updatedAt: workflow.updatedAt,
      }));

      return text({ count: workflows.length, workflows });
    } catch (error) {
      return failure(error);
    }
  }
);

server.registerTool(
  "get_workflow",
  {
    title: "Get a workflow",
    description:
      "Gets one Flowboard workflow by id, including all of its steps (nodes) and the connections between them (edges). Use list_workflows first if you do not know the id.",
    inputSchema: {
      id: z.string().describe("The workflow id from list_workflows"),
    },
  },
  async ({ id }) => {
    try {
      const data = await api(`/api/workflows/${encodeURIComponent(id)}`);
      return text(data.workflow);
    } catch (error) {
      return failure(error);
    }
  }
);

const stepSchema = z.object({
  id: z.string().describe("A short unique id you choose, like 'signup' or 'check'"),
  type: z.enum(["trigger", "action", "delay", "condition", "end"]),
  label: z.string().describe("What the step is called, like 'Send welcome email'"),
  duration: z.string().optional().describe("Delay only: a number as text, like '2'"),
  unit: z.enum(["seconds", "minutes", "hours", "days"]).optional().describe("Delay only"),
  field: z.string().optional().describe("Condition only: the data field to check, like 'status'"),
  operator: z
    .enum(["equals", "not-equals", "contains", "greater-than", "less-than"])
    .optional()
    .describe("Condition only"),
  value: z.string().optional().describe("Condition only: the value to compare with"),
});

const linkSchema = z.object({
  from: z.string().describe("Id of the step the link leaves"),
  to: z.string().describe("Id of the step the link enters"),
  branch: z
    .enum(["yes", "no"])
    .optional()
    .describe("Required for links leaving a condition step, and not allowed for any other step"),
});

server.registerTool(
  "create_workflow",
  {
    title: "Create a workflow",
    description:
      "Creates and saves a new Flowboard workflow as a draft. Give it the steps and the links between them. The layout is done for you. A workflow needs exactly one trigger step at the start and at least one end step. Every step except end needs one outgoing link, and a condition step needs one link with branch yes and one with branch no. If something is wrong, nothing is saved and you get a list of problems to fix, so read it and call this tool again with corrections.",
    inputSchema: {
      name: z.string().min(1).describe("The workflow's name"),
      steps: z.array(stepSchema).min(2),
      links: z.array(linkSchema).min(1),
    },
  },
  async ({ name, steps, links }) => {
    const issues = validate(steps, links);

    if (issues.length > 0) {
      return {
        isError: true,
        content: [
          {
            type: "text" as const,
            text: `Nothing was saved. Fix these problems and try again:\n- ${issues.join("\n- ")}`,
          },
        ],
      };
    }

    try {
      const { nodes, edges } = toFlowboard(steps, links);
      const data = await api("/api/workflows", { name, nodes, edges });
      return text({ saved: true, id: data.workflow.id, name: data.workflow.name, steps: nodes.length });
    } catch (error) {
      return failure(error);
    }
  }
);

server.registerTool(
  "run_workflow",
  {
    title: "Run a workflow",
    description:
      "Runs a saved Flowboard workflow and returns a log explaining what each step did and which branch every condition took. Pass sampleData with the fields that the workflow's conditions check, for example {\"status\": \"active\"}. Waits are skipped. This does not change anything in the database. If a condition needs a field that is missing from sampleData, the run fails and says which field to add.",
    inputSchema: {
      id: z.string().describe("The workflow id from list_workflows or create_workflow"),
      sampleData: z
        .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
        .optional()
        .describe("Data the conditions will check"),
    },
  },
  async ({ id, sampleData }) => {
    try {
      const data = await api(`/api/workflows/${encodeURIComponent(id)}`);
      const workflow = data.workflow;
      return text({
        workflow: workflow.name,
        ...run(workflow.nodes ?? [], workflow.edges ?? [], sampleData ?? {}),
      });
    } catch (error) {
      return failure(error);
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Flowboard MCP server running");
}

main();