import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { 
  ArrowLeft, 
  Save, 
  Play, 
  CheckCircle, 
  Trash2,
  Link2,
  Upload,
} from 'lucide-react';
import { NodePalette } from '../components/NodePalette';
import { WorkflowCanvas, WorkflowNode, WorkflowEdge } from '../components/WorkflowCanvas';
import { NodeInspector } from '../components/NodeInspector';
import {
  publishWorkflow,
  saveWorkflowDraft,
  triggerWorkflowRun,
  validateWorkflowGraph,
  type WorkflowValidationIssue,
} from '../services/workflowBackend';

export function WorkflowEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';

  const [workflowName, setWorkflowName] = useState(isNew ? '新工作流' : '财务月结流程');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [connectMode, setConnectMode] = useState(false);
  const [validationIssues, setValidationIssues] = useState<WorkflowValidationIssue[]>([]);
  const [operationMessage, setOperationMessage] = useState<string>('');
  
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
          { id: 'edge-1', from: 'start-1', to: 'node-1' },
          { id: 'edge-2', from: 'node-1', to: 'node-2' },
          { id: 'edge-3', from: 'node-2', to: 'node-3' },
          { id: 'edge-4', from: 'node-3', to: 'cond-1' },
          { id: 'edge-5', from: 'cond-1', to: 'node-4', condition: 'success' },
          { id: 'edge-6', from: 'cond-1', to: 'node-5', condition: 'failed' },
          { id: 'edge-7', from: 'node-4', to: 'end-1' },
          { id: 'edge-8', from: 'node-5', to: 'end-1' },
        ]
  );

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  const handleNodeDelete = () => {
    if (!selectedNodeId) return;
    setNodes((prev) => prev.filter((node) => node.id !== selectedNodeId));
    setEdges((prev) => prev.filter((edge) => edge.from !== selectedNodeId && edge.to !== selectedNodeId));
    setSelectedNodeId(null);
  };

  const handleEdgeDelete = () => {
    if (!selectedEdgeId) return;
    setEdges((prev) => prev.filter((edge) => edge.id !== selectedEdgeId));
    setSelectedEdgeId(null);
  };

  const handleNodeConnect = (fromNodeId: string, toNodeId: string) => {
    const hasDuplicated = edges.some((edge) => edge.from === fromNodeId && edge.to === toNodeId);
    if (hasDuplicated) return;
    setEdges((prev) => [...prev, { id: `edge-${Date.now()}`, from: fromNodeId, to: toNodeId }]);
  };

  const applyValidationState = (issues: WorkflowValidationIssue[]) => {
    setValidationIssues(issues);
    const issueNodeIds = issues.map((issue) => issue.nodeId).filter(Boolean);

    setNodes((prev) =>
      prev.map((node) => ({
        ...node,
        config: {
          ...(node.config ?? {}),
          status: issueNodeIds.includes(node.id) ? 'invalid' : 'valid',
        },
      })),
    );
  };

  const handleSave = async () => {
    try {
      await saveWorkflowDraft({
        workflowId: id || 'new-workflow',
        workflowName,
        nodes,
        edges,
      });
      setOperationMessage('草稿已保存。');
      navigate(`/workflows/${id || '1'}`);
    } catch (error) {
      setOperationMessage(`保存失败：${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  const handlePublish = async () => {
    try {
      const result = await publishWorkflow({ workflowId: id || 'new-workflow', workflowName, nodes, edges });
      if (!result.ok) {
        applyValidationState(result.issues);
        setOperationMessage('发布失败：请先修复结构化校验问题。');
        return;
      }
      setOperationMessage(`发布成功，版本 ${result.publishedVersion}`);
      await handleSave();
    } catch (error) {
      setOperationMessage(`发布失败：${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  const handleValidate = async () => {
    try {
      const issues = await validateWorkflowGraph(nodes, edges);
      applyValidationState(issues);
      setOperationMessage(issues.length === 0 ? '校验通过。' : '校验未通过，请修复问题。');
    } catch (error) {
      setOperationMessage(`校验失败：${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  const handleRun = async () => {
    try {
      const result = await triggerWorkflowRun({ workflowId: id || 'new-workflow', workflowName, nodes, edges });
      if (!result.ok) {
        applyValidationState(result.issues);
        setOperationMessage(`测试运行失败（${result.runId}）。`);
        return;
      }
      setOperationMessage(`测试运行已触发：${result.runId}`);
    } catch (error) {
      setOperationMessage(`测试运行失败：${error instanceof Error ? error.message : '未知错误'}`);
    }
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
            onClick={() => {
              setConnectMode((prev) => !prev);
              setSelectedEdgeId(null);
            }}
            className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm ${
              connectMode ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Link2 className="w-4 h-4" />
            {connectMode ? '连线模式中' : '创建连线'}
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

          <button
            onClick={selectedNodeId ? handleNodeDelete : handleEdgeDelete}
            disabled={!selectedNodeId && !selectedEdgeId}
            className="flex items-center gap-2 px-3 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" />
            删除{selectedNodeId ? '节点' : '连线'}
          </button>
        </div>
      </div>

      {operationMessage && (
        <div className="px-4 py-2 text-sm border-b border-blue-100 bg-blue-50 text-blue-700">{operationMessage}</div>
      )}

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
          onNodeConnect={handleNodeConnect}
          selectedNodeId={selectedNodeId}
          selectedEdgeId={selectedEdgeId}
          onEdgeSelect={setSelectedEdgeId}
          connectMode={connectMode}
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
          <span className="text-xs">拖拽节点到画布 • 点击节点配置属性 • 连线模式下先后点击两个节点创建连线</span>
        </div>
      </div>

      {validationIssues.length > 0 && (
        <div className="border-t border-red-100 bg-red-50 px-4 py-3">
          <div className="text-sm text-red-700 font-medium mb-1">结构化校验结果</div>
          <ul className="list-disc list-inside text-xs text-red-700 space-y-1">
            {validationIssues.map((issue) => (
              <li key={`${issue.code}-${issue.nodeId ?? 'global'}`}>{issue.message}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
