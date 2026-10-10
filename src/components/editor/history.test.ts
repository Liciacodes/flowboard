import { describe, expect, it } from "vitest";

import { emptyHistory, record, redo, undo } from "./history";

describe("history", () => {
  it("has nothing to undo or redo when empty", () => {
    const history = emptyHistory<string>();

    expect(undo(history, "a")).toBeNull();
    expect(redo(history, "a")).toBeNull();
  });

  it("undoes back to the recorded state", () => {
    const history = record(emptyHistory<string>(), "a");

    expect(undo(history, "b")).toEqual({
      state: "a",
      history: { past: [], future: ["b"] },
    });
  });

  it("redoes a change that was undone", () => {
    const undone = undo(record(emptyHistory<string>(), "a"), "b");

    expect(redo(undone!.history, "a")).toEqual({
      state: "b",
      history: { past: ["a"], future: [] },
    });
  });

  it("steps back and forward through several changes in order", () => {
    let history = emptyHistory<string>();

    history = record(history, "a");
    history = record(history, "b");

    const first = undo(history, "c")!;
    const second = undo(first.history, first.state)!;

    expect([first.state, second.state]).toEqual(["b", "a"]);

    const replayed = redo(second.history, second.state)!;

    expect(replayed.state).toBe("b");
    expect(redo(replayed.history, replayed.state)!.state).toBe("c");
  });

  it("forgets the redo pile after a new change", () => {
    const undone = undo(record(emptyHistory<string>(), "a"), "b")!;
    const history = record(undone.history, "a2");

    expect(history.future).toEqual([]);
    expect(redo(history, "c")).toBeNull();
  });

  it("does not record the same state twice in a row", () => {
    const state = { name: "same" };
    const once = record(emptyHistory<object>(), state);

    expect(record(once, state)).toBe(once);
  });

  it("keeps only the most recent 100 states", () => {
    let history = emptyHistory<number>();

    for (let step = 0; step < 150; step += 1) {
      history = record(history, step);
    }

    expect(history.past).toHaveLength(100);
    expect(history.past[0]).toBe(50);
  });
});
