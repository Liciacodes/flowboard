import type { Edge, Node } from "@xyflow/react";

import type { Scenario } from "../types/workflow";

export const demoNodes: Node[] = [
  {
    id: "demo-trigger",
    type: "trigger",
    position: { x: 320, y: 0 },
    data: { label: "New customer signs up" },
  },
  {
    id: "demo-create",
    type: "action",
    position: { x: 320, y: 130 },
    data: { label: "Create account" },
  },
  {
    id: "demo-condition",
    type: "condition",
    position: { x: 320, y: 260 },
    data: {
      label: "Account active?",
      field: "status",
      operator: "equals",
      value: "active",
    },
  },
  {
    id: "demo-welcome",
    type: "action",
    position: { x: 40, y: 460 },
    data: { label: "Send welcome email" },
  },
  {
    id: "demo-complete",
    type: "end",
    position: { x: 40, y: 600 },
    data: { label: "Onboarding complete" },
  },
  {
    id: "demo-wait",
    type: "delay",
    position: { x: 560, y: 460 },
    data: { label: "Wait for activation", duration: "1", unit: "days" },
  },
  {
    id: "demo-reminder",
    type: "action",
    position: { x: 560, y: 600 },
    data: { label: "Send reminder email" },
  },
  {
    id: "demo-stop",
    type: "end",
    position: { x: 560, y: 740 },
    data: { label: "Follow up later" },
  },
];

export const demoEdges: Edge[] = [
  { id: "demo-e1", source: "demo-trigger", target: "demo-create" },
  { id: "demo-e2", source: "demo-create", target: "demo-condition" },
  {
    id: "demo-e3",
    source: "demo-condition",
    sourceHandle: "yes",
    target: "demo-welcome",
  },
  {
    id: "demo-e4",
    source: "demo-condition",
    sourceHandle: "no",
    target: "demo-wait",
  },
  { id: "demo-e5", source: "demo-welcome", target: "demo-complete" },
  { id: "demo-e6", source: "demo-wait", target: "demo-reminder" },
  { id: "demo-e7", source: "demo-reminder", target: "demo-stop" },
];

export const demoScenarios: Scenario[] = [
  {
    id: "demo-scenario-active",
    name: "Active customer",
    sampleData: { status: "active" },
    expectedEndId: "demo-complete",
  },
  {
    id: "demo-scenario-pending",
    name: "Pending customer",
    sampleData: { status: "pending" },
    expectedEndId: "demo-stop",
  },
];