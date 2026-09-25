import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import { PrismaClient } from "./generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

dotenv.config();

const adapter = new PrismaPg(
    {
     connectionString: process.env.DATABASE_URL!
     }
)

const prisma = new PrismaClient({
  adapter,
});

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({
    message: "Flowboard API is running ",
  });
});

app.post('/api/workflows', async(req, res) => {
    try {
        const {name, nodes, edges} = req.body;

    const workflow = await prisma.workflow.create({
        data: {
            name, 
            nodes, 
            edges
        }
    })


    res.status(201).json({
        message: 'Workflow created succesfully',
        workflow,
    })

    }
catch (error) {
  console.error("failed to create workflow", error);

  res.status(500).json({
    message: "Failed to create workflow",
  });
}

  
    
})

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
