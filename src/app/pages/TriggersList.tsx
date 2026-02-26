import { useState } from 'react';
import { Link } from 'react-router';
import { Plus, Search, Zap } from 'lucide-react';

const triggersData = [
  { id: '1', name: 'ERP完成触发', type: 'Upstream', target: '财务月结流程', lastTrigger: '2小时前', enabled: true },
  { id: '2', name: '财务API回调', type: 'Webhook', target: 'BI数据同步链路', lastTrigger: '1小时前', enabled: true },
  { id: '3', name: '手动触发入口', type: 'Manual', target: '库存盘点', lastTrigger: '未触发', enabled: true },
];

export function TriggersList() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">触发器管理</h1>
          <p className="text-gray-600 mt-1">配置工作流触发方式</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" />
          新建触发器
        </button>
      </div>

      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索触发器..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select className="px-4 py-2 border border-gray-300 rounded-lg">
            <option>全部类型</option>
            <option>Manual</option>
            <option>Webhook</option>
            <option>Upstream</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {triggersData.map((trigger) => (
          <Link
            key={trigger.id}
            to={`/triggers/${trigger.id}`}
            className="bg-white rounded-lg p-5 border border-gray-200 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-600" />
                <h3 className="font-semibold text-gray-900">{trigger.name}</h3>
              </div>
              <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">{trigger.type}</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">绑定对象</span>
                <span className="text-gray-900">{trigger.target}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">最近触发</span>
                <span className="text-gray-900">{trigger.lastTrigger}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">状态</span>
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">启用</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
