import { useState } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { Database, Play, GitBranch, Clock, Zap, Globe, CheckCircle } from 'lucide-react';

export interface WorkflowNode {
  id: string;
  type: string;
  label: string;
  x: number;
  y: number;
  config?: any;
}

export interface WorkflowEdge {
  from: string;
  to: string;
  condition?: string;
}

interface WorkflowCanvasProps {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  onNodesChange: (nodes: WorkflowNode[]) => void;
  onEdgesChange: (edges: WorkflowEdge[]) => void;
  onNodeSelect: (nodeId: string | null) => void;
  selectedNodeId: string | null;
}

const NodeComponent = ({ node, onSelect, isSelected }: { node: WorkflowNode; onSelect: () => void; isSelected: boolean }) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'node',
    item: { id: node.id, x: node.x, y: node.y },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const getNodeColor = () => {
    switch (node.type) {
      case 'start': return 'bg-green-100 border-green-500 text-green-700';
      case 'end': return 'bg-gray-200 border-gray-500 text-gray-700';
      case 'sql-agent': return 'bg-blue-100 border-blue-500 text-blue-700';
      case 'stored-proc': return 'bg-blue-100 border-blue-500 text-blue-700';
      case 'python': return 'bg-purple-100 border-purple-500 text-purple-700';
      case 'condition': return 'bg-yellow-100 border-yellow-500 text-yellow-700';
      case 'parallel': return 'bg-indigo-100 border-indigo-500 text-indigo-700';
      case 'delay': return 'bg-orange-100 border-orange-500 text-orange-700';
      case 'webhook': return 'bg-pink-100 border-pink-500 text-pink-700';
      default: return 'bg-gray-100 border-gray-500 text-gray-700';
    }
  };

  const getIcon = () => {
    switch (node.type) {
      case 'start': return <Play className="w-4 h-4" />;
      case 'end': return <CheckCircle className="w-4 h-4" />;
      case 'sql-agent':
      case 'stored-proc': return <Database className="w-4 h-4" />;
      case 'condition': return <GitBranch className="w-4 h-4" />;
      case 'delay': return <Clock className="w-4 h-4" />;
      case 'webhook': return <Globe className="w-4 h-4" />;
      default: return <Zap className="w-4 h-4" />;
    }
  };

  return (
    <div
      ref={drag}
      onClick={onSelect}
      className={`absolute cursor-move border-2 rounded-lg p-3 min-w-[140px] transition-all ${getNodeColor()} ${
        isSelected ? 'ring-4 ring-blue-300 shadow-lg scale-105' : 'shadow'
      } ${isDragging ? 'opacity-50' : ''}`}
      style={{ left: node.x, top: node.y }}
    >
      <div className="flex items-center gap-2">
        {getIcon()}
        <div className="text-sm font-medium truncate">{node.label}</div>
      </div>
      {node.config?.status === 'invalid' && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
      )}
    </div>
  );
};

export function WorkflowCanvas({ nodes, edges, onNodesChange, onEdgesChange, onNodeSelect, selectedNodeId }: WorkflowCanvasProps) {
  const [scale, setScale] = useState(1);

  const [, drop] = useDrop({
    accept: ['palette-item', 'node'],
    drop: (item: any, monitor) => {
      const offset = monitor.getClientOffset();
      const canvasRect = document.getElementById('canvas')?.getBoundingClientRect();
      
      if (offset && canvasRect) {
        const x = (offset.x - canvasRect.left) / scale - 70;
        const y = (offset.y - canvasRect.top) / scale - 30;

        if (item.nodeType) {
          // New node from palette
          const newNode: WorkflowNode = {
            id: `node-${Date.now()}`,
            type: item.nodeType,
            label: item.label,
            x,
            y,
          };
          onNodesChange([...nodes, newNode]);
        } else if (item.id) {
          // Existing node being moved
          const updatedNodes = nodes.map((node) =>
            node.id === item.id ? { ...node, x, y } : node
          );
          onNodesChange(updatedNodes);
        }
      }
    },
  });

  const renderEdges = () => {
    return edges.map((edge, index) => {
      const fromNode = nodes.find((n) => n.id === edge.from);
      const toNode = nodes.find((n) => n.id === edge.to);
      
      if (!fromNode || !toNode) return null;

      const x1 = fromNode.x + 70;
      const y1 = fromNode.y + 30;
      const x2 = toNode.x + 70;
      const y2 = toNode.y + 30;

      return (
        <line
          key={index}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="#94a3b8"
          strokeWidth="2"
          markerEnd="url(#arrowhead)"
        />
      );
    });
  };

  return (
    <div className="flex-1 bg-gray-50 relative overflow-hidden">
      <div className="absolute top-4 right-4 flex gap-2 bg-white rounded-lg shadow-lg p-2 z-10">
        <button
          onClick={() => setScale(Math.max(0.5, scale - 0.1))}
          className="px-3 py-1 hover:bg-gray-100 rounded"
        >
          −
        </button>
        <span className="px-3 py-1 text-sm">{Math.round(scale * 100)}%</span>
        <button
          onClick={() => setScale(Math.min(2, scale + 0.1))}
          className="px-3 py-1 hover:bg-gray-100 rounded"
        >
          +
        </button>
        <button
          onClick={() => setScale(1)}
          className="px-3 py-1 hover:bg-gray-100 rounded text-sm"
        >
          重置
        </button>
      </div>

      <div
        id="canvas"
        ref={drop}
        className="w-full h-full overflow-auto p-8"
        style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}
      >
        <div className="relative min-w-[2000px] min-h-[1500px]">
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="10"
                refX="8"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 10 3, 0 6" fill="#94a3b8" />
              </marker>
            </defs>
            {renderEdges()}
          </svg>

          {nodes.map((node) => (
            <NodeComponent
              key={node.id}
              node={node}
              onSelect={() => onNodeSelect(node.id)}
              isSelected={selectedNodeId === node.id}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
