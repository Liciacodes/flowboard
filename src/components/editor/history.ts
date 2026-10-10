export type History<T> = {
  past: T[];
  future: T[];
};

const HISTORY_LIMIT = 100;

export const emptyHistory = <T>(): History<T> => ({
  past: [],
  future: [],
});

// Call this with the current state just before changing it.
export const record = <T>(history: History<T>, current: T): History<T> => {
  // Two events from one change, such as deleting a node and its edges, would
  // otherwise record the same state twice.
  if (history.past[history.past.length - 1] === current) {
    return history;
  }

  return {
    past: [...history.past, current].slice(-HISTORY_LIMIT),
    future: [],
  };
};

export const undo = <T>(history: History<T>, current: T) => {
  if (history.past.length === 0) {
    return null;
  }

  return {
    state: history.past[history.past.length - 1],
    history: {
      past: history.past.slice(0, -1),
      future: [current, ...history.future],
    },
  };
};

export const redo = <T>(history: History<T>, current: T) => {
  if (history.future.length === 0) {
    return null;
  }

  return {
    state: history.future[0],
    history: {
      past: [...history.past, current],
      future: history.future.slice(1),
    },
  };
};
