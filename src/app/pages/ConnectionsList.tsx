import { useState } from 'react';
import { Link } from 'react-router';
import { Plus, Search, Database, Server } from 'lucide-react';

const sqlConnections = [
  { id: '1', name: 'SQL-PROD-01', instance: '192.168.1.10', auth: 'SQL Auth', status: 'online', lastCheck: '1分钟前' },
  { id: '2', name: 'SQL-PROD-02', instance: '192.168.1.11', auth: 'Windows Auth', status: 'online', lastCheck: '1分钟前' },
  { id: '3', name: 'SQL-DEV-01', instance: '192.168.2.10', auth: 'SQL Auth', status: 'offline', lastCheck: '5分钟前' },
];

const windowsHosts = [
  { id: '1', name: 'WIN-HOST-01', host: '192.168.1.20', agent: 'v1.2.3', status: 'online', lastSync: '2分钟前' },
  { id: '2', name: 'WIN-HOST-02', host: '192.168.1.21', agent: 'v1.2.3', status: 'online', lastSync: '3分钟前' },
];

export function ConnectionsList() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'sql' | 'windows'>('sql');

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">资源连接</h1>
          <p className="text-gray-600 mt-1">管理SQL Server和Windows主机连接</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" />
          新建连接
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="border-b border-gray-200">
          <div className="flex gap-8 px-6">
            <button
              onClick={() => setActiveTab('sql')}
              className={`py-4 border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'sql'
                  ? 'border-blue-600 text-blue-600 font-medium'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Database className="w-4 h-4" />
              SQL Server
            </button>
            <button
              onClick={() => setActiveTab('windows')}
              className={`py-4 border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'windows'
                  ? 'border-blue-600 text-blue-600 font-medium'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Server className="w-4 h-4" />
              Windows Hosts
            </button>
          </div>
        </div>

        <div className="p-4">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索连接..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {activeTab === 'sql' && (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">名称</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">实例</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">认证方式</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">健康检查</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sqlConnections.map((conn) => (
                  <tr key={conn.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Database className="w-4 h-4 text-blue-600" />
                        <span className="font-medium text-gray-900">{conn.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 font-mono text-sm text-gray-600">{conn.instance}</td>
                    <td className="px-4 py-4 text-sm text-gray-600">{conn.auth}</td>
                    <td className="px-4 py-4">
                      {conn.status === 'online' ? (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs flex items-center gap-1 w-fit">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          在线
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs">离线</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">{conn.lastCheck}</td>
                    <td className="px-4 py-4 text-sm">
                      <div className="flex gap-2">
                        <button className="text-blue-600 hover:text-blue-700">测试</button>
                        <button className="text-blue-600 hover:text-blue-700">编辑</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'windows' && (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">名称</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">主机</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Agent版本</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">最后同步</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {windowsHosts.map((host) => (
                  <tr key={host.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Server className="w-4 h-4 text-purple-600" />
                        <span className="font-medium text-gray-900">{host.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 font-mono text-sm text-gray-600">{host.host}</td>
                    <td className="px-4 py-4 font-mono text-sm text-gray-600">{host.agent}</td>
                    <td className="px-4 py-4">
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs flex items-center gap-1 w-fit">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        在线
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">{host.lastSync}</td>
                    <td className="px-4 py-4 text-sm">
                      <Link to={`/connections/${host.id}`} className="text-blue-600 hover:text-blue-700">
                        详情
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
