import { useState } from 'react';
import { Users, Key, Globe, Tag } from 'lucide-react';

export function Settings() {
  const [activeTab, setActiveTab] = useState<'rbac' | 'variables' | 'environments' | 'tags'>('rbac');

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">系统设置</h1>
        <p className="text-gray-600 mt-1">配置系统参数和权限</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="border-b border-gray-200">
          <div className="flex gap-8 px-6">
            {[
              { key: 'rbac', label: 'RBAC权限', icon: Users },
              { key: 'variables', label: '全局变量', icon: Key },
              { key: 'environments', label: '环境配置', icon: Globe },
              { key: 'tags', label: '标签管理', icon: Tag },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`py-4 border-b-2 transition-colors flex items-center gap-2 ${
                    activeTab === tab.key
                      ? 'border-blue-600 text-blue-600 font-medium'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'rbac' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-4">角色管理</h3>
                <div className="space-y-3">
                  {[
                    { role: 'Admin', users: 2, permissions: '全部权限' },
                    { role: 'Operator', users: 5, permissions: '运行、终止、查看' },
                    { role: 'Developer', users: 8, permissions: '编辑工作流、运行、查看' },
                    { role: 'Viewer', users: 15, permissions: '仅查看' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div>
                        <div className="font-medium text-gray-900">{item.role}</div>
                        <div className="text-sm text-gray-600 mt-1">{item.permissions}</div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-600">{item.users} 个用户</span>
                        <button className="text-blue-600 hover:text-blue-700 text-sm">编辑</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-4">用户列表</h3>
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">用户名</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">邮箱</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">角色</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">最后登录</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {[
                      { name: '张三', email: 'zhang@company.com', role: 'Admin', lastLogin: '刚刚' },
                      { name: '李四', email: 'li@company.com', role: 'Developer', lastLogin: '1小时前' },
                      { name: '王五', email: 'wang@company.com', role: 'Operator', lastLogin: '2小时前' },
                    ].map((user, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">{user.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{user.email}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">{user.role}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{user.lastLogin}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'variables' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium text-gray-900">全局变量</h3>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                  + 新建变量
                </button>
              </div>
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">变量名</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">值</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">描述</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {[
                    { name: 'GLOBAL_EMAIL', value: 'admin@company.com', desc: '全局通知邮箱' },
                    { name: 'DATA_PATH', value: 'D:\\Data\\', desc: '数据存储路径' },
                    { name: 'RETRY_MAX', value: '3', desc: '默认重试次数' },
                  ].map((variable, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-sm text-gray-900">{variable.name}</td>
                      <td className="px-4 py-3 font-mono text-sm text-gray-600">{variable.value}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{variable.desc}</td>
                      <td className="px-4 py-3 text-sm">
                        <button className="text-blue-600 hover:text-blue-700">编辑</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'environments' && (
            <div className="space-y-4">
              {[
                { env: 'Prod', color: 'red', desc: '生产环境', api: 'https://api.prod.company.com' },
                { env: 'Pre', color: 'yellow', desc: '预发布环境', api: 'https://api.pre.company.com' },
                { env: 'Dev', color: 'green', desc: '开发环境', api: 'https://api.dev.company.com' },
              ].map((item, i) => (
                <div key={i} className={`p-5 rounded-lg border-2 ${
                  item.color === 'red' ? 'border-red-200 bg-red-50' :
                  item.color === 'yellow' ? 'border-yellow-200 bg-yellow-50' :
                  'border-green-200 bg-green-50'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className={`w-3 h-3 rounded-full ${
                        item.color === 'red' ? 'bg-red-500' :
                        item.color === 'yellow' ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}></span>
                      <h4 className="text-lg font-semibold">{item.env}</h4>
                    </div>
                    <button className="text-blue-600 hover:text-blue-700 text-sm">配置</button>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">描述</span>
                      <span>{item.desc}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">API地址</span>
                      <span className="font-mono text-xs">{item.api}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'tags' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium text-gray-900">标签管理</h3>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                  + 新建标签
                </button>
              </div>
              <div className="flex flex-wrap gap-3">
                {['财务', '成本', 'ETL', 'BI', '报表', '同步', '清洗', '归档'].map((tag) => (
                  <div key={tag} className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg">
                    <span>{tag}</span>
                    <button className="text-blue-900 hover:text-blue-950">×</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
