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
};