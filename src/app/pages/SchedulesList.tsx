import { useState } from 'react';
import { Link } from 'react-router';
import { Plus, Search, Clock, Edit, Power } from 'lucide-react';

const schedulesData = [
  {
    id: '1',
    name: '财务日报定时',
    type: 'Cron',
    expression: '0 0 * * *',
    nextRun: '明天 00:00',
    target: '财务日报生成',
    targetType: 'Job',
    timezone: 'Asia/Shanghai',
    enabled: true,
  },
  {
    id: '2',
    name: 'BI数据同步间隔',
    type: '间隔',
    expression: '每 30 分钟',
    nextRun: '14 分钟后',
    target: 'BI数据同步链路',
    targetType: 'Workflow',
    timezone: 'Asia/Shanghai',
    enabled: true,
  },
  {
    id: '3',
    name: '月末财务流程',
    type: '日历',
    expression: '每月最后一天',
    nextRun: '2026-02-28 00:00',
    target: '财务月结流程',
    targetType: 'Workflow',
    timezone: 'Asia/Shanghai',
    enabled: true,
  },
];

export function SchedulesList() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">计划管理</h1>
          <p className="text-gray-600 mt-1">定时触发配置</p>
        </div>
        <Link
          to="/schedules/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          新建计划
        </Link>
      </div>

      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索计划..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select className="px-4 py-2 border border-gray-300 rounded-lg">
            <option>全部类型</option>
            <option>Cron</option>
            <option>间隔</option>
            <option>日历</option>
            <option>时间窗</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">名称</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">类型</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">表达式</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">下次触发</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">绑定对象</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">时区</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {schedulesData.map((schedule) => (
              <tr key={schedule.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-gray-900">{schedule.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-sm">
                    {schedule.type}
                  </span>
                </td>
                <td className="px-6 py-4 font-mono text-sm text-gray-600">
                  {schedule.expression}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {schedule.nextRun}
                </td>
                <td className="px-6 py-4 text-sm">
                  <div>
                    <div className="text-gray-900">{schedule.target}</div>
                    <div className="text-gray-500 text-xs">{schedule.targetType}</div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {schedule.timezone}
                </td>
                <td className="px-6 py-4">
                  {schedule.enabled ? (
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">启用</span>
                  ) : (
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">停用</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <Link to={`/schedules/${schedule.id}/edit`} className="p-1 hover:bg-gray-100 rounded">
                      <Edit className="w-4 h-4 text-blue-600" />
                    </Link>
                    <button className="p-1 hover:bg-gray-100 rounded">
                      <Power className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
