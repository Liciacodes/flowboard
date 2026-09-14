export type WorkFlowNodeType = 
  | "trigger"
  | "action"
  | "condition"
  | "delay"
  | "end";

  export type TriggerNodeData = {
  label: string;
};

export type ActionNodeData = {
    label: string;
}

export type ConditionNodeData = {
  label: string;
  field: string;
  operator: string;
  value: string;
};

export type DelayNodeData = {
  label: string;
  duration: string;
  unit: 'minutes'| "hours" | "days";
}

export type EndNodeData = {
  label: string;
}