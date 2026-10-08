# Flowboard

A visual workflow editor that validates, runs and explains every decision.

**Live demo:** https://flowboard-five-tau.vercel.app/

The first request can take up to a minute, because the free-tier backend sleeps when idle.

## What it does

- Build workflows on a canvas with Trigger, Action, Condition, Delay and End nodes
- Validate a workflow before running it (missing connections, unreachable ends, incomplete branches)
- Run a workflow and watch the path light up as it executes
- Every Condition explains its decision in plain words, for example: `status is "pending", which does not equal "active". Took NO.`
- Edit sample data to send the same workflow down a different path
- Manage workflows from a dashboard with previews, search, duplicate and delete
- Unsaved changes protection when you leave the editor or close the tab

## Try it

1. Open the live demo and click **Start from demo**
2. Click **Run workflow** and watch it take the YES path
3. Open **Sample data**, change it to `{"status": "pending"}` and run again to see the NO path

## Tech stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, React Flow, React Router, Motion
- **Backend:** Node.js, Express, Prisma 7
- **Database:** PostgreSQL (Supabase)
- **Hosting:** Vercel (frontend), Render (API)

## How it works

- `src/execution/executeWorkflow.ts` walks the graph from the Trigger, evaluates each Condition against the sample data, follows the matching branch and records a plain-language explanation for every step
- `src/execution/validateWorkflow.ts` checks the graph before every run, and a workflow with validation issues does not run
- Running state is shown through display-only copies of the nodes and edges, so highlighting a node never marks the workflow as having unsaved changes
- Delays are shortened to at most 1.5 seconds during test runs, so a demo does not wait for hours

## Project structure

```
flowboard/
├── src/
│   ├── components/
│   │   ├── editor/       FlowEditor, its toolbar and panels, and the run and unsaved-changes hooks
│   │   ├── nodes/        Node components built on a shared NodeShell
│   │   ├── workflows/    Dashboard page
│   │   └── ConfirmDialog.tsx
│   ├── data/             Demo workflow
│   ├── execution/        Validation and run engine, with their tests
│   └── types/
├── server/
│   ├── prisma/           Schema and migrations
│   └── src/server.ts     REST API
└── mcp-server/           MCP server that lets an AI assistant list, validate and run workflows
```

## Run it locally

```bash
git clone https://github.com/Liciacodes/flowboard.git
cd flowboard
npm install
npm run dev
```

In a second terminal, set up the API:

```bash
cd server
npm install
```

Create `server/.env`:

```
DATABASE_URL=your_postgres_connection_string
```

Then run:

```bash
npx prisma migrate deploy
npm run dev
```

The frontend runs on `http://localhost:5173` and the API on `http://localhost:5000`. To point the frontend at a different API, set `VITE_API_URL`.

## Tests

```bash
npm test
```

The validation and execution logic are covered by unit tests written with Vitest. `npm run lint` checks the code with ESLint.

## API

| Method | Route | Description |
| --- | --- | --- |
| GET | `/api/workflows` | List workflows |
| POST | `/api/workflows` | Create a workflow |
| GET | `/api/workflows/:id` | Get one workflow |
| PATCH | `/api/workflows/:id` | Update a workflow |
| DELETE | `/api/workflows/:id` | Delete a workflow |
| POST | `/api/workflows/:id/duplicate` | Duplicate a workflow |

## What I learned

- Keeping runtime state separate from saved state. Highlighting a running node must not count as an edit, so the editor renders display-only copies of the nodes and edges.
- Validating a graph. Checking that every branch of a workflow can reach an End node needed a depth-first search with a separate visited set for each path, otherwise valid branching workflows were reported as broken.
- Detecting unsaved changes by comparing normalised snapshots, with React Flow's selection and measurement fields stripped out first.
- Deployment details. A file name that differs only in letter case works on Windows but fails on Linux, and a free-tier server needs a clear loading state while it wakes up.

## Roadmap

- Run history saved to the database
- Undo and redo
- JSON export and import
- Workflow templates