import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, Play, Edit, Clock, CheckCircle, XCircle, TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const performanceData = [
  { time: '00:00', duration: 3.2, success: 1 },
  { time: '04:00', duration: 3.5, success: 1 },
  { time: '08:00', duration: 3.1, success: 1 },
  { time: '12:00', duration: 4.2, success: 0 },
  { time: '16:00', duration: 3.0, success: 1 },
  { time: '20:00', duration: 3.3, success: 1 },
];

const recentRuns = [
  { id: 'R-001', status: 'success', startTime: '2026-02-26 14:30', duration: '3.2min', trigger: 'Schedule' },
  { id: 'R-002', status: 'success', startTime: '2026-02-26 10:30', duration: '3.5min', trigger: 'Schedule' },
  { id: 'R-003', status: 'failed', startTime: '2026-02-26 06:30', duration: '4.2min', trigger: 'Schedule' },
  { id: 'R-004', status: 'success', startTime: '2026-02-26 02:30', duration: '3.0min', trigger: 'Schedule' },
];

export function JobDetail() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState<'config' | 'runs' | 'logs' | 'changes'>('config');

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/jobs" className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">财务日报生成</h1>
            <div className="flex items-center gap-3 mt-2">
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">SQL Agent</span>
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm">启用</span>
              <span className="text-sm text-gray-600">Owner: 张三</span>
              <span className="text-sm text-gray-600">版本: v1.2.3</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
            <Play className="w-4 h-4" />
            运行一次
          </button>
          <Link
            to={`/jobs/${id}/edit`}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Edit className="w-4 h-4" />
            编辑
          </Link>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Info */}
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">基本信息</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">名称</span>
              <span className="font-medium">财务日报生成</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">类型</span>
              <span className="font-medium">SQL Agent Job</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">目标实例</span>
              <span className="font-mono text-sm">SQL-PROD-01</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Job Name</span>
              <span className="font-mono text-sm">FinanceDailyReport</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">标签</span>
              <div className="flex gap-1">
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-sm">财务</span>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-sm">BI</span>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">描述</span>
              <span className="text-sm text-gray-700 text-right max-w-xs">
                生成财务日报,包含收入、成本、利润等关键指标
              </span>
            </div>
          </div>
        </div>

        {/* Performance Stats */}
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">运行统计 (近24h)</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2 text-green-700 mb-1">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">成功率</span>
              </div>
              <div className="text-2xl font-bold text-green-700">98.5%</div>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 text-blue-700 mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-sm">平均耗时</span>
              </div>
              <div className="text-2xl font-bold text-blue-700">3.2min</div>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="flex items-center gap-2 text-purple-700 mb-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm">P95 耗时</span>
              </div>
              <div className="text-2xl font-bold text-purple-700">4.5min</div>
            </div>
            <div className="p-4 bg-red-50 rounded-lg">
              <div className="flex items-center gap-2 text-red-700 mb-1">
                <XCircle className="w-4 h-4" />
                <span className="text-sm">失败次数</span>
              </div>
              <div className="text-2xl font-bold text-red-700">2</div>
            </div>
          </div>
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
            最近失败原因: 数据库连接超时 (12:05)
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="border-b border-gray-200">
          <div className="flex gap-8 px-6">
            {[
              { key: 'config', label: '配置' },
              { key: 'runs', label: '运行历史' },
              { key: 'logs', label: '日志' },
              { key: 'changes', label: '变更记录' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-4 border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-blue-600 text-blue-600 font-medium'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'config' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">连接配置</h4>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">SQL Server 实例</span>
                    <span className="font-mono">SQL-PROD-01 (192.168.1.10)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">运行账户</span>
                    <span className="font-mono">sa_finance</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Agent Job</span>
                    <span className="font-mono">FinanceDailyReport</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">执行策略</h4>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">超时时间</span>
                    <span>30 分钟</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">重试次数</span>
                    <span>3 次</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">重试间隔</span>
                    <span>5 分钟</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">失败告警</span>
                    <span className="text-green-600">✓ 启用</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'runs' && (
            <div>
              <div className="mb-4">
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Area type="monotone" dataKey="duration" stroke="#3b82f6" fill="#93c5fd" name="耗时(分钟)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Run ID</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">状态</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">开始时间</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">耗时</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">触发方式</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {recentRuns.map((run) => (
                    <tr key={run.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-mono">{run.id}</td>
                      <td className="px-4 py-3">
                        {run.status === 'success' ? (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">成功</span>
                        ) : (
                          <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs">失败</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">{run.startTime}</td>
                      <td className="px-4 py-3 text-sm">{run.duration}</td>
                      <td className="px-4 py-3 text-sm">{run.trigger}</td>
                      <td className="px-4 py-3 text-sm">
                        <Link to={`/runs/${run.id}`} className="text-blue-600 hover:text-blue-700">
                          查看详情
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-auto max-h-96">
              <div>[2026-02-26 14:30:15] Job started</div>
              <div>[2026-02-26 14:30:16] Connecting to SQL-PROD-01...</div>
              <div>[2026-02-26 14:30:17] Connection established</div>
              <div>[2026-02-26 14:30:18] Executing step 1: Data extraction</div>
              <div>[2026-02-26 14:31:45] Step 1 completed (87s)</div>
              <div>[2026-02-26 14:31:46] Executing step 2: Data transformation</div>
              <div>[2026-02-26 14:32:30] Step 2 completed (44s)</div>
              <div>[2026-02-26 14:32:31] Executing step 3: Report generation</div>
              <div>[2026-02-26 14:33:25] Step 3 completed (54s)</div>
              <div className="text-green-500 font-bold">[2026-02-26 14:33:26] Job completed successfully</div>
              <div>[2026-02-26 14:33:26] Total duration: 3m 11s</div>
            </div>
          )}

          {activeTab === 'changes' && (
            <div className="space-y-3">
              {[
                { date: '2026-02-20 15:30', user: '张三', action: '修改超时时间从20分钟改为30分钟' },
                { date: '2026-02-15 10:20', user: '李四', action: '添加标签: BI' },
                { date: '2026-02-10 09:15', user: '张三', action: '修改重试次数从2次改为3次' },
              ].map((change, i) => (
                <div key={i} className="flex gap-4 p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">{change.date}</div>
                  <div className="text-sm font-medium">{change.user}</div>
                  <div className="text-sm text-gray-700">{change.action}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
