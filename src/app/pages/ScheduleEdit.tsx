import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router';
import { ArrowLeft, Save } from 'lucide-react';

export function ScheduleEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [scheduleType, setScheduleType] = useState<'cron' | 'interval' | 'calendar' | 'window'>('cron');

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/schedules" className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{id === 'new' ? '新建' : '编辑'}计划</h1>
          </div>
        </div>
        <div className="flex gap-2">
          <Link to="/schedules" className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            取消
          </Link>
          <button
            onClick={() => navigate('/schedules')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Save className="w-4 h-4" />
            保存
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg p-6 border border-gray-200 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">计划名称</label>
          <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="输入计划名称" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">定时模式</label>
          <div className="flex gap-4 mb-4">
            {[
              { key: 'cron' as const, label: 'Cron' },
              { key: 'interval' as const, label: '间隔' },
              { key: 'calendar' as const, label: '日历' },
              { key: 'window' as const, label: '时间窗' },
            ].map((type) => (
              <button
                key={type.key}
                onClick={() => setScheduleType(type.key)}
                className={`px-4 py-2 border rounded-lg ${
                  scheduleType === type.key
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>

          {scheduleType === 'cron' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-700 mb-2">Cron 表达式</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono"
                  placeholder="0 0 * * *"
                  defaultValue="0 0 * * *"
                />
                <p className="text-sm text-gray-500 mt-1">每天凌晨 00:00 执行</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-blue-900 mb-2">预览未来5次触发</h4>
                <div className="space-y-1 text-sm text-blue-800">
                  <div>1. 2026-02-27 00:00:00</div>
                  <div>2. 2026-02-28 00:00:00</div>
                  <div>3. 2026-03-01 00:00:00</div>
                  <div>4. 2026-03-02 00:00:00</div>
                  <div>5. 2026-03-03 00:00:00</div>
                </div>
              </div>
            </div>
          )}

          {scheduleType === 'interval' && (
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm text-gray-700 mb-2">间隔</label>
                <input type="number" defaultValue={30} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div className="flex-1">
                <label className="block text-sm text-gray-700 mb-2">单位</label>
                <select className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                  <option>分钟</option>
                  <option>小时</option>
                  <option>天</option>
                </select>
              </div>
            </div>
          )}

          {scheduleType === 'calendar' && (
            <div className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                {['周一', '周二', '周三', '周四', '周五', '周六', '周日'].map((day) => (
                  <label key={day} className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input type="checkbox" />
                    <span className="text-sm">{day}</span>
                  </label>
                ))}
              </div>
              <label className="flex items-center gap-2">
                <input type="checkbox" />
                <span className="text-sm">排除节假日</span>
              </label>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">绑定对象</label>
          <select className="w-full px-4 py-2 border border-gray-300 rounded-lg">
            <option>选择工作流或作业...</option>
            <option>工作流: 财务月结流程</option>
            <option>工作流: BI数据同步链路</option>
            <option>作业: 财务日报生成</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">时区</label>
          <select className="w-full px-4 py-2 border border-gray-300 rounded-lg">
            <option>Asia/Shanghai</option>
            <option>UTC</option>
            <option>America/New_York</option>
          </select>
        </div>
      </div>
    </div>
  );
}
