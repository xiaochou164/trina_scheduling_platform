import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, Play, Edit, Power, GitBranch } from 'lucide-react';

export function WorkflowDetail() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState<'preview' | 'runs' | 'triggers' | 'params' | 'versions'>('preview');

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/workflows" className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">财务月结流程</h1>
            <div className="flex items-center gap-3 mt-2">
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm">Published</span>
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm">启用</span>
              <span className="text-sm text-gray-600">版本: v2.1.0</span>
              <span className="text-sm text-gray-600">发布人: 张三</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <Power className="w-4 h-4" />
            停用
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
            <Play className="w-4 h-4" />
            运行一次
          </button>
          <Link
            to={`/workflows/${id}/edit`}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Edit className="w-4 h-4" />
            编辑
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="border-b border-gray-200">
          <div className="flex gap-8 px-6">
            {[
              { key: 'preview', label: '流程预览' },
              { key: 'runs', label: '运行历史' },
              { key: 'triggers', label: '触发器' },
              { key: 'params', label: '参数与变量' },
              { key: 'versions', label: '发布记录' },
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
          {activeTab === 'preview' && (
            <div className="space-y-6">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 min-h-[500px]">
                {/* Simplified Workflow Diagram */}
                <div className="flex items-center justify-center h-full">
                  <div className="space-y-8">
                    <div className="flex items-center gap-4">
                      <div className="w-40 h-16 bg-green-100 border-2 border-green-500 rounded-lg flex items-center justify-center">
                        <span className="text-sm font-medium">开始</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="w-40 h-16 bg-blue-100 border-2 border-blue-500 rounded-lg flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-xs text-gray-600">SQL Agent</div>
                          <div className="text-sm font-medium">财务数据抽取</div>
                        </div>
                      </div>
                      <div className="text-gray-400">→</div>
                      <div className="w-40 h-16 bg-blue-100 border-2 border-blue-500 rounded-lg flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-xs text-gray-600">存储过程</div>
                          <div className="text-sm font-medium">成本核算</div>
                        </div>
                      </div>
                      <div className="text-gray-400">→</div>
                      <div className="w-40 h-16 bg-blue-100 border-2 border-blue-500 rounded-lg flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-xs text-gray-600">Python</div>
                          <div className="text-sm font-medium">报表生成</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="w-40 h-16 bg-purple-100 border-2 border-purple-500 rounded-lg flex items-center justify-center">
                        <span className="text-sm font-medium">条件判断</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="text-xs text-gray-600 mb-2">成功分支</div>
                        <div className="w-40 h-16 bg-blue-100 border-2 border-blue-500 rounded-lg flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-sm font-medium">发送邮件</div>
                          </div>
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="text-xs text-gray-600 mb-2">失败分支</div>
                        <div className="w-40 h-16 bg-red-100 border-2 border-red-500 rounded-lg flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-sm font-medium">告警通知</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="w-40 h-16 bg-gray-200 border-2 border-gray-500 rounded-lg flex items-center justify-center">
                        <span className="text-sm font-medium">结束</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="text-center">
                <Link
                  to={`/workflows/${id}/edit`}
                  className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
                >
                  <Edit className="w-4 h-4" />
                  在编辑器中打开完整视图
                </Link>
              </div>
            </div>
          )}

          {activeTab === 'runs' && (
            <div>
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Run ID</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">状态</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">触发方式</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">开始时间</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">耗时</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {[
                    { id: 'R-001', status: 'success', trigger: 'Schedule', time: '2026-02-26 14:00', duration: '12m 35s' },
                    { id: 'R-002', status: 'success', trigger: 'Manual', time: '2026-02-26 10:00', duration: '11m 42s' },
                    { id: 'R-003', status: 'failed', trigger: 'Schedule', time: '2026-02-26 06:00', duration: '8m 15s' },
                  ].map((run) => (
                    <tr key={run.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-mono">{run.id}</td>
                      <td className="px-4 py-3">
                        {run.status === 'success' ? (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">成功</span>
                        ) : (
                          <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs">失败</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">{run.trigger}</td>
                      <td className="px-4 py-3 text-sm">{run.time}</td>
                      <td className="px-4 py-3 text-sm">{run.duration}</td>
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

          {activeTab === 'triggers' && (
            <div className="space-y-4">
              {[
                { name: '每日凌晨定时触发', type: 'Schedule (Cron)', config: '0 0 * * *' },
                { name: '月末手动触发', type: 'Manual', config: '-' },
                { name: 'ERP完成后触发', type: 'Upstream', config: 'ERP数据同步完成' },
              ].map((trigger, i) => (
                <div key={i} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{trigger.name}</h4>
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">{trigger.type}</span>
                  </div>
                  <div className="text-sm text-gray-600">配置: {trigger.config}</div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'params' && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-3">工作流参数</h4>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-600">
                      <th className="pb-2">参数名</th>
                      <th className="pb-2">类型</th>
                      <th className="pb-2">默认值</th>
                      <th className="pb-2">描述</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="py-2 font-mono">DATE</td>
                      <td className="py-2">String</td>
                      <td className="py-2 font-mono">$&#123;today&#125;</td>
                      <td className="py-2">处理日期</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-mono">NOTIFY_EMAIL</td>
                      <td className="py-2">String</td>
                      <td className="py-2">finance@company.com</td>
                      <td className="py-2">通知邮箱</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'versions' && (
            <div className="space-y-3">
              {[
                { version: 'v2.1.0', date: '2026-02-20 15:30', user: '张三', changes: '优化成本核算逻辑' },
                { version: 'v2.0.0', date: '2026-02-10 10:20', user: '张三', changes: '新增失败补偿流程' },
                { version: 'v1.8.0', date: '2026-02-01 09:15', user: '李四', changes: '添加条件分支' },
              ].map((ver, i) => (
                <div key={i} className="flex gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex-shrink-0 w-20">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-mono">
                      {ver.version}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-1">
                      <span className="text-sm text-gray-600">{ver.date}</span>
                      <span className="text-sm font-medium">{ver.user}</span>
                    </div>
                    <div className="text-sm text-gray-700">{ver.changes}</div>
                  </div>
                  <div>
                    <button className="text-sm text-blue-600 hover:text-blue-700">回滚</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
