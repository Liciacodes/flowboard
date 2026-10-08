import { describe, expect, it } from "vitest";
import type { Edge, Node } from "@xyflow/react";

import { demoEdges, demoNodes } from "../data/demoWorkflow";
import { validateWorkflow } from "./validateWorkflow";

const position = { x: 0, y: 0 };

const node = (id: string, type: string): Node => ({
  id,
  type,
  position,
  data: { label: id },
});

const edge = (source: string, target: string, sourceHandle?: string): Edge => ({
  id: `${source}-${target}`,
  source,
  target,
  sourceHandle,
});

const messages = (nodes: Node[], edges: Edge[]) =>
  validateWorkflow(nodes, edges).map((issue) => issue.message);

const NO_VALID_PATH =
  "The workflow does not have a valid path from Trigger to End";

describe("validateWorkflow", () => {
  it("passes the demo workflow", () => {
    expect(messages(demoNodes, demoEdges)).toEqual([]);
  });

  it("passes when two branches join again before the end", () => {
    const nodes = [
      node("trigger", "trigger"),
      node("check", "condition"),
      node("a", "action"),
      node("b", "action"),
      node("merge", "action"),
      node("end", "end"),
    ];

    const edges = [
      edge("trigger", "check"),
      edge("check", "a", "yes"),
      edge("check", "b", "no"),
      edge("a", "merge"),
      edge("b", "merge"),
      edge("merge", "end"),
    ];

    expect(messages(nodes, edges)).toEqual([]);
  });

  it("requires a trigger", () => {
    const nodes = [node("a", "action"), node("end", "end")];

    expect(messages(nodes, [edge("a", "end")])).toEqual([
      "Workflow must have a trigger",
    ]);
  });

  it("requires an end", () => {
    const nodes = [node("trigger", "trigger"), node("a", "action")];
    const edges = [edge("trigger", "a")];

    expect(messages(nodes, edges)).toEqual([
      "Workflow must have an end",
      '"a" must be connected to another node',
    ]);
  });

  it("reports a trigger and an end that are not connected", () => {
    const nodes = [node("trigger", "trigger"), node("end", "end")];

    expect(messages(nodes, [])).toEqual([
      '"trigger" must be connected to a node',
      '"end" must have an incoming connection',
      NO_VALID_PATH,
    ]);
  });

  it("reports an action or delay with no next step", () => {
    const nodes = [
      node("trigger", "trigger"),
      node("check", "condition"),
      node("pause", "delay"),
      node("end", "end"),
    ];

    const edges = [
      edge("trigger", "check"),
      edge("check", "end", "yes"),
      edge("check", "pause", "no"),
    ];

    expect(messages(nodes, edges)).toEqual([
      '"pause" must be connected to another node',
      NO_VALID_PATH,
    ]);
  });

  it("reports each condition branch that is not connected", () => {
    const nodes = [
      node("trigger", "trigger"),
      node("check", "condition"),
      node("end", "end"),
    ];

    const onlyYes = [edge("trigger", "check"), edge("check", "end", "yes")];
    const neither = [edge("trigger", "check")];

    expect(messages(nodes, onlyYes)).toEqual([
      '"check" NO branch must be connected',
    ]);

    expect(messages(nodes, neither)).toEqual([
      '"end" must have an incoming connection',
      '"check" YES branch must be connected',
      '"check" NO branch must be connected',
      NO_VALID_PATH,
    ]);
  });

  it("reports a workflow that loops back on itself", () => {
    const nodes = [
      node("trigger", "trigger"),
      node("a", "action"),
      node("b", "action"),
      node("end", "end"),
    ];

    const edges = [
      edge("trigger", "a"),
      edge("a", "b"),
      edge("b", "a"),
      edge("b", "end"),
    ];

    expect(messages(nodes, edges)).toEqual([NO_VALID_PATH]);
  });
});
