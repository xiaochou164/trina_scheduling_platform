import { useState } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, Plus } from 'lucide-react';

const rulesData = [
  { id: '1', name: '作业失败告警', template: '失败即告警', objects: ['所有作业'], channels: ['邮件', '企业微信'], enabled: true },
  { id: '2', name: '工作流超时', template: '超时告警', objects: ['财务月结流程'], channels: ['短信', '邮件'], enabled: true },
  { id: '3', name: '连续失败监控', template: '连续失败N次', objects: ['所有工作流'], channels: ['企业微信'], enabled: true },
];

export function AlertRules() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/alerts" className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">告警规则配置</h1>
            <p className="text-gray-600 mt-1">管理告警规则和通知渠道</p>
          </div>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" />
          新建规则
        </button>
      </div>

      <div className="space-y-4">
        {rulesData.map((rule) => (
          <div key={rule.id} className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{rule.name}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">{rule.template}</span>
                  <span className={`px-2 py-1 rounded text-sm ${
                    rule.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {rule.enabled ? '启用' : '停用'}
                  </span>
                </div>
              </div>
              <button className="text-blue-600 hover:text-blue-700">编辑</button>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">监控对象</h4>
                <div className="flex flex-wrap gap-2">
                  {rule.objects.map((obj, i) => (
                    <span key={i} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                      {obj}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">通知渠道</h4>
                <div className="flex flex-wrap gap-2">
                  {rule.channels.map((channel, i) => (
                    <span key={i} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                      {channel}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">通知渠道配置</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="font-medium text-gray-900">邮件</div>
              <div className="text-sm text-gray-600 mt-1">SMTP: smtp.company.com:587</div>
            </div>
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">已配置</span>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="font-medium text-gray-900">企业微信</div>
              <div className="text-sm text-gray-600 mt-1">Webhook已配置</div>
            </div>
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">已配置</span>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="font-medium text-gray-900">钉钉</div>
              <div className="text-sm text-gray-600 mt-1">未配置</div>
            </div>
            <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
              配置
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
