import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Edge, Node } from "@xyflow/react";

import { demoEdges, demoNodes } from "../data/demoWorkflow";
import { executeWorkflow } from "./executeWorkflow";

const position = { x: 0, y: 0 };

const node = (
  id: string,
  type: string,
  data: Record<string, string> = {},
): Node => ({
  id,
  type,
  position,
  data: { label: id, ...data },
});

const edge = (source: string, target: string, sourceHandle?: string): Edge => ({
  id: `${source}-${target}`,
  source,
  target,
  sourceHandle,
});

const run = async (...args: Parameters<typeof executeWorkflow>) => {
  const result = executeWorkflow(...args);

  await vi.runAllTimersAsync();

  return result;
};

const conditionWorkflow = (data: Record<string, string>) => ({
  nodes: [
    node("trigger", "trigger"),
    node("check", "condition", data),
    node("yes-end", "end"),
    node("no-end", "end"),
  ],
  edges: [
    edge("trigger", "check"),
    edge("check", "yes-end", "yes"),
    edge("check", "no-end", "no"),
  ],
});

const runCondition = async (
  data: Record<string, string>,
  sampleData: Record<string, unknown>,
) => {
  const { nodes, edges } = conditionWorkflow(data);

  return run(nodes, edges, undefined, sampleData);
};

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("executeWorkflow with the demo workflow", () => {
  it("takes the YES path when the condition matches", async () => {
    const result = await run(demoNodes, demoEdges, undefined, {
      status: "active",
    });

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();

    expect(result.logs.map((log) => log.nodeId)).toEqual([
      "demo-trigger",
      "demo-create",
      "demo-condition",
      "demo-welcome",
      "demo-complete",
    ]);

    expect(result.logs[2].detail).toBe(
      'status is "active", which equals "active". Took YES.',
    );
  });

  it("takes the NO path when the condition does not match", async () => {
    const result = await run(demoNodes, demoEdges, undefined, {
      status: "pending",
    });

    expect(result.success).toBe(true);

    expect(result.logs.map((log) => log.nodeId)).toEqual([
      "demo-trigger",
      "demo-create",
      "demo-condition",
      "demo-wait",
      "demo-reminder",
      "demo-stop",
    ]);

    expect(result.logs[2].detail).toBe(
      'status is "pending", which does not equal "active". Took NO.',
    );

    expect(result.logs[3].detail).toBe(
      "Waited 1 days (shortened for the demo).",
    );
  });

  it("reports each node and edge as it runs", async () => {
    const onNodeStart = vi.fn();
    const onEdgeTaken = vi.fn();

    await run(
      demoNodes,
      demoEdges,
      onNodeStart,
      { status: "active" },
      onEdgeTaken,
    );

    expect(onNodeStart.mock.calls.map(([nodeId]) => nodeId)).toEqual([
      "demo-trigger",
      "demo-create",
      "demo-condition",
      "demo-welcome",
      "demo-complete",
    ]);

    expect(onEdgeTaken.mock.calls.map(([edgeId]) => edgeId)).toEqual([
      "demo-e1",
      "demo-e2",
      "demo-e3",
      "demo-e5",
    ]);
  });
});

describe("executeWorkflow conditions", () => {
  it("compares numbers for greater-than and less-than", async () => {
    const greater = await runCondition(
      { field: "total", operator: "greater-than", value: "100" },
      { total: 250 },
    );

    expect(greater.logs[1].detail).toBe(
      'total is "250", which is greater than "100". Took YES.',
    );

    const less = await runCondition(
      { field: "total", operator: "less-than", value: "100" },
      { total: 250 },
    );

    expect(less.logs[1].detail).toBe(
      'total is "250", which is not less than "100". Took NO.',
    );
  });

  it("fails when a numeric comparison is given text", async () => {
    const result = await runCondition(
      { field: "total", operator: "greater-than", value: "100" },
      { total: "lots" },
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('Condition "check" could not use "total"');
  });

  it("ignores letter case for contains", async () => {
    const result = await runCondition(
      { field: "email", operator: "contains", value: "@EXAMPLE.com" },
      { email: "ada@example.com" },
    );

    expect(result.logs.at(-1)?.nodeId).toBe("yes-end");
  });

  it("takes YES for not-equals when the values differ", async () => {
    const result = await runCondition(
      { field: "status", operator: "not-equals", value: "active" },
      { status: "pending" },
    );

    expect(result.logs[1].detail).toBe(
      'status is "pending", which is different from "active". Took YES.',
    );
  });

  it("fails when the field is missing from the sample data", async () => {
    const result = await runCondition(
      { field: "status", operator: "equals", value: "active" },
      {},
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('could not use "status"');
    expect(result.logs.map((log) => log.nodeId)).toEqual(["trigger"]);
  });

  it("fails when the chosen branch is not connected", async () => {
    const { nodes, edges } = conditionWorkflow({
      field: "status",
      operator: "equals",
      value: "active",
    });

    const result = await run(
      nodes,
      edges.filter((item) => item.sourceHandle !== "no"),
      undefined,
      { status: "pending" },
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe(
      'Condition "check" does not have a NO connection.',
    );
  });
});

describe("executeWorkflow delays", () => {
  const delayWorkflow = (data: Record<string, string>) => ({
    nodes: [
      node("trigger", "trigger"),
      node("pause", "delay", data),
      node("end", "end"),
    ],
    edges: [edge("trigger", "pause"), edge("pause", "end")],
  });

  it("shortens a long delay to 1.5 seconds", async () => {
    const { nodes, edges } = delayWorkflow({ duration: "3", unit: "days" });
    const startedAt = Date.now();

    const result = await run(nodes, edges);

    expect(result.success).toBe(true);

    // 3 nodes at 600ms, 2 edges at 300ms, plus the capped 1500ms delay.
    expect(Date.now() - startedAt).toBe(3 * 600 + 2 * 300 + 1500);
  });

  it("fails on an invalid duration or unit", async () => {
    const badDuration = delayWorkflow({ duration: "soon", unit: "hours" });
    const badUnit = delayWorkflow({ duration: "1", unit: "weeks" });

    for (const { nodes, edges } of [badDuration, badUnit]) {
      const result = await run(nodes, edges);

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'Delay "pause" has an invalid duration or unit.',
      );
    }
  });
});

describe("executeWorkflow with a broken graph", () => {
  it("fails without a trigger", async () => {
    const result = await run([node("end", "end")], []);

    expect(result).toEqual({
      success: false,
      logs: [],
      error: "Workflow does not have a Trigger node.",
    });
  });

  it("stops when the workflow loops back on itself", async () => {
    const result = await run(
      [node("trigger", "trigger"), node("a", "action"), node("b", "action")],
      [edge("trigger", "a"), edge("a", "b"), edge("b", "a")],
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("Workflow contains a cycle.");
  });

  it("fails when a node has no next step", async () => {
    const result = await run(
      [node("trigger", "trigger"), node("a", "action")],
      [edge("trigger", "a")],
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe('Node "a" does not have a next step.');
  });

  it("fails when an edge points to a missing node", async () => {
    const result = await run(
      [node("trigger", "trigger")],
      [edge("trigger", "ghost")],
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe(
      "Workflow contains an edge pointing to a missing node.",
    );
  });
});
