import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { 
  ArrowLeft, 
  Save, 
  Play, 
  CheckCircle, 
  RotateCcw, 
  ZoomIn, 
  ZoomOut,
  AlignCenter,
  Upload
} from 'lucide-react';
import { NodePalette } from '../components/NodePalette';
import { WorkflowCanvas, WorkflowNode, WorkflowEdge } from '../components/WorkflowCanvas';
import { NodeInspector } from '../components/NodeInspector';

export function WorkflowEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';

  const [workflowName, setWorkflowName] = useState(isNew ? '新工作流' : '财务月结流程');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  
  const [nodes, setNodes] = useState<WorkflowNode[]>(
    isNew
      ? []
      : [
          { id: 'start-1', type: 'start', label: '开始', x: 100, y: 100 },
          { id: 'node-1', type: 'sql-agent', label: '财务数据抽取', x: 100, y: 200 },
          { id: 'node-2', type: 'stored-proc', label: '成本核算', x: 100, y: 320 },
          { id: 'node-3', type: 'python', label: '报表生成', x: 100, y: 440 },
          { id: 'cond-1', type: 'condition', label: '条件判断', x: 100, y: 560 },
          { id: 'node-4', type: 'sql-agent', label: '发送邮件', x: 50, y: 680 },
          { id: 'node-5', type: 'webhook', label: '告警通知', x: 250, y: 680 },
          { id: 'end-1', type: 'end', label: '结束', x: 100, y: 800 },
        ]
  );

  const [edges, setEdges] = useState<WorkflowEdge[]>(
    isNew
      ? []
      : [
          { from: 'start-1', to: 'node-1' },
          { from: 'node-1', to: 'node-2' },
          { from: 'node-2', to: 'node-3' },
          { from: 'node-3', to: 'cond-1' },
          { from: 'cond-1', to: 'node-4', condition: 'success' },
          { from: 'cond-1', to: 'node-5', condition: 'failed' },
          { from: 'node-4', to: 'end-1' },
          { from: 'node-5', to: 'end-1' },
        ]
  );

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  const handleSave = () => {
    console.log('Saving workflow:', { name: workflowName, nodes, edges });
    navigate(`/workflows/${id || '1'}`);
  };

  const handlePublish = () => {
    console.log('Publishing workflow');
    handleSave();
  };

  const handleValidate = () => {
    alert('工作流校验通过 ✓');
  };

  const handleRun = () => {
    alert('启动测试运行');
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Top Toolbar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to={isNew ? '/workflows' : `/workflows/${id}`} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          
          <input
            type="text"
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="text-lg font-semibold border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
          />

          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">Draft</span>
            <span className="text-sm text-gray-600">v1.0.0-draft</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleValidate}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
          >
            <CheckCircle className="w-4 h-4" />
            校验
          </button>

          <button
            onClick={handleRun}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
          >
            <Play className="w-4 h-4" />
            运行一次
          </button>

          <div className="w-px h-6 bg-gray-300"></div>

          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
          >
            <Save className="w-4 h-4" />
            保存
          </button>

          <button
            onClick={handlePublish}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            <Upload className="w-4 h-4" />
            发布
          </button>
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Palette */}
        <NodePalette />

        {/* Canvas */}
        <WorkflowCanvas
          nodes={nodes}
          edges={edges}
          onNodesChange={setNodes}
          onEdgesChange={setEdges}
          onNodeSelect={setSelectedNodeId}
          selectedNodeId={selectedNodeId}
        />

        {/* Right Inspector */}
        <NodeInspector
          selectedNode={selectedNode}
          onClose={() => setSelectedNodeId(null)}
          onUpdate={(config) => {
            if (selectedNodeId) {
              const updatedNodes = nodes.map((n) =>
                n.id === selectedNodeId ? { ...n, config } : n
              );
              setNodes(updatedNodes);
            }
          }}
        />
      </div>

      {/* Bottom Info Bar */}
      <div className="bg-gray-50 border-t border-gray-200 px-4 py-2 flex items-center justify-between text-sm text-gray-600">
        <div className="flex items-center gap-4">
          <span>{nodes.length} 个节点</span>
          <span>{edges.length} 条连线</span>
          {selectedNodeId && <span>已选择: {selectedNode?.label}</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs">拖拽节点到画布 • 点击节点配置属性</span>
        </div>
      </div>
    </div>
  );
}
