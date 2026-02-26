import { useState } from 'react';
import { Link } from 'react-router';
import { Plus, Search, Play, Edit, Eye, GitBranch } from 'lucide-react';

const workflowsData = [
  {
    id: '1',
    name: '财务月结流程',
    status: 'Published',
    version: 'v2.1.0',
    lastPublisher: '张三',
    lastRun: '2小时前',
    successRate: '99.2%',
    triggerCount: 3,
    enabled: true,
  },
  {
    id: '2',
    name: 'BI数据同步链路',
    status: 'Published',
    version: 'v1.8.5',
    lastPublisher: '李四',
    lastRun: '30分钟前',
    successRate: '97.5%',
    triggerCount: 5,
    enabled: true,
  },
  {
    id: '3',
    name: '库存对账工作流',
    status: 'Draft',
    version: 'v1.2.0-draft',
    lastPublisher: '王五',
    lastRun: '未运行',
    successRate: '-',
    triggerCount: 0,
    enabled: false,
  },
];

export function WorkflowsList() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('全部');

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">工作流管理</h1>
          <p className="text-gray-600 mt-1">可视化编排多作业流程</p>
        </div>
        <Link
          to="/workflows/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          新建工作流
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索工作流名称..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option>全部</option>
            <option>Published</option>
            <option>Draft</option>
          </select>

          <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option>全部状态</option>
            <option>启用</option>
            <option>停用</option>
          </select>
        </div>
      </div>

      {/* Workflows Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workflowsData.map((workflow) => (
          <div key={workflow.id} className="bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-shadow">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <GitBranch className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-900">{workflow.name}</h3>
                </div>
                {workflow.status === 'Published' ? (
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                    Published
                  </span>
                ) : (
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">
                    Draft
                  </span>
                )}
              </div>

              <div className="space-y-2 mb-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">版本</span>
                  <span className="font-mono text-gray-900">{workflow.version}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">发布人</span>
                  <span className="text-gray-900">{workflow.lastPublisher}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">最后运行</span>
                  <span className="text-gray-900">{workflow.lastRun}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">成功率</span>
                  <span className={`font-medium ${
                    workflow.successRate !== '-' && parseFloat(workflow.successRate) >= 95
                      ? 'text-green-600'
                      : 'text-gray-900'
                  }`}>
                    {workflow.successRate}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">触发器</span>
                  <span className="text-gray-900">{workflow.triggerCount} 个</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div>
                  {workflow.enabled ? (
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                      启用
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                      停用
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  {workflow.status === 'Published' && (
                    <button className="p-2 hover:bg-gray-100 rounded" title="运行">
                      <Play className="w-4 h-4 text-green-600" />
                    </button>
                  )}
                  <Link to={`/workflows/${workflow.id}/edit`} className="p-2 hover:bg-gray-100 rounded" title="编辑">
                    <Edit className="w-4 h-4 text-blue-600" />
                  </Link>
                  <Link to={`/workflows/${workflow.id}`} className="p-2 hover:bg-gray-100 rounded" title="查看">
                    <Eye className="w-4 h-4 text-gray-600" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
