import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, Save } from 'lucide-react';

const jobTypeOptions = ['SQL Agent', '存储过程', 'SQL脚本', 'Python', 'Windows Task'];

export function JobEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';

  const [jobType, setJobType] = useState('SQL Agent');
  const [jobName, setJobName] = useState(isNew ? '' : '财务日报生成');
  const [description, setDescription] = useState('');
  const [targetInstance, setTargetInstance] = useState('SQL-PROD-01');
  const [agentJobName, setAgentJobName] = useState('');
  const [timeout, setTimeout] = useState('30');
  const [retryCount, setRetryCount] = useState('3');
  const [retryInterval, setRetryInterval] = useState('5');
  const [enableAlert, setEnableAlert] = useState(true);

  const handleSave = () => {
    // Save logic
    navigate(`/jobs/${id || '1'}`);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to={isNew ? '/jobs' : `/jobs/${id}`} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isNew ? '新建作业' : '编辑作业'}
            </h1>
            <p className="text-gray-600 mt-1">配置作业执行参数和策略</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            to={isNew ? '/jobs' : `/jobs/${id}`}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            取消
          </Link>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Save className="w-4 h-4" />
            保存
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4">基本信息</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  作业名称 *
                </label>
                <input
                  type="text"
                  value={jobName}
                  onChange={(e) => setJobName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="输入作业名称"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  作业类型 *
                </label>
                <select
                  value={jobType}
                  onChange={(e) => setJobType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {jobTypeOptions.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  描述
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="输入作业描述"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  标签
                </label>
                <div className="flex gap-2">
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm cursor-pointer hover:bg-blue-200">
                    财务 ×
                  </span>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm cursor-pointer hover:bg-blue-200">
                    BI ×
                  </span>
                  <button className="px-3 py-1 border border-dashed border-gray-300 rounded-full text-sm text-gray-600 hover:bg-gray-50">
                    + 添加标签
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Type-specific Config */}
          {jobType === 'SQL Agent' && (
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4">SQL Agent 配置</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    目标实例 *
                  </label>
                  <select
                    value={targetInstance}
                    onChange={(e) => setTargetInstance(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option>SQL-PROD-01</option>
                    <option>SQL-PROD-02</option>
                    <option>SQL-DEV-01</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Agent Job 名称 *
                  </label>
                  <input
                    type="text"
                    value={agentJobName}
                    onChange={(e) => setAgentJobName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="FinanceDailyReport"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    运行账户
                  </label>
                  <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>sa_finance</option>
                    <option>sa_etl</option>
                    <option>sa_report</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    执行步骤（可选）
                  </label>
                  <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>全部步骤</option>
                    <option>Step 1: Data Extraction</option>
                    <option>Step 2: Transformation</option>
                    <option>Step 3: Report</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {jobType === 'Python' && (
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4">Python 执行配置</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    目标主机 *
                  </label>
                  <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>WIN-HOST-01</option>
                    <option>WIN-HOST-02</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    脚本路径 *
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="C:\Scripts\data_clean.py"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Python 环境
                  </label>
                  <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>python.exe (系统)</option>
                    <option>venv: data-processing</option>
                    <option>conda: base</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    命令行参数
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="--mode=prod --date=${DATE}"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    工作目录
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="C:\Scripts"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Execution Strategy */}
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4">执行策略</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  超时时间 (分钟)
                </label>
                <input
                  type="number"
                  value={timeout}
                  onChange={(e) => setTimeout(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  重试次数
                </label>
                <input
                  type="number"
                  value={retryCount}
                  onChange={(e) => setRetryCount(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  重试间隔 (分钟)
                </label>
                <input
                  type="number"
                  value={retryInterval}
                  onChange={(e) => setRetryInterval(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableAlert}
                    onChange={(e) => setEnableAlert(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">失败时触发告警</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">💡 提示</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• 必填字段标记为 *</li>
              <li>• 参数支持变量如 $&#123;DATE&#125;</li>
              <li>• 建议先在测试环境验证</li>
            </ul>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <h4 className="font-medium text-gray-900 mb-3">Owner</h4>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option>张三</option>
              <option>李四</option>
              <option>王五</option>
            </select>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <h4 className="font-medium text-gray-900 mb-3">环境</h4>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option>Prod</option>
              <option>Pre</option>
              <option>Dev</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
