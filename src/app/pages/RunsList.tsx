import { useState } from 'react';
import { Link } from 'react-router';
import { Search, Filter } from 'lucide-react';

const runsData = [
  { id: 'R-20260226-001', object: '财务月结流程', type: 'Workflow', trigger: 'Schedule', status: 'success', startTime: '14:00:00', duration: '12m 35s', failedNode: '-' },
  { id: 'R-20260226-002', object: 'BI数据同步链路', type: 'Workflow', trigger: 'Webhook', status: 'running', startTime: '14:30:15', duration: '5m 23s', failedNode: '-' },
  { id: 'R-20260226-003', object: '财务日报生成', type: 'Job', trigger: 'Manual', status: 'failed', startTime: '12:05:30', duration: '4m 15s', failedNode: 'Step 2' },
  { id: 'R-20260226-004', object: '库存盘点', type: 'Job', trigger: 'Schedule', status: 'success', startTime: '10:00:00', duration: '25m 10s', failedNode: '-' },
];

export function RunsList() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('全部');

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">运行中心</h1>
          <p className="text-gray-600 mt-1">查看和管理所有运行实例</p>
        </div>
      </div>

      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="RunID / 对象名称..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option>全部状态</option>
            <option>Success</option>
            <option>Failed</option>
            <option>Running</option>
            <option>Queued</option>
            <option>Cancelled</option>
          </select>

          <select className="px-4 py-2 border border-gray-300 rounded-lg">
            <option>全部对象</option>
            <option>Workflow</option>
            <option>Job</option>
          </select>

          <select className="px-4 py-2 border border-gray-300 rounded-lg">
            <option>全部触发方式</option>
            <option>Schedule</option>
            <option>Manual</option>
            <option>Webhook</option>
            <option>Upstream</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Run ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">对象</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">触发来源</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">开始时间</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">耗时</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">失败节点</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {runsData.map((run) => (
              <tr key={run.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-mono text-sm text-gray-900">{run.id}</td>
                <td className="px-6 py-4">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{run.object}</div>
                    <div className="text-xs text-gray-500">{run.type}</div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-gray-100 rounded text-xs">{run.trigger}</span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{run.startTime}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{run.duration}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{run.failedNode}</td>
                <td className="px-6 py-4">
                  {run.status === 'success' && (
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">成功</span>
                  )}
                  {run.status === 'running' && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs flex items-center gap-1 w-fit">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      运行中
                    </span>
                  )}
                  {run.status === 'failed' && (
                    <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs">失败</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <Link to={`/runs/${run.id}`} className="text-blue-600 hover:text-blue-700 text-sm">
                    查看详情
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
