// The simple step-and-link format an AI writes, with its checks and layout.
// Kept in step with mcp-server/src/workflow.ts, which holds the same logic.

export type StepInput = {
  id: string;
  type: "trigger" | "action" | "delay" | "condition" | "end";
  label: string;
  duration?: string;
  unit?: "seconds" | "minutes" | "hours" | "days";
  field?: string;
  operator?: "equals" | "not-equals" | "contains" | "greater-than" | "less-than";
  value?: string;
};

export type LinkInput = {
  from: string;
  to: string;
  branch?: "yes" | "no";
};

export type FlowNode = {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, string>;
};

export type FlowEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
};

const UNITS = ["seconds", "minutes", "hours", "days"];
const OPERATORS = ["equals", "not-equals", "contains", "greater-than", "less-than"];

export function validate(steps: StepInput[], links: LinkInput[]): string[] {
  const issues: string[] = [];
  const ids = new Set<string>();

  for (const step of steps) {
    if (ids.has(step.id)) {
      issues.push(`Two steps share the id "${step.id}". Every id must be unique.`);
    }
    ids.add(step.id);
  }

  for (const link of links) {
    if (!ids.has(link.from)) {
      issues.push(`A link starts at "${link.from}", which is not a step.`);
    }
    if (!ids.has(link.to)) {
      issues.push(`A link points to "${link.to}", which is not a step.`);
    }
  }

  const triggers = steps.filter((s) => s.type === "trigger");
  const ends = steps.filter((s) => s.type === "end");

  if (triggers.length !== 1) {
    issues.push(`A workflow needs exactly one trigger. This one has ${triggers.length}.`);
  }

  if (ends.length === 0) {
    issues.push("A workflow needs at least one end step.");
  }

  for (const step of steps) {
    const outgoing = links.filter((l) => l.from === step.id);
    const incoming = links.filter((l) => l.to === step.id);

    if (step.type === "end" && incoming.length === 0) {
      issues.push(`End "${step.label}" has no incoming link.`);
    }

    if (step.type === "end" && outgoing.length > 0) {
      issues.push(`End "${step.label}" cannot have outgoing links.`);
    }

    if (step.type === "trigger" && incoming.length > 0) {
      issues.push(`Trigger "${step.label}" cannot have incoming links.`);
    }

    if (["trigger", "action", "delay"].includes(step.type)) {
      if (outgoing.length !== 1) {
        issues.push(`"${step.label}" needs exactly one outgoing link, but has ${outgoing.length}.`);
      }
      if (outgoing.some((l) => l.branch)) {
        issues.push(`"${step.label}" is not a condition, so its link must not have a branch.`);
      }
    }

    if (step.type === "delay") {
      const duration = Number(step.duration);
      if (!step.duration || !Number.isFinite(duration) || duration < 0) {
        issues.push(`Delay "${step.label}" needs a duration that is a number, for example "2".`);
      }
      if (!step.unit || !UNITS.includes(step.unit)) {
        issues.push(`Delay "${step.label}" needs a unit: ${UNITS.join(", ")}.`);
      }
    }

    if (step.type === "condition") {
      if (!step.field) {
        issues.push(`Condition "${step.label}" needs a field to check.`);
      }
      if (!step.operator || !OPERATORS.includes(step.operator)) {
        issues.push(`Condition "${step.label}" needs an operator: ${OPERATORS.join(", ")}.`);
      }
      if (step.value === undefined) {
        issues.push(`Condition "${step.label}" needs a value to compare with.`);
      }
      const yes = outgoing.filter((l) => l.branch === "yes").length;
      const no = outgoing.filter((l) => l.branch === "no").length;
      if (yes !== 1) {
        issues.push(`Condition "${step.label}" needs exactly one link with branch "yes".`);
      }
      if (no !== 1) {
        issues.push(`Condition "${step.label}" needs exactly one link with branch "no".`);
      }
      if (outgoing.length !== yes + no) {
        issues.push(`Every link leaving condition "${step.label}" must have a branch of "yes" or "no".`);
      }
    }
  }

  if (issues.length === 0 && triggers.length === 1) {
    const next = (id: string) => links.filter((l) => l.from === id).map((l) => l.to);
    const reachesEnd = (id: string, seen: Set<string>): boolean => {
      if (seen.has(id)) return false;
      const step = steps.find((s) => s.id === id);
      if (step?.type === "end") return true;
      const nextSeen = new Set(seen).add(id);
      const targets = next(id);
      return targets.length > 0 && targets.every((t) => reachesEnd(t, nextSeen));
    };
    if (!reachesEnd(triggers[0].id, new Set())) {
      issues.push("Not every path from the trigger reaches an end step. Check for loops or dead ends.");
    }
  }

  return issues;
}

export function toFlowboard(steps: StepInput[], links: LinkInput[]) {
  const trigger = steps.find((s) => s.type === "trigger")!;
  const level = new Map<string, number>([[trigger.id, 0]]);
  const queue = [trigger.id];

  while (queue.length > 0) {
    const id = queue.shift()!;
    for (const link of links.filter((l) => l.from === id)) {
      const proposed = (level.get(id) ?? 0) + 1;
      if (!level.has(link.to) || proposed > (level.get(link.to) ?? 0)) {
        level.set(link.to, proposed);
        queue.push(link.to);
      }
    }
  }

  const rows = new Map<number, string[]>();
  for (const step of steps) {
    const l = level.get(step.id) ?? 0;
    rows.set(l, [...(rows.get(l) ?? []), step.id]);
  }

  const nodes: FlowNode[] = steps.map((step) => {
    const l = level.get(step.id) ?? 0;
    const row = rows.get(l) ?? [];
    const index = row.indexOf(step.id);
    const x = 320 + (index - (row.length - 1) / 2) * 260;

    const data: Record<string, string> = { label: step.label };
    if (step.type === "delay") {
      data.duration = step.duration ?? "1";
      data.unit = step.unit ?? "days";
    }
    if (step.type === "condition") {
      data.field = step.field ?? "";
      data.operator = step.operator ?? "equals";
      data.value = step.value ?? "";
    }

    return { id: step.id, type: step.type, position: { x, y: l * 140 }, data };
  });

  const edges: FlowEdge[] = links.map((link, i) => {
    const edge: FlowEdge = { id: `e${i + 1}`, source: link.from, target: link.to };
    if (link.branch) edge.sourceHandle = link.branch;
    return edge;
  });

  return { nodes, edges };
}
