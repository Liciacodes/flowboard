import { describe, expect, it } from "vitest";

import {
  getWorkflowKey,
  getWorkflowPath,
  isSameWorkflowPath,
} from "./workflowUrl";

const id = "8b1f6c1e-4c3a-4d2b-9f1e-2a7c9d0e1f23";

describe("getWorkflowPath", () => {
  it("puts the name before the short id", () => {
    expect(getWorkflowPath({ id, name: "Customer Onboarding" })).toBe(
      "/workflows/customer-onboarding-8b1f6c1e",
    );
  });

  it("cleans up punctuation, accents and extra spaces", () => {
    expect(getWorkflowPath({ id, name: "  Café: sign-up & welcome!  " })).toBe(
      "/workflows/cafe-sign-up-welcome-8b1f6c1e",
    );
  });

  it("uses only the short id when the name has nothing usable", () => {
    expect(getWorkflowPath({ id, name: "" })).toBe("/workflows/8b1f6c1e");
    expect(getWorkflowPath({ id, name: "!!!" })).toBe("/workflows/8b1f6c1e");
  });

  it("shortens a very long name", () => {
    const path = getWorkflowPath({ id, name: "word ".repeat(40) });

    expect(path.length).toBeLessThanOrEqual("/workflows/".length + 60 + 9);
    expect(path.endsWith("-8b1f6c1e")).toBe(true);
    expect(path).not.toContain("--");
  });
});

describe("getWorkflowKey", () => {
  it("reads the short id from a named link", () => {
    expect(getWorkflowKey("customer-onboarding-8b1f6c1e")).toBe("8b1f6c1e");
  });

  it("reads the short id from a link with no name", () => {
    expect(getWorkflowKey("8b1f6c1e")).toBe("8b1f6c1e");
  });

  it("still accepts an old link that holds the full id", () => {
    expect(getWorkflowKey(id)).toBe("8b1f6c1e");
  });

  it("round-trips with getWorkflowPath", () => {
    const path = getWorkflowPath({ id, name: "Order 66 - retry 2" });

    expect(getWorkflowKey(path.replace("/workflows/", ""))).toBe("8b1f6c1e");
  });
});

describe("isSameWorkflowPath", () => {
  it("matches the same workflow under a different name", () => {
    expect(
      isSameWorkflowPath(
        "/workflows/customer-onboarding-8b1f6c1e",
        "/workflows/new-name-8b1f6c1e",
      ),
    ).toBe(true);

    expect(
      isSameWorkflowPath(`/workflows/${id}`, "/workflows/new-name-8b1f6c1e"),
    ).toBe(true);
  });

  it("does not match another workflow or another page", () => {
    expect(
      isSameWorkflowPath(
        "/workflows/customer-onboarding-8b1f6c1e",
        "/workflows/customer-onboarding-11112222",
      ),
    ).toBe(false);

    expect(
      isSameWorkflowPath("/workflows/customer-onboarding-8b1f6c1e", "/"),
    ).toBe(false);
  });
});
