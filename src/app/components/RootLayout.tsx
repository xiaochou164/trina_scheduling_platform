import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router';
import { 
  LayoutDashboard, 
  GitBranch, 
  Briefcase, 
  Calendar, 
  Zap, 
  PlayCircle,
  FileText,
  Bell,
  Database,
  Settings as SettingsIcon,
  Menu,
  X,
  LogOut,
} from 'lucide-react';

const menuItems = [
  { path: '/', label: '仪表盘', icon: LayoutDashboard },
  { path: '/workflows', label: '工作流', icon: GitBranch },
  { path: '/jobs', label: '作业', icon: Briefcase },
  { path: '/schedules', label: '计划', icon: Calendar },
  { path: '/triggers', label: '触发器', icon: Zap },
  { path: '/runs', label: '运行中心', icon: PlayCircle },
  { path: '/alerts', label: '告警中心', icon: Bell },
  { path: '/connections', label: '资源连接', icon: Database },
  { path: '/settings', label: '系统设置', icon: SettingsIcon },
];

export function RootLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-0'} bg-slate-900 text-white transition-all duration-300 overflow-hidden flex flex-col`}>
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-semibold">工作流平台</h1>
          <p className="text-sm text-slate-400 mt-1">调度编排系统</p>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || 
              (item.path !== '/' && location.pathname.startsWith(item.path));
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-6 py-3 hover:bg-slate-800 transition-colors ${
                  isActive ? 'bg-slate-800 border-l-4 border-blue-500' : ''
                }`}
              >
                <Icon className="w-5 h-5 mr-3" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center mr-3">
              <span className="text-sm">管</span>
            </div>
            <div className="flex-1">
              <p className="text-sm">管理员</p>
              <p className="text-xs text-slate-400">admin@company.com</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            
            <div className="px-4 py-2 rounded-lg border border-blue-100 bg-blue-50 text-blue-700 text-sm">
              统一运行视图（无环境切换）
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="p-2 hover:bg-gray-100 rounded-lg relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 rounded-lg"
            >
              <LogOut className="w-4 h-4" />
              <span>登出</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
