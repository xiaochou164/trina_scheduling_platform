import { Link, useParams } from 'react-router';
import { ArrowLeft, Server, Play } from 'lucide-react';

export function ConnectionDetail() {
  const { id } = useParams();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/connections" className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">WIN-HOST-01</h1>
            <p className="text-gray-600 mt-1">Windows主机详情</p>
          </div>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">编辑配置</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">连接信息</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">主机名</span>
              <span className="font-medium">WIN-HOST-01</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">IP地址</span>
              <span className="font-mono text-sm">192.168.1.20</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Agent版本</span>
              <span className="font-mono text-sm">v1.2.3</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">状态</span>
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">在线</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">最后心跳</span>
              <span className="text-sm">30秒前</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">Python环境</h3>
          <div className="space-y-2">
            {[
              { name: 'Python 3.11 (系统)', path: 'C:\\Python311\\python.exe' },
              { name: 'venv: data-processing', path: 'C:\\venvs\\data-processing\\Scripts\\python.exe' },
              { name: 'conda: base', path: 'C:\\Anaconda3\\python.exe' },
            ].map((env, i) => (
              <div key={i} className="p-3 bg-gray-50 rounded border border-gray-200">
                <div className="font-medium text-sm text-gray-900">{env.name}</div>
                <div className="font-mono text-xs text-gray-600 mt-1">{env.path}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-4">可用任务列表 (Task Scheduler)</h3>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">任务名称</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">路径</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">状态</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">最后运行</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">下次运行</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {[
              { name: 'DataBackup', path: '\\Microsoft\\Windows\\DataBackup', status: 'Ready', lastRun: '2026-02-26 00:00', nextRun: '2026-02-27 00:00' },
              { name: 'ReportGeneration', path: '\\Custom\\ReportGeneration', status: 'Running', lastRun: '2026-02-26 14:00', nextRun: '-' },
              { name: 'Cleanup', path: '\\Custom\\Cleanup', status: 'Ready', lastRun: '2026-02-26 06:00', nextRun: '2026-02-27 06:00' },
            ].map((task, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{task.name}</td>
                <td className="px-4 py-3 text-sm font-mono text-gray-600">{task.path}</td>
                <td className="px-4 py-3">
                  {task.status === 'Running' ? (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">Running</span>
                  ) : (
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">Ready</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{task.lastRun}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{task.nextRun}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-4">测试执行</h3>
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="输入测试命令,如: python --version"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
            defaultValue="python --version"
          />
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Play className="w-4 h-4" />
            执行
          </button>
        </div>
        <div className="mt-4 bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
          <div>$ python --version</div>
          <div>Python 3.11.5</div>
        </div>
      </div>
    </div>
  );
}
