import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, RotateCcw, StopCircle } from 'lucide-react';

export function RunDetail() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState<'timeline' | 'diagram' | 'logs'>('timeline');

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/runs" className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Run {id}</h1>
            <p className="text-gray-600 mt-1">财务月结流程 - Schedule触发</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <RotateCcw className="w-4 h-4" />
            重跑
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50">
            <StopCircle className="w-4 h-4" />
            终止
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <div className="grid grid-cols-4 gap-6">
          <div>
            <div className="text-sm text-gray-600 mb-1">状态</div>
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">Success</span>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">开始时间</div>
            <div className="font-medium">2026-02-26 14:00:00</div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">结束时间</div>
            <div className="font-medium">2026-02-26 14:12:35</div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">总耗时</div>
            <div className="font-medium">12m 35s</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="border-b border-gray-200">
          <div className="flex gap-8 px-6">
            {[
              { key: 'timeline', label: '执行时间线' },
              { key: 'diagram', label: '流程图回放' },
              { key: 'logs', label: '日志' },
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
          {activeTab === 'timeline' && (
            <div className="space-y-4">
              {[
                { time: '14:00:00', event: '工作流开始', status: 'success', duration: '-' },
                { time: '14:00:01', event: '节点: 财务数据抽取', status: 'success', duration: '2m 15s' },
                { time: '14:02:16', event: '节点: 成本核算', status: 'success', duration: '5m 30s' },
                { time: '14:07:46', event: '节点: 报表生成', status: 'success', duration: '3m 50s' },
                { time: '14:11:36', event: '条件判断: SUCCESS', status: 'success', duration: '1s' },
                { time: '14:11:37', event: '节点: 发送邮件', status: 'success', duration: '58s' },
                { time: '14:12:35', event: '工作流完成', status: 'success', duration: '-' },
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="text-sm text-gray-600 w-24">{step.time}</div>
                  <div className={`w-3 h-3 rounded-full mt-1 ${
                    step.status === 'success' ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">{step.event}</div>
                    {step.duration !== '-' && (
                      <div className="text-xs text-gray-500 mt-1">耗时: {step.duration}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'diagram' && (
            <div className="bg-gray-50 rounded-lg p-8 min-h-[400px] flex items-center justify-center">
              <div className="text-center text-gray-500">
                <div className="text-4xl mb-2">✓</div>
                <div>所有节点执行成功</div>
                <div className="text-sm mt-2">点击节点查看详细日志</div>
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div>
              <div className="mb-4 flex gap-2">
                <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm">全量日志</button>
                <button className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50">错误摘要</button>
                <button className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50">结构化日志</button>
              </div>
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-auto max-h-[500px]">
                <div>[2026-02-26 14:00:00] Workflow started: 财务月结流程</div>
                <div>[2026-02-26 14:00:01] Node: 财务数据抽取 - Starting</div>
                <div>[2026-02-26 14:00:02] Connecting to SQL-PROD-01...</div>
                <div>[2026-02-26 14:00:03] Connection established</div>
                <div>[2026-02-26 14:00:04] Executing SQL Agent Job: FinanceDailyReport</div>
                <div>[2026-02-26 14:02:15] Rows extracted: 125,430</div>
                <div className="text-green-500">[2026-02-26 14:02:16] Node completed successfully</div>
                <div>[2026-02-26 14:02:16] Node: 成本核算 - Starting</div>
                <div>[2026-02-26 14:02:17] Executing stored procedure: sp_CalculateCost</div>
                <div>[2026-02-26 14:07:45] Rows affected: 89,234</div>
                <div className="text-green-500">[2026-02-26 14:07:46] Node completed successfully</div>
                <div>[2026-02-26 14:07:46] Node: 报表生成 - Starting</div>
                <div>[2026-02-26 14:07:47] Executing Python script on WIN-HOST-01</div>
                <div>[2026-02-26 14:11:35] Report generated: finance_report_20260226.xlsx</div>
                <div className="text-green-500">[2026-02-26 14:11:36] Node completed successfully</div>
                <div>[2026-02-26 14:11:36] Condition: Checking prev.status == SUCCESS</div>
                <div>[2026-02-26 14:11:37] Condition: TRUE - Taking success branch</div>
                <div>[2026-02-26 14:11:37] Node: 发送邮件 - Starting</div>
                <div>[2026-02-26 14:12:34] Email sent to: finance@company.com</div>
                <div className="text-green-500">[2026-02-26 14:12:35] Node completed successfully</div>
                <div className="text-green-500 font-bold">[2026-02-26 14:12:35] Workflow completed successfully</div>
                <div>[2026-02-26 14:12:35] Total duration: 12m 35s</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
