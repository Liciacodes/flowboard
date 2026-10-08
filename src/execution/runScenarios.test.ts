import { describe, expect, it } from "vitest";

import { demoEdges, demoNodes } from "../data/demoWorkflow";
import type { Scenario } from "../types/workflow";
import { getBranchCoverage, runScenarios } from "./runScenarios";

const scenario = (
  id: string,
  sampleData: Record<string, unknown>,
  expectedEndId: string | null,
): Scenario => ({
  id,
  name: id,
  sampleData,
  expectedEndId,
});

const active = scenario("active", { status: "active" }, "demo-complete");
const pending = scenario("pending", { status: "pending" }, "demo-stop");

describe("runScenarios with the demo workflow", () => {
  it("passes when each scenario reaches its expected End", async () => {
    const results = await runScenarios(demoNodes, demoEdges, [active, pending]);

    expect(results.map((result) => result.status)).toEqual([
      "passed",
      "passed",
    ]);

    expect(results[0].message).toBe(
      'Ended at "Onboarding complete", as expected.',
    );

    expect(results[1].takenEdgeIds).toEqual([
      "demo-e1",
      "demo-e2",
      "demo-e4",
      "demo-e6",
      "demo-e7",
    ]);
  });

  it("fails when a scenario reaches a different End", async () => {
    const [result] = await runScenarios(demoNodes, demoEdges, [
      scenario("wrong", { status: "pending" }, "demo-complete"),
    ]);

    expect(result.status).toBe("failed");
    expect(result.message).toBe(
      'Expected to end at "Onboarding complete" but ended at "Follow up later".',
    );
  });

  it("passes at any End when none is expected", async () => {
    const [result] = await runScenarios(demoNodes, demoEdges, [
      scenario("any", { status: "pending" }, null),
    ]);

    expect(result.status).toBe("passed");
    expect(result.message).toBe('Ended at "Follow up later".');
  });

  it("fails when the expected End has been deleted", async () => {
    const [result] = await runScenarios(demoNodes, demoEdges, [
      scenario("gone", { status: "active" }, "deleted-end"),
    ]);

    expect(result.status).toBe("failed");
    expect(result.message).toBe(
      "The expected End no longer exists in this workflow.",
    );
  });

  it("reports an error when the run itself fails", async () => {
    const [result] = await runScenarios(demoNodes, demoEdges, [
      scenario("empty", {}, "demo-complete"),
    ]);

    expect(result.status).toBe("error");
    expect(result.message).toContain('could not use "status"');
  });
});

describe("getBranchCoverage", () => {
  it("names the branch that no scenario takes", async () => {
    const results = await runScenarios(demoNodes, demoEdges, [active]);

    expect(getBranchCoverage(demoNodes, demoEdges, results)).toEqual({
      total: 2,
      covered: 1,
      uncoveredEdgeIds: ["demo-e4"],
      uncoveredBranches: ['"Account active?" NO is never taken.'],
    });
  });

  it("is complete when the scenarios take every branch", async () => {
    const results = await runScenarios(demoNodes, demoEdges, [active, pending]);

    expect(getBranchCoverage(demoNodes, demoEdges, results)).toEqual({
      total: 2,
      covered: 2,
      uncoveredEdgeIds: [],
      uncoveredBranches: [],
    });
  });

  it("counts nothing as covered before any scenario runs", () => {
    const coverage = getBranchCoverage(demoNodes, demoEdges, []);

    expect(coverage.covered).toBe(0);
    expect(coverage.uncoveredEdgeIds).toEqual(["demo-e3", "demo-e4"]);
  });
});
