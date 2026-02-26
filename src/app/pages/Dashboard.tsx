import { useState } from 'react';
import { Link } from 'react-router';
import { 
  TrendingUp, 
  TrendingDown, 
  PlayCircle, 
  CheckCircle, 
  XCircle, 
  Clock,
  AlertTriangle,
  Search,
  StopCircle,
  RotateCcw,
  Eye
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const kpiData = [
  { label: '今日运行次数', value: '1,245', change: '+12%', trend: 'up', icon: PlayCircle },
  { label: '成功率', value: '98.5%', change: '+2.3%', trend: 'up', icon: CheckCircle },
  { label: '失败数', value: '18', change: '-5', trend: 'down', icon: XCircle },
  { label: '平均耗时', value: '3.2min', change: '-8%', trend: 'down', icon: Clock },
  { label: '排队长度', value: '5', change: '0', trend: 'neutral', icon: PlayCircle },
  { label: 'SLA违规', value: '2', change: '-1', trend: 'down', icon: AlertTriangle },
];

const trendData = [
  { time: '00:00', success: 45, failed: 2 },
  { time: '04:00', success: 38, failed: 1 },
  { time: '08:00', success: 92, failed: 3 },
  { time: '12:00', success: 78, failed: 2 },
  { time: '16:00', success: 65, failed: 5 },
  { time: '20:00', success: 58, failed: 4 },
];

const failedWorkflows = [
  { name: '财务日报生成', count: 5, lastFail: '2分钟前' },
  { name: 'SAP数据同步', count: 3, lastFail: '15分钟前' },
  { name: '库存盘点任务', count: 2, lastFail: '1小时前' },
  { name: '订单状态更新', count: 2, lastFail: '2小时前' },
];

const runningJobs = [
  { id: 'R-20260226-001', name: 'BI报表汇总', trigger: 'Schedule', startTime: '14:30:15', duration: '5m 23s', currentNode: '数据聚合', status: 'running' },
  { id: 'R-20260226-002', name: '成本核算流程', trigger: 'Manual', startTime: '14:28:42', duration: '7m 01s', currentNode: '成本分摊', status: 'running' },
  { id: 'R-20260226-003', name: 'ERP数据抽取', trigger: 'Webhook', startTime: '14:25:10', duration: '10m 30s', currentNode: '增量同步', status: 'queued' },
  { id: 'R-20260226-004', name: '库存对账', trigger: 'Upstream', startTime: '14:20:05', duration: '15m 35s', currentNode: '差异分析', status: 'retrying' },
];

export function Dashboard() {
  const [timeRange, setTimeRange] = useState('24h');
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">仪表盘</h1>
          <p className="text-gray-600 mt-1">实时运行监控与统计概览</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索作业/工作流/RunID..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-80 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="1h">最近 1 小时</option>
            <option value="24h">最近 24 小时</option>
            <option value="7d">最近 7 天</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpiData.map((kpi, index) => {
          const Icon = kpi.icon;
          return (
            <div key={index} className="bg-white rounded-lg p-5 border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <Icon className="w-5 h-5 text-gray-400" />
                {kpi.trend === 'up' ? (
                  <span className="text-green-600 text-sm flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    {kpi.change}
                  </span>
                ) : kpi.trend === 'down' ? (
                  <span className="text-red-600 text-sm flex items-center gap-1">
                    <TrendingDown className="w-3 h-3" />
                    {kpi.change}
                  </span>
                ) : (
                  <span className="text-gray-600 text-sm">{kpi.change}</span>
                )}
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">{kpi.value}</div>
              <div className="text-sm text-gray-600">{kpi.label}</div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Failed Workflows */}
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">失败热榜</h3>
          <div className="space-y-3">
            {failedWorkflows.map((workflow, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="flex-1">
                  <Link to={`/workflows/${index + 1}`} className="font-medium text-gray-900 hover:text-blue-600">
                    {workflow.name}
                  </Link>
                  <p className="text-sm text-gray-600 mt-1">最后失败: {workflow.lastFail}</p>
                </div>
                <div className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                  {workflow.count} 次
                </div>
              </div>
            ))}
          </div>
          <Link to="/runs?status=failed" className="block text-center text-blue-600 hover:text-blue-700 mt-4 text-sm">
            查看所有失败运行 →
          </Link>
        </div>

        {/* Trend Chart */}
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">运行趋势</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="time" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip />
              <Line type="monotone" dataKey="success" stroke="#10b981" strokeWidth={2} name="成功" />
              <Line type="monotone" dataKey="failed" stroke="#ef4444" strokeWidth={2} name="失败" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Running Jobs Table */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">实时运行队列</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Run ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">对象</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">触发来源</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">开始时间</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">耗时</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">当前节点</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {runningJobs.map((job) => (
                <tr key={job.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                    {job.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <Link to={`/runs/${job.id}`} className="hover:text-blue-600">
                      {job.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    <span className="px-2 py-1 bg-gray-100 rounded text-xs">{job.trigger}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{job.startTime}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{job.duration}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{job.currentNode}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {job.status === 'running' && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium flex items-center gap-1 w-fit">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        运行中
                      </span>
                    )}
                    {job.status === 'queued' && (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                        排队中
                      </span>
                    )}
                    {job.status === 'retrying' && (
                      <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                        重试中
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center gap-2">
                      <button className="p-1 hover:bg-gray-100 rounded" title="终止">
                        <StopCircle className="w-4 h-4 text-red-600" />
                      </button>
                      <button className="p-1 hover:bg-gray-100 rounded" title="重跑">
                        <RotateCcw className="w-4 h-4 text-blue-600" />
                      </button>
                      <Link to={`/runs/${job.id}`} className="p-1 hover:bg-gray-100 rounded" title="查看">
                        <Eye className="w-4 h-4 text-gray-600" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
