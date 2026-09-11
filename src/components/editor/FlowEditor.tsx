import {
  addEdge,
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  type Connection,
  type Edge,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";

import TriggerNode from "../nodes/TriggerNode";
import ActionNode from "../nodes/ActionNode";
import ConditionNode from "../nodes/ConditionNode";
import { useState } from "react";
import PropertiesPanel from "./PropertiesPanel";

const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode
};

const initialNodes = [
  {
    id: "1",
    type: "trigger",
    position: { x: 250, y: 150 },
    data: {
      label: "New event",
    },
  },
  {
    id: "2",
    type: "action",
    position: { x: 250, y: 300 },
    data: {
      label: "Send email",
    },
  },
  {
  id: "3",
  type: "condition",
  position: { x: 250, y: 450 },
  data: {
    label: "Condition met?",
  },
  
},
 {
    id: "4",
    type: "action",
    position: { x: 80, y: 650 },
    data: {
      label: "Send message",
    },
  },
  {
    id: "5",
    type: "action",
    position: { x: 420, y: 650 },
    data: {
      label: "Notify team",
    },
},
];

const initialEdges: Edge[] = [];

export default function FlowEditor() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const onConnect = (connection: Connection) => {
   
    setEdges((currentEdges) => addEdge(connection, currentEdges));
  };


  const selectedNode = nodes.find(
  (node) => node.id === selectedNodeId
);
  return (
    <div className="flow-editor ">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        onNodeClick={(_, node) => {
            setSelectedNodeId(node.id)
        }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
        />

        <Controls />
      </ReactFlow>
   <PropertiesPanel selectedNode={selectedNode} />
    </div>
  );
}