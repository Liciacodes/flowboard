# Flowboard

Flowboard is a visual workflow builder for creating, connecting, validating, and simulating business processes on a free-roam canvas.

> 🚧 **Work in Progress**  
> Flowboard is currently under active development. Features and UI will continue to evolve as the project grows.

## Overview

Business processes can become difficult to understand when they are represented only through documents, checklists, or disconnected rules.

Flowboard provides a visual canvas where workflows can be built as connected steps, making branches, relationships, and execution paths easier to understand.

The core product flow is:

**Build → Configure → Validate → Simulate**

## Currently Implemented

- Interactive free-roam workflow canvas
- Draggable workflow nodes
- Trigger nodes
- Action nodes
- Condition nodes
- Interactive node connections
- YES / NO condition branching
- Pan and zoom controls
- Custom React Flow nodes

## Tech Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- React Flow

## Planned Features

Flowboard is being developed incrementally. Upcoming features include:

- Node selection
- Properties and configuration panel
- Delay and End node types
- Workflow validation
- Visual workflow simulation
- Undo and redo
- Keyboard interactions
- Improved canvas controls
- Workflow persistence
- Accessibility improvements
- Performance optimizations
- UI polish and interaction states

## How It Works

A workflow is represented as a graph made up of **nodes** and **edges**.

Nodes represent individual workflow steps such as:

- Trigger
- Action
- Condition
- Delay
- End

Edges represent the relationships between those steps.

Condition nodes can create multiple execution paths using named branches such as `yes` and `no`.

For example:

```text
              Trigger
                 │
                 ▼
               Action
                 │
                 ▼
             Condition
              /      \
            YES       NO
             │         │
             ▼         ▼
          Action     Action
```

As Flowboard develops, this graph will also power workflow validation and execution simulation.

## Getting Started

Clone the repository:

```bash
git clone https://github.com/Liciacodes/flowboard.git
```

Navigate into the project:

```bash
cd flowboard
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

## Project Status

Flowboard is currently in active development.

The current focus is building the core workflow editor and interaction model before expanding into validation, simulation, persistence, and more advanced workflow configuration.

## Author

Built by **LiciaCodes**.