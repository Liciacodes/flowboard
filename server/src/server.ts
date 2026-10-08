import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Groq from "groq-sdk";
import { rateLimit } from "express-rate-limit";

import { PrismaClient } from "./generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

import { generateWorkflow, GenerationError } from "./generateWorkflow";
import { toFlowboard } from "./workflowSteps";

dotenv.config();

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
});

const SHORT_ID_PATTERN = /^[0-9a-f]{8}$/i;

const app = express();

// The host puts one proxy in front of the server, so this makes the rate
// limit below see each visitor's own address.
app.set("trust proxy", 1);

// The AI costs quota on every call, and the site is public.
const generateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    message:
      "You have generated a lot of workflows. Please try again in an hour.",
  },
});

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({
    message: "Flowboard API is running ",
  });
});

app.get("/api/workflows", async (_req, res) => {
  try {
    const workflows = await prisma.workflow.findMany({
      orderBy: {
        updatedAt: "desc",
      },
    });
    res.status(200).json({
      workflows,
    });
  } catch (error) {
    console.error("Failed to fetch workflow", error);

    res.status(500).json({
      message: "Failed to fetch workflow",
    });
  }
});

app.post("/api/workflows", async (req, res) => {
  try {
    const { name, nodes, edges, scenarios } = req.body;

    const workflow = await prisma.workflow.create({
      data: {
        name,
        nodes,
        edges,
        scenarios,
      },
    });

    res.status(201).json({
      message: "Workflow created succesfully",
      workflow,
    });
  } catch (error) {
    console.error("failed to create workflow", error);

    res.status(500).json({
      message: "Failed to create workflow",
    });
  }
});

app.post("/api/workflows/generate", generateLimiter, async (req, res) => {
  const description =
    typeof req.body?.description === "string"
      ? req.body.description.trim()
      : "";

  if (description.length < 10 || description.length > 500) {
    return res.status(400).json({
      message: "Describe the workflow in 10 to 500 characters.",
    });
  }

  if (!process.env.GROQ_API_KEY) {
    return res.status(503).json({
      message: "AI generation is not set up on this server.",
    });
  }

  try {
    const generated = await generateWorkflow(description);
    const { nodes, edges } = toFlowboard(generated.steps, generated.links);

    const workflow = await prisma.workflow.create({
      data: {
        name: generated.name,
        nodes,
        edges,
      },
    });

    res.status(201).json({
      message: "Workflow generated successfully",
      workflow,
    });
  } catch (error) {
    console.error("Failed to generate workflow", error);

    if (error instanceof GenerationError) {
      return res.status(422).json({
        message: error.message,
      });
    }

    if (error instanceof Groq.RateLimitError) {
      return res.status(429).json({
        message: "The AI is busy right now. Please try again in a minute.",
      });
    }

    res.status(502).json({
      message: "The AI could not be reached. Please try again.",
    });
  }
});

app.get("/api/workflows/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // The editor's links carry only the first 8 characters of the id.
    const workflow = SHORT_ID_PATTERN.test(id)
      ? await prisma.workflow.findFirst({
          where: {
            id: {
              startsWith: id.toLowerCase(),
            },
          },
        })
      : await prisma.workflow.findUnique({
          where: {
            id,
          },
        });

    if (!workflow) {
      return res.status(404).json({
        message: "Workflow not found",
      });
    }

    res.status(200).json({
      workflow,
    });
  } catch (error) {
    console.error("Failed to fetch workflow", error);

    res.status(500).json({
      message: "Failed to fetch workflow",
    });
  }
});

app.patch("/api/workflows/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, nodes, edges, scenarios, status } = req.body;

    const workflow = await prisma.workflow.update({
      where: {
        id,
      },
      data: {
        name,
        edges,
        nodes,
        scenarios,
        status,
      },
    });

    res.status(200).json({
      message: "Workflow updated successfully",
      workflow,
    });
  } catch (error) {
    console.error("failed to update workflow", error);

    res.status(500).json({
      message: "Failed to update workflow",
    });
  }
});

app.delete("/api/workflows/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const workflow = await prisma.workflow.delete({
      where: {
        id,
      },
    });

    res.json({
      message: "Workflow deleted successfully",
      workflow,
    });
  } catch (error) {
    console.error("Failed to delete workflow", error);

    res.status(500).json({
      message: 'Failed to delete workflow'
    })
  }
});

app.post("/api/workflows/:id/duplicate", async (req, res) => {
  try {
    const { id } = req.params;

    const workflow = await prisma.workflow.findUnique({
      where: {
        id,
      },
    });

    if (!workflow) {
      return res.status(404).json({
        message: "Workflow not found",
      });
    }

    const duplicatedWorkflow = await prisma.workflow.create({
      data: {
        name: `${workflow.name} Copy`,
        nodes: workflow.nodes ?? [],
        edges: workflow.edges ?? [],
        scenarios: workflow.scenarios ?? [],
        status: workflow.status,
      },
    });

    res.status(201).json({
      message: "Workflow duplicated successfully",
      workflow: duplicatedWorkflow,
    });
  } catch (error) {
    console.error("Failed to duplicate workflow", error);

    res.status(500).json({
      message: "Failed to duplicate workflow",
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
