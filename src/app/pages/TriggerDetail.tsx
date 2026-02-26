import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, Copy, Globe } from 'lucide-react';

export function TriggerDetail() {
  const { id } = useParams();
  const [showSecret, setShowSecret] = useState(false);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/triggers" className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">财务API回调</h1>
            <div className="flex items-center gap-3 mt-2">
              <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-sm">Webhook</span>
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm">启用</span>
            </div>
          </div>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">编辑</button>
      </div>

      <div className="bg-white rounded-lg p-6 border border-gray-200 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Webhook URL</label>
          <div className="flex gap-2">
            <input
              type="text"
              value="https://workflow.company.com/webhook/abc123def456"
              readOnly
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm"
            />
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <Copy className="w-4 h-4" />
              复制
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">签名密钥</label>
          <div className="flex gap-2">
            <input
              type={showSecret ? 'text' : 'password'}
              value="sk_1234567890abcdef"
              readOnly
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm"
            />
            <button
              onClick={() => setShowSecret(!showSecret)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              {showSecret ? '隐藏' : '显示'}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">IP 白名单</label>
          <textarea
            defaultValue="192.168.1.0/24&#10;10.0.0.0/8"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm"
            rows={3}
          />
        </div>

        <div className="pt-4 border-t border-gray-200">
          <h3 className="font-medium text-gray-900 mb-3">Payload 映射</h3>
          <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">payload.date</span>
              <span className="font-mono">→ workflow.DATE</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">payload.company_id</span>
              <span className="font-mono">→ workflow.COMPANY</span>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-200">
          <button className="w-full px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200">
            <Globe className="w-4 h-4 inline mr-2" />
            发送测试 Payload
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h3 className="font-medium text-gray-900 mb-4">最近触发记录</h3>
        <div className="space-y-2 text-sm">
          {[
            { time: '14:30:15', status: 'success', payload: '{"date":"2026-02-26"}' },
            { time: '10:25:42', status: 'success', payload: '{"date":"2026-02-26"}' },
            { time: '06:10:33', status: 'failed', payload: '{"date":"2026-02-26"}' },
          ].map((record, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <span className="text-gray-600">{record.time}</span>
              <span className={`px-2 py-1 rounded text-xs ${
                record.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {record.status}
              </span>
              <span className="font-mono text-xs text-gray-600">{record.payload}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
