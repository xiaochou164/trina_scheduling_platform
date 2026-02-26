import { X } from 'lucide-react';

interface NodeInspectorProps {
  selectedNode: any;
  onClose: () => void;
  onUpdate: (config: any) => void;
}

export function NodeInspector({ selectedNode, onClose, onUpdate }: NodeInspectorProps) {
  if (!selectedNode) {
    return (
      <div className="w-80 bg-gray-50 border-l border-gray-200 p-6 flex items-center justify-center text-gray-500 text-sm">
        选择一个节点查看配置
      </div>
    );
  }

  return (
    <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">节点配置</h3>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-6">
        {/* Basic Info */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            节点名称
          </label>
          <input
            type="text"
            defaultValue={selectedNode.label}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="输入节点名称"
          />
        </div>

        {/* Type-specific configs */}
        {(selectedNode.type === 'sql-agent' || selectedNode.type === 'stored-proc') && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                引用作业模板
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>选择作业...</option>
                <option>财务日报生成</option>
                <option>成本核算</option>
                <option>库存盘点</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                或直接配置
              </label>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-600">SQL实例</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mt-1">
                    <option>SQL-PROD-01</option>
                    <option>SQL-PROD-02</option>
                  </select>
                </div>

                {selectedNode.type === 'stored-proc' && (
                  <>
                    <div>
                      <label className="text-xs text-gray-600">存储过程</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mt-1"
                        placeholder="sp_CalculateCost"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">参数</label>
                      <textarea
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mt-1 font-mono"
                        placeholder="@Date = '${DATE}'"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}

        {selectedNode.type === 'python' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                执行主机
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option>WIN-HOST-01</option>
                <option>WIN-HOST-02</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                脚本路径
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="C:\Scripts\process.py"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                参数
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="--date ${DATE}"
              />
            </div>
          </>
        )}

        {selectedNode.type === 'condition' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              条件表达式
            </label>
            <textarea
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
              placeholder="if ${prev.status} == 'SUCCESS'"
            />
            <p className="text-xs text-gray-500 mt-1">
              支持变量: $&#123;prev.status&#125;, $&#123;prev.rows&#125;
            </p>
          </div>
        )}

        {selectedNode.type === 'delay' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              延迟时间
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                defaultValue={5}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option>分钟</option>
                <option>小时</option>
                <option>秒</option>
              </select>
            </div>
          </div>
        )}

        {/* Common Settings */}
        <div className="pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-3">执行策略</h4>
          
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-600">超时 (分钟)</label>
              <input
                type="number"
                defaultValue={30}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mt-1"
              />
            </div>

            <div>
              <label className="text-xs text-gray-600">重试次数</label>
              <input
                type="number"
                defaultValue={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mt-1"
              />
            </div>

            <div>
              <label className="text-xs text-gray-600">失败时</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mt-1">
                <option>终止工作流</option>
                <option>跳过继续</option>
                <option>执行补偿</option>
                <option>并行继续</option>
              </select>
            </div>

            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                defaultChecked
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">失败时触发告警</span>
            </label>
          </div>
        </div>

        {/* Variables */}
        <div className="pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-3">变量映射</h4>
          <div className="bg-gray-50 p-3 rounded text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">DATE</span>
              <span className="font-mono">$&#123;workflow.DATE&#125;</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">PREV_STATUS</span>
              <span className="font-mono">$&#123;prev.status&#125;</span>
            </div>
          </div>
          <button className="w-full mt-2 px-3 py-1.5 border border-dashed border-gray-300 rounded text-xs text-gray-600 hover:bg-gray-50">
            + 添加变量
          </button>
        </div>
      </div>
    </div>
  );
}
