import { useState } from 'react';
import { Link } from 'react-router';
import { Plus, Search, Filter, Play, Edit, Copy, Power, FileText } from 'lucide-react';

const jobTypes = ['全部', 'SQL Agent', '存储过程', 'SQL脚本', 'Python', 'Windows Task'];
const environments = ['全部', 'Prod', 'Dev'];
const tags = ['全部', '财务', '成本', 'ETL', 'BI'];

const jobsData = [
  {
    id: '1',
    name: '财务日报生成',
    type: 'SQL Agent',
    target: 'SQL-PROD-01',
    lastRun: '2分钟前',
    successRate: '98.5%',
    avgDuration: '3.2min',
    workflows: 2,
    enabled: true,
    tags: ['财务', 'BI'],
  },
  {
    id: '2',
    name: 'SAP成本数据同步',
    type: '存储过程',
    target: 'SQL-PROD-02',
    lastRun: '15分钟前',
    successRate: '95.2%',
    avgDuration: '8.5min',
    workflows: 3,
    enabled: true,
    tags: ['成本', 'ETL'],
  },
  {
    id: '3',
    name: 'Python数据清洗',
    type: 'Python',
    target: 'WIN-HOST-01',
    lastRun: '1小时前',
    successRate: '100%',
    avgDuration: '12min',
    workflows: 1,
    enabled: true,
    tags: ['ETL'],
  },
  {
    id: '4',
    name: '库存盘点任务',
    type: 'SQL脚本',
    target: 'SQL-PROD-01',
    lastRun: '2小时前',
    successRate: '92.1%',
    avgDuration: '25min',
    workflows: 2,
    enabled: false,
    tags: ['财务'],
  },
];

export function JobsList() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('全部');
  const [selectedEnv, setSelectedEnv] = useState('全部');
  const [selectedTag, setSelectedTag] = useState('全部');

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">作业管理</h1>
          <p className="text-gray-600 mt-1">管理可执行的作业模板</p>
        </div>
        <Link
          to="/jobs/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          新建作业
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索名称/描述/owner..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {jobTypes.map((type) => (
              <option key={type} value={type}>
                类型: {type}
              </option>
            ))}
          </select>

          <select
            value={selectedEnv}
            onChange={(e) => setSelectedEnv(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {environments.map((env) => (
              <option key={env} value={env}>
                环境: {env}
              </option>
            ))}
          </select>

          <select
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {tags.map((tag) => (
              <option key={tag} value={tag}>
                标签: {tag}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Jobs Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">名称</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">类型</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">目标</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">最后运行</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">成功率</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">平均耗时</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">绑定工作流</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {jobsData.map((job) => (
              <tr key={job.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <Link to={`/jobs/${job.id}`} className="text-gray-900 hover:text-blue-600 font-medium">
                    {job.name}
                  </Link>
                  <div className="flex gap-1 mt-1">
                    {job.tags.map((tag) => (
                      <span key={tag} className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                    {job.type}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                  {job.target}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {job.lastRun}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`text-sm font-medium ${
                    parseFloat(job.successRate) >= 95 ? 'text-green-600' : 'text-yellow-600'
                  }`}>
                    {job.successRate}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {job.avgDuration}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {job.workflows} 个
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {job.enabled ? (
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                      启用
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                      停用
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="flex items-center gap-2">
                    <button className="p-1 hover:bg-gray-100 rounded" title="运行一次">
                      <Play className="w-4 h-4 text-green-600" />
                    </button>
                    <Link to={`/jobs/${job.id}/edit`} className="p-1 hover:bg-gray-100 rounded" title="编辑">
                      <Edit className="w-4 h-4 text-blue-600" />
                    </Link>
                    <button className="p-1 hover:bg-gray-100 rounded" title="复制">
                      <Copy className="w-4 h-4 text-gray-600" />
                    </button>
                    <button className="p-1 hover:bg-gray-100 rounded" title={job.enabled ? '停用' : '启用'}>
                      <Power className={`w-4 h-4 ${job.enabled ? 'text-red-600' : 'text-gray-400'}`} />
                    </button>
                    <Link to={`/jobs/${job.id}`} className="p-1 hover:bg-gray-100 rounded" title="查看日志">
                      <FileText className="w-4 h-4 text-gray-600" />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
