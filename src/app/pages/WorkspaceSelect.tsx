import { useNavigate } from 'react-router';
import { Factory, Workflow, Database, Building2 } from 'lucide-react';

const workspaces = [
  {
    id: '1',
    name: '财务系统',
    type: '系统',
    icon: Database,
    description: '财务报表、成本核算、对账自动化',
    jobCount: 45,
    workflowCount: 12,
    color: 'blue'
  },
  {
    id: '2',
    name: '生产车间A',
    type: '车间',
    icon: Factory,
    description: '生产数据采集、质量监控、设备状态',
    jobCount: 67,
    workflowCount: 23,
    color: 'green'
  },
  {
    id: '3',
    name: 'BI数据平台',
    type: '平台',
    icon: Building2,
    description: '数据仓库、ETL调度、报表生成',
    jobCount: 128,
    workflowCount: 45,
    color: 'purple'
  },
  {
    id: '4',
    name: '供应链系统',
    type: '系统',
    icon: Workflow,
    description: '订单处理、库存同步、物流跟踪',
    jobCount: 56,
    workflowCount: 18,
    color: 'orange'
  },
];

export function WorkspaceSelect() {
  const navigate = useNavigate();

  const handleSelectWorkspace = (id: string) => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">选择工作空间</h1>
          <p className="text-gray-600">请选择您要进入的业务域或系统</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {workspaces.map((workspace) => {
            const Icon = workspace.icon;
            const colorClasses = {
              blue: 'bg-blue-100 text-blue-700 border-blue-200',
              green: 'bg-green-100 text-green-700 border-green-200',
              purple: 'bg-purple-100 text-purple-700 border-purple-200',
              orange: 'bg-orange-100 text-orange-700 border-orange-200',
            };

            return (
              <button
                key={workspace.id}
                onClick={() => handleSelectWorkspace(workspace.id)}
                className="bg-white rounded-xl p-6 border-2 border-gray-200 hover:border-blue-500 hover:shadow-lg transition-all text-left group"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-xl ${colorClasses[workspace.color as keyof typeof colorClasses]} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-7 h-7" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600">
                        {workspace.name}
                      </h3>
                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                        {workspace.type}
                      </span>
                    </div>
                    
                    <p className="text-gray-600 text-sm mb-4">
                      {workspace.description}
                    </p>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>{workspace.jobCount} 个作业</span>
                      <span>•</span>
                      <span>{workspace.workflowCount} 个工作流</span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={() => navigate('/login')}
            className="text-gray-600 hover:text-gray-900"
          >
            ← 返回登录
          </button>
        </div>
      </div>
    </div>
  );
}
