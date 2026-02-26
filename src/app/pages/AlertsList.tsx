import { useState } from 'react';
import { Link } from 'react-router';
import { Search, Bell, CheckCircle } from 'lucide-react';

const alertsData = [
  { id: '1', time: '14:30:15', level: '严重', object: '财务日报生成', rule: '失败即告警', summary: '数据库连接超时', status: '未确认', assignee: '-' },
  { id: '2', time: '12:05:30', level: '警告', object: 'BI数据同步', rule: '耗时异常', summary: '执行耗时超过P95阈值', status: '处理中', assignee: '张三' },
  { id: '3', time: '10:20:00', level: '严重', object: '库存对账', rule: '连续失败', summary: '连续失败3次', status: '已解决', assignee: '李四' },
];

export function AlertsList() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">告警中心</h1>
          <p className="text-gray-600 mt-1">监控和管理异常告警</p>
        </div>
        <Link
          to="/alerts/rules"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Bell className="w-4 h-4" />
          告警规则
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
              placeholder="搜索告警..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select className="px-4 py-2 border border-gray-300 rounded-lg">
            <option>全部级别</option>
            <option>严重</option>
            <option>警告</option>
            <option>提示</option>
          </select>
          <select className="px-4 py-2 border border-gray-300 rounded-lg">
            <option>全部状态</option>
            <option>未确认</option>
            <option>处理中</option>
            <option>已解决</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">时间</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">级别</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">对象</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">规则</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">摘要</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">指派人</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {alertsData.map((alert) => (
              <tr key={alert.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-600">{alert.time}</td>
                <td className="px-6 py-4">
                  {alert.level === '严重' ? (
                    <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">严重</span>
                  ) : (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">警告</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">{alert.object}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{alert.rule}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{alert.summary}</td>
                <td className="px-6 py-4">
                  {alert.status === '未确认' && (
                    <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs">未确认</span>
                  )}
                  {alert.status === '处理中' && (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs">处理中</span>
                  )}
                  {alert.status === '已解决' && (
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">已解决</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{alert.assignee}</td>
                <td className="px-6 py-4 text-sm">
                  <div className="flex gap-2">
                    <button className="text-blue-600 hover:text-blue-700">确认</button>
                    <button className="text-gray-600 hover:text-gray-700">静默</button>
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
